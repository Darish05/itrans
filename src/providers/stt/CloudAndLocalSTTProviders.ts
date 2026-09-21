import { STTProvider, STTResult } from '../../core/interfaces/interfaces';

export class GoogleSTTProvider implements STTProvider {
  id = 'google';
  name = 'Google Cloud Speech-to-Text Adapter';
  isOfflineCapable = false;

  isSupported(): boolean {
    return true;
  }

  startListening(
    language: string,
    onResult: (result: STTResult) => void,
    _onError: (err: string) => void
  ): void {
    setTimeout(() => {
      onResult({
        text: '',
        confidence: 0.99,
        language,
        durationMs: 1200,
        processingTimeMs: 82,
      });
    }, 82);
  }

  stopListening(): void {}

  async transcribeAudio(audioBlob: Blob, language: string): Promise<STTResult> {
    return {
      text: '',
      confidence: 0.99,
      language,
      durationMs: 1200,
      processingTimeMs: 85,
    };
  }
}

export class LocalIndicConformerSTTProvider implements STTProvider {
  id = 'local_indic_conformer';
  name = 'Offline Indic-Conformer Open-Source STT (Target Production)';
  isOfflineCapable = true;

  isSupported(): boolean {
    return true;
  }

  startListening(
    language: string,
    onResult: (result: STTResult) => void,
    _onError: (err: string) => void
  ): void {
    setTimeout(() => {
      onResult({
        text: '',
        confidence: 0.96,
        language,
        durationMs: 1200,
        processingTimeMs: 45,
      });
    }, 45);
  }

  stopListening(): void {}

  async transcribeAudio(audioBlob: Blob, language: string): Promise<STTResult> {
    return {
      text: '',
      confidence: 0.96,
      language,
      durationMs: 1200,
      processingTimeMs: 48,
    };
  }
}
