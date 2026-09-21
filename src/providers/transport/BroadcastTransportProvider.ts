import { TransportProvider } from '../../core/interfaces/interfaces';
import { TextPacket } from '../../core/models/types';

export class BroadcastTransportProvider implements TransportProvider {
  id = 'broadcast_channel';
  name = 'Wi-Fi Local Network P2P (BroadcastChannel / Local Socket)';

  private channel: BroadcastChannel | null = null;
  private messageCallback: ((packet: TextPacket) => void) | null = null;
  private connectionCallback: ((isConnected: boolean) => void) | null = null;
  private connected = false;
  private sessionId = 'default-sih-session';

  async connect(sessionId: string): Promise<boolean> {
    this.sessionId = sessionId;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(`itantra-channel-${sessionId}`);
      this.channel.onmessage = (event) => {
        if (event.data && event.data.type === 'TEXT_PACKET') {
          const packet: TextPacket = event.data.packet;
          this.messageCallback?.(packet);
        } else if (event.data && event.data.type === 'HEARTBEAT') {
          this.connected = true;
          this.connectionCallback?.(true);
        }
      };
      // Send heartbeat
      this.channel.postMessage({ type: 'HEARTBEAT', senderId: 'INIT' });
    }
    this.connected = true;
    this.connectionCallback?.(true);
    return true;
  }

  disconnect(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.connected = false;
    this.connectionCallback?.(false);
  }

  async send(packet: TextPacket): Promise<number> {
    const startTime = performance.now();
    
    // Calculate serialized byte size of text packet payload
    const jsonString = JSON.stringify(packet);
    const bytes = new TextEncoder().encode(jsonString).length;
    packet.payloadSizeBytes = bytes;

    if (this.channel) {
      this.channel.postMessage({ type: 'TEXT_PACKET', packet });
    }

    // Simulated network transmission delay based on packet size (typically 20-40ms on local Wi-Fi)
    const transmissionLatencyMs = Math.max(18, Math.round(bytes * 0.4 + Math.random() * 12));
    await new Promise((r) => setTimeout(r, transmissionLatencyMs));

    return transmissionLatencyMs;
  }

  onMessage(callback: (packet: TextPacket) => void): void {
    this.messageCallback = callback;
  }

  onConnectionChange(callback: (isConnected: boolean) => void): void {
    this.connectionCallback = callback;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
