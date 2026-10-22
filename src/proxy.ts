import { NextResponse } from "next/server";

export function proxy() {
  const response = NextResponse.next();
  if (process.env.NODE_ENV === "production" && process.env.APP_URL?.startsWith("https://")) {
    response.headers.set("Strict-Transport-Security", "max-age=31536000");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
