import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type Sharp } from "sharp";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";
import { getEnv } from "@/lib/env";
import { HttpError } from "@/lib/http";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_DIMENSION = 8_000;

function azureContainer() {
  const env = getEnv();
  if (!env.AZURE_STORAGE_ACCOUNT_URL)
    throw new Error("AZURE_STORAGE_ACCOUNT_URL is required for Azure photo storage.");
  return new BlobServiceClient(
    env.AZURE_STORAGE_ACCOUNT_URL,
    new DefaultAzureCredential(),
  ).getContainerClient(env.AZURE_STORAGE_CONTAINER);
}

function localPath(key: string) {
  return path.join(getEnv().PHOTO_LOCAL_DIRECTORY, key);
}

export async function processProfilePhoto(file: File, position: string): Promise<Buffer> {
  if (file.size < 1 || file.size > MAX_UPLOAD_BYTES) {
    throw new HttpError(413, "Choose an image smaller than 8 MB.");
  }
  const input = Buffer.from(await file.arrayBuffer());
  let image: Sharp;
  try {
    image = sharp(input, { limitInputPixels: MAX_DIMENSION * MAX_DIMENSION });
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? "")) {
      throw new HttpError(
        415,
        "Use a JPEG, PNG or WebP image. HEIC images need converting before upload.",
      );
    }
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width > MAX_DIMENSION ||
      metadata.height > MAX_DIMENSION
    ) {
      throw new HttpError(400, "This image is too large to process.");
    }
    const cropPosition =
      {
        attention: "attention",
        center: "centre",
        top: "north",
        bottom: "south",
        left: "west",
        right: "east",
      }[position] ?? "attention";
    return await image
      .rotate()
      .resize(512, 512, { fit: "cover", position: cropPosition })
      .jpeg({ quality: 86 })
      .toBuffer();
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "This file is not a valid supported image.");
  }
}

export async function storePhoto(bytes: Buffer): Promise<string> {
  const key = `${randomUUID()}.jpg`;
  if (getEnv().PHOTO_STORAGE === "azure") {
    await azureContainer()
      .getBlockBlobClient(key)
      .uploadData(bytes, {
        blobHTTPHeaders: { blobContentType: "image/jpeg", blobCacheControl: "private, no-store" },
      });
  } else {
    await mkdir(getEnv().PHOTO_LOCAL_DIRECTORY, { recursive: true });
    await writeFile(localPath(key), bytes, { flag: "wx", mode: 0o600 });
  }
  return key;
}

export async function getPhoto(key: string): Promise<Buffer> {
  try {
    if (getEnv().PHOTO_STORAGE === "azure")
      return await azureContainer().getBlockBlobClient(key).downloadToBuffer();
    return await readFile(localPath(key));
  } catch (error) {
    if (getEnv().PHOTO_STORAGE === "local" && (error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new HttpError(404, "Profile photo not found.");
    }
    if (
      getEnv().PHOTO_STORAGE === "azure" &&
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      error.statusCode === 404
    ) {
      throw new HttpError(404, "Profile photo not found.");
    }
    throw error;
  }
}

export async function deletePhoto(key: string): Promise<void> {
  if (getEnv().PHOTO_STORAGE === "azure") {
    await azureContainer().getBlockBlobClient(key).deleteIfExists();
  } else {
    try {
      await unlink(localPath(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}
