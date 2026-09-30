import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase';
import { enforceRateLimit } from '@/lib/rate-limit';
import { getLocalDemoAvailability, isLocalDemoMode } from '@/lib/local-demo-store';

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^(?:1[1-9]|20|21):(00|30)$/),
  guests: z.coerce.number().int().min(1).max(6),
});

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(request, 'availability');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many availability checks. Please wait before trying again.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not validate availability request.' },
      { status: 503 },
    );
  }

  const parsed = querySchema.safeParse({
    date: request.nextUrl.searchParams.get('date'),
    time: request.nextUrl.searchParams.get('time'),
    guests: request.nextUrl.searchParams.get('guests'),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Choose a valid date, time, and party size.' }, { status: 400 });
  }

  try {
    if (isLocalDemoMode()) {
      return NextResponse.json({
        tables: await getLocalDemoAvailability(parsed.data.date, parsed.data.time),
      });
    }

    const supabase = getSupabaseAdmin();
    const [tableResult, bookingResult] = await Promise.all([
      supabase
        .from('restaurant_tables')
        .select('table_number, capacity')
        .eq('active', true)
        .order('table_number'),
      supabase
        .from('reservations')
        .select('table_number')
        .eq('reservation_date', parsed.data.date)
        .eq('reservation_time', `${parsed.data.time}:00`)
        .eq('status', 'confirmed'),
    ]);

    if (tableResult.error) throw new Error(`Could not read restaurant tables: ${tableResult.error.message}`);
    if (bookingResult.error) throw new Error(`Could not check reservation availability: ${bookingResult.error.message}`);

    const bookedTables = new Set(bookingResult.data.map((booking) => booking.table_number));
    return NextResponse.json({
      tables: tableResult.data.map((table) => ({
        number: table.table_number,
        capacity: table.capacity,
        booked: bookedTables.has(table.table_number),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load table availability.' },
      { status: 503 },
    );
  }
}
