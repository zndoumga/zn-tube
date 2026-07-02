export const SESSION_COOKIE_NAME = "zntube_session";

const SESSION_PAYLOAD = "authenticated";

function requireEnv(name: "AUTH_SECRET" | "APP_PASSWORD"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

function bufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Uses Web Crypto (available in both the Node.js and Edge runtimes) so this
// module works from middleware as well as regular route handlers.
async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return bufferToHex(signature);
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/** The signed value that goes in the session cookie. */
export async function createSessionCookieValue(): Promise<string> {
  return hmacHex(requireEnv("AUTH_SECRET"), SESSION_PAYLOAD);
}

/** Verifies a cookie value against the expected signature. */
export async function verifySessionCookieValue(
  value: string | undefined | null,
): Promise<boolean> {
  if (!value) return false;
  const expected = await createSessionCookieValue();
  return timingSafeEqualStr(value, expected);
}

/**
 * Compares a submitted password against APP_PASSWORD without a variable-time
 * string comparison, by hashing both sides with AUTH_SECRET first.
 */
export async function verifyPassword(candidate: string): Promise<boolean> {
  const secret = requireEnv("AUTH_SECRET");
  const appPassword = requireEnv("APP_PASSWORD");
  const [a, b] = await Promise.all([
    hmacHex(secret, candidate),
    hmacHex(secret, appPassword),
  ]);
  return timingSafeEqualStr(a, b);
}
