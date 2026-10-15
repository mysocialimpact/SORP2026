-- Generated from the pinned Better Auth version against an empty isolated database.
-- Review before applying to any database.
create schema if not exists "sorp_auth";

create table "sorp_auth"."user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null, "twoFactorEnabled" boolean);

create table "sorp_auth"."session" ("id" text not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" text not null references "sorp_auth"."user" ("id") on delete cascade);

create table "sorp_auth"."account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "sorp_auth"."user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);

create table "sorp_auth"."verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table "sorp_auth"."twoFactor" ("id" text not null primary key, "secret" text not null, "backupCodes" text not null, "userId" text not null references "sorp_auth"."user" ("id") on delete cascade, "verified" boolean, "failedVerificationCount" integer, "lockedUntil" timestamptz);

create table "sorp_auth"."rateLimit" ("id" text not null primary key, "key" text not null unique, "count" integer not null, "lastRequest" bigint not null);

create index "session_userId_idx" on "sorp_auth"."session" ("userId");

create index "account_userId_idx" on "sorp_auth"."account" ("userId");

create index "verification_identifier_idx" on "sorp_auth"."verification" ("identifier");

create index "twoFactor_secret_idx" on "sorp_auth"."twoFactor" ("secret");

create index "twoFactor_userId_idx" on "sorp_auth"."twoFactor" ("userId");
