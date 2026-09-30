import { NextRequest, NextResponse } from 'next/server';
import { bookingInputSchema, isE164PhoneNumber, isReservationDateInWindow } from '@/lib/reservation-validation';
import { ReservationRow } from '@/lib/database.types';
import { deliverNotification } from '@/lib/reservation-notifications';
import { getSupabaseAdmin } from '@/lib/supabase';
import { Booking } from '@/lib/bookings';
import { enforceRateLimit } from '@/lib/rate-limit';
import { createLocalDemoReservation, isLocalDemoMode } from '@/lib/local-demo-store';

function toBooking(row: ReservationRow): Booking {
  return {
    id: row.id,
    name: row.guest_name,
    email: row.email,
    phone: row.phone,
    date: row.reservation_date,
    time: row.reservation_time.slice(0, 5),
    guests: row.guests,
    tableNumber: row.table_number,
    smsConsent: row.sms_consent,
  };
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(request, 'booking');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many booking attempts. Please wait before trying again.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not validate booking request.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid booking request.' }, { status: 400 });
  }

  const parsed = bookingInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Check the reservation details and try again.' },
      { status: 400 },
    );
  }
  if (!isReservationDateInWindow(parsed.data.date)) {
    return NextResponse.json({ error: 'Choose a date from tomorrow through the next 30 days.' }, { status: 400 });
  }
  if (parsed.data.smsConsent && !isE164PhoneNumber(parsed.data.phone)) {
    return NextResponse.json(
      { error: 'For SMS updates, enter your phone with country code, such as +14155552671.' },
      { status: 400 },
    );
  }

  try {
    if (isLocalDemoMode()) {
      let row: ReservationRow;
      try {
        row = await createLocalDemoReservation(parsed.data);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not save your reservation.';
        const status = message.startsWith('That table was just booked.') ? 409 : 400;
        return NextResponse.json({ error: message }, { status });
      }
      return NextResponse.json(
        {
          booking: toBooking(row),
          notificationWarning: 'This reservation is saved on this computer only. Email and SMS notifications are not sent.',
        },
        { status: 201 },
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc<
      'create_reservation',
      {
        p_guest_name: string;
        p_email: string;
        p_phone: string;
        p_reservation_date: string;
        p_reservation_time: string;
        p_guests: number;
        p_table_number: number;
        p_sms_consent?: boolean;
      }
    >('create_reservation', {
      p_guest_name: parsed.data.name,
      p_email: parsed.data.email,
      p_phone: parsed.data.phone,
      p_reservation_date: parsed.data.date,
      p_reservation_time: `${parsed.data.time}:00`,
      p_guests: parsed.data.guests,
      p_table_number: parsed.data.tableNumber,
      p_sms_consent: parsed.data.smsConsent,
    });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'That table was just booked. Please select another available table.' },
          { status: 409 },
        );
      }
      if (error.code === '22023') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw new Error(`Could not save reservation: ${error.message}`);
    }

    const row = data?.[0];
    if (!row) throw new Error('Reservation was not returned after being saved.');
    const booking = toBooking(row);
    const { data: notifications, error: notificationsError } = await supabase
      .from('reservation_notifications')
      .select('id')
      .eq('reservation_id', row.id)
      .eq('event_type', 'booking_confirmed');
    if (notificationsError) {
      return NextResponse.json(
        {
          booking,
          notificationWarning: `Booking saved, but confirmation notifications could not be checked: ${notificationsError.message}`,
        },
        { status: 201 },
      );
    }

    const notificationResults = await Promise.all(
      notifications.map(async (notification) => {
        try {
          return await deliverNotification(notification.id);
        } catch (deliveryError) {
          return {
            id: notification.id,
            channel: 'email' as const,
            eventType: 'booking_confirmed' as const,
            status: 'failed' as const,
            message: deliveryError instanceof Error
              ? deliveryError.message
              : 'Could not process the confirmation notice.',
          };
        }
      }),
    );
    return NextResponse.json(
      { booking, notifications: notificationResults },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not save your reservation.' },
      { status: 503 },
    );
  }
}
