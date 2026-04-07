import { Delete } from "lucide-react";

const SUB_LETTERS: Record<string, string> = {
  "2": "ABC",
  "3": "DEF",
  "4": "GHI",
  "5": "JKL",
  "6": "MNO",
  "7": "PQRS",
  "8": "TUV",
  "9": "WXYZ",
};

interface NumpadGridProps {
  onKey: (key: string) => void;
}

export default function NumpadGrid({ onKey }: NumpadGridProps) {
  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [".", "0", "del"],
  ];

  return (
    <div className="grid grid-cols-3 gap-[1px] bg-border/50 px-1 pb-1">
      {keys.flat().map((key) => (
        <button
          key={key}
          onClick={() => onKey(key)}
          className="flex flex-col items-center justify-center font-sans transition-colors active:bg-muted rounded-xl min-h-[62px]"
          style={{
            backgroundColor: "hsl(var(--card))",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
          aria-label={key === "del" ? "Delete" : key}
        >
          {key === "del" ? (
            <Delete className="w-6 h-6 text-foreground" />
          ) : (
            <>
              <span className="text-[28px] font-semibold text-foreground leading-tight">
                {key}
              </span>
              {SUB_LETTERS[key] && (
                <span
                  className="mt-0 text-[12px] font-bold leading-none"
                  style={{ color: "#C8C8C4" }}
                >
                  {SUB_LETTERS[key]}
                </span>
              )}
            </>
          )}
        </button>
      ))}
    </div>
  );
}
