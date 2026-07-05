import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("fs/promises", () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
  stat: vi.fn(),
}));

vi.mock("./excelIngest", () => ({
  parseWorkbookImport: vi.fn(),
  extractNormalizedImportRows: vi.fn(),
}));

vi.mock("./importPersistence", () => ({
  persistImportedWorkbook: vi.fn(),
}));

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { readdir, readFile } from "fs/promises";
import { parseWorkbookImport, extractNormalizedImportRows } from "./excelIngest";
import { persistImportedWorkbook } from "./importPersistence";
import { getDb } from "./db";
import { collectDemoWorkbookImports, seedDemoWorkbookImports } from "./demoSeed";

afterEach(() => {
  vi.clearAllMocks();
});

describe("collectDemoWorkbookImports", () => {
  it("keeps only xlsx files and sorts them by date", async () => {
    vi.mocked(readdir).mockResolvedValue(["b.xlsx", "note.txt", "a.xlsx"] as any);
    vi.mocked(readFile).mockImplementation(async (filePath) => Buffer.from(String(filePath)).toString("base64"));
    vi.mocked(parseWorkbookImport).mockImplementation((base64) => {
      const marker = Buffer.from(base64, "base64").toString("utf8");
      if (marker.includes("a.xlsx")) {
        return { reportType: "orders_report", title: "A", sourceSheet: "Pedidos", importedRows: 1, dateFrom: "2026-07-01", dateTo: "2026-07-02", totals: {} } as any;
      }
      return { reportType: "restitution_summary", title: "B", sourceSheet: "Restituição", importedRows: 1, dateFrom: "2026-07-03", dateTo: "2026-07-04", totals: {} } as any;
    });
    vi.mocked(extractNormalizedImportRows).mockReturnValue({ reportType: "orders_report", orders: [], products: [] } as any);

    const imports = await collectDemoWorkbookImports({
      fixtureDir: "/tmp/fixtures",
      readDir: readdir as any,
      readFile: readFile as any,
      parseWorkbookImport: parseWorkbookImport as any,
      extractNormalizedImportRows: extractNormalizedImportRows as any,
    });

    expect(imports).toHaveLength(2);
    expect(imports[0]?.fileName).toBe("a.xlsx");
    expect(imports[1]?.fileName).toBe("b.xlsx");
  });
});

describe("seedDemoWorkbookImports", () => {
  it("does not seed when the database already has imports", async () => {
    const db = {
      select: () => ({
        from: () => ({
          limit: async () => [{ id: 1 }],
        }),
      }),
    } as any;

    const result = await seedDemoWorkbookImports({
      db,
      fixtureDir: "/tmp/fixtures",
      readDir: readdir as any,
      readFile: readFile as any,
      parseWorkbookImport: parseWorkbookImport as any,
      extractNormalizedImportRows: extractNormalizedImportRows as any,
      persistImportedWorkbook: persistImportedWorkbook as any,
    });

    expect(result.seeded).toBe(false);
    expect(persistImportedWorkbook).not.toHaveBeenCalled();
  });

  it("falls back to getDb when no db is provided", async () => {
    vi.mocked(getDb).mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [],
          }),
          limit: async () => [],
        }),
      }),
      insert: () => ({
        values: () => ({
          onDuplicateKeyUpdate: async () => undefined,
        }),
      }),
    } as any);

    vi.mocked(readdir).mockResolvedValue(["one.xlsx"] as any);
    vi.mocked(readFile).mockResolvedValue(Buffer.from("fixture") as any);
    vi.mocked(parseWorkbookImport).mockReturnValue({
      reportType: "orders_report",
      title: "Fixture",
      sourceSheet: "Pedidos",
      importedRows: 1,
      totals: {},
    } as any);
    vi.mocked(extractNormalizedImportRows).mockReturnValue({
      reportType: "orders_report",
      orders: [],
      products: [],
    } as any);

    const result = await seedDemoWorkbookImports({
      fixtureDir: "/tmp/fixtures",
      readDir: readdir as any,
      readFile: readFile as any,
      parseWorkbookImport: parseWorkbookImport as any,
      extractNormalizedImportRows: extractNormalizedImportRows as any,
      persistImportedWorkbook: persistImportedWorkbook as any,
    });

    expect(result.seeded).toBe(true);
    expect(persistImportedWorkbook).toHaveBeenCalled();
  });
});
