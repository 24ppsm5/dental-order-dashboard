import { formatOrderDate } from "@/lib/parse-orders";

/** 過去の発注履歴（DB移行時もこの型を利用可能） */
export interface OrderHistoryRecord {
  id: string;
  orderDate: string;
  itemName: string;
  facilityName: string;
  markedAt: string;
}

const HISTORY_KEY = "dental-order-history";

export function loadHistory(): OrderHistoryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OrderHistoryRecord[];
    return Array.isArray(parsed) ? sortHistory(parsed) : [];
  } catch {
    return [];
  }
}

export function saveHistory(records: OrderHistoryRecord[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(sortHistory(records)));
}

export function sortHistory(
  records: OrderHistoryRecord[]
): OrderHistoryRecord[] {
  return [...records].sort(
    (a, b) => new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime()
  );
}

export function upsertHistoryRecord(
  records: OrderHistoryRecord[],
  entry: OrderHistoryRecord
): OrderHistoryRecord[] {
  const filtered = records.filter((r) => r.id !== entry.id);
  return sortHistory([...filtered, entry]);
}

export function removeHistoryRecord(
  records: OrderHistoryRecord[],
  id: string
): OrderHistoryRecord[] {
  return records.filter((r) => r.id !== id);
}

/** 表示例: 2026.05.01　ナルト　ゴリラクリニック */
export function formatHistoryLine(record: OrderHistoryRecord): string {
  return `${formatOrderDate(record.orderDate)}　${record.itemName}　${record.facilityName}`;
}

export function createHistoryRecord(params: {
  id: string;
  orderDate: string;
  itemName: string;
  facilityName: string;
}): OrderHistoryRecord {
  return { ...params, markedAt: new Date().toISOString() };
}
