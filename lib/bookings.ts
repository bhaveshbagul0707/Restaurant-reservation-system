export interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  tableNumber: number;
  smsConsent?: boolean;
}

export const TABLES = [
  { number: 1, capacity: 2 },
  { number: 2, capacity: 2 },
  { number: 3, capacity: 4 },
  { number: 4, capacity: 4 },
  { number: 5, capacity: 6 },
  { number: 6, capacity: 6 },
] as const;

export function getLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDateOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return getLocalDate(date);
}
