import { StateField, Range, EditorState } from "@codemirror/state";
import {
  EditorView,
  WidgetType,
  Decoration,
  DecorationSet,
} from "@codemirror/view";
import { setIcon } from "obsidian";

/**
 * 匹配 task 行：`- [ ]` / `- [x]` / `* [X]` 等，捕获前导缩进。
 * 缩进长度 > 0 视为子项（不显示图标），= 0 为顶层。
 * 编辑模式拿不到 metadataCache，用缩进近似判断；doMove 另用 cache.parent 兜底。
 */
const TASK_LINE_REGEX = /^(\s*)[-*+]\s+\[[ xX]\]/;

/**
 * 行内 hover 图标的 widget：点击触发 onClick(line, evt)，
 * 由插件层弹出 Menu。ignoreEvent 返回 true 以阻止点击移动光标。
 */
class TaskIconWidget extends WidgetType {
  constructor(
    readonly line: number,
    readonly onClick: (line: number, evt: MouseEvent) => void
  ) {
    super();
  }

  eq(other: TaskIconWidget): boolean {
    return other.line === this.line;
  }

  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = "dtm-task-icon";
    span.setAttribute("aria-hidden", "true");
    span.setAttribute("title", "移动任务");
    setIcon(span, "arrow-left-right");
    span.addEventListener("click", (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      this.onClick(this.line, e);
    });
    span.addEventListener("contextmenu", (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      this.onClick(this.line, e);
    });
    return span;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

function buildDecorations(
  state: EditorState,
  onClick: (line: number, evt: MouseEvent) => void
): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  for (let i = 1; i <= state.doc.lines; i++) {
    const line = state.doc.line(i);
    const match = TASK_LINE_REGEX.exec(line.text);
    if (match) {
      // 缩进 > 0 视为子项，不显示图标（仅顶层 task 可移动）
      if (match[1].length > 0) continue;
      // cache 的 listItems 行号是 0-based，这里存 0-based line
      const widget = new TaskIconWidget(i - 1, onClick);
      // 行尾插入：side: 1 使 widget 位于行末换行前
      decorations.push(
        Decoration.widget({ widget, side: 1 }).range(line.to)
      );
    }
  }
  return Decoration.set(decorations, true);
}

/**
 * 构造编辑模式的行内图标扩展。
 * isEnabled 控制是否生成图标（仅日记笔记中显示）。
 * 切换文件时 EditorState 重建、create 重新跑，isEnabled 重新判断。
 */
export function buildTaskIconField(
  onClick: (line: number, evt: MouseEvent) => void,
  isEnabled: () => boolean
): StateField<DecorationSet> {
  return StateField.define<DecorationSet>({
    create(state: EditorState): DecorationSet {
      return isEnabled() ? buildDecorations(state, onClick) : Decoration.none;
    },
    update(value: DecorationSet, tr): DecorationSet {
      if (tr.docChanged) {
        return isEnabled()
          ? buildDecorations(tr.state, onClick)
          : Decoration.none;
      }
      return value;
    },
    provide: (field) => EditorView.decorations.from(field),
  });
}
