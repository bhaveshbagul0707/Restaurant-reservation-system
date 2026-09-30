import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { deliverNotification } from '@/lib/reservation-notifications';
import { getSupabaseAdmin } from '@/lib/supabase';

export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const suppliedBytes = Buffer.from(supplied);
  const secretBytes = Buffer.from(secret);
  return suppliedBytes.length === secretBytes.length && timingSafeEqual(suppliedBytes, secretBytes);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: candidates, error } = await supabase
      .from('reservation_notifications')
      .select('id, status, attempts, updated_at')
      .in('status', ['pending', 'failed', 'sending', 'not_configured'])
      .lt('attempts', 5)
      .order('created_at')
      .limit(50);
    if (error) throw new Error(`Could not load notification queue: ${error.message}`);

    const now = Date.now();
    const eligible = candidates.filter((notification) => {
      const age = now - Date.parse(notification.updated_at);
      if (notification.status === 'pending') return true;
      if (notification.status === 'sending') return age >= 15 * 60 * 1000;
      const retryDelay = Math.min(60, 2 ** Math.max(notification.attempts, 1)) * 60 * 1000;
      return age >= retryDelay;
    });

    const outcomes = await Promise.all(eligible.map(async (notification) => {
      if (
        notification.status === 'failed' ||
        notification.status === 'not_configured' ||
        notification.status === 'sending'
      ) {
        const { data: reset, error: resetError } = await supabase
          .from('reservation_notifications')
          .update({ status: 'pending', last_error: null, updated_at: new Date().toISOString() })
          .eq('id', notification.id)
          .eq('status', notification.status)
          .select('id')
          .maybeSingle();
        if (resetError) throw new Error(`Could not retry queued notification: ${resetError.message}`);
        if (!reset) return { id: notification.id, status: 'sending' };
      }
      try {
        const result = await deliverNotification(notification.id);
        return { id: result.id, status: result.status };
      } catch (deliveryError) {
        console.error(`Notification delivery failed for ${notification.id}.`, deliveryError);
        return { id: notification.id, status: 'failed' };
      }
    }));

    return NextResponse.json({
      processed: outcomes.length,
      outcomes,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not process notification queue.' },
      { status: 503 },
    );
  }
}
