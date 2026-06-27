import { NextRequest, NextResponse } from 'next/server';

/**
 * Called once when the WebGUI panel opens.
 * Stores SAP credentials in a session cookie so the proxy can read them
 * on all subsequent iframe requests (which don't carry query params).
 */
export async function POST(req: NextRequest) {
  const { host, port, protocol, username, password, client } = await req.json();

  const creds = JSON.stringify({ host, port, protocol, username, password, client });
  const encoded = Buffer.from(creds).toString('base64');

  const res = NextResponse.json({ ok: true });
  res.cookies.set('sap_proxy_creds', encoded, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  });
  return res;
}
