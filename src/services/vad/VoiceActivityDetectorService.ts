import { VoiceActivityDetector } from '../../core/interfaces/interfaces';

export class VoiceActivityDetectorService implements VoiceActivityDetector {
  private silenceThresholdMs = 1200;
  private isDetecting = false;
  private silenceTimer: any = null;
  private onSpeechStartCb: (() => void) | null = null;
  private onPauseDetectedCb: ((silenceMs: number) => void) | null = null;

  start(onSpeechStart: () => void, onPauseDetected: (silenceMs: number) => void): void {
    this.isDetecting = true;
    this.onSpeechStartCb = onSpeechStart;
    this.onPauseDetectedCb = onPauseDetected;

    // Trigger speech start
    this.onSpeechStartCb();

    // Reset silence timer
    this.resetSilenceTimer();
  }

  stop(): void {
    this.isDetecting = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  setSilenceThreshold(ms: number): void {
    this.silenceThresholdMs = ms;
  }

  private resetSilenceTimer() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      if (this.isDetecting) {
        this.onPauseDetectedCb?.(this.silenceThresholdMs);
      }
    }, this.silenceThresholdMs);
  }
}
