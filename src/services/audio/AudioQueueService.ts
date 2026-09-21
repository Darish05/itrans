import { TextPacket } from '../../core/models/types';
import { TTSProvider } from '../../core/interfaces/interfaces';

export class AudioQueueService {
  private queue: TextPacket[] = [];
  private isProcessing = false;
  private processedIds = new Set<string>();

  constructor(private ttsProvider: TTSProvider) {}

  public setTTSProvider(provider: TTSProvider) {
    this.ttsProvider = provider;
  }

  public enqueue(packet: TextPacket, onStartPlayback?: (p: TextPacket) => void, onEndPlayback?: (p: TextPacket) => void) {
    if (this.processedIds.has(packet.id)) return;
    this.processedIds.add(packet.id);

    if (packet.priority === 'critical' || packet.type === 'alert') {
      // Preempt queue: insert at front
      this.queue.unshift(packet);
    } else {
      this.queue.push(packet);
    }

    this.processQueue(onStartPlayback, onEndPlayback);
  }

  private async processQueue(onStartPlayback?: (p: TextPacket) => void, onEndPlayback?: (p: TextPacket) => void) {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const current = this.queue.shift();
      if (!current) break;

      onStartPlayback?.(current);
      await this.ttsProvider.speak(current.text, current.language);
      onEndPlayback?.(current);
    }

    this.isProcessing = false;
  }

  public clearQueue() {
    this.queue = [];
    this.ttsProvider.stop();
    this.isProcessing = false;
  }
}
