"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, ExternalLink, Package, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FACILITIES,
  MOCK_MESSAGES,
  ORDER_LINKS,
  type Facility,
  type OrderItem,
  type OrderStatus,
} from "@/lib/data";
import {
  formatOrderDate,
  groupOrdersByDate,
  parseOrdersFromMessages,
} from "@/lib/parse-orders";
import { cn } from "@/lib/utils";

const STATUS_KEY = "dental-order-statuses";

function loadStatuses(): Record<string, OrderStatus> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, OrderStatus>) : {};
  } catch {
    return {};
  }
}

function saveStatuses(statuses: Record<string, OrderStatus>) {
  localStorage.setItem(STATUS_KEY, JSON.stringify(statuses));
}

export default function Home() {
  const [selectedRoomId, setSelectedRoomId] = useState(
    FACILITIES[0]?.roomId ?? 0
  );
  const [filter, setFilter] = useState<OrderStatus>("pending");
  const [statuses, setStatuses] = useState<Record<string, OrderStatus>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStatuses(loadStatuses());
    setHydrated(true);
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
    () => orders.filter((o) => o.status === filter),
    [orders, filter]
  );

  const grouped = useMemo(() => groupOrdersByDate(filtered), [filtered]);

  const setOrderStatus = useCallback((id: string, status: OrderStatus) => {
    setStatuses((prev) => {
      const next = { ...prev, [id]: status };
      saveStatuses(next);
      return next;
    });
  }, []);

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
          <p className="text-xs text-muted-foreground">モックデータ版</p>
        </div>
      </header>

      {/* 3ペイン */}
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
              onValueChange={(v) => setFilter(v as OrderStatus)}
            >
              <TabsList>
                <TabsTrigger value="pending">未発注</TabsTrigger>
                <TabsTrigger value="ordered">発注済み</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-5">
              {grouped.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-20 text-center text-muted-foreground">
                  <Package className="size-10 opacity-40" />
                  <p className="text-sm">
                    {filter === "pending"
                      ? "未発注の依頼はありません"
                      : "発注済みの依頼はありません"}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {grouped.map(({ date, items }) => (
                    <section
                      key={date}
                      className="rounded-xl border border-border bg-card shadow-sm"
                    >
                      <div className="border-b border-border bg-muted/40 px-4 py-3">
                        <p className="font-semibold">{formatOrderDate(date)}</p>
                      </div>
                      <ul className="divide-y divide-border">
                        {items.map((order) => (
                          <li
                            key={order.id}
                            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                          >
                            <p className="text-sm font-medium">
                              <span className="text-muted-foreground">・</span>
                              {order.itemName}
                            </p>
                            <div className="flex shrink-0 items-center gap-2">
                              <Badge
                                variant={
                                  order.status === "pending"
                                    ? "secondary"
                                    : "default"
                                }
                                className={cn(
                                  order.status === "ordered" &&
                                    "bg-emerald-600 hover:bg-emerald-600"
                                )}
                              >
                                {order.status === "pending"
                                  ? "未発注"
                                  : "発注済み"}
                              </Badge>
                              {order.status === "pending" ? (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    setOrderStatus(order.id, "ordered")
                                  }
                                >
                                  発注済みにする
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setOrderStatus(order.id, "pending")
                                  }
                                >
                                  未発注に戻す
                                </Button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </main>

        {/* 3. 発注先リンク集 */}
        <aside className="flex h-full w-72 shrink-0 flex-col border-l border-border bg-muted/30">
          <div className="border-b border-border px-4 py-4">
            <h2 className="text-sm font-semibold">発注先リンク集</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              別タブで開きます
            </p>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {ORDER_LINKS.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Card className="transition-shadow hover:shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base">{link.name}</CardTitle>
                        <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                      </div>
                      <CardDescription className="truncate text-xs">
                        {link.url}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </a>
              ))}
            </div>
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}

function FacilityButton({
  facility,
  selected,
  onSelect,
}: {
  facility: Facility;
  selected: boolean;
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
        <span className="font-medium leading-snug">{facility.name}</span>
      </button>
    </li>
  );
}
