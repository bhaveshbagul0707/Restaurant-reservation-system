import { z } from 'zod';

export const bookingInputSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(100, 'Name must be 100 characters or fewer.'),
  email: z.string().trim().email('Enter a valid email address.').max(254),
  phone: z.string().trim().min(3).max(30),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date.'),
  time: z.string().regex(/^(?:1[1-9]|20|21):(00|30)$/, 'Choose a valid 30-minute time slot.'),
  guests: z.number().int().min(1).max(6),
  tableNumber: z.number().int().min(1).max(6),
  smsConsent: z.boolean().default(false),
});

export function isReservationDateInWindow(value: string): boolean {
  const current = new Date();
  const today = Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate());
  const requested = Date.parse(`${value}T00:00:00.000Z`);
  const days = (requested - today) / 86_400_000;
  return Number.isInteger(days) && days >= 1 && days <= 30;
}

export function isE164PhoneNumber(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value);
}
