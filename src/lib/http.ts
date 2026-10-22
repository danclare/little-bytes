import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function jsonError(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Please check the information and try again.", issues: error.issues },
      { status: 400 },
    );
  }
  console.error("Request failed", error instanceof Error ? error.name : "Unknown error");
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  try {
    const expectedOrigin = process.env.APP_URL
      ? new URL(process.env.APP_URL).origin
      : new URL(request.url).origin;
    if (new URL(origin).origin !== expectedOrigin)
      throw new HttpError(403, "This request could not be verified.");
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(403, "This request could not be verified.");
  }
}

export async function readJson(request: Request): Promise<unknown> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 64 * 1024) throw new HttpError(413, "The request is too large.");
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "A valid JSON request is required.");
  }
}
