/** Airtable「商品マスター」テーブルへの登録データ */
export interface ProductMasterInput {
  /** 商品名 */
  name: string;
  /** 単位 */
  unit: string;
  /** 金額 */
  price: number;
  /** 販売先 */
  vendor: string;
  /** 発注番号 */
  orderNumber: string;
}

export const PRODUCT_FIELD_NAMES = {
  name: "商品名",
  unit: "単位",
  price: "金額",
  vendor: "販売先",
  orderNumber: "発注番号",
} as const;

export const EMPTY_PRODUCT_FORM: ProductMasterInput = {
  name: "",
  unit: "",
  price: 0,
  vendor: "",
  orderNumber: "",
};

export function validateProductInput(
  body: unknown
): { ok: true; data: ProductMasterInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "リクエスト形式が不正です" };
  }

  const raw = body as Record<string, unknown>;
  const name = String(raw.name ?? "").trim();
  const unit = String(raw.unit ?? "").trim();
  const vendor = String(raw.vendor ?? "").trim();
  const orderNumber = String(raw.orderNumber ?? "").trim();
  const priceRaw = raw.price;

  if (!name) return { ok: false, error: "商品名を入力してください" };
  if (!unit) return { ok: false, error: "単位を入力してください" };
  if (!vendor) return { ok: false, error: "販売先を入力してください" };
  if (!orderNumber) return { ok: false, error: "発注番号を入力してください" };

  const price =
    typeof priceRaw === "number" ? priceRaw : Number(String(priceRaw ?? ""));

  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, error: "金額は0以上の数値で入力してください" };
  }

  return {
    ok: true,
    data: { name, unit, price, vendor, orderNumber },
  };
}

export function toAirtableFields(
  product: ProductMasterInput
): Record<string, string | number> {
  return {
    [PRODUCT_FIELD_NAMES.name]: product.name,
    [PRODUCT_FIELD_NAMES.unit]: product.unit,
    [PRODUCT_FIELD_NAMES.price]: product.price,
    [PRODUCT_FIELD_NAMES.vendor]: product.vendor,
    [PRODUCT_FIELD_NAMES.orderNumber]: product.orderNumber,
  };
}
