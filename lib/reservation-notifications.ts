import { NotificationRow } from '@/lib/database.types';
import { getSupabaseAdmin } from '@/lib/supabase';

export interface NotificationDelivery {
  id: string;
  channel: 'email' | 'sms';
  eventType: 'booking_confirmed' | 'booking_cancelled';
  status: 'sent' | 'failed' | 'not_configured' | 'skipped' | 'sending';
  message: string;
}

function readPayload(value: unknown): {
  name: string;
  date: string;
  time: string;
  guests: number;
  tableNumber: number;
} | null {
  if (typeof value !== 'object' || value === null) return null;
  const payload = value as Record<string, unknown>;
  if (
    typeof payload.name !== 'string' ||
    typeof payload.date !== 'string' ||
    typeof payload.time !== 'string' ||
    typeof payload.guests !== 'number' ||
    typeof payload.tableNumber !== 'number'
  ) {
    return null;
  }
  return {
    name: payload.name,
    date: payload.date,
    time: payload.time,
    guests: payload.guests,
    tableNumber: payload.tableNumber,
  };
}

function messageText(
  payload: NonNullable<ReturnType<typeof readPayload>>,
  eventType: NotificationRow['event_type'],
): string {
  if (eventType === 'booking_confirmed') {
    return `Hello ${payload.name}, your restaurant reservation for ${payload.guests} guest(s) on ${payload.date} at ${payload.time} at Table #${payload.tableNumber} is confirmed. We look forward to seeing you.`;
  }
  return `Hello ${payload.name}, your restaurant reservation for ${payload.guests} guest(s) on ${payload.date} at ${payload.time} at Table #${payload.tableNumber} has been cancelled by the restaurant. Please contact us if you have questions.`;
}

async function sendEmail(notification: NotificationRow, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return {
      status: 'not_configured' as const,
      message: 'Set RESEND_API_KEY and RESEND_FROM_EMAIL to enable email.',
    };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `reservation-${notification.event_type}-${notification.reservation_id}-email`,
    },
    body: JSON.stringify({
      from,
      to: [notification.recipient],
      subject: notification.event_type === 'booking_cancelled'
        ? 'Your restaurant reservation has been cancelled'
        : 'Your restaurant reservation is confirmed',
      text,
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    return { status: 'failed' as const, message: `Email provider returned HTTP ${response.status}.` };
  }
  const body: unknown = await response.json();
  const providerMessageId =
    typeof body === 'object' && body !== null && 'id' in body && typeof body.id === 'string'
      ? body.id
      : null;
  return {
    status: 'sent' as const,
    message: notification.event_type === 'booking_cancelled'
      ? 'Cancellation email accepted by Resend.'
      : 'Booking confirmation email accepted by Resend.',
    providerMessageId,
  };
}

async function sendSms(notification: NotificationRow, text: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !from) {
    return {
      status: 'not_configured' as const,
      message: 'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER to enable SMS.',
    };
  }
  if (!/^\+[1-9]\d{7,14}$/.test(notification.recipient)) {
    return { status: 'failed' as const, message: 'Guest phone must include its country code in E.164 format.' };
  }

  const body = new URLSearchParams({
    To: notification.recipient,
    From: from,
    Body: text,
  });
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': `reservation-${notification.event_type}-${notification.reservation_id}-sms`,
      },
      body: body.toString(),
      signal: AbortSignal.timeout(12000),
    },
  );
  if (!response.ok) {
    return { status: 'failed' as const, message: `SMS provider returned HTTP ${response.status}.` };
  }
  const responseBody: unknown = await response.json();
  const providerMessageId =
    typeof responseBody === 'object' && responseBody !== null && 'sid' in responseBody &&
    typeof responseBody.sid === 'string'
      ? responseBody.sid
      : null;
  return {
    status: 'sent' as const,
    message: notification.event_type === 'booking_cancelled'
      ? 'Cancellation SMS accepted by Twilio.'
      : 'Booking confirmation SMS accepted by Twilio.',
    providerMessageId,
  };
}

async function dispatch(notification: NotificationRow) {
  const payload = readPayload(notification.payload);
  if (!payload) return { status: 'failed' as const, message: 'Stored notification data is invalid.' };
  const message = messageText(payload, notification.event_type);
  return notification.channel === 'email'
    ? sendEmail(notification, message)
    : sendSms(notification, message);
}

export async function deliverNotification(id: string): Promise<NotificationDelivery> {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: readError } = await supabase
    .from('reservation_notifications')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (readError) throw new Error(`Could not load notification: ${readError.message}`);
  if (!existing) throw new Error('Notification was not found.');
  if (existing.status !== 'pending') {
    return {
      id: existing.id,
      channel: existing.channel,
      eventType: existing.event_type,
      status: existing.status === 'sent' || existing.status === 'skipped' ||
        existing.status === 'not_configured' || existing.status === 'failed'
        ? existing.status
        : 'sending',
      message: existing.last_error ?? `Notification is ${existing.status}.`,
    };
  }

  const { data: claimed, error: claimError } = await supabase
    .from('reservation_notifications')
    .update({
      status: 'sending',
      attempts: existing.attempts + 1,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle();
  if (claimError) throw new Error(`Could not claim notification: ${claimError.message}`);
  if (!claimed) {
    const { data: current } = await supabase
      .from('reservation_notifications')
      .select('status, last_error')
      .eq('id', id)
      .single();
    return {
      id,
      channel: existing.channel,
      eventType: existing.event_type,
      status: current?.status === 'sent' || current?.status === 'skipped' ||
        current?.status === 'failed' || current?.status === 'not_configured'
        ? current.status
        : 'sending',
      message: current?.last_error ?? 'Notification is already being processed.',
    };
  }

  let outcome: Awaited<ReturnType<typeof dispatch>>;
  try {
    outcome = await dispatch(claimed);
  } catch (error) {
    outcome = {
      status: 'failed',
      message: error instanceof Error ? error.message : 'Notification provider could not be reached.',
    };
  }

  const { error: updateError } = await supabase
    .from('reservation_notifications')
    .update({
      status: outcome.status,
      last_error: outcome.status === 'sent' ? null : outcome.message,
      provider_message_id: 'providerMessageId' in outcome ? outcome.providerMessageId : null,
      updated_at: new Date().toISOString(),
      sent_at: outcome.status === 'sent' ? new Date().toISOString() : null,
    })
    .eq('id', id);
  if (updateError) throw new Error(`Could not save notification result: ${updateError.message}`);

  return {
    id,
    channel: claimed.channel,
    eventType: claimed.event_type,
    status: outcome.status,
    message: outcome.message,
  };
}

export function toNotificationRow(value: unknown): NotificationRow | null {
  if (typeof value !== 'object' || value === null) return null;
  const row = value as Partial<NotificationRow>;
  if (
    typeof row.id !== 'string' ||
    typeof row.reservation_id !== 'string' ||
    (row.channel !== 'email' && row.channel !== 'sms') ||
    (row.event_type !== 'booking_confirmed' && row.event_type !== 'booking_cancelled') ||
    typeof row.recipient !== 'string' ||
    typeof row.status !== 'string' ||
    typeof row.attempts !== 'number'
  ) {
    return null;
  }
  return row as NotificationRow;
}
