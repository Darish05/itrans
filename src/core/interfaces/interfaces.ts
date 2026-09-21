import { TextPacket, LatencyMetrics, LanguageConfig } from '../models/types';

export interface STTResult {
  text: string;
  confidence: number;
  language: string;
  durationMs: number;
  processingTimeMs: number;
}

export interface AudioResult {
  audioUrl?: string;
  audioDurationMs: number;
  processingTimeMs: number;
}

export interface STTProvider {
  id: string;
  name: string;
  isOfflineCapable: boolean;
  isSupported(): boolean;
  startListening(language: string, onResult: (result: STTResult) => void, onError: (err: string) => void): void;
  stopListening(): void;
  transcribeAudio(audioBlob: Blob, language: string): Promise<STTResult>;
}

export interface TTSProvider {
  id: string;
  name: string;
  isOfflineCapable: boolean;
  isSupported(): boolean;
  synthesize(text: string, language: string): Promise<AudioResult>;
  speak(text: string, language: string, onStart?: () => void, onEnd?: () => void): Promise<AudioResult>;
  stop(): void;
}

export interface TransportProvider {
  id: string;
  name: string;
  connect(sessionId: string): Promise<boolean>;
  disconnect(): void;
  send(packet: TextPacket): Promise<number>; // returns latency in ms
  onMessage(callback: (packet: TextPacket) => void): void;
  onConnectionChange(callback: (isConnected: boolean) => void): void;
  isConnected(): boolean;
}

export interface MetricsProvider {
  getDeviceMetrics(deviceId: 'PHONE_A' | 'PHONE_B'): LatencyMetrics;
  recordEvent(event: Partial<LatencyMetrics>): void;
}

export interface VoiceActivityDetector {
  start(onSpeechStart: () => void, onPauseDetected: (silenceMs: number) => void): void;
  stop(): void;
  setSilenceThreshold(ms: number): void;
}
