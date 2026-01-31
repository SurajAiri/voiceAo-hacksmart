"use strict";
// import "dotenv/config";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEnv = loadEnv;
let cachedEnv = null;
function loadEnv() {
    if (cachedEnv)
        return cachedEnv;
    const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, NODE_ENV = "development", } = process.env;
    if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
        throw new Error("Missing required environment variables: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET");
    }
    cachedEnv = {
        LIVEKIT_URL,
        LIVEKIT_API_KEY,
        LIVEKIT_API_SECRET,
        NODE_ENV,
    };
    return cachedEnv;
}
