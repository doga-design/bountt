import icon01 from "@/assets/icons/icon-01.svg";
import icon02 from "@/assets/icons/icon-02.svg";
import icon03 from "@/assets/icons/icon-03.svg";
import icon04 from "@/assets/icons/icon-04.svg";
import icon05 from "@/assets/icons/icon-05.svg";
import icon06 from "@/assets/icons/icon-06.svg";
import icon07 from "@/assets/icons/icon-07.svg";
import icon08 from "@/assets/icons/icon-08.svg";
import icon09 from "@/assets/icons/icon-09.svg";
import icon10 from "@/assets/icons/icon-10.svg";

export const GROUP_ICONS: Record<string, string> = {
  "icon-01": icon01,
  "icon-02": icon02,
  "icon-03": icon03,
  "icon-04": icon04,
  "icon-05": icon05,
  "icon-06": icon06,
  "icon-07": icon07,
  "icon-08": icon08,
  "icon-09": icon09,
  "icon-10": icon10,
};

export const GROUP_ICON_IDS = Object.keys(GROUP_ICONS);

export function getGroupIconSrc(iconId: string): string {
  return GROUP_ICONS[iconId] ?? GROUP_ICONS["icon-01"];
}
