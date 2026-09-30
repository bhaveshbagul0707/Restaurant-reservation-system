import 'server-only';
import { mkdir, open, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AdminCredentialRow, ReservationRow } from '@/lib/database.types';
import { TABLES } from '@/lib/bookings';

interface LocalRateLimit {
  count: number;
  resetAt: number;
}

interface LocalDemoData {
  reservations: ReservationRow[];
  adminCredentials: AdminCredentialRow | null;
  rateLimits: Record<string, LocalRateLimit>;
}

const dataDirectory = join(process.cwd(), '.data');
const dataPath = join(dataDirectory, 'local-demo.json');
const lockPath = join(dataDirectory, 'local-demo.lock');
let operationQueue: Promise<void> = Promise.resolve();

export function isLocalDemoMode(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    !process.env.SUPABASE_URL &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function isLocalDemoData(value: unknown): value is LocalDemoData {
  if (typeof value !== 'object' || value === null) return false;
  const data = value as Record<string, unknown>;
  return (
    Array.isArray(data.reservations) &&
    (data.adminCredentials === null || typeof data.adminCredentials === 'object') &&
    typeof data.rateLimits === 'object' &&
    data.rateLimits !== null &&
    !Array.isArray(data.rateLimits)
  );
}

async function readData(): Promise<LocalDemoData> {
  try {
    const content = await readFile(dataPath, 'utf8');
    const parsed: unknown = JSON.parse(content);
    if (!isLocalDemoData(parsed)) {
      throw new Error('Local demo data has an invalid format. Back up and repair .data/local-demo.json.');
    }
    return parsed;
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      return { reservations: [], adminCredentials: null, rateLimits: {} };
    }
    if (error instanceof SyntaxError) {
      throw new Error('Local demo data is corrupted. Back up and repair .data/local-demo.json before continuing.');
    }
    throw error;
  }
}

async function acquireFileLock(): Promise<() => Promise<void>> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    try {
      const lock = await open(lockPath, 'wx');
      return async () => {
        await lock.close();
        await unlink(lockPath);
      };
    } catch (error) {
      if (typeof error !== 'object' || error === null || !('code' in error) || error.code !== 'EEXIST') {
        throw error;
      }
      try {
        const lockStats = await stat(lockPath);
        if (Date.now() - lockStats.mtimeMs > 30_000) {
          await unlink(lockPath);
          continue;
        }
      } catch (statError) {
        if (typeof statError === 'object' && statError !== null && 'code' in statError && statError.code === 'ENOENT') {
          continue;
        }
        throw statError;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  throw new Error('Local demo storage is busy. Please retry the request.');
}

async function withData<T>(operation: (data: LocalDemoData) => Promise<T> | T): Promise<T> {
  const run = operationQueue.then(async () => {
    await mkdir(dataDirectory, { recursive: true });
    const releaseLock = await acquireFileLock();
    try {
      const data = await readData();
      const result = await operation(data);
      const temporaryPath = `${dataPath}.${randomUUID()}.tmp`;
      await writeFile(temporaryPath, JSON.stringify(data, null, 2), { encoding: 'utf8', flag: 'wx' });
      await rename(temporaryPath, dataPath);
      return result;
    } finally {
      await releaseLock();
    }
  });
  operationQueue = run.then(() => undefined, () => undefined);
  return run;
}

export function getLocalDemoAdminCredentials(): Promise<AdminCredentialRow | null> {
  return withData((data) => data.adminCredentials);
}

export function initializeLocalDemoAdminCredentials(
  create: () => Promise<AdminCredentialRow>,
): Promise<AdminCredentialRow> {
  return withData(async (data) => {
    if (!data.adminCredentials) data.adminCredentials = await create();
    return data.adminCredentials;
  });
}

export function updateLocalDemoAdminCredentials(
  credentials: AdminCredentialRow,
): Promise<void> {
  return withData((data) => {
    if (!data.adminCredentials) {
      throw new Error('The local admin account is not initialized. Sign in again before changing it.');
    }
    data.adminCredentials = credentials;
  });
}

export function consumeLocalDemoRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  return withData((data) => {
    const now = Date.now();
    for (const [storedKey, value] of Object.entries(data.rateLimits)) {
      if (value.resetAt <= now) delete data.rateLimits[storedKey];
    }
    const current = data.rateLimits[key];
    if (!current || current.resetAt <= now) {
      data.rateLimits[key] = { count: 1, resetAt: now + windowSeconds * 1000 };
      return true;
    }
    if (current.count >= limit) return false;
    current.count += 1;
    return true;
  });
}

export function getLocalDemoAvailability(date: string, time: string) {
  return withData((data) => {
    const bookedTables = new Set(
      data.reservations
        .filter(
          (reservation) =>
            reservation.status === 'confirmed' &&
            reservation.reservation_date === date &&
            reservation.reservation_time === `${time}:00`,
        )
        .map((reservation) => reservation.table_number),
    );
    return TABLES.map((table) => ({
      number: table.number,
      capacity: table.capacity,
      booked: bookedTables.has(table.number),
    }));
  });
}

export function createLocalDemoReservation(input: {
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  tableNumber: number;
  smsConsent: boolean;
}): Promise<ReservationRow> {
  return withData((data) => {
    const table = TABLES.find((candidate) => candidate.number === input.tableNumber);
    if (!table || input.guests > table.capacity) {
      throw new Error('That table does not have enough seats for your party.');
    }
    if (
      data.reservations.some(
        (reservation) =>
          reservation.status === 'confirmed' &&
          reservation.reservation_date === input.date &&
          reservation.reservation_time === `${input.time}:00` &&
          reservation.table_number === input.tableNumber,
      )
    ) {
      throw new Error('That table was just booked. Please select another available table.');
    }
    const reservation: ReservationRow = {
      id: randomUUID(),
      guest_name: input.name,
      email: input.email,
      phone: input.phone,
      reservation_date: input.date,
      reservation_time: `${input.time}:00`,
      guests: input.guests,
      table_number: input.tableNumber,
      sms_consent: input.smsConsent,
      status: 'confirmed',
      created_at: new Date().toISOString(),
      cancelled_at: null,
    };
    data.reservations.push(reservation);
    return reservation;
  });
}

export function listLocalDemoReservations(): Promise<ReservationRow[]> {
  return withData((data) =>
    data.reservations
      .filter((reservation) => reservation.status === 'confirmed')
      .sort(
        (left, right) =>
          left.reservation_date.localeCompare(right.reservation_date) ||
          left.reservation_time.localeCompare(right.reservation_time),
      ),
  );
}

export function cancelLocalDemoReservation(id: string): Promise<ReservationRow | null> {
  return withData((data) => {
    const reservation = data.reservations.find(
      (candidate) => candidate.id === id && candidate.status === 'confirmed',
    );
    if (!reservation) return null;
    reservation.status = 'cancelled';
    reservation.cancelled_at = new Date().toISOString();
    return reservation;
  });
}
