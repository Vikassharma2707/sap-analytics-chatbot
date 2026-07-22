import { NextRequest, NextResponse } from 'next/server';
import { isOnBTP, fetchViaSapDestination } from '@/lib/btp';

const DEFAULT_ODATA = [
  { name: 'API_BILLING_SRV',           path: '/sap/opu/odata/sap/API_BILLING_SRV',           title: 'Billing Document',      active: true  },
  { name: 'API_SALESORDER_SRV',        path: '/sap/opu/odata/sap/API_SALESORDER_SRV',        title: 'Sales Order',           active: true  },
  { name: 'API_CUSTOMER_SRV',          path: '/sap/opu/odata/sap/API_CUSTOMER_SRV',          title: 'Customer Master',       active: true  },
  { name: 'API_MATERIAL_SRV',          path: '/sap/opu/odata/sap/API_MATERIAL_SRV',          title: 'Material Master',       active: true  },
  { name: 'API_PURCHASEORDER_SRV',     path: '/sap/opu/odata/sap/API_PURCHASEORDER_SRV',     title: 'Purchase Order',        active: true  },
  { name: 'API_SUPPLIER_SRV',          path: '/sap/opu/odata/sap/API_SUPPLIER_SRV',          title: 'Supplier Master',       active: true  },
  { name: 'API_MATERIALSTOCK_SRV',     path: '/sap/opu/odata/sap/API_MATERIALSTOCK_SRV',     title: 'Material Stock',        active: true  },
  { name: 'API_PRODUCTIONORDER_SRV',   path: '/sap/opu/odata/sap/API_PRODUCTIONORDER_SRV',   title: 'Production Order',      active: false },
  { name: 'API_GLACCOUNTLINEITEM_SRV', path: '/sap/opu/odata/sap/API_GLACCOUNTLINEITEM_SRV', title: 'GL Account Line Item',  active: true  },
  { name: 'API_JOURNALENTRY_SRV',      path: '/sap/opu/odata/sap/API_JOURNALENTRY_SRV',      title: 'Journal Entry',         active: false },
  { name: 'API_VENDOR_INVOICE_SRV',    path: '/sap/opu/odata/sap/API_VENDOR_INVOICE_SRV',    title: 'Vendor Invoice',        active: true  },
  { name: 'API_FINANCIALPLANDATA_SRV', path: '/sap/opu/odata/sap/API_FINANCIALPLANDATA_SRV', title: 'Financial Plan Data',   active: true  },
];

const DEFAULT_CDS = [
  { name: 'I_BillingDocumentItem',    description: 'Billing Document Item Analytics',   entity_set: 'I_BillingDocumentItem',    service: 'API_BILLING_SRV'           },
  { name: 'I_SalesOrderItem',         description: 'Sales Order Item Details',          entity_set: 'I_SalesOrderItem',         service: 'API_SALESORDER_SRV'        },
  { name: 'I_SalesOrderScheduleLine', description: 'Sales Order Schedule Line',         entity_set: 'I_SalesOrderScheduleLine', service: 'API_SALESORDER_SRV'        },
  { name: 'I_Customer',               description: 'Customer Master Data',              entity_set: 'I_Customer',               service: 'API_CUSTOMER_SRV'          },
  { name: 'I_MaterialStock',          description: 'Material Stock Levels',             entity_set: 'I_MaterialStock',          service: 'API_MATERIALSTOCK_SRV'     },
  { name: 'I_PurchaseOrderItem',      description: 'Purchase Order Item Analytics',     entity_set: 'I_PurchaseOrderItem',      service: 'API_PURCHASEORDER_SRV'     },
  { name: 'I_SupplierInvoiceItem',    description: 'Supplier Invoice Line Items',       entity_set: 'I_SupplierInvoiceItem',    service: 'API_VENDOR_INVOICE_SRV'    },
  { name: 'I_GLAccountLineItem',      description: 'General Ledger Line Items',         entity_set: 'I_GLAccountLineItem',      service: 'API_GLACCOUNTLINEITEM_SRV' },
  { name: 'I_JournalEntry',           description: 'Journal Entry Header',              entity_set: 'I_JournalEntry',           service: 'API_JOURNALENTRY_SRV'      },
  { name: 'I_ProfitCenter',           description: 'Profit Center Master',              entity_set: 'I_ProfitCenter',           service: 'API_FINANCIALPLANDATA_SRV' },
  { name: 'I_CostCenter',             description: 'Cost Center Master Data',           entity_set: 'I_CostCenter',             service: 'API_FINANCIALPLANDATA_SRV' },
  { name: 'I_ProductionOrder',        description: 'Production Order Header',           entity_set: 'I_ProductionOrder',        service: 'API_PRODUCTIONORDER_SRV'   },
];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const catalogPath = '/sap/opu/odata/iwfnd/catalogservice;v=2/ServiceCollection?$format=json&$top=200';

  let catalogRes: Response | null = null;

  // ── BTP / Cloud Connector mode ────────────────────────────────────────────
  if (isOnBTP() || body.connectionMode === 'destination') {
    const { destinationName = 'S4HANA_SYSTEM' } = body;
    try {
      catalogRes = await fetchViaSapDestination(destinationName, catalogPath, {
        method: 'GET', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15_000),
      });
    } catch { /* use defaults */ }
  } else {
    // ── Direct mode ─────────────────────────────────────────────────────────
    const { host, port, client, username, password, protocol = 'http' } = body;
    const baseUrl = `${protocol}://${host}:${port}`;
    try {
      catalogRes = await fetch(`${baseUrl}${catalogPath}`, {
        headers: {
          'sap-client': String(client),
          Accept: 'application/json',
          Authorization: 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
        },
        signal: AbortSignal.timeout(12_000),
      });
    } catch { /* use defaults */ }
  }

  let odataServices = DEFAULT_ODATA;
  if (catalogRes?.status === 200) {
    try {
      const data = await catalogRes.json() as { d?: { results?: Record<string, string>[] } };
      const results = data?.d?.results ?? [];
      if (results.length > 0) {
        odataServices = results.map((svc) => ({
          name:   svc.TechnicalServiceName,
          path:   `/sap/opu/odata/sap/${svc.TechnicalServiceName}`,
          title:  svc.ServiceDescription || svc.TechnicalServiceName,
          active: true,
        }));
      }
    } catch { /* use defaults */ }
  }

  return NextResponse.json({ odata_services: odataServices, cds_views: DEFAULT_CDS });
}
