type ImportCatalogEntry = {
  importId?: string;
  reportType?: string;
  fileName?: string;
  importedRows?: number;
  dateFrom?: string;
  dateTo?: string;
  importedAt?: string;
};

export type MergedImportCatalogItem = {
  reportType: string;
  label: string;
  fileCount: number;
  totalRows: number;
  dateFrom?: string;
  dateTo?: string;
  latestFileName?: string;
  latestImportedAt?: string;
};

const reportTypeLabel: Record<string, string> = {
  orders_report: "Pedidos entregues",
  drivers_report: "Entregadores",
  restitution_summary: "Restituição semanal",
};

function toDate(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function mergeImportCatalog(catalog: ImportCatalogEntry[] = []): MergedImportCatalogItem[] {
  const groups = new Map<string, MergedImportCatalogItem>();

  for (const entry of catalog) {
    const reportType = entry.reportType ?? "unknown";
    const current = groups.get(reportType) ?? {
      reportType,
      label: reportTypeLabel[reportType] ?? reportType,
      fileCount: 0,
      totalRows: 0,
    };

    current.fileCount += 1;
    current.totalRows += Number(entry.importedRows ?? 0);

    if (entry.dateFrom) {
      const currentFrom = toDate(current.dateFrom);
      const nextFrom = toDate(entry.dateFrom);
      if (!currentFrom || (nextFrom && nextFrom < currentFrom)) {
        current.dateFrom = entry.dateFrom;
      }
    }

    if (entry.dateTo) {
      const currentTo = toDate(current.dateTo);
      const nextTo = toDate(entry.dateTo);
      if (!currentTo || (nextTo && nextTo > currentTo)) {
        current.dateTo = entry.dateTo;
      }
    }

    if (entry.importedAt) {
      const currentImportedAt = toDate(current.latestImportedAt);
      const nextImportedAt = toDate(entry.importedAt);
      if (!currentImportedAt || (nextImportedAt && nextImportedAt > currentImportedAt)) {
        current.latestImportedAt = entry.importedAt;
        current.latestFileName = entry.fileName;
      }
    } else if (!current.latestFileName) {
      current.latestFileName = entry.fileName;
    }

    groups.set(reportType, current);
  }

  return Array.from(groups.values()).sort((left, right) => {
    const leftDate = toDate(left.latestImportedAt)?.getTime() ?? 0;
    const rightDate = toDate(right.latestImportedAt)?.getTime() ?? 0;
    return rightDate - leftDate || left.label.localeCompare(right.label);
  });
}
