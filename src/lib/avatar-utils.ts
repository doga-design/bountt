import { Expense, ExpenseSplit, GroupMember } from "@/types";
import Avatar1 from "@/assets/avatars/avatar1.svg";
import Avatar2 from "@/assets/avatars/avatar2.svg";
import Avatar3 from "@/assets/avatars/avatar3.svg";
import Avatar4 from "@/assets/avatars/avatar4.svg";
import Avatar5 from "@/assets/avatars/avatar5.svg";
import Avatar6 from "@/assets/avatars/avatar6.svg";

const AVATAR_IMAGES = [Avatar1, Avatar2, Avatar3, Avatar4, Avatar5, Avatar6];

// 6 named colors with bg and stroke
const AVATAR_COLORS: Record<string, { bg: string; stroke: string }> = {
  emerald:  { bg: '#6BD16C', stroke: '#00FF04' },
  blue:     { bg: '#A3BAFF', stroke: '#00EAFF' },
  amber:    { bg: '#FF8885', stroke: '#FF0000' },
  orange:   { bg: '#FFB376', stroke: '#FF7200' },
  offwhite: { bg: '#DFDFDF', stroke: '#FFFFFF' },
  purple:   { bg: '#B984E5', stroke: '#A600FF' },
};

export const AVATAR_COLOR_KEYS = ['emerald', 'blue', 'amber', 'orange', 'offwhite', 'purple'];

/**
 * Returns the member's avatar color as { bg, stroke }.
 * Falls back to purple if the stored key is invalid.
 */
export function getAvatarColor(member: GroupMember): { bg: string; stroke: string } {
  if (member.avatar_color && AVATAR_COLORS[member.avatar_color]) {
    return AVATAR_COLORS[member.avatar_color];
  }
  return AVATAR_COLORS['purple'];
}

/**
 * Returns the avatar SVG image for a member based on their stored avatar_index.
 * Falls back to avatar1 if index is missing or out of range.
 */
export function getAvatarImage(member: GroupMember): string {
  if (
    typeof member.avatar_index === 'number' &&
    member.avatar_index >= 1 &&
    member.avatar_index <= 6
  ) {
    return AVATAR_IMAGES[member.avatar_index - 1];
  }
  return AVATAR_IMAGES[0];
}

/**
 * Returns a deterministic avatar image based on a name string (for historical snapshots).
 */
export function getAvatarImageFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_IMAGES[Math.abs(hash) % AVATAR_IMAGES.length];
}

/**
 * Pick a color key and avatar index not yet used by existing group members.
 * Falls back to random if all 6 are taken.
 */
export function pickAvailableColor(
  existingColors: string[],
  existingIndices: number[] = []
): { color: string; index: number } {
  const usedColors = new Set(existingColors);
  const usedIndices = new Set(existingIndices);

  const availableColors = AVATAR_COLOR_KEYS.filter((c) => !usedColors.has(c));
  const availableIndices = [1, 2, 3, 4, 5, 6].filter((i) => !usedIndices.has(i));

  const color = availableColors.length > 0
    ? availableColors[Math.floor(Math.random() * availableColors.length)]
    : AVATAR_COLOR_KEYS[Math.floor(Math.random() * AVATAR_COLOR_KEYS.length)];

  const index = availableIndices.length > 0
    ? availableIndices[Math.floor(Math.random() * availableIndices.length)]
    : Math.floor(Math.random() * 6) + 1;

  return { color, index };
}

export interface MemberBalance {
  amount: number;
  direction: "you_pay" | "they_pay" | "settled";
}

/**
 * Calculate the net financial relationship between the current user
 * and a specific member.
 */
export function getMemberBalance(
  memberId: string,
  memberUserId: string | null,
  memberName: string,
  expenses: Expense[],
  splits: ExpenseSplit[],
  currentUserId: string
): MemberBalance {
  let theyOweYou = 0;
  let youOweThem = 0;

  for (const expense of expenses) {
    if (expense.is_settled) continue;

    const expenseSplits = splits.filter((s) => s.expense_id === expense.id);

    if (expense.paid_by_user_id === currentUserId) {
      for (const split of expenseSplits) {
        const isThisMember =
          (memberUserId && split.user_id === memberUserId) ||
          (!memberUserId && split.member_name === memberName && !split.user_id);
        if (isThisMember) {
          theyOweYou += Number(split.share_amount);
        }
      }
    }

    const memberPaid =
      (memberUserId && expense.paid_by_user_id === memberUserId) ||
      (!memberUserId && expense.paid_by_name === memberName && !expense.paid_by_user_id);
    if (memberPaid) {
      for (const split of expenseSplits) {
        if (split.user_id === currentUserId) {
          youOweThem += Number(split.share_amount);
        }
      }
    }
  }

  const net = theyOweYou - youOweThem;

  if (Math.abs(net) < 0.01) {
    return { amount: 0, direction: "settled" };
  }
  if (net > 0) {
    return { amount: net, direction: "they_pay" };
  }
  return { amount: Math.abs(net), direction: "you_pay" };
}
