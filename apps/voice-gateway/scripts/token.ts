import { AccessToken } from "livekit-server-sdk"

async function generateToken() {
  const apiKey = process.env.LIVEKIT_API_KEY!
  const apiSecret = process.env.LIVEKIT_API_SECRET!

  const token = new AccessToken(apiKey, apiSecret, {
    identity: "driver_123",
    metadata: JSON.stringify({ role: "driver" }),
  })

  token.addGrant({
    roomJoin: true,
    room: "call_phase1_test",
  })

  const jwt = await token.toJwt()
  console.log(jwt)
}

generateToken().catch(console.error)
