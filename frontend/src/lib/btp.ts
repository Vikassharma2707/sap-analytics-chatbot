/**
 * BTP service helpers — XSUAA, Destination Service, Connectivity (Cloud Connector).
 * All functions are server-side only (API routes / middleware).
 */

// ── VCAP_SERVICES parsing ─────────────────────────────────────────────────────

function vcap() {
  try { return JSON.parse(process.env.VCAP_SERVICES ?? '{}'); }
  catch { return {}; }
}

export const isOnBTP = () => !!process.env.VCAP_SERVICES;

export interface XsuaaCreds {
  clientid: string;
  clientsecret: string;
  url: string;           // e.g. https://<subdomain>.authentication.sap.hana.ondemand.com
  xsappname: string;
  verificationkey: string; // RS256 public key (PEM)
  identityzone: string;
  tenantid: string;
}

export interface ConnectivityCreds {
  clientid: string;
  clientsecret: string;
  token_service_url: string;
  onpremise_proxy_host: string;
  onpremise_proxy_port: string;
}

export interface DestinationCreds {
  clientid: string;
  clientsecret: string;
  uri: string;   // Destination Service REST API root
  url: string;   // UAA URL for token
}

export interface ResolvedDestination {
  url: string;
  user?: string;
  password?: string;
  authentication: string;
  proxyType: string; // 'OnPremise' | 'Internet'
  client?: string;
  locationId?: string;
}

export function getXsuaaCreds(): XsuaaCreds | null {
  return vcap().xsuaa?.[0]?.credentials ?? null;
}

export function getConnectivityCreds(): ConnectivityCreds | null {
  return vcap().connectivity?.[0]?.credentials ?? null;
}

export function getDestinationCreds(): DestinationCreds | null {
  return vcap().destination?.[0]?.credentials ?? null;
}

// ── Token helpers ─────────────────────────────────────────────────────────────

async function clientCredentialsToken(tokenUrl: string, clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(`${tokenUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
  const d = await res.json() as { access_token: string };
  return d.access_token;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<{
  access_token: string; refresh_token?: string; expires_in: number; id_token?: string;
}> {
  const creds = getXsuaaCreds();
  if (!creds) throw new Error('XSUAA not bound');

  const res = await fetch(`${creds.url}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${creds.clientid}:${creds.clientsecret}`).toString('base64'),
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }).toString(),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// ── JWT verification (jose — RS256) ──────────────────────────────────────────

export interface XsuaaUser {
  sub: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  user_name?: string;
  scope: string[];
  exp: number;
  zid?: string;
}

export async function verifyXsuaaToken(token: string): Promise<XsuaaUser> {
  const creds = getXsuaaCreds();
  if (!creds) throw new Error('XSUAA not configured');

  const { importSPKI, jwtVerify } = await import('jose');

  // XSUAA verificationkey may be missing PEM headers — add if needed
  let pemKey = creds.verificationkey;
  if (!pemKey.includes('-----BEGIN')) {
    pemKey = `-----BEGIN PUBLIC KEY-----\n${pemKey}\n-----END PUBLIC KEY-----`;
  }

  const publicKey = await importSPKI(pemKey, 'RS256');
  const { payload } = await jwtVerify(token, publicKey, { algorithms: ['RS256'] });

  return {
    sub: String(payload.sub ?? ''),
    email: payload.email as string | undefined,
    given_name: payload.given_name as string | undefined,
    family_name: payload.family_name as string | undefined,
    user_name: (payload.user_name ?? payload.preferred_username) as string | undefined,
    scope: Array.isArray(payload.scope) ? payload.scope as string[] : [],
    exp: Number(payload.exp ?? 0),
    zid: payload.zid as string | undefined,
  };
}

// ── Destination Service ───────────────────────────────────────────────────────

export async function getDestination(name: string): Promise<ResolvedDestination> {
  const creds = getDestinationCreds();
  if (!creds) throw new Error('Destination service not bound');

  const token = await clientCredentialsToken(creds.url, creds.clientid, creds.clientsecret);

  const res = await fetch(`${creds.uri}/destination-configuration/v1/destinations/${encodeURIComponent(name)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });

  if (res.status === 404) throw new Error(`Destination '${name}' not found in BTP cockpit`);
  if (!res.ok) throw new Error(`Destination lookup failed: ${res.status}`);

  const data = await res.json() as { destinationConfiguration: Record<string, string> };
  const d = data.destinationConfiguration;

  return {
    url: d.URL,
    user: d.User,
    password: d.Password,
    authentication: d.Authentication || 'BasicAuthentication',
    proxyType: d.ProxyType || 'Internet',
    client: d['sap-client'],
    locationId: d['CloudConnectorLocationId'],
  };
}

// ── Connectivity proxy (Cloud Connector) ─────────────────────────────────────

/**
 * Fetch a URL via the BTP Connectivity proxy (required for OnPremise destinations).
 * Uses undici ProxyAgent so Node.js routes traffic through the CC tunnel.
 */
export async function fetchViaConnectivity(
  url: string,
  init: RequestInit,
  userJwt?: string,
  locationId?: string,
): Promise<Response> {
  const conn = getConnectivityCreds();
  if (!conn) throw new Error('Connectivity service not bound');

  const proxyToken = await clientCredentialsToken(conn.token_service_url, conn.clientid, conn.clientsecret);

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> ?? {}),
    'Proxy-Authorization': `Bearer ${proxyToken}`,
  };
  if (userJwt) headers['SAP-Connectivity-Authentication'] = `Bearer ${userJwt}`;
  if (locationId) headers['SAP-Connectivity-SCC-Location_ID'] = locationId;

  const { ProxyAgent, fetch: undiciFetch } = await import('undici');
  const dispatcher = new ProxyAgent(`http://${conn.onpremise_proxy_host}:${conn.onpremise_proxy_port}`);

  // undici fetch accepts dispatcher but its types diverge from global fetch — cast through unknown
  return (undiciFetch as unknown as (url: string, init: unknown) => Promise<Response>)(url, {
    ...init,
    headers,
    dispatcher,
  });
}

// ── High-level: fetch SAP endpoint via destination ────────────────────────────

export async function fetchViaSapDestination(
  destinationName: string,
  path: string,
  init: RequestInit,
  userJwt?: string,
): Promise<Response> {
  const dest = await getDestination(destinationName);
  const url = `${dest.url.replace(/\/$/, '')}${path}`;

  const headers: Record<string, string> = { ...(init.headers as Record<string, string> ?? {}) };

  if (dest.authentication === 'BasicAuthentication' && dest.user) {
    headers['Authorization'] = 'Basic ' + Buffer.from(`${dest.user}:${dest.password ?? ''}`).toString('base64');
  }
  if (dest.client) headers['sap-client'] = dest.client;

  const patchedInit = { ...init, headers };

  if (dest.proxyType === 'OnPremise') {
    return fetchViaConnectivity(url, patchedInit, userJwt, dest.locationId);
  }
  return fetch(url, patchedInit);
}
