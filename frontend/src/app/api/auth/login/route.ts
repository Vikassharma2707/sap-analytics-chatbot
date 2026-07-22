import { NextRequest, NextResponse } from 'next/server';
import { getXsuaaCreds } from '@/lib/btp';

function appUrl(req: NextRequest) {
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host  = req.headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const xsuaa = getXsuaaCreds();

  if (!xsuaa) {
    // Local dev — skip XSUAA, set a mock session cookie and redirect home
    const res = NextResponse.redirect(new URL('/', req.url));
    res.cookies.set('btp_access_token', 'dev-mock-token', {
      httpOnly: true, sameSite: 'lax', path: '/', maxAge: 3600,
    });
    res.cookies.set('btp_user', JSON.stringify({ name: 'Dev User', email: 'dev@local', sub: 'dev' }), {
      httpOnly: false, sameSite: 'lax', path: '/', maxAge: 3600,
    });
    return res;
  }

  const redirectUri = `${appUrl(req)}/api/auth/callback`;
  const authUrl = new URL(`${xsuaa.url}/oauth/authorize`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', xsuaa.clientid);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'openid');

  return NextResponse.redirect(authUrl.toString());
}
