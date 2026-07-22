import { NextRequest, NextResponse } from 'next/server';
import { getXsuaaCreds, verifyXsuaaToken } from '@/lib/btp';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('btp_access_token')?.value;

  if (!token) return NextResponse.json({ authenticated: false }, { status: 401 });

  // Dev mock token
  if (token === 'dev-mock-token') {
    return NextResponse.json({ authenticated: true, user: { name: 'Dev User', email: 'dev@local', sub: 'dev', scope: [] } });
  }

  const xsuaa = getXsuaaCreds();
  if (!xsuaa) return NextResponse.json({ authenticated: false, error: 'XSUAA not configured' }, { status: 500 });

  try {
    const user = await verifyXsuaaToken(token);
    return NextResponse.json({
      authenticated: true,
      user: {
        name: [user.given_name, user.family_name].filter(Boolean).join(' ') || user.user_name || user.email || 'SAP User',
        email: user.email,
        sub: user.sub,
        scope: user.scope,
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false, error: 'Token expired or invalid' }, { status: 401 });
  }
}
