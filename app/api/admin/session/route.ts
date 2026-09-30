import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  getAdminCredentials,
  getSessionSecret,
  isAdminTokenValid,
} from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const credentials = await getAdminCredentials();
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const authenticated = isAdminTokenValid(
      token,
      getSessionSecret(),
      credentials.sessionVersion,
    );
    return NextResponse.json(
      {
        authenticated,
        ...(authenticated ? { username: credentials.username } : {}),
      },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Admin login is not configured.' },
      { status: 503 },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
