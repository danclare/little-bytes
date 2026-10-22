import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendMailMock } = vi.hoisted(() => ({ sendMailMock: vi.fn().mockResolvedValue({}) }));

vi.mock("nodemailer", () => ({
  default: { createTransport: vi.fn(() => ({ sendMail: sendMailMock })) },
}));

describe("family invitation email", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_URL", "https://little-bites.example");
    vi.stubEnv("AUTH_SECRET", "test-auth-secret-with-at-least-32-characters");
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost/test");
    vi.stubEnv("RATE_LIMIT_HMAC_KEY", "test-rate-limit-hmac-key-with-32-characters");
    vi.stubEnv("EMAIL_DELIVERY", "smtp");
    vi.stubEnv("SMTP_HOST", "smtp.example.test");
    vi.stubEnv("SMTP_PORT", "587");
    vi.stubEnv("SMTP_SECURE", "false");
    vi.stubEnv("SMTP_USER", "little-bites");
    vi.stubEnv("SMTP_PASSWORD", "test-only-smtp-password");
    vi.stubEnv("EMAIL_FROM", "accounts@example.test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("escapes user-controlled names in the HTML body and includes the one-time link", async () => {
    const { sendFamilyInvitationEmail } = await import("@/lib/email");
    const inviteUrl = "https://little-bites.example/#invite=token-value";
    await sendFamilyInvitationEmail({
      recipient: "partner@example.test",
      inviteUrl,
      familyName: '<script>alert("x")</script>',
      inviterName: "Pat <b>Parent</b>",
      role: "editor",
      expiresAt: new Date("2026-10-29T00:00:00.000Z"),
    });
    const message = sendMailMock.mock.calls[0][0] as { html: string; text: string; to: string };
    expect(message.to).toBe("partner@example.test");
    expect(message.html).not.toContain("<script>");
    expect(message.html).not.toContain("<b>Parent</b>");
    expect(message.html).toContain("&lt;script&gt;");
    expect(message.html).toContain(`href="${inviteUrl}"`);
    expect(message.text).toContain(inviteUrl);
    expect(message.text).toContain("can only be used once");
  });
});
