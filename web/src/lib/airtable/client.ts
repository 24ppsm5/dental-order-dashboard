import {
  toAirtableFields,
  type ProductMasterInput,
} from "@/lib/products/types";

function logAirtableEnvStatus(): void {
  console.log("[Airtable env check]", {
    AIRTABLE_API_KEY: Boolean(process.env.AIRTABLE_API_KEY),
    AIRTABLE_BASE_ID: Boolean(process.env.AIRTABLE_BASE_ID),
    AIRTABLE_TABLE_NAME:
      process.env.AIRTABLE_TABLE_NAME ?? "(未設定 → デフォルト: 商品マスター)",
    cwd: process.cwd(),
  });
}

function getAirtableCreds() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    logAirtableEnvStatus();
    throw new Error(
      "Airtable の環境変数（AIRTABLE_API_KEY / AIRTABLE_BASE_ID）が設定されていません"
    );
  }

  return { apiKey, baseId };
}

function getAirtableConfig() {
  const { apiKey, baseId } = getAirtableCreds();
  const tableName = process.env.AIRTABLE_TABLE_NAME ?? "商品マスター";
  return { apiKey, baseId, tableName };
}

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface AirtableListResponse {
  records: AirtableRecord[];
  offset?: string;
}

/**
 * Airtable API を叩く共通ヘルパー。
 * エラー時は Airtable が返す詳細メッセージをそのままクライアントに
 * 漏らさないよう、ステータスコードのみを含む汎用エラーにする。
 */
async function airtableRequest(
  url: string,
  init?: RequestInit
): Promise<Record<string, unknown>> {
  const { apiKey } = getAirtableCreds();
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    // Airtable のレスポンス本文（詳細なエラーメッセージ）はログにのみ残し、
    // クライアントへ返すエラーには含めない。
    const detail = await res.text().catch(() => "");
    console.error("[Airtable API error]", res.status, detail);
    throw new Error(`Airtable との通信に失敗しました（status: ${res.status}）`);
  }

  if (res.status === 204) return {};
  return (await res.json()) as Record<string, unknown>;
}

export async function createProductInAirtable(
  product: ProductMasterInput
): Promise<{ id: string }> {
  const { baseId, tableName } = getAirtableConfig();
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;

  const data = await airtableRequest(url, {
    method: "POST",
    body: JSON.stringify({ fields: toAirtableFields(product) }),
  });

  return { id: data.id as string };
}

export interface ProductMasterRecord extends ProductMasterInput {
  recordId: string;
}

/** 商品マスターの登録済み商品を一覧取得する（新しい順ではなく Airtable の並び順） */
export async function listProductsFromAirtable(): Promise<
  ProductMasterRecord[]
> {
  const { baseId, tableName } = getAirtableConfig();
  const base = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;

  const results: ProductMasterRecord[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(base);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);

    const data = (await airtableRequest(
      url.toString()
    )) as unknown as AirtableListResponse;

    for (const record of data.records ?? []) {
      const f = record.fields as Record<string, string | number>;
      results.push({
        recordId: record.id,
        name: String(f["商品名"] ?? ""),
        unit: String(f["単位"] ?? ""),
        price: Number(f["金額"] ?? 0),
        vendor: String(f["販売先"] ?? ""),
        orderNumber: String(f["発注番号"] ?? ""),
      });
    }

    offset = data.offset;
  } while (offset);

  return results;
}

export async function deleteProductFromAirtable(
  recordId: string
): Promise<void> {
  const { baseId, tableName } = getAirtableConfig();
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${recordId}`;
  await airtableRequest(url, { method: "DELETE" });
}

const ORDER_STATUS_TABLE = "発注ステータス";

export type OrderStatusValue = "pending" | "ordered";

export interface OrderStatusEntry {
  status: OrderStatusValue;
  facilityName: string;
  itemName: string;
  orderDate: string;
  markedAt: string;
}

/**
 * 発注ステータステーブルの全レコードを、発注ID をキーにしたマップで返す。
 * pane2（未発注/発注済み）と pane3（発注履歴）の両方がこれ 1 回の取得で賄える。
 */
export async function listOrderStatuses(): Promise<
  Record<string, OrderStatusEntry>
> {
  const { baseId } = getAirtableCreds();
  const base = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(ORDER_STATUS_TABLE)}`;

  const result: Record<string, OrderStatusEntry> = {};
  let offset: string | undefined;

  do {
    const url = new URL(base);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);

    const data = (await airtableRequest(
      url.toString()
    )) as unknown as AirtableListResponse;

    for (const record of data.records ?? []) {
      const f = record.fields as Record<string, string>;
      const orderId = f["発注ID"];
      if (!orderId) continue;
      result[orderId] = {
        status: f["ステータス"] === "ordered" ? "ordered" : "pending",
        facilityName: f["施設"] ?? "",
        itemName: f["商品名"] ?? "",
        orderDate: f["発注日"] ?? "",
        markedAt: f["更新日時"] ?? "",
      };
    }

    offset = data.offset;
  } while (offset);

  return result;
}

/** 発注ID に対応するレコードを、なければ作成・あれば更新する形でステータスを反映する */
export async function upsertOrderStatus(params: {
  id: string;
  status: OrderStatusValue;
  facilityName: string;
  itemName: string;
  orderDate: string;
}): Promise<void> {
  const { baseId } = getAirtableCreds();
  const table = encodeURIComponent(ORDER_STATUS_TABLE);
  const base = `https://api.airtable.com/v0/${baseId}/${table}`;

  const escapedId = params.id.replace(/"/g, '\\"');
  const findUrl = new URL(base);
  findUrl.searchParams.set("filterByFormula", `{発注ID}="${escapedId}"`);
  findUrl.searchParams.set("maxRecords", "1");

  const existing = (await airtableRequest(
    findUrl.toString()
  )) as unknown as AirtableListResponse;

  const fields = {
    発注ID: params.id,
    施設: params.facilityName,
    商品名: params.itemName,
    発注日: params.orderDate,
    ステータス: params.status,
    更新日時: new Date().toISOString(),
  };

  const existingRecord = existing.records?.[0];
  if (existingRecord) {
    await airtableRequest(`${base}/${existingRecord.id}`, {
      method: "PATCH",
      body: JSON.stringify({ fields }),
    });
  } else {
    await airtableRequest(base, {
      method: "POST",
      body: JSON.stringify({ fields }),
    });
  }
}
