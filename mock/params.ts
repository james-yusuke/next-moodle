import { z } from "zod"

import type { MockRequestFile, MockRequestInput } from "./types"

export class MockInputError extends Error {
  readonly name = "MockInputError"

  constructor(readonly reason: string) {
    super(`mock request input: ${reason}`)
  }
}

const baseKey = (key: string): string => {
  const bracket = key.indexOf("[")
  return bracket < 0 ? key : key.slice(0, bracket)
}

const JsonObjectSchema = z.record(z.string(), z.unknown())

const addField = (fields: Map<string, string[]>, key: string, value: string): void => {
  const keys = [key]
  const root = baseKey(key)
  if (root !== key) keys.push(root)
  for (const candidate of keys) {
    const values = fields.get(candidate) ?? []
    values.push(value)
    fields.set(candidate, values)
  }
}

const appendJsonValue = (fields: Map<string, string[]>, key: string, value: unknown): void => {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    addField(fields, key, String(value))
    return
  }
  if (value === null) {
    addField(fields, key, "null")
    return
  }
  const serialized = JSON.stringify(value)
  if (serialized !== undefined) addField(fields, key, serialized)
}

const parseJsonBody = (raw: unknown, fields: Map<string, string[]>): void => {
  const parsed = JsonObjectSchema.safeParse(raw)
  if (!parsed.success) throw new MockInputError("JSON body must be an object")
  for (const [key, value] of Object.entries(parsed.data)) appendJsonValue(fields, key, value)
}

export const readMockRequestInput = async (request: Request): Promise<MockRequestInput> => {
  const fields = new Map<string, string[]>()
  const files: MockRequestFile[] = []
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? ""

  if (request.method === "GET" || request.method === "HEAD") {
    for (const [key, value] of new URL(request.url).searchParams) addField(fields, key, value)
    return { fields, files }
  }

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData()
    for (const key of form.keys()) {
      for (const value of form.getAll(key)) {
        if (typeof value === "string") {
          addField(fields, key, value)
        } else {
          files.push({
            field: key,
            name: value.name,
            type: value.type || "application/octet-stream",
            size: value.size,
            bytes: new Uint8Array(await value.arrayBuffer()),
          })
        }
      }
    }
    return { fields, files }
  }

  const body = await request.text()
  if (body.length === 0) return { fields, files }
  if (contentType.includes("application/json")) {
    try {
      parseJsonBody(JSON.parse(body), fields)
    } catch (error) {
      if (error instanceof MockInputError) throw error
      throw new MockInputError("invalid JSON body")
    }
  } else {
    for (const [key, value] of new URLSearchParams(body)) addField(fields, key, value)
  }
  return { fields, files }
}

export const firstField = (input: MockRequestInput, ...names: readonly string[]): string | undefined => {
  for (const name of names) {
    const value = input.fields.get(name)?.[0]
    if (value !== undefined) return value
  }
  return undefined
}

export const allFields = (input: MockRequestInput, name: string): readonly string[] =>
  input.fields.get(name) ?? []

export const numberField = (input: MockRequestInput, ...names: readonly string[]): number | undefined => {
  const value = firstField(input, ...names)
  if (value === undefined || value.trim() === "") return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}
