import { NextRequest } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  getAdminCredentials,
  getSessionSecret,
  isAdminTokenValid,
} from '@/lib/admin-auth';

export async function hasAdminSession(request: NextRequest): Promise<boolean> {
  const credentials = await getAdminCredentials();
  return isAdminTokenValid(
    request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
    getSessionSecret(),
    credentials.sessionVersion,
  );
}
