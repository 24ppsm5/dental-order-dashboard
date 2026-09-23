import { NextResponse } from "next/server";
import { deleteProductFromAirtable } from "@/lib/airtable/client";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "IDが指定されていません" }, { status: 400 });
    }
    await deleteProductFromAirtable(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "商品の削除に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
