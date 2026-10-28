import { z } from "zod";

const environment = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APP_URL: z.string().url().default("http://localhost:3000"),
    AUTH_SECRET: z.string().min(32),
    DATABASE_URL: z.string().min(1),
    RATE_LIMIT_HMAC_KEY: z.string().min(32),
    RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().min(5).max(120).default(30),
    PHOTO_STORAGE: z
      .enum(["disabled", "local", "azure"])
      .default(() => (process.env.NODE_ENV === "production" ? "disabled" : "local")),
    PHOTO_LOCAL_DIRECTORY: z.string().default("./var/private-uploads"),
    AZURE_STORAGE_ACCOUNT_URL: z.string().url().optional().or(z.literal("")),
    AZURE_STORAGE_CONTAINER: z.string().min(3).default("child-photos"),
    APPLE_CLIENT_ID: z.string().optional(),
    APPLE_TEAM_ID: z.string().optional(),
    APPLE_KEY_ID: z.string().optional(),
    APPLE_PRIVATE_KEY: z.string().optional(),
    APPLE_REDIRECT_URI: z.string().url().optional(),
    ENTRA_TENANT_ID: z
      .string()
      .regex(/^(common|organizations|consumers|[0-9a-fA-F-]{36})$/)
      .optional()
      .or(z.literal("")),
    ENTRA_CLIENT_ID: z.string().optional(),
    ENTRA_CLIENT_SECRET: z.string().optional(),
    ENTRA_REDIRECT_URI: z.string().url().optional().or(z.literal("")),
    EMAIL_DELIVERY: z.enum(["disabled", "smtp"]).default("disabled"),
    SMTP_HOST: z.string().optional().or(z.literal("")),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_SECURE: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    SMTP_USER: z.string().optional().or(z.literal("")),
    SMTP_PASSWORD: z.string().optional().or(z.literal("")),
    EMAIL_FROM: z.string().email().optional().or(z.literal("")),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === "production" && value.PHOTO_STORAGE === "local") {
      context.addIssue({
        code: "custom",
        path: ["PHOTO_STORAGE"],
        message: "Use disabled or private Azure Blob photo storage in production.",
      });
    }
    if (
      value.EMAIL_DELIVERY === "smtp" &&
      (!value.SMTP_HOST?.trim() ||
        !value.SMTP_USER?.trim() ||
        !value.SMTP_PASSWORD ||
        !value.EMAIL_FROM)
    ) {
      context.addIssue({
        code: "custom",
        path: ["EMAIL_DELIVERY"],
        message: "SMTP host, username, password and a valid sender address are required.",
      });
    }
  });

export type AppEnvironment = z.infer<typeof environment>;

let cached: AppEnvironment | undefined;

export function getEnv(): AppEnvironment {
  if (cached) return cached;
  const result = environment.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      code: issue.code,
    }));
    console.error("Invalid server configuration", { issues });
    throw new Error(
      `Invalid server configuration: ${issues.map(({ field, code }) => `${field} (${code})`).join(", ")}`,
    );
  }
  cached = result.data;
  return cached;
}

export function appleSignInConfigured(): boolean {
  const values = [
    process.env.APPLE_CLIENT_ID,
    process.env.APPLE_TEAM_ID,
    process.env.APPLE_KEY_ID,
    process.env.APPLE_PRIVATE_KEY,
    process.env.APPLE_REDIRECT_URI,
  ];
  return values.every((value) => Boolean(value?.trim()));
}

export function photosEnabled(): boolean {
  return getEnv().PHOTO_STORAGE !== "disabled";
}

export function entraSignInConfigured(): boolean {
  const values = [
    process.env.ENTRA_TENANT_ID,
    process.env.ENTRA_CLIENT_ID,
    process.env.ENTRA_CLIENT_SECRET,
  ];
  return values.every((value) => Boolean(value?.trim()));
}

export function entraRedirectUri(): string {
  const env = getEnv();
  return env.ENTRA_REDIRECT_URI || new URL("/api/auth/entra/callback", env.APP_URL).toString();
}
