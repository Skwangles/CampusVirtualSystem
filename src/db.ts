import betterSqlite3 from 'better-sqlite3'
import { SQLITE_DB_DIR, SQLITE_DB_NAME, TABLE_PREFIX, USE_TABLE_PREFIX } from './consts';
import path from 'path';
import logger from './logger';

let sqliteDb: betterSqlite3.Database;

async function initDB() {
  const db_file = path.join(SQLITE_DB_DIR, SQLITE_DB_NAME)
  sqliteDb = betterSqlite3(db_file, { readonly: true })
  logger.info("Configured databases: " + db_file)


  const fp_images = await readDB(`SELECT COUNT(name) as count FROM sqlite_master WHERE type='table' AND name='${USE_TABLE_PREFIX ? TABLE_PREFIX : ""}floorplan_images';`, [], true)
  const fp_points = await readDB(`SELECT COUNT(name) as count FROM sqlite_master WHERE type='table' AND name='${USE_TABLE_PREFIX ? TABLE_PREFIX : ""}floorplan_points';`, [], true)
  process.env.IS_FLOORPLANS_EXISTS = fp_images.count === 1 && fp_points.count === 1 ? 'true' : 'false'
  logger.info("Enabled Floorplan/Maps Feature: " + process.env.IS_FLOORPLANS_EXISTS)
}

export async function readDB(query: string, params: (string | number)[] = [], isSingle: boolean = false): Promise<any | any[]> {
  logger.verbose(`[readDB] SQL: ${query} params: ${params} isSingle:${isSingle}`)
  const preparedQuery = sqliteDb.prepare(query)
  return isSingle ? await preparedQuery.get(params) as any : await preparedQuery.all(params) as any[]
}

initDB()
export { readDB as dbQuery }

