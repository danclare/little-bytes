import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";
import { assertSameOrigin, jsonError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await clearSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
