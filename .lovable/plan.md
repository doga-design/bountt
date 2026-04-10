Critical confetti audit completed across every requested file..

still testing 2-way-sync

What I confirmed

- `package.json:48` has `"canvas-confetti": "^1.9.4"`.
- The package is installed: `node_modules/canvas-confetti/` exists.
- This version does not ship `dist/confetti.browser.min.js`; that is not the blocker. It ships `dist/confetti.browser.js` and exports `dist/confetti.module.mjs`, so the import is valid.
- `src/lib/confetti-utils.ts` exists and already contains `fireMemberAdded`, `fireFirstCost`, and `fireFirstSettle` with the same particle configs you specified. It is missing `testConfetti` and all diagnostics.
- `index.html:8` CSP currently has:
  - `script-src 'self' 'unsafe-inline'`
  - `img-src 'self' data: blob: https://storage.googleapis.com`
  - no `worker-src`
- `canvas-confetti`’s default export prefers a blob worker (`new Worker(URL.createObjectURL(new Blob(...)))`). Under the current CSP, that worker path is not explicitly allowed, so behavior is browser-dependent and can fail/fallback silently.

Exact code-path findings

- `Dashboard.tsx` only has settlement refs:
  - `pendingSettlementRef`
  - `hasFirstSettleFiredRef`
- Missing from `Dashboard.tsx`:
  - `pendingFirstCostRef`
  - `hasFirstCostFiredRef`
  - import of `fireFirstCost`
- `ExpenseScreen` is rendered without `onFirstExpenseCreated`.
- `ExpenseDetailSheet` is rendered with `onSettlementComplete`.
- `Dashboard`’s `ExpenseScreen.onOpenChange` only closes/clears state; it never checks pending first-expense confetti.
- `Dashboard.handleDetailOpenChange` does correctly check settlement refs and fires `fireFirstSettle()` in double `requestAnimationFrame`.

- `ExpenseScreen.tsx` still defines `onFirstExpenseCreated?: () => void`, but never calls it.
- Current create-expense path in `ExpenseScreen.handleSave` is:
  1. `rpc("create_expense_with_splits")`
  2. `await fetchExpenseSplits(...)`
  3. toast `"Expense added"`
  4. `if (wasFirstExpenseRef.current) setTimeout(() => fireFirstCost(), 400)`
  5. `onOpenChange(false)`
- So first-expense confetti is currently fired inside the drawer, before the close animation completes, and the old parent-driven close-trigger architecture is half-removed.

- `ExpenseDetailSheet.tsx` settlement flow is structurally sound:
  - props include `onSettlementComplete?: () => void`
  - refs exist: `settledAtOpenRef`, `userDidSettleRef`
  - all 3 settle RPC handlers set `userDidSettleRef.current = true`
  - the auto-close effect checks `open && expenseFullySettled && !settledAtOpenRef.current`, calls `onSettlementComplete?.()`, then closes after 800ms
- What is missing there is logging and one small hardening change: reset refs on `[open, expense?.id]`, not just `[open]`.

- The onboarding member-add component is `src/components/dashboard/EmptyState.tsx`.
- It now does call `fireMemberAdded()` after `addPlaceholderMember(...)` succeeds.
- It does not have a `hasAddedFirstMemberRef`, so there is no first-only guard or logging.

True root causes

1. The rendering layer has never been explicitly proven. There is no smoke test, and the current CSP does not explicitly allow the blob-worker path `canvas-confetti` tries to use.
2. The first-expense architecture is broken/inconsistent:
   - `Dashboard` no longer owns first-expense close-trigger firing
   - `ExpenseScreen` still declares a callback prop for that flow, but never uses it
   - actual confetti fires inside the open drawer instead of after the drawer closes
3. There are zero confetti logs anywhere, so failures are invisible.
4. Settlement logic is mostly correct, but currently unobservable.
5. Important nuance: using `expenses.length === 0` inside `handleSave` is not the best trigger. `AppContext.tsx` realtime can update `expenses` during the save flow. The existing `wasFirstExpenseRef.current` snapshot taken when the drawer opens is the safer source of truth. I would still log `expenses.length`, but I would not use it as the actual gate.

One-pass implementation plan

1. Prove rendering first

- In `src/lib/confetti-utils.ts`, add:
  - `testConfetti()`
  - all requested `console.log` lines
- Keep the existing particle configs exactly as-is; only add logs and the smoke-test export.
- In `Dashboard.tsx`, temporarily call `testConfetti()` once on mount.
- In `index.html`, harden CSP for this library by adding `worker-src 'self' blob:`. If needed for full consistency, also allow `blob:` in `script-src`.
- After visual confirmation, remove the temporary mount test but keep `testConfetti()` exported.

2. Restore a deterministic first-expense flow

- In `Dashboard.tsx`:
  - import `fireFirstCost`
  - restore `pendingFirstCostRef` and `hasFirstCostFiredRef`
  - pass `onFirstExpenseCreated` into `ExpenseScreen`
  - add the requested logs when the callback is received and when refs are set
- In `ExpenseScreen.tsx`:
  - remove the direct `fireFirstCost()` call from `handleSave`
  - after successful create + `fetchExpenseSplits`, log:
    - live `expenses.length`
    - `wasFirstExpenseRef.current`
  - if `wasFirstExpenseRef.current`, call `onFirstExpenseCreated?.()`
  - do not use live `expenses.length` as the actual gate; keep it diagnostic only
- In `Dashboard`’s `ExpenseScreen.onOpenChange`, when closing:
  - log pending state
  - if `pendingFirstCostRef.current && !hasFirstCostFiredRef.current`, clear/set refs and fire `fireFirstCost()` inside double `requestAnimationFrame`

3. Harden first-member onboarding trigger

- In `EmptyState.tsx`, add `hasAddedFirstMemberRef`
- After the first successful member add:
  - log `[confetti] calling fireMemberAdded`
  - fire `fireMemberAdded()`
- Keep the same guard/log pattern in `ExpenseScreen`’s nested `AddMemberSheet`

4. Instrument and harden settlement flow

- In `Dashboard.tsx`, keep settlement refs but add logs:
  - when `onSettlementComplete` is received
  - when `pendingSettlementRef` is set
  - when detail sheet closes and the confetti actually fires
- In `ExpenseDetailSheet.tsx`:
  - add logs when drawer opens, when each settle RPC succeeds, when `onSettlementComplete` is called, and when auto-close starts
  - reset `settledAtOpenRef` and `userDidSettleRef` on `[open, expense?.id]`
  - keep the existing auto-close pattern, because that part is already correct

5. Leave the diagnostic trail in the code

- First expense:
  - `[confetti] expenses.length at save time: ...`
  - `[confetti] wasFirstExpenseRef: ...`
  - `[confetti] calling onFirstExpenseCreated`
  - `[confetti] onFirstExpenseCreated received in Dashboard`
  - `[confetti] pendingFirstCostRef set true`
  - `[confetti] drawer closing, pending: ...`
  - `[confetti] drawer closed with pending first cost — firing`
  - `[confetti] fireFirstCost called`
- Settlement:
  - `[confetti] drawer opened, already settled: ...`
  - `[confetti] userDidSettleRef set true`
  - `[confetti] calling onSettlementComplete`
  - `[confetti] onSettlementComplete received in Dashboard`
  - `[confetti] detail closed with pending settlement — firing`
  - `[confetti] fireFirstSettle called`
- Member add:
  - `[confetti] calling fireMemberAdded`
- Smoke test:
  - `[confetti] testConfetti called`

Files to change

- `src/lib/confetti-utils.ts`
- `src/pages/Dashboard.tsx`
- `src/components/expense/ExpenseScreen.tsx`
- `src/components/dashboard/ExpenseDetailSheet.tsx`
- `src/components/dashboard/EmptyState.tsx`
- `index.html`

Expected result after this pass

- Rendering is verified first, not assumed.
- First member fires from the real onboarding success path.
- First expense is detected reliably from the drawer-open snapshot, but visually fired after the drawer closes.
- Settlement fires only when the current user caused the settle transition.
- Every failure point becomes visible in the console immediately.
