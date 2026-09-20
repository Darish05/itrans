import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Antenna,
  BatteryMedium,
  Bluetooth,
  Check,
  ChevronDown,
  CircleStop,
  Clock3,
  Cpu,
  Gauge,
  Languages,
  MemoryStick,
  Mic,
  Network,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Send,
  ShieldAlert,
  Signal,
  Speaker,
  Volume2,
  Waves,
  Wifi,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const languages = [
  { name: "Hindi", native: "हिन्दी", text: "आपातकालीन सहायता आवश्यक है।" },
  { name: "Gujarati", native: "ગુજરાતી", text: "કટોકટીની સહાય જરૂરી છે." },
  { name: "Marathi", native: "मराठी", text: "आपत्कालीन मदत आवश्यक आहे." },
  { name: "Kannada", native: "ಕನ್ನಡ", text: "ತುರ್ತು ಸಹಾಯ ಅಗತ್ಯವಿದೆ." },
  { name: "Malayalam", native: "മലയാളം", text: "അടിയന്തര സഹായം ആവശ്യമാണ്." },
  { name: "Tamil", native: "தமிழ்", text: "அவசர உதவி தேவை." },
  { name: "Telugu", native: "తెలుగు", text: "అత్యవసర సహాయం అవసరం." },
  { name: "Odia", native: "ଓଡ଼ିଆ", text: "ଜରୁରୀକାଳୀନ ସହାୟତା ଆବଶ୍ୟକ।" },
  { name: "Bengali", native: "বাংলা", text: "জরুরি সহায়তা প্রয়োজন।" },
  { name: "English", native: "English", text: "Emergency assistance required." },
] as const;

type Phase =
  | "idle"
  | "listening"
  | "processing"
  | "transmitting"
  | "receiving"
  | "synthesizing"
  | "playing"
  | "complete"
  | "paused";
type LinkType = "Wi-Fi" | "Bluetooth";
type Mode = "Walkie-Talkie" | "Phone Mode";
type LogType = "stt" | "network" | "tts" | "audio" | "alert";
type LogEntry = { time: string; text: string; type: LogType };

const initialLogs: LogEntry[] = [
  { time: "20:41:02", text: "Devices paired over Wi-Fi", type: "network" },
  { time: "20:41:01", text: "STT and TTS adapters ready", type: "stt" },
];

const phaseCopy: Record<Phase, string> = {
  idle: "PRESS AND HOLD",
  listening: "LISTENING",
  processing: "PROCESSING",
  transmitting: "TRANSMITTING",
  receiving: "RECEIVING",
  synthesizing: "SYNTHESIZING",
  playing: "PLAYING",
  complete: "COMPLETE",
  paused: "PAUSED",
};

function now() {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

function Waveform({ active, compact = false }: { active: boolean; compact?: boolean }) {
  const bars = compact ? 18 : 32;
  return (
    <div className={cn("waveform", compact ? "h-8" : "h-14")} aria-label={active ? "Audio waveform active" : "Audio waveform idle"}>
      {Array.from({ length: bars }, (_, index) => (
        <span
          key={index}
          className={cn("wave-bar", active && "wave-bar-active")}
          style={{ "--wave-delay": `${(index % 8) * 60}ms`, "--wave-height": `${24 + ((index * 17) % 70)}%` } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

function StatusDot({ active, label, warning = false }: { active: boolean; label: string; warning?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.16em]", warning ? "text-alert" : active ? "text-success" : "text-muted-foreground")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", warning ? "bg-alert animate-pulse" : active ? "bg-success shadow-signal" : "bg-muted-foreground")} />
      {label}
    </span>
  );
}

function PhoneFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="phone-wrap">
      <div className="mb-3 flex items-center justify-between px-2">
        <span className="console-label">{label}</span>
        <span className="text-[10px] text-muted-foreground">ANDROID NODE</span>
      </div>
      <div className="phone-frame">
        <div className="phone-speaker" />
        <div className="phone-screen">
          <div className="flex h-7 items-center justify-between border-b border-border/50 px-4 text-[9px] text-muted-foreground">
            <span>20:41</span>
            <div className="flex items-center gap-1.5"><Signal className="size-3" /><Wifi className="size-3" /><BatteryMedium className="size-3.5" /></div>
          </div>
          {children}
          <div className="phone-nav"><span /><span className="rounded-full" /><span /></div>
        </div>
      </div>
    </div>
  );
}

function PhoneHeader({ type, status, active }: { type: "STT" | "TTS"; status: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="grid size-7 place-items-center rounded-md bg-primary/15 text-primary"><Radio className="size-4" /></div>
        <div><p className="text-xs font-bold tracking-[0.08em]">iTantra</p><p className="text-[8px] tracking-[0.18em] text-muted-foreground">{type} DEVICE</p></div>
      </div>
      <StatusDot active={active} label={status} />
    </div>
  );
}

function STTPhone({ phase, language, text, progress, onPTT }: { phase: Phase; language: string; text: string; progress: number; onPTT: () => void }) {
  const listening = phase === "listening";
  const hasText = !["idle", "listening"].includes(phase);
  return (
    <PhoneFrame label="PHONE A / SOURCE">
      <PhoneHeader type="STT" status={listening ? "LISTENING" : phase === "idle" ? "STANDBY" : "ACTIVE"} active={phase !== "idle" && phase !== "paused"} />
      <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
        <div className="flex items-center justify-between"><span className="phone-kicker">INPUT / MICROPHONE</span><span className="text-[10px] font-medium text-primary">{language}</span></div>
        <div className="my-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2"><Waveform active={listening} /></div>
        <button type="button" onPointerDown={onPTT} className={cn("phone-ptt", listening && "phone-ptt-active")} aria-label="Push to talk">
          <Mic className="size-5" /><span>{listening ? "RELEASE TO SEND" : "PUSH TO TALK"}</span>
        </button>
        <div className="mt-4 flex-1">
          <p className="phone-kicker">RECOGNIZED TEXT</p>
          <div className={cn("mt-2 min-h-20 border-l-2 pl-3 text-sm leading-relaxed", hasText ? "border-primary text-foreground" : "border-border text-muted-foreground")}>
            {hasText ? `“${text}”` : listening ? "Speech detected…" : "Awaiting voice input"}
          </div>
        </div>
        <div className="packet-box">
          <div className="flex items-center justify-between"><span className="phone-kicker text-primary">TEXT PACKET</span><Send className="size-3.5 text-primary" /></div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]"><span className="text-muted-foreground">SIZE</span><span className="text-right font-mono">42 BYTES</span><span className="text-muted-foreground">LATENCY</span><span className="text-right font-mono">82 MS</span></div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} /></div>
        </div>
      </div>
    </PhoneFrame>
  );
}

function TTSPhone({ phase, text, alert }: { phase: Phase; text: string; alert: boolean }) {
  const hasText = ["receiving", "synthesizing", "playing", "complete"].includes(phase) || alert;
  const playing = phase === "playing" || alert;
  if (alert) {
    return (
      <PhoneFrame label="PHONE B / DESTINATION">
        <PhoneHeader type="TTS" status="CRITICAL ALERT" active />
        <div className="alert-screen">
          <div className="alert-rings"><ShieldAlert className="size-10" /></div>
          <div><p className="phone-kicker text-alert">ALERT PRIORITY: CRITICAL</p><h3 className="mt-2 text-2xl font-bold">EMERGENCY</h3></div>
          <p className="text-center text-base font-medium leading-relaxed">“{text}”</p>
          <Waveform active compact />
          <div className="grid w-full grid-cols-2 gap-2"><span className="alert-tag">HIGH VOLUME</span><span className="alert-tag">NON-INTERRUPTIBLE</span></div>
          <div className="flex items-center gap-2 text-xs font-semibold"><Volume2 className="size-5" /> AUDIO BROADCAST ACTIVE</div>
        </div>
      </PhoneFrame>
    );
  }
  return (
    <PhoneFrame label="PHONE B / DESTINATION">
      <PhoneHeader type="TTS" status={phase === "receiving" ? "RECEIVING" : playing ? "PLAYING" : phase === "synthesizing" ? "PROCESSING" : "STANDBY"} active={hasText} />
      <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
        <div className="flex items-center justify-between"><span className="phone-kicker">INCOMING / TEXT</span><Network className={cn("size-4", hasText ? "text-secondary" : "text-muted-foreground")} /></div>
        <div className={cn("mt-3 min-h-24 rounded-md border p-3 text-sm leading-relaxed", hasText ? "border-secondary/30 bg-secondary/5 text-foreground" : "border-border text-muted-foreground")}>
          {hasText ? `“${text}”` : "Waiting for text packet…"}
        </div>
        <div className="my-4 flex items-center gap-3 rounded-md border border-border bg-muted/30 p-3">
          <div className={cn("grid size-10 shrink-0 place-items-center rounded-full", playing ? "bg-secondary text-secondary-foreground shadow-audio" : "bg-muted text-muted-foreground")}><Speaker className="size-5" /></div>
          <div className="min-w-0 flex-1"><p className="phone-kicker">AUDIO OUTPUT</p><p className="mt-1 text-xs font-semibold">{playing ? "PLAYING" : phase === "synthesizing" ? "SYNTHESIZING…" : "READY"}</p></div>
          {playing && <Play className="size-4 fill-current text-secondary" />}
        </div>
        <Waveform active={playing} compact />
        <div className="mt-auto grid grid-cols-3 divide-x divide-border border-y border-border py-3 text-center">
          <PhoneMetric label="TTS LATENCY" value="146 ms" />
          <PhoneMetric label="RTF" value="0.21x" />
          <PhoneMetric label="DURATION" value="2.4 sec" />
        </div>
        <div className="mt-3 flex items-center justify-between text-[10px]"><span className="text-muted-foreground">MICROSOFT TTS ADAPTER</span><StatusDot active={phase !== "idle"} label="READY" /></div>
      </div>
    </PhoneFrame>
  );
}

function PhoneMetric({ label, value }: { label: string; value: string }) {
  return <div className="px-1"><p className="text-[7px] tracking-[0.1em] text-muted-foreground">{label}</p><p className="mt-1 font-mono text-[11px] font-semibold">{value}</p></div>;
}

function CommunicationLink({ phase, link }: { phase: Phase; link: LinkType }) {
  const moving = ["transmitting", "receiving"].includes(phase);
  return (
    <div className="link-column">
      <div className="link-flow-label"><Mic className="size-3.5" /> SPEECH</div>
      <div className="link-step">STT</div>
      <ChevronDown className="link-arrow" />
      <div className={cn("text-packet", moving && "text-packet-active")}><span>TXT</span><small>42 B</small></div>
      <div className="link-track">
        <span className={cn("packet-runner packet-runner-one", moving && "packet-running")}>TXT</span>
        <span className={cn("packet-runner packet-runner-two", moving && "packet-running")}>TXT</span>
      </div>
      <div className="link-protocol">{link === "Wi-Fi" ? <Wifi className="size-4" /> : <Bluetooth className="size-4" />}<span>{link.toUpperCase()}</span></div>
      <div className="link-step">TTS</div>
      <ChevronDown className="link-arrow" />
      <div className="link-flow-label"><Volume2 className="size-3.5" /> SPEECH</div>
      <p className="link-caption">TEXT ONLY<br />LOW BITRATE</p>
    </div>
  );
}

const chartPaths = {
  cpu: "M0 31 L10 29 L20 32 L30 20 L40 23 L50 17 L60 23 L70 16 L80 19 L90 9 L100 14",
  ram: "M0 28 L10 26 L20 27 L30 25 L40 24 L50 22 L60 24 L70 21 L80 19 L90 20 L100 17",
  latency: "M0 24 L10 20 L20 28 L30 14 L40 18 L50 10 L60 21 L70 13 L80 24 L90 16 L100 19",
};

function Sparkline({ kind }: { kind: keyof typeof chartPaths }) {
  return <svg viewBox="0 0 100 40" className="h-10 w-full" preserveAspectRatio="none" aria-hidden="true"><path d={chartPaths[kind]} className="sparkline-shadow" /><path d={chartPaths[kind]} className="sparkline" /></svg>;
}

function MetricsPanel({ metrics, link }: { metrics: { cpuA: number; cpuB: number; ramA: number; ramB: number }; link: LinkType }) {
  return (
    <section className="console-panel col-span-full">
      <div className="section-heading"><div><p className="console-label">PERFORMANCE TELEMETRY</p><h2>System Metrics</h2></div><span className="sim-badge"><Activity className="size-3" /> DEMO / SIMULATED METRICS</span></div>
      <div className="mt-5 grid gap-px overflow-hidden rounded-md border border-border bg-border lg:grid-cols-3">
        <MetricGroup title="PHONE A · STT" icon={Mic} accent="primary" rows={[['Model','Google STT Adapter'],['CPU',`${metrics.cpuA}%`],['RAM',`${metrics.ramA} MB`],['STT Latency','82 ms'],['Word Error Rate','4.8%'],['Packet Size','42 bytes']]} charts={[['CPU','cpu'],['RAM','ram']]} />
        <MetricGroup title="PHONE B · TTS" icon={Speaker} accent="secondary" rows={[['Model','Microsoft TTS Adapter'],['CPU',`${metrics.cpuB}%`],['RAM',`${metrics.ramB} MB`],['TTS Latency','146 ms'],['Real-Time Factor','0.21x'],['Audio Duration','2.4 sec']]} charts={[['CPU','cpu'],['RAM','ram']]} />
        <MetricGroup title="END-TO-END" icon={Zap} accent="success" rows={[['Speech-to-Speech','228 ms'],['Transmission','31 ms'],['Text Packet','42 bytes'],['Network',link],['Compression','Text payload'],['Link State','Stable']]} charts={[['LATENCY','latency']]} />
      </div>
    </section>
  );
}

function MetricGroup({ title, icon: Icon, rows, charts, accent }: { title: string; icon: React.ElementType; rows: string[][]; charts: string[][]; accent: string }) {
  const accentClass = accent === "secondary" ? "text-secondary" : accent === "success" ? "text-success" : "text-primary";
  return (
    <div className="bg-card p-4">
      <div className="flex items-center gap-2 border-b border-border pb-3"><Icon className={cn("size-4", accentClass)} /><h3 className="text-xs font-bold tracking-[0.12em]">{title}</h3></div>
      <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2.5">{rows.map(([label, value]) => <div key={label} className="contents"><span className="text-[10px] text-muted-foreground">{label}</span><span className="text-right font-mono text-[10px] font-medium">{value}</span></div>)}</div>
      <div className="mt-4 grid grid-cols-2 gap-3">{charts.map(([label, kind]) => <div key={label} className="metric-chart"><span>{label}</span><Sparkline kind={kind as keyof typeof chartPaths} /></div>)}</div>
    </div>
  );
}

function LanguagePanel({ language, onChange }: { language: string; onChange: (value: string) => void }) {
  return (
    <section className="console-panel xl:col-span-2">
      <div className="section-heading"><div><p className="console-label">LINGUISTIC ADAPTER</p><h2>Language Matrix</h2></div><Languages className="size-5 text-primary" /></div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">{languages.map((item) => (
        <button type="button" key={item.name} onClick={() => onChange(item.name)} className={cn("language-chip", language === item.name && "language-chip-active")}>
          <span className="text-sm font-semibold">{item.native}</span><span className="text-[9px] text-muted-foreground">{item.name}</span>{language === item.name && <Check className="absolute right-2 top-2 size-3 text-primary" />}
        </button>
      ))}</div>
    </section>
  );
}

const logIcons = { stt: Mic, network: Network, tts: Waves, audio: Volume2, alert: AlertTriangle };

function EventLog({ logs }: { logs: LogEntry[] }) {
  return (
    <section className="console-panel xl:row-span-2">
      <div className="section-heading"><div><p className="console-label">LIVE TRACE</p><h2>Communication Log</h2></div><span className="live-indicator">LIVE</span></div>
      <div className="mt-4 max-h-[370px] space-y-1 overflow-auto pr-1">{logs.map((log, index) => { const Icon = logIcons[log.type]; return (
        <div className="log-row" key={`${log.time}-${index}`}><span className="font-mono text-[9px] text-muted-foreground">{log.time}</span><span className={cn("log-icon", `log-${log.type}`)}><Icon className="size-3" /></span><span className="text-[11px]">{log.text}</span></div>
      ); })}</div>
    </section>
  );
}

function VadPanel({ phase }: { phase: Phase }) {
  const detected = ["processing", "transmitting", "receiving", "synthesizing", "playing", "complete"].includes(phase);
  return (
    <section className="console-panel">
      <div className="section-heading"><div><p className="console-label">SIGNAL GATE</p><h2>Voice Activity Detection</h2></div><StatusDot active label="ACTIVE" /></div>
      <div className="mt-5 flex items-end justify-between"><div><p className="text-[10px] text-muted-foreground">SILENCE THRESHOLD</p><p className="mt-1 font-mono text-2xl font-semibold">1.2 <small className="text-xs text-muted-foreground">SEC</small></p></div><div className={cn("vad-state", detected && "vad-state-active")}><Waves className="size-4" />{detected ? "PAUSE DETECTED" : "MONITORING"}</div></div>
      <div className="mt-5 flex items-center justify-between border-t border-border pt-3 text-[10px]"><span className="text-muted-foreground">SENTENCE STATE</span><span className={detected ? "text-success" : "text-muted-foreground"}>{detected ? "FINALIZED" : "OPEN"}</span></div>
    </section>
  );
}

function Architecture() {
  const steps = [
    [Mic, "USER SPEECH"], [Activity, "VOICE ACTIVITY"], [Cpu, "STT ENGINE"], [Send, "TEXT"], [Network, "TEXT PACKET"], [Wifi, "WI-FI / BLE"], [Send, "TEXT"], [Cpu, "TTS ENGINE"], [Volume2, "AUDIO"], [Radio, "USER"],
  ] as const;
  return (
    <section className="console-panel col-span-full">
      <div className="section-heading"><div><p className="console-label">SYSTEM PIPELINE</p><h2>Architecture Overview</h2></div><Antenna className="size-5 text-primary" /></div>
      <div className="architecture-flow">{steps.map(([Icon, label], index) => <div className="contents" key={label}><div className={cn("architecture-step", label.includes("TEXT") && "architecture-text")}><Icon className="size-4" /><span>{label}</span></div>{index < steps.length - 1 && <span className="architecture-arrow">→</span>}</div>)}</div>
      <div className="mt-5 flex items-start gap-3 border-t border-border pt-4"><div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><Zap className="size-4" /></div><div><p className="text-xs font-semibold">Low-bandwidth communication</p><p className="mt-1 text-[11px] text-muted-foreground">Transmitting lightweight text packets instead of raw audio reduces network load while preserving multilingual voice communication.</p></div></div>
    </section>
  );
}

export function ITantraDashboard() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [language, setLanguage] = useState("Tamil");
  const [link, setLink] = useState<LinkType>("Wi-Fi");
  const [mode, setMode] = useState<Mode>("Walkie-Talkie");
  const [connected, setConnected] = useState(true);
  const [alert, setAlert] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [enabled, setEnabled] = useState({ stt: true, tts: true });
  const [metrics, setMetrics] = useState({ cpuA: 18, cpuB: 21, ramA: 142, ramB: 168 });
  const timers = useRef<number[]>([]);
  const selectedLanguage = useMemo(() => languages.find((item) => item.name === language) ?? languages[5], [language]);

  const clearTimers = useCallback(() => { timers.current.forEach(window.clearTimeout); timers.current = []; }, []);
  const addLog = useCallback((text: string, type: LogType) => setLogs((current) => [{ time: now(), text, type }, ...current].slice(0, 24)), []);
  const queue = useCallback((delay: number, action: () => void) => { timers.current.push(window.setTimeout(action, delay)); }, []);

  const runDemo = useCallback(() => {
    if (!connected || !enabled.stt || !enabled.tts) return;
    clearTimers(); setAlert(false); setProgress(4); setPhase("listening"); addLog("Speech detected", "stt");
    queue(1000, () => { setPhase("processing"); addLog("Pause detected — sentence finalized", "stt"); });
    queue(1500, () => { setPhase("transmitting"); setProgress(35); addLog("STT completed — 82 ms", "stt"); addLog("Text packet created — 42 bytes", "network"); });
    queue(1850, () => { setProgress(100); setPhase("receiving"); addLog(`Packet transmitted via ${link} — 31 ms`, "network"); });
    queue(2150, () => { setPhase("synthesizing"); addLog("Text received on Phone B", "tts"); });
    queue(2850, () => { setPhase("playing"); addLog("TTS completed — 146 ms", "tts"); addLog("Audio playback started", "audio"); });
    queue(4700, () => { setPhase("complete"); addLog("Speech-to-speech cycle complete — 228 ms", "audio"); });
  }, [addLog, clearTimers, connected, enabled.stt, enabled.tts, link, queue]);

  useEffect(() => () => clearTimers(), [clearTimers]);
  useEffect(() => {
    const interval = window.setInterval(() => setMetrics({ cpuA: 16 + Math.floor(Math.random() * 7), cpuB: 19 + Math.floor(Math.random() * 7), ramA: 139 + Math.floor(Math.random() * 8), ramB: 164 + Math.floor(Math.random() * 9) }), 1800);
    return () => window.clearInterval(interval);
  }, []);

  const stop = () => { clearTimers(); setPhase("idle"); setProgress(0); addLog("Demo stopped by operator", "network"); };
  const reset = () => { clearTimers(); setPhase("idle"); setProgress(0); setAlert(false); setLogs(initialLogs); };
  const pause = () => { clearTimers(); setPhase("paused"); addLog("Demo sequence paused", "network"); };
  const toggleConnection = () => { const next = !connected; setConnected(next); if (!next) stop(); addLog(next ? `${link} link connected` : "Device link disconnected", "network"); };
  const emergency = () => { clearTimers(); setAlert(true); setPhase("playing"); setProgress(100); addLog("CRITICAL emergency alert broadcast", "alert"); };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="console-header">
        <div className="mx-auto flex max-w-[1580px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-7">
          <div className="flex items-center gap-4"><div className="brand-mark"><Antenna className="size-6" /></div><div><div className="flex items-baseline gap-3"><h1 className="font-display text-2xl font-bold">iTantra</h1><span className="hidden text-[9px] font-semibold tracking-[0.2em] text-primary sm:inline">NEURAL TRANSCEIVER</span></div><p className="mt-0.5 text-[11px] text-muted-foreground">Indian Multilingual TTS & STT Aided Neural Transceiver</p><p className="mt-1 text-[9px] font-medium tracking-[0.14em] text-secondary">SIH 26173 · LOW-BITRATE VOICE COMMUNICATION</p></div></div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="console" size="sm" onClick={toggleConnection}><StatusDot active={connected} label={connected ? "CONNECTED" : "DISCONNECTED"} /></Button>
            <div className="segment-control"><Button variant={link === "Wi-Fi" ? "segmentActive" : "segment"} size="sm" onClick={() => setLink("Wi-Fi")}><Wifi />Wi-Fi</Button><Button variant={link === "Bluetooth" ? "segmentActive" : "segment"} size="sm" onClick={() => setLink("Bluetooth")}><Bluetooth />BLE</Button></div>
            <label className="header-select"><Languages className="size-3.5" /><select value={language} onChange={(event) => setLanguage(event.target.value)}>{languages.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
            <Button variant="signal" size="sm" onClick={runDemo}><Play />Start Demo</Button>
            <Button variant="console" size="icon" onClick={stop} aria-label="Stop demo" title="Stop demo"><CircleStop /></Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1580px] px-4 py-5 lg:px-7">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div><p className="console-label">DUAL-NODE TEST CONSOLE / SESSION 04</p><h2 className="mt-1 text-lg font-semibold">Live Voice Transmission Simulator</h2></div>
          <div className="flex flex-wrap items-center gap-2"><div className="segment-control"><Button variant={mode === "Walkie-Talkie" ? "segmentActive" : "segment"} size="sm" onClick={() => setMode("Walkie-Talkie")}><Radio />Walkie-Talkie</Button><Button variant={mode === "Phone Mode" ? "segmentActive" : "segment"} size="sm" onClick={() => setMode("Phone Mode")}><Speaker />Phone Mode</Button></div><span className="mode-note">{mode === "Walkie-Talkie" ? "ONE-WAY · PUSH-TO-TALK" : "CONTINUOUS · AUTO-DETECT"}</span></div>
        </div>

        <section className="simulation-stage">
          <div className="stage-grid" data-phase={phase}>
            <STTPhone phase={phase} language={language} text={selectedLanguage.text} progress={progress} onPTT={runDemo} />
            <CommunicationLink phase={phase} link={link} />
            <TTSPhone phase={phase} text={selectedLanguage.text} alert={alert} />
          </div>
          <div className="stage-footer">
            <div className="ptt-control"><button type="button" onPointerDown={runDemo} className={cn("master-ptt", phase === "listening" && "master-ptt-active")}><Mic className="size-6" /><span>{phaseCopy[phase]}</span><small>{phase === "idle" ? "PUSH TO TALK" : "VOICE PIPELINE ACTIVE"}</small></button></div>
            <div className="pipeline-strip"><span className={phase === "listening" ? "active" : ""}>SPEECH</span><i>→</i><span className={phase === "processing" ? "active" : ""}>TEXT</span><i>→</i><span className={phase === "transmitting" || phase === "receiving" ? "active" : ""}>LOW-BITRATE TX</span><i>→</i><span className={phase === "synthesizing" ? "active" : ""}>TEXT</span><i>→</i><span className={phase === "playing" ? "active" : ""}>SPEECH</span></div>
            <Button variant="alert" size="lg" onClick={emergency}><AlertTriangle />Emergency Alert</Button>
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-3">
          <MetricsPanel metrics={metrics} link={link} />
          <LanguagePanel language={language} onChange={setLanguage} />
          <EventLog logs={logs} />
          <VadPanel phase={phase} />
          <section className="console-panel">
            <div className="section-heading"><div><p className="console-label">OPERATOR PANEL</p><h2>Demo Controls</h2></div><Gauge className="size-5 text-primary" /></div>
            <div className="mt-4 grid grid-cols-3 gap-2"><Button variant="signal" size="sm" onClick={runDemo}><Play />Start</Button><Button variant="console" size="sm" onClick={pause}><Pause />Pause</Button><Button variant="console" size="sm" onClick={reset}><RefreshCw />Reset</Button></div>
            <div className="mt-5 space-y-3 border-t border-border pt-4"><ControlRow icon={link === "Wi-Fi" ? Wifi : Bluetooth} label="Connection" value={link} /><ControlRow icon={Languages} label="Language" value={language} /><ControlRow icon={Radio} label="Mode" value={mode} /><ToggleRow label="STT Engine" checked={enabled.stt} onChange={(value) => setEnabled((state) => ({ ...state, stt: value }))} /><ToggleRow label="TTS Engine" checked={enabled.tts} onChange={(value) => setEnabled((state) => ({ ...state, tts: value }))} /></div>
          </section>
          <Architecture />
        </div>
      </div>
      <footer className="border-t border-border px-4 py-4 text-center text-[9px] tracking-[0.12em] text-muted-foreground">iTANTRA · SIH 2026 TECHNOLOGY DEMONSTRATION · ALL METRICS AND TRANSMISSIONS ARE SIMULATED</footer>
    </main>
  );
}

function ControlRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return <div className="flex items-center justify-between text-[11px]"><span className="flex items-center gap-2 text-muted-foreground"><Icon className="size-3.5" />{label}</span><span className="font-medium">{value}</span></div>;
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="flex items-center justify-between text-[11px]"><span className="text-muted-foreground">{label}</span><div className="flex items-center gap-2"><span className={checked ? "text-success" : "text-muted-foreground"}>{checked ? "ENABLED" : "OFF"}</span><Switch checked={checked} onCheckedChange={onChange} /></div></div>;
}