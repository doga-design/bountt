# Bountt - Lovable MVP

## Local development

You need [Node.js](https://nodejs.org/) 18+ (LTS recommended) and npm.

From the repo root:

```bash
npm install
npm run dev
```

Then open **http://localhost:8080** (Vite is configured to listen on port `8080` and all interfaces — see `vite.config.ts`).

The app expects Supabase env vars for Vite (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, etc.). A `.env` file in the project root is loaded automatically in dev.

Other scripts:

- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm test` — run Vitest once  
  test3
-
