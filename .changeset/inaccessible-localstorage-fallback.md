---
"ssr-safe-storage": patch
---

Fall back to the in-memory store when `localStorage` exists but throws on access (Safari private browsing, blocked cookies, sandboxed iframes) instead of throwing. Availability is detected once per module load with a test write.
