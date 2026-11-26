# ssr-safe-storage

## 0.2.0

### Minor Changes

- 2df77a0: Security: the in-memory fallback used outside the browser is a single process-wide store, so values written while rendering for one user could be read while rendering for another, despite the README saying otherwise. `runWithStorage(fn)` now gives a server render a store of its own, isolated from concurrent renders, and the README describes the server-side behaviour as it really is. Browser behaviour is unchanged.

### Patch Changes

- aa4c207: Fall back to the in-memory store when `localStorage` exists but throws on access (Safari private browsing, blocked cookies, sandboxed iframes) instead of throwing. Availability is detected once per module load with a test write.

## 0.1.1

### Patch Changes

- bb0e933: Package metadata now points to Hermez: author, repository, bugs and homepage move to `github.com/hermez-agency/ssr-safe-storage`.
