import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { importBatches } from "../drizzle/schema";
import { getDb } from "./db";
import { importWorkbookIntoDatabase } from "./excelImportService";
import { parseWorkbookImport, extractNormalizedImportRows } from "./excelIngest";

type Db = any;

export type DemoWorkbookImport = {
  fileName: string;
  base64: string;
  imported: ReturnType<typeof parseWorkbookImport>;
  normalized: ReturnType<typeof extractNormalizedImportRows>;
  importedAt: Date;
};

export type CollectDemoWorkbookImportsOptions = {
  fixtureDir?: string;
  readDir?: typeof readdir;
  readFile?: typeof readFile;
  parseWorkbookImport?: typeof parseWorkbookImport;
  extractNormalizedImportRows?: typeof extractNormalizedImportRows;
};

export type SeedDemoWorkbookImportsOptions = CollectDemoWorkbookImportsOptions & {
  db?: Db;
  now?: () => Date;
};

function toSortKey(imported: ReturnType<typeof parseWorkbookImport>, fileName: string) {
  const from = imported.dateFrom ?? "";
  const to = imported.dateTo ?? "";
  return `${to || from || "9999-12-31"}:${fileName}`;
}

function resolveFixtureDir(fixtureDir?: string) {
  return fixtureDir ?? path.join(process.cwd(), "fixtures", "xlsx");
}

export async function collectDemoWorkbookImports(options: CollectDemoWorkbookImportsOptions = {}) {
  const fixtureDir = resolveFixtureDir(options.fixtureDir);
  const readDirFn = options.readDir ?? readdir;
  const readFileFn = options.readFile ?? readFile;
  const parseWorkbookImportFn = options.parseWorkbookImport ?? parseWorkbookImport;
  const extractNormalizedImportRowsFn = options.extractNormalizedImportRows ?? extractNormalizedImportRows;

  let fileNames: string[] = [];
  try {
    fileNames = (await readDirFn(fixtureDir)).filter((fileName) => fileName.toLowerCase().endsWith(".xlsx"));
  } catch {
    return [];
  }

  const parsed = await Promise.all(
    fileNames.map(async (fileName) => {
      const fullPath = path.join(fixtureDir, fileName);
      const fileContents = await readFileFn(fullPath);
      const base64 = Buffer.isBuffer(fileContents)
        ? fileContents.toString("base64")
        : Buffer.from(String(fileContents)).toString("base64");
      const imported = parseWorkbookImportFn(base64, fileName);
      const normalized = extractNormalizedImportRowsFn(base64, fileName);
      return {
        fileName,
        base64,
        imported,
        normalized,
        importedAt: new Date(),
      };
    })
  );

  return parsed.sort((left, right) => toSortKey(left.imported, left.fileName).localeCompare(toSortKey(right.imported, right.fileName)));
}

async function databaseAlreadyHasImports(db: Db) {
  const rows = await db.select().from(importBatches).limit(1);
  return rows.length > 0;
}

export async function seedDemoWorkbookImports(options: SeedDemoWorkbookImportsOptions = {}) {
  const db = options.db ?? (await getDb());
  if (!db) {
    return { seeded: false, importedCount: 0 };
  }

  if (await databaseAlreadyHasImports(db)) {
    return { seeded: false, importedCount: 0 };
  }

  const workbookImports = await collectDemoWorkbookImports(options);
  let importedCount = 0;
  const now = options.now ?? (() => new Date());

  for (const item of workbookImports) {
    await importWorkbookIntoDatabase(db, item.fileName, item.base64, now());
    importedCount += 1;
  }

  return {
    seeded: importedCount > 0,
    importedCount,
  };
}
