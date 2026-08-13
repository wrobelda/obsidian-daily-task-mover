/** 左键/右键点击行内图标时执行的动作。 */
export type ClickAction = "popup" | "prev" | "next" | "none";

export interface DailyTaskMoverSettings {
  enablePreviousDay: boolean;
  enableNextDay: boolean;
  /** 左键点击行内图标动作。 */
  leftClickAction: ClickAction;
  /** 右键点击行内图标动作。 */
  rightClickAction: ClickAction;
}

export const DEFAULT_SETTINGS: DailyTaskMoverSettings = {
  enablePreviousDay: true,
  enableNextDay: true,
  leftClickAction: "popup",
  rightClickAction: "none",
};
