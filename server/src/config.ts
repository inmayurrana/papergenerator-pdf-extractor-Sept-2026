import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config();

function resolveDataDir(): string {
  if (process.env.DATA_DIR) {
    return path.resolve(process.cwd(), process.env.DATA_DIR);
  }
  const rootData = path.resolve(__dirname, "../../data");
  if (fs.existsSync(rootData)) return rootData;
  const cwdData = path.resolve(process.cwd(), "data");
  if (fs.existsSync(cwdData)) return cwdData;
  const parentData = path.resolve(process.cwd(), "../data");
  if (fs.existsSync(parentData)) return parentData;
  return rootData;
}

export const config = {
  PORT: process.env.PORT || 5010,
  DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db",
  JWT_SECRET: process.env.JWT_SECRET || "super-secure-offline-jwt-secret-key-2026",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "super-secure-offline-refresh-secret-key-2026",
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || "http://127.0.0.1:8010",
  DATA_DIR: resolveDataDir(),
};
