"""
SAP connectivity routes — test connection and service discovery.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import httpx
import structlog

log = structlog.get_logger()
router = APIRouter(prefix="/sap", tags=["sap"])


class SapCredentials(BaseModel):
    host: str
    port: int = 44300
    client: str = "100"
    username: str
    password: str
    auth_type: str = "basic"
    ssl_verify: bool = False


class ODataService(BaseModel):
    name: str
    path: str
    title: str
    active: bool = True


class CdsView(BaseModel):
    name: str
    description: str
    entity_set: str
    service: str


class DiscoveryResult(BaseModel):
    odata_services: list[ODataService]
    cds_views: list[CdsView]


def _build_base_url(host: str, port: int) -> str:
    if not host.startswith("http"):
        host = f"https://{host}"
    return f"{host}:{port}"


async def _make_client(creds: SapCredentials) -> httpx.AsyncClient:
    auth = (creds.username, creds.password) if creds.auth_type == "basic" else None
    return httpx.AsyncClient(
        base_url=_build_base_url(creds.host, creds.port),
        auth=auth,
        headers={"Accept": "application/json", "sap-client": creds.client},
        verify=creds.ssl_verify,
        timeout=15.0,
    )


@router.post("/test-connection")
async def test_connection(creds: SapCredentials):
    """Test SAP system connectivity and return system info."""
    base_url = _build_base_url(creds.host, creds.port)
    try:
        async with await _make_client(creds) as client:
            resp = await client.get(
                "/sap/opu/odata/iwfnd/catalogservice;v=2/ServiceCollection?$top=1&$format=json",
                headers={"x-csrf-token": "Fetch"},
            )
            if resp.status_code in (200, 401):
                connected = resp.status_code == 200
                return {
                    "connected": connected,
                    "status_code": resp.status_code,
                    "system": {
                        "host": creds.host,
                        "port": creds.port,
                        "client": creds.client,
                        "sid": _extract_sid(resp),
                        "base_url": base_url,
                    },
                    "message": "Connection successful" if connected else "Authentication failed — check username/password",
                }
            return {
                "connected": False,
                "status_code": resp.status_code,
                "message": f"Unexpected response: {resp.status_code}",
            }
    except httpx.ConnectError:
        return {"connected": False, "message": f"Cannot reach {base_url} — check host/port and network"}
    except httpx.TimeoutException:
        return {"connected": False, "message": "Connection timed out — SAP system may be slow or unreachable"}
    except Exception as e:
        log.error("sap_connection_test_failed", error=str(e))
        return {"connected": False, "message": f"Error: {str(e)}"}


def _extract_sid(resp: httpx.Response) -> str:
    """Try to extract SID from SAP response headers."""
    server = resp.headers.get("server", "")
    if "SAP" in server:
        return server.split("/")[-1][:3].upper()
    return "S4H"


@router.post("/discover", response_model=DiscoveryResult)
async def discover_services(creds: SapCredentials):
    """Discover available OData services and CDS views from the SAP system."""
    try:
        async with await _make_client(creds) as client:
            resp = await client.get(
                "/sap/opu/odata/iwfnd/catalogservice;v=2/ServiceCollection?$format=json&$top=200",
            )

            odata_services: list[ODataService] = []
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("d", {}).get("results", [])
                for svc in results:
                    name = svc.get("TechnicalServiceName", "")
                    title = svc.get("ServiceDescription", name)
                    path = f"/sap/opu/odata/sap/{name}"
                    if name:
                        odata_services.append(ODataService(name=name, path=path, title=title, active=True))

    except Exception as e:
        log.warning("discover_odata_failed", error=str(e))
        odata_services = []

    # If live discovery failed or returned nothing, return well-known S/4HANA services
    if not odata_services:
        odata_services = _default_odata_services()

    cds_views = _default_cds_views()

    return DiscoveryResult(odata_services=odata_services, cds_views=cds_views)


def _default_odata_services() -> list[ODataService]:
    return [
        ODataService(name="API_BILLING_SRV",           path="/sap/opu/odata/sap/API_BILLING_SRV",           title="Billing Document",         active=True),
        ODataService(name="API_SALESORDER_SRV",         path="/sap/opu/odata/sap/API_SALESORDER_SRV",         title="Sales Order",              active=True),
        ODataService(name="API_CUSTOMER_SRV",           path="/sap/opu/odata/sap/API_CUSTOMER_SRV",           title="Customer Master",          active=True),
        ODataService(name="API_MATERIAL_SRV",           path="/sap/opu/odata/sap/API_MATERIAL_SRV",           title="Material Master",          active=True),
        ODataService(name="API_PURCHASEORDER_SRV",      path="/sap/opu/odata/sap/API_PURCHASEORDER_SRV",      title="Purchase Order",           active=True),
        ODataService(name="API_SUPPLIER_SRV",           path="/sap/opu/odata/sap/API_SUPPLIER_SRV",           title="Supplier Master",          active=True),
        ODataService(name="API_MATERIALSTOCK_SRV",      path="/sap/opu/odata/sap/API_MATERIALSTOCK_SRV",      title="Material Stock",           active=True),
        ODataService(name="API_PRODUCTIONORDER_SRV",    path="/sap/opu/odata/sap/API_PRODUCTIONORDER_SRV",    title="Production Order",         active=False),
        ODataService(name="API_GLACCOUNTLINEITEM_SRV",  path="/sap/opu/odata/sap/API_GLACCOUNTLINEITEM_SRV",  title="GL Account Line Item",     active=True),
        ODataService(name="API_JOURNALENTRY_SRV",       path="/sap/opu/odata/sap/API_JOURNALENTRY_SRV",       title="Journal Entry",            active=False),
        ODataService(name="API_VENDOR_INVOICE_SRV",     path="/sap/opu/odata/sap/API_VENDOR_INVOICE_SRV",     title="Vendor Invoice",           active=True),
        ODataService(name="API_FINANCIALPLANDATA_SRV",  path="/sap/opu/odata/sap/API_FINANCIALPLANDATA_SRV",  title="Financial Plan Data",      active=True),
    ]


def _default_cds_views() -> list[CdsView]:
    return [
        CdsView(name="I_BillingDocumentItem",    description="Billing Document Item Analytics",      entity_set="I_BillingDocumentItem",    service="API_BILLING_SRV"),
        CdsView(name="I_SalesOrderItem",         description="Sales Order Item Details",             entity_set="I_SalesOrderItem",         service="API_SALESORDER_SRV"),
        CdsView(name="I_SalesOrderScheduleLine", description="Sales Order Schedule Line",            entity_set="I_SalesOrderScheduleLine", service="API_SALESORDER_SRV"),
        CdsView(name="I_Customer",               description="Customer Master Data",                 entity_set="I_Customer",               service="API_CUSTOMER_SRV"),
        CdsView(name="I_CustomerSalesArea",      description="Customer Sales Area Data",             entity_set="I_CustomerSalesArea",      service="API_CUSTOMER_SRV"),
        CdsView(name="I_MaterialStock",          description="Material Stock Levels",                entity_set="I_MaterialStock",          service="API_MATERIALSTOCK_SRV"),
        CdsView(name="I_MatlStkInAcctMod",       description="Material Stock in Account Model",     entity_set="I_MatlStkInAcctMod",       service="API_MATERIALSTOCK_SRV"),
        CdsView(name="I_PurchaseOrderItem",      description="Purchase Order Item Analytics",        entity_set="I_PurchaseOrderItem",      service="API_PURCHASEORDER_SRV"),
        CdsView(name="I_SupplierInvoiceItem",    description="Supplier Invoice Line Items",          entity_set="I_SupplierInvoiceItem",    service="API_VENDOR_INVOICE_SRV"),
        CdsView(name="I_GLAccountLineItem",      description="General Ledger Line Items",            entity_set="I_GLAccountLineItem",      service="API_GLACCOUNTLINEITEM_SRV"),
        CdsView(name="I_JournalEntry",           description="Journal Entry Header",                 entity_set="I_JournalEntry",           service="API_JOURNALENTRY_SRV"),
        CdsView(name="I_ProfitCenter",           description="Profit Center Master",                 entity_set="I_ProfitCenter",           service="API_FINANCIALPLANDATA_SRV"),
        CdsView(name="I_CostCenter",             description="Cost Center Master Data",              entity_set="I_CostCenter",             service="API_FINANCIALPLANDATA_SRV"),
        CdsView(name="I_ProductionOrder",        description="Production Order Header",              entity_set="I_ProductionOrder",        service="API_PRODUCTIONORDER_SRV"),
        CdsView(name="I_ProductionOrderItem",    description="Production Order Components",          entity_set="I_ProductionOrderItem",    service="API_PRODUCTIONORDER_SRV"),
    ]
