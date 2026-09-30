import { NextRequest, NextResponse } from 'next/server';
import { hasAdminSession } from '@/lib/admin-session';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ReservationRow } from '@/lib/database.types';
import { isLocalDemoMode, listLocalDemoReservations } from '@/lib/local-demo-store';

export async function GET(request: NextRequest) {
  try {
    if (!(await hasAdminSession(request))) {
      return NextResponse.json({ error: 'Please sign in to view reservations.' }, { status: 401 });
    }
    if (isLocalDemoMode()) {
      const bookings = (await listLocalDemoReservations()).map((row) => ({
        id: row.id,
        name: row.guest_name,
        email: row.email,
        phone: row.phone,
        date: row.reservation_date,
        time: row.reservation_time.slice(0, 5),
        guests: row.guests,
        tableNumber: row.table_number,
        smsConsent: row.sms_consent,
      }));
      return NextResponse.json({ bookings });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('status', 'confirmed')
      .order('reservation_date')
      .order('reservation_time');
    if (error) throw new Error(`Could not load reservations: ${error.message}`);

    return NextResponse.json({
      bookings: data.map((row: ReservationRow) => ({
        id: row.id,
        name: row.guest_name,
        email: row.email,
        phone: row.phone,
        date: row.reservation_date,
        time: row.reservation_time.slice(0, 5),
        guests: row.guests,
        tableNumber: row.table_number,
        smsConsent: row.sms_consent,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load reservations.' },
      { status: 503 },
    );
  }
}
