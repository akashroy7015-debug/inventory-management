// Vercel build: apply database migrations on production deploys, then build.
// Preview deploys skip migrations so they never change the production database.
import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });
const env = process.env.VERCEL_ENV ?? "production";

run("npx prisma generate");

if (env === "production") {
  if (!process.env.DATABASE_URL) {
    console.error(
      "\n✖ DATABASE_URL is not set for Production.\n" +
        "  Add your Neon/Postgres connection string in Vercel → Settings → Environment Variables (tick Production), then redeploy.\n",
    );
    process.exit(1);
  }
  console.log("→ Applying database migrations…");
  run("npx prisma migrate deploy");
} else {
  console.log(`→ ${env} deploy: skipping database migrations.`);
}

run("npx next build");
