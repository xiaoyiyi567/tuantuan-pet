export function formatTimer(timestamp: number | null, now: number): string {
  if (!timestamp) return "关闭";
  const absolute = new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit" }).format(timestamp);
  const remainingMs = timestamp - now;
  if (remainingMs <= 0) return `${absolute} 现在`;
  const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  return `${absolute}（${remainingMinutes} 分钟）`;
}

export function formatTimestamp(timestamp: number | null): string {
  if (!timestamp) return "从未";
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(timestamp);
}
