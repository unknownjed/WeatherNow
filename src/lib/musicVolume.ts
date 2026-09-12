export const DEFAULT_MUSIC_VOLUME = 0.7;

type Command = (name: string, args: number[]) => void;

// Each new iframe needs its volume applied after YouTube becomes ready.
// Preserve later user adjustments instead of forcing 70% on every resume.
export function createYouTubeVolume() {
  let volume = DEFAULT_MUSIC_VOLUME * 100;
  let initialized = false;
  let awaitingVolume: number | null = null;
  return {
    resetFrame() { initialized = false; awaitingVolume = null; },
    handle(message: any, command: Command, shouldPlay: boolean) {
      const ready = message?.event === 'onReady' || message?.event === 'initialDelivery';
      if (!initialized && ready) {
        initialized = true;
        awaitingVolume = volume;
        command('setVolume', [volume]);
        if (shouldPlay) command('playVideo', []);
        return;
      }
      const reportedVolume = message?.info?.volume;
      if (initialized && message?.event === 'infoDelivery' && Number.isFinite(reportedVolume)
        && reportedVolume >= 0 && reportedVolume <= 100) {
        // Ignore the old volume delivered before our initial command is applied.
        if (awaitingVolume !== null && reportedVolume !== awaitingVolume) return;
        awaitingVolume = null;
        volume = reportedVolume;
      }
    },
  };
}
