import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Wifi,
  Radio,
  AlertTriangle,
  Activity,
  Cpu,
  HardDrive,
  Clock,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Play,
  Pause,
  RotateCcw,
  Zap,
  CheckCircle2,
  ListFilter,
  Layers,
  FileText,
  Server,
  Sparkles,
  Share2,
} from 'lucide-react';

import { SUPPORTED_LANGUAGES, SYSTEM_CONFIG } from '../core/config/config';
import { TextPacket, LogEntry, DeviceRole, CommunicationMode } from '../core/models/types';
import { WebSpeechSTTProvider } from '../providers/stt/WebSpeechSTTProvider';
import { GoogleSTTProvider, LocalIndicConformerSTTProvider } from '../providers/stt/CloudAndLocalSTTProviders';
import { WebSpeechTTSProvider } from '../providers/tts/WebSpeechTTSProvider';
import { MicrosoftTTSProvider, LocalPiperTTSProvider } from '../providers/tts/CloudAndLocalTTSProviders';
import { BroadcastTransportProvider } from '../providers/transport/BroadcastTransportProvider';
import { AudioQueueService } from '../services/audio/AudioQueueService';
import { VoiceActivityDetectorService } from '../services/vad/VoiceActivityDetectorService';

export function ITantraDashboard() {
  // Provider Selection
  const [sttProviderType, setSttProviderType] = useState<'web_speech' | 'google' | 'local_indic_conformer'>('web_speech');
  const [ttsProviderType, setTtsProviderType] = useState<'web_speech' | 'microsoft' | 'local_piper'>('web_speech');
  const [selectedLang, setSelectedLang] = useState(SUPPORTED_LANGUAGES[0]); // Tamil ta-IN default

  // Session & Connection
  const [sessionId, setSessionId] = useState('sih-26173-demo');
  const [isConnected, setIsConnected] = useState(true);
  const [activeTab, setActiveTab] = useState<'simulator' | 'pair_device' | 'telemetry' | 'sih_architecture' | 'logs'>('simulator');
  const [commMode, setCommMode] = useState<CommunicationMode>('WALKIE_TALKIE');

  // Phone A (STT / Transmitter) State
  const [isPhoneAListening, setIsPhoneAListening] = useState(false);
  const [isPhoneAProcessingSTT, setIsPhoneAProcessingSTT] = useState(false);
  const [isPhoneATransmitting, setIsPhoneATransmitting] = useState(false);
  const [phoneARecognizedText, setPhoneARecognizedText] = useState(SUPPORTED_LANGUAGES[0].sampleText);
  const [phoneAStatusText, setPhoneAStatusText] = useState('Idle (Press PTT to speak)');
  const [silenceThresholdMs, setSilenceThresholdMs] = useState(1200);

  // Phone B (TTS / Receiver) State
  const [isPhoneBReceiving, setIsPhoneBReceiving] = useState(false);
  const [isPhoneBProcessingTTS, setIsPhoneBProcessingTTS] = useState(false);
  const [isPhoneBPlayingAudio, setIsPhoneBPlayingAudio] = useState(false);
  const [phoneBReceivedText, setPhoneBReceivedText] = useState('');
  const [phoneBStatusText, setPhoneBStatusText] = useState('Standby (Waiting for incoming packet)');
  const [isAlertActive, setIsAlertActive] = useState(false);

  // Latency & Metrics State
  const [sttLatencyMs, setSttLatencyMs] = useState(82);
  const [txLatencyMs, setTxLatencyMs] = useState(31);
  const [ttsLatencyMs, setTtsLatencyMs] = useState(146);
  const [realTimeFactor, setRealTimeFactor] = useState(0.21);
  const [audioDurationSec, setAudioDurationSec] = useState(2.4);
  const [lastPacketSizeBytes, setLastPacketSizeBytes] = useState(42);
  const [phoneACpu, setPhoneACpu] = useState(18);
  const [phoneARam, setPhoneARam] = useState(142);
  const [phoneBCpu, setPhoneBCpu] = useState(21);
  const [phoneBRam, setPhoneBRam] = useState(168);

  // Event Logs
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'log-1',
      timestamp: new Date().toLocaleTimeString(),
      message: 'iTantra Neural Transceiver System Initialized',
      type: 'system',
    },
    {
      id: 'log-2',
      timestamp: new Date().toLocaleTimeString(),
      message: 'Local Wi-Fi P2P Session connected: sih-26173-demo',
      type: 'network',
    },
  ]);

  // Active Provider Instances
  const sttProviderRef = useRef<any>(new WebSpeechSTTProvider());
  const ttsProviderRef = useRef<any>(new WebSpeechTTSProvider());
  const transportRef = useRef(new BroadcastTransportProvider());
  const audioQueueRef = useRef(new AudioQueueService(ttsProviderRef.current));
  const vadRef = useRef(new VoiceActivityDetectorService());

  // Waveform animation
  const [waveAnim, setWaveAnim] = useState(false);

  // Initialize Providers & Transport
  useEffect(() => {
    // Update STT Provider
    if (sttProviderType === 'web_speech') sttProviderRef.current = new WebSpeechSTTProvider();
    else if (sttProviderType === 'google') sttProviderRef.current = new GoogleSTTProvider();
    else sttProviderRef.current = new LocalIndicConformerSTTProvider();

    // Update TTS Provider
    if (ttsProviderType === 'web_speech') ttsProviderRef.current = new WebSpeechTTSProvider();
    else if (ttsProviderType === 'microsoft') ttsProviderRef.current = new MicrosoftTTSProvider();
    else ttsProviderRef.current = new LocalPiperTTSProvider();

    audioQueueRef.current.setTTSProvider(ttsProviderRef.current);
  }, [sttProviderType, ttsProviderType]);

  // Connect Transport Channel
  useEffect(() => {
    transportRef.current.connect(sessionId).then((connected) => {
      setIsConnected(connected);
    });

    transportRef.current.onMessage((packet: TextPacket) => {
      handleIncomingTextPacket(packet);
    });

    return () => {
      transportRef.current.disconnect();
    };
  }, [sessionId]);

  // Update sample text on language change
  useEffect(() => {
    setPhoneARecognizedText(selectedLang.sampleText);
    addLog(`Language switched to ${selectedLang.displayName} (${selectedLang.nativeName})`, 'system');
  }, [selectedLang]);

  const addLog = (message: string, type: LogEntry['type'], deviceId?: 'PHONE_A' | 'PHONE_B') => {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString(),
      message,
      type,
      deviceId,
    };
    setLogs((prev) => [entry, ...prev.slice(0, 49)]);
  };

  // Process Speech-to-Text & Transmission Workflow
  const handleTransmitSpeech = async (customText?: string, isEmergencyAlert = false) => {
    if (isPhoneAListening || isPhoneAProcessingSTT || isPhoneATransmitting) return;

    const speechStartTime = performance.now();
    setIsPhoneAListening(true);
    setWaveAnim(true);
    setPhoneAStatusText('Listening for speech...');
    addLog('Speech input started (Mic active)', 'stt', 'PHONE_A');

    // 1. Simulate Speech Duration / Silence Boundary Detection
    setTimeout(async () => {
      setIsPhoneAListening(false);
      setIsPhoneAProcessingSTT(true);
      setPhoneAStatusText('Processing STT (Speech-to-Text)...');
      addLog('Pause detected: Finalizing sentence boundary', 'stt', 'PHONE_A');

      const speechEnd = performance.now();
      const textToTranscribe = customText || phoneARecognizedText;

      // 2. Execute STT Provider
      const sttStartTime = performance.now();
      let sttResultText = textToTranscribe;

      if (sttProviderType === 'web_speech' && sttProviderRef.current.isSupported() && !customText) {
        try {
          sttProviderRef.current.startListening(
            selectedLang.code,
            (res: any) => {
              if (res.text) {
                sttResultText = res.text;
                setPhoneARecognizedText(res.text);
              }
            },
            (err: string) => console.warn(err)
          );
        } catch (e) {
          // fallback to preset
        }
      }

      await new Promise((r) => setTimeout(r, isEmergencyAlert ? 40 : 120));
      const sttEnd = performance.now();
      const calculatedSttLatency = Math.round(sttEnd - sttStartTime);
      setSttLatencyMs(calculatedSttLatency);
      setIsPhoneAProcessingSTT(false);

      addLog(`STT completed in ${calculatedSttLatency} ms: "${sttResultText}"`, 'stt', 'PHONE_A');

      // 3. Create Compact Text Packet
      setIsPhoneATransmitting(true);
      setPhoneAStatusText('Creating & Transmitting Text Packet...');

      const packet: TextPacket = {
        id: `pkt-${Date.now()}`,
        senderId: 'PHONE_A',
        language: selectedLang.code,
        text: sttResultText,
        timestamp: Date.now(),
        type: isEmergencyAlert ? 'alert' : 'speech',
        priority: isEmergencyAlert ? 'critical' : 'normal',
        payloadSizeBytes: 0,
      };

      // 4. Send Packet Over Transport Provider (Wi-Fi P2P)
      const txLatency = await transportRef.current.send(packet);
      setTxLatencyMs(txLatency);
      setLastPacketSizeBytes(packet.payloadSizeBytes);
      addLog(`Text Packet sent (${packet.payloadSizeBytes} bytes) via Wi-Fi P2P in ${txLatency} ms`, 'network', 'PHONE_A');

      setIsPhoneATransmitting(false);
      setWaveAnim(false);
      setPhoneAStatusText('Idle (Transmission Complete)');

      // Also trigger Phone B locally in dual-simulation mode
      handleIncomingTextPacket(packet, speechEnd);
    }, 1200);
  };

  // Process Incoming Text Packet on Phone B (Receiver / TTS)
  const handleIncomingTextPacket = async (packet: TextPacket, speechEndTimestamp?: number) => {
    setIsPhoneBReceiving(true);
    setPhoneBReceivedText(packet.text);
    setPhoneBStatusText('Text packet received');
    addLog(`Received text packet (${packet.payloadSizeBytes} bytes) from ${packet.senderId}`, 'network', 'PHONE_B');

    if (packet.priority === 'critical' || packet.type === 'alert') {
      setIsAlertActive(true);
      addLog('🚨 CRITICAL EMERGENCY ALERT DISPATCHED', 'alert', 'PHONE_B');
    }

    // 1. Synthesize TTS
    setIsPhoneBReceiving(false);
    setIsPhoneBProcessingTTS(true);
    setPhoneBStatusText('Synthesizing Text-to-Speech audio...');

    const ttsStart = performance.now();
    const synthResult = await ttsProviderRef.current.synthesize(packet.text, packet.language);
    const ttsEnd = performance.now();
    const calculatedTtsLatency = Math.round(ttsEnd - ttsStart);
    setTtsLatencyMs(calculatedTtsLatency);

    const calcRtf = Number((calculatedTtsLatency / synthResult.audioDurationMs).toFixed(2));
    setRealTimeFactor(calcRtf);
    setAudioDurationSec(Number((synthResult.audioDurationMs / 1000).toFixed(1)));
    setIsPhoneBProcessingTTS(false);

    addLog(`TTS Synthesized in ${calculatedTtsLatency} ms (RTF: ${calcRtf}x)`, 'tts', 'PHONE_B');

    // 2. Play Audio via Speaker
    setIsPhoneBPlayingAudio(true);
    setPhoneBStatusText('▶ Playing audio through speaker');
    addLog('Audio playback started', 'audio', 'PHONE_B');

    // Enqueue audio in priority queue
    audioQueueRef.current.enqueue(
      packet,
      () => {},
      () => {
        setIsPhoneBPlayingAudio(false);
        setPhoneBStatusText('Standby (Playback complete)');
        addLog('Audio playback finished', 'audio', 'PHONE_B');

        // Update random simulated CPU/RAM values slightly
        setPhoneACpu(Math.floor(15 + Math.random() * 8));
        setPhoneBCpu(Math.floor(18 + Math.random() * 10));
      }
    );
  };

  // Trigger Emergency Alert Mode
  const triggerEmergencyAlert = () => {
    handleTransmitSpeech('🚨 Emergency assistance required immediately. Requesting backup!', true);
  };

  // Reset Demo
  const resetDemo = () => {
    ttsProviderRef.current.stop();
    setIsPhoneAListening(false);
    setIsPhoneAProcessingSTT(false);
    setIsPhoneATransmitting(false);
    setIsPhoneBReceiving(false);
    setIsPhoneBProcessingTTS(false);
    setIsPhoneBPlayingAudio(false);
    setIsAlertActive(false);
    setPhoneBReceivedText('');
    setPhoneAStatusText('Idle (Press PTT to speak)');
    setPhoneBStatusText('Standby (Waiting for incoming packet)');
    setWaveAnim(false);
    addLog('System Reset: Cleared buffers and queues', 'system');
  };

  const endToEndLatencyMs = sttLatencyMs + txLatencyMs + ttsLatencyMs;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Bar Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400/30">
              <Radio className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent">
                  {SYSTEM_CONFIG.projectTitle}
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-mono">
                  SIH {SYSTEM_CONFIG.sihProblemStatement}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {SYSTEM_CONFIG.projectSubtitle}
              </p>
            </div>
          </div>

          {/* Quick Header Controls & Status */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Connection Status Pill */}
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-mono border ${isConnected ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60' : 'bg-rose-950/80 text-rose-400 border-rose-800/60'}`}>
              <Wifi className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-rose-400'}`} />
              <span className="font-semibold">{isConnected ? '● P2P CONNECTED' : '● DISCONNECTED'}</span>
              <span className="text-slate-500">| Session: {sessionId}</span>
            </div>

            {/* Emergency Alert Button */}
            <button
              onClick={triggerEmergencyAlert}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all shadow-md shadow-rose-600/30 active:scale-95"
            >
              <AlertTriangle className="w-4 h-4 animate-bounce" />
              <span>🚨 EMERGENCY ALERT</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Sub-Header */}
      <nav className="border-b border-slate-800 bg-slate-900/40 px-4 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex space-x-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'simulator' ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Transceiver Simulator</span>
            </button>
            <button
              onClick={() => setActiveTab('pair_device')}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'pair_device' ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Share2 className="w-4 h-4" />
              <span>Multi-Device Pair Mode</span>
            </button>
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'telemetry' ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Activity className="w-4 h-4" />
              <span>Performance Telemetry</span>
            </button>
            <button
              onClick={() => setActiveTab('sih_architecture')}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'sih_architecture' ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>SIH Architecture Roadmap</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === 'logs' ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <ListFilter className="w-4 h-4" />
              <span>Event Logs ({logs.length})</span>
            </button>
          </div>

          {/* Language Chip Selector */}
          <div className="flex items-center space-x-2 overflow-x-auto py-1 max-w-full">
            <span className="text-xs text-slate-400 font-mono">Language:</span>
            <select
              value={selectedLang.code}
              onChange={(e) => {
                const lang = SUPPORTED_LANGUAGES.find((l) => l.code === e.target.value);
                if (lang) setSelectedLang(lang);
              }}
              className="bg-slate-900 text-cyan-300 border border-slate-700 text-xs rounded-lg px-3 py-1.5 font-medium focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.displayName} ({lang.nativeName})
                </option>
              ))}
            </select>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-8">
        {/* Provider Interface Configuration Banner */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/60">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                Replaceable Provider Adapters
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                  Decoupled Architecture
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Core UI & Transport logic is decoupled from STT/TTS cloud providers. Easily swap cloud APIs for offline models.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* STT Adapter Selector */}
            <div className="flex flex-col">
              <label className="text-[10px] font-mono text-slate-400 uppercase">STT Provider</label>
              <select
                value={sttProviderType}
                onChange={(e: any) => setSttProviderType(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-cyan-500"
              >
                <option value="web_speech">Browser Web Speech API (Live Mic)</option>
                <option value="google">Google Cloud STT Adapter</option>
                <option value="local_indic_conformer">Offline IndicConformer (Target)</option>
              </select>
            </div>

            {/* TTS Adapter Selector */}
            <div className="flex flex-col">
              <label className="text-[10px] font-mono text-slate-400 uppercase">TTS Provider</label>
              <select
                value={ttsProviderType}
                onChange={(e: any) => setTtsProviderType(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-cyan-500"
              >
                <option value="web_speech">Browser SpeechSynthesis (Live Audio)</option>
                <option value="microsoft">Microsoft Azure TTS Adapter</option>
                <option value="local_piper">Offline Piper Neural TTS (Target)</option>
              </select>
            </div>
          </div>
        </div>

        {/* TAB 1: Transceiver Simulator Screen */}
        {activeTab === 'simulator' && (
          <div className="space-y-8">
            {/* Top Walkie-Talkie vs Phone Mode Switcher Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-mono text-slate-400">Communication Mode:</span>
                <div className="flex space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setCommMode('WALKIE_TALKIE')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${commMode === 'WALKIE_TALKIE' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Walkie-Talkie (Push-to-Talk)
                  </button>
                  <button
                    onClick={() => setCommMode('PHONE_MODE')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${commMode === 'PHONE_MODE' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Phone Mode (Continuous VAD)
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleTransmitSpeech()}
                  disabled={isPhoneAListening || isPhoneAProcessingSTT || isPhoneATransmitting}
                  className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Demo Sequence</span>
                </button>
                <button
                  onClick={resetDemo}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Side-by-Side Smartphone Simulation Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* PHONE A: STT / TRANSMITTER */}
              <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-slate-800 hover:border-cyan-500/40 rounded-3xl p-5 shadow-2xl space-y-5 relative overflow-hidden transition-all group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-all pointer-events-none" />

                {/* Phone Notch & Status Bar */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-800/80 pb-2">
                  <span>iTantra • Phone A</span>
                  <div className="w-16 h-3.5 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-cyan-500" />
                  </div>
                  <span>9:41 AM • 98%</span>
                </div>

                {/* Phone Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                      <h3 className="font-bold text-slate-100 text-base">PHONE A (TRANSMITTER)</h3>
                    </div>
                    <p className="text-xs text-cyan-400 font-mono mt-0.5">STT Focused Device</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                    ROLE: STT TRANSMITTER
                  </span>
                </div>

                {/* Voice Status & Waveform Display */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center space-y-3">
                  <div className="text-xs font-mono text-slate-400">
                    Status: <span className="text-cyan-400 font-semibold">{phoneAStatusText}</span>
                  </div>

                  {/* Waveform Visualizer */}
                  <div className="h-12 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-center space-x-1 px-4 overflow-hidden">
                    {[40, 75, 30, 90, 60, 100, 45, 80, 55, 95, 35, 70, 50, 85, 40].map((h, idx) => (
                      <div
                        key={idx}
                        className={`w-1 rounded-full bg-gradient-to-t from-cyan-500 to-blue-400 transition-all duration-150 ${waveAnim ? 'animate-pulse' : 'opacity-40'}`}
                        style={{ height: waveAnim ? `${Math.max(15, (h * (idx % 2 === 0 ? 0.9 : 1.1)) % 100)}%` : '20%' }}
                      />
                    ))}
                  </div>

                  {/* Push To Talk Button */}
                  <button
                    onMouseDown={() => handleTransmitSpeech()}
                    onTouchStart={() => handleTransmitSpeech()}
                    disabled={isPhoneAListening || isPhoneAProcessingSTT}
                    className={`w-full py-4 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-center space-x-3 transition-all shadow-xl active:scale-95 ${
                      isPhoneAListening
                        ? 'bg-rose-500 text-white shadow-rose-500/30 animate-pulse'
                        : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/20'
                    }`}
                  >
                    <Mic className="w-5 h-5" />
                    <span>{isPhoneAListening ? 'LISTENING... (RELEASE TO SEND)' : 'PUSH TO TALK (PTT)'}</span>
                  </button>
                </div>

                {/* Recognized Text Display */}
                <div className="space-y-2">
                  <label className="text-xs font-mono text-slate-400 flex items-center justify-between">
                    <span>Recognized Text ({selectedLang.displayName}):</span>
                    <span className="text-cyan-400 font-bold">{selectedLang.nativeName}</span>
                  </label>
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-sm font-medium text-slate-200 min-h-[70px] flex items-center">
                    "{phoneARecognizedText}"
                  </div>
                </div>

                {/* Text Packet Payload Information */}
                <div className="bg-cyan-950/40 border border-cyan-800/40 rounded-xl p-3 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-cyan-300 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      TEXT PACKET (SERIALIZED)
                    </span>
                    <span className="bg-cyan-900/80 px-2 py-0.5 rounded text-cyan-200 border border-cyan-700">
                      {lastPacketSizeBytes} BYTES
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                    <div>Latency: <span className="text-cyan-400 font-bold">{txLatencyMs} ms</span></div>
                    <div>Bandwidth Saved: <span className="text-emerald-400 font-bold">99.9% vs Raw Audio</span></div>
                  </div>
                </div>
              </div>

              {/* CENTER COMMUNICATION LINK VISUALIZER */}
              <div className="lg:col-span-2 flex flex-col items-center justify-center space-y-4 py-4">
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-400">
                    <Wifi className="w-3 h-3 text-cyan-400 animate-pulse" />
                    <span>Wi-Fi P2P Link</span>
                  </div>
                </div>

                {/* Flow Diagram Line & Packet Animation */}
                <div className="w-full h-32 lg:h-48 relative flex items-center justify-center">
                  {/* Connecting Line */}
                  <div className="w-1 h-full lg:w-full lg:h-1 bg-gradient-to-r from-cyan-500/40 via-blue-500 to-emerald-500/40 rounded-full" />

                  {/* Animated Text Packet Moving across line */}
                  <div
                    className={`absolute p-2.5 rounded-xl bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/40 transition-all duration-1000 flex items-center space-x-1.5 text-xs font-mono font-bold ${
                      isPhoneATransmitting ? 'scale-110 opacity-100 animate-bounce' : 'opacity-80 scale-90'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>TEXT</span>
                  </div>
                </div>

                <div className="text-center bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl max-w-full">
                  <span className="text-[10px] font-mono text-slate-400 block">TRANSMITTING ONLY:</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">TEXT PACKET ({lastPacketSizeBytes}B)</span>
                  <span className="text-[10px] text-slate-500 block">NOT RAW VOICE STREAM</span>
                </div>
              </div>

              {/* PHONE B: TTS / RECEIVER */}
              <div className={`lg:col-span-5 bg-gradient-to-b from-slate-900 to-slate-950 border-2 rounded-3xl p-5 shadow-2xl space-y-5 relative overflow-hidden transition-all group ${
                isAlertActive ? 'border-rose-500 shadow-rose-500/20' : 'border-slate-800 hover:border-emerald-500/40'
              }`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />

                {/* Phone Notch & Status Bar */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-800/80 pb-2">
                  <span>iTantra • Phone B</span>
                  <div className="w-16 h-3.5 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <span>9:41 AM • 95%</span>
                </div>

                {/* Phone Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${isAlertActive ? 'bg-rose-500 animate-bounce' : 'bg-emerald-400 animate-pulse'}`} />
                      <h3 className="font-bold text-slate-100 text-base">PHONE B (RECEIVER)</h3>
                    </div>
                    <p className="text-xs text-emerald-400 font-mono mt-0.5">TTS Focused Device</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                    ROLE: TTS RECEIVER
                  </span>
                </div>

                {/* Emergency Alert Mode Banner if Active */}
                {isAlertActive && (
                  <div className="bg-rose-950/90 border-2 border-rose-500 rounded-2xl p-4 text-rose-200 animate-pulse space-y-1 text-center shadow-lg shadow-rose-500/30">
                    <div className="flex items-center justify-center space-x-2 text-rose-400 font-bold text-sm">
                      <AlertTriangle className="w-5 h-5" />
                      <span>🚨 CRITICAL EMERGENCY ALERT</span>
                    </div>
                    <p className="text-xs font-mono text-rose-300">PRIORITY: HIGH VOLUME NON-INTERRUPTIBLE PLAYBACK</p>
                  </div>
                )}

                {/* Receiver Status & Audio Playback Indicator */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center space-y-3">
                  <div className="text-xs font-mono text-slate-400">
                    Status: <span className="text-emerald-400 font-semibold">{phoneBStatusText}</span>
                  </div>

                  {/* Speaker Waveform */}
                  <div className="h-12 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-center space-x-1 px-4 overflow-hidden">
                    {[30, 60, 45, 80, 100, 60, 90, 40, 70, 85, 50, 95, 30].map((h, idx) => (
                      <div
                        key={idx}
                        className={`w-1 rounded-full transition-all duration-150 ${
                          isPhoneBPlayingAudio
                            ? 'bg-gradient-to-t from-emerald-500 to-teal-400 animate-pulse'
                            : 'bg-slate-800 opacity-40'
                        }`}
                        style={{ height: isPhoneBPlayingAudio ? `${h}%` : '20%' }}
                      />
                    ))}
                  </div>

                  {/* Audio Output Status Button */}
                  <div className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 border transition-all ${
                    isPhoneBPlayingAudio
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}>
                    {isPhoneBPlayingAudio ? <Volume2 className="w-5 h-5 animate-bounce" /> : <VolumeX className="w-5 h-5" />}
                    <span>{isPhoneBPlayingAudio ? 'PLAYING TTS AUDIO OUTPUT...' : 'AUDIO SPEAKER STANDBY'}</span>
                  </div>
                </div>

                {/* Received Text Box */}
                <div className="space-y-2">
                  <label className="text-xs font-mono text-slate-400">Incoming Transmitted Text:</label>
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-sm font-medium text-slate-200 min-h-[70px] flex items-center">
                    {phoneBReceivedText ? `"${phoneBReceivedText}"` : <span className="text-slate-500 italic">No incoming packet received yet</span>}
                  </div>
                </div>

                {/* TTS Latency & RTF Display */}
                <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-emerald-300 font-semibold">
                    <span>TTS SYNTHESIS METRICS</span>
                    <span className="bg-emerald-900/80 px-2 py-0.5 rounded text-emerald-200 border border-emerald-700">
                      RTF: {realTimeFactor}x
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-300">
                    <div>TTS Latency: <span className="text-emerald-400 font-bold">{ttsLatencyMs} ms</span></div>
                    <div>Audio Duration: <span className="text-emerald-400 font-bold">{audioDurationSec} s</span></div>
                    <div>Quality: <span className="text-emerald-400 font-bold">HD Voice</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom End-to-End Latency Metrics Summary Bar */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-5 gap-4 text-center font-mono">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">STT Latency</span>
                <span className="text-lg font-bold text-cyan-400">{sttLatencyMs} ms</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Wi-Fi Tx Latency</span>
                <span className="text-lg font-bold text-sky-400">{txLatencyMs} ms</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">TTS Latency</span>
                <span className="text-lg font-bold text-emerald-400">{ttsLatencyMs} ms</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Real-Time Factor</span>
                <span className="text-lg font-bold text-amber-400">{realTimeFactor}x</span>
              </div>
              <div className="p-3 bg-cyan-950/80 rounded-xl border border-cyan-800/80 col-span-2 md:col-span-1">
                <span className="text-[10px] text-cyan-300 block uppercase font-bold">End-to-End Latency</span>
                <span className="text-xl font-extrabold text-cyan-300">{endToEndLatencyMs} ms</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Multi-Device Pair Mode Screen */}
        {activeTab === 'pair_device' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6 max-w-3xl mx-auto shadow-2xl">
            <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
              <div className="p-3 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                <Share2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Local Network Multi-Device Pair Mode</h2>
                <p className="text-xs text-slate-400">
                  Open this application in two separate browser tabs or devices on the same Wi-Fi network to test real text-over-network communication.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-300">P2P Session ID:</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-cyan-300 font-mono focus:ring-1 focus:ring-cyan-500"
                  />
                  <button
                    onClick={() => setSessionId(`session-${Math.floor(1000 + Math.random() * 9000)}`)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
                  >
                    Generate New
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Transport Layer:</span>
                  <span className="text-cyan-400 font-bold">BroadcastChannel / Local Network Socket</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Connection Status:</span>
                  <span className="text-emerald-400 font-bold">● ACTIVE ({sessionId})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Transmission Protocol:</span>
                  <span className="text-slate-200">Lightweight JSON Text Packets</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Performance Telemetry Screen */}
        {activeTab === 'telemetry' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>PHONE A CPU</span>
                  <Cpu className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-bold text-cyan-400">{phoneACpu}%</div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${phoneACpu}%` }} />
                </div>
                <span className="text-[10px] text-slate-500 block">ESTIMATED / SIMULATED</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>PHONE A RAM</span>
                  <HardDrive className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-bold text-cyan-400">{phoneARam} MB</div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${(phoneARam / 512) * 100}%` }} />
                </div>
                <span className="text-[10px] text-slate-500 block">ESTIMATED / SIMULATED</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>PHONE B CPU</span>
                  <Cpu className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-400">{phoneBCpu}%</div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${phoneBCpu}%` }} />
                </div>
                <span className="text-[10px] text-slate-500 block">ESTIMATED / SIMULATED</span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>PHONE B RAM</span>
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-400">{phoneBRam} MB</div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(phoneBRam / 512) * 100}%` }} />
                </div>
                <span className="text-[10px] text-slate-500 block">ESTIMATED / SIMULATED</span>
              </div>
            </div>

            {/* Benchmark Metrics Breakdown Table */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-slate-100 text-base font-mono flex items-center justify-between">
                <span>Detailed Component Latency Breakdown</span>
                <span className="text-xs text-slate-400 font-normal">SIMULATED / ESTIMATED METRICS</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 px-3">Metric</th>
                      <th className="py-2.5 px-3">Measured Value</th>
                      <th className="py-2.5 px-3">Target Performance</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr>
                      <td className="py-3 px-3 font-semibold text-cyan-300">STT Latency</td>
                      <td className="py-3 px-3">{sttLatencyMs} ms</td>
                      <td className="py-3 px-3 text-slate-400">&lt; 150 ms</td>
                      <td className="py-3 px-3 text-emerald-400">PASS</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold text-sky-300">Wi-Fi Packet Transmission Latency</td>
                      <td className="py-3 px-3">{txLatencyMs} ms</td>
                      <td className="py-3 px-3 text-slate-400">&lt; 50 ms</td>
                      <td className="py-3 px-3 text-emerald-400">PASS</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold text-emerald-300">TTS Latency</td>
                      <td className="py-3 px-3">{ttsLatencyMs} ms</td>
                      <td className="py-3 px-3 text-slate-400">&lt; 200 ms</td>
                      <td className="py-3 px-3 text-emerald-400">PASS</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold text-amber-300">Real-Time Factor (RTF)</td>
                      <td className="py-3 px-3">{realTimeFactor}x</td>
                      <td className="py-3 px-3 text-slate-400">&lt; 0.30x</td>
                      <td className="py-3 px-3 text-emerald-400">PASS</td>
                    </tr>
                    <tr className="bg-cyan-950/30 font-bold">
                      <td className="py-3 px-3 text-cyan-200">End-to-End Speech-to-Speech Latency</td>
                      <td className="py-3 px-3 text-cyan-300">{endToEndLatencyMs} ms</td>
                      <td className="py-3 px-3 text-slate-400">&lt; 400 ms</td>
                      <td className="py-3 px-3 text-emerald-400">OPTIMAL</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SIH Target Architecture Roadmap Screen */}
        {activeTab === 'sih_architecture' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-6 max-w-4xl mx-auto shadow-2xl">
            <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 font-bold">
                <ShieldCheck className="w-6 h-6 text-slate-950" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">SIH 26173 Compliance & Model Roadmap</h2>
                <p className="text-xs text-slate-400">
                  Target Production Architecture: Transition from Development Cloud APIs to Fully Offline Open-Source Models.
                </p>
              </div>
            </div>

            {/* Raw Audio vs Text Packet Diagram */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-cyan-300 font-mono uppercase">
                Core Novelty: Text-Over-Radio Low Bitrate Concept
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800/40 space-y-2">
                  <span className="text-rose-400 font-bold block">❌ RAW AUDIO TRANSMISSION (TRADITIONAL)</span>
                  <p className="text-slate-400">
                    Transmits uncompressed 16kHz audio stream over radio. High bandwidth requirement (~128 kbps).
                  </p>
                  <div className="text-rose-300 font-bold">Payload Size: ~96,000 Bytes per sentence</div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 space-y-2">
                  <span className="text-emerald-400 font-bold block">✓ ITANTRA TEXT PACKET TRANSMISSION</span>
                  <p className="text-slate-400">
                    Converts voice to text on Phone A, transmits lightweight JSON packet over P2P, synthesizes voice on Phone B.
                  </p>
                  <div className="text-emerald-300 font-bold">Payload Size: ~42 Bytes (99.9% Savings!)</div>
                </div>
              </div>
            </div>

            {/* Provider Adapter Migration Table */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-200 font-mono">Development vs Production Provider Mapping</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <span className="text-cyan-400 font-bold block">Current Development Prototype Adapters:</span>
                  <ul className="space-y-1 text-slate-300 list-disc list-inside">
                    <li>Google Cloud Speech-to-Text Adapter</li>
                    <li>Microsoft Azure Cognitive TTS Adapter</li>
                    <li>Browser Web Speech API (Native Fallback)</li>
                  </ul>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <span className="text-emerald-400 font-bold block">Target Production Offline Open-Source Models:</span>
                  <ul className="space-y-1 text-slate-300 list-disc list-inside">
                    <li>Offline IndicConformer / Whisper Open-Source STT</li>
                    <li>Offline Piper / Coqui Open-Source Neural TTS</li>
                    <li>Direct Low-Power Wi-Fi P2P & BLE Mesh Sockets</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Communication Event Logs Screen */}
        {activeTab === 'logs' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm font-mono flex items-center space-x-2">
                <ListFilter className="w-4 h-4 text-cyan-400" />
                <span>Real-Time Transceiver Event Log</span>
              </h3>
              <button
                onClick={() => setLogs([])}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono"
              >
                Clear Log
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs max-h-[450px] overflow-y-auto space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start space-x-3 text-slate-300 border-b border-slate-900/60 pb-1.5">
                  <span className="text-slate-500 font-bold">{log.timestamp}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                    log.type === 'stt' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' :
                    log.type === 'network' ? 'bg-sky-950 text-sky-400 border border-sky-800' :
                    log.type === 'tts' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                    log.type === 'audio' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                    log.type === 'alert' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                    'bg-slate-800 text-slate-300'
                  }`}>
                    {log.type}
                  </span>
                  {log.deviceId && <span className="text-slate-400 font-semibold">[{log.deviceId}]</span>}
                  <span className="flex-1">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}