import { formatOrderDate } from "@/lib/parse-orders";

/** 過去の発注履歴（Airtable の発注ステータステーブルから組み立てる） */
export interface OrderHistoryRecord {
  id: string;
  orderDate: string;
  itemName: string;
  facilityName: string;
  markedAt: string;
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
