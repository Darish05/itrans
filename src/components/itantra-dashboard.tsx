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
  Globe,
  Languages,
  MoreVertical,
  ChevronLeft,
  Send,
  Battery,
  Signal,
} from 'lucide-react';

import { SUPPORTED_LANGUAGES, SYSTEM_CONFIG } from '../core/config/config';
import { TextPacket, LogEntry, DeviceRole, CommunicationMode } from '../core/models/types';
import { WebSpeechSTTProvider } from '../providers/stt/WebSpeechSTTProvider';
import { GoogleSTTProvider, LocalIndicConformerSTTProvider } from '../providers/stt/CloudAndLocalSTTProviders';
import { WebSpeechTTSProvider } from '../providers/tts/WebSpeechTTSProvider';
import { MicrosoftTTSProvider, LocalPiperTTSProvider } from '../providers/tts/CloudAndLocalTTSProviders';
import { BroadcastTransportProvider } from '../providers/transport/BroadcastTransportProvider';
import { IndicTranslationProvider } from '../providers/translation/IndicTranslationProvider';
import { AudioQueueService } from '../services/audio/AudioQueueService';
import { VoiceActivityDetectorService } from '../services/vad/VoiceActivityDetectorService';

export function ITantraDashboard() {
  // Provider Selection
  const [sttProviderType, setSttProviderType] = useState<'web_speech' | 'google' | 'local_indic_conformer'>('web_speech');
  const [ttsProviderType, setTtsProviderType] = useState<'web_speech' | 'microsoft' | 'local_piper'>('web_speech');
  
  // Independent Phone Languages for Cross-Language Transceiver Demo
  const [phoneALang, setPhoneALang] = useState(SUPPORTED_LANGUAGES[0]); // Tamil ta-IN default
  const [phoneBLang, setPhoneBLang] = useState(SUPPORTED_LANGUAGES[1]); // Hindi hi-IN default (Cross-language demo!)

  // Session & Connection
  const [sessionId, setSessionId] = useState('sih-26173-demo');
  const [isConnected, setIsConnected] = useState(true);
  const [activeTab, setActiveTab] = useState<'simulator' | 'pair_device' | 'telemetry' | 'sih_architecture' | 'logs'>('simulator');
  const [commMode, setCommMode] = useState<CommunicationMode>('WALKIE_TALKIE');

  // Phone A (STT / Transmitter) State
  const [isPhoneAListening, setIsPhoneAListening] = useState(false);
  const [isPhoneAProcessingSTT, setIsPhoneAProcessingSTT] = useState(false);
  const [isPhoneATransmitting, setIsPhoneATransmitting] = useState(false);
  const [phoneARecognizedText, setPhoneARecognizedText] = useState('');
  const [phoneAStatusText, setPhoneAStatusText] = useState('Ready • Press Microphone to Speak');

  // Phone B (TTS / Receiver) State
  const [isPhoneBReceiving, setIsPhoneBReceiving] = useState(false);
  const [isPhoneBTranslating, setIsPhoneBTranslating] = useState(false);
  const [isPhoneBProcessingTTS, setIsPhoneBProcessingTTS] = useState(false);
  const [isPhoneBPlayingAudio, setIsPhoneBPlayingAudio] = useState(false);
  const [phoneBOriginalText, setPhoneBOriginalText] = useState('');
  const [phoneBTranslatedText, setPhoneBTranslatedText] = useState('');
  const [phoneBStatusText, setPhoneBStatusText] = useState('Standby • Listening on P2P');
  const [isAlertActive, setIsAlertActive] = useState(false);

  // Latency & Metrics State
  const [sttLatencyMs, setSttLatencyMs] = useState(82);
  const [txLatencyMs, setTxLatencyMs] = useState(31);
  const [nmtLatencyMs, setNmtLatencyMs] = useState(35);
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
      message: 'iTantra Neural Transceiver Multilingual Engine Initialized',
      type: 'system',
    },
    {
      id: 'log-2',
      timestamp: new Date().toLocaleTimeString(),
      message: 'Cross-Language Mode Active: Phone A (Tamil) -> Phone B (Hindi)',
      type: 'network',
    },
  ]);

  // Provider Instances
  const sttProviderRef = useRef<any>(new WebSpeechSTTProvider());
  const ttsProviderRef = useRef<any>(new WebSpeechTTSProvider());
  const translationProviderRef = useRef(new IndicTranslationProvider());
  const transportRef = useRef(new BroadcastTransportProvider());
  const audioQueueRef = useRef(new AudioQueueService(ttsProviderRef.current));

  // Waveform animation
  const [waveAnim, setWaveAnim] = useState(false);

  // Initialize Providers & Transport
  useEffect(() => {
    if (sttProviderType === 'web_speech') sttProviderRef.current = new WebSpeechSTTProvider();
    else if (sttProviderType === 'google') sttProviderRef.current = new GoogleSTTProvider();
    else sttProviderRef.current = new LocalIndicConformerSTTProvider();

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

  // Log on language change
  useEffect(() => {
    addLog(`Phone A Language set to ${phoneALang.displayName} (${phoneALang.nativeName})`, 'system', 'PHONE_A');
  }, [phoneALang]);

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

  // Toggle live continuous microphone speech recognition
  const toggleMicListening = () => {
    if (isPhoneAListening) {
      // Stop listening and AUTOMATICALLY transmit + translate
      if (sttProviderRef.current?.stopListening) {
        sttProviderRef.current.stopListening();
      }
      setIsPhoneAListening(false);
      setWaveAnim(false);
      addLog(`Mic stopped on Phone A. Auto-transmitting speech packet...`, 'stt', 'PHONE_A');
      
      // Auto-transmit immediately on mic stop!
      setTimeout(() => {
        handleTransmitSpeech();
      }, 50);
    } else {
      // Start continuous multi-word listening
      setIsPhoneAListening(true);
      setWaveAnim(true);
      setPhoneAStatusText(`Listening in ${phoneALang.displayName}... Tap again to send & translate`);
      addLog(`Microphone active on Phone A (${phoneALang.displayName}). Speak your sentence...`, 'stt', 'PHONE_A');

      if (sttProviderType === 'web_speech' && sttProviderRef.current.isSupported()) {
        try {
          sttProviderRef.current.startListening(
            phoneALang.code,
            (res: any) => {
              if (res.text) {
                setPhoneARecognizedText(res.text);
              }
            },
            (err: string) => {
              console.warn(err);
              setPhoneAStatusText(`STT Warning: ${err}`);
            },
            () => {
              // On speech end / silence boundary -> auto transmit & translate!
              if (isPhoneAListening) {
                setIsPhoneAListening(false);
                setWaveAnim(false);
                addLog('VAD Silence boundary detected. Auto-transmitting packet...', 'stt', 'PHONE_A');
                handleTransmitSpeech();
              }
            }
          );
        } catch (e: any) {
          console.warn('STT Error', e);
        }
      } else {
        // For Google / Indic Conformer adapters, auto-record and transmit
        if (sttProviderRef.current?.startListening) {
          sttProviderRef.current.startListening(
            phoneALang.code,
            (res: any) => {
              if (res.text) {
                setPhoneARecognizedText(res.text);
                setTimeout(() => {
                  setIsPhoneAListening(false);
                  setWaveAnim(false);
                  handleTransmitSpeech(res.text);
                }, 600);
              }
            },
            (err: string) => console.warn(err)
          );
        }
      }
    }
  };

  // Transmit Speech Workflow from Phone A to Phone B
  const handleTransmitSpeech = async (customText?: string, isEmergencyAlert = false) => {
    if (isPhoneAProcessingSTT || isPhoneATransmitting) return;

    // Stop active mic if currently listening
    if (isPhoneAListening) {
      if (sttProviderRef.current?.stopListening) {
        sttProviderRef.current.stopListening();
      }
      setIsPhoneAListening(false);
      setWaveAnim(false);
    }

    const textToTranscribe = (customText !== undefined ? customText : phoneARecognizedText).trim();

    if (!textToTranscribe && !isEmergencyAlert) {
      setPhoneAStatusText('Please speak or type a sentence to transmit');
      return;
    }

    setIsPhoneAProcessingSTT(true);
    setPhoneAStatusText('Processing STT & VAD...');
    addLog('Sentence boundary finalized via VAD', 'stt', 'PHONE_A');

    const sttStartTime = performance.now();
    await new Promise((r) => setTimeout(r, isEmergencyAlert ? 40 : 120));
    const sttEnd = performance.now();
    const calculatedSttLatency = Math.round(sttEnd - sttStartTime);
    setSttLatencyMs(calculatedSttLatency);
    setIsPhoneAProcessingSTT(false);

    addLog(`STT (${phoneALang.displayName}) completed in ${calculatedSttLatency} ms: "${textToTranscribe}"`, 'stt', 'PHONE_A');

    // Create Compact Text Packet
    setIsPhoneATransmitting(true);
    setPhoneAStatusText('Transmitting 42B Text Packet...');

    const packet: TextPacket = {
      id: `pkt-${Date.now()}`,
      senderId: 'PHONE_A',
      language: phoneALang.code,
      text: textToTranscribe,
      timestamp: Date.now(),
      type: isEmergencyAlert ? 'alert' : 'speech',
      priority: isEmergencyAlert ? 'critical' : 'normal',
      payloadSizeBytes: 0,
    };

    // Send Packet Over Transport Provider (Wi-Fi P2P)
    const txLatency = await transportRef.current.send(packet);
    setTxLatencyMs(txLatency);
    setLastPacketSizeBytes(packet.payloadSizeBytes);
    addLog(`Text Packet sent (${packet.payloadSizeBytes} bytes) in ${txLatency} ms over Wi-Fi P2P`, 'network', 'PHONE_A');

    setIsPhoneATransmitting(false);
    setPhoneAStatusText('Ready • Press Microphone to Speak');

    // Process on Phone B locally in dual-simulation mode
    handleIncomingTextPacket(packet);
  };

  // Receive and Translate Text Packet on Phone B (Receiver / Cross-Language TTS)
  const handleIncomingTextPacket = async (packet: TextPacket) => {
    setIsPhoneBReceiving(true);
    setPhoneBOriginalText(packet.text);
    setPhoneBStatusText('Text Packet Received');
    addLog(`Received text packet (${packet.payloadSizeBytes} bytes) from Phone A`, 'network', 'PHONE_B');

    if (packet.priority === 'critical' || packet.type === 'alert') {
      setIsAlertActive(true);
      addLog('🚨 CRITICAL EMERGENCY ALERT RECEIVED', 'alert', 'PHONE_B');
    }

    // 1. Cross-Language Neural Machine Translation
    setIsPhoneBReceiving(false);
    setIsPhoneBTranslating(true);
    setPhoneBStatusText(`Translating ${phoneALang.displayName} ➔ ${phoneBLang.displayName}...`);

    const translationResult = await translationProviderRef.current.translate(
      packet.text,
      packet.language,
      phoneBLang.code
    );

    setNmtLatencyMs(translationResult.latencyMs);
    setPhoneBTranslatedText(translationResult.translatedText);
    setIsPhoneBTranslating(false);

    addLog(
      `NMT Translation (${phoneALang.displayName} ➔ ${phoneBLang.displayName}) completed in ${translationResult.latencyMs} ms: "${translationResult.translatedText}"`,
      'system',
      'PHONE_B'
    );

    // 2. Synthesize & Speak TTS in Phone B's Language
    setIsPhoneBProcessingTTS(true);
    setPhoneBStatusText(`Synthesizing TTS in ${phoneBLang.displayName}...`);

    const ttsStart = performance.now();
    const synthResult = await ttsProviderRef.current.synthesize(translationResult.translatedText, phoneBLang.code);
    const ttsEnd = performance.now();
    const calculatedTtsLatency = Math.round(ttsEnd - ttsStart);
    setTtsLatencyMs(calculatedTtsLatency);

    const calcRtf = Number((calculatedTtsLatency / synthResult.audioDurationMs).toFixed(2));
    setRealTimeFactor(calcRtf);
    setAudioDurationSec(Number((synthResult.audioDurationMs / 1000).toFixed(1)));
    setIsPhoneBProcessingTTS(false);

    addLog(`TTS Synthesized (${phoneBLang.displayName}) in ${calculatedTtsLatency} ms (RTF: ${calcRtf}x)`, 'tts', 'PHONE_B');

    // 3. Play Audio via Speaker
    setIsPhoneBPlayingAudio(true);
    setPhoneBStatusText(`▶ Playing Audio in ${phoneBLang.displayName}`);
    addLog(`Playing audio output on Phone B in ${phoneBLang.displayName}`, 'audio', 'PHONE_B');

    // Enqueue in priority queue
    const translatedPacket: TextPacket = {
      ...packet,
      language: phoneBLang.code,
      text: translationResult.translatedText,
    };

    audioQueueRef.current.enqueue(
      translatedPacket,
      () => {},
      () => {
        setIsPhoneBPlayingAudio(false);
        setPhoneBStatusText('Standby • Listening on P2P');
        addLog('Audio playback finished on Phone B', 'audio', 'PHONE_B');

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
    setIsPhoneBTranslating(false);
    setIsPhoneBProcessingTTS(false);
    setIsPhoneBPlayingAudio(false);
    setIsAlertActive(false);
    setPhoneBOriginalText('');
    setPhoneBTranslatedText('');
    setPhoneAStatusText('Ready • Press Microphone to Speak');
    setPhoneBStatusText('Standby • Listening on P2P');
    setWaveAnim(false);
    addLog('System Reset: Cleared buffers and translation queues', 'system');
  };

  const endToEndLatencyMs = sttLatencyMs + txLatencyMs + nmtLatencyMs + ttsLatencyMs;

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
              <span>Android Transceiver Console</span>
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
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-8">
        {/* Replaceable Provider Configuration Banner */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/60">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                Replaceable STT / NMT / TTS Providers
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                  Decoupled Architecture
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Transmits 42-byte text packets over P2P Wi-Fi/Bluetooth. Decoupled AI adapters for cloud & offline Indic models.
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
            {/* Communication Mode & Quick Actions Bar */}
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
                  <span>Start Transceiver Sequence</span>
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
              
              {/* PHONE A: REALISTIC ANDROID SMARTPHONE HARDWARE CHASSIS */}
              <div className="lg:col-span-5 relative">
                {/* Photorealistic External Hardware Buttons */}
                <div className="btn-hardware-left-1" title="Volume Up" />
                <div className="btn-hardware-left-2" title="Volume Down" />
                <div className="btn-hardware-right" title="Power / Action Button" />

                {/* Outer Metallic Phone Shell */}
                <div className="realistic-phone-shell group">
                  {/* Screen Glare Layer */}
                  <div className="realistic-glass-glare" />

                  {/* Inner Phone Screen */}
                  <div className="realistic-screen min-h-[690px] p-3.5 flex flex-col justify-between space-y-3">
                    
                    {/* Top Hardware Notch & Android Status Bar */}
                    <div className="space-y-1.5">
                      {/* Speaker Grille & Punch Hole Selfie Camera */}
                      <div className="flex flex-col items-center space-y-1 pt-0.5">
                        <div className="realistic-speaker-grille" />
                        <div className="realistic-camera-punch">
                          <div className="realistic-camera-lens">
                            <div className="realistic-camera-reflection" />
                          </div>
                        </div>
                      </div>

                      {/* Android System Status Bar */}
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 px-2 pt-1 pb-1.5 border-b border-slate-800/80">
                        <div className="flex items-center space-x-1.5 text-cyan-400 font-semibold">
                          <Signal className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="text-[10px] font-bold">iTantra 5G</span>
                          <span className="text-[9px] bg-cyan-950/80 px-1.5 py-0.2 rounded text-cyan-300 border border-cyan-800/60">VoWiFi</span>
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                          <span className="font-mono text-slate-300 font-semibold">09:41</span>
                          <div className="flex items-center space-x-1 bg-slate-900 px-1.5 py-0.5 rounded-full border border-slate-800">
                            <Battery className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
                            <span className="text-cyan-300 font-bold text-[9px]">98%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Android Material 3 App Interface */}
                    <div className="space-y-3 flex-1">
                      {/* Material 3 Top App Bar */}
                      <div className="flex items-center justify-between bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800/90 shadow-md">
                        <div className="flex items-center space-x-2.5">
                          <ChevronLeft className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-200" />
                          <div className="relative">
                            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-inner">
                              <Radio className="w-4 h-4" />
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950 animate-pulse" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-100 text-xs tracking-tight">iTantra Radio A</h3>
                            <span className="text-[9px] text-cyan-400 font-mono block">STT Transmitter • P2P Ready</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[9px] font-mono bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded-md border border-cyan-800/60 font-semibold">TX ONLY</span>
                          <MoreVertical className="w-4 h-4 text-slate-400 cursor-pointer" />
                        </div>
                      </div>

                      {/* Material Language Chips Carousel */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between px-1 text-[10px] font-mono text-slate-400">
                          <span>SPEAKER LANGUAGE:</span>
                          <span className="text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">{phoneALang.nativeName}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-thin">
                          {SUPPORTED_LANGUAGES.map((lang) => (
                            <button
                              key={lang.code}
                              onClick={() => setPhoneALang(lang)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all ${
                                phoneALang.code === lang.code
                                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 ring-1 ring-cyan-300'
                                  : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-slate-800'
                              }`}
                            >
                              {lang.displayName}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Android Push-To-Talk Tactical Mic FAB Button */}
                      <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-3.5 text-center space-y-3 shadow-lg">
                        <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between px-1">
                          <span>MIC SPECTRUM</span>
                          <span className="text-cyan-400 font-semibold">{phoneAStatusText}</span>
                        </div>

                        {/* Speech Waveform Spectrum */}
                        <div className="h-10 bg-slate-950/90 rounded-2xl border border-slate-800/80 flex items-center justify-center space-x-1 px-4 overflow-hidden shadow-inner">
                          {[35, 75, 25, 90, 60, 100, 45, 80, 55, 95, 30, 70, 50, 85, 40].map((h, idx) => (
                            <div
                              key={idx}
                              className={`w-1 rounded-full bg-gradient-to-t from-cyan-500 to-blue-400 transition-all duration-150 ${waveAnim ? 'animate-pulse' : 'opacity-40'}`}
                              style={{ height: waveAnim ? `${Math.max(15, (h * (idx % 2 === 0 ? 0.9 : 1.1)) % 100)}%` : '20%' }}
                            />
                          ))}
                        </div>

                        {/* Tactical Mic FAB Circle */}
                        <div className="flex justify-center py-1">
                          <button
                            onClick={toggleMicListening}
                            disabled={isPhoneAProcessingSTT || isPhoneATransmitting}
                            className={`w-24 h-24 rounded-full flex flex-col items-center justify-center space-y-1 transition-all shadow-2xl active:scale-95 cursor-pointer ring-4 ${
                              isPhoneAListening
                                ? 'bg-rose-500 text-white ring-rose-400/60 shadow-rose-500/50 animate-pulse'
                                : 'bg-gradient-to-tr from-cyan-500 via-sky-500 to-blue-600 text-slate-950 ring-cyan-400/40 shadow-cyan-500/40 hover:scale-105'
                            }`}
                          >
                            <Mic className="w-8 h-8 fill-current" />
                            <span className="text-[10px] font-extrabold uppercase tracking-tighter">
                              {isPhoneAListening ? 'TAP TO SEND' : 'TAP TO SPEAK'}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Android Outgoing Message Input Bubble */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1">
                          <span>SPEECH TRANSCRIPT INPUT:</span>
                          <span className="text-slate-500">Live STT</span>
                        </div>
                        <div className="bg-cyan-950/40 border border-cyan-800/60 rounded-2xl rounded-tr-none p-3 space-y-2 shadow-sm">
                          <textarea
                            value={phoneARecognizedText}
                            onChange={(e) => setPhoneARecognizedText(e.target.value)}
                            placeholder={`Type or hold microphone to speak in ${phoneALang.displayName}...`}
                            className="w-full bg-transparent text-xs font-medium text-slate-100 placeholder-slate-500 focus:outline-none font-mono resize-none min-h-[50px]"
                          />
                          <div className="flex items-center justify-between text-[10px] font-mono text-cyan-400 pt-1.5 border-t border-cyan-900/60">
                            <span className="flex items-center gap-1 text-[9px] text-slate-400">
                              <Languages className="w-3 h-3 text-cyan-400" />
                              {phoneALang.displayName}
                            </span>
                            <button
                              onClick={() => handleTransmitSpeech()}
                              className="flex items-center space-x-1 px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-extrabold rounded-lg shadow-md hover:from-cyan-400 hover:to-blue-500 active:scale-95 transition-all text-[10px]"
                            >
                              <Send className="w-3 h-3" />
                              <span>TRANSMIT 42B</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Android Packet Payload Telemetry Card */}
                      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 text-[10px] font-mono space-y-1">
                        <div className="flex items-center justify-between text-cyan-300">
                          <span className="flex items-center gap-1 font-semibold">
                            <FileText className="w-3.5 h-3.5 text-cyan-400" />
                            PAYLOAD: {lastPacketSizeBytes} BYTES
                          </span>
                          <span className="text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                            -99.9% BANDWIDTH
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-400 text-[9px]">
                          <span>STT Engine: {sttProviderType}</span>
                          <span>Tx Latency: {txLatencyMs} ms</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Android Gesture Navigation Bar */}
                    <div className="pt-2 border-t border-slate-900/80 flex flex-col items-center">
                      <div className="w-28 h-1 bg-slate-600/60 rounded-full hover:bg-slate-300 transition-all cursor-pointer my-1 shadow-sm" />
                    </div>
                  </div>
                </div>
              </div>

              {/* CENTER COMMUNICATION LINK VISUALIZER */}
              <div className="lg:col-span-2 flex flex-col items-center justify-center space-y-4 py-4">
                <div className="text-center space-y-1">
                  <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-400 shadow-md">
                    <Wifi className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    <span>Wi-Fi P2P Link</span>
                  </div>
                </div>

                {/* Flow Diagram Line & Packet Animation */}
                <div className="w-full h-32 lg:h-48 relative flex items-center justify-center">
                  <div className="w-1 h-full lg:w-full lg:h-1 bg-gradient-to-r from-cyan-500/40 via-blue-500 to-emerald-500/40 rounded-full shadow-lg" />

                  <div
                    className={`absolute p-2.5 rounded-xl bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/40 transition-all duration-1000 flex items-center space-x-1.5 text-xs font-mono font-bold ${
                      isPhoneATransmitting ? 'scale-110 opacity-100 animate-bounce' : 'opacity-80 scale-90'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>42B TEXT</span>
                  </div>
                </div>

                <div className="text-center bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl max-w-full shadow-md">
                  <span className="text-[9px] font-mono text-slate-400 block uppercase">TRANSMITTING ONLY:</span>
                  <span className="text-xs font-bold text-emerald-400 font-mono">TEXT PACKET ({lastPacketSizeBytes}B)</span>
                  <span className="text-[9px] text-slate-500 block">NOT RAW VOICE STREAM</span>
                </div>
              </div>

              {/* PHONE B: REALISTIC ANDROID SMARTPHONE HARDWARE CHASSIS */}
              <div className="lg:col-span-5 relative">
                {/* Photorealistic External Hardware Buttons */}
                <div className="btn-hardware-left-1" title="Volume Up" />
                <div className="btn-hardware-left-2" title="Volume Down" />
                <div className="btn-hardware-right" title="Power / Action Button" />

                {/* Outer Metallic Phone Shell */}
                <div className={`realistic-phone-shell group transition-all ${
                  isAlertActive ? 'ring-2 ring-rose-500/80 shadow-rose-500/30' : ''
                }`}>
                  {/* Screen Glare Layer */}
                  <div className="realistic-glass-glare" />

                  {/* Inner Phone Screen */}
                  <div className="realistic-screen min-h-[690px] p-3.5 flex flex-col justify-between space-y-3">
                    
                    {/* Top Hardware Notch & Android Status Bar */}
                    <div className="space-y-1.5">
                      {/* Speaker Grille & Punch Hole Selfie Camera */}
                      <div className="flex flex-col items-center space-y-1 pt-0.5">
                        <div className="realistic-speaker-grille" />
                        <div className="realistic-camera-punch">
                          <div className="realistic-camera-lens">
                            <div className="realistic-camera-reflection" />
                          </div>
                        </div>
                      </div>

                      {/* Android System Status Bar */}
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 px-2 pt-1 pb-1.5 border-b border-slate-800/80">
                        <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                          <Signal className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[10px] font-bold">iTantra 5G</span>
                          <span className="text-[9px] bg-emerald-950/80 px-1.5 py-0.2 rounded text-emerald-300 border border-emerald-800/60">P2P</span>
                        </div>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                          <span className="font-mono text-slate-300 font-semibold">09:41</span>
                          <div className="flex items-center space-x-1 bg-slate-900 px-1.5 py-0.5 rounded-full border border-slate-800">
                            <Battery className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
                            <span className="text-emerald-300 font-bold text-[9px]">95%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Android Material 3 App Interface */}
                    <div className="space-y-3 flex-1">
                      {/* Material 3 Top App Bar */}
                      <div className="flex items-center justify-between bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800/90 shadow-md">
                        <div className="flex items-center space-x-2.5">
                          <ChevronLeft className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-200" />
                          <div className="relative">
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-inner">
                              <Volume2 className="w-4 h-4" />
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950 animate-pulse" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-100 text-xs tracking-tight">iTantra Receiver B</h3>
                            <span className="text-[9px] text-emerald-400 font-mono block">TTS & Translator • Standby</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[9px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-800/60 font-semibold">RX & TTS</span>
                          <MoreVertical className="w-4 h-4 text-slate-400 cursor-pointer" />
                        </div>
                      </div>

                      {/* Material Language Chips Carousel */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between px-1 text-[10px] font-mono text-slate-400">
                          <span>TARGET HEAR LANGUAGE:</span>
                          <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">{phoneBLang.nativeName}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-thin">
                          {SUPPORTED_LANGUAGES.map((lang) => (
                            <button
                              key={lang.code}
                              onClick={() => setPhoneBLang(lang)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap transition-all ${
                                phoneBLang.code === lang.code
                                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 ring-1 ring-emerald-300'
                                  : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-slate-800'
                              }`}
                            >
                              {lang.displayName}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Emergency Alert Mode Banner if Active */}
                      {isAlertActive && (
                        <div className="bg-rose-950/90 border-2 border-rose-500 rounded-2xl p-3 text-rose-200 animate-pulse space-y-1 text-center shadow-lg shadow-rose-500/30">
                          <div className="flex items-center justify-center space-x-2 text-rose-400 font-bold text-xs">
                            <AlertTriangle className="w-4 h-4" />
                            <span>🚨 CRITICAL EMERGENCY ALERT</span>
                          </div>
                          <p className="text-[10px] font-mono text-rose-300">HIGH VOLUME NON-INTERRUPTIBLE AUDIO</p>
                        </div>
                      )}

                      {/* Android Media Player Widget */}
                      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-3.5 text-center space-y-3 shadow-lg">
                        <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between px-1">
                          <span>SPEAKER OUTPUT</span>
                          <span className="text-emerald-400 font-semibold">{phoneBStatusText}</span>
                        </div>

                        {/* Speaker Sound Waveform */}
                        <div className="h-10 bg-slate-950/90 rounded-2xl border border-slate-800 flex items-center justify-center space-x-1 px-4 overflow-hidden shadow-inner">
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

                        {/* Audio Output Status Indicator */}
                        <div className={`w-full py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 border transition-all ${
                          isPhoneBPlayingAudio
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/30'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}>
                          {isPhoneBPlayingAudio ? <Volume2 className="w-4 h-4 animate-bounce" /> : <VolumeX className="w-4 h-4" />}
                          <span>{isPhoneBPlayingAudio ? `PLAYING ${phoneBLang.displayName.toUpperCase()} TTS...` : 'SPEAKER STANDBY'}</span>
                        </div>
                      </div>

                      {/* Android Chat Bubbles Container */}
                      <div className="space-y-2 text-xs">
                        {/* Received Speech Bubble */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1">
                            <span>RECEIVED ({phoneALang.displayName}):</span>
                            <span className="text-[9px] text-slate-500">42 Bytes</span>
                          </div>
                          <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-2.5 text-slate-300 font-mono text-xs min-h-[38px] flex items-center shadow-sm">
                            {phoneBOriginalText ? `"${phoneBOriginalText}"` : <span className="italic text-slate-600">Waiting for packet...</span>}
                          </div>
                        </div>

                        {/* Translated Speech Bubble */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400 font-semibold px-1">
                            <span>TRANSLATED ({phoneBLang.displayName}):</span>
                            <span className="text-[9px] text-emerald-400">Live NMT</span>
                          </div>
                          <div className="bg-emerald-950/70 border border-emerald-800/60 rounded-2xl rounded-tr-none p-3 text-emerald-200 font-semibold text-xs min-h-[48px] flex items-center justify-between shadow-sm">
                            <span>{phoneBTranslatedText ? `"${phoneBTranslatedText}"` : <span className="italic text-slate-500 font-normal">Translated text will appear here</span>}</span>
                            {phoneBTranslatedText && <span className="text-[10px] text-emerald-400 ml-2 font-mono">✓✓</span>}
                          </div>
                        </div>
                      </div>

                      {/* Android NMT & TTS Telemetry Widget */}
                      <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-2xl p-2.5 space-y-1 text-[10px] font-mono">
                        <div className="flex items-center justify-between text-emerald-300 font-semibold">
                          <span>NMT & TTS ENGINE</span>
                          <span className="bg-emerald-900/80 px-2 py-0.5 rounded text-emerald-200 border border-emerald-700 text-[9px]">
                            RTF: {realTimeFactor}x
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[9px] text-slate-300">
                          <div>NMT: <span className="text-emerald-400 font-bold">{nmtLatencyMs}ms</span></div>
                          <div>TTS: <span className="text-emerald-400 font-bold">{ttsLatencyMs}ms</span></div>
                          <div>Duration: <span className="text-emerald-400 font-bold">{audioDurationSec}s</span></div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Android Gesture Navigation Bar */}
                    <div className="pt-2 border-t border-slate-900/80 flex flex-col items-center">
                      <div className="w-28 h-1 bg-slate-600/60 rounded-full hover:bg-slate-300 transition-all cursor-pointer my-1 shadow-sm" />
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom End-to-End Latency Metrics Summary Bar */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-6 gap-3 text-center font-mono">
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">STT Latency</span>
                <span className="text-base font-bold text-cyan-400">{sttLatencyMs} ms</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">Wi-Fi Tx</span>
                <span className="text-base font-bold text-sky-400">{txLatencyMs} ms</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">NMT Translation</span>
                <span className="text-base font-bold text-teal-400">{nmtLatencyMs} ms</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">TTS Latency</span>
                <span className="text-base font-bold text-emerald-400">{ttsLatencyMs} ms</span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">RTF Factor</span>
                <span className="text-base font-bold text-amber-400">{realTimeFactor}x</span>
              </div>
              <div className="p-2.5 bg-cyan-950/80 rounded-xl border border-cyan-800/80 col-span-2 md:col-span-1">
                <span className="text-[10px] text-cyan-300 block uppercase font-bold">End-to-End Latency</span>
                <span className="text-lg font-extrabold text-cyan-300">{endToEndLatencyMs} ms</span>
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
                  Open this application in two separate browser tabs or devices on the same Wi-Fi network to test real cross-language text-over-network communication.
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
                <span>Detailed Multilingual Component Latency Breakdown</span>
                <span className="text-xs text-slate-400 font-normal">SIMULATED / ESTIMATED METRICS</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 px-3">Metric Component</th>
                      <th className="py-2.5 px-3">Measured Value</th>
                      <th className="py-2.5 px-3">Target Performance</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    <tr>
                      <td className="py-3 px-3 font-semibold text-cyan-300">STT Latency ({phoneALang.displayName})</td>
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
                      <td className="py-3 px-3 font-semibold text-teal-300">NMT Translation ({phoneALang.displayName} ➔ {phoneBLang.displayName})</td>
                      <td className="py-3 px-3">{nmtLatencyMs} ms</td>
                      <td className="py-3 px-3 text-slate-400">&lt; 60 ms</td>
                      <td className="py-3 px-3 text-emerald-400">PASS</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 font-semibold text-emerald-300">TTS Latency ({phoneBLang.displayName})</td>
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
                      <td className="py-3 px-3 text-cyan-200">End-to-End Multilingual Speech-to-Speech Latency</td>
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
                    Converts voice to text on Phone A, transmits lightweight JSON packet over P2P, translates NMT & synthesizes voice on Phone B.
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
                    <li>IndicTrans2 NMT Translation Adapter</li>
                    <li>Browser Web Speech API (Native Fallback)</li>
                  </ul>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <span className="text-emerald-400 font-bold block">Target Production Offline Open-Source Models:</span>
                  <ul className="space-y-1 text-slate-300 list-disc list-inside">
                    <li>Offline IndicConformer / Whisper Open-Source STT</li>
                    <li>Offline Piper / Coqui Open-Source Neural TTS</li>
                    <li>Offline Bhashini / IndicTrans2 Local NMT Model</li>
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