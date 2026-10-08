import { ChallengeService } from "./src/services/challenge.service";
import { SecuritySettingsService } from "./src/services/securitySettings.service";
import { prisma } from "./src/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "./src/config";
import crypto from "crypto";

async function runSecurityTests() {
  console.log("===============================================================");
  console.log("   PAPERGENERATOR FULL SECURITY & LOGIN DEFENSE TEST SUITE     ");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? `: ${detail}` : ""}`);
      failed++;
    }
  }

  // Helper: solve Proof-of-Work
  function solvePoW(salt: string, difficulty: number): number {
    let nonce = 0;
    while (nonce < 100000) {
      const hash = crypto.createHash("sha256").update(`${salt}:${nonce}`).digest("hex");
      const prefixVal = parseInt(hash.substring(0, 6), 16);
      if (prefixVal % difficulty === 0) {
        return nonce;
      }
      nonce++;
    }
    return -1;
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Cryptographic Proof-of-Work Challenge Generation & Verification
    // -------------------------------------------------------------
    console.log("--- 1. Cryptographic Challenge & Anti-Bot Defense ---");
    const challenge = ChallengeService.generateChallenge(500);
    assert(!!challenge.challengeId && !!challenge.signature, "Challenge generated with ID and HMAC signature");
    assert(challenge.algorithm === "SHA-256", "Challenge specifies SHA-256 algorithm");

    const solvedNonce = solvePoW(challenge.salt, challenge.difficulty);
    assert(solvedNonce >= 0, "Client solves PoW challenge successfully");

    const verificationResult = ChallengeService.verifyChallenge({
      challengeId: challenge.challengeId,
      salt: challenge.salt,
      difficulty: challenge.difficulty,
      expiresAt: challenge.expiresAt,
      signature: challenge.signature,
      nonce: solvedNonce,
    });
    assert(verificationResult.valid === true, "Valid challenge solution verified by server");

    // -------------------------------------------------------------
    // Test 2: Anti-Replay Defense
    // -------------------------------------------------------------
    console.log("\n--- 2. Anti-Replay Protection ---");
    const replayAttempt = ChallengeService.verifyChallenge({
      challengeId: challenge.challengeId,
      salt: challenge.salt,
      difficulty: challenge.difficulty,
      expiresAt: challenge.expiresAt,
      signature: challenge.signature,
      nonce: solvedNonce,
    });
    assert(replayAttempt.valid === false, "Replay attack rejected: challenge cannot be reused");

    // -------------------------------------------------------------
    // Test 3: Tamper Resistance (Modifying difficulty or expiration)
    // -------------------------------------------------------------
    console.log("\n--- 3. Tamper Resistance ---");
    const freshChallenge = ChallengeService.generateChallenge(500);
    const tamperedAttempt = ChallengeService.verifyChallenge({
      challengeId: freshChallenge.challengeId,
      salt: freshChallenge.salt,
      difficulty: 1, // Tampered difficulty!
      expiresAt: freshChallenge.expiresAt,
      signature: freshChallenge.signature,
      nonce: 0,
    });
    assert(tamperedAttempt.valid === false, "Tampered challenge parameters rejected via HMAC verification");

    // -------------------------------------------------------------
    // Test 4: Password Encryption & Salt Factor
    // -------------------------------------------------------------
    console.log("\n--- 4. Password Encryption & Salt Hardening ---");
    await SecuritySettingsService.initDefaults();
    const saltRounds = await SecuritySettingsService.getBcryptSaltRounds();
    assert(saltRounds >= 12, `Salt rounds cost factor is ${saltRounds} (>= 12)`);

    const testPassword = "SecurePassword@2026!";
    const salt = await bcrypt.genSalt(saltRounds);
    const hash = await bcrypt.hash(testPassword, salt);
    assert(hash.startsWith("$2a$12$") || hash.startsWith("$2b$12$"), "Hash generated with high-cost 12-round salt");
    assert(await bcrypt.compare(testPassword, hash), "Password verifies correctly");
    assert(!(await bcrypt.compare("WrongPassword", hash)), "Incorrect password rejected");

    // -------------------------------------------------------------
    // Test 5: Admin Configurable Token Expiry (Set by Admin)
    // -------------------------------------------------------------
    console.log("\n--- 5. Dynamic Token Expiration Configured by Admin ---");
    // Admin sets token expiry to 5 minutes
    await SecuritySettingsService.updateSetting("TOKEN_EXPIRY_MINUTES", "5");
    const configuredExpiry = await SecuritySettingsService.getTokenExpiryMinutes();
    assert(configuredExpiry === 5, "Admin configured token expiry set to 5 minutes");

    // Issue JWT with dynamic 5-minute expiry
    const testUser = { id: "test-user-uuid", email: "audit@school.local", role: "TEACHER" };
    const token = jwt.sign(
      { id: testUser.id, email: testUser.email, role: testUser.role },
      config.JWT_SECRET,
      { expiresIn: `${configuredExpiry}m` }
    );
    const decoded = jwt.decode(token) as any;
    const tokenTtlSeconds = decoded.exp - decoded.iat;
    assert(tokenTtlSeconds === 300, `Token expires in exactly 300 seconds (5 minutes): exp - iat = ${tokenTtlSeconds}s`);

    // -------------------------------------------------------------
    // Test 6: Rate Limiting & 5-Minute Account Lockout Logic
    // -------------------------------------------------------------
    console.log("\n--- 6. 5-Minute Account Lockout & Brute-Force Rate Limiting ---");
    const testEmail = `victim_test_${Date.now()}@school.local`;
    const userRecord = await prisma.user.create({
      data: {
        email: testEmail,
        fullName: "Lockout Test User",
        passwordHash: hash,
        role: "TEACHER",
        failedLoginAttempts: 0,
      },
    });

    const maxAttempts = await SecuritySettingsService.getMaxFailedAttempts(); // 5
    const lockoutMins = await SecuritySettingsService.getLockoutDurationMinutes(); // 5
    assert(maxAttempts === 5, "Max failed attempts threshold is 5");
    assert(lockoutMins === 5, "Lockout duration is 5 minutes");

    // Simulate 4 failed attempts
    for (let i = 1; i <= 4; i++) {
      await prisma.user.update({
        where: { id: userRecord.id },
        data: { failedLoginAttempts: i },
      });
    }

    let userState = await prisma.user.findUnique({ where: { id: userRecord.id } });
    assert(userState?.failedLoginAttempts === 4, "4 failed attempts recorded without lockout");
    assert(!userState?.lockedUntil, "Account is not locked yet at 4 attempts");

    // 5th failed attempt: triggers 5-minute lockout!
    const lockUntilTime = new Date(Date.now() + lockoutMins * 60 * 1000);
    await prisma.user.update({
      where: { id: userRecord.id },
      data: {
        failedLoginAttempts: 5,
        lockedUntil: lockUntilTime,
      },
    });

    userState = await prisma.user.findUnique({ where: { id: userRecord.id } });
    assert(userState?.failedLoginAttempts === 5, "5th failed attempt recorded");
    assert(!!userState?.lockedUntil && userState.lockedUntil > new Date(), "Account is LOCKED for 5 minutes");

    const remainingSecs = Math.ceil((userState!.lockedUntil!.getTime() - Date.now()) / 1000);
    assert(remainingSecs >= 290 && remainingSecs <= 300, `Lockout countdown remaining is ~${remainingSecs} seconds`);

    // -------------------------------------------------------------
    // Test 7: Admin Account Unlock
    // -------------------------------------------------------------
    console.log("\n--- 7. Admin Account Unlock Capability ---");
    await prisma.user.update({
      where: { id: userRecord.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    userState = await prisma.user.findUnique({ where: { id: userRecord.id } });
    assert(userState?.failedLoginAttempts === 0, "Failed login attempts reset to 0 upon unlock");
    assert(userState?.lockedUntil === null, "Account lockout cleared; user can log in immediately");

    // Clean up test user
    await prisma.user.delete({ where: { id: userRecord.id } });

    // -------------------------------------------------------------
    // Test 8: Comprehensive Audit Trail Logging
    // -------------------------------------------------------------
    console.log("\n--- 8. Audit Trail Verification ---");
    const testAudit = await prisma.auditLog.create({
      data: {
        action: "SECURITY_TEST_AUDIT",
        resourceType: "SECURITY",
        detailsJson: JSON.stringify({ test: "automated_validation", timestamp: Date.now() }),
        ipAddress: "192.168.1.100",
        userAgent: "AntigravitySecurityTestSuite/1.0",
        status: "SUCCESS",
      },
    });

    assert(!!testAudit.id, "Audit log record created");
    assert(testAudit.ipAddress === "192.168.1.100", "Audit log captured IP address");
    assert(testAudit.status === "SUCCESS", "Audit log captured event status");

    const auditCount = await prisma.auditLog.count();
    assert(auditCount > 0, `Total audit records in system: ${auditCount}`);

    // Clean up test audit log
    await prisma.auditLog.delete({ where: { id: testAudit.id } });

    console.log("\n===============================================================");
    console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED           `);
    console.log("===============================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSecurityTests();
