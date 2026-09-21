export type DeviceRole = 'TRANSMITTER' | 'RECEIVER';

export type CommunicationMode = 'WALKIE_TALKIE' | 'PHONE_MODE';

export type ConnectionType = 'WIFI' | 'BLUETOOTH';

export type PacketType = 'speech' | 'alert';

export type PacketPriority = 'normal' | 'high' | 'critical';

export interface TextPacket {
  id: string;
  senderId: string;
  language: string;
  text: string;
  timestamp: number;
  type: PacketType;
  priority: PacketPriority;
  payloadSizeBytes: number;
}

export interface LanguageConfig {
  code: string;
  displayName: string;
  nativeName: string;
  sttSupport: boolean;
  ttsSupport: boolean;
  sampleText: string;
}

export interface LatencyMetrics {
  speechDurationMs: number;
  sttLatencyMs: number;
  transmissionLatencyMs: number;
  ttsLatencyMs: number;
  endToEndLatencyMs: number;
  realTimeFactor: number; // RTF = ttsProcessingTime / audioDuration
  packetSizeBytes: number;
  cpuUsagePct: number;
  ramUsageMb: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'stt' | 'network' | 'tts' | 'audio' | 'alert' | 'system';
  deviceId?: 'PHONE_A' | 'PHONE_B';
}

export interface DeviceState {
  id: 'PHONE_A' | 'PHONE_B';
  name: string;
  role: DeviceRole;
  isListening: boolean;
  isProcessingSTT: boolean;
  isTransmitting: boolean;
  isProcessingTTS: boolean;
  isPlayingAudio: boolean;
  currentLanguage: string;
  recognizedText: string;
  receivedText: string;
  sttStatusText: string;
  ttsStatusText: string;
  isEmergencyAlertActive: boolean;
}

export type STTProviderType = 'web_speech' | 'google' | 'local_indic_conformer';
export type TTSProviderType = 'web_speech' | 'microsoft' | 'local_piper';
export type TransportProviderType = 'broadcast_channel' | 'websocket' | 'bluetooth_sim';
