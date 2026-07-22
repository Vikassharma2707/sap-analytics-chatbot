import { NextRequest, NextResponse } from 'next/server';
import { getXsuaaCreds } from '@/lib/btp';

export async function GET(req: NextRequest) {
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host  = req.headers.get('host') || 'localhost:3000';
  const appBase = `${proto}://${host}`;

  const res = NextResponse.redirect(new URL('/login', req.url));
  res.cookies.delete('btp_access_token');
  res.cookies.delete('btp_refresh_token');
  res.cookies.delete('btp_user');

  // Also redirect to XSUAA global logout if available
  const xsuaa = getXsuaaCreds();
  if (xsuaa) {
    const logoutUrl = new URL(`${xsuaa.url}/logout`);
    logoutUrl.searchParams.set('redirect', `${appBase}/login`);
    return NextResponse.redirect(logoutUrl.toString(), {
      headers: res.headers,
    });
  }

  return res;
}
