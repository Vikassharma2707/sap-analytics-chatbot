import { NextRequest, NextResponse } from 'next/server';

// ── Auth guard ────────────────────────────────────────────────────────────────
// When BTP_AUTH_REQUIRED=true (set in manifest.yml env:), every page request
// that lacks a btp_access_token cookie is redirected to /login.
// Full JWT validation happens inside API routes via @/lib/btp — not here.

const AUTH_REQUIRED = process.env.BTP_AUTH_REQUIRED === 'true';
const PUBLIC_PREFIXES = ['/login', '/api/auth/'];

function isPublic(p: string) {
  return PUBLIC_PREFIXES.some((prefix) => p.startsWith(prefix));
}

// ── SAP WebGUI proxy ──────────────────────────────────────────────────────────

async function sapProxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/api/')) return NextResponse.next();

  const cookie = req.cookies.get('sap_proxy_creds')?.value;
  if (!cookie) {
    return new NextResponse('No SAP session — open WebGUI from the sidebar', {
      status: 401, headers: { 'content-type': 'text/plain' },
    });
  }

  let creds: { host: string; port: string; protocol: string; username: string; password: string; client: string };
  try {
    creds = JSON.parse(Buffer.from(cookie, 'base64').toString());
  } catch {
    return new NextResponse('Invalid SAP session cookie', { status: 401 });
  }

  const { host, port, protocol, username, password, client } = creds;
  const sapBase   = `${protocol}://${host}:${port}`;
  const targetUrl = `${sapBase}${pathname}${req.nextUrl.search}`;

  const fwd: Record<string, string> = {
    Authorization:     'Basic ' + btoa(`${username}:${password}`),
    'sap-client':      client,
    'User-Agent':      req.headers.get('user-agent') || 'Mozilla/5.0',
    Accept:            req.headers.get('accept')     || '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  const allCookies = req.headers.get('cookie') || '';
  const sapCookies = allCookies.split(';').filter((c) => !c.trim().startsWith('sap_proxy_creds')).join(';').trim();
  if (sapCookies) fwd['Cookie'] = sapCookies;

  const referer = req.headers.get('referer') || '';
  if (referer) fwd['Referer'] = referer.replace(/https?:\/\/[^/]+/, sapBase);

  const ct = req.headers.get('content-type');
  if (ct) fwd['content-type'] = ct;

  try {
    const opts: RequestInit = { method: req.method, headers: fwd, redirect: 'manual' };
    if (req.method !== 'GET' && req.method !== 'HEAD') opts.body = await req.text();

    const sapRes  = await fetch(targetUrl, opts);
    const cType   = sapRes.headers.get('content-type') || '';
    const body    = await sapRes.arrayBuffer();

    const out = new Headers();
    out.set('content-type', cType || 'application/octet-stream');
    out.set('x-frame-options', 'SAMEORIGIN');
    sapRes.headers.forEach((v, k) => {
      if (k.toLowerCase() === 'set-cookie') out.append('set-cookie', v);
    });

    if ([301, 302, 303, 307, 308].includes(sapRes.status)) {
      const loc = sapRes.headers.get('location') || '';
      out.set('location', loc.startsWith('http') ? loc.replace(sapBase, '') : loc);
      return new NextResponse(null, { status: sapRes.status, headers: out });
    }
    return new NextResponse(body, { status: sapRes.status, headers: out });
  } catch (err) {
    return new NextResponse(`WebGUI proxy error: ${err}`, { status: 502, headers: { 'content-type': 'text/plain' } });
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // SAP proxy intercepts /sap(…) paths before routing
  if (pathname.startsWith('/sap')) return sapProxy(req);

  // XSUAA auth guard — redirect to login if no token cookie
  if (AUTH_REQUIRED && !isPublic(pathname)) {
    const token = req.cookies.get('btp_access_token')?.value;
    if (!token) {
      const url = new URL('/login', req.url);
      if (pathname !== '/') url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/(sap.*)',                                             // SAP proxy (incl. session URLs with parens)
    '/((?!_next/static|_next/image|favicon.ico|coforge-logo.svg).*)', // Auth guard
  ],
};
