import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { processProfilePhoto } from "@/lib/photos";

describe("profile photo processing", () => {
  it("corrects EXIF orientation, square-crops and strips metadata", async () => {
    const width = 200;
    const height = 100;
    const pixels = Buffer.alloc(width * height * 3);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 3;
        pixels[index] = x < width / 2 ? 255 : 0;
        pixels[index + 2] = x < width / 2 ? 0 : 255;
      }
    }
    const source = await sharp(pixels, {
      raw: { width, height, channels: 3 },
    })
      .withMetadata({ orientation: 6 })
      .jpeg({ quality: 100 })
      .toBuffer();
    const sourceMetadata = await sharp(source).metadata();
    expect(sourceMetadata.orientation).toBe(6);
    expect(sourceMetadata.exif).toBeDefined();

    const result = await processProfilePhoto(
      new File([source], "profile.jpg", { type: "image/jpeg" }),
      "center",
    );
    const resultMetadata = await sharp(result).metadata();
    expect(resultMetadata).toMatchObject({ format: "jpeg", width: 512, height: 512 });
    expect(resultMetadata.exif).toBeUndefined();
    expect(resultMetadata.orientation).toBeUndefined();

    const { data, info } = await sharp(result).raw().toBuffer({ resolveWithObject: true });
    const top = ((info.width / 2) | 0) * info.channels;
    const bottom = ((info.height - 1) * info.width + ((info.width / 2) | 0)) * info.channels;
    expect(data[top]).toBeGreaterThan(data[top + 2] * 2);
    expect(data[bottom + 2]).toBeGreaterThan(data[bottom] * 2);
  });

  it("rejects malformed, unsupported and oversized files", async () => {
    await expect(
      processProfilePhoto(new File([Buffer.from("not an image")], "bad.png"), "center"),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      processProfilePhoto(
        new File(
          [
            Buffer.from(
              "<svg xmlns='http://www.w3.org/2000/svg' width='2' height='2'><rect width='2' height='2'/></svg>",
            ),
          ],
          "icon.svg",
        ),
        "center",
      ),
    ).rejects.toMatchObject({ status: 415 });
    await expect(
      processProfilePhoto(new File([Buffer.alloc(8 * 1024 * 1024 + 1)], "large.jpg"), "center"),
    ).rejects.toMatchObject({ status: 413 });
  });
});
