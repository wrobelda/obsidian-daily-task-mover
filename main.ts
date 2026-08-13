import {
  MarkdownView,
  MarkdownPostProcessorContext,
  Menu,
  Notice,
  Platform,
  Plugin,
  TFile,
  setIcon,
} from "obsidian";
import {
  DailyTaskMoverSettings,
  DEFAULT_SETTINGS,
  ClickAction,
} from "./src/settings";
import { DailyTaskMoverSettingTab } from "./src/settingsTab";
import {
  deriveSourceHeading,
  getTaskAtLine,
  getTaskBlockRange,
} from "./src/taskCache";
import { getCurrentDailyDate, getOrCreateDailyNote } from "./src/dailyNoteUtils";
import { moveTaskToNote } from "./src/taskMover";
import { buildTaskIconField } from "./src/taskLineIcon";

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
        const line = view.editor.getCursor().line;
        const taskItem = getTaskAtLine(cache, line);
        if (!taskItem) return;
        if (checking) return true;
        void this.doMove("prev", view.file, line);
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
        const line = view.editor.getCursor().line;
        const taskItem = getTaskAtLine(cache, line);
        if (!taskItem) return;
        if (checking) return true;
        void this.doMove("next", view.file, line);
      },
    });

    // 桌面端：编辑模式 + 阅读模式行内 hover 图标
    // 移动端无 hover，不注册图标（命令仍可通过命令面板触发）
    if (!Platform.isMobile) {
      this.registerEditorExtension(
        buildTaskIconField(
          (line, evt) => this.handleIconClick(line, evt),
          () => this.isDailyNoteActive() && this.hasActiveIconAction()
        )
      );

      this.registerMarkdownPostProcessor((el, ctx) => {
        this.processReadingModeTasks(el, ctx);
      });
    }
  }

  onunload(): void {
    // 所有事件通过 registerEvent / registerEditorExtension / registerMarkdownPostProcessor 自动清理
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

  /** 当前 active MarkdownView 的文件是否为日记笔记。 */
  private isDailyNoteActive(): boolean {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    return !!view?.file && !!getCurrentDailyDate(view.file);
  }

  /** 左键或右键至少配置了一个非 none 动作时，才显示行内图标。 */
  private hasActiveIconAction(): boolean {
    return (
      this.settings.leftClickAction !== "none" ||
      this.settings.rightClickAction !== "none"
    );
  }

  /** 编辑模式图标点击：根据事件类型（左键/右键）取对应动作执行。 */
  private handleIconClick(line: number, evt: MouseEvent): void {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view?.file) return;
    if (!getCurrentDailyDate(view.file)) return;
    const action =
      evt.type === "contextmenu"
        ? this.settings.rightClickAction
        : this.settings.leftClickAction;
    this.handleIconAction(action, view.file, line, evt);
  }

  /** 按配置动作分发：popup 弹菜单，prev/next 直接移动，none 忽略。 */
  private handleIconAction(
    action: ClickAction,
    file: TFile,
    taskLine: number,
    evt: MouseEvent
  ): void {
    switch (action) {
      case "popup":
        this.openTaskMenu(file, taskLine, evt);
        break;
      case "prev":
        void this.doMove("prev", file, taskLine);
        break;
      case "next":
        void this.doMove("next", file, taskLine);
        break;
      case "none":
        break;
    }
  }

  /** 弹出前一天/后一天菜单。菜单始终显示所有启用的方向，不随左右键绑定移除。 */
  private openTaskMenu(file: TFile, taskLine: number, evt: MouseEvent): void {
    const showPrev = this.settings.enablePreviousDay;
    const showNext = this.settings.enableNextDay;
    if (!showPrev && !showNext) return;
    const menu = new Menu();
    if (showPrev) {
      menu.addItem((item) => {
        item.setTitle("移动到前一天");
        item.setIcon("arrow-left");
        item.onClick(() => {
          void this.doMove("prev", file, taskLine);
        });
      });
    }
    if (showNext) {
      menu.addItem((item) => {
        item.setTitle("移动到后一天");
        item.setIcon("arrow-right");
        item.onClick(() => {
          void this.doMove("next", file, taskLine);
        });
      });
    }
    menu.showAtMouseEvent(evt);
  }

  /**
   * 移动指定行的任务块到前一天/后一天日记。
   * 不依赖 editor 光标，由调用方传入 file + taskLine（编辑模式图标 / 阅读模式图标 / 命令均走此入口）。
   */
  private async doMove(
    direction: "prev" | "next",
    file: TFile,
    taskLine: number
  ): Promise<void> {
    try {
      const date = getCurrentDailyDate(file);
      if (!date) {
        new Notice("当前笔记不是日记笔记");
        return;
      }

      const cache = this.app.metadataCache.getFileCache(file);
      if (!cache) return;
      const taskItem = getTaskAtLine(cache, taskLine);
      if (!taskItem) return;
      // 兜底：子 task 不允许单独移动（图标层已过滤，命令入口在此拦截）
      if (taskItem.parent >= 0) {
        new Notice("子任务不可单独移动，请移动顶层任务");
        return;
      }

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

  /**
   * 阅读模式：为渲染后的 li.task-list-item 注入行内图标。
   * 用 ctx.getSectionInfo(el) 拿到当前渲染块的源码行范围，
   * 在该范围内按源码顺序取 task，与 DOM 顺序一一对应（嵌套列表也成立）。
   */
  private processReadingModeTasks(
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ): void {
    const tfile = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
    if (!(tfile instanceof TFile)) return;
    if (!getCurrentDailyDate(tfile)) return;
    if (!this.hasActiveIconAction()) return;

    const cache = this.app.metadataCache.getFileCache(tfile);
    if (!cache?.listItems) return;

    const info = ctx.getSectionInfo(el);
    if (!info) return;
    const sectionStart = info.lineStart;
    const sectionEnd = info.lineEnd;

    const sectionTasks = cache.listItems.filter(
      (i) =>
        i.task !== undefined &&
        i.position.start.line >= sectionStart &&
        i.position.start.line <= sectionEnd
    );
    if (sectionTasks.length === 0) return;

    const taskEls = el.findAll("li.task-list-item");
    if (taskEls.length === 0) return;

    const count = Math.min(taskEls.length, sectionTasks.length);
    for (let i = 0; i < count; i++) {
      const taskEl = taskEls[i];
      const taskItem = sectionTasks[i];
      // 仅顶层 task 显示图标（parent < 0 表示无父列表项）
      if (taskItem.parent >= 0) continue;
      const taskLine = taskItem.position.start.line;
      if (taskEl.querySelector(":scope > .dtm-task-icon")) continue;

      const icon = document.createElement("span");
      icon.className = "dtm-task-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.setAttribute("title", "移动任务");
      setIcon(icon, "arrow-left-right");
      icon.addEventListener("click", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleIconClick(taskLine, e);
      });
      icon.addEventListener("contextmenu", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleIconClick(taskLine, e);
      });
      // 行尾插入：嵌套 task 时插到子 ul 之前（task 文本末尾），否则 append 到 li 末尾
      const nestedUl = taskEl.querySelector(":scope > ul, :scope > ol");
      if (nestedUl) {
        nestedUl.before(icon);
      } else {
        taskEl.append(icon);
      }
    }
  }
}
