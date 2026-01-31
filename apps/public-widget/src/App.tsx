import { useState, useEffect, useRef } from 'react'
import { callService, CallInfo } from './lib/call.svc'
import { livekitService } from './lib/livekit.svc'

// This should ideally come from env, but for now hardcoded or passed from API
const LIVEKIT_URL = "wss://voiceao-5uyplv1q.livekit.cloud"; 

function App() {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected'>('idle')
  const [callInfo, setCallInfo] = useState<CallInfo | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    // Setup audio playback
    livekitService.onAudioStream((track) => {
      if (audioRef.current) {
        audioRef.current.srcObject = new MediaStream([track]);
        audioRef.current.play().catch(e => console.error("Auto-play blocked:", e));
      }
    });
  }, []);

  const handleStartCall = async () => {
    try {
      setStatus('connecting');
      
      // 1. Create Call via API
      const info = await callService.startCall();
      setCallInfo(info);

      // 2. Connect via LiveKit
      await livekitService.connect(LIVEKIT_URL, info.access_token);
      
      // 3. Signal Start to Orchestrator (to trigger agent and make it visible in console)
      await callService.signalStart(info.call_id);
      
      setStatus('connected');
    } catch (err) {
      console.error("Failed to start call:", err);
      setStatus('idle');
      alert("Failed to connect. See console.");
    }
  };

  const handleEndCall = async () => {
    if (callInfo) {
      livekitService.disconnect();
      await callService.endCall(callInfo.call_id);
    }
    setStatus('idle');
    setCallInfo(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Support Agent</h1>
        
        <audio ref={audioRef} autoPlay />

        <div className="mb-8">
           <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-colors ${
             status === 'connected' ? 'bg-green-100 text-green-600 animate-pulse' : 
             status === 'connecting' ? 'bg-yellow-100 text-yellow-600' : 
             'bg-blue-100 text-blue-600'
           }`}>
             {status === 'idle' && <span className="text-4xl">📞</span>}
             {status === 'connecting' && <span className="text-4xl animate-spin">⏳</span>}
             {status === 'connected' && <span className="text-4xl">🗣️</span>}
           </div>
           <p className="mt-4 text-gray-600 capitalize font-medium">{status}</p>
        </div>

        {status === 'idle' ? (
          <button 
            onClick={handleStartCall}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition shadow-md"
          >
            Start Call
          </button>
        ) : (
          <button 
            onClick={handleEndCall}
            disabled={status === 'connecting'}
            className="w-full bg-red-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-600 transition shadow-md disabled:opacity-50"
          >
            End Call
          </button>
        )}
      </div>
    </div>
  )
}

export default App

