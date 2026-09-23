import { NextResponse } from "next/server";
import { createProductInAirtable } from "@/lib/airtable/client";
import { validateProductInput } from "@/lib/products/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = validateProductInput(body);

    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const record = await createProductInAirtable(validated.data);
    return NextResponse.json({
      success: true,
      message: "商品を登録しました",
      id: record.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "商品の登録に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
