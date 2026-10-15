import "server-only";
import { betterAuth } from "better-auth";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { twoFactor } from "better-auth/plugins";
import { PostgresDialect } from "kysely";
import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import { authMailConfigured, sendSorpAuthEmail } from "./email";

let instance: ReturnType<typeof createAuth> | undefined;
let pool: Pool | undefined;

export function sorpAuthPool() {
  if (!process.env.SORP_AUTH_DATABASE_URL) throw new Error("Independent SORP database is not configured.");
  if (!pool) {
    pool = new Pool({ connectionString: process.env.SORP_AUTH_DATABASE_URL, max: 4,
      connectionTimeoutMillis: 10_000, idleTimeoutMillis: 10_000, statement_timeout: 20_000 });
    attachDatabasePool(pool);
  }
  return pool;
}

function createAuth() {
  const connectionString = process.env.SORP_AUTH_DATABASE_URL;
  const secret = process.env.SORP_AUTH_SECRET;
  const baseURL = process.env.SORP_AUTH_BASE_URL;
  if (!connectionString || !secret || secret.length < 32 || !baseURL || !authMailConfigured()) {
    throw new Error("Independent SORP authentication is not fully configured.");
  }
  const origin = new URL(baseURL);
  if (origin.protocol !== "https:" && origin.hostname !== "localhost") {
    throw new Error("Independent SORP authentication requires HTTPS.");
  }
  return betterAuth({
    appName: "SORP 2026",
    baseURL: origin.origin,
    basePath: "/api/sorp-auth",
    secret,
    trustedOrigins: [origin.origin],
    database: { dialect: new PostgresDialect({ pool: sorpAuthPool() }), type: "postgres", schemaName: "sorp_auth", transaction: true },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: false,
      minPasswordLength: 12,
      maxPasswordLength: 200,
      password: { hash: hashPassword, verify: verifyPassword },
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 30 * 60,
      sendResetPassword: async ({ user, url }) => sendSorpAuthEmail("reset", user.email, url),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      expiresIn: 30 * 60,
      sendVerificationEmail: async ({ user, url }) => sendSorpAuthEmail("verify", user.email, url),
    },
    session: { expiresIn: 7 * 24 * 60 * 60, updateAge: 24 * 60 * 60, freshAge: 15 * 60,
      cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30,
      customRules: { "/sign-in/email": { window: 15 * 60, max: 10 },
        "/request-password-reset": { window: 15 * 60, max: 5 },
        "/send-verification-email": { window: 15 * 60, max: 5 } } },
    advanced: { useSecureCookies: origin.protocol === "https:",
      ipAddress: { ipAddressHeaders: ["x-forwarded-for"] } },
    plugins: [twoFactor({ issuer: "SORP 2026", skipVerificationOnEnable: false,
      accountLockout: { enabled: true, maxFailedAttempts: 5, durationSeconds: 15 * 60 } })],
  });
}

export function sorpAuth() {
  return instance ??= createAuth();
}
