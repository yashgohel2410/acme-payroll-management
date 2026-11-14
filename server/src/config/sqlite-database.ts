import { accessSync, constants, mkdirSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const serverRoot = fileURLToPath(new URL('../..', import.meta.url))

function isPermissionError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === 'EACCES' || error.code === 'EPERM' || error.code === 'EROFS')
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

function canUseDirectory(directory: string): boolean {
  try {
    mkdirSync(directory, { recursive: true })
    accessSync(directory, constants.W_OK)
    return true
  } catch (error: unknown) {
    if (isPermissionError(error)) {
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

  if (canUseDirectory(dirname(filePath))) {
    const resolved = toFileUrl(filePath, query)
    process.env.DATABASE_URL = resolved
    return resolved
  }

  const fallbackDirectory = join(tmpdir(), 'acme-payroll')
  mkdirSync(fallbackDirectory, { recursive: true })
  const fallback = toFileUrl(join(fallbackDirectory, 'payroll.db'), query)
  console.warn(
    `SQLite path is not writable (${filePath}). Using ${fallback}. Mount a disk and set DATABASE_URL to a file on that disk to keep payroll data.`,
  )
  process.env.DATABASE_URL = fallback
  return fallback
}
