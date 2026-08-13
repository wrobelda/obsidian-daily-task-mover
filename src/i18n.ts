import en from "./locale/en";
import zhCN from "./locale/zh-cn";

/** 语言包结构：以英文为基准的键集合。 */
type Dict = typeof en;

/** 根据 Obsidian UI 语言选择语言包。moment.locale() 跟随 Obsidian 界面语言。中文前缀统一走简体中文。 */
function getDict(): Dict {
  const locale = (window.moment?.locale?.() ?? "en").toLowerCase();
  return locale.startsWith("zh") ? zhCN : en;
}

/**
 * 按键取当前语言文案；可用 params 做 {key} 插值。
 * 两个语言包键结构一致（TS 类型约束），此处访问不会缺失。
 */
export function t(key: keyof typeof en, params?: Record<string, string>): string {
  let s: string = getDict()[key];
  if (params) {
    for (const k of Object.keys(params)) {
      s = s.split(`{${k}}`).join(params[k]);
    }
  }
  return s;
}