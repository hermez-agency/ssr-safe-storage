// @vitest-environment node
import { describe, expect, it } from "vitest"
import {
  getInStorage,
  removeInStorage,
  runWithStorage,
  setInStorage,
} from "@/storage"

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

/**
 * A simulated server render: it writes the user it renders for, yields to the
 * event loop so the other render runs in between, then reads back.
 */
async function render(user: string, steps: string[]) {
  const before = getInStorage<string>("user")
  setInStorage("user", user)
  steps.push(`${user}:set`)
  await tick()
  steps.push(`${user}:read`)
  const after = getInStorage<string>("user")
  await tick()
  removeInStorage("user")
  return { before, after }
}

describe("In-memory fallback on the server", () => {
  it("keeps concurrent renders isolated from each other", async () => {
    const steps: string[] = []

    const [alice, bob] = await Promise.all([
      runWithStorage(() => render("alice", steps)),
      runWithStorage(() => render("bob", steps)),
    ])

    // Both renders really interleaved: each wrote before the other read.
    expect(steps).toEqual(["alice:set", "bob:set", "alice:read", "bob:read"])
    expect(alice).toEqual({ before: null, after: "alice" })
    expect(bob).toEqual({ before: null, after: "bob" })
  })

  it("does not leak scoped values into the process-wide store, nor the reverse", async () => {
    setInStorage("shared", "global")

    await runWithStorage(async () => {
      expect(getInStorage("shared")).toBeNull()
      setInStorage("scoped", "request")
      await tick()
      expect(getInStorage("scoped")).toBe("request")
    })

    expect(getInStorage("scoped")).toBeNull()
    expect(getInStorage("shared")).toBe("global")
    removeInStorage("shared")
  })

  it("starts every scope empty", () => {
    runWithStorage(() => setInStorage("key", "first"))

    expect(runWithStorage(() => getInStorage("key"))).toBeNull()
  })

  it("shares the process-wide store between calls made outside any scope", () => {
    setInStorage("key", "value")

    expect(getInStorage("key")).toBe("value")
    removeInStorage("key")
  })
})
