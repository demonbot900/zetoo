/**
 * Persistence for the reactive stores.
 *
 * The API is the source of truth. `localStorage` is kept as a mirror so the
 * app still opens with the last known state when the server is unreachable —
 * a browser tab that has been left open should not go blank because the
 * backend restarted.
 */

const API_TIMEOUT_MS = 8000

/** Debounce between a store changing and the write reaching the server. */
const WRITE_DELAY_MS = 400

export type SyncStatus = 'idle' | 'saving' | 'offline'

const listeners = new Set<(status: SyncStatus) => void>()
let status: SyncStatus = 'idle'

export const onSyncStatus = (listener: (status: SyncStatus) => void) => {
  listeners.add(listener)
  listener(status)
  return () => listeners.delete(listener)
}

const setStatus = (next: SyncStatus) => {
  if (status === next) return
  status = next
  listeners.forEach((listener) => listener(next))
}

/**
 * The database incarnation this tab loaded with. Sent on every write so the
 * server can refuse a copy that predates a reset; see `getGeneration` on the
 * server for why that matters.
 */
const GENERATION_KEY = 'zetoo.generation'
let generation: string | null = null

try {
  generation = localStorage.getItem(GENERATION_KEY)
} catch {
  // Storage blocked; the tab simply behaves like a first-time client.
}

const rememberGeneration = (value: unknown) => {
  if (typeof value !== 'string' || !value) return
  generation = value
  try {
    localStorage.setItem(GENERATION_KEY, value)
  } catch {
    // Nothing to do; the value stays in memory for this tab.
  }
}

/**
 * Called when the server reports this tab is holding pre-reset data. Dropping
 * the mirror and reloading is the only safe move: anything else pushes the
 * deleted workspace back up.
 */
const handleStaleTab = (serverGeneration: unknown) => {
  try {
    STORAGE_KEYS.forEach((key) => localStorage.removeItem(key))
    localStorage.removeItem(GENERATION_KEY)
  } catch {
    // Best effort.
  }
  rememberGeneration(serverGeneration)
  window.location.reload()
}

/** Thrown when the API has no workspace for the current session. */
export class UnauthorizedError extends Error {
  constructor() {
    super('unauthorized')
    this.name = 'UnauthorizedError'
  }
}

const request = async (path: string, init?: RequestInit): Promise<unknown> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  try {
    const response = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...init,
    })
    const payload = await response.json().catch(() => null)
    if (response.status === 401) {
      // Signed out, or signed in without a workspace yet.
      throw new UnauthorizedError()
    }
    if (response.status === 409) {
      handleStaleTab((payload as { generation?: unknown } | null)?.generation)
      throw new Error('stale')
    }
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
    rememberGeneration((payload as { generation?: unknown } | null)?.generation)
    return payload
  } finally {
    clearTimeout(timer)
  }
}

const readLocal = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

const writeLocal = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota exceeded or storage disabled — the server copy still holds.
  }
}

/**
 * Loads a store: server first, cached copy second.
 *
 * `isEmpty` decides whether a server response actually carries data. A fresh
 * database answers every GET with empty collections, and treating that as
 * authoritative would wipe a browser that still holds the only copy of the
 * workspace.
 */
export const load = async <T>(
  resource: string,
  storageKey: string,
  isEmpty: (value: T) => boolean,
): Promise<T | null> => {
  const cached = readLocal<T>(storageKey)
  try {
    const remote = (await request(`/api/${resource}`)) as T
    setStatus('idle')
    if (!isEmpty(remote)) {
      writeLocal(storageKey, remote)
      return remote
    }
    // Server has nothing yet: hand back the cache and let the first save
    // push it up.
    return cached
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      // No workspace behind this session: the cache, if any, belongs to
      // somebody else.
      clearMirror()
      return null
    }
    setStatus('offline')
    return cached
  }
}

/** Per-resource debounce timers, so rapid edits collapse into one PUT. */
const pendingWrites = new Map<string, ReturnType<typeof setTimeout>>()

/** Every store's mirror key, cleared together on a reset. */
const STORAGE_KEYS = ['zetoo.workspace.v1', 'zetoo.board.v1', 'zetoo.records.v1']

/**
 * Drops this browser's cached copy without touching the server.
 *
 * Signing in or out must do this: the mirror belongs to whoever was signed in,
 * and leaving it in place is how the next account ends up looking at the
 * previous one's workspace.
 */
export const clearMirror = (): void => {
  pendingWrites.forEach((timer) => clearTimeout(timer))
  pendingWrites.clear()
  try {
    STORAGE_KEYS.forEach((key) => localStorage.removeItem(key))
    localStorage.removeItem(GENERATION_KEY)
  } catch {
    // Storage blocked; nothing cached to clear.
  }
  generation = null
}

/**
 * Wipes the database and the browser mirror, then reloads.
 *
 * Both halves matter: clearing only the server would let this tab push its
 * cached copy straight back on the next edit.
 */
export const resetEverything = async (): Promise<void> => {
  pendingWrites.forEach((timer) => clearTimeout(timer))
  pendingWrites.clear()

  try {
    await request('/api/reset', { method: 'POST' })
  } catch {
    // Server unreachable: still clear locally so the tab starts clean.
  }

  try {
    STORAGE_KEYS.forEach((key) => localStorage.removeItem(key))
    localStorage.removeItem(GENERATION_KEY)
  } catch {
    // Storage blocked; nothing cached to clear.
  }
  generation = null

  window.location.assign('/register')
}

export const save = (resource: string, storageKey: string, snapshot: unknown) => {
  writeLocal(storageKey, snapshot)

  const existing = pendingWrites.get(resource)
  if (existing) clearTimeout(existing)

  pendingWrites.set(
    resource,
    setTimeout(() => {
      pendingWrites.delete(resource)
      setStatus('saving')
      request(`/api/${resource}`, {
        method: 'PUT',
        body: JSON.stringify({ ...(snapshot as object), generation }),
      })
        .then(() => setStatus('idle'))
        .catch(() => setStatus('offline'))
    }, WRITE_DELAY_MS),
  )
}
