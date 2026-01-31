import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Monitor, Phone, UserCheck, PhoneOff, MessageSquare } from 'lucide-react'
import { Room, RoomEvent, createLocalAudioTrack } from 'livekit-client'

interface Turn {
  turn_id: string;
  speaker: 'driver' | 'ai_agent' | 'human_agent';
  text: string;
  created_at: string;
}

interface ActiveCall {
  call_id: string;
  room_name: string;
  status: string;
  started_at: string;
  turns?: Turn[];
}

const LIVEKIT_URL = "wss://voiceao-5uyplv1q.livekit.cloud";

function App() {
  const [calls, setCalls] = useState<ActiveCall[]>([])
  const [connectedCallId, setConnectedCallId] = useState<string | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const fetchCalls = async () => {
    try {
      const res = await axios.get('/api/calls?status=ACTIVE');
      const activeCalls: ActiveCall[] = res.data.calls || [];
      
      // Fetch turns for each call to show transcript snippet
      const callsWithTurns = await Promise.all(activeCalls.map(async (call) => {
        try {
          const turnRes = await axios.get(`/api/calls/${call.call_id}/turns`);
          return { ...call, turns: turnRes.data.turns };
        } catch (e) {
          return call;
        }
      }));
      
      setCalls(callsWithTurns);
    } catch (err) {
      // console.error("Fetch calls error", err);
    }
  };

  useEffect(() => {
    fetchCalls();
    const interval = setInterval(fetchCalls, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleTakeOver = async (callId: string) => {
    try {
      const res = await axios.post(`/api/calls/${callId}/handoff/request`);
      if (!res.data.success) {
        alert("Handoff failed: " + res.data.message);
        return;
      }

      const { access_token } = res.data;
      const newRoom = new Room();
      
      newRoom.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === 'audio' && audioRef.current) {
          audioRef.current.srcObject = new MediaStream([track.mediaStreamTrack!]);
          audioRef.current.play();
        }
      });

      await newRoom.connect(LIVEKIT_URL, access_token);
      const audioTrack = await createLocalAudioTrack();
      await newRoom.localParticipant.publishTrack(audioTrack);

      setRoom(newRoom);
      setConnectedCallId(callId);
      fetchCalls();
    } catch (err) {
      console.error("Take over failed", err);
    }
  };

  const handleEndCall = async () => {
    if (room && connectedCallId) {
      room.disconnect();
      await axios.post(`/api/calls/${connectedCallId}/end`);
      setRoom(null);
      setConnectedCallId(null);
      fetchCalls();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8 font-sans">
      <header className="flex justify-between items-center mb-10 border-b border-gray-800 pb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Monitor className="text-blue-400 w-8 h-8" />
          Agent Console
        </h1>
        <div className="flex items-center gap-3 bg-gray-800 px-5 py-2.5 rounded-full border border-gray-700">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
          <span className="text-sm font-semibold tracking-wide">SYSTEM OPERATIONAL</span>
        </div>
      </header>

      <audio ref={audioRef} autoPlay />

      <main>
        <div className="flex justify-between items-center mb-8">
           <h2 className="text-xl font-bold text-gray-400 uppercase tracking-[0.2em]">Active Monitor</h2>
           {connectedCallId && (
             <div className="bg-red-500/10 text-red-500 px-5 py-2.5 rounded-xl border border-red-500/20 flex items-center gap-4 backdrop-blur-sm">
               <span className="relative flex h-3 w-3">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
               </span>
               <span className="font-bold text-sm tracking-widest uppercase">Live Handoff: {connectedCallId.slice(-4)}</span>
               <button onClick={handleEndCall} className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded-lg transition-transform active:scale-95">
                 <PhoneOff size={18} />
               </button>
             </div>
           )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {calls.map(call => (
            <div key={call.call_id} className={`bg-gray-800/40 rounded-2xl border p-7 shadow-2xl backdrop-blur-md transition-all duration-300 flex flex-col ${
              connectedCallId === call.call_id ? 'border-green-500 ring-4 ring-green-500/10' : 'border-gray-700 hover:border-blue-500/50 hover:bg-gray-800/60'
            }`}>
              <div className="flex justify-between items-start mb-6">
                <div className="bg-blue-500/10 text-blue-400 text-xs px-3 py-1 rounded-full font-bold border border-blue-500/20 tracking-wider">
                  {call.status}
                </div>
                <span className="text-gray-600 text-[10px] font-mono tracking-widest">{call.call_id}</span>
              </div>
              
              <div className="mb-6 flex-grow">
                <h3 className="text-xl font-bold text-white mb-1">Driver Room</h3>
                <p className="text-gray-400 text-sm font-mono opacity-60 truncate">{call.room_name}</p>
                
                {/* Transcript Area */}
                <div className="mt-4 bg-black/30 rounded-xl p-4 h-48 overflow-y-auto border border-gray-700/50 scrollbar-thin scrollbar-thumb-gray-700">
                  {call.turns && call.turns.length > 0 ? (
                    <div className="space-y-3">
                      {call.turns.map(turn => (
                        <div key={turn.turn_id} className="text-xs">
                          <span className={`font-bold mr-2 uppercase tracking-tighter ${
                            turn.speaker === 'driver' ? 'text-yellow-500' : 'text-blue-400'
                          }`}>
                            {turn.speaker}:
                          </span>
                          <span className="text-gray-300 italic">"{turn.text}"</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-600 italic text-xs">
                       Waiting for conversation...
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-auto">
                <button 
                  disabled={!!connectedCallId}
                  className="flex items-center justify-center gap-2 bg-gray-700/50 hover:bg-gray-700 text-white py-3 px-4 rounded-xl transition-all text-sm font-bold disabled:opacity-30 border border-gray-600"
                >
                  <Phone size={18} className="text-gray-400" />
                  LISTEN
                </button>
                <button 
                  onClick={() => handleTakeOver(call.call_id)}
                  disabled={!!connectedCallId}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 rounded-xl transition-all text-sm font-black tracking-wider shadow-lg shadow-blue-900/40 disabled:opacity-30 active:translate-y-0.5"
                >
                  <UserCheck size={18} />
                  INTERVENE
                </button>
              </div>
            </div>
          ))}
          
          {calls.length === 0 && !connectedCallId && (
            <div className="col-span-full py-32 text-center text-gray-600 bg-gray-800/20 rounded-[2rem] border-2 border-dashed border-gray-800/50 flex flex-col items-center">
              <MessageSquare size={64} className="mb-6 opacity-10" />
              <p className="text-xl font-bold tracking-tight">No Active Intelligence Sessions</p>
              <p className="text-sm mt-2 opacity-60">Real-time calls will materialize here automatically.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
