import { formatCurrency } from "@/lib/bountt-utils";

interface Props {
  contributionPct: number;
  totalUserPaid: number;
  totalGroupExpenses: number;
}

export default function ContributionSlide({ contributionPct, totalUserPaid, totalGroupExpenses }: Props) {
  const insight =
    contributionPct > 60
      ? "You've been picking up the tab lately."
      : contributionPct >= 40
        ? "You're splitting evenly."
        : "Others have been covering more.";

  return (
    <div className="flex flex-col justify-center px-6 py-5">
      <h2 className="text-3xl font-extrabold italic text-white mb-3 leading-tight">
        {insight}
      </h2>
      <p className="text-sm text-white/60 mb-1">
        <span className="font-semibold text-white">You</span> covered{" "}
        <span className="font-semibold text-white">{formatCurrency(totalUserPaid)}</span>{" "}
        of{" "}
        <span className="font-semibold text-white">{formatCurrency(totalGroupExpenses)}</span>{" "}
        total expenses
      </p>
      <p className="text-sm text-white/60 mb-2">
        You've covered <span className="font-semibold text-white">{Math.round(contributionPct)}%</span> of expenses
      </p>
      <button className="text-sm text-white/60 underline underline-offset-2 text-left w-fit">
        See full breakdown
      </button>
    </div>
  );
}
