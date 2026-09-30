import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { hasAdminSession } from '@/lib/admin-session';
import { deliverNotification } from '@/lib/reservation-notifications';
import { getSupabaseAdmin } from '@/lib/supabase';

const requestSchema = z.object({
  notificationId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    if (!(await hasAdminSession(request))) {
      return NextResponse.json({ error: 'Please sign in to retry notifications.' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid notification retry request.' }, { status: 400 });
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid notification ID.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('reservation_notifications')
      .update({ status: 'pending', last_error: null, updated_at: new Date().toISOString() })
      .eq('id', parsed.data.notificationId)
      .in('status', ['pending', 'failed', 'not_configured'])
      .select('id')
      .maybeSingle();
    if (error) throw new Error(`Could not queue notification retry: ${error.message}`);
    if (!data) {
      return NextResponse.json({ error: 'This notification is not eligible for retry.' }, { status: 409 });
    }

    return NextResponse.json({ notification: await deliverNotification(data.id) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not retry notification.' },
      { status: 503 },
    );
  }
}
