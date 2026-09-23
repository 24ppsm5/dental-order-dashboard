import { NextResponse } from "next/server";
import {
  listOrderStatuses,
  upsertOrderStatus,
  type OrderStatusValue,
} from "@/lib/airtable/client";

export async function GET() {
  try {
    const records = await listOrderStatuses();

    const statuses: Record<string, OrderStatusValue> = {};
    const history: {
      id: string;
      orderDate: string;
      itemName: string;
      facilityName: string;
      markedAt: string;
    }[] = [];

    for (const [id, entry] of Object.entries(records)) {
      statuses[id] = entry.status;
      if (entry.status === "ordered") {
        history.push({
          id,
          orderDate: entry.orderDate,
          itemName: entry.itemName,
          facilityName: entry.facilityName,
          markedAt: entry.markedAt,
        });
      }
    }

    history.sort(
      (a, b) => new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime()
    );

    return NextResponse.json({ statuses, history });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "発注状況の取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: unknown;
      status?: unknown;
      facilityName?: unknown;
      itemName?: unknown;
      orderDate?: unknown;
    };

    const id = typeof body.id === "string" ? body.id : "";
    const status = body.status === "ordered" ? "ordered" : body.status === "pending" ? "pending" : null;

    if (!id || !status) {
      return NextResponse.json(
        { error: "リクエストが不正です" },
        { status: 400 }
      );
    }

    await upsertOrderStatus({
      id,
      status,
      facilityName: typeof body.facilityName === "string" ? body.facilityName : "",
      itemName: typeof body.itemName === "string" ? body.itemName : "",
      orderDate: typeof body.orderDate === "string" ? body.orderDate : "",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "発注状況の更新に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
