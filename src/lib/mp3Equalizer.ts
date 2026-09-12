export const MP3_BAR_COUNT = 28;

// Log-spaced frequency bands give bass, midrange and treble their own bars.
export function spectrumHeights(data: Uint8Array, sampleRate: number, fftSize: number): number[] {
  const hzPerBin = sampleRate / fftSize;
  const upper = Math.min(16000, sampleRate / 2);
  return Array.from({ length: MP3_BAR_COUNT }, (_, index) => {
    const low = 40 * Math.pow(upper / 40, index / MP3_BAR_COUNT);
    const high = 40 * Math.pow(upper / 40, (index + 1) / MP3_BAR_COUNT);
    const start = Math.max(1, Math.floor(low / hzPerBin));
    const end = Math.min(data.length, Math.max(start + 1, Math.ceil(high / hzPerBin)));
    let peak = 0;
    for (let bin = start; bin < end; bin++) peak = Math.max(peak, data[bin]);
    return 4 + 20 * peak / 255;
  });
}

type CapturableAudio = HTMLAudioElement & {
  captureStream?: () => MediaStream;
  mozCaptureStream?: () => MediaStream;
};

export function createMp3Equalizer() {
  let context: AudioContext | null = null;
  let current: HTMLAudioElement | null = null;
  let analyser: AnalyserNode | null = null;
  let source: AudioNode | null = null;
  let stream: MediaStream | null = null;
  let removeTrackListener: (() => void) | null = null;
  let bytes = new Uint8Array(0);

  const prepare = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      context ??= new AudioContextClass();
      if (context && context.state !== 'running') void context.resume().catch(() => undefined);
    } catch { /* An unavailable visualizer must not prevent music playback. */ }
  };
  const disconnect = () => {
    removeTrackListener?.(); removeTrackListener = null;
    source?.disconnect(); source = null;
    analyser?.disconnect(); analyser = null;
    stream?.getTracks().forEach(track => track.stop()); stream = null;
    current = null;
  };
  const attach = (audio: HTMLAudioElement) => {
    if (current === audio) return;
    if (!context || context.state !== 'running') return;
    disconnect();
    const nextAnalyser = context.createAnalyser();
    nextAnalyser.fftSize = 2048;
    nextAnalyser.smoothingTimeConstant = 0.6;
    nextAnalyser.minDecibels = -85;
    nextAnalyser.maxDecibels = -20;
    const capture = (audio as CapturableAudio).captureStream || (audio as CapturableAudio).mozCaptureStream;
    if (capture) {
      // Analyse a copy on supporting browsers. Do not reroute, double, mute,
      // or otherwise interfere with the existing media playback/background path.
      const captured = capture.call(audio);
      stream = captured;
      const connectTracks = () => {
        if (source || !captured.getAudioTracks().length || !context) return;
        source = context.createMediaStreamSource(captured);
        source.connect(nextAnalyser);
      };
      captured.addEventListener('addtrack', connectTracks);
      removeTrackListener = () => captured.removeEventListener('addtrack', connectTracks);
      connectTracks();
    } else {
      // Safari's fallback needs exactly one source per mounted audio element.
      // Attach only after the context is running so blocked autoplay cannot mute it.
      source = context.createMediaElementSource(audio);
      source.connect(context.destination);
      source.connect(nextAnalyser);
    }
    current = audio;
    analyser = nextAnalyser;
    bytes = new Uint8Array(nextAnalyser.frequencyBinCount);
  };
  return {
    prepare,
    read(audio: HTMLAudioElement): number[] {
      if (audio.paused || audio.ended || audio.readyState < 2) return Array(MP3_BAR_COUNT).fill(4);
      try {
        attach(audio);
        if (analyser && context?.state === 'running') {
          analyser.getByteFrequencyData(bytes);
          return spectrumHeights(bytes, context.sampleRate, analyser.fftSize);
        }
      } catch { /* Preserve playback even if capture is unsupported for a file. */ }
      return Array(MP3_BAR_COUNT).fill(4);
    },
    release: disconnect,
    dispose() {
      disconnect();
      if (context) void context.close().catch(() => undefined);
      context = null;
    },
  };
}
