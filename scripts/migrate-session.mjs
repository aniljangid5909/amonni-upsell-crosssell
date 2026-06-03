import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Client } = require("pg");

const url = process.env.DATABASE_URL;
if (!url) { console.error("Set DATABASE_URL env var"); process.exit(1); }

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

await client.query(`ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "refreshToken" TEXT`);
await client.query(`ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "refreshTokenExpires" TIMESTAMPTZ`);
await client.query(`ALTER TABLE "Funnel" ADD COLUMN IF NOT EXISTS "offerImageUrl" TEXT NOT NULL DEFAULT ''`);
await client.query(`ALTER TABLE "Funnel" ADD COLUMN IF NOT EXISTS "offerVariantId" TEXT NOT NULL DEFAULT ''`);
await client.query(`ALTER TABLE "Funnel" ADD COLUMN IF NOT EXISTS "offerPrice" DOUBLE PRECISION NOT NULL DEFAULT 0`);

console.log("Done! All columns added.");
await client.end();
