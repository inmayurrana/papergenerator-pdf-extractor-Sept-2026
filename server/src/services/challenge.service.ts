import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config";

interface ChallengeRecord {
  id: string;
  salt: string;
  difficulty: number;
  expiresAt: number;
}

// In-memory single-use replay protection cache
const usedChallenges = new Set<string>();

// Auto-cleanup used challenges every 5 minutes
setInterval(() => {
  usedChallenges.clear();
}, 5 * 60 * 1000);

export class ChallengeService {
  // Target difficulty (client must find nonce such that SHA256(salt + nonce) ends with 00 or meets numeric threshold)
  private static DEFAULT_DIFFICULTY = 1000;

  /**
   * Generates a tamper-proof cryptographic login challenge
   */
  public static generateChallenge(difficulty: number = this.DEFAULT_DIFFICULTY) {
    const id = uuidv4();
    const salt = crypto.randomBytes(16).toString("hex");
    const expiresAt = Date.now() + 90 * 1000; // 90 seconds validity

    const dataToSign = `${id}:${salt}:${difficulty}:${expiresAt}`;
    const signature = crypto
      .createHmac("sha256", config.JWT_SECRET)
      .update(dataToSign)
      .digest("hex");

    return {
      challengeId: id,
      salt,
      difficulty,
      algorithm: "SHA-256",
      expiresAt,
      signature,
    };
  }

  /**
   * Validates the client's solved challenge proof-of-work
   */
  public static verifyChallenge(params: {
    challengeId: string;
    salt: string;
    difficulty: number;
    expiresAt: number;
    signature: string;
    nonce: number | string;
  }): { valid: boolean; reason?: string } {
    const { challengeId, salt, difficulty, expiresAt, signature, nonce } = params;

    // 1. Basic validation
    if (!challengeId || !salt || difficulty === undefined || !expiresAt || !signature || nonce === undefined) {
      return { valid: false, reason: "Missing required challenge verification fields" };
    }

    // 2. Check expiration
    if (Date.now() > Number(expiresAt)) {
      return { valid: false, reason: "Login challenge expired. Please solve a fresh challenge." };
    }

    // 3. Prevent replay attacks
    if (usedChallenges.has(challengeId)) {
      return { valid: false, reason: "Challenge already used or replayed. Anti-replay defense triggered." };
    }

    // 4. Verify HMAC signature (ensures parameters were not forged by client)
    const expectedData = `${challengeId}:${salt}:${difficulty}:${expiresAt}`;
    const expectedSignature = crypto
      .createHmac("sha256", config.JWT_SECRET)
      .update(expectedData)
      .digest("hex");

    const sigBuffer = Buffer.from(signature, "hex");
    const expectedSigBuffer = Buffer.from(expectedSignature, "hex");

    if (sigBuffer.length !== expectedSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
      return { valid: false, reason: "Tampered or invalid challenge signature." };
    }

    // 5. Verify Proof-of-Work solution
    // Compute SHA256(salt + nonce)
    const hash = crypto
      .createHash("sha256")
      .update(`${salt}:${nonce}`)
      .digest("hex");

    // The first 4 characters interpreted as integer modulo difficulty should equal 0
    const prefixValue = parseInt(hash.substring(0, 6), 16);
    if (prefixValue % Number(difficulty) !== 0) {
      return { valid: false, reason: "Invalid cryptographic challenge solution." };
    }

    // Mark as used to prevent replay
    usedChallenges.add(challengeId);
    return { valid: true };
  }
}
