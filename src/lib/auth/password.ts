import "server-only";
import bcrypt from "bcryptjs";

/**
 * Cost factor for bcrypt. Twelve rounds is a sensible balance for a serverless
 * function: strong enough today, still fast enough that sign in feels instant.
 */
const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/**
 * Burns roughly the same time as a real comparison when the username does not
 * exist, so response timing cannot be used to discover which accounts are real.
 */
export async function fakeVerifyPassword(): Promise<void> {
  const placeholder = "$2a$12$K8pQ3Jz1l5VqK0yJ5jKPYeJ8dSd1cT0bXGk8l3mY2bV0t9HhHfKqu";
  await bcrypt.compare("tabea-timing-equalizer", placeholder).catch(() => false);
}
