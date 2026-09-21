import { STTProvider, STTResult } from '../../core/interfaces/interfaces';

const SAMPLE_TRANSCRIPTS: Record<string, string> = {
  'ta-IN': 'வணக்கம், இது குறைந்த பிட்ரேட் வானொலி செய்தி.',
  'hi-IN': 'नमस्ते, यह एक कम बिटरेट रेडियो संदेश है।',
  'en-US': 'Hello, emergency message transmitted via low bitrate transceiver.',
  'en-IN': 'Hello, emergency message transmitted via low bitrate transceiver.',
  'te-IN': 'నమస్కారం, ఇది తక్కువ బిట్‌రేట్ రేడియో సందేశం.',
  'kn-IN': 'ನಮಸ್ಕಾರ, ಇದು ಕಡಿಮೆ ಬಿಟ್‌ರೇಟ್ ರೇಡಿಯೊ ಸಂದೇಶ.',
  'ml-IN': 'നമസ്കാരം, ഇതൊരു കുറഞ്ഞ ബിറ്റ്റേറ്റ് റേഡിയോ സന്ദേശമാണ്.',
  'mr-IN': 'नमस्कार, हा कमी बिटरेट रेडिओ संदेश आहे.',
  'gu-IN': 'નમસ્તે, આ એક ઓછા બિટરેટ રેડિયો સંદેશ છે.',
  'bn-IN': 'নমস্কার, এটি একটি কম বিটরেট রেডিও বার্তা।',
  'or-IN': 'ନମସ୍କାର, ଏହା ଏକ କମ୍ ବିଟରେଟ୍ ରେଡିଓ ସନ୍ଦେଶ।'
};

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
    const text = SAMPLE_TRANSCRIPTS[language] || 'Hello, voice transceiver active.';
    setTimeout(() => {
      onResult({
        text,
        confidence: 0.99,
        language,
        durationMs: 1200,
        processingTimeMs: 82,
      });
    }, 82);
  }

  stopListening(): void {}

  async transcribeAudio(audioBlob: Blob, language: string): Promise<STTResult> {
    const text = SAMPLE_TRANSCRIPTS[language] || 'Hello, voice transceiver active.';
    return {
      text,
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
    const text = SAMPLE_TRANSCRIPTS[language] || 'Hello, voice transceiver active.';
    setTimeout(() => {
      onResult({
        text,
        confidence: 0.96,
        language,
        durationMs: 1200,
        processingTimeMs: 45,
      });
    }, 45);
  }

  stopListening(): void {}

  async transcribeAudio(audioBlob: Blob, language: string): Promise<STTResult> {
    const text = SAMPLE_TRANSCRIPTS[language] || 'Hello, voice transceiver active.';
    return {
      text,
      confidence: 0.96,
      language,
      durationMs: 1200,
      processingTimeMs: 48,
    };
  }
}
