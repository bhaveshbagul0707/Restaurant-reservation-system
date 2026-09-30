import { NextRequest, NextResponse } from 'next/server';
import { hasAdminSession } from '@/lib/admin-session';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isLocalDemoMode } from '@/lib/local-demo-store';

export async function GET(request: NextRequest) {
  try {
    if (!(await hasAdminSession(request))) {
      return NextResponse.json({ error: 'Please sign in to view delivery issues.' }, { status: 401 });
    }

    if (isLocalDemoMode()) {
      return NextResponse.json({ notifications: [] });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('reservation_notifications')
      .select('id, reservation_id, channel, event_type, status, attempts, last_error, created_at, updated_at')
      .in('status', ['pending', 'sending', 'failed', 'not_configured'])
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw new Error(`Could not load notification delivery status: ${error.message}`);

    return NextResponse.json({
      notifications: data.map((notification) => ({
        ...notification,
        message: notification.last_error ?? `Delivery is ${notification.status}.`,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load notification status.' },
      { status: 503 },
    );
  }
}
