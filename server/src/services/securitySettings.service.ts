import { prisma } from "../prisma";

export interface SecuritySettingsConfig {
  TOKEN_EXPIRY_MINUTES: number;
  MAX_FAILED_ATTEMPTS: number;
  LOCKOUT_DURATION_MINUTES: number;
  REQUIRE_LOGIN_CHALLENGE: boolean;
  BCRYPT_SALT_ROUNDS: number;
}

export interface LoginBrandingConfig {
  title: string;
  subtitle: string;
  logoUrl: string;
  footerLeft: string;
  footerRight: string;
}

const DEFAULT_SETTINGS: Record<string, { value: string; description: string }> = {
  TOKEN_EXPIRY_MINUTES: {
    value: "15",
    description: "JWT access token lifetime in minutes before requiring re-authentication or refresh.",
  },
  MAX_FAILED_ATTEMPTS: {
    value: "5",
    description: "Maximum consecutive failed login attempts permitted before temporarily locking the account.",
  },
  LOCKOUT_DURATION_MINUTES: {
    value: "5",
    description: "Duration in minutes an account remains locked after reaching max failed login attempts.",
  },
  REQUIRE_LOGIN_CHALLENGE: {
    value: "false",
    description: "Enforces cryptographic Proof-of-Work anti-bot challenge on login to prevent brute force & credential stuffing.",
  },
  BCRYPT_SALT_ROUNDS: {
    value: "12",
    description: "Computational cost factor for salted password hashing (higher = more resistant to offline cracking).",
  },
  // Custom Login Page Branding & Appearance
  LOGIN_PAGE_TITLE: {
    value: "PaperGen AI Intelligence",
    description: "Primary application title displayed prominently on the login portal.",
  },
  LOGIN_PAGE_SUBTITLE: {
    value: "Secure Examination & Formula Extraction Suite",
    description: "Subtitle or school description displayed below the application title on the login portal.",
  },
  LOGIN_PAGE_LOGO_URL: {
    value: "",
    description: "Custom logo image URL or base64 data URL for the login portal.",
  },
  LOGIN_PAGE_FOOTER_LEFT: {
    value: "256-bit Encrypted Session",
    description: "Security/compliance badge displayed on the left of the login page footer.",
  },
  LOGIN_PAGE_FOOTER_RIGHT: {
    value: "Offline-Ready On-Premises Architecture",
    description: "System architecture/deployment badge displayed on the right of the login page footer.",
  },
};

// In-memory cache for ultra-fast reading without SQL query on every API request
let cache: Map<string, string> = new Map();
let cacheLoaded = false;

export class SecuritySettingsService {
  /**
   * Initializes default settings in the database if they don't already exist
   */
  public static async initDefaults(): Promise<void> {
    try {
      for (const [key, meta] of Object.entries(DEFAULT_SETTINGS)) {
        const existing = await prisma.securitySetting.findUnique({ where: { key } });
        if (!existing) {
          await prisma.securitySetting.create({
            data: {
              key,
              value: meta.value,
              description: meta.description,
            },
          });
        }
      }
      await this.reloadCache();
    } catch (err) {
      console.error("Failed to initialize security settings:", err);
    }
  }

  /**
   * Reload in-memory settings cache from database
   */
  public static async reloadCache(): Promise<void> {
    try {
      const records = await prisma.securitySetting.findMany();
      cache.clear();
      for (const rec of records) {
        cache.set(rec.key, rec.value);
      }
      cacheLoaded = true;
    } catch (err) {
      console.error("Failed to reload security settings cache:", err);
    }
  }

  /**
   * Retrieves a setting value by key with fallback
   */
  public static async getSetting(key: string, fallback: string): Promise<string> {
    if (!cacheLoaded) {
      await this.reloadCache();
    }
    return cache.get(key) || fallback;
  }

  /**
   * Retrieves numeric Token Expiry in minutes set by Admin
   */
  public static async getTokenExpiryMinutes(): Promise<number> {
    const val = await this.getSetting("TOKEN_EXPIRY_MINUTES", "15");
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 15 : num;
  }

  /**
   * Retrieves Max Failed Login Attempts threshold
   */
  public static async getMaxFailedAttempts(): Promise<number> {
    const val = await this.getSetting("MAX_FAILED_ATTEMPTS", "5");
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 5 : num;
  }

  /**
   * Retrieves Account Lockout duration in minutes
   */
  public static async getLockoutDurationMinutes(): Promise<number> {
    const val = await this.getSetting("LOCKOUT_DURATION_MINUTES", "5");
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 5 : num;
  }

  /**
   * Checks if cryptographic login challenge is required
   */
  public static async isLoginChallengeRequired(): Promise<boolean> {
    const val = await this.getSetting("REQUIRE_LOGIN_CHALLENGE", "false");
    return val === "true";
  }

  /**
   * Retrieves Bcrypt Salt Rounds cost
   */
  public static async getBcryptSaltRounds(): Promise<number> {
    const val = await this.getSetting("BCRYPT_SALT_ROUNDS", "12");
    const num = parseInt(val, 10);
    return isNaN(num) || num < 10 ? 12 : num;
  }

  /**
   * Retrieves custom Login Page branding & appearance settings
   */
  public static async getLoginBranding(): Promise<LoginBrandingConfig> {
    const title = await this.getSetting("LOGIN_PAGE_TITLE", "PaperGen AI Intelligence");
    const subtitle = await this.getSetting(
      "LOGIN_PAGE_SUBTITLE",
      "Secure Examination & Formula Extraction Suite"
    );
    const logoUrl = await this.getSetting("LOGIN_PAGE_LOGO_URL", "");
    const footerLeft = await this.getSetting("LOGIN_PAGE_FOOTER_LEFT", "256-bit Encrypted Session");
    const footerRight = await this.getSetting(
      "LOGIN_PAGE_FOOTER_RIGHT",
      "Offline-Ready On-Premises Architecture"
    );

    return { title, subtitle, logoUrl, footerLeft, footerRight };
  }

  /**
   * Returns all current security settings for Admin display
   */
  public static async getAllSettings() {
    const records = await prisma.securitySetting.findMany({
      orderBy: { key: "asc" },
    });
    return records;
  }

  /**
   * Updates a security setting (Admin only)
   */
  public static async updateSetting(key: string, value: string): Promise<void> {
    await prisma.securitySetting.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: {
        key,
        value,
        description: DEFAULT_SETTINGS[key]?.description || "Custom Security Setting",
      },
    });
    cache.set(key, value);
  }
}
