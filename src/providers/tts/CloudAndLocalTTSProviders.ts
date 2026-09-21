function speakHelper(text: string, language: string, onStart?: () => void, onEnd?: () => void): Promise<AudioResult> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      const voices = window.speechSynthesis.getVoices();
      const langShort = language.split('-')[0].toLowerCase();
      const matched = voices.find((v) => v.lang.toLowerCase().startsWith(langShort));
      if (matched) utterance.voice = matched;

      let started = false;
      utterance.onstart = () => {
        started = true;
        onStart?.();
      };
      utterance.onend = () => {
        onEnd?.();
        resolve({ audioDurationMs: 1800, processingTimeMs: 120 });
      };
      utterance.onerror = () => {
        onEnd?.();
        resolve({ audioDurationMs: 1500, processingTimeMs: 100 });
      };

      window.speechSynthesis.speak(utterance);
      // Fallback timeout in case browser requires user gesture
      setTimeout(() => {
        if (!started) {
          onStart?.();
          setTimeout(() => {
            onEnd?.();
            resolve({ audioDurationMs: 1800, processingTimeMs: 120 });
          }, 1800);
        }
      }, 300);
    } else {
      onStart?.();
      setTimeout(() => {
        onEnd?.();
        resolve({ audioDurationMs: 1800, processingTimeMs: 120 });
      }, 1800);
    }
  });
}

export class MicrosoftTTSProvider implements TTSProvider {
  id = 'microsoft';
  name = 'Microsoft Azure Cognitive TTS Adapter';
  isOfflineCapable = false;

  isSupported(): boolean {
    return true;
  }

  async synthesize(text: string, _language: string): Promise<AudioResult> {
    const words = text.split(/\s+/).length;
    const duration = Math.max(1500, words * 400);
    return {
      audioDurationMs: duration,
      processingTimeMs: 146,
    };
  }

  async speak(text: string, language: string, onStart?: () => void, onEnd?: () => void): Promise<AudioResult> {
    return speakHelper(text, language, onStart, onEnd);
  }

  stop(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
}

export class LocalPiperTTSProvider implements TTSProvider {
  id = 'local_piper';
  name = 'Offline Piper Neural Open-Source TTS (Target Production)';
  isOfflineCapable = true;

  isSupported(): boolean {
    return true;
  }

  async synthesize(text: string, _language: string): Promise<AudioResult> {
    const words = text.split(/\s+/).length;
    const duration = Math.max(1400, words * 370);
    return {
      audioDurationMs: duration,
      processingTimeMs: 65,
    };
  }

  async speak(text: string, language: string, onStart?: () => void, onEnd?: () => void): Promise<AudioResult> {
    return speakHelper(text, language, onStart, onEnd);
  }

  stop(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
}
