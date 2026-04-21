import { z } from "zod";

const Schema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgres"),
  LINKEDIN_CLIENT_ID: z.string().min(1),
  LINKEDIN_CLIENT_SECRET: z.string().min(1),
  LINKEDIN_REDIRECT_URI: z.string().url(),
  LINKEDIN_TOKEN_ENC_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "must be 64 hex chars (32 bytes)"),
  APP_BASE_URL: z.string().url(),
  LINKEDIN_API_VERSION: z
    .string()
    .regex(/^\d{6}$/, "must be YYYYMM")
    .default("202604"),
  LINKEDIN_PUBLISH_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  CRON_SECRET: z.string().min(16).optional(),
  API_KEY: z.string().min(16).optional(),
  GENERATOR_PROVIDER: z
    .enum(["gateway", "openai", "anthropic"])
    .default("gateway"),
  GENERATOR_MODEL: z.string().default("openai/gpt-5"),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_GATEWAY_API_KEY: z.string().optional(),
});

export const env = Schema.parse(process.env);
export type Env = typeof env;
