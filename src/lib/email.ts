import "server-only";
import nodemailer from "nodemailer";
import { getEnv } from "@/lib/env";

function smtpTransport() {
  const env = getEnv();
  if (
    env.EMAIL_DELIVERY !== "smtp" ||
    !env.SMTP_HOST ||
    !env.SMTP_USER ||
    !env.SMTP_PASSWORD ||
    !env.EMAIL_FROM
  ) {
    throw new Error("SMTP email delivery is not configured.");
  }
  return {
    env,
    from: env.EMAIL_FROM,
    transport: nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      requireTLS: !env.SMTP_SECURE,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    }),
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function emailDeliveryEnabled(): boolean {
  return getEnv().EMAIL_DELIVERY === "smtp";
}

export async function sendPasswordResetEmail(recipient: string, token: string): Promise<void> {
  const { env, from, transport } = smtpTransport();
  const resetUrl = new URL("/", env.APP_URL);
  resetUrl.hash = new URLSearchParams({ reset: token }).toString();

  await transport.sendMail({
    from,
    to: recipient,
    subject: "Reset your Little Bites password",
    text: [
      "Use this secure link to choose a new Little Bites password:",
      resetUrl.toString(),
      `This link expires in ${env.RESET_TOKEN_TTL_MINUTES} minutes and can only be used once.`,
      "If you did not request a password reset, you can ignore this email.",
    ].join("\n\n"),
    html: `<p>Use this secure link to choose a new Little Bites password:</p><p><a href="${resetUrl.toString()}">Reset your password</a></p><p>This link expires in ${env.RESET_TOKEN_TTL_MINUTES} minutes and can only be used once.</p><p>If you did not request a password reset, you can ignore this email.</p>`,
  });
}

export async function sendFamilyInvitationEmail(input: {
  recipient: string;
  inviteUrl: string;
  familyName: string;
  inviterName: string;
  role: string;
  expiresAt: Date;
}): Promise<void> {
  const { from, transport } = smtpTransport();
  const expires = input.expiresAt.toUTCString();
  await transport.sendMail({
    from,
    to: input.recipient,
    subject: `${input.inviterName} invited you to ${input.familyName} on Little Bites`,
    text: [
      `${input.inviterName} has invited you to join "${input.familyName}" on Little Bites as ${input.role}.`,
      "Sign in or create an account with this email address, then open this link to accept:",
      input.inviteUrl,
      `This invitation expires on ${expires} and can only be used once.`,
      "If you were not expecting this invitation, you can ignore this email.",
    ].join("\n\n"),
    html: `<p>${escapeHtml(input.inviterName)} has invited you to join <strong>${escapeHtml(input.familyName)}</strong> on Little Bites as ${escapeHtml(input.role)}.</p><p>Sign in or create an account with this email address, then open this link to accept:</p><p><a href="${escapeHtml(input.inviteUrl)}">Accept the invitation</a></p><p>This invitation expires on ${escapeHtml(expires)} and can only be used once.</p><p>If you were not expecting this invitation, you can ignore this email.</p>`,
  });
}
