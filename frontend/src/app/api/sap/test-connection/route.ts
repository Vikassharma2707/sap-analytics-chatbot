import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { host, port, client, username, password, ssl_verify, protocol = 'http' } = body;

  if (!host || !port || !username) {
    return NextResponse.json({ connected: false, message: 'host, port, and username are required' }, { status: 400 });
  }

  const baseUrl = `${protocol}://${host}:${port}`;

  // Try SAP public ping first (no auth required)
  const pingUrl = `${baseUrl}/sap/public/ping?sap-client=${client}`;
  const catalogUrl = `${baseUrl}/sap/opu/odata/iwfnd/catalogservice;v=2/ServiceCollection?$top=1&$format=json`;

  const headers: Record<string, string> = {
    'sap-client': String(client),
    Accept: 'application/json',
  };

  if (username && password) {
    headers['Authorization'] = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  }

  const fetchOpts: RequestInit = {
    method: 'GET',
    headers,
    // @ts-expect-error — Node 18+ fetch supports this
    rejectUnauthorized: ssl_verify ?? false,
    signal: AbortSignal.timeout(10000),
  };

  // 1. Try authenticated catalog endpoint
  try {
    const res = await fetch(catalogUrl, fetchOpts);
    if (res.status === 200) {
      return NextResponse.json({
        connected: true,
        message: 'Connection successful — SAP Gateway catalog reachable',
        system: { host, port, client, sid: extractSid(res) },
      });
    }
    if (res.status === 401) {
      return NextResponse.json({
        connected: false,
        message: 'Authentication failed — check username / password',
        system: { host, port, client },
      });
    }
  } catch {
    // fall through to ping
  }

  // 2. Fallback: public ping (no auth)
  try {
    const pingRes = await fetch(pingUrl, { signal: AbortSignal.timeout(8000) });
    const text = await pingRes.text();
    if (pingRes.ok && text.toLowerCase().includes('server reached')) {
      return NextResponse.json({
        connected: true,
        message: 'SAP server reachable (public ping OK) — check credentials for full access',
        system: { host, port, client, sid: 'S4H' },
      });
    }
  } catch {
    // fall through
  }

  return NextResponse.json({
    connected: false,
    message: `Cannot reach ${baseUrl} — check host, port, and network`,
  });
}

function extractSid(res: Response): string {
  const server = res.headers.get('server') ?? '';
  if (server.includes('SAP')) return server.split('/').pop()?.slice(0, 3).toUpperCase() ?? 'S4H';
  return 'S4H';
}
