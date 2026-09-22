import { appHasDailyNotesPluginLoaded } from "obsidian-daily-notes-interface";
import { getCurrentDailyDate, getOrCreateDailyNote } from "../dailyNoteUtils";
import type { NoteProviderDefinition } from "./types";

const identity = {};

export const dailyNotesProvider = {
  id: "daily-notes",
  label: "Daily notes",
  connect() {
    if (!appHasDailyNotesPluginLoaded()) return null;
    return {
      identity,
      resolve(file) {
        const date = getCurrentDailyDate(file);
        return date ? { date, endDate: date.clone(), getOrCreate: getOrCreateDailyNote } : null;
      },
    };
  },
} satisfies NoteProviderDefinition;
