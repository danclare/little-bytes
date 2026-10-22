import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createTransportMock, sendMailMock } = vi.hoisted(() => {
  const sendMailMock = vi.fn().mockResolvedValue({});
  const createTransportMock = vi.fn(() => ({ sendMail: sendMailMock }));
  return { createTransportMock, sendMailMock };
});

vi.mock("nodemailer", () => ({ default: { createTransport: createTransportMock } }));

describe("password reset email delivery", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_URL", "https://little-bites.example");
    vi.stubEnv("AUTH_SECRET", "test-auth-secret-with-at-least-32-characters");
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost/test");
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

  it("sends a one-time reset link over a TLS-required SMTP transport", async () => {
    const { sendPasswordResetEmail } = await import("@/lib/email");
    const token = "reset-token-with-at-least-32-characters";

    await sendPasswordResetEmail("parent@example.test", token);

    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.example.test",
        port: 587,
        secure: false,
        requireTLS: true,
      }),
    );
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "parent@example.test",
        from: "accounts@example.test",
        text: expect.stringContaining(`https://little-bites.example/#reset=${token}`),
        html: expect.stringContaining(`https://little-bites.example/#reset=${token}`),
      }),
    );
  });

  it("surfaces SMTP delivery failures and rejects incomplete SMTP configuration", async () => {
    const { sendPasswordResetEmail } = await import("@/lib/email");
    sendMailMock.mockRejectedValueOnce(new Error("SMTP unavailable"));
    await expect(
      sendPasswordResetEmail("parent@example.test", "reset-token-with-at-least-32-characters"),
    ).rejects.toThrow("SMTP unavailable");

    vi.resetModules();
    vi.stubEnv("SMTP_PASSWORD", "");
    const { sendPasswordResetEmail: sendWithInvalidConfiguration } = await import("@/lib/email");
    await expect(
      sendWithInvalidConfiguration(
        "parent@example.test",
        "reset-token-with-at-least-32-characters",
      ),
    ).rejects.toThrow("SMTP host, username, password and a valid sender address are required.");
  });
});
