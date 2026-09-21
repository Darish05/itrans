import { TTSProvider, AudioResult } from '../../core/interfaces/interfaces';

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

  async speak(
    text: string,
    language: string,
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<AudioResult> {
    onStart?.();
    const result = await this.synthesize(text, language);
    await new Promise((resolve) => setTimeout(resolve, result.audioDurationMs));
    onEnd?.();
    return result;
  }

  stop(): void {}
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

  async speak(
    text: string,
    language: string,
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<AudioResult> {
    onStart?.();
    const result = await this.synthesize(text, language);
    await new Promise((resolve) => setTimeout(resolve, result.audioDurationMs));
    onEnd?.();
    return result;
  }

  stop(): void {}
}
