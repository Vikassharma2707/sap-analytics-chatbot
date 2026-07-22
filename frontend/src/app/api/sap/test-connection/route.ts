import { NextRequest, NextResponse } from 'next/server';
import { isOnBTP, fetchViaSapDestination } from '@/lib/btp';

export async function POST(req: NextRequest) {
  const body = await req.json();

  // ── BTP / Cloud Connector mode ────────────────────────────────────────────
  if (isOnBTP() || body.connectionMode === 'destination') {
    const { destinationName = 'S4HANA_SYSTEM', client } = body;
    try {
      const path = `/sap/public/ping${client ? `?sap-client=${client}` : ''}`;
      const res  = await fetchViaSapDestination(destinationName, path, { method: 'GET', signal: AbortSignal.timeout(10_000) });
      const text = await res.text();

      if (res.ok && text.toLowerCase().includes('server reached')) {
        return NextResponse.json({ connected: true, message: `Connected via BTP destination '${destinationName}'`, system: { sid: 'S4H', client } });
      }
      // Try catalog
      const cat = await fetchViaSapDestination(destinationName,
        `/sap/opu/odata/iwfnd/catalogservice;v=2/ServiceCollection?$top=1&$format=json`,
        { method: 'GET', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });

      if (cat.status === 200) {
        return NextResponse.json({ connected: true, message: `Connected via BTP destination '${destinationName}' (catalog OK)`, system: { sid: 'S4H', client } });
      }
      if (cat.status === 401) {
        return NextResponse.json({ connected: false, message: 'Destination reachable but authentication failed — check destination credentials in BTP cockpit' });
      }
      return NextResponse.json({ connected: false, message: `Destination responded with HTTP ${cat.status}` });
    } catch (err) {
      return NextResponse.json({ connected: false, message: `Destination error: ${err instanceof Error ? err.message : err}` });
    }
  }

  // ── Direct mode (local dev / non-BTP) ────────────────────────────────────
  const { host, port, client, username, password, ssl_verify, protocol = 'http' } = body;
  if (!host || !port || !username) {
    return NextResponse.json({ connected: false, message: 'host, port, and username are required' }, { status: 400 });
  }

  const baseUrl    = `${protocol}://${host}:${port}`;
  const pingUrl    = `${baseUrl}/sap/public/ping?sap-client=${client}`;
  const catalogUrl = `${baseUrl}/sap/opu/odata/iwfnd/catalogservice;v=2/ServiceCollection?$top=1&$format=json`;

  const headers: Record<string, string> = { 'sap-client': String(client), Accept: 'application/json' };
  if (username && password) headers['Authorization'] = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');

  const opts: RequestInit = { method: 'GET', headers, signal: AbortSignal.timeout(10_000) };

  try {
    const res = await fetch(catalogUrl, opts);
    if (res.status === 200) return NextResponse.json({ connected: true, message: 'SAP Gateway catalog reachable', system: { host, port, client, sid: extractSid(res) } });
    if (res.status === 401) return NextResponse.json({ connected: false, message: 'Authentication failed — check username / password', system: { host, port, client } });
  } catch { /* fallthrough */ }

  try {
    const ping = await fetch(pingUrl, { signal: AbortSignal.timeout(8_000) });
    const text = await ping.text();
    if (ping.ok && text.toLowerCase().includes('server reached')) {
      return NextResponse.json({ connected: true, message: 'SAP server reachable (public ping OK)', system: { host, port, client, sid: 'S4H' } });
    }
  } catch { /* fallthrough */ }

  return NextResponse.json({ connected: false, message: `Cannot reach ${baseUrl} — check host, port, and network` });
}

function extractSid(res: Response): string {
  const s = res.headers.get('server') ?? '';
  return s.includes('SAP') ? (s.split('/').pop()?.slice(0, 3).toUpperCase() ?? 'S4H') : 'S4H';
}
