import * as XLSX from "xlsx";

type RawRow = Record<string, unknown>;

export type DailyExcelMetric = {
  closingDate: Date;
  reportType: "daily_costs" | "restitution_summary";
  totalOrders: number;
  totalDeliveredOrders: number;
  totalCancelledOrders: number;
  grossRevenue: number;
  platformCommissions: number;
  extraFees: number;
  storeCostTotal: number;
  driverCostTotal: number;
  finalCostAmount: number;
  packagingCosts: number;
  discounts: number;
  refunds: number;
  totalNetMargin: number;
  netMarginPercent: number;
  ordersWithLoss: number;
  averageDelayMinutes: number;
  onTimeDeliveryPercent: number;
  restitutionFreight: number;
  restitutionMarkup: number;
  marketplaceCommission: number;
  restitutionPromotions: number;
  restitutionTotal: number;
};

const aliases = {
  date: ["data", "dia", "date", "closingdate", "fechamento", "datadopedido"],
  orderId: ["pedido", "numeropedido", "nopedido", "nodopedido", "nrodopedido"],
  totalOrders: ["pedidos", "totalpedidos", "totaldepedidos", "orders"],
  totalDeliveredOrders: ["pedidosentregues", "entregues", "deliveries", "deliveredorders"],
  totalCancelledOrders: ["cancelados", "pedidoscancelados", "cancelamentos", "cancelledorders"],
  grossRevenue: ["faturamento", "faturamentobruto", "receitabruta", "grossrevenue", "vendas", "restituicaototal"],
  platformCommissions: ["comissao", "comissaoplataforma", "taxaplataforma", "platformcommissions", "comissaomarketplace"],
  extraFees: ["taxasextras", "taxaextra", "extrafees"],
  storeCostTotal: ["custototalloja", "custodaloja", "custoloja", "custosloja", "storecosttotal"],
  driverCostTotal: ["customotoboys", "customotoboy", "custodosmotoboys", "custodeentrega", "deliverycosts"],
  packagingCosts: ["embalagem", "embalagens", "custodeembalagem", "packagingcosts"],
  discounts: ["descontos", "discounts", "cupons"],
  refunds: ["reembolsos", "refunds", "estornos"],
  ordersWithLoss: ["pedidoscomprejuizo", "prejuizo", "orderswithloss"],
  averageDelayMinutes: ["atrasomedio", "atrasomedioemminutos", "averagedelayminutes"],
  onTimeDeliveryPercent: ["percentualnoprazo", "noprazo", "ontimedeliverypercent"],
  restitutionFreight: ["restituicaofrete"],
  restitutionMarkup: ["restituicaomarkup"],
  marketplaceCommission: ["comissaomarketplace"],
  restitutionPromotions: ["restituicaopromocoes"],
  restitutionTotal: ["restituicaototal"],
} as const;

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();
}

function normalizeRow(row: RawRow) {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[normalizeKey(key)] = value;
  }
  return normalized;
}

function getValue(row: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) {
    const value = row[normalizeKey(key)];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const cleaned = value
    .replace(/[R$\s%]/g, "")
    .trim();
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  const normalized =
    hasComma && hasDot
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : hasComma
        ? cleaned.replace(",", ".")
        : cleaned;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(parsed.y, parsed.m - 1, parsed.d);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (brMatch) {
      return new Date(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1]));
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function readMetric(row: Record<string, unknown>, key: keyof typeof aliases) {
  return getValue(row, aliases[key]);
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function parseDailyMetricsExcel(base64: string): DailyExcelMetric[] {
  const workbook = XLSX.read(Buffer.from(base64, "base64"), {
    type: "buffer",
    cellDates: true,
  });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) return [];

  const rows = XLSX.utils.sheet_to_json<RawRow>(workbook.Sheets[firstSheet], {
    defval: null,
  });

  const parsedRows = rows
    .map(normalizeRow)
    .filter((row) => Object.values(row).some((value) => value !== null && value !== ""))
    .map((row) => {
      const closingDate = asDate(readMetric(row, "date"));
      const isRestitutionReport = readMetric(row, "restitutionTotal") !== undefined;
      const orderCount = asNumber(readMetric(row, "totalOrders")) || (readMetric(row, "orderId") ? 1 : 0);
      const grossRevenue = asNumber(readMetric(row, "grossRevenue"));
      const platformCommissions = asNumber(readMetric(row, "platformCommissions"));
      const extraFees = asNumber(readMetric(row, "extraFees"));
      const storeCostTotal = asNumber(readMetric(row, "storeCostTotal"));
      const driverCostTotal = asNumber(readMetric(row, "driverCostTotal"));
      const packagingCosts = asNumber(readMetric(row, "packagingCosts"));
      const discounts = asNumber(readMetric(row, "discounts"));
      const refunds = asNumber(readMetric(row, "refunds"));
      const finalCostAmount = storeCostTotal + driverCostTotal;
      const totalNetMargin =
        grossRevenue - platformCommissions - extraFees - finalCostAmount - packagingCosts - discounts - refunds;
      const netMarginPercent = grossRevenue > 0 ? (totalNetMargin / grossRevenue) * 100 : 0;
      const restitutionFreight = asNumber(readMetric(row, "restitutionFreight"));
      const restitutionMarkup = asNumber(readMetric(row, "restitutionMarkup"));
      const marketplaceCommission = asNumber(readMetric(row, "marketplaceCommission"));
      const restitutionPromotions = asNumber(readMetric(row, "restitutionPromotions"));
      const restitutionTotal = asNumber(readMetric(row, "restitutionTotal"));

      return {
        closingDate,
        reportType: isRestitutionReport ? "restitution_summary" as const : "daily_costs" as const,
        totalOrders: Math.round(orderCount),
        totalDeliveredOrders: Math.round(asNumber(readMetric(row, "totalDeliveredOrders")) || orderCount),
        totalCancelledOrders: Math.round(asNumber(readMetric(row, "totalCancelledOrders"))),
        grossRevenue,
        platformCommissions,
        extraFees,
        storeCostTotal,
        driverCostTotal,
        finalCostAmount,
        packagingCosts,
        discounts,
        refunds,
        totalNetMargin,
        netMarginPercent,
        ordersWithLoss: Math.round(asNumber(readMetric(row, "ordersWithLoss"))),
        averageDelayMinutes: Math.round(asNumber(readMetric(row, "averageDelayMinutes"))),
        onTimeDeliveryPercent: asNumber(readMetric(row, "onTimeDeliveryPercent")),
        restitutionFreight,
        restitutionMarkup,
        marketplaceCommission,
        restitutionPromotions,
        restitutionTotal,
      };
    });

  const grouped = new Map<string, DailyExcelMetric>();
  for (const metric of parsedRows) {
    const key = dateKey(metric.closingDate);
    const current = grouped.get(key);
    if (!current) {
      grouped.set(key, metric);
      continue;
    }

    const grossRevenue = current.grossRevenue + metric.grossRevenue;
    const platformCommissions = current.platformCommissions + metric.platformCommissions;
    const extraFees = current.extraFees + metric.extraFees;
    const storeCostTotal = current.storeCostTotal + metric.storeCostTotal;
    const driverCostTotal = current.driverCostTotal + metric.driverCostTotal;
    const packagingCosts = current.packagingCosts + metric.packagingCosts;
    const discounts = current.discounts + metric.discounts;
    const refunds = current.refunds + metric.refunds;
    const finalCostAmount = storeCostTotal + driverCostTotal;
    const totalNetMargin =
      grossRevenue - platformCommissions - extraFees - finalCostAmount - packagingCosts - discounts - refunds;

    grouped.set(key, {
      ...current,
      reportType: current.reportType === metric.reportType ? current.reportType : "daily_costs",
      totalOrders: current.totalOrders + metric.totalOrders,
      totalDeliveredOrders: current.totalDeliveredOrders + metric.totalDeliveredOrders,
      totalCancelledOrders: current.totalCancelledOrders + metric.totalCancelledOrders,
      grossRevenue,
      platformCommissions,
      extraFees,
      storeCostTotal,
      driverCostTotal,
      finalCostAmount,
      packagingCosts,
      discounts,
      refunds,
      totalNetMargin,
      netMarginPercent: grossRevenue > 0 ? (totalNetMargin / grossRevenue) * 100 : 0,
      ordersWithLoss: current.ordersWithLoss + metric.ordersWithLoss,
      averageDelayMinutes: Math.round((current.averageDelayMinutes + metric.averageDelayMinutes) / 2),
      onTimeDeliveryPercent: Math.round((current.onTimeDeliveryPercent + metric.onTimeDeliveryPercent) / 2),
      restitutionFreight: current.restitutionFreight + metric.restitutionFreight,
      restitutionMarkup: current.restitutionMarkup + metric.restitutionMarkup,
      marketplaceCommission: current.marketplaceCommission + metric.marketplaceCommission,
      restitutionPromotions: current.restitutionPromotions + metric.restitutionPromotions,
      restitutionTotal: current.restitutionTotal + metric.restitutionTotal,
    });
  }

  return Array.from(grouped.values());
}

type TopItem = {
  name: string;
  count: number;
  total: number;
};

export type WorkbookImportSummary =
  | {
      reportType: "orders_report";
      title: string;
      sourceSheet: string;
      importedRows: number;
      dateFrom?: string;
      dateTo?: string;
      totals: {
        totalOrders: number;
        deliveredOrders: number;
        cancelledOrders: number;
        grossRevenue: number;
        subtotalRevenue: number;
        freightRevenue: number;
        discountTotal: number;
      };
      topCouriers: TopItem[];
      paymentMix: Record<string, number>;
      topProducts: TopItem[];
    }
  | {
      reportType: "drivers_report";
      title: string;
      sourceSheet: string;
      importedRows: number;
      dateFrom?: string;
      dateTo?: string;
      totals: {
        totalDrivers: number;
        deliveredOrders: number;
        cashTotal: number;
        cardTotal: number;
        onlineTotal: number;
        grossRevenue: number;
      };
      drivers: Array<{
        name: string;
        deliveredOrders: number;
        cashTotal: number;
        cardTotal: number;
        onlineTotal: number;
        total: number;
      }>;
    }
  | {
      reportType: "restitution_summary";
      title: string;
      sourceSheet: string;
      importedRows: number;
      dateFrom?: string;
      dateTo?: string;
      totals: {
        grossRevenue: number;
        storeCostTotal: number;
        driverCostTotal: number;
        finalCostAmount: number;
        totalNetMargin: number;
        restitutionFreight: number;
        restitutionMarkup: number;
        marketplaceCommission: number;
        restitutionPromotions: number;
        restitutionTotal: number;
      };
      rows: Array<{
        date: string;
        grossRevenue: number;
        storeCostTotal: number;
        driverCostTotal: number;
        finalCostAmount: number;
        totalNetMargin: number;
        netMarginPercent: number;
        restitutionFreight?: number;
        restitutionMarkup?: number;
        marketplaceCommission?: number;
        restitutionPromotions?: number;
        restitutionTotal?: number;
        manualAdjustments?: number;
      }>;
    };

export type NormalizedImportRows =
  | {
      reportType: "orders_report";
      sourceSheet: string;
      title: string;
      dateFrom?: string;
      dateTo?: string;
      orders: Array<{
        rowIndex: number;
        orderDateLabel: string;
        status: string;
        courierName: string;
        paymentMethod: string;
        subtotal: number;
        discount: number;
        freight: number;
        total: number;
        rawJson: string;
      }>;
      products: Array<{
        rowIndex: number;
        name: string;
        quantity: number;
        total: number;
        rawJson: string;
      }>;
    }
  | {
      reportType: "drivers_report";
      sourceSheet: string;
      title: string;
      dateFrom?: string;
      dateTo?: string;
      drivers: Array<{
        rowIndex: number;
        name: string;
        deliveredOrders: number;
        cashTotal: number;
        cardTotal: number;
        onlineTotal: number;
        total: number;
        rawJson: string;
      }>;
    }
  | {
      reportType: "restitution_summary";
      sourceSheet: string;
      title: string;
      dateFrom?: string;
      dateTo?: string;
      rows: Array<{
        rowIndex: number;
        dateLabel: string;
        grossRevenue: number;
        storeCostTotal: number;
        driverCostTotal: number;
        finalCostAmount: number;
        totalNetMargin: number;
        netMarginPercent: number;
        restitutionFreight: number;
        restitutionMarkup: number;
        marketplaceCommission: number;
        restitutionPromotions: number;
        restitutionTotal: number;
        manualAdjustments: number;
        rawJson: string;
      }>;
    };

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function titleFromSheetName(sheetName: string) {
  return sheetName.replace(/\s+/g, " ").trim();
}

function extractDateRangeFromRows(rows: unknown[][]) {
  const line = rows
    .slice(0, 4)
    .flat()
    .find((cell) => typeof cell === "string" && cell.includes("Exibindo dados de:"));

  if (typeof line !== "string") return {};

  const match = line.match(/Exibindo dados de:\s*(\d{2}\/\d{2}\/\d{4}).*?até\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (!match) return {};

  return {
    dateFrom: toIsoDate(asDate(match[1])),
    dateTo: toIsoDate(asDate(match[2])),
  };
}

function getWorkbookBase64(base64: string) {
  return XLSX.read(Buffer.from(base64, "base64"), {
    type: "buffer",
    cellDates: true,
  });
}

function getOrderRows(sheet: XLSX.WorkSheet) {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
  }) as unknown[][];
  return rows.slice(6).filter((row) => Array.isArray(row) && row.some((cell) => cell !== null && cell !== ""));
}

function getSheetRows(sheet: XLSX.WorkSheet) {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
  }) as unknown[][];
}

function isDriverRow(row: unknown[]) {
  return row.some((cell) => typeof cell === "string" && cell.includes("@"));
}

function findHeaderRowIndex(rows: unknown[][], headerLabel: string) {
  return rows.findIndex((row) =>
    row.some((cell) => typeof cell === "string" && cell.toLowerCase().includes(headerLabel.toLowerCase()))
  );
}

function getDataRowsAfterHeader(rows: unknown[][], headerLabel: string) {
  const headerRowIndex = findHeaderRowIndex(rows, headerLabel);
  const startIndex = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
  return rows
    .slice(startIndex)
    .filter((row) => Array.isArray(row) && row.some((cell) => cell !== null && cell !== ""));
}

function summarizeTopItems(items: Array<{ name: string; count: number; total: number }>, limit = 5) {
  return [...items]
    .sort((a, b) => b.total - a.total || b.count - a.count)
    .slice(0, limit);
}

function summarizeTopCounts(items: Array<{ name: string; count: number; total: number }>, limit = 5) {
  return [...items]
    .sort((a, b) => b.count - a.count || b.total - a.total)
    .slice(0, limit);
}

function parseDateString(value: unknown) {
  if (value instanceof Date) return toIsoDate(value);
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return toIsoDate(asDate(trimmed));
}

function groupNumericRowsByDate<T extends Record<string, number>>(
  rows: unknown[][],
  dateIndex: number,
  valueBuilder: (row: unknown[]) => T
) {
  const grouped = new Map<string, T>();

  for (const row of rows) {
    const date = parseDateString(row[dateIndex]);
    if (!date) continue;
    const values = valueBuilder(row);
    const current = grouped.get(date);

    if (!current) {
      grouped.set(date, values);
      continue;
    }

    const merged = { ...current } as T;
    for (const [key, value] of Object.entries(values)) {
      merged[key as keyof T] = ((merged[key as keyof T] as number) + value) as T[keyof T];
    }
    grouped.set(date, merged);
  }

  return grouped;
}

export function parseWorkbookImport(base64: string, fileName: string): WorkbookImportSummary {
  const workbook = getWorkbookBase64(base64);
  const sheetNames = workbook.SheetNames;

  if (sheetNames.includes("Relatório de Pedidos") && sheetNames.includes("Ranking de Produtos")) {
    const orderSheet = workbook.Sheets["Relatório de Pedidos"];
    const productSheet = workbook.Sheets["Ranking de Produtos"];
    const rawOrderRows = getSheetRows(orderSheet);
    const rawProductRows = getSheetRows(productSheet);
    const orderRows = getOrderRows(orderSheet);
    const productRows = getDataRowsAfterHeader(rawProductRows, "Produto").filter(
      (row) => typeof row[0] === "string" && !String(row[0]).toLowerCase().includes("lista de produtos")
    );
    const dateRange = extractDateRangeFromRows(rawOrderRows);

    const paymentMix = new Map<string, number>();
    const courierStats = new Map<string, { count: number; total: number }>();
    let subtotalRevenue = 0;
    let freightRevenue = 0;
    let discountTotal = 0;
    let deliveredOrders = 0;
    let cancelledOrders = 0;

    for (const row of orderRows as unknown[][]) {
      const status = String(row[4] ?? "").trim();
      const courier = String(row[5] ?? "").trim();
      const payment = String(row[6] ?? "").trim();
      const subtotal = asNumber(row[7]);
      const discount = asNumber(row[8]);
      const freight = asNumber(row[9]);
      const total = asNumber(row[10]);

      subtotalRevenue += subtotal;
      freightRevenue += freight;
      discountTotal += discount;
      paymentMix.set(payment || "Nao informado", (paymentMix.get(payment || "Nao informado") ?? 0) + total);

      if (status.toLowerCase().includes("entreg")) deliveredOrders += 1;
      if (status.toLowerCase().includes("cancel")) cancelledOrders += 1;

      if (courier) {
        const current = courierStats.get(courier) ?? { count: 0, total: 0 };
        courierStats.set(courier, {
          count: current.count + 1,
          total: current.total + total,
        });
      }
    }

    const productStats = new Map<string, { count: number; total: number }>();
    for (const row of productRows as unknown[][]) {
      const name = String(row[0] ?? "").trim();
      if (!name) continue;
      const qty = Math.round(asNumber(row[1]));
      const total = asNumber(row[3]);
      const current = productStats.get(name) ?? { count: 0, total: 0 };
      productStats.set(name, { count: current.count + qty, total: current.total + total });
    }

    const totals = {
      totalOrders: orderRows.length,
      deliveredOrders,
      cancelledOrders,
      grossRevenue: Array.from(orderRows as unknown[][]).reduce((sum, row) => sum + asNumber(row[10]), 0),
      subtotalRevenue,
      freightRevenue,
      discountTotal,
    };

    return {
      reportType: "orders_report",
      title: titleFromSheetName("Relatório de Pedidos"),
      sourceSheet: "Relatório de Pedidos",
      importedRows: orderRows.length,
      ...dateRange,
      totals,
      topCouriers: summarizeTopCounts(
        Array.from(courierStats.entries()).map(([name, value]) => ({
          name,
          count: value.count,
          total: value.total,
        }))
      ),
      paymentMix: Object.fromEntries(paymentMix.entries()),
      topProducts: summarizeTopItems(
        Array.from(productStats.entries()).map(([name, value]) => ({
          name,
          count: value.count,
          total: value.total,
        }))
      ),
    };
  }

  if (sheetNames.includes("Relatório de Entregadores")) {
    const sheet = workbook.Sheets["Relatório de Entregadores"];
    const rawRows = getSheetRows(sheet);
    const rows = getDataRowsAfterHeader(rawRows, "Pessoa Entregadora");
    const dateRange = extractDateRangeFromRows(rawRows);

    const drivers = rows
      .filter((row) => isDriverRow(row as unknown[]))
      .map((row) => {
        const r = row as unknown[];
        const name = r.find((cell, index) => index > 0 && typeof cell === "string" && cell.trim().length > 0);
        return {
          name: String(name ?? "").trim(),
          deliveredOrders: Math.round(asNumber(r[1])),
          cardTotal: asNumber(r[3]),
          cashTotal: asNumber(r[4]),
          onlineTotal: asNumber(r[5]),
          total: asNumber(r[6]),
        };
      });

    return {
      reportType: "drivers_report",
      title: titleFromSheetName("Relatório de Entregadores"),
      sourceSheet: "Relatório de Entregadores",
      importedRows: rows.length,
      ...dateRange,
      totals: {
        totalDrivers: drivers.length,
        deliveredOrders: drivers.reduce((sum, row) => sum + row.deliveredOrders, 0),
        cashTotal: drivers.reduce((sum, row) => sum + row.cashTotal, 0),
        cardTotal: drivers.reduce((sum, row) => sum + row.cardTotal, 0),
        onlineTotal: drivers.reduce((sum, row) => sum + row.onlineTotal, 0),
        grossRevenue: drivers.reduce((sum, row) => sum + row.total, 0),
      },
      drivers: drivers.sort((a, b) => b.total - a.total),
    };
  }

  if (sheetNames.includes("Resumo Restituição")) {
    const sheet = workbook.Sheets["Resumo Restituição"];
    const rows = XLSX.utils
      .sheet_to_json<RawRow>(sheet, { defval: null, raw: false })
      .map(normalizeRow)
      .filter((row) => Object.values(row).some((value) => value !== null && value !== ""));

    const parsedRows = rows
      .map((row) => {
        const date = asDate(readMetric(row, "date"));
        const grossRevenue = asNumber(readMetric(row, "restitutionTotal"));
        const restitutionFreight = asNumber(readMetric(row, "restitutionFreight"));
        const restitutionMarkup = asNumber(readMetric(row, "restitutionMarkup"));
        const marketplaceCommission = asNumber(readMetric(row, "marketplaceCommission"));
        const restitutionPromotions = asNumber(readMetric(row, "restitutionPromotions"));
        const totalNetMargin = grossRevenue + restitutionMarkup + marketplaceCommission + restitutionPromotions;
        const netMarginPercent = grossRevenue > 0 ? (totalNetMargin / grossRevenue) * 100 : 0;

        return {
          date,
          grossRevenue,
          storeCostTotal: 0,
          driverCostTotal: 0,
          finalCostAmount: 0,
          totalNetMargin,
          netMarginPercent,
          restitutionFreight,
          restitutionMarkup,
          marketplaceCommission,
          restitutionPromotions,
          restitutionTotal: grossRevenue,
        };
      })
      .filter((row) => row.grossRevenue !== 0 || row.totalNetMargin !== 0);

    const grouped = new Map<string, (typeof parsedRows)[number]>();
    for (const row of parsedRows) {
      const key = toIsoDate(row.date);
      const current = grouped.get(key);
      if (!current) {
        grouped.set(key, row);
        continue;
      }
      const grossRevenue = current.grossRevenue + row.grossRevenue;
      const totalNetMargin = current.totalNetMargin + row.totalNetMargin;
      grouped.set(key, {
        ...current,
        grossRevenue,
        totalNetMargin,
        restitutionFreight: current.restitutionFreight + row.restitutionFreight,
        restitutionMarkup: current.restitutionMarkup + row.restitutionMarkup,
        marketplaceCommission: current.marketplaceCommission + row.marketplaceCommission,
        restitutionPromotions: current.restitutionPromotions + row.restitutionPromotions,
        restitutionTotal: current.restitutionTotal + row.restitutionTotal,
        netMarginPercent: grossRevenue > 0 ? (totalNetMargin / grossRevenue) * 100 : 0,
      });
    }

    const rowsByDay = Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, row]) => ({
        date,
        grossRevenue: row.grossRevenue,
        storeCostTotal: row.storeCostTotal,
        driverCostTotal: row.driverCostTotal,
        finalCostAmount: row.finalCostAmount,
        totalNetMargin: row.totalNetMargin,
        netMarginPercent: row.netMarginPercent,
        restitutionFreight: row.restitutionFreight,
        restitutionMarkup: row.restitutionMarkup,
        marketplaceCommission: row.marketplaceCommission,
        restitutionPromotions: row.restitutionPromotions,
        restitutionTotal: row.restitutionTotal,
      }));

    const totals = rowsByDay.reduce(
      (sum, row) => ({
        grossRevenue: sum.grossRevenue + row.grossRevenue,
        storeCostTotal: sum.storeCostTotal + row.storeCostTotal,
        driverCostTotal: sum.driverCostTotal + row.driverCostTotal,
        finalCostAmount: sum.finalCostAmount + row.finalCostAmount,
        totalNetMargin: sum.totalNetMargin + row.totalNetMargin,
        restitutionFreight: sum.restitutionFreight + row.restitutionFreight,
        restitutionMarkup: sum.restitutionMarkup + row.restitutionMarkup,
        marketplaceCommission: sum.marketplaceCommission + row.marketplaceCommission,
        restitutionPromotions: sum.restitutionPromotions + row.restitutionPromotions,
        restitutionTotal: sum.restitutionTotal + row.restitutionTotal,
      }),
      {
        grossRevenue: 0,
        storeCostTotal: 0,
        driverCostTotal: 0,
        finalCostAmount: 0,
        totalNetMargin: 0,
        restitutionFreight: 0,
        restitutionMarkup: 0,
        marketplaceCommission: 0,
        restitutionPromotions: 0,
        restitutionTotal: 0,
      }
    );

    return {
      reportType: "restitution_summary",
      title: titleFromSheetName("Resumo Restituição"),
      sourceSheet: "Resumo Restituição",
      importedRows: rows.length,
      dateFrom: rowsByDay[0]?.date,
      dateTo: rowsByDay.at(-1)?.date,
      totals,
      rows: rowsByDay,
    };
  }

  if (
    sheetNames.includes("Fretes") &&
    sheetNames.includes("Markup") &&
    sheetNames.includes("Cupom") &&
    sheetNames.includes("MarketPlace") &&
    sheetNames.includes("Resumo")
  ) {
    const freightsRows = getDataRowsAfterHeader(getSheetRows(workbook.Sheets["Fretes"]), "Parceiro");
    const markupRows = getDataRowsAfterHeader(getSheetRows(workbook.Sheets["Markup"]), "Parceiro");
    const couponRows = getDataRowsAfterHeader(getSheetRows(workbook.Sheets["Cupom"]), "Parceiro");
    const marketplaceRows = getDataRowsAfterHeader(getSheetRows(workbook.Sheets["MarketPlace"]), "Pedido");
    const experimentationRows = sheetNames.includes("Experimentação")
      ? getDataRowsAfterHeader(getSheetRows(workbook.Sheets["Experimentação"]), "Parceiro")
      : [];
    const incentivesRows = sheetNames.includes("Incentivos")
      ? getDataRowsAfterHeader(getSheetRows(workbook.Sheets["Incentivos"]), "Parceiro")
      : [];
    const manualPaymentRows = sheetNames.includes("Pagamento Manual")
      ? getDataRowsAfterHeader(getSheetRows(workbook.Sheets["Pagamento Manual"]), "Parceiro")
      : [];

    const freightByDay = groupNumericRowsByDate(freightsRows, 2, (row) => ({
      restitutionFreight: asNumber(row[21]),
    }));
    const markupByDay = groupNumericRowsByDate(markupRows, 1, (row) => ({
      restitutionMarkup: asNumber(row[15]) + asNumber(row[17]),
    }));
    const couponByDay = groupNumericRowsByDate(couponRows, 1, (row) => ({
      restitutionPromotions: asNumber(row[4]),
    }));
    const marketplaceByDay = groupNumericRowsByDate(marketplaceRows, 1, (row) => ({
      marketplaceCommission: asNumber(row[19]),
    }));
    const experimentationByDay = groupNumericRowsByDate(experimentationRows, 1, (row) => ({
      restitutionPromotions: asNumber(row[9]),
    }));
    const incentivesByDay = groupNumericRowsByDate(incentivesRows, 1, (row) => ({
      restitutionPromotions: asNumber(row[9]),
    }));

    const allDates = new Set<string>([
      ...freightByDay.keys(),
      ...markupByDay.keys(),
      ...couponByDay.keys(),
      ...marketplaceByDay.keys(),
      ...experimentationByDay.keys(),
      ...incentivesByDay.keys(),
    ]);

    const manualAdjustments = manualPaymentRows.reduce((sum, row) => sum + asNumber(row[3]), 0);

    const rowsByDay = Array.from(allDates)
      .sort((a, b) => a.localeCompare(b))
      .map((date, index, all) => {
        const freight = freightByDay.get(date)?.restitutionFreight ?? 0;
        const markup = markupByDay.get(date)?.restitutionMarkup ?? 0;
        const promotions =
          (couponByDay.get(date)?.restitutionPromotions ?? 0) +
          (experimentationByDay.get(date)?.restitutionPromotions ?? 0) +
          (incentivesByDay.get(date)?.restitutionPromotions ?? 0);
        const marketplace = marketplaceByDay.get(date)?.marketplaceCommission ?? 0;
        const manual = index === all.length - 1 ? manualAdjustments : 0;
        const restitutionTotal = freight + markup + promotions + marketplace + manual;

        return {
          date,
          grossRevenue: restitutionTotal,
          storeCostTotal: 0,
          driverCostTotal: 0,
          finalCostAmount: 0,
          totalNetMargin: restitutionTotal,
          netMarginPercent: restitutionTotal !== 0 ? 100 : 0,
          restitutionFreight: freight,
          restitutionMarkup: markup,
          marketplaceCommission: marketplace,
          restitutionPromotions: promotions,
          manualAdjustments: manual,
          restitutionTotal,
        };
      });

    const totals = rowsByDay.reduce(
      (sum, row) => ({
        grossRevenue: sum.grossRevenue + row.grossRevenue,
        storeCostTotal: 0,
        driverCostTotal: 0,
        finalCostAmount: 0,
        totalNetMargin: sum.totalNetMargin + row.totalNetMargin,
        restitutionFreight: sum.restitutionFreight + (row.restitutionFreight ?? 0),
        restitutionMarkup: sum.restitutionMarkup + (row.restitutionMarkup ?? 0),
        marketplaceCommission: sum.marketplaceCommission + (row.marketplaceCommission ?? 0),
        restitutionPromotions: sum.restitutionPromotions + (row.restitutionPromotions ?? 0),
        restitutionTotal: sum.restitutionTotal + (row.restitutionTotal ?? 0),
      }),
      {
        grossRevenue: 0,
        storeCostTotal: 0,
        driverCostTotal: 0,
        finalCostAmount: 0,
        totalNetMargin: 0,
        restitutionFreight: 0,
        restitutionMarkup: 0,
        marketplaceCommission: 0,
        restitutionPromotions: 0,
        restitutionTotal: 0,
      }
    );

    const importedRows =
      freightsRows.length +
      markupRows.length +
      couponRows.length +
      marketplaceRows.length +
      experimentationRows.length +
      incentivesRows.length +
      manualPaymentRows.length;

    return {
      reportType: "restitution_summary",
      title: titleFromSheetName("Resumo"),
      sourceSheet: "Resumo",
      importedRows,
      dateFrom: rowsByDay[0]?.date,
      dateTo: rowsByDay.at(-1)?.date,
      totals,
      rows: rowsByDay,
    };
  }

  throw new Error(`Workbook type not recognized for ${fileName}`);
}

export function extractNormalizedImportRows(base64: string, fileName: string): NormalizedImportRows {
  const workbook = getWorkbookBase64(base64);
  const sheetNames = workbook.SheetNames;

  if (sheetNames.includes("Relatório de Pedidos") && sheetNames.includes("Ranking de Produtos")) {
    const orderSheet = workbook.Sheets["Relatório de Pedidos"];
    const productSheet = workbook.Sheets["Ranking de Produtos"];
    const rawOrderRows = getSheetRows(orderSheet);
    const rawProductRows = getSheetRows(productSheet);
    const orderRows = getOrderRows(orderSheet);
    const productRows = getDataRowsAfterHeader(rawProductRows, "Produto").filter(
      (row) => typeof row[0] === "string" && !String(row[0]).toLowerCase().includes("lista de produtos")
    );
    const dateRange = extractDateRangeFromRows(rawOrderRows);

    return {
      reportType: "orders_report",
      title: titleFromSheetName("Relatório de Pedidos"),
      sourceSheet: "Relatório de Pedidos",
      ...dateRange,
      orders: orderRows.map((row, index) => ({
        rowIndex: index + 1,
        orderDateLabel:
          row[0] instanceof Date
            ? toIsoDate(row[0])
            : typeof row[0] === "string"
              ? row[0].trim()
              : "",
        status: String(row[4] ?? "").trim(),
        courierName: String(row[5] ?? "").trim(),
        paymentMethod: String(row[6] ?? "").trim(),
        subtotal: asNumber(row[7]),
        discount: asNumber(row[8]),
        freight: asNumber(row[9]),
        total: asNumber(row[10]),
        rawJson: JSON.stringify(row),
      })),
      products: productRows.map((row, index) => ({
        rowIndex: index + 1,
        name: String(row[0] ?? "").trim(),
        quantity: Math.round(asNumber(row[1])),
        total: asNumber(row[3]),
        rawJson: JSON.stringify(row),
      })),
    };
  }

  if (sheetNames.includes("Relatório de Entregadores")) {
    const sheet = workbook.Sheets["Relatório de Entregadores"];
    const rawRows = getSheetRows(sheet);
    const rows = getDataRowsAfterHeader(rawRows, "Pessoa Entregadora");
    const dateRange = extractDateRangeFromRows(rawRows);

    return {
      reportType: "drivers_report",
      title: titleFromSheetName("Relatório de Entregadores"),
      sourceSheet: "Relatório de Entregadores",
      ...dateRange,
      drivers: rows
        .filter((row) => isDriverRow(row as unknown[]))
        .map((row, index) => {
          const r = row as unknown[];
          const name = r.find((cell, cellIndex) => cellIndex > 0 && typeof cell === "string" && cell.trim().length > 0);
          return {
            rowIndex: index + 1,
            name: String(name ?? "").trim(),
            deliveredOrders: Math.round(asNumber(r[1])),
            cardTotal: asNumber(r[3]),
            cashTotal: asNumber(r[4]),
            onlineTotal: asNumber(r[5]),
            total: asNumber(r[6]),
            rawJson: JSON.stringify(r),
          };
        }),
    };
  }

  if (sheetNames.includes("Resumo Restituição")) {
    const summary = parseWorkbookImport(base64, fileName);
    if (summary.reportType !== "restitution_summary") {
      throw new Error(`Workbook type not recognized for ${fileName}`);
    }

    return {
      reportType: "restitution_summary",
      title: summary.title,
      sourceSheet: summary.sourceSheet,
      dateFrom: summary.dateFrom,
      dateTo: summary.dateTo,
      rows: summary.rows.map((row, index) => ({
        rowIndex: index + 1,
        dateLabel: row.date,
        grossRevenue: row.grossRevenue,
        storeCostTotal: row.storeCostTotal,
        driverCostTotal: row.driverCostTotal,
        finalCostAmount: row.finalCostAmount,
        totalNetMargin: row.totalNetMargin,
        netMarginPercent: row.netMarginPercent,
        restitutionFreight: row.restitutionFreight ?? 0,
        restitutionMarkup: row.restitutionMarkup ?? 0,
        marketplaceCommission: row.marketplaceCommission ?? 0,
        restitutionPromotions: row.restitutionPromotions ?? 0,
        restitutionTotal: row.restitutionTotal ?? 0,
        manualAdjustments: row.manualAdjustments ?? 0,
        rawJson: JSON.stringify(row),
      })),
    };
  }

  if (
    sheetNames.includes("Fretes") &&
    sheetNames.includes("Markup") &&
    sheetNames.includes("Cupom") &&
    sheetNames.includes("MarketPlace") &&
    sheetNames.includes("Resumo")
  ) {
    const summary = parseWorkbookImport(base64, fileName);
    if (summary.reportType !== "restitution_summary") {
      throw new Error(`Workbook type not recognized for ${fileName}`);
    }

    return {
      reportType: "restitution_summary",
      title: summary.title,
      sourceSheet: summary.sourceSheet,
      dateFrom: summary.dateFrom,
      dateTo: summary.dateTo,
      rows: summary.rows.map((row, index) => ({
        rowIndex: index + 1,
        dateLabel: row.date,
        grossRevenue: row.grossRevenue,
        storeCostTotal: row.storeCostTotal,
        driverCostTotal: row.driverCostTotal,
        finalCostAmount: row.finalCostAmount,
        totalNetMargin: row.totalNetMargin,
        netMarginPercent: row.netMarginPercent,
        restitutionFreight: row.restitutionFreight ?? 0,
        restitutionMarkup: row.restitutionMarkup ?? 0,
        marketplaceCommission: row.marketplaceCommission ?? 0,
        restitutionPromotions: row.restitutionPromotions ?? 0,
        restitutionTotal: row.restitutionTotal ?? 0,
        manualAdjustments: row.manualAdjustments ?? 0,
        rawJson: JSON.stringify(row),
      })),
    };
  }

  throw new Error(`Workbook type not recognized for ${fileName}`);
}
