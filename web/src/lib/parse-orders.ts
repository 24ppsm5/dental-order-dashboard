import type { OrderItem, RoomMessage } from "@/lib/data";

const DATE_LINE = /^#(\d{4}-\d{2}-\d{2})\s*$/;

export function parseOrdersFromMessages(
  messages: RoomMessage[],
  roomId: number
): OrderItem[] {
  return messages.flatMap((m) => parseOrdersFromMessage(m, roomId));
}

function parseOrdersFromMessage(
  message: RoomMessage,
  roomId: number
): OrderItem[] {
  const lines = message.body.split(/\r?\n/);
  const items: OrderItem[] = [];
  let currentDate: string | null = null;
  let pendingItems: string[] = [];

  const flush = () => {
    if (!currentDate || pendingItems.length === 0) {
      pendingItems = [];
      return;
    }
    pendingItems.forEach((itemName, idx) => {
      items.push({
        id: `${message.message_id}-${currentDate}-${idx}`,
        date: currentDate!,
        itemName,
        status: "pending",
        roomId,
      });
    });
    pendingItems = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const dateMatch = line.match(DATE_LINE);
    if (dateMatch) {
      flush();
      currentDate = dateMatch[1];
      continue;
    }
    if (line.startsWith("@")) continue;
    if (line.startsWith("/") && currentDate) {
      pendingItems.push(line.slice(1).trim());
    }
  }
  flush();
  return items;
}

export function formatOrderDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${y}.${m}.${d}`;
}

export function groupOrdersByDate(
  orders: OrderItem[]
): { date: string; items: OrderItem[] }[] {
  const map = new Map<string, OrderItem[]>();
  for (const order of orders) {
    const list = map.get(order.date) ?? [];
    list.push(order);
    map.set(order.date, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, items }));
}
