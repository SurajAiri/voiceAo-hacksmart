// src/health/heartbeat.ts

let interval: NodeJS.Timeout | null = null

export function startHeartbeat() {
  if (interval) return

  interval = setInterval(() => {
    console.log(`[HEALTH] Voice Gateway alive @ ${new Date().toISOString()}`)
  }, 10_000)
}

export function stopHeartbeat() {
  if (interval) {
    clearInterval(interval)
    interval = null
  }
}
