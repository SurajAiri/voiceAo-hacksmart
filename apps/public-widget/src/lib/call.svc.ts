import axios from "axios";

const API_BASE = "/api"; 

export interface CallInfo {
  call_id: string;
  room_name: string;
  access_token: string;
}

export const callService = {
  /**
   * Creates a new call and returns connection info.
   */
  async startCall(): Promise<CallInfo> {
    const res = await axios.post(`${API_BASE}/calls`, {
      source: "web_widget",
    });
    return res.data;
  },

  /**
   * Ends the call.
   */
  async endCall(callId: string): Promise<void> {
    await axios.post(`${API_BASE}/calls/${callId}/end`);
  },

  async signalStart(callId: string): Promise<void> {
    await axios.post(`${API_BASE}/calls/${callId}/start`);
  }
};
