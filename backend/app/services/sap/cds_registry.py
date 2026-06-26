"""
CDS View Registry — maps intents and business objects to SAP CDS views and their OData services.
Each entry declares the service name, entity set, key fields, filterable/selectable dimensions,
and the measures available for aggregation.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class CDSViewConfig:
    service: str                       # OData service name
    entity_set: str                    # OData entity set
    cds_view: str                      # Underlying CDS view
    module: str                        # SAP module
    description: str
    key_fields: list[str]
    dimension_fields: list[str]        # Groupable / filterable
    measure_fields: list[str]          # Numeric / aggregatable
    date_fields: list[str]
    default_select: list[str]          # Default $select fields
    supports_expand: list[str] = field(default_factory=list)
    top_n_field: Optional[str] = None  # Field used for ranking


CDS_REGISTRY: dict[str, CDSViewConfig] = {
    # ─────────────────────────── SALES ───────────────────────────
    "billing_document": CDSViewConfig(
        service="API_BILLING_DOCUMENT_SRV",
        entity_set="A_BillingDocument",
        cds_view="I_BillingDocument",
        module="SD",
        description="Billing documents (invoices) — revenue analytics",
        key_fields=["BillingDocument"],
        dimension_fields=["SoldToParty", "BillingDocumentType", "SalesOrganization",
                          "MaterialGroup", "Material", "BillingDocumentDate",
                          "FiscalYear", "FiscalPeriod", "CompanyCode", "Country"],
        measure_fields=["NetAmount", "TaxAmount", "GrossAmount"],
        date_fields=["BillingDocumentDate", "CreationDate"],
        default_select=["BillingDocument", "SoldToParty", "BillingDocumentDate",
                        "NetAmount", "TransactionCurrency", "SalesOrganization"],
    ),
    "sales_order": CDSViewConfig(
        service="API_SALES_ORDER_SRV",
        entity_set="A_SalesOrder",
        cds_view="I_SalesOrder",
        module="SD",
        description="Sales orders — order pipeline analytics",
        key_fields=["SalesOrder"],
        dimension_fields=["SoldToParty", "SalesOrderType", "SalesOrganization",
                          "DistributionChannel", "OrganizationDivision", "CompanyCode"],
        measure_fields=["TotalNetAmount", "RequestedQuantity"],
        date_fields=["SalesOrderDate", "RequestedDeliveryDate", "CreationDate"],
        default_select=["SalesOrder", "SalesOrderType", "SoldToParty",
                        "SalesOrderDate", "TotalNetAmount", "TransactionCurrency"],
    ),
    "customer": CDSViewConfig(
        service="API_BUSINESS_PARTNER",
        entity_set="A_BusinessPartner",
        cds_view="I_Customer",
        module="SD",
        description="Customer master data",
        key_fields=["BusinessPartner"],
        dimension_fields=["BusinessPartnerCategory", "Country", "Region",
                          "Industry", "CustomerClassification"],
        measure_fields=[],
        date_fields=["CreationDate"],
        default_select=["BusinessPartner", "BusinessPartnerFullName",
                        "Country", "Region", "Industry"],
    ),
    # ─────────────────────────── FINANCE ─────────────────────────
    "journal_entry": CDSViewConfig(
        service="API_JOURNALENTRYITEMBASIC_SRV",
        entity_set="A_JournalEntryItemBasic",
        cds_view="I_JournalEntryItemBasic",
        module="FI",
        description="Journal entry line items — GL analytics",
        key_fields=["CompanyCode", "FiscalYear", "AccountingDocument", "LedgerGLLineItem"],
        dimension_fields=["CompanyCode", "GLAccount", "CostCenter", "ProfitCenter",
                          "FunctionalArea", "BusinessArea", "TradingPartner",
                          "FiscalYear", "FiscalPeriod", "PostingDate"],
        measure_fields=["AmountInCompanyCodeCurrency", "AmountInTransactionCurrency"],
        date_fields=["PostingDate", "DocumentDate"],
        default_select=["CompanyCode", "FiscalYear", "PostingDate", "GLAccount",
                        "CostCenter", "AmountInCompanyCodeCurrency", "CompanyCodeCurrency"],
    ),
    "supplier_invoice": CDSViewConfig(
        service="API_SUPPLIERINVOICE_PROCESS_SRV",
        entity_set="A_SupplierInvoice",
        cds_view="I_SupplierInvoice",
        module="FI-AP",
        description="Supplier invoices — accounts payable analytics",
        key_fields=["SupplierInvoice", "FiscalYear"],
        dimension_fields=["Supplier", "CompanyCode", "DocumentDate",
                          "PostingDate", "PaymentTerms", "PaymentMethod",
                          "InvoiceStatus", "CurrencyCode"],
        measure_fields=["InvoiceGrossAmount", "SupplierInvoiceIDByInvcgParty"],
        date_fields=["DocumentDate", "PostingDate", "PaymentDueDate"],
        default_select=["SupplierInvoice", "Supplier", "CompanyCode",
                        "DocumentDate", "InvoiceGrossAmount", "CurrencyCode", "PaymentDueDate"],
    ),
    # ─────────────────────────── PROCUREMENT ─────────────────────
    "purchase_order": CDSViewConfig(
        service="API_PURCHASEORDER_PROCESS_SRV",
        entity_set="A_PurchaseOrder",
        cds_view="I_PurchaseOrderAPI01",
        module="MM-PUR",
        description="Purchase orders — procurement analytics",
        key_fields=["PurchaseOrder"],
        dimension_fields=["Supplier", "PurchasingOrganization", "PurchasingGroup",
                          "CompanyCode", "Plant", "Material", "MaterialGroup",
                          "PurchaseOrderType", "DocumentCurrency"],
        measure_fields=["NetPriceAmount", "OrderQuantity"],
        date_fields=["CreationDate", "PurchaseOrderDate", "DeliveryDate"],
        default_select=["PurchaseOrder", "Supplier", "PurchasingOrganization",
                        "CreationDate", "NetPriceAmount", "DocumentCurrency",
                        "PurchaseOrderType", "ReleaseIsNotCompleted"],
    ),
    # ─────────────────────────── INVENTORY ───────────────────────
    "material_stock": CDSViewConfig(
        service="API_MATERIAL_STOCK_SRV",
        entity_set="A_MatlStkInAcctMod",
        cds_view="I_MatlStkInAcctMod",
        module="MM-IM",
        description="Material stock — inventory analytics",
        key_fields=["Material", "Plant", "StorageLocation", "Batch"],
        dimension_fields=["Material", "Plant", "StorageLocation", "MaterialType",
                          "MaterialGroup", "BaseUnit"],
        measure_fields=["MatlWrhsStkQtyInMatBaseUnit", "MatlStkInTransferQty"],
        date_fields=[],
        default_select=["Material", "Plant", "StorageLocation",
                        "MatlWrhsStkQtyInMatBaseUnit", "BaseUnit"],
    ),
    "material_document": CDSViewConfig(
        service="API_MATERIAL_DOCUMENT_SRV",
        entity_set="A_MaterialDocumentHeader",
        cds_view="I_MaterialDocument",
        module="MM-IM",
        description="Material documents — goods movement analytics",
        key_fields=["MaterialDocument", "MaterialDocumentYear"],
        dimension_fields=["Plant", "StorageLocation", "GoodsMovementType",
                          "Material", "Supplier", "Customer", "DocumentDate"],
        measure_fields=["QuantityInBaseUnit", "GoodsMovementQuantity"],
        date_fields=["DocumentDate", "PostingDate"],
        default_select=["MaterialDocument", "DocumentDate", "Plant",
                        "GoodsMovementType", "Material", "QuantityInBaseUnit"],
    ),
    # ─────────────────────────── PRODUCTION ──────────────────────
    "production_order": CDSViewConfig(
        service="API_PRODUCTION_ORDER_2_SRV",
        entity_set="A_ProductionOrder_2",
        cds_view="I_ProductionOrder_2",
        module="PP",
        description="Production orders — manufacturing analytics",
        key_fields=["ManufacturingOrder"],
        dimension_fields=["Plant", "Material", "MfgOrderType", "WorkCenter",
                          "ProductionVersion", "OrderStatus", "CompanyCode"],
        measure_fields=["TotalQuantity", "MfgOrderPlannedTotalCost",
                        "MfgOrderActualTotalCost", "MfgOrderConfirmedYieldQty"],
        date_fields=["MfgOrderPlannedStartDate", "MfgOrderPlannedEndDate",
                     "MfgOrderActualEndDate", "BasicScheduledStartDate"],
        default_select=["ManufacturingOrder", "Material", "Plant",
                        "TotalQuantity", "MfgOrderPlannedTotalCost",
                        "MfgOrderActualTotalCost", "MfgOrderConfirmedYieldQty",
                        "MfgOrderPlannedStartDate", "OrderStatus"],
    ),
}


# ─── Intent → CDS View mapping ────────────────────────────────────────────────
INTENT_TO_CDS: dict[str, list[str]] = {
    # Sales
    "sales_by_customer":        ["billing_document"],
    "sales_trend":              ["billing_document"],
    "yoy_sales":                ["billing_document"],
    "top_customers":            ["billing_document"],
    "top_products":             ["billing_document"],
    "sales_by_region":          ["billing_document"],
    "sales_order_pipeline":     ["sales_order"],
    # Finance
    "open_vendor_invoices":     ["supplier_invoice"],
    "vendor_ageing":            ["supplier_invoice"],
    "accounts_receivable":      ["journal_entry"],
    "cash_flow":                ["journal_entry"],
    "revenue_by_company":       ["journal_entry"],
    "cost_center_spend":        ["journal_entry"],
    "gl_analytics":             ["journal_entry"],
    # Procurement
    "po_pending_approval":      ["purchase_order"],
    "spend_by_vendor":          ["purchase_order"],
    "purchase_trend":           ["purchase_order"],
    # Inventory
    "current_stock":            ["material_stock"],
    "inventory_ageing":         ["material_document", "material_stock"],
    "stock_movements":          ["material_document"],
    # Manufacturing
    "production_orders":        ["production_order"],
    "yield_analysis":           ["production_order"],
    "cost_variance":            ["production_order"],
}


def get_cds_config(cds_key: str) -> CDSViewConfig | None:
    return CDS_REGISTRY.get(cds_key)


def get_cds_for_intent(intent: str) -> list[CDSViewConfig]:
    keys = INTENT_TO_CDS.get(intent, [])
    return [CDS_REGISTRY[k] for k in keys if k in CDS_REGISTRY]
