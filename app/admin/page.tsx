'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  KeyRound,
  LockKeyhole,
  LogOut,
  ShieldCheck,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Booking, getLocalDate } from '@/lib/bookings';

interface AdminResponse {
  authenticated?: boolean;
  updated?: boolean;
  username?: string;
  error?: string;
}

interface CancellationResponse extends AdminResponse {
  cancelled?: boolean;
  notificationWarning?: string;
  notifications?: {
    id: string;
    channel: 'email' | 'sms';
    eventType: 'booking_confirmed' | 'booking_cancelled';
    status: 'sent' | 'failed' | 'not_configured' | 'skipped' | 'sending';
    message: string;
  }[];
}

interface NotificationIssue {
  id: string;
  channel: 'email' | 'sms';
  event_type: 'booking_confirmed' | 'booking_cancelled';
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'not_configured' | 'skipped';
  attempts: number;
  message: string;
}

function errorMessage(value: unknown, fallback: string): string {
  return value instanceof Error ? value.message : fallback;
}

const inputClass =
  'mt-2 block w-full rounded-xl border border-stone-200 bg-white px-4 py-3.5 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-amber-600 focus:ring-4 focus:ring-amber-100';

export default function AdminPage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState('admin');
  const [loginUsername, setLoginUsername] = useState('');
  const [password, setPassword] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [error, setError] = useState('');
  const [cancellationNotice, setCancellationNotice] = useState('');
  const [failedNotifications, setFailedNotifications] = useState<
    NotificationIssue[]
  >([]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountMessage, setAccountMessage] = useState('');
  const [accountError, setAccountError] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

  const loadBookings = async () => {
    setLoadingBookings(true);
    try {
      const response = await fetch('/api/admin/bookings');
      const result = (await response.json()) as { bookings?: Booking[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Could not load reservations.');
      setBookings(result.bookings ?? []);
      const notificationResponse = await fetch('/api/admin/notifications');
      const notificationResult = (await notificationResponse.json()) as {
        notifications?: NotificationIssue[];
        error?: string;
      };
      if (!notificationResponse.ok) {
        throw new Error(notificationResult.error ?? 'Could not load notification delivery status.');
      }
      setFailedNotifications(notificationResult.notifications ?? []);
      setError('');
    } catch (loadError) {
      setError(errorMessage(loadError, 'Could not load saved bookings.'));
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch('/api/admin/session')
      .then(async (response) => {
        const result = (await response.json()) as AdminResponse;
        if (!active) return;
        if (!response.ok) {
          setError(result.error ?? 'Could not verify the admin session.');
        } else if (result.authenticated) {
          const signedInUsername = result.username ?? 'admin';
          setAuthenticated(true);
          setUsername(signedInUsername);
          setNewUsername(signedInUsername);
          loadBookings();
        }
      })
      .catch((sessionError: unknown) => {
        if (active) setError(errorMessage(sessionError, 'Could not verify the admin session.'));
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => { active = false; };
  }, []);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password }),
      });
      const result = (await response.json()) as AdminResponse;
      if (!response.ok) {
        setError(result.error ?? 'Login failed.');
        return;
      }
      const signedInUsername = result.username ?? loginUsername;
      setAuthenticated(true);
      setUsername(signedInUsername);
      setNewUsername(signedInUsername);
      setPassword('');
      loadBookings();
    } catch (loginError) {
      setError(errorMessage(loginError, 'Could not connect to the login service.'));
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/admin/session', { method: 'DELETE' });
      if (!response.ok) {
        setError('Could not log out. Please try again.');
        return;
      }
      setAuthenticated(false);
      setBookings([]);
      setPassword('');
      setError('');
    } catch (logoutError) {
      setError(errorMessage(logoutError, 'Could not connect to the logout service.'));
    }
  };

  const handleAccountUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAccountError('');
    setAccountMessage('');
    if (newPassword !== confirmPassword) {
      setAccountError('The new passwords do not match.');
      return;
    }
    if (newPassword.length < 12) {
      setAccountError('Choose a password at least 12 characters long.');
      return;
    }

    setSavingAccount(true);
    try {
      const response = await fetch('/api/admin/credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          username: newUsername,
          newPassword,
        }),
      });
      const result = (await response.json()) as AdminResponse;
      if (!response.ok) {
        setAccountError(result.error ?? 'Could not update admin credentials.');
        return;
      }

      const updatedUsername = result.username ?? newUsername.trim().toLowerCase();
      setUsername(updatedUsername);
      setNewUsername(updatedUsername);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setAccountMessage('Admin ID and password updated. Your new credentials are ready to use.');
    } catch (updateError) {
      setAccountError(errorMessage(updateError, 'Could not connect to the account service.'));
    } finally {
      setSavingAccount(false);
    }
  };

  const cancelBooking = async (id: string) => {
    if (!window.confirm('Cancel this reservation?')) return;
    let reservationCancelled = false;
    try {
      const response = await fetch(`/api/admin/bookings/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const result = (await response.json()) as CancellationResponse;
      if (!response.ok || !result.cancelled) throw new Error(result.error ?? 'Could not cancel this reservation.');
      reservationCancelled = true;
      setBookings((current) => current.filter((booking) => booking.id !== id));
      setError('');

      const notifications = Array.isArray(result.notifications) ? result.notifications : [];
      setFailedNotifications(
        notifications
          .filter((notification) =>
            notification.status === 'failed' || notification.status === 'not_configured',
          )
          .map((notification) => ({
            id: notification.id,
            channel: notification.channel,
            event_type: notification.eventType,
            status: notification.status as 'failed' | 'not_configured',
            attempts: 0,
            message: notification.message,
          })),
      );
      setCancellationNotice(`${result.notificationWarning ?? 'Reservation cancelled.'} ${notifications.map((notification) =>
        `${notification.channel}: ${notification.status.replace('_', ' ')} (${notification.message})`,
      ).join(' ')}`);
    } catch (cancelError) {
      if (reservationCancelled) {
        setCancellationNotice(
          `Reservation cancelled, but guest notifications could not be confirmed: ${errorMessage(cancelError, 'notification service unavailable.')}`,
        );
      } else {
        setError(errorMessage(cancelError, 'Could not cancel this reservation.'));
      }
    }
  };

  const retryNotification = async (notificationId: string) => {
    try {
      const response = await fetch('/api/admin/notifications/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      });
      const result = (await response.json()) as {
        notification?: {
          id: string;
          channel: 'email' | 'sms';
          eventType: 'booking_confirmed' | 'booking_cancelled';
          status: 'sent' | 'failed' | 'not_configured' | 'skipped' | 'sending';
          message: string;
        };
        error?: string;
      };
      if (!response.ok || !result.notification) throw new Error(result.error ?? 'Could not retry notification.');
      const notification = result.notification;
      setFailedNotifications((current) => {
        const remaining = current.filter((item) => item.id !== notificationId);
        if (notification.status === 'failed' || notification.status === 'not_configured') {
          remaining.push({
            ...notification,
            event_type: notification.eventType,
            attempts: 0,
          });
        }
        return remaining;
      });
      setCancellationNotice(`${notification.channel}: ${notification.status.replace('_', ' ')} (${notification.message})`);
    } catch (retryError) {
      setCancellationNotice(errorMessage(retryError, 'Could not retry notification.'));
    }
  };

  const sortedBookings = useMemo(() => {
    const filtered = filterDate ? bookings.filter((booking) => booking.date === filterDate) : bookings;
    return [...filtered].sort((first, second) =>
      `${first.date}T${first.time}`.localeCompare(`${second.date}T${second.time}`),
    );
  }, [bookings, filterDate]);

  const today = getLocalDate(new Date());
  const todayBookings = bookings.filter((booking) => booking.date === today).length;
  const totalGuests = bookings.reduce((total, booking) => total + booking.guests, 0);

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fffaf3] px-6 text-stone-600">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-5 shadow-sm">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-600" />
          Checking your admin session…
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#fffaf3] px-5 py-12">
        <div className="absolute -left-36 -top-40 -z-10 h-[30rem] w-[30rem] rounded-full bg-amber-100/70 blur-3xl" />
        <div className="absolute -bottom-48 -right-28 -z-10 h-[32rem] w-[32rem] rounded-full bg-orange-100/70 blur-3xl" />
        <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-[0_30px_100px_-40px_rgba(120,53,15,0.3)] lg:min-h-[650px] lg:grid-cols-[1.02fr_0.98fr]">
          <section className="relative flex min-h-[290px] flex-col justify-between overflow-hidden bg-gradient-to-br from-amber-900 via-amber-800 to-orange-800 p-8 text-white sm:p-12 lg:p-14">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />
            <div className="absolute -right-8 -top-8 h-56 w-56 rounded-full border border-white/10" />
            <Link href="/" className="relative flex w-fit items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                <UtensilsCrossed size={23} />
              </span>
              <span className="text-sm font-bold tracking-[0.12em]">TABLE & TASTE</span>
            </Link>
            <div className="relative mt-14 max-w-md">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold tracking-wide text-amber-50">
                <ShieldCheck size={15} /> SECURE ADMIN PORTAL
              </span>
              <h1 className="mt-6 text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl">
                Good to see you.
                <span className="mt-2 block text-amber-200">Your restaurant, in control.</span>
              </h1>
              <p className="mt-5 max-w-sm text-base leading-7 text-amber-50/80">
                Sign in to stay on top of bookings, guest details, and your restaurant&apos;s daily service.
              </p>
            </div>
            <p className="relative mt-12 text-sm text-amber-100/65">Reservations made simple, hospitality made memorable.</p>
          </section>

          <section className="flex items-center justify-center p-7 sm:p-12 lg:p-14">
            <div className="w-full max-w-md">
              <Link href="/" className="text-sm font-semibold text-stone-500 transition hover:text-amber-800">
                ← Back to restaurant
              </Link>
              <div className="mt-10">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-700">Admin sign in</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-stone-900">Welcome back</h2>
                <p className="mt-3 text-stone-500">Enter your admin ID and password to continue.</p>
              </div>
              {error && (
                <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {error}
                </p>
              )}
        {cancellationNotice && (
                <div role="status" aria-live="polite" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
                  <p>{cancellationNotice}</p>
                  {failedNotifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => void retryNotification(notification.id)}
                      className="mt-2 mr-3 font-semibold underline"
                    >
                      Retry {notification.channel}
                    </button>
                  ))}
                </div>
              )}

              {failedNotifications.length > 0 && (
                <section aria-label="Notification delivery queue" className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-orange-950">Guest notification delivery</p>
                      <p className="mt-1 text-sm text-orange-900">Pending or unsuccessful notices stay in the database until delivered or retried.</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-orange-900">
                      {failedNotifications.length} open
                    </span>
                  </div>
                  <ul className="mt-4 divide-y divide-orange-200">
                    {failedNotifications.map((notification) => (
                      <li key={notification.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                        <div>
                          <p className="font-semibold capitalize text-stone-900">
                            {notification.channel} · {notification.event_type.replace('_', ' ')} · {notification.status.replace('_', ' ')}
                          </p>
                          <p className="mt-1 text-orange-950">{notification.message}</p>
                        </div>
                        {(notification.status === 'failed' || notification.status === 'not_configured') && (
                          <button
                            onClick={() => void retryNotification(notification.id)}
                            className="rounded-lg border border-orange-300 bg-white px-3 py-2 font-semibold text-orange-950 hover:bg-orange-100"
                          >
                            Retry
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <form onSubmit={handleLogin} className="mt-8 space-y-5">
                <label className="block text-sm font-semibold text-stone-700">
                  Admin ID
                  <input
                    required
                    autoComplete="username"
                    value={loginUsername}
                    onChange={(event) => setLoginUsername(event.target.value)}
                    placeholder="Enter your admin ID"
                    className={inputClass}
                  />
                </label>
                <label className="block text-sm font-semibold text-stone-700">
                  Password
                  <input
                    required
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className={inputClass}
                  />
                </label>
                <button
                  type="submit"
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-amber-800 px-5 py-4 font-bold text-white shadow-lg shadow-amber-900/15 transition hover:-translate-y-0.5 hover:bg-amber-900 focus:outline-none focus:ring-4 focus:ring-amber-200"
                >
                  Sign in to dashboard
                  <ArrowRight size={18} className="transition group-hover:translate-x-1" />
                </button>
              </form>
              <p className="mt-7 flex items-center justify-center gap-2 text-xs text-stone-400">
                <LockKeyhole size={14} /> Your account is protected with secure sign-in.
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const stats = [
    { label: 'All reservations', value: bookings.length, icon: CalendarDays, color: 'bg-amber-100 text-amber-800' },
    { label: "Today's reservations", value: todayBookings, icon: Clock3, color: 'bg-orange-100 text-orange-800' },
    { label: 'Guests expected', value: totalGuests, icon: Users, color: 'bg-emerald-100 text-emerald-800' },
  ];

  return (
    <main className="min-h-screen bg-[#fffaf3] pb-16">
      <header className="border-b border-amber-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-800 text-white shadow-md shadow-amber-900/15">
              <UtensilsCrossed size={21} />
            </span>
            <span>
              <span className="block text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Table & Taste</span>
              <span className="mt-0.5 block text-lg font-bold text-stone-900">Admin dashboard</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 sm:inline-flex">
              Signed in as <strong className="ml-1.5 text-amber-900">{username}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut size={16} /> Log out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <section className="relative mt-8 overflow-hidden rounded-[1.75rem] bg-gradient-to-r from-amber-900 via-amber-800 to-orange-800 px-7 py-9 text-white shadow-xl shadow-amber-900/10 sm:px-10 sm:py-11">
          <div className="absolute -right-16 -top-28 h-80 w-80 rounded-full border border-white/10" />
          <div className="absolute right-14 -top-12 h-52 w-52 rounded-full border border-white/10" />
          <p className="relative text-sm font-semibold text-amber-200">RESTAURANT OVERVIEW</p>
          <h1 className="relative mt-2 text-3xl font-bold tracking-tight sm:text-4xl">A warm welcome, {username}.</h1>
          <p className="relative mt-3 max-w-xl text-sm leading-6 text-amber-50/80 sm:text-base">
            Here&apos;s what&apos;s happening with your reservations. Keep every guest&apos;s experience running smoothly.
          </p>
        </section>

        {error && (
          <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <section aria-label="Reservation statistics" className="mt-6 grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <article key={stat.label} className="rounded-2xl border border-amber-100/80 bg-white p-6 shadow-sm shadow-amber-950/[0.03]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-stone-500">{stat.label}</p>
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.color}`}>
                  <stat.icon size={20} />
                </span>
              </div>
              <p className="mt-4 text-4xl font-bold tracking-tight text-stone-900">{stat.value}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-amber-100/80 bg-white shadow-sm shadow-amber-950/[0.03]">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-100 px-6 py-5 sm:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Guest list</p>
              <h2 className="mt-1 text-2xl font-bold text-stone-900">Reservations</h2>
              <p className="mt-1 text-sm text-stone-500">{sortedBookings.length} reservations shown</p>
            </div>
            <label className="text-sm font-semibold text-stone-700">
              Filter by date
              <input
                type="date"
                value={filterDate}
                onChange={(event) => setFilterDate(event.target.value)}
                className="ml-3 rounded-xl border border-stone-200 bg-white px-3 py-2.5 outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-100"
              />
            </label>
          </div>
          {loadingBookings ? (
            <p role="status" className="px-6 py-12 text-center text-stone-500">Loading reservations…</p>
          ) : sortedBookings.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-800">
                <CalendarDays size={24} />
              </span>
              <h3 className="mt-4 font-bold text-stone-900">No reservations yet</h3>
              <p className="mt-1 text-sm text-stone-500">New bookings will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-stone-50/80 text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Guest</th>
                    <th className="px-6 py-4 font-semibold">Contact</th>
                    <th className="px-6 py-4 font-semibold">Date & time</th>
                    <th className="px-6 py-4 font-semibold">Party</th>
                    <th className="px-6 py-4 font-semibold">Table</th>
                    <th className="px-6 py-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBookings.map((booking) => (
                    <tr key={booking.id} className="border-t border-stone-100 transition hover:bg-amber-50/40">
                      <td className="px-6 py-4 font-semibold text-stone-900">{booking.name}</td>
                      <td className="px-6 py-4 leading-6 text-stone-600">{booking.email}<br />{booking.phone}</td>
                      <td className="px-6 py-4 leading-6 text-stone-700">{booking.date}<br />{booking.time}</td>
                      <td className="px-6 py-4 text-stone-700">{booking.guests} guests</td>
                      <td className="px-6 py-4">
                        <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 font-semibold text-amber-900">
                          #{booking.tableNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => cancelBooking(booking.id)} className="font-semibold text-red-700 transition hover:text-red-900 hover:underline">
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-2xl border border-amber-100/80 bg-white p-6 shadow-sm shadow-amber-950/[0.03] sm:p-8">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-900">
              <ShieldCheck size={22} />
            </span>
            <h2 className="mt-5 text-2xl font-bold text-stone-900">Account security</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Change your admin ID or password any time. Your new sign-in details are saved securely on this server.
            </p>
            <div className="mt-6 rounded-xl bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Current admin ID</p>
              <p className="mt-1 break-all font-semibold text-stone-900">{username}</p>
            </div>
            <p className="mt-4 text-xs leading-5 text-stone-500">
              Use a unique password with at least 12 characters. Changing the password signs out other active sessions.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-100/80 bg-white p-6 shadow-sm shadow-amber-950/[0.03] sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
                <KeyRound size={20} />
              </span>
              <div>
                <h2 className="text-xl font-bold text-stone-900">Change admin ID & password</h2>
                <p className="mt-1 text-sm text-stone-500">Verify your current password to save changes.</p>
              </div>
            </div>
            {accountError && (
              <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {accountError}
              </p>
            )}
            {accountMessage && (
              <p role="status" className="mt-5 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                <Check size={17} className="mt-0.5 shrink-0" /> {accountMessage}
              </p>
            )}
            <form onSubmit={handleAccountUpdate} className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-stone-700 sm:col-span-2">
                Current password
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-semibold text-stone-700 sm:col-span-2">
                New admin ID
                <input
                  required
                  minLength={3}
                  maxLength={32}
                  autoComplete="username"
                  value={newUsername}
                  onChange={(event) => setNewUsername(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-semibold text-stone-700">
                New password
                <input
                  required
                  minLength={12}
                  maxLength={128}
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className={inputClass}
                />
                <span className="mt-1.5 block text-xs font-normal text-stone-500">At least 12 characters</span>
              </label>
              <label className="text-sm font-semibold text-stone-700">
                Confirm new password
                <input
                  required
                  minLength={12}
                  maxLength={128}
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className={inputClass}
                />
              </label>
              <button
                type="submit"
                disabled={savingAccount}
                className="mt-1 rounded-xl bg-stone-900 px-5 py-3.5 font-bold text-white transition hover:bg-amber-900 focus:outline-none focus:ring-4 focus:ring-amber-200 disabled:cursor-wait disabled:opacity-60 sm:col-span-2"
              >
                {savingAccount ? 'Saving securely…' : 'Save new admin credentials'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
