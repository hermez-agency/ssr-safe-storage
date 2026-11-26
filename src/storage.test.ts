import { afterEach, describe, expect, it, vi } from "vitest"
import { getInStorage, removeInStorage, setInStorage } from "@/storage"

describe("LocalStorage Tests", () => {
  it("should store and retrieve a value in localStorage (browser path)", () => {
    const key = "testKey"
    const value = { a: 1, b: "two" }

    setInStorage(key, value)
    const result = getInStorage<typeof value>(key)

    expect(result).toEqual(value)
  })

  it("should return undefined when stored value is the string 'undefined'", () => {
    const key = "undefKey"
    setInStorage(key, undefined)

    const result = getInStorage<any>(key)
    expect(result).toBeUndefined()
  })

  it("should return null when stored value is the string 'null'", () => {
    const key = "undefKey"
    setInStorage(key, null)

    const result = getInStorage<any>(key)
    expect(result).toBeNull()
  })

  it("should return false when stored value is the string 'false'", () => {
    const key = "undefKey"
    setInStorage(key, false)

    const result = getInStorage<any>(key)
    expect(result).toBeFalsy()
  })

  it("should return null when item is not in localStorage (null case)", () => {
    const key = "missingKey"

    // Ensure no item exists
    try {
      removeInStorage(key)
    } catch {
      // ignore if not available
    }

    const result = getInStorage<any>(key)
    expect(result).toBeNull()
  })

  it("should remove a value from localStorage and subsequent get should be null", () => {
    const key = "toRemove"
    const value = "some string"

    setInStorage(key, value)
    // ensure it's stored
    expect(getInStorage<string>(key)).toBe(value)

    removeInStorage(key)
    // after removal, get should be null
    const result = getInStorage<string>(key)
    expect(result).toBeNull()
  })
})

describe("localStorage that throws on access", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("falls back to the in-memory store when reading localStorage throws", async () => {
    const getter = vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError")
    })
    vi.resetModules()
    const { getInStorage, removeInStorage, setInStorage } = await import("@/storage")

    expect(getInStorage("blocked")).toBeNull()
    setInStorage("blocked", { a: 1 })
    expect(getInStorage("blocked")).toEqual({ a: 1 })
    removeInStorage("blocked")
    expect(getInStorage("blocked")).toBeNull()

    // Detection runs once per module load, not on every call.
    expect(getter).toHaveBeenCalledTimes(1)
  })
})
