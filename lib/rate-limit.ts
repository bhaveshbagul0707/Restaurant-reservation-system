import { createHmac } from 'node:crypto';
import { NextRequest } from 'next/server';
import { getSessionSecret } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';
import { consumeLocalDemoRateLimit, isLocalDemoMode } from '@/lib/local-demo-store';

export async function enforceRateLimit(
  request: NextRequest,
  action: 'login' | 'booking' | 'availability',
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const clientIp =
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.nextUrl.hostname;
  const clientHash = createHmac('sha256', getSessionSecret()).update(clientIp).digest('hex');
  const rateKey = `${action}:${clientHash}`;
  const limits = {
    login: { count: 5, windowSeconds: 15 * 60 },
    booking: { count: 12, windowSeconds: 10 * 60 },
    availability: { count: 90, windowSeconds: 60 },
  }[action];

  if (isLocalDemoMode()) {
    return {
      allowed: await consumeLocalDemoRateLimit(rateKey, limits.count, limits.windowSeconds),
      retryAfterSeconds: limits.windowSeconds,
    };
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc('consume_api_rate_limit', {
    p_rate_key: rateKey,
    p_limit: limits.count,
    p_window_seconds: limits.windowSeconds,
  });
  if (error) throw new Error(`Could not apply request rate limit: ${error.message}`);
  return {
    allowed: data,
    retryAfterSeconds: limits.windowSeconds,
  };
}
