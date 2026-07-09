const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(process.cwd())
const RAW_DIR = path.join(ROOT, 'artifacts', 'raw')
const CLEAN_DIR = path.join(RAW_DIR, 'by_year_month_clean')
const DB_NAME = process.env.MONGODB_DB || 'milvio'

const dbRef = db.getSiblingDB(DB_NAME)
const rawCol = dbRef.getCollection('artifacts_raw')
const cleanCol = dbRef.getCollection('artifacts_clean')
const summaryCol = dbRef.getCollection('artifacts_summaries')

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function collectJsonFiles(dir) {
  if (!fs.existsSync(dir)) return []
  const entries = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'by_year_month' || entry.name === 'by_year_month_clean') continue
      entries.push(...collectJsonFiles(full))
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      if (entry.name.startsWith('by_year_month_summary')) continue
      entries.push(full)
    }
  }
  return entries
}

function normalizePayload(filePath, data) {
  if (Array.isArray(data)) {
    if (data.length === 1 && typeof data[0] === 'object' && data[0] !== null) {
      return { __source_format: 'array', ...data[0] }
    }
    return { __source_format: 'array', rows: data }
  }
  if (typeof data === 'object' && data !== null) {
    return { __source_format: 'object', ...data }
  }
  return { __source_format: typeof data, value: data }
}

function makeDoc(filePath, payload) {
  const stat = fs.statSync(filePath)
  return {
    path: path.relative(ROOT, filePath).replace(/\\/g, '/'),
    file_name: path.basename(filePath),
    size: stat.size,
    mtime: stat.mtime,
    ...normalizePayload(filePath, payload),
  }
}

function bulkUpsert(col, docs) {
  if (!docs.length) return { matched: 0, modified: 0, upserted: 0 }
  let matched = 0
  let modified = 0
  let upserted = 0
  for (const doc of docs) {
    const res = col.replaceOne({ path: doc.path }, doc, { upsert: true })
    matched += res.matchedCount || 0
    modified += res.modifiedCount || 0
    upserted += res.upsertedCount || 0
  }
  return { matched, modified, upserted }
}

const rawFiles = collectJsonFiles(RAW_DIR)
const cleanFiles = collectJsonFiles(CLEAN_DIR)

const rawDocs = rawFiles.map((filePath) => makeDoc(filePath, readJson(filePath)))
const cleanDocs = cleanFiles.map((filePath) => makeDoc(filePath, readJson(filePath)))

const rawResult = bulkUpsert(rawCol, rawDocs)
const cleanResult = bulkUpsert(cleanCol, cleanDocs)

summaryCol.replaceOne(
  { key: 'latest_import' },
  {
    key: 'latest_import',
    db_name: DB_NAME,
    imported_at: new Date(),
    raw_files: rawDocs.length,
    clean_files: cleanDocs.length,
    raw_result: rawResult,
    clean_result: cleanResult,
  },
  { upsert: true },
)

rawCol.createIndex({ path: 1 }, { unique: true })
rawCol.createIndex({ report_type: 1 })
cleanCol.createIndex({ path: 1 }, { unique: true })
cleanCol.createIndex({ report_type: 1 })
summaryCol.createIndex({ key: 1 }, { unique: true })

printjson({
  raw_files: rawDocs.length,
  clean_files: cleanDocs.length,
  raw_result: rawResult,
  clean_result: cleanResult,
  db: DB_NAME,
})
