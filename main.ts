import { MarkdownView, Menu, Notice, Plugin } from "obsidian";
import {
  DailyTaskMoverSettings,
  DEFAULT_SETTINGS,
} from "./src/settings";
import { DailyTaskMoverSettingTab } from "./src/settingsTab";
import {
  deriveSourceHeading,
  getTaskAtLine,
  getTaskBlockRange,
} from "./src/taskCache";
import { getCurrentDailyDate, getOrCreateDailyNote } from "./src/dailyNoteUtils";
import { moveTaskToNote } from "./src/taskMover";

export default class DailyTaskMoverPlugin extends Plugin {
  declare settings: DailyTaskMoverSettings;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addSettingTab(new DailyTaskMoverSettingTab(this.app, this));

    this.addCommand({
      id: "move-to-previous-day",
      name: "移动任务到前一天",
      checkCallback: (checking: boolean) => {
        if (!this.settings.enablePreviousDay) return;
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view || !view.file) return;
        const date = getCurrentDailyDate(view.file);
        if (!date) return;
        const cache = this.app.metadataCache.getFileCache(view.file);
        if (!cache) return;
        const taskItem = getTaskAtLine(cache, view.editor.getCursor().line);
        if (!taskItem) return;
        if (checking) return true;
        void this.doMove("prev");
      },
    });

    this.addCommand({
      id: "move-to-next-day",
      name: "移动任务到后一天",
      checkCallback: (checking: boolean) => {
        if (!this.settings.enableNextDay) return;
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view || !view.file) return;
        const date = getCurrentDailyDate(view.file);
        if (!date) return;
        const cache = this.app.metadataCache.getFileCache(view.file);
        if (!cache) return;
        const taskItem = getTaskAtLine(cache, view.editor.getCursor().line);
        if (!taskItem) return;
        if (checking) return true;
        void this.doMove("next");
      },
    });

    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, info) => {
        const file = info.file;
        if (!file) return;
        const date = getCurrentDailyDate(file);
        if (!date) return;
        const cache = this.app.metadataCache.getFileCache(file);
        if (!cache) return;
        const taskItem = getTaskAtLine(cache, editor.getCursor().line);
        if (!taskItem) return;
        if (!this.settings.enablePreviousDay && !this.settings.enableNextDay)
          return;

        const addAction = (m: Menu) => {
          if (this.settings.enablePreviousDay) {
            m.addItem((item) => {
              item.setTitle("移动到前一天");
              item.setIcon("arrow-left");
              item.onClick(() => {
                void this.doMove("prev");
              });
            });
          }
          if (this.settings.enableNextDay) {
            m.addItem((item) => {
              item.setTitle("移动到后一天");
              item.setIcon("arrow-right");
              item.onClick(() => {
                void this.doMove("next");
              });
            });
          }
        };

        if (this.settings.collapseToSubmenu) {
          menu.addItem((item) => {
            item.setTitle("daily task mover");
            item.setIcon("calendar-clock");
            const sub = (item as unknown as { setSubmenu(): Menu }).setSubmenu();
            addAction(sub);
          });
        } else {
          addAction(menu);
        }
      })
    );
  }

  onunload(): void {
    // 所有事件通过 registerEvent 自动清理
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      await this.loadData()
    );
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private async doMove(direction: "prev" | "next"): Promise<void> {
    try {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!view || !view.file) return;
      const editor = view.editor;
      const file = view.file;

      const date = getCurrentDailyDate(file);
      if (!date) {
        new Notice("当前笔记不是日记笔记");
        return;
      }

      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache) return;
      const taskItem = getTaskAtLine(cache, editor.getCursor().line);
      if (!taskItem) return;

      const blockRange = getTaskBlockRange(cache, taskItem);
      const sourceHeading = deriveSourceHeading(
        cache,
        taskItem.position.start.line
      );

      const targetDate =
        direction === "prev"
          ? date.clone().subtract(1, "day")
          : date.clone().add(1, "day");

      const targetFile = await getOrCreateDailyNote(targetDate);

      await moveTaskToNote({
        app: this.app,
        sourceFile: file,
        blockRange,
        sourceHeading,
        targetFile,
      });
    } catch (err) {
      const e = err as { message?: string };
      new Notice(String(e?.message ?? err));
    }
  }
}
