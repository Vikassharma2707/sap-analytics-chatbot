import { NextRequest, NextResponse } from 'next/server';

interface SapCreds {
  host: string;
  port: string;
  protocol: string;
  username: string;
  password: string;
  client: string;
}

function getCredentials(req: NextRequest): SapCreds | null {
  // 1. Try session cookie (set by /api/sap/webgui-init)
  const cookie = req.cookies.get('sap_proxy_creds')?.value;
  if (cookie) {
    try {
      return JSON.parse(Buffer.from(cookie, 'base64').toString());
    } catch { /* fall through */ }
  }
  // 2. Fallback to query params (first load only)
  const q = req.nextUrl.searchParams;
  const host = q.get('_host');
  if (host) {
    return {
      host,
      port:     q.get('_port')  || '8000',
      protocol: q.get('_proto') || 'http',
      username: q.get('_user')  || '',
      password: q.get('_pass')  || '',
      client:   q.get('sap-client') || '100',
    };
  }
  return null;
}

function rewriteHtml(html: string, sapBase: string): string {
  const esc = sapBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html
    .replace(new RegExp(esc, 'g'), '/api/sap/webgui')
    .replace(/(<(?:a|link)[^>]+href=")\/sap\//gi,        '$1/api/sap/webgui/sap/')
    .replace(/(<form[^>]+action=")\/sap\//gi,            '$1/api/sap/webgui/sap/')
    .replace(/(<(?:img|script|iframe)[^>]+src=")\/sap\//gi, '$1/api/sap/webgui/sap/');
}

async function proxyRequest(req: NextRequest, pathParts: string[], method: string): Promise<NextResponse> {
  const creds = getCredentials(req);

  if (!creds || !creds.host) {
    return new NextResponse(`<html><body style="font-family:sans-serif;padding:40px;background:#071224;color:#f87171">
      <h2>⚠️ No SAP credentials found</h2>
      <p>Close this panel and reopen WebGUI from the sidebar — credentials are loaded on open.</p>
    </body></html>`, { status: 401, headers: { 'content-type': 'text/html' } });
  }

  const { host, port, protocol, username, password, client } = creds;

  // Strip internal credential params before forwarding
  const forwardParams = new URLSearchParams(req.nextUrl.search);
  ['_host', '_port', '_proto', '_user', '_pass'].forEach((k) => forwardParams.delete(k));
  const search    = forwardParams.toString() ? '?' + forwardParams.toString() : '';
  const sapPath   = '/' + pathParts.join('/');
  const targetUrl = `${protocol}://${host}:${port}${sapPath}${search}`;
  const sapBase   = `${protocol}://${host}:${port}`;

  const forwardHeaders: Record<string, string> = {
    Authorization:    'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
    'sap-client':     client,
    'User-Agent':     req.headers.get('user-agent') || 'Mozilla/5.0',
    Accept:           req.headers.get('accept')     || 'text/html,*/*',
    'Accept-Language':'en-US,en;q=0.9',
  };

  // Forward SAP session cookies (not our internal proxy cookie)
  const allCookies = req.headers.get('cookie') || '';
  const sapCookies = allCookies
    .split(';')
    .filter((c) => !c.trim().startsWith('sap_proxy_creds'))
    .join(';')
    .trim();
  if (sapCookies) forwardHeaders['Cookie'] = sapCookies;

  const referer = req.headers.get('referer') || '';
  if (referer) forwardHeaders['Referer'] = referer.replace(/https?:\/\/localhost:\d+\/api\/sap\/webgui/, sapBase);

  if (req.headers.get('x-requested-with')) forwardHeaders['X-Requested-With'] = req.headers.get('x-requested-with')!;

  const fetchOpts: RequestInit = {
    method,
    headers: forwardHeaders,
    redirect: 'manual',
    signal: AbortSignal.timeout(20000),
  };

  if (method === 'POST') {
    const ct = req.headers.get('content-type') || 'application/x-www-form-urlencoded';
    forwardHeaders['content-type'] = ct;
    fetchOpts.body = await req.text();
  }

  try {
    const sapRes = await fetch(targetUrl, fetchOpts);
    const contentType = sapRes.headers.get('content-type') || '';
    const resBody     = await sapRes.arrayBuffer();

    const outHeaders = new Headers();
    outHeaders.set('content-type', contentType || 'text/html; charset=utf-8');
    outHeaders.set('x-frame-options', 'SAMEORIGIN');
    // Forward SAP Set-Cookie headers so session is maintained
    sapRes.headers.forEach((v, k) => {
      if (k.toLowerCase() === 'set-cookie') outHeaders.append('set-cookie', v);
    });

    // Rewrite redirects
    if ([301, 302, 303, 307, 308].includes(sapRes.status)) {
      const loc = sapRes.headers.get('location') || '';
      const proxyLoc = loc.startsWith('http')
        ? loc.replace(sapBase, '/api/sap/webgui')
        : '/api/sap/webgui' + loc;
      outHeaders.set('location', proxyLoc);
      return new NextResponse(null, { status: sapRes.status, headers: outHeaders });
    }

    if (contentType.includes('text/html')) {
      const html = rewriteHtml(new TextDecoder('utf-8').decode(resBody), sapBase);
      return new NextResponse(html, { status: sapRes.status, headers: outHeaders });
    }

    return new NextResponse(resBody, { status: sapRes.status, headers: outHeaders });

  } catch (err) {
    const html = `<html><body style="font-family:sans-serif;padding:40px;background:#071224;color:#f87171">
      <h2>⚠️ Proxy Error</h2><p>${String(err)}</p>
      <p>Target: <code style="color:#7a9cc4">${targetUrl}</code></p>
    </body></html>`;
    return new NextResponse(html, { status: 502, headers: { 'content-type': 'text/html' } });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, (await params).path, 'GET');
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, (await params).path, 'POST');
}
