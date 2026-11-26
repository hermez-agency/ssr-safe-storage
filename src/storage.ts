/**
 * A thin, typed wrapper around `localStorage`.
 *
 * Values are serialised as JSON on the way in and parsed on the way out, so you
 * store and read objects rather than strings. Outside the browser — during
 * server-side rendering, or in a test runner without a DOM — and in browsers
 * that block it, the same calls fall through to an in-memory store instead of
 * throwing on a missing or inaccessible `localStorage`.
 *
 * The in-memory fallback lives for the duration of the process and is not
 * shared between requests: treat it as a way to keep code paths uniform, not as
 * a server-side persistence layer.
 */

/**
 * `localStorage` when it can actually be used, `null` otherwise.
 *
 * `window` existing is not enough: Safari in private browsing, blocked cookies
 * or a sandboxed iframe throw a `SecurityError` as soon as `localStorage` is
 * read, and some browsers expose it but refuse writes. A test write settles
 * both cases. The result is cached, so the probe runs once per module load.
 */
let cachedStorage: Storage | null | undefined

function getLocalStorage(): Storage | null {
  if (cachedStorage === undefined) {
    cachedStorage = probeLocalStorage()
  }
  return cachedStorage
}

function probeLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const storage = window.localStorage
    const probeKey = "__ssr-safe-storage__"
    storage.setItem(probeKey, probeKey)
    storage.removeItem(probeKey)
    return storage
  } catch {
    return null
  }
}

/** Fallback store used whenever `localStorage` is out of reach. */

const localStorageData = {} as Record<string, unknown>

/**
 * Reads a value.
 *
 * Returns `null` when the key was never set, and `undefined` when the value
 * stored for it was itself `undefined`.
 */
export function getInStorage<T>(key: string): undefined | T | null {
  const storage = getLocalStorage()
  if (!storage) {
    return Object.hasOwn(localStorageData, key) ? (localStorageData[key] as T) : null
  }

  const item = storage.getItem(key)

  if (item === "undefined") {
    return undefined
  }
  if (item === null) {
    return null
  }

  return JSON.parse(item) as T
}

/** Writes a value, serialised as JSON. */
export function setInStorage(key: string, data: unknown): void {
  const storage = getLocalStorage()
  if (!storage) {
    localStorageData[key] = data
    return
  }

  storage.setItem(key, JSON.stringify(data))
}

/** Removes a key entirely. */
export function removeInStorage(key: string): void {
  const storage = getLocalStorage()
  if (!storage) {
    delete localStorageData[key]
    return
  }

  storage.removeItem(key)
}
