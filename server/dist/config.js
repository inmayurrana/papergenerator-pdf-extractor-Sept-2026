"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
function resolveDataDir() {
    if (process.env.DATA_DIR) {
        return path_1.default.resolve(process.cwd(), process.env.DATA_DIR);
    }
    const rootData = path_1.default.resolve(__dirname, "../../data");
    if (fs_1.default.existsSync(rootData))
        return rootData;
    const cwdData = path_1.default.resolve(process.cwd(), "data");
    if (fs_1.default.existsSync(cwdData))
        return cwdData;
    const parentData = path_1.default.resolve(process.cwd(), "../data");
    if (fs_1.default.existsSync(parentData))
        return parentData;
    return rootData;
}
exports.config = {
    PORT: process.env.PORT || 5010,
    DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db",
    JWT_SECRET: process.env.JWT_SECRET || "super-secure-offline-jwt-secret-key-2026",
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "super-secure-offline-refresh-secret-key-2026",
    AI_SERVICE_URL: process.env.AI_SERVICE_URL || "http://127.0.0.1:8010",
    DATA_DIR: resolveDataDir(),
    FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3010",
};
