'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  Booking,
  getDateOffset,
  TABLES,
} from '@/lib/bookings';

const TIMES = Array.from({ length: 22 }, (_, index) => {
  const minutes = 11 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

export default function BookingPage() {
  const [step, setStep] = useState(1);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState(2);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [smsConsent, setSmsConsent] = useState(false);
  const [availableTables, setAvailableTables] = useState<
    { number: number; capacity: number; booked: boolean }[]
  >([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [confirmation, setConfirmation] = useState<Booking | null>(null);
  const [confirmationNotice, setConfirmationNotice] = useState('');
  const [error, setError] = useState('');

  const refreshAvailability = useCallback(async (signal?: AbortSignal) => {
    if (!date || !time) {
      setAvailableTables([]);
      return;
    }
    setLoadingAvailability(true);
    try {
      const query = new URLSearchParams({ date, time, guests: String(guests) });
      const response = await fetch(`/api/bookings/availability?${query}`, { signal });
      const result = (await response.json()) as {
        tables?: { number: number; capacity: number; booked: boolean }[];
        error?: string;
      };
      if (!response.ok) throw new Error(result.error ?? 'Could not check available tables.');
      setAvailableTables(result.tables ?? []);
      setError('');
    } catch (availabilityError) {
      if (availabilityError instanceof DOMException && availabilityError.name === 'AbortError') return;
      setAvailableTables([]);
      setError(availabilityError instanceof Error ? availabilityError.message : 'Could not load table availability.');
    } finally {
      setLoadingAvailability(false);
    }
  }, [date, guests, time]);

  useEffect(() => {
    const controller = new AbortController();
    void refreshAvailability(controller.signal);
    return () => controller.abort();
  }, [refreshAvailability]);

  useEffect(() => {
    if (step !== 2) return;
    const interval = window.setInterval(() => void refreshAvailability(), 15000);
    return () => window.clearInterval(interval);
  }, [refreshAvailability, step]);

  const suitableTables = availableTables.filter((table) => table.capacity >= guests);
  const noTablesAvailable =
    Boolean(date && time) &&
    !loadingAvailability &&
    suitableTables.length > 0 &&
    suitableTables.every((table) => table.booked);

  const updateDate = (value: string) => {
    setDate(value);
    setSelectedTable(null);
    setError('');
  };

  const updateTime = (value: string) => {
    setTime(value);
    setSelectedTable(null);
    setError('');
  };

  const confirmBooking = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!selectedTable || guests < 1 || guests > 6) {
      setError('Select an available table that can seat your whole party.');
      setStep(2);
      return;
    }

    const selectedTableInfo = TABLES.find((table) => table.number === selectedTable);
    if (!selectedTableInfo || guests > selectedTableInfo.capacity) {
      setError('That table does not have enough seats for your party.');
      setStep(2);
      return;
    }

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          date,
          time,
          guests,
          tableNumber: selectedTable,
          smsConsent,
        }),
      });
      const result = (await response.json()) as {
        booking?: Booking;
        error?: string;
        notificationWarning?: string;
        notifications?: { channel: 'email' | 'sms'; status: string; message: string }[];
      };
      if (response.status === 409) {
        setSelectedTable(null);
        setStep(2);
        setError(result.error ?? 'That table was just booked. Please select another.');
        await refreshAvailability();
        return;
      }
      if (!response.ok || !result.booking) {
        throw new Error(result.error ?? 'Could not confirm your reservation.');
      }
      setConfirmationNotice(
        result.notificationWarning ??
          (result.notifications ?? [])
            .map((notification) =>
              `${notification.channel}: ${notification.status.replace('_', ' ')} (${notification.message})`,
            )
            .join(' '),
      );
      setConfirmation(result.booking);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save your booking.');
    }
  };

  if (confirmation) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <section className="rounded-2xl border border-green-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-widest text-green-700">Confirmed</p>
          <h1 className="mt-2 text-3xl font-bold text-stone-900">Your table is booked</h1>
          <dl className="mt-8 grid grid-cols-2 gap-6">
            <div><dt className="text-sm text-stone-500">Name</dt><dd className="mt-1 font-semibold">{confirmation.name}</dd></div>
            <div><dt className="text-sm text-stone-500">Party</dt><dd className="mt-1 font-semibold">{confirmation.guests} guests</dd></div>
            <div><dt className="text-sm text-stone-500">Date</dt><dd className="mt-1 font-semibold">{confirmation.date}</dd></div>
            <div><dt className="text-sm text-stone-500">Time</dt><dd className="mt-1 font-semibold">{confirmation.time}</dd></div>
            <div><dt className="text-sm text-stone-500">Table</dt><dd className="mt-1 font-semibold">#{confirmation.tableNumber}</dd></div>
            <div><dt className="text-sm text-stone-500">Email</dt><dd className="mt-1 break-all font-semibold">{confirmation.email}</dd></div>
          </dl>
          <p className="mt-6 text-sm text-stone-500">
            Your reservation has been saved securely.
          </p>
          {confirmationNotice && (
            <p role="status" aria-live="polite" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm leading-6 text-amber-950">
              Confirmation notice status: {confirmationNotice}
            </p>
          )}
          <Link href="/" className="mt-8 inline-block rounded-lg bg-amber-700 px-5 py-3 font-semibold text-white">
            Back to home
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/" className="font-semibold text-amber-800 hover:underline">← Home</Link>
      <p className="mt-8 text-sm font-bold uppercase tracking-widest text-amber-700">Step {step} of 3</p>
      <h1 className="mt-2 text-4xl font-bold text-stone-900">Reserve a table</h1>
      <div className="mt-8 flex gap-2" aria-label={`Step ${step} of 3`}>
        {[1, 2, 3].map((item) => (
          <div key={item} className={`h-2 flex-1 rounded-full ${item <= step ? 'bg-amber-700' : 'bg-stone-200'}`} />
        ))}
      </div>
      {error && <p role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}

      {step === 1 && (
        <section className="mt-8 space-y-6 rounded-2xl bg-white p-8 shadow-sm">
          <label className="block font-semibold text-stone-800">
            Date
            <input
              required
              type="date"
              min={getDateOffset(1)}
              max={getDateOffset(30)}
              value={date}
              onChange={(event) => updateDate(event.target.value)}
              className="mt-2 block w-full rounded-lg border border-stone-300 px-4 py-3"
            />
          </label>
          <label className="block font-semibold text-stone-800">
            Time
            <select
              required
              value={time}
              onChange={(event) => updateTime(event.target.value)}
              className="mt-2 block w-full rounded-lg border border-stone-300 bg-white px-4 py-3"
            >
              <option value="">Choose a time</option>
              {TIMES.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
            </select>
          </label>
          <label className="block font-semibold text-stone-800">
            Guests (1–6)
            <input
              required
              type="number"
              min={1}
              max={6}
              value={guests}
              onChange={(event) => setGuests(Number(event.target.value))}
              className="mt-2 block w-full rounded-lg border border-stone-300 px-4 py-3"
            />
          </label>
          <button
            type="button"
            disabled={!date || !time || guests < 1 || guests > 6 || Boolean(error)}
            onClick={() => setStep(2)}
            className="w-full rounded-lg bg-amber-700 px-5 py-3 font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Select a table
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="mt-8 rounded-2xl bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-stone-900">Choose a table</h2>
          <p className="mt-2 text-stone-600">{date} at {time} · {guests} guests</p>
          {noTablesAvailable && (
            <div role="status" aria-live="polite" className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-orange-950">
              <p className="font-semibold">Sorry, no suitable table is available at this time.</p>
              <p className="mt-1 text-sm">Please go back and choose a different time. We cannot hold a table while it is fully booked.</p>
            </div>
          )}
          {!loadingAvailability && availableTables.length > 0 && suitableTables.length === 0 && (
            <div role="status" className="mt-5 rounded-xl border border-orange-200 bg-orange-50 p-4 text-orange-950">
              No table can seat {guests} guests. Please go back and choose a smaller party size.
            </div>
          )}
          {loadingAvailability && (
            <p role="status" className="mt-5 text-sm text-stone-500">Checking live availability…</p>
          )}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {availableTables.map((table) => {
              const unavailable = table.booked || table.capacity < guests;
              return (
                <button
                  key={table.number}
                  type="button"
                  disabled={unavailable}
                  onClick={() => { setSelectedTable(table.number); setError(''); }}
                  className={`rounded-xl border-2 p-5 text-left ${
                    selectedTable === table.number
                      ? 'border-green-600 bg-green-50'
                      : unavailable
                        ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400'
                        : 'border-stone-200 hover:border-amber-600'
                  }`}
                >
                  <span className="block text-2xl font-bold">#{table.number}</span>
                  <span className="mt-1 block text-sm">{table.capacity} seats</span>
                  <span className="mt-2 block text-xs font-semibold">
                    {table.booked ? 'Booked' : table.capacity < guests ? 'Too small' : selectedTable === table.number ? 'Selected' : 'Available'}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-8 flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="flex-1 rounded-lg border border-stone-300 px-5 py-3 font-semibold">Back</button>
            <button
              type="button"
              disabled={!selectedTable}
              onClick={() => setStep(3)}
              className="flex-1 rounded-lg bg-amber-700 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              Enter your details
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <form onSubmit={confirmBooking} className="mt-8 space-y-5 rounded-2xl bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-stone-900">Your details</h2>
          <label className="block font-semibold text-stone-800">
            Full name
            <input required autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-2 block w-full rounded-lg border border-stone-300 px-4 py-3" />
          </label>
          <label className="block font-semibold text-stone-800">
            Email
            <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 block w-full rounded-lg border border-stone-300 px-4 py-3" />
          </label>
          <label className="block font-semibold text-stone-800">
            Phone
            <input required type="tel" autoComplete="tel" placeholder="+14155552671" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-2 block w-full rounded-lg border border-stone-300 px-4 py-3" />
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-stone-200 p-4 text-sm leading-6 text-stone-700">
            <input
              type="checkbox"
              checked={smsConsent}
              onChange={(event) => setSmsConsent(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-stone-300 accent-amber-800"
            />
            <span>I agree to receive transactional SMS about this reservation, including cancellation updates. Message/data rates may apply. I can leave this unchecked to opt out.</span>
          </label>
          <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-950">
            {date} at {time} · {guests} guests · Table #{selectedTable}
          </p>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(2)} className="flex-1 rounded-lg border border-stone-300 px-5 py-3 font-semibold">Back</button>
            <button type="submit" className="flex-1 rounded-lg bg-amber-700 px-5 py-3 font-semibold text-white hover:bg-amber-800">Confirm booking</button>
          </div>
        </form>
      )}
    </main>
  );
}
