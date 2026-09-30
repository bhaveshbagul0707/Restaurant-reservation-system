import {
  createHmac,
  randomBytes,
  timingSafeEqual,
  scrypt,
  randomUUID,
} from 'node:crypto';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  getLocalDemoAdminCredentials,
  initializeLocalDemoAdminCredentials,
  isLocalDemoMode,
  updateLocalDemoAdminCredentials,
} from '@/lib/local-demo-store';

export const ADMIN_SESSION_COOKIE = 'restaurant_admin_session';
export const ADMIN_SESSION_DURATION_SECONDS = 60 * 60 * 8;
const PASSWORD_HASH_BYTES = 64;

interface AdminCredentials {
  username: string;
  salt: string;
  passwordHash: string;
  sessionVersion: string;
}

export function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('Set ADMIN_SESSION_SECRET in .env.local before using admin login.');
  return secret;
}

function derivePasswordHash(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, PASSWORD_HASH_BYTES, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

function isCredentials(value: unknown): value is AdminCredentials {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.username === 'string' &&
    /^[a-zA-Z0-9._@-]{3,32}$/.test(record.username) &&
    typeof record.salt === 'string' &&
    /^[a-f0-9]{32}$/.test(record.salt) &&
    typeof record.passwordHash === 'string' &&
    /^[a-f0-9]{128}$/.test(record.passwordHash) &&
    typeof record.sessionVersion === 'string' &&
    record.sessionVersion.length > 0
  );
}

async function readStoredCredentials(): Promise<AdminCredentials | null> {
  if (isLocalDemoMode()) {
    const data = await getLocalDemoAdminCredentials();
    if (!data) return null;
    const credentials: AdminCredentials = {
      username: data.username,
      salt: data.salt,
      passwordHash: data.password_hash,
      sessionVersion: data.session_version,
    };
    if (!isCredentials(credentials)) {
      throw new Error('Stored local admin credentials are invalid. Review .data/local-demo.json.');
    }
    return credentials;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('admin_credentials')
    .select('username, salt, password_hash, session_version')
    .eq('singleton', true)
    .maybeSingle();
  if (error) throw new Error(`Could not load the admin account: ${error.message}`);
  if (!data) return null;
  const credentials: AdminCredentials = {
    username: data.username,
    salt: data.salt,
    passwordHash: data.password_hash,
    sessionVersion: data.session_version,
  };
  if (!isCredentials(credentials)) {
    throw new Error('Stored admin credentials are invalid. Review the Supabase admin_credentials table.');
  }
  return credentials;
}

export async function getAdminCredentials(): Promise<AdminCredentials> {
  getSessionSecret();
  const stored = await readStoredCredentials();
  if (stored) return stored;

  const username = process.env.ADMIN_USERNAME?.trim().toLowerCase() || 'admin';
  const password = process.env.ADMIN_PASSWORD;
  if (!/^[a-zA-Z0-9._@-]{3,32}$/.test(username) || !password) {
    throw new Error('Set a valid ADMIN_USERNAME and ADMIN_PASSWORD in .env.local before using admin login.');
  }

  if (isLocalDemoMode()) {
    const initialized = await initializeLocalDemoAdminCredentials(async () => {
      const salt = randomBytes(16).toString('hex');
      return {
        singleton: true,
        username,
        salt,
        password_hash: (await derivePasswordHash(password, salt)).toString('hex'),
        session_version: randomUUID(),
        updated_at: new Date().toISOString(),
      };
    });
    const credentials: AdminCredentials = {
      username: initialized.username,
      salt: initialized.salt,
      passwordHash: initialized.password_hash,
      sessionVersion: initialized.session_version,
    };
    if (!isCredentials(credentials)) {
      throw new Error('Stored local admin credentials are invalid. Review .data/local-demo.json.');
    }
    return credentials;
  }

  const salt = randomBytes(16).toString('hex');
  const credentials: AdminCredentials = {
    username,
    salt,
    passwordHash: (await derivePasswordHash(password, salt)).toString('hex'),
    sessionVersion: randomUUID(),
  };
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('admin_credentials').upsert(
    {
      singleton: true,
      username: credentials.username,
      salt: credentials.salt,
      password_hash: credentials.passwordHash,
      session_version: credentials.sessionVersion,
    },
    { onConflict: 'singleton', ignoreDuplicates: true },
  );
  if (error) throw new Error(`Could not initialize the admin account: ${error.message}`);
  const initialized = await readStoredCredentials();
  if (!initialized) throw new Error('Admin account initialization did not persist.');
  return initialized;
}

export async function verifyAdminPassword(
  suppliedPassword: string,
  credentials: AdminCredentials,
): Promise<boolean> {
  const expected = Buffer.from(credentials.passwordHash, 'hex');
  const supplied = await derivePasswordHash(suppliedPassword, credentials.salt);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export async function changeAdminCredentials(
  username: string,
  password: string,
): Promise<AdminCredentials> {
  const normalizedUsername = username.trim().toLowerCase();
  if (!/^[a-zA-Z0-9._@-]{3,32}$/.test(normalizedUsername)) {
    throw new Error('Admin ID must be 3–32 characters and use only letters, numbers, ., _, @, or -.');
  }
  if (password.length < 12 || password.length > 128) {
    throw new Error('Choose a password between 12 and 128 characters long.');
  }

  const salt = randomBytes(16).toString('hex');
  const credentials: AdminCredentials = {
    username: normalizedUsername,
    salt,
    passwordHash: (await derivePasswordHash(password, salt)).toString('hex'),
    sessionVersion: randomUUID(),
  };
  if (isLocalDemoMode()) {
    await updateLocalDemoAdminCredentials({
      singleton: true,
      username: credentials.username,
      salt: credentials.salt,
      password_hash: credentials.passwordHash,
      session_version: credentials.sessionVersion,
      updated_at: new Date().toISOString(),
    });
    return credentials;
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('admin_credentials')
    .update({
      username: credentials.username,
      salt: credentials.salt,
      password_hash: credentials.passwordHash,
      session_version: credentials.sessionVersion,
      updated_at: new Date().toISOString(),
    })
    .eq('singleton', true);
  if (error) throw new Error(`Could not save admin credentials: ${error.message}`);
  return credentials;
}

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function createAdminToken(secret: string, sessionVersion: string): string {
  const payload = Buffer.from(
    JSON.stringify({
      expiresAt: Date.now() + ADMIN_SESSION_DURATION_SECONDS * 1000,
      sessionVersion,
    }),
  ).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export function isAdminTokenValid(
  token: string | undefined,
  secret: string,
  sessionVersion: string,
): boolean {
  if (!token) return false;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra !== undefined) return false;

  const expectedSignature = sign(payload, secret);
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expectedSignature);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
    return false;
  }

  try {
    const data: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return (
      typeof data === 'object' &&
      data !== null &&
      'expiresAt' in data &&
      typeof data.expiresAt === 'number' &&
      data.expiresAt > Date.now() &&
      'sessionVersion' in data &&
      data.sessionVersion === sessionVersion
    );
  } catch {
    return false;
  }
}
