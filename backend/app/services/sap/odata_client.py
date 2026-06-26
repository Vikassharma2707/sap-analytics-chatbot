"""
SAP OData Client — handles authenticated requests to SAP Gateway.
Supports Basic Auth, OAuth 2.0 Client Credentials, and CSRF token management.
"""

import httpx
import asyncio
from typing import Any, Optional
from urllib.parse import urlencode, urljoin
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import structlog

from app.core.config import settings
from app.services.sap.cds_registry import CDSViewConfig

log = structlog.get_logger()


class SAPODataClient:
    def __init__(self):
        self._http: Optional[httpx.AsyncClient] = None
        self._csrf_token: Optional[str] = None
        self._access_token: Optional[str] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._http is None or self._http.is_closed:
            auth = None
            headers = {"Accept": "application/json", "sap-client": settings.SAP_CLIENT}
            if settings.SAP_AUTH_TYPE == "basic":
                auth = (settings.SAP_USERNAME, settings.SAP_PASSWORD)
            elif settings.SAP_AUTH_TYPE == "oauth2":
                token = await self._fetch_oauth_token()
                headers["Authorization"] = f"Bearer {token}"
            self._http = httpx.AsyncClient(
                base_url=settings.SAP_BASE_URL,
                auth=auth,
                headers=headers,
                verify=settings.SAP_SSL_VERIFY,
                timeout=settings.SAP_REQUEST_TIMEOUT,
            )
        return self._http

    async def _fetch_oauth_token(self) -> str:
        if self._access_token:
            return self._access_token
        async with httpx.AsyncClient(verify=settings.SAP_SSL_VERIFY) as c:
            resp = await c.post(
                settings.SAP_OAUTH_TOKEN_URL,
                data={
                    "grant_type": "client_credentials",
                    "client_id": settings.SAP_OAUTH_CLIENT_ID,
                    "client_secret": settings.SAP_OAUTH_CLIENT_SECRET,
                },
            )
            resp.raise_for_status()
            self._access_token = resp.json()["access_token"]
            return self._access_token

    async def _fetch_csrf_token(self, service_path: str) -> str:
        client = await self._get_client()
        resp = await client.get(service_path, headers={"x-csrf-token": "Fetch"})
        token = resp.headers.get("x-csrf-token", "")
        if not token:
            raise ValueError("CSRF token not returned by SAP Gateway")
        self._csrf_token = token
        return token

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(httpx.TransportError),
    )
    async def query(
        self,
        config: CDSViewConfig,
        filters: Optional[list[str]] = None,
        select: Optional[list[str]] = None,
        orderby: Optional[str] = None,
        top: int = 1000,
        skip: int = 0,
        expand: Optional[list[str]] = None,
        apply: Optional[str] = None,   # OData $apply for server-side aggregation
    ) -> dict[str, Any]:
        """Execute an OData GET query against SAP Gateway."""
        client = await self._get_client()
        url = f"{settings.SAP_ODATA_PATH}/{config.service}/{config.entity_set}"

        params: dict[str, Any] = {
            "$format": "json",
            "$top": min(top, settings.SAP_MAX_RECORDS),
            "$skip": skip,
            "$inlinecount": "allpages",
        }
        if select:
            params["$select"] = ",".join(select)
        if filters:
            params["$filter"] = " and ".join(filters)
        if orderby:
            params["$orderby"] = orderby
        if expand:
            params["$expand"] = ",".join(expand)
        if apply:
            params["$apply"] = apply

        log.info("sap_odata_query", url=url, params=params)
        resp = await client.get(url, params=params)
        resp.raise_for_status()

        body = resp.json()
        results = body.get("d", {}).get("results", body.get("value", []))
        total_count = body.get("d", {}).get("__count", len(results))

        return {"records": results, "total_count": int(total_count), "top": top, "skip": skip}

    async def paginate_all(
        self,
        config: CDSViewConfig,
        filters: Optional[list[str]] = None,
        select: Optional[list[str]] = None,
        orderby: Optional[str] = None,
        max_records: int = 5000,
        apply: Optional[str] = None,
    ) -> list[dict]:
        """Paginate through SAP OData results up to max_records."""
        all_records: list[dict] = []
        page_size = 500
        skip = 0
        while len(all_records) < max_records:
            page = await self.query(
                config, filters=filters, select=select, orderby=orderby,
                top=page_size, skip=skip, apply=apply,
            )
            records = page["records"]
            if not records:
                break
            all_records.extend(records)
            skip += len(records)
            if len(records) < page_size or len(all_records) >= page_size * 10:
                break
        return all_records[:max_records]

    async def close(self):
        if self._http and not self._http.is_closed:
            await self._http.aclose()


# Module-level singleton
_client: Optional[SAPODataClient] = None


def get_sap_client() -> SAPODataClient:
    global _client
    if _client is None:
        _client = SAPODataClient()
    return _client
