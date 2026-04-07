import bg01 from "@/assets/backgrounds/bg-01.webp";
import bg02 from "@/assets/backgrounds/bg-02.webp";
import bg03 from "@/assets/backgrounds/bg-03.webp";
import bg04 from "@/assets/backgrounds/bg-04.webp";
import bg05 from "@/assets/backgrounds/bg-05.webp";

const BACKGROUND_MAP: Record<string, string> = {
  "bg-01": bg01,
  "bg-02": bg02,
  "bg-03": bg03,
  "bg-04": bg04,
  "bg-05": bg05,
};

export const BACKGROUND_IDS = Object.keys(BACKGROUND_MAP);

export function getBackgroundSrc(key: string): string {
  return BACKGROUND_MAP[key] ?? BACKGROUND_MAP["bg-01"];
}
