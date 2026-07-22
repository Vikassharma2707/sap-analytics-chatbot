import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, verifyXsuaaToken } from '@/lib/btp';

function appUrl(req: NextRequest) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const proto = req.headers.get('x-forwarded-proto') || req.headers.get('x-forwarded-ssl') === 'on' ? 'https' : 'http';
  const host  = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const code  = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');

  if (error) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, req.url));
  if (!code) return NextResponse.redirect(new URL('/login?error=missing_code', req.url));

  try {
    const redirectUri = `${appUrl(req)}/api/auth/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // Decode user info for the non-httpOnly display cookie
    let displayUser = { name: 'SAP User', email: '', sub: '' };
    try {
      const user = await verifyXsuaaToken(tokens.access_token);
      displayUser = {
        name: [user.given_name, user.family_name].filter(Boolean).join(' ') || user.user_name || user.email || 'SAP User',
        email: user.email ?? '',
        sub: user.sub,
      };
    } catch { /* use defaults */ }

    const res = NextResponse.redirect(new URL('/', req.url));

    res.cookies.set('btp_access_token', tokens.access_token, {
      httpOnly: true, secure: true, sameSite: 'lax', path: '/',
      maxAge: tokens.expires_in || 3600,
    });

    if (tokens.refresh_token) {
      res.cookies.set('btp_refresh_token', tokens.refresh_token, {
        httpOnly: true, secure: true, sameSite: 'lax', path: '/',
        maxAge: 7 * 24 * 3600,
      });
    }

    // Readable cookie for UI (name/email only — no token)
    res.cookies.set('btp_user', JSON.stringify(displayUser), {
      httpOnly: false, secure: true, sameSite: 'lax', path: '/',
      maxAge: tokens.expires_in || 3600,
    });

    return res;
  } catch (err) {
    console.error('[auth/callback]', err);
    return NextResponse.redirect(new URL('/login?error=token_exchange_failed', req.url));
  }
}
