import { Capacitor, registerPlugin } from '@capacitor/core';

export interface NativeTrack { name: string; url: string }

interface NativeAudioPlugin {
  pickAudio(): Promise<{ tracks: NativeTrack[] }>;
  playPlaylist(options: { tracks: NativeTrack[]; index?: number }): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  select(options: { index: number }): Promise<void>;
  stop(): Promise<void>;
}

interface NativeSpeechPlugin {
  warmup(): Promise<void>;
  speak(options: { text: string; language: string; rate: number; pitch: number }): Promise<void>;
  stop(): Promise<void>;
}

export const isNativeMobile = Capacitor.isNativePlatform();
export const NativeAudio = registerPlugin<NativeAudioPlugin>('NativeAudio');
export const NativeSpeech = registerPlugin<NativeSpeechPlugin>('NativeSpeech');

// Initialize Android's TTS engine while weather data is loading so the first
// spoken forecast does not pay the engine startup cost.
if (isNativeMobile) void NativeSpeech.warmup().catch(() => undefined);
