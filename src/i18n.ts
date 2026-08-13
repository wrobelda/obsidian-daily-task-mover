import en from "./locale/en";
import zhCN from "./locale/zh-cn";
import type { Language } from "./settings";

/** 语言包结构：以英文为基准的键集合。 */
type Dict = typeof en;

/** 手动选择的语言；null 表示跟随 Obsidian 界面语言。 */
let manualLanguage: Language | null = null;

/**
 * 设置手动语言。由插件在加载设置时调用，覆盖自动检测。
 * 传 "auto"（或 null）时恢复为跟随 Obsidian 界面语言。
 */
export function setLanguage(language: Language): void {
  manualLanguage = language === "auto" ? null : language;
}

/** 依据手动选择或 Obsidian UI 语言选择语言包。moment.locale() 跟随 Obsidian 界面语言。中文前缀统一走简体中文。 */
function getDict(): Dict {
  if (manualLanguage === "zh-cn") return zhCN;
  if (manualLanguage === "en") return en;
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