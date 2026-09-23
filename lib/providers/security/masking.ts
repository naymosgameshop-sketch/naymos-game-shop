/**
 * Sensitive Data Masking Utility
 * Ensures API keys, secrets, tokens, and personal credentials are never exposed
 * in audit logs, database transactions, or client responses.
 */

const SENSITIVE_KEYS = new Set([
  'api_key',
  'apikey',
  'api_secret',
  'secret',
  'token',
  'auth_token',
  'access_token',
  'password',
  'authorization',
  'private_key',
  'pin',
  'cvv',
  'card_number',
  'cookie',
]);

export function maskSecretPreview(secret: string | null | undefined): string {
  if (!secret) return 'none';
  const clean = secret.trim();
  if (clean.length <= 8) return '********';
  return `${clean.slice(0, 4)}...${clean.slice(-4)}`;
}

export function sanitizePayload<T = any>(data: T): T {
  if (!data) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayload(item)) as unknown as T;
  }

  const cleanObj: Record<string, any> = {};

  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    const lowerKey = key.toLowerCase();
    const isSensitive =
      SENSITIVE_KEYS.has(lowerKey) ||
      lowerKey.includes('secret') ||
      lowerKey.includes('password') ||
      lowerKey.includes('token') ||
      lowerKey.includes('auth');

    if (isSensitive) {
      if (typeof value === 'string') {
        cleanObj[key] = maskSecretPreview(value);
      } else {
        cleanObj[key] = '[REDACTED_SECRET]';
      }
    } else if (typeof value === 'object' && value !== null) {
      cleanObj[key] = sanitizePayload(value);
    } else {
      cleanObj[key] = value;
    }
  }

  return cleanObj as T;
}
