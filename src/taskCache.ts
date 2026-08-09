import { CachedMetadata, ListItemCache } from "obsidian";

/**
 * 在 cache.listItems 中查找位于指定行且为任务（task 字段非 undefined）的列表项。
 */
export function getTaskAtLine(
  cache: CachedMetadata,
  line: number
): ListItemCache | null {
  if (!cache.listItems) return null;
  for (const item of cache.listItems) {
    if (
      item.position.start.line === line &&
      item.task !== undefined
    ) {
      return item;
    }
  }
  return null;
}

/**
 * 递归收集 taskItem 的全部后代列表项（基于 ListItemCache.parent）。
 * parent 字段为父项的 position.start.line；根级列表项 parent 为负数。
 */
function collectDescendants(
  cache: CachedMetadata,
  parentLine: number
): ListItemCache[] {
  if (!cache.listItems) return [];
  const result: ListItemCache[] = [];
  const queue: number[] = [parentLine];
  const visited = new Set<number>();
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const item of cache.listItems) {
      if (item.parent === current && item.position.start.line !== parentLine) {
        result.push(item);
        queue.push(item.position.start.line);
      }
    }
  }
  return result;
}

/**
 * 计算任务块的行范围：从任务行开始，到所有后代中最大的 position.end.line。
 * 无后代时 endLine 即任务自身的 position.end.line。
 */
export function getTaskBlockRange(
  cache: CachedMetadata,
  taskItem: ListItemCache
): { startLine: number; endLine: number } {
  const startLine = taskItem.position.start.line;
  let endLine = taskItem.position.end.line;
  const descendants = collectDescendants(cache, startLine);
  for (const d of descendants) {
    if (d.position.end.line > endLine) {
      endLine = d.position.end.line;
    }
  }
  return { startLine, endLine };
}

/**
 * 派生任务上方最近的标题：在 cache.headings 中找 position.start.line < taskLine
 * 且最大的一项。无则返回 null。
 */
export function deriveSourceHeading(
  cache: CachedMetadata,
  taskLine: number
): { level: number; text: string } | null {
  if (!cache.headings || cache.headings.length === 0) return null;
  let best: { level: number; text: string; line: number } | null = null;
  for (const h of cache.headings) {
    if (h.position.start.line < taskLine) {
      if (!best || h.position.start.line > best.line) {
        best = {
          level: h.level,
          text: h.heading,
          line: h.position.start.line,
        };
      }
    }
  }
  if (!best) return null;
  return { level: best.level, text: best.text };
}
