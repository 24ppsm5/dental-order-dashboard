"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ChevronDown,
  Clock,
  ExternalLink,
  Link2,
  Loader2,
  PackagePlus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ORDER_LINKS } from "@/lib/data";
import {
  PRODUCT_FIELD_NAMES,
  type ProductMasterInput,
} from "@/lib/products/types";
import {
  addRecentProductName,
  loadRecentProductNames,
} from "@/lib/recent-products";
import { cn } from "@/lib/utils";

type FormState = {
  name: string;
  unit: string;
  price: string;
  vendor: string;
  orderNumber: string;
};

type ProductListItem = ProductMasterInput & { recordId: string };

const EMPTY_FORM: FormState = {
  name: "",
  unit: "",
  price: "",
  vendor: "",
  orderNumber: "",
};

export function ProductMasterForm() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [recentProducts, setRecentProducts] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const res = await fetch("/api/products");
      const data = (await res.json()) as {
        products?: ProductListItem[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "商品一覧の取得に失敗しました");
      }
      setProducts(data.products ?? []);
    } catch (err) {
      setProductsError(
        err instanceof Error ? err.message : "商品一覧の取得に失敗しました"
      );
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    setRecentProducts(loadRecentProductNames());
    setHydrated(true);
    fetchProducts();
  }, [fetchProducts]);

  const update = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (message) setMessage(null);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open && !submitting) {
      // 閉じたときは次に開いたとき真っさらな状態から入力できるようにする
      setForm(EMPTY_FORM);
      setMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const payload: ProductMasterInput = {
      name: form.name.trim(),
      unit: form.unit.trim(),
      price: Number(form.price),
      vendor: form.vendor.trim(),
      orderNumber: form.orderNumber.trim(),
    };

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as {
        success?: boolean;
        message?: string;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "登録に失敗しました");
      }

      const updated = addRecentProductName(payload.name);
      setRecentProducts(updated);
      setForm(EMPTY_FORM);
      fetchProducts();
      // 登録できたらポップを閉じる（一覧・最近登録した商品が更新結果を示す）
      setDialogOpen(false);
      setMessage(null);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "登録に失敗しました",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    setDeletingId(recordId);
    setProductsError(null);
    try {
      const res = await fetch(`/api/products/${recordId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "商品の削除に失敗しました");
      }
      setProducts((prev) => prev.filter((p) => p.recordId !== recordId));
    } catch (err) {
      setProductsError(
        err instanceof Error ? err.message : "商品の削除に失敗しました"
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-border bg-muted/30">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col">
          {/* 1. 商品マスター登録（ボタンからポップアップで登録） */}
          <section className="bg-background">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold">商品マスター登録</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Airtable「商品マスター」へ追加
                </p>
              </div>
              <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
                <DialogTrigger
                  render={
                    <Button type="button" size="sm" className="shrink-0">
                      <PackagePlus />
                      登録
                    </Button>
                  }
                />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>商品マスター登録</DialogTitle>
                    <DialogDescription>
                      Airtable「商品マスター」へ追加します
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <Field
                      id="product-name"
                      label={PRODUCT_FIELD_NAMES.name}
                      value={form.name}
                      onChange={(v) => update("name", v)}
                      placeholder="例：プレオルソ"
                      required
                    />
                    <Field
                      id="product-unit"
                      label={PRODUCT_FIELD_NAMES.unit}
                      value={form.unit}
                      onChange={(v) => update("unit", v)}
                      placeholder="例：個"
                      required
                    />
                    <Field
                      id="product-price"
                      label={PRODUCT_FIELD_NAMES.price}
                      value={form.price}
                      onChange={(v) => update("price", v)}
                      placeholder="例：1500"
                      type="number"
                      min="0"
                      step="1"
                      required
                    />
                    <Field
                      id="product-vendor"
                      label={PRODUCT_FIELD_NAMES.vendor}
                      value={form.vendor}
                      onChange={(v) => update("vendor", v)}
                      placeholder="例：Ciモール"
                      required
                    />
                    <Field
                      id="product-order-number"
                      label={PRODUCT_FIELD_NAMES.orderNumber}
                      value={form.orderNumber}
                      onChange={(v) => update("orderNumber", v)}
                      placeholder="例：CI-12345"
                      required
                    />

                    {message && (
                      <div
                        className={cn(
                          "rounded-lg px-3 py-2 text-xs",
                          message.type === "success"
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border border-destructive/30 bg-destructive/5 text-destructive"
                        )}
                        role="alert"
                      >
                        {message.text}
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="animate-spin" />
                          登録中…
                        </>
                      ) : (
                        <>
                          <PackagePlus />
                          登録
                        </>
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </section>

          <Separator />

          {/* 2. 登録済み商品一覧（Airtable と同期） */}
          <SidebarSection
            icon={<PackagePlus className="size-3.5 text-muted-foreground" />}
            title="登録済み商品一覧"
            meta={
              <span className="text-[10px] text-muted-foreground">
                {productsLoading ? "更新中…" : `${products.length}件`}
              </span>
            }
          >
            {productsError && (
              <div
                className="mb-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                role="alert"
              >
                {productsError}
              </div>
            )}
            {productsLoading ? (
              <p className="text-xs text-muted-foreground">読み込み中…</p>
            ) : products.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                登録された商品はまだありません
              </p>
            ) : (
              <ul className="space-y-1.5">
                {products.map((p) => (
                  <li
                    key={p.recordId}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background px-2 py-1.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {p.vendor} ・ {p.unit} ・ {p.price.toLocaleString()}円
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                      disabled={deletingId === p.recordId}
                      onClick={() => handleDelete(p.recordId)}
                      aria-label={`${p.name}を削除`}
                    >
                      {deletingId === p.recordId ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </SidebarSection>

          <Separator />

          {/* 3. 最近登録した商品 */}
          <SidebarSection
            icon={<Clock className="size-3.5 text-muted-foreground" />}
            title="最近登録した商品"
          >
            {!hydrated ? (
              <p className="text-xs text-muted-foreground">読み込み中…</p>
            ) : recentProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                登録した商品がここに表示されます
              </p>
            ) : (
              <ul className="space-y-1.5">
                {recentProducts.map((name) => (
                  <li
                    key={name}
                    className="rounded-md px-2 py-1.5 text-sm font-medium"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            )}
          </SidebarSection>

          <Separator />

          {/* 4. リンク集 */}
          <SidebarSection
            icon={<Link2 className="size-3.5 text-muted-foreground" />}
            title="リンク集"
            className="pb-4"
          >
            <ul className="space-y-0.5">
              {ORDER_LINKS.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
                  >
                    <span className="text-muted-foreground">・</span>
                    <span className="min-w-0 flex-1 truncate">{link.name}</span>
                    <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                  </a>
                </li>
              ))}
            </ul>
          </SidebarSection>
        </div>
      </ScrollArea>
    </aside>
  );
}

/** サイドバーの折りたたみ可能なセクション。ヘッダーをタップすると開閉する */
function SidebarSection({
  icon,
  title,
  meta,
  defaultOpen = true,
  className,
  children,
}: {
  icon: ReactNode;
  title: string;
  meta?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={cn("bg-background/80", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between gap-1.5 px-4 py-2.5 text-left",
          open && "border-b border-border"
        )}
      >
        <span className="flex items-center gap-1.5">
          {icon}
          <h3 className="text-xs font-semibold">{title}</h3>
        </span>
        <span className="flex items-center gap-1.5">
          {meta}
          <ChevronDown
            className={cn(
              "size-3.5 text-muted-foreground transition-transform",
              !open && "-rotate-90"
            )}
          />
        </span>
      </button>
      {open && <div className="p-4">{children}</div>}
    </section>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  step,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        step={step}
        required={required}
        className="h-8 bg-background text-sm"
      />
    </div>
  );
}
