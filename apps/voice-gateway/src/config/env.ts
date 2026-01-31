// import "dotenv/config";

// export const ENV = {
//   LIVEKIT_URL: process.env.LIVEKIT_URL!,
//   LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY!,
//   LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET!,
// } as const;

// src/config/env.ts

type EnvConfig = {
  LIVEKIT_URL: string
  LIVEKIT_API_KEY: string
  LIVEKIT_API_SECRET: string
  NODE_ENV: string
}

let cachedEnv: EnvConfig | null = null

export function loadEnv(): EnvConfig {
  if (cachedEnv) return cachedEnv

  const {
    LIVEKIT_URL,
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET,
    NODE_ENV = "development",
  } = process.env

  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error(
      "Missing required environment variables: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET"
    )
  }

  cachedEnv = {
    LIVEKIT_URL,
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET,
    NODE_ENV,
  }

  return cachedEnv
}

