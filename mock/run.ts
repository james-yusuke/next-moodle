import { createMoodleMock } from "./moodle-server"

const requestedPort = (): number | undefined => {
  const raw = process.env.MOODLE_MOCK_PORT
  if (raw === undefined || raw.trim() === "") return undefined
  const port = Number(raw)
  return Number.isInteger(port) && port > 0 && port < 65_536 ? port : undefined
}

const main = async (): Promise<void> => {
  const port = requestedPort()
  const mock = port === undefined ? createMoodleMock() : createMoodleMock({ port })
  const server = await mock.start()
  console.log(`MOODLE_MOCK_URL=${server.url}`)
  console.log(`MOODLE_MOCK_PORT=${server.port}`)

  await new Promise<void>((resolve) => {
    let stopped = false
    const stop = (): void => {
      if (stopped) return
      stopped = true
      void mock.stop().then(resolve)
    }
    process.once("SIGINT", stop)
    process.once("SIGTERM", stop)
  })
}

void main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message)
  } else {
    console.error("mock Moodle server failed")
  }
  process.exitCode = 1
})
