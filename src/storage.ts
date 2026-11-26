/**
 * A thin, typed wrapper around `localStorage`.
 *
 * Values are serialised as JSON on the way in and parsed on the way out, so you
 * store and read objects rather than strings. Outside the browser — during
 * server-side rendering, or in a test runner without a DOM — and in browsers
 * that block it, the same calls fall through to an in-memory store instead of
 * throwing on a missing or inaccessible `localStorage`.
 *
 * By default the in-memory fallback is a single store that lives for the
 * duration of the process, so it is shared by every request the process
 * serves. Wrap each server render in `runWithStorage` to give it a store of its
 * own. Either way it is a way to keep code paths uniform, not a server-side
 * persistence layer.
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

type MemoryStore = Record<string, unknown>

/** Process-wide fallback store, used outside any `runWithStorage` scope. */
const localStorageData = {} as MemoryStore

/** The subset of `AsyncLocalStorage` this module relies on. */
interface ScopeContext {
  getStore(): MemoryStore | undefined
  run<R>(store: MemoryStore, fn: () => R): R
}

interface AsyncHooksModule {
  AsyncLocalStorage: new () => ScopeContext
}

let scopeContext: ScopeContext | undefined

/**
 * Creates the `AsyncLocalStorage` that carries the per-scope store, on first
 * use only. It is loaded through `process.getBuiltinModule` rather than an
 * import, so the package keeps no dependency and the browser never sees it.
 */
function getScopeContext(): ScopeContext {
  if (scopeContext) {
    return scopeContext
  }

  const asyncHooks = globalThis.process?.getBuiltinModule?.("node:async_hooks") as
    AsyncHooksModule | undefined

  if (!asyncHooks?.AsyncLocalStorage) {
    throw new Error(
      "runWithStorage needs AsyncLocalStorage, loaded through process.getBuiltinModule (Node.js 20.16+ or 22.3+)."
    )
  }

  scopeContext = new asyncHooks.AsyncLocalStorage()
  return scopeContext
}

/** Fallback store for the current scope, or the process-wide one outside any. */
function memoryStore(): MemoryStore {
  return scopeContext?.getStore() ?? localStorageData
}

/**
 * Runs `fn` with an in-memory store of its own, empty at the start and dropped
 * at the end.
 *
 * Outside the browser, every `getInStorage`, `setInStorage` and
 * `removeInStorage` call made by `fn` — including after an `await` — reads and
 * writes that store instead of the process-wide one, so concurrent server
 * renders never see each other's values. In the browser it simply calls `fn`:
 * `localStorage` is already private to the user.
 *
 * Returns whatever `fn` returns, a promise included.
 */
export function runWithStorage<R>(fn: () => R): R {
  if (typeof window !== "undefined") {
    return fn()
  }

  return getScopeContext().run({}, fn)
}

/**
 * Reads a value.
 *
 * Returns `null` when the key was never set, and `undefined` when the value
 * stored for it was itself `undefined`.
 */
export function getInStorage<T>(key: string): undefined | T | null {
  const storage = getLocalStorage()
  if (!storage) {
    const store = memoryStore()
    return Object.hasOwn(store, key) ? (store[key] as T) : null
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
    memoryStore()[key] = data
    return
  }

  storage.setItem(key, JSON.stringify(data))
}

/** Removes a key entirely. */
export function removeInStorage(key: string): void {
  const storage = getLocalStorage()
  if (!storage) {
    delete memoryStore()[key]
    return
  }

  storage.removeItem(key)
}
