import { NextRequest, NextResponse } from 'next/server';

/**
 * Intercepts ALL /sap/* requests (including SAP session URLs like /sap(base64...)/bc/...)
 * before Next.js routing sees them. Next.js App Router treats parentheses as route groups
 * and can't match those URLs — middleware runs first and handles them correctly.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only intercept /sap/... and /sap(...)... paths
  if (!pathname.startsWith('/sap')) return NextResponse.next();

  // Skip if this is our own API route
  if (pathname.startsWith('/api/')) return NextResponse.next();

  // Read credentials from session cookie
  const cookie = req.cookies.get('sap_proxy_creds')?.value;
  if (!cookie) {
    return new NextResponse('No SAP session — open WebGUI from the sidebar', {
      status: 401,
      headers: { 'content-type': 'text/plain' },
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

  const forwardHeaders: Record<string, string> = {
    Authorization:    'Basic ' + btoa(`${username}:${password}`),
    'sap-client':     client,
    'User-Agent':     req.headers.get('user-agent') || 'Mozilla/5.0',
    Accept:           req.headers.get('accept')     || '*/*',
    'Accept-Language':'en-US,en;q=0.9',
  };

  // Forward SAP session cookies (exclude our proxy cookie)
  const allCookies = req.headers.get('cookie') || '';
  const sapCookies = allCookies
    .split(';')
    .filter((c) => !c.trim().startsWith('sap_proxy_creds'))
    .join(';')
    .trim();
  if (sapCookies) forwardHeaders['Cookie'] = sapCookies;

  const referer = req.headers.get('referer') || '';
  if (referer) forwardHeaders['Referer'] = referer.replace(/https?:\/\/localhost:\d+/, sapBase);

  const ct = req.headers.get('content-type');
  if (ct) forwardHeaders['content-type'] = ct;

  const method = req.method;

  try {
    const fetchOpts: RequestInit = {
      method,
      headers: forwardHeaders,
      redirect: 'manual',
    };

    if (method !== 'GET' && method !== 'HEAD') {
      fetchOpts.body = await req.text();
    }

    const sapRes = await fetch(targetUrl, fetchOpts);
    const contentType = sapRes.headers.get('content-type') || '';
    const body = await sapRes.arrayBuffer();

    const outHeaders = new Headers();
    outHeaders.set('content-type', contentType || 'application/octet-stream');
    outHeaders.set('x-frame-options', 'SAMEORIGIN');

    // Forward SAP Set-Cookie headers to maintain the SAP session
    sapRes.headers.forEach((v, k) => {
      if (k.toLowerCase() === 'set-cookie') outHeaders.append('set-cookie', v);
    });

    // Rewrite redirects to stay on our origin
    if ([301, 302, 303, 307, 308].includes(sapRes.status)) {
      const loc = sapRes.headers.get('location') || '';
      const newLoc = loc.startsWith('http') ? loc.replace(sapBase, '') : loc;
      outHeaders.set('location', newLoc);
      return new NextResponse(null, { status: sapRes.status, headers: outHeaders });
    }

    return new NextResponse(body, { status: sapRes.status, headers: outHeaders });

  } catch (err) {
    return new NextResponse(`WebGUI proxy error: ${err}`, {
      status: 502,
      headers: { 'content-type': 'text/plain' },
    });
  }
}

export const config = {
  // Regex matches /sap/... AND /sap(...)... (SAP session-encoded URLs with parentheses)
  matcher: ['/(sap.*)'],
};
