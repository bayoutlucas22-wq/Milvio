export function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

export function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function dateRangeLabel(dateFrom?: string, dateTo?: string) {
  if (!dateFrom && !dateTo) return "Periodo nao identificado";
  if (dateFrom && dateTo) {
    return `${new Date(`${dateFrom}T00:00:00`).toLocaleDateString("pt-BR")} a ${new Date(`${dateTo}T00:00:00`).toLocaleDateString("pt-BR")}`;
  }
  const value = dateFrom ?? dateTo ?? "";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}
