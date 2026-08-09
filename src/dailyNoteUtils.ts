import { Notice, TFile, Vault, moment } from "obsidian";
import {
  appHasDailyNotesPluginLoaded,
  createDailyNote,
  getDateFromFile,
  getDailyNoteSettings,
} from "obsidian-daily-notes-interface";

/**
 * 从 daily notes 配置中获取 format，默认 YYYY-MM-DD。
 * format 可能含 `/`（如 `YYYY/YYYY-MM/YYYY-MM-DD`），其中 `/` 是路径分隔符。
 */
function getResolvedFormat(): string {
  const settings = getDailyNoteSettings();
  return settings.format || "YYYY-MM-DD";
}

/**
 * 从 daily notes 配置中获取 folder（去尾部斜杠），空则返回 ""。
 */
function getResolvedFolder(): string {
  const settings = getDailyNoteSettings();
  return (settings.folder || "").replace(/\/$/, "");
}

/**
 * 根据日期计算日记笔记的预期路径（folder + date.format(format) + ".md"）。
 */
export function getDailyNotePath(date: moment.Moment): string {
  const format = getResolvedFormat();
  const folder = getResolvedFolder();
  const filename = date.format(format);
  return (folder.length > 0 ? folder + "/" : "") + filename + ".md";
}

/**
 * 判断当前文件是否为日记笔记：
 * 1. 检查 daily notes 核心插件已启用。
 * 2. 校验路径位于 daily notes 配置目录下（folder 非空时）。
 * 3. 用 obsidian-daily-notes-interface 的 getDateFromFile 解析 basename 得到候选日期。
 * 4. 用候选日期反推完整路径，校验与实际路径一致，避免同名误判
 *    （getDateFromFile 只解析 basename，不校验目录结构）。
 */
export function getCurrentDailyDate(file: TFile): moment.Moment | null {
  if (!appHasDailyNotesPluginLoaded()) return null;

  const folder = getResolvedFolder();

  // 校验目录
  if (folder.length > 0) {
    const prefix = folder + "/";
    if (!file.path.startsWith(prefix) && file.path !== folder) {
      return null;
    }
  }

  // 用库的官方 API 解析文件名得到候选日期
  const candidate = getDateFromFile(file, "day");
  if (!candidate || !candidate.isValid()) return null;

  // 校验完整路径结构：folder + date.format(format) + ".md" 应等于 file.path
  const format = getResolvedFormat();
  const expectedRelative = candidate.format(format);
  const expectedPath =
    (folder.length > 0 ? folder + "/" : "") + expectedRelative + ".md";
  if (file.path !== expectedPath) return null;

  return candidate;
}

/**
 * 在 vault 中按路径查找已存在的日记笔记文件。
 */
function findDailyNote(vault: Vault, date: moment.Moment): TFile | null {
  const path = getDailyNotePath(date);
  const file = vault.getAbstractFileByPath(path);
  return file instanceof TFile ? file : null;
}

/**
 * 获取或创建指定日期的日记笔记。
 * 不依赖 getAllDailyNotes（folder 为空时该函数会抛错），改为按路径直接查找。
 * 找不到时调用 createDailyNote（会处理模板与子目录创建）。
 */
export async function getOrCreateDailyNote(
  date: moment.Moment
): Promise<TFile> {
  const existing = findDailyNote(window.app.vault, date);
  if (existing) return existing;

  const created = await createDailyNote(date);
  if (!created) {
    new Notice("创建日记笔记失败");
    throw new Error("创建日记笔记失败");
  }
  return created;
}
