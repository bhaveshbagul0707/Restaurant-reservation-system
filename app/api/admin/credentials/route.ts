import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_DURATION_SECONDS,
  changeAdminCredentials,
  createAdminToken,
  getAdminCredentials,
  getSessionSecret,
  isAdminTokenValid,
  verifyAdminPassword,
} from '@/lib/admin-auth';

export async function PUT(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid account update request.' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid account update request.' }, { status: 400 });
  }

  const values = body as Record<string, unknown>;
  if (
    typeof values.currentPassword !== 'string' ||
    typeof values.username !== 'string' ||
    typeof values.newPassword !== 'string'
  ) {
    return NextResponse.json({ error: 'Complete all account fields.' }, { status: 400 });
  }

  try {
    const credentials = await getAdminCredentials();
    const sessionSecret = getSessionSecret();
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!isAdminTokenValid(token, sessionSecret, credentials.sessionVersion)) {
      return NextResponse.json({ error: 'Please sign in again before changing account details.' }, { status: 401 });
    }

    if (!(await verifyAdminPassword(values.currentPassword, credentials))) {
      return NextResponse.json({ error: 'Your current password is incorrect.' }, { status: 401 });
    }

    const updated = await changeAdminCredentials(values.username, values.newPassword);
    const response = NextResponse.json({
      updated: true,
      username: updated.username,
    });
    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      createAdminToken(sessionSecret, updated.sessionVersion),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: ADMIN_SESSION_DURATION_SECONDS,
      },
    );
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not update admin credentials.' },
      { status: 400 },
    );
  }
}
