import { accessSync, constants, existsSync, mkdirSync, unlinkSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

const serverRoot = fileURLToPath(new URL('../..', import.meta.url))

function isUnavailableDirectoryError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === 'EACCES' ||
      error.code === 'EPERM' ||
      error.code === 'EROFS' ||
      error.code === 'ENOENT' ||
      error.code === 'ENOTDIR')
  )
}

function splitFileUrl(databaseUrl: string): { pathPart: string; query: string } {
  const rest = databaseUrl.slice('file:'.length)
  const queryIndex = rest.indexOf('?')
  return {
    pathPart: queryIndex === -1 ? rest : rest.slice(0, queryIndex),
    query: queryIndex === -1 ? '' : rest.slice(queryIndex),
  }
}

function filePathFromUrl(pathPart: string): string {
  let decoded = pathPart
  try {
    decoded = decodeURIComponent(pathPart)
  } catch {
    decoded = pathPart
  }

  if (decoded.startsWith('///')) {
    decoded = decoded.slice(2)
  } else if (decoded.startsWith('//')) {
    const pathStart = decoded.indexOf('/', 2)
    decoded = pathStart === -1 ? '/' : decoded.slice(pathStart)
  }

  if (isAbsolute(decoded)) {
    return decoded
  }

  return resolve(serverRoot, decoded)
}

function toFileUrl(filePath: string, query: string): string {
  return `file:${filePath.replaceAll('\\', '/')}${query}`
}

function discardFailedEmptyDatabase(filePath: string): void {
  if (!existsSync(filePath)) {
    return
  }

  let database: DatabaseSync | undefined
  let shouldRemove = false
  try {
    database = new DatabaseSync(filePath, { readOnly: true })
    const migrationTable = database
      .prepare("SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = '_prisma_migrations'")
      .get()
    if (migrationTable === undefined) {
      return
    }

    const failedMigration = database
      .prepare(
        'SELECT 1 AS present FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL LIMIT 1',
      )
      .get()
    const employeeTable = database
      .prepare("SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = 'Employee'")
      .get()
    shouldRemove = failedMigration !== undefined && employeeTable === undefined
  } catch (error: unknown) {
    if (!isUnavailableDirectoryError(error)) {
      console.warn(`Could not inspect SQLite database at ${filePath}.`, error)
    }
    return
  } finally {
    database?.close()
  }

  if (!shouldRemove) {
    return
  }

  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    const candidate = `${filePath}${suffix}`
    if (existsSync(candidate)) {
      unlinkSync(candidate)
    }
  }
  console.warn(`Removed the empty SQLite database after a failed migration: ${filePath}`)
}

function canUseDirectory(directory: string): boolean {
  try {
    mkdirSync(directory, { recursive: true })
    accessSync(directory, constants.W_OK)
    return true
  } catch (error: unknown) {
    if (isUnavailableDirectoryError(error)) {
      return false
    }
    throw error
  }
}

export function ensureSqliteDatabaseUrl(): string | undefined {
  const databaseUrl = process.env.DATABASE_URL
  if (typeof databaseUrl !== 'string' || !databaseUrl.startsWith('file:')) {
    return databaseUrl
  }

  const { pathPart, query } = splitFileUrl(databaseUrl)
  const filePath = filePathFromUrl(pathPart)
  discardFailedEmptyDatabase(filePath)

  if (canUseDirectory(dirname(filePath))) {
    const resolved = toFileUrl(filePath, query)
    process.env.DATABASE_URL = resolved
    return resolved
  }

  const fallbackDirectory = join(tmpdir(), 'acme-payroll')
  mkdirSync(fallbackDirectory, { recursive: true })
  const fallbackPath = join(fallbackDirectory, 'payroll.db')
  discardFailedEmptyDatabase(fallbackPath)
  const fallback = toFileUrl(fallbackPath, query)
  console.warn(
    `SQLite path is not writable (${filePath}). Using ${fallback}. Mount a disk and set DATABASE_URL to a file on that disk to keep payroll data.`,
  )
  process.env.DATABASE_URL = fallback
  return fallback
}
