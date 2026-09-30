import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_DURATION_SECONDS,
  createAdminToken,
  getAdminCredentials,
  getSessionSecret,
  verifyAdminPassword,
} from '@/lib/admin-auth';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await enforceRateLimit(request, 'login');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Wait before trying again.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not validate login request.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid login request.' }, { status: 400 });
  }

  const username =
    typeof body === 'object' && body !== null && 'username' in body && typeof body.username === 'string'
      ? body.username.trim().toLowerCase()
      : '';
  const password =
    typeof body === 'object' && body !== null && 'password' in body && typeof body.password === 'string'
      ? body.password
      : '';

  try {
    const credentials = await getAdminCredentials();
    if (
      username !== credentials.username ||
      !(await verifyAdminPassword(password, credentials))
    ) {
      return NextResponse.json({ error: 'Admin ID or password is incorrect.' }, { status: 401 });
    }

    const response = NextResponse.json({ authenticated: true, username: credentials.username });
    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      createAdminToken(getSessionSecret(), credentials.sessionVersion),
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
      { error: error instanceof Error ? error.message : 'Admin login could not be initialized.' },
      { status: 503 },
    );
  }
}
