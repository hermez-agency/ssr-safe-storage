---
"ssr-safe-storage": minor
---

Security: the in-memory fallback used outside the browser is a single process-wide store, so values written while rendering for one user could be read while rendering for another, despite the README saying otherwise. `runWithStorage(fn)` now gives a server render a store of its own, isolated from concurrent renders, and the README describes the server-side behaviour as it really is. Browser behaviour is unchanged.
