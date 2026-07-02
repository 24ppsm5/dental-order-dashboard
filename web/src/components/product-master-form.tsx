"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  ExternalLink,
  Link2,
  Loader2,
  PackagePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

const EMPTY_FORM: FormState = {
  name: "",
  unit: "",
  price: "",
  vendor: "",
  orderNumber: "",
};

export function ProductMasterForm() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [recentProducts, setRecentProducts] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    setRecentProducts(loadRecentProductNames());
    setHydrated(true);
  }, []);

  const update = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (message) setMessage(null);
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
      setMessage({
        type: "success",
        text: data.message ?? "商品を登録しました",
      });
      setForm(EMPTY_FORM);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "登録に失敗しました",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-l border-border bg-muted/30">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col">
          {/* 1. 商品マスター登録フォーム */}
          <section className="bg-background">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">商品マスター登録</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Airtable「商品マスター」へ追加
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3 p-4">
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

              <Button type="submit" className="w-full" disabled={submitting}>
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
          </section>

          <Separator />

          {/* 2. 最近登録した商品 */}
          <section className="bg-background/80">
            <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
              <Clock className="size-3.5 text-muted-foreground" />
              <h3 className="text-xs font-semibold">最近登録した商品</h3>
            </div>
            <div className="p-4">
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
            </div>
          </section>

          <Separator />

          {/* 3. リンク集 */}
          <section className="bg-background/60 pb-4">
            <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
              <Link2 className="size-3.5 text-muted-foreground" />
              <h3 className="text-xs font-semibold">リンク集</h3>
            </div>
            <ul className="space-y-0.5 p-2">
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
          </section>
        </div>
      </ScrollArea>
    </aside>
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
