export type OrderStatus = "pending" | "ordered";

export interface Facility {
  id: string;
  name: string;
  roomId: number;
}

export interface RoomMessage {
  message_id: string;
  account: { name: string };
  body: string;
  send_time: number;
}

export interface OrderItem {
  id: string;
  date: string;
  itemName: string;
  status: OrderStatus;
  roomId: number;
}

export const FACILITIES: Facility[] = [
  { id: "gorilla", name: "ゴリラクリニック", roomId: 432513074 },
  { id: "lion", name: "ライオンクリニック", roomId: 432513219 },
  { id: "panda", name: "パンダクリニック", roomId: 432513221 },
  { id: "capybara", name: "カバクリニック", roomId: 432513224 },
];

export function getFacilityByRoomId(roomId: number): Facility | undefined {
  return FACILITIES.find((f) => f.roomId === roomId);
}

export const ORDER_LINKS = [
  { name: "Ciモール", url: "https://www.ci-medical.com/" },
  { name: "FEED", url: "https://dental.feed.jp/" },
] as const;

/** デモ用メッセージ（架空データのみ） */
export const MOCK_MESSAGES: Record<number, RoomMessage[]> = {
  432513074: [
    {
      message_id: "1001",
      account: { name: "デモ担当1" },
      body: "#2026-05-22\n/プレオルソ\n/パワーチェーン\n/モジュール",
      send_time: 1747872000,
    },
    {
      message_id: "1002",
      account: { name: "デモ担当2" },
      body: "#2026-05-20\n/エラスティック\n@デモ担当1：確認お願いします\n未着手_>>>在庫確認",
      send_time: 1747699200,
    },
  ],
  432513219: [
    {
      message_id: "2001",
      account: { name: "デモ担当1" },
      body: "#2026-05-21\n/ブラケット\n/アーチワイヤー",
      send_time: 1747785600,
    },
  ],
  432513221: [
    {
      message_id: "3001",
      account: { name: "デモ担当1" },
      body: "#2026-05-22\n@デモ担当2：リファイメント\n未着手_>>>作業メモ",
      send_time: 1747875600,
    },
    {
      message_id: "3002",
      account: { name: "デモ担当2" },
      body: "#2026-05-19\n/インビザライン用アタッチメント",
      send_time: 1747612800,
    },
  ],
  432513224: [
    {
      message_id: "4001",
      account: { name: "デモ担当1" },
      body: "#2026-05-18\n/ゴムかけ\n/フロス",
      send_time: 1747526400,
    },
  ],
};
