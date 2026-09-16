import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const databaseId = process.env.CF_D1_DATABASE_ID;
if (!databaseId) {
  throw new Error("Set CF_D1_DATABASE_ID to the ID returned by `wrangler d1 create earthre-sla-monitor`.");
}

execFileSync("npm", ["run", "build"], { stdio: "inherit" });
const configPath = "dist/server/wrangler.json";
const deployConfigPath = "dist/server/wrangler.deploy.json";
mkdirSync("dist/server/migrations", { recursive: true });
for (const file of readdirSync("drizzle").filter((name) => name.endsWith(".sql"))) {
  copyFileSync(`drizzle/${file}`, `dist/server/migrations/${file}`);
}
const config = JSON.parse(readFileSync(configPath, "utf8"));
config.name = "earthre-sla-monitor";
config.d1_databases = [{ binding: "DB", database_name: "earthre-sla-monitor", database_id: databaseId }];
writeFileSync(deployConfigPath, `${JSON.stringify(config, null, 2)}\n`);

const wrangler = "./node_modules/wrangler/bin/wrangler.js";
if (process.env.CF_SKIP_D1_MIGRATIONS === "1") {
  console.warn("Skipping remote D1 migration check (CF_SKIP_D1_MIGRATIONS=1).");
} else {
  execFileSync("node", [wrangler, "d1", "migrations", "apply", "DB", "--remote", "--config", deployConfigPath], { stdio: "inherit" });
}
execFileSync("node", [wrangler, "deploy", "--config", deployConfigPath], { stdio: "inherit" });
