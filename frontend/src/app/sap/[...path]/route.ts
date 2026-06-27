import { NextRequest, NextResponse } from 'next/server';

/**
 * Catch-all for /sap/* requests made by SAP WebGUI JavaScript.
 * SAP's JS hardcodes absolute paths like /sap/bc/... so they bypass the
 * /api/sap/webgui proxy prefix. This route intercepts them and forwards
 * to the SAP system with Basic Auth from the session cookie.
 */

interface SapCreds {
  host: string;
  port: string;
  protocol: string;
  username: string;
  password: string;
  client: string;
}

function getCredentials(req: NextRequest): SapCreds | null {
  const cookie = req.cookies.get('sap_proxy_creds')?.value;
  if (!cookie) return null;
  try {
    return JSON.parse(Buffer.from(cookie, 'base64').toString());
  } catch {
    return null;
  }
}

function rewriteHtml(html: string, sapBase: string): string {
  const esc = sapBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(new RegExp(esc, 'g'), '');
}

async function proxyRequest(req: NextRequest, pathParts: string[], method: string): Promise<NextResponse> {
  const creds = getCredentials(req);
  if (!creds?.host) {
    return new NextResponse('No SAP session — open WebGUI from the sidebar', { status: 401 });
  }

  const { host, port, protocol, username, password, client } = creds;
  const sapBase   = `${protocol}://${host}:${port}`;
  const sapPath   = '/' + pathParts.join('/');
  const search    = req.nextUrl.search;
  const targetUrl = `${sapBase}${sapPath}${search}`;

  const forwardHeaders: Record<string, string> = {
    Authorization:    'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
    'sap-client':     client,
    'User-Agent':     req.headers.get('user-agent') || 'Mozilla/5.0',
    Accept:           req.headers.get('accept')     || '*/*',
    'Accept-Language':'en-US,en;q=0.9',
  };

  const allCookies = req.headers.get('cookie') || '';
  const sapCookies = allCookies.split(';').filter((c) => !c.trim().startsWith('sap_proxy_creds')).join(';').trim();
  if (sapCookies) forwardHeaders['Cookie'] = sapCookies;

  const referer = req.headers.get('referer') || '';
  if (referer) forwardHeaders['Referer'] = referer.replace(/https?:\/\/localhost:\d+/, sapBase);

  const ct = req.headers.get('content-type');
  if (ct) forwardHeaders['content-type'] = ct;

  const fetchOpts: RequestInit = {
    method,
    headers: forwardHeaders,
    redirect: 'manual',
    signal: AbortSignal.timeout(20000),
    ...(method === 'POST' ? { body: await req.text() } : {}),
  };

  try {
    const sapRes = await fetch(targetUrl, fetchOpts);
    const contentType = sapRes.headers.get('content-type') || '';
    const resBody = await sapRes.arrayBuffer();

    const outHeaders = new Headers();
    outHeaders.set('content-type', contentType || 'application/octet-stream');
    outHeaders.set('x-frame-options', 'SAMEORIGIN');
    sapRes.headers.forEach((v, k) => {
      if (k.toLowerCase() === 'set-cookie') outHeaders.append('set-cookie', v);
      if (k.toLowerCase() === 'cache-control') outHeaders.set('cache-control', v);
    });

    // Rewrite redirects — keep them on the same origin
    if ([301, 302, 303, 307, 308].includes(sapRes.status)) {
      const loc = sapRes.headers.get('location') || '';
      // If redirect is back into /sap/... it stays on our app (same route handles it)
      const newLoc = loc.startsWith('http') ? loc.replace(sapBase, '') : loc;
      outHeaders.set('location', newLoc);
      return new NextResponse(null, { status: sapRes.status, headers: outHeaders });
    }

    if (contentType.includes('text/html')) {
      const html = rewriteHtml(new TextDecoder('utf-8').decode(resBody), sapBase);
      return new NextResponse(html, { status: sapRes.status, headers: outHeaders });
    }

    return new NextResponse(resBody, { status: sapRes.status, headers: outHeaders });
  } catch (err) {
    return new NextResponse(`Proxy error: ${err}`, { status: 502 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, (await params).path, 'GET');
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, (await params).path, 'POST');
}
