// The /diet page is not date-aware - it always shows today's menu.
export function dietDate(): string {
  return new Date().toISOString().slice(0, 10);
}
