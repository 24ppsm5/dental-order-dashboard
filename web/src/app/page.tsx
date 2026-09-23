"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  Circle,
  History,
  Loader2,
  Package,
  Search,
  Stethoscope,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductMasterForm } from "@/components/product-master-form";
import {
  FACILITIES,
  getFacilityByRoomId,
  MOCK_MESSAGES,
  type Facility,
  type OrderItem,
  type OrderStatus,
} from "@/lib/data";
import {
  createHistoryRecord,
  formatHistoryLine,
  removeHistoryRecord,
  upsertHistoryRecord,
  type OrderHistoryRecord,
} from "@/lib/order-history";
import {
  formatOrderDate,
  groupOrdersByDate,
  parseOrdersFromMessages,
} from "@/lib/parse-orders";
import { cn } from "@/lib/utils";

type ListFilter = "all" | "pending";

export default function Home() {
  const [selectedRoomId, setSelectedRoomId] = useState(
    FACILITIES[0]?.roomId ?? 0
  );
  const [filter, setFilter] = useState<ListFilter>("all");
  const [statuses, setStatuses] = useState<Record<string, OrderStatus>>({});
  const [history, setHistory] = useState<OrderHistoryRecord[]>([]);
  const [historyQuery, setHistoryQuery] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  // 発注ステータス・履歴は Airtable（共有データベース）から取得する。
  // これで複数人・複数端末で同じ状態を見られる。
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/order-status");
        const data = (await res.json()) as {
          statuses?: Record<string, OrderStatus>;
          history?: OrderHistoryRecord[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? "発注状況の取得に失敗しました");
        }
        if (!cancelled) {
          setStatuses(data.statuses ?? {});
          setHistory(data.history ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setActionError(
            err instanceof Error ? err.message : "発注状況の取得に失敗しました"
          );
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const facility = useMemo(
    () => FACILITIES.find((f) => f.roomId === selectedRoomId) ?? null,
    [selectedRoomId]
  );

  const orders = useMemo(() => {
    const messages = MOCK_MESSAGES[selectedRoomId] ?? [];
    const parsed = parseOrdersFromMessages(messages, selectedRoomId);
    if (!hydrated) return parsed;
    return parsed.map((o) => ({
      ...o,
      status: statuses[o.id] ?? o.status,
    }));
  }, [selectedRoomId, statuses, hydrated]);

  const filtered = useMemo(
    () => orders.filter((o) => filter === "all" || o.status === "pending"),
    [orders, filter]
  );

  const grouped = useMemo(() => groupOrdersByDate(filtered), [filtered]);

  // 施設ごとの未発注件数（1ペイン目のバッジ表示用）
  const pendingCountByRoomId = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const f of FACILITIES) {
      const messages = MOCK_MESSAGES[f.roomId] ?? [];
      const parsed = parseOrdersFromMessages(messages, f.roomId);
      counts[f.roomId] = hydrated
        ? parsed.filter((o) => (statuses[o.id] ?? o.status) === "pending")
            .length
        : parsed.filter((o) => o.status === "pending").length;
    }
    return counts;
  }, [statuses, hydrated]);

  const filteredHistory = useMemo(() => {
    const q = historyQuery.trim();
    if (!q) return history;
    return history.filter(
      (r) =>
        r.itemName.includes(q) ||
        r.facilityName.includes(q) ||
        r.orderDate.includes(q)
    );
  }, [history, historyQuery]);

  const setOrderStatus = useCallback(
    async (id: string, status: OrderStatus) => {
      const order = orders.find((o) => o.id === id);
      if (!order) return;

      const orderFacility = getFacilityByRoomId(order.roomId);
      const facilityName = orderFacility?.name ?? "不明";

      setActionError(null);

      try {
        const res = await fetch("/api/order-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            status,
            facilityName,
            itemName: order.itemName,
            orderDate: order.date,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? "更新に失敗しました");
        }

        setStatuses((prev) => ({ ...prev, [id]: status }));

        if (status === "ordered") {
          const entry = createHistoryRecord({
            id,
            orderDate: order.date,
            itemName: order.itemName,
            facilityName,
          });
          setHistory((prev) => upsertHistoryRecord(prev, entry));
        } else {
          setHistory((prev) => removeHistoryRecord(prev, id));
        }
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : "更新に失敗しました"
        );
      }
    },
    [orders]
  );

  // チェックリストのタップで 未発注 ⇄ 発注済み を切り替える
  const handleToggle = useCallback(
    async (order: OrderItem) => {
      const next: OrderStatus =
        order.status === "ordered" ? "pending" : "ordered";

      setUpdatingIds((prev) => {
        const nextSet = new Set(prev);
        nextSet.add(order.id);
        return nextSet;
      });

      try {
        await setOrderStatus(order.id, next);
      } finally {
        setUpdatingIds((prev) => {
          const nextSet = new Set(prev);
          nextSet.delete(order.id);
          return nextSet;
        });
      }
    },
    [setOrderStatus]
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* ヘッダー */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-white px-5 py-3 shadow-sm">
        <div className="flex size-9 items-center justify-center rounded-lg bg-teal-600 text-white">
          <Stethoscope className="size-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            歯科材料 発注管理
          </h1>
          <p className="text-xs text-muted-foreground">
            発注ステータスはAirtableで共有されます
          </p>
        </div>
      </header>

      {actionError && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-destructive/30 bg-destructive/5 px-5 py-2 text-xs text-destructive">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="shrink-0 underline underline-offset-2"
          >
            閉じる
          </button>
        </div>
      )}

      {/* 4ペイン */}
      <div className="flex min-h-0 flex-1">
        {/* 1. 施設一覧 */}
        <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-sidebar">
          <div className="border-b border-sidebar-border px-4 py-4">
            <h2 className="text-sm font-semibold text-sidebar-foreground">
              施設一覧
            </h2>
          </div>
          <ScrollArea className="flex-1">
            <nav className="p-2">
              <ul className="space-y-1">
                {FACILITIES.map((f) => (
                  <FacilityButton
                    key={f.id}
                    facility={f}
                    selected={selectedRoomId === f.roomId}
                    pendingCount={pendingCountByRoomId[f.roomId] ?? 0}
                    onSelect={() => setSelectedRoomId(f.roomId)}
                  />
                ))}
              </ul>
            </nav>
          </ScrollArea>
        </aside>

        {/* 2. 発注リスト */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-semibold">
                {facility?.name ?? "発注リスト"}
              </h2>
              <p className="text-xs text-muted-foreground">発注依頼一覧</p>
            </div>
            <Tabs
              value={filter}
              onValueChange={(v) => setFilter(v as ListFilter)}
            >
              <TabsList>
                <TabsTrigger value="all">全表示</TabsTrigger>
                <TabsTrigger value="pending">未発注</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-5">
              {grouped.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-20 text-center text-muted-foreground">
                  <Package className="size-10 opacity-40" />
                  <p className="text-sm">
                    {filter === "all"
                      ? "発注依頼はありません"
                      : "未発注の依頼はありません"}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {grouped.map(({ date, items }) => (
                    <DateGroup
                      key={date}
                      date={date}
                      items={items}
                      updatingIds={updatingIds}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </main>

        {/* 3. 過去の発注履歴 */}
        <aside className="flex h-full w-72 shrink-0 flex-col border-l border-border bg-background">
          <div className="border-b border-border px-4 py-4">
            <h2 className="text-sm font-semibold">過去の発注履歴</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              発注済みにした商品（全施設）
            </p>
          </div>
          <div className="border-b border-border px-3 py-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
                placeholder="施設名・商品名・日付で絞り込み"
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3">
              {!hydrated ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  読み込み中…
                </p>
              ) : filteredHistory.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
                  <History className="size-8 opacity-40" />
                  <p className="text-xs">
                    {history.length === 0
                      ? "発注済みの履歴はありません"
                      : "該当する履歴が見つかりません"}
                  </p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {filteredHistory.map((record) => (
                    <li
                      key={record.id}
                      className="rounded-md px-2 py-2 text-sm leading-relaxed hover:bg-muted/60"
                    >
                      {formatHistoryLine(record)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* 4. 商品マスター登録 + リンク集 */}
        <ProductMasterForm />
      </div>
    </div>
  );
}

function FacilityButton({
  facility,
  selected,
  pendingCount,
  onSelect,
}: {
  facility: Facility;
  selected: boolean;
  pendingCount: number;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
          selected
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/60"
        )}
      >
        <Building2
          className={cn(
            "size-4 shrink-0",
            selected ? "text-primary" : "text-muted-foreground"
          )}
        />
        <span className="flex-1 min-w-0 truncate font-medium leading-snug">
          {facility.name}
        </span>
        {pendingCount > 0 && (
          <Badge
            variant={selected ? "default" : "secondary"}
            className="shrink-0"
          >
            {pendingCount}
          </Badge>
        )}
      </button>
    </li>
  );
}

/** 日付ごとの発注グループ。折りたたみ可能で、各アイテムはチェックリスト形式でタップして状態を切り替える */
function DateGroup({
  date,
  items,
  updatingIds,
  onToggle,
}: {
  date: string;
  items: OrderItem[];
  updatingIds: Set<string>;
  onToggle: (order: OrderItem) => void;
}) {
  const [open, setOpen] = useState(true);
  const orderedCount = items.filter((i) => i.status === "ordered").length;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between gap-3 bg-muted/40 px-4 py-3 text-left",
          open && "border-b border-border"
        )}
      >
        <span className="font-semibold">{formatOrderDate(date)}</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {orderedCount > 0 && `${orderedCount}/${items.length} 発注済み`}
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              !open && "-rotate-90"
            )}
          />
        </span>
      </button>
      {open && (
        <ul className="divide-y divide-border">
          {items.map((order) => {
            const updating = updatingIds.has(order.id);
            return (
              <li key={order.id}>
                <button
                  type="button"
                  onClick={() => onToggle(order)}
                  disabled={updating}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updating ? (
                    <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" />
                  ) : order.status === "ordered" ? (
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                  ) : (
                    <Circle className="size-5 shrink-0 text-muted-foreground" />
                  )}
                  <span
                    className={cn(
                      "text-sm font-medium",
                      order.status === "ordered" &&
                        "text-muted-foreground line-through"
                    )}
                  >
                    {order.itemName}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
