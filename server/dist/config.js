"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
exports.config = {
    PORT: process.env.PORT || 5010,
    DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db",
    JWT_SECRET: process.env.JWT_SECRET || "super-secure-offline-jwt-secret-key-2026",
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "super-secure-offline-refresh-secret-key-2026",
    AI_SERVICE_URL: process.env.AI_SERVICE_URL || "http://127.0.0.1:8001",
    DATA_DIR: process.env.DATA_DIR || path_1.default.resolve(__dirname, "../../data"),
};
