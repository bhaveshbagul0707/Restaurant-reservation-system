import { NextRequest, NextResponse } from 'next/server';
import { hasAdminSession } from '@/lib/admin-session';
import { ReservationRow } from '@/lib/database.types';
import { deliverNotification, toNotificationRow } from '@/lib/reservation-notifications';
import { getSupabaseAdmin } from '@/lib/supabase';
import { cancelLocalDemoReservation, isLocalDemoMode } from '@/lib/local-demo-store';

interface CancellationResult {
  reservation: ReservationRow;
  notifications: unknown[];
}

function isCancellationResult(value: unknown): value is CancellationResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'reservation' in value &&
    typeof value.reservation === 'object' &&
    value.reservation !== null &&
    'notifications' in value &&
    Array.isArray(value.notifications)
  );
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await hasAdminSession(request))) {
      return NextResponse.json({ error: 'Please sign in to cancel reservations.' }, { status: 401 });
    }

    const { id } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid reservation ID.' }, { status: 400 });
    }

    if (isLocalDemoMode()) {
      const reservation = await cancelLocalDemoReservation(id);
      if (!reservation) {
        return NextResponse.json({ error: 'Reservation was not found or is already cancelled.' }, { status: 404 });
      }
      return NextResponse.json({
        cancelled: true,
        booking: {
          id: reservation.id,
          name: reservation.guest_name,
          email: reservation.email,
          phone: reservation.phone,
          date: reservation.reservation_date,
          time: reservation.reservation_time.slice(0, 5),
          guests: reservation.guests,
          tableNumber: reservation.table_number,
          smsConsent: reservation.sms_consent,
        },
        notifications: [],
        notificationWarning: 'Cancellation was saved on this computer. No email or SMS notification was sent.',
      });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc<
      'cancel_reservation',
      { p_reservation_id: string }
    >('cancel_reservation', { p_reservation_id: id });
    if (error) {
      if (error.code === 'P0002') {
        return NextResponse.json({ error: 'Reservation was not found or is already cancelled.' }, { status: 404 });
      }
      throw new Error(`Could not cancel reservation: ${error.message}`);
    }
    if (!isCancellationResult(data)) {
      throw new Error('Cancellation did not return the reservation details.');
    }

    const notificationRows = data.notifications
      .map(toNotificationRow)
      .filter((row) => row !== null);
    const notifications = await Promise.all(notificationRows.map(async (notification) => {
      if (notification.status === 'skipped') {
        return {
          id: notification.id,
          channel: notification.channel,
          status: 'skipped' as const,
          message: notification.last_error ?? 'Guest did not opt in to SMS notifications.',
        };
      }
      try {
        return await deliverNotification(notification.id);
      } catch (deliveryError) {
        return {
          id: notification.id,
          channel: notification.channel,
          status: 'failed' as const,
          message: deliveryError instanceof Error
            ? deliveryError.message
            : 'Could not process the notification; it remains recorded for retry.',
        };
      }
    }));

    const reservation = data.reservation;
    return NextResponse.json({
      cancelled: true,
      booking: {
        id: reservation.id,
        name: reservation.guest_name,
        email: reservation.email,
        phone: reservation.phone,
        date: reservation.reservation_date,
        time: reservation.reservation_time.slice(0, 5),
        guests: reservation.guests,
        tableNumber: reservation.table_number,
        smsConsent: reservation.sms_consent,
      },
      notifications,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not cancel reservation.' },
      { status: 503 },
    );
  }
}
