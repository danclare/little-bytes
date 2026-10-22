import { NextResponse } from "next/server";
import { appleSignInConfigured } from "@/lib/env";

export async function GET() {
  return NextResponse.json({ configured: appleSignInConfigured() });
}
