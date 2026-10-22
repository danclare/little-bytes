import { NextResponse } from "next/server";
import { entraSignInConfigured } from "@/lib/env";

export async function GET() {
  return NextResponse.json({ configured: entraSignInConfigured() });
}
