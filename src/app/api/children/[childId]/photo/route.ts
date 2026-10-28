import { NextResponse } from "next/server";
import {
  deletePhoto,
  getPhoto,
  processProfilePhoto,
  requirePhotoStorage,
  storePhoto,
} from "@/lib/photos";
import { requireChild } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin, HttpError, jsonError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";

type Context = { params: Promise<{ childId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { childId } = await context.params;
    const child = await requireChild(user.id, childId);
    requirePhotoStorage();
    if (!child.photoObjectKey) throw new HttpError(404, "No profile photo has been added.");
    const image = await getPhoto(child.photoObjectKey);
    return new NextResponse(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { childId } = await context.params;
    const child = await requireChild(user.id, childId, "write");
    requirePhotoStorage();
    await enforceRateLimit(request, "photo-upload", 5);
    const rawContentLength = request.headers.get("content-length");
    if (!rawContentLength) throw new HttpError(411, "A file size is required for upload.");
    const contentLength = Number(rawContentLength);
    if (contentLength > 8 * 1024 * 1024 + 64 * 1024)
      throw new HttpError(413, "Choose an image smaller than 8 MB.");
    const form = await request.formData();
    const file = form.get("photo");
    if (!(file instanceof File)) throw new HttpError(400, "Choose a JPEG, PNG or WebP photo.");
    const position = String(form.get("position") ?? "attention");
    const bytes = await processProfilePhoto(file, position);
    const key = await storePhoto(bytes);
    try {
      await prisma.child.update({
        where: { id: child.id, familyId: child.familyId },
        data: { photoObjectKey: key, photoUpdatedAt: new Date() },
      });
    } catch (error) {
      await deletePhoto(key);
      throw error;
    }
    if (child.photoObjectKey) await deletePhoto(child.photoObjectKey);
    return NextResponse.json(
      { photoUrl: `/api/children/${child.id}/photo`, updatedAt: new Date().toISOString() },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { childId } = await context.params;
    const child = await requireChild(user.id, childId, "write");
    requirePhotoStorage();
    if (child.photoObjectKey) {
      await deletePhoto(child.photoObjectKey);
      await prisma.child.update({
        where: { id: child.id, familyId: child.familyId },
        data: { photoObjectKey: null, photoUpdatedAt: null },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
