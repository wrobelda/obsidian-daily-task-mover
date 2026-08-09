export interface DailyTaskMoverSettings {
  enablePreviousDay: boolean;
  enableNextDay: boolean;
  collapseToSubmenu: boolean;
}

export const DEFAULT_SETTINGS: DailyTaskMoverSettings = {
  enablePreviousDay: true,
  enableNextDay: true,
  collapseToSubmenu: false,
};
