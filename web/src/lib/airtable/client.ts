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

function getAirtableConfig() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_TABLE_NAME ?? "商品マスター";

  if (!apiKey || !baseId) {
    logAirtableEnvStatus();
    throw new Error(
      "Airtable の環境変数（AIRTABLE_API_KEY / AIRTABLE_BASE_ID）が設定されていません"
    );
  }

  return { apiKey, baseId, tableName };
}

export async function createProductInAirtable(
  product: ProductMasterInput
): Promise<{ id: string }> {
  const { apiKey, baseId, tableName } = getAirtableConfig();
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: toAirtableFields(product) }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Airtable API error: ${res.status}${detail ? ` — ${detail}` : ""}`
    );
  }

  const data = (await res.json()) as { id: string };
  return { id: data.id };
}
