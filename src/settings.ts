export interface DailyTaskMoverSettings {
  enablePreviousDay: boolean;
  enableNextDay: boolean;
}

export const DEFAULT_SETTINGS: DailyTaskMoverSettings = {
  enablePreviousDay: true,
  enableNextDay: true,
};
