import React, { useEffect, useRef, useState } from 'react';
import { FolderSearch, Music2, SkipBack, SkipForward, ChevronUp, X, Youtube, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { isNativeMobile, NativeAudio, NativeSpeech } from '../lib/nativeMobile';
import { apiUrl } from '../lib/apiUrl';
import { DEFAULT_MUSIC_VOLUME, createYouTubeVolume } from '../lib/musicVolume';
import { createMp3Equalizer, MP3_BAR_COUNT } from '../lib/mp3Equalizer';
import { matchingMusicHistory, nextDifferentSong, uniquePlaylistSongs, type YouTubeResult as YouTubeSearchResult } from '../lib/musicQueue';

interface LocalTrack {
  name: string;
  url: string;
}

type ActivePlayer = 'none' | 'local' | 'youtube';

const isMobileOrTabletViewport = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(max-width: 1199px)').matches ||
   window.matchMedia('(pointer: coarse)').matches);


const isSupportedAudioFile = (file: File) => {
  const mimeType = file.type.toLowerCase();
  if (mimeType.startsWith('video/')) return false;
  if (mimeType.startsWith('audio/')) return true;
  if (mimeType) return false;
  return /\.(mp3|wav|m4a|aac|ogg|oga|flac|opus)$/i.test(file.name);
};

const stopForecasterSpeech = () => {
  if (isNativeMobile) void NativeSpeech.stop();
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    window.dispatchEvent(new CustomEvent('weathernow:forecaster-state', { detail: { speaking: false } }));
  }
};

const musicLabels: Record<string, { title: string; scan: string; search: string; searching: string; placeholder: string; youtube: string }> = {
  en: { title: 'Music Player', scan: 'Search MP3 Audio', search: 'Search', searching: 'Searching…', placeholder: 'Search music on YouTube', youtube: 'Search YouTube' },
  es: { title: 'Reproductor de música', scan: 'Buscar música del dispositivo', search: 'Buscar', searching: 'Buscando…', placeholder: 'Buscar música en YouTube', youtube: 'Buscar en YouTube' },
  fr: { title: 'Lecteur de musique', scan: 'Analyser la musique', search: 'Rechercher', searching: 'Recherche…', placeholder: 'Rechercher de la musique sur YouTube', youtube: 'Rechercher sur YouTube' },
  de: { title: 'Musik-Player', scan: 'Gerätemusik scannen', search: 'Suchen', searching: 'Suche…', placeholder: 'Musik auf YouTube suchen', youtube: 'YouTube durchsuchen' },
  it: { title: 'Lettore musicale', scan: 'Scansiona musica', search: 'Cerca', searching: 'Ricerca…', placeholder: 'Cerca musica su YouTube', youtube: 'Cerca su YouTube' },
  pt: { title: 'Reprodutor de música', scan: 'Procurar música', search: 'Pesquisar', searching: 'Pesquisando…', placeholder: 'Pesquisar música no YouTube', youtube: 'Pesquisar no YouTube' },
  ja: { title: '音楽プレーヤー', scan: '端末の音楽を検索', search: '検索', searching: '検索中…', placeholder: 'YouTubeで音楽を検索', youtube: 'YouTubeを検索' },
  ko: { title: '음악 플레이어', scan: '기기 음악 검색', search: '검색', searching: '검색 중…', placeholder: 'YouTube에서 음악 검색', youtube: 'YouTube 검색' },
  zh: { title: '音乐播放器', scan: '扫描设备音乐', search: '搜索', searching: '搜索中…', placeholder: '在 YouTube 上搜索音乐', youtube: '搜索 YouTube' },
  hi: { title: 'म्यूजिक प्लेयर', scan: 'डिवाइस संगीत स्कैन करें', search: 'खोजें', searching: 'खोज रहा है…', placeholder: 'YouTube पर संगीत खोजें', youtube: 'YouTube खोजें' },
  ru: { title: 'Музыкальный плеер', scan: 'Сканировать музыку', search: 'Поиск', searching: 'Поиск…', placeholder: 'Поиск музыки на YouTube', youtube: 'Поиск на YouTube' },
  ar: { title: 'مشغل الموسيقى', scan: 'فحص موسيقى الجهاز', search: 'بحث', searching: 'جارٍ البحث…', placeholder: 'ابحث عن موسيقى على YouTube', youtube: 'البحث في YouTube' },
};

export function MusicWidget({ language = 'en', onHide }: { language?: string; onHide?: () => void }) {
  const labels = musicLabels[language] || musicLabels.en;
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const equalizerRef = useRef<HTMLDivElement>(null);
  const equalizerEngine = useRef<ReturnType<typeof createMp3Equalizer> | null>(null);
  if (!equalizerEngine.current) equalizerEngine.current = createMp3Equalizer();
  const youtubeRef = useRef<HTMLIFrameElement>(null);
  const youtubeVolumeRef = useRef(createYouTubeVolume());
  const objectUrlsRef = useRef<string[]>([]);
  const localWasPlayingRef = useRef(false);
  const nativeWasPlayingRef = useRef(false);
  const suppressLocalPauseEventRef = useRef(false);
  const youtubeIsPlayingRef = useRef(false);
  const youtubeWasPlayingRef = useRef(false);
  const forecasterSpeakingRef = useRef(false);
  const youtubePausedForForecasterAtRef = useRef(0);
  const youtubeResultsRef = useRef<YouTubeSearchResult[]>([]);
  const youtubeIndexRef = useRef(-1);
  const youtubeNextPageTokenRef = useRef<string | null>(null);
  const youtubePlaylistRef = useRef<string | null>(null);
  const youtubeSessionRef = useRef(0);
  const nextPendingRef = useRef(false);
  const endedHandledRef = useRef(false);
  const youtubeLoadingMoreRef = useRef(false);
  const activePlayerRef = useRef<ActivePlayer>('none');
  const playerSwitchRef = useRef(0);
  const nativeIsPlayingRef = useRef(false);
  const [tracks, setTracks] = useState<LocalTrack[]>([]);
  const [nativePlaylist, setNativePlaylist] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [localVolume, setLocalVolume] = useState(DEFAULT_MUSIC_VOLUME);
  const [localPlaying, setLocalPlaying] = useState(false);
  const [localCurrentTime, setLocalCurrentTime] = useState(0);
  const [localDuration, setLocalDuration] = useState(0);
  const [localVolumeOpen, setLocalVolumeOpen] = useState(false);
  const [youtubeInput, setYoutubeInput] = useState('');
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [youtubeError, setYoutubeError] = useState('');
  const [youtubeResults, setYoutubeResults] = useState<YouTubeSearchResult[]>([]);
  const [youtubeSuggestions, setYoutubeSuggestions] = useState<string[]>([]);
  const [youtubeSearchHistory, setYoutubeSearchHistory] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('weathernow_youtube_search_history') || '[]');
      return Array.isArray(saved) ? saved.filter(item => typeof item === 'string').slice(0, 20) : [];
    } catch { return []; }
  });
  const [youtubeIndex, setYoutubeIndex] = useState(-1);
  const [youtubeQueueLength, setYoutubeQueueLength] = useState(0);
  const [youtubePlaylistTitle, setYoutubePlaylistTitle] = useState('');
  const [youtubeSearchType, setYoutubeSearchType] = useState<'video' | 'playlist'>('video');
  const [isSearchingYoutube, setIsSearchingYoutube] = useState(false);
  const [youtubeConsent, setYoutubeConsent] = useState(() => localStorage.getItem('weathernow_youtube_consent') === 'true');
  const [youtubeConsentAcknowledged, setYoutubeConsentAcknowledged] = useState(() => localStorage.getItem('weathernow_youtube_consent_acknowledged') === 'true');
  const [activePlayer, setActivePlayer] = useState<ActivePlayer>('none');

  const activatePlayer = (player: ActivePlayer) => {
    activePlayerRef.current = player;
    setActivePlayer(player);
  };

  const updateYouTubeMediaNotification = (
    result: YouTubeSearchResult | undefined,
    playbackState: 'playing' | 'paused',
  ) => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !result) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: result.title || 'YouTube',
        artist: result.channelTitle || 'YouTube',
        album: youtubePlaylistTitle || 'YouTube',
        artwork: result.thumbnail ? [{ src: result.thumbnail }] : [],
      });
      navigator.mediaSession.playbackState = playbackState;
    } catch {
      // Media Session is optional; YouTube playback must continue if unsupported.
    }
  };

  const clearYouTubeMediaNotification = () => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = 'none';
      navigator.mediaSession.metadata = null;
    } catch {
      // Ignore browsers/devices that expose only part of the Media Session API.
    }
  };

  useEffect(() => () => objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

  useEffect(() => {
    // Resume from a real user gesture, including keyboard play/pause and file picking.
    const unlock = () => { if (!isNativeMobile) equalizerEngine.current?.prepare(); };
    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('keydown', unlock);
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      equalizerEngine.current?.dispose();
    };
  }, []);

  useEffect(() => {
    const bars = Array.from(equalizerRef.current?.children || []) as HTMLElement[];
    const flatten = () => bars.forEach(bar => { bar.style.height = '4px'; });
    const audio = audioRef.current;
    if (!audio || nativePlaylist) { equalizerEngine.current?.release(); flatten(); return; }
    if (!localPlaying || activePlayer !== 'local') { flatten(); return; }
    equalizerEngine.current?.prepare();
    let frame = 0;
    let lastFrame = 0;
    const draw = (time: number) => {
      // Reduced-motion still shows real levels, but updates less frequently.
      const interval = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 125 : 33;
      if (time - lastFrame >= interval && !document.hidden) {
        const heights = equalizerEngine.current?.read(audio);
        if (heights) bars.forEach((bar, index) => { bar.style.height = `${heights[index]}px`; });
        lastFrame = time;
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); flatten(); };
  }, [localPlaying, activePlayer, nativePlaylist, tracks, trackIndex]);

  useEffect(() => {
    const query = youtubeInput.trim();
    if (!youtubeConsent || !query) {
      setYoutubeSuggestions([]);
      return;
    }
    const matchingHistory = matchingMusicHistory(youtubeSearchHistory, query);
    setYoutubeSuggestions(matchingHistory);
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(apiUrl(`/api/youtube-search?q=${encodeURIComponent(query)}`), { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        if (controller.signal.aborted) return;
        const seen = new Set<string>(matchingHistory.map(item => item.toLowerCase()));
        const apiSuggestions = (data.items || []).map((item: YouTubeSearchResult) => item.title.trim()).filter((title: string) => {
          const key = title.toLowerCase();
          if (!title || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setYoutubeSuggestions([...matchingHistory, ...apiSuggestions].slice(0, 5));
      } catch (error) {
        if (!controller.signal.aborted) setYoutubeSuggestions(matchingHistory);
      }
    }, 600);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [youtubeConsent, youtubeInput, youtubeSearchHistory]);

  const playYouTubeAt = async (index: number) => {
    const result = youtubeResultsRef.current[index];
    if (!result?.videoId) return;
    const switchId = ++playerSwitchRef.current;
    if (audioRef.current && !audioRef.current.paused) suppressLocalPauseEventRef.current = true;
    audioRef.current?.pause();
    if (isNativeMobile) {
      await NativeAudio.pause().catch(() => undefined);
      nativeIsPlayingRef.current = false;
    }
    if (switchId !== playerSwitchRef.current) return;
    localWasPlayingRef.current = false;
    activatePlayer('youtube');
    stopForecasterSpeech();
    window.dispatchEvent(new CustomEvent('weathernow:music-state', { detail: { playing: true } }));
    youtubeIndexRef.current = index;
    endedHandledRef.current = false;
    setYoutubeIndex(index);
    setYoutubeId(result.videoId);
  };

  const loadMoreYouTubeResults = async () => {
    const pageToken = youtubeNextPageTokenRef.current;
    const playlist = youtubePlaylistRef.current;
    const session = youtubeSessionRef.current;
    if (!pageToken || !playlist || youtubeLoadingMoreRef.current) return false;
    youtubeLoadingMoreRef.current = true;
    try {
      const response = await fetch(apiUrl(`/api/youtube-playlist?id=${encodeURIComponent(playlist)}&pageToken=${encodeURIComponent(pageToken)}`));
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load more songs.');
      if (session !== youtubeSessionRef.current) return false;
      const additions = uniquePlaylistSongs(youtubeResultsRef.current, data.items || []);
      const combined = [...youtubeResultsRef.current, ...additions];
      youtubeResultsRef.current = combined;
      youtubeNextPageTokenRef.current = data.nextPageToken !== pageToken ? data.nextPageToken || null : null;
      setYoutubeQueueLength(combined.length);
      return true;
    } catch (error) {
      if (session === youtubeSessionRef.current) setYoutubeError(error instanceof Error ? error.message : 'Unable to load more songs.');
      return false;
    } finally {
      youtubeLoadingMoreRef.current = false;
    }
  };

  const playNextYouTube = async () => {
    if (nextPendingRef.current) return;
    if (!youtubePlaylistRef.current) {
      const nextIndex = nextDifferentSong(youtubeResultsRef.current, youtubeIndexRef.current);
      if (nextIndex >= 0) { await playYouTubeAt(nextIndex); return; }
      setYoutubeError('End of YouTube search results.');
      return;
    }
    nextPendingRef.current = true;
    const session = youtubeSessionRef.current;
    const switchId = playerSwitchRef.current;
    try {
      while (session === youtubeSessionRef.current && switchId === playerSwitchRef.current) {
        const nextIndex = nextDifferentSong(youtubeResultsRef.current, youtubeIndexRef.current);
        if (nextIndex >= 0) { await playYouTubeAt(nextIndex); return; }
        if (!youtubeNextPageTokenRef.current) {
          setYoutubeError('End of playlist — no different songs remain.');
          return;
        }
        if (!await loadMoreYouTubeResults()) return;
      }
    } finally { nextPendingRef.current = false; }
  };

  const selectYouTubeResult = async (result: YouTubeSearchResult) => {
    const session = ++youtubeSessionRef.current;
    const switchId = playerSwitchRef.current;
    setYoutubeError('');
    if (!result.playlistId) {
      youtubePlaylistRef.current = null;
      youtubeNextPageTokenRef.current = null;
      const queue = youtubeResultsRef.current.length ? youtubeResultsRef.current : [result];
      youtubeResultsRef.current = queue;
      setYoutubePlaylistTitle('');
      setYoutubeQueueLength(queue.length);
      await playYouTubeAt(Math.max(0, queue.findIndex(item => item.videoId === result.videoId)));
      return;
    }
    setIsSearchingYoutube(true);
    try {
      let pageToken = '';
      const visited = new Set<string>();
      while (!visited.has(pageToken)) {
        visited.add(pageToken);
        const response = await fetch(apiUrl(`/api/youtube-playlist?id=${encodeURIComponent(result.playlistId)}&pageToken=${encodeURIComponent(pageToken)}`));
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Playlist unavailable.');
        if (session !== youtubeSessionRef.current || switchId !== playerSwitchRef.current) return;
        const queue = uniquePlaylistSongs([], data.items || []);
        if (queue.length) {
          youtubePlaylistRef.current = result.playlistId;
          youtubeNextPageTokenRef.current = data.nextPageToken || null;
          youtubeResultsRef.current = queue;
          setYoutubePlaylistTitle(result.title);
          setYoutubeQueueLength(queue.length);
          await playYouTubeAt(0);
          return;
        }
        if (!data.nextPageToken) break;
        pageToken = data.nextPageToken;
      }
      throw new Error('This playlist has no available embeddable videos.');
    } catch (error) {
      if (session === youtubeSessionRef.current) setYoutubeError(error instanceof Error ? error.message : 'Playlist unavailable.');
    } finally { if (session === youtubeSessionRef.current) setIsSearchingYoutube(false); }
  };

  const closeYouTubePlayer = (announceStopped = true) => {
    youtubeSessionRef.current++;
    playerSwitchRef.current += 1;
    const iframe = youtubeRef.current;
    iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'stopVideo', args: [] }), 'https://www.youtube-nocookie.com');
    iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), 'https://www.youtube-nocookie.com');
    // Navigating the iframe to a blank document guarantees that an embedded
    // YouTube media session cannot continue after the player is hidden.
    if (iframe) iframe.src = 'about:blank';
    youtubeIsPlayingRef.current = false;
    youtubeWasPlayingRef.current = false;
    setYoutubeId(null);
    setYoutubeResults([]);
    youtubeResultsRef.current = [];
    youtubeIndexRef.current = -1;
    setYoutubeIndex(-1);
    setYoutubeQueueLength(0);
    youtubePlaylistRef.current = null;
    youtubeNextPageTokenRef.current = null;
    setYoutubePlaylistTitle('');
    setYoutubeInput('');
    setYoutubeSuggestions([]);
    setYoutubeError('');
    setIsSearchingYoutube(false);
    if (activePlayerRef.current === 'youtube') activatePlayer('none');
    clearYouTubeMediaNotification();
    if (announceStopped) window.dispatchEvent(new CustomEvent('weathernow:music-state', { detail: { playing: false, stopped: true } }));
  };

  const pauseYouTubeForDeviceMusic = () => {
    playerSwitchRef.current += 1;
    const iframe = youtubeRef.current;
    iframe?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), 'https://www.youtube-nocookie.com');
    youtubeIsPlayingRef.current = false;
    youtubeWasPlayingRef.current = false;
    clearYouTubeMediaNotification();
  };

  const resumePreservedYouTube = async () => {
    if (!youtubeId) return;
    const switchId = ++playerSwitchRef.current;
    if (audioRef.current && !audioRef.current.paused) suppressLocalPauseEventRef.current = true;
    audioRef.current?.pause();
    if (isNativeMobile) await NativeAudio.pause().catch(() => undefined);
    if (switchId !== playerSwitchRef.current) return;
    localWasPlayingRef.current = false;
    activatePlayer('youtube');
    stopForecasterSpeech();
    window.dispatchEvent(new CustomEvent('weathernow:music-state', { detail: { playing: true } }));
    youtubeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), 'https://www.youtube-nocookie.com');
  };

  useEffect(() => {
    const handleYouTubeState = (event: MessageEvent) => {
      if (!['https://www.youtube.com', 'https://www.youtube-nocookie.com'].includes(event.origin)) return;
      const iframe = youtubeRef.current;
      if (!iframe || event.source !== iframe.contentWindow) return;
      try {
        const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        youtubeVolumeRef.current.handle(message, (func, args) => {
          iframe.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), 'https://www.youtube-nocookie.com');
        }, activePlayerRef.current === 'youtube' && !youtubeWasPlayingRef.current && !window.speechSynthesis?.speaking);
        if (activePlayerRef.current !== 'youtube') return;
        if (message?.event === 'onStateChange' || message?.info?.playerState !== undefined) {
          const state = typeof message.info === 'number' ? message.info : message.info?.playerState;
          youtubeIsPlayingRef.current = state === 1;
          const currentResult = youtubeResultsRef.current[youtubeIndexRef.current];

          if (state === 1) {
            endedHandledRef.current = false;
            if (document.hidden && isMobileOrTabletViewport()) {
              iframe.contentWindow?.postMessage(
                JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
                'https://www.youtube-nocookie.com',
              );
              youtubeIsPlayingRef.current = false;
              updateYouTubeMediaNotification(currentResult, 'paused');
              window.dispatchEvent(new CustomEvent('weathernow:music-state', {
                detail: { playing: false, source: 'youtube', paused: true },
              }));
              return;
            }

            const mobileOrTablet = isMobileOrTabletViewport();
            const msSinceForecasterPause =
              Date.now() - youtubePausedForForecasterAtRef.current;
            const stalePlayingDuringForecasterHandoff =
              mobileOrTablet &&
              forecasterSpeakingRef.current &&
              youtubeWasPlayingRef.current &&
              youtubePausedForForecasterAtRef.current > 0 &&
              msSinceForecasterPause >= 0 &&
              msSinceForecasterPause < 450;

            if (stalePlayingDuringForecasterHandoff) {
              // A very fast late PLAYING event can arrive after our automatic
              // pauseVideo request. Re-pause only that immediate stale event.
              // A later real user Play tap must stop the forecaster.
              youtubeIsPlayingRef.current = false;
              iframe.contentWindow?.postMessage(
                JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
                '*',
              );
              return;
            }

            if (mobileOrTablet && forecasterSpeakingRef.current) {
              // Mobile/tablet only: a genuine YouTube Play while the forecast is
              // speaking gives priority to the user's music action.
              youtubeWasPlayingRef.current = false;
              youtubePausedForForecasterAtRef.current = 0;
              forecasterSpeakingRef.current = false;
              stopForecasterSpeech();
            } else {
              stopForecasterSpeech();
            }
            updateYouTubeMediaNotification(currentResult, 'playing');
            window.dispatchEvent(new CustomEvent('weathernow:music-state', {
              detail: { playing: true, source: 'youtube' },
            }));
          }

          if (state === 2) {
            updateYouTubeMediaNotification(currentResult, 'paused');
            window.dispatchEvent(new CustomEvent('weathernow:music-state', {
              detail: { playing: false, source: 'youtube', paused: true },
            }));
          }

          if ((state === -1 || state === 5) && activePlayerRef.current === 'youtube') {
            updateYouTubeMediaNotification(currentResult, 'paused');
            window.dispatchEvent(new CustomEvent('weathernow:music-state', {
              detail: { playing: false, source: 'youtube', paused: true },
            }));
          }

          if (state === 0 && !endedHandledRef.current && activePlayerRef.current === 'youtube') {
            endedHandledRef.current = true;
            clearYouTubeMediaNotification();
            window.dispatchEvent(new CustomEvent('weathernow:music-state', {
              detail: { playing: false, source: 'youtube', paused: true },
            }));
            void playNextYouTube();
          }
        }
      } catch {}
    };

    const handleForecasterState = (event: Event) => {
      const speaking = Boolean((event as CustomEvent<{ speaking: boolean }>).detail?.speaking);
      forecasterSpeakingRef.current = speaking;
      const audio = audioRef.current;

      if (speaking) {
        // Browser MP3: pause only if it was actually playing, then remember that
        // state so it can resume after the forecast finishes.
        localWasPlayingRef.current =
          activePlayerRef.current === 'local' &&
          !nativePlaylist &&
          Boolean(audio && !audio.paused);
        if (localWasPlayingRef.current) audio?.pause();

        // Native/mobile MP3 uses NativeAudio instead of the hidden HTML audio tag.
        nativeWasPlayingRef.current =
          activePlayerRef.current === 'local' &&
          nativePlaylist &&
          nativeIsPlayingRef.current;
        if (nativeWasPlayingRef.current) {
          void NativeAudio.pause().catch(() => undefined);
          nativeIsPlayingRef.current = false;
          window.dispatchEvent(new CustomEvent('weathernow:music-state', {
            detail: { playing: false, source: 'local', paused: true, pausedForForecaster: true },
          }));
        }

        youtubeWasPlayingRef.current =
          activePlayerRef.current === 'youtube' &&
          youtubeIsPlayingRef.current;
        if (youtubeWasPlayingRef.current) {
          if (isMobileOrTabletViewport()) {
            youtubePausedForForecasterAtRef.current = Date.now();
          }
          youtubeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
            '*',
          );
        }
      } else {
        if (localWasPlayingRef.current && activePlayerRef.current === 'local' && !nativePlaylist) {
          void audio?.play().catch(() => undefined);
        }

        if (nativeWasPlayingRef.current && activePlayerRef.current === 'local' && nativePlaylist) {
          void NativeAudio.resume().then(() => {
            nativeIsPlayingRef.current = true;
            window.dispatchEvent(new CustomEvent('weathernow:music-state', {
              detail: { playing: true, source: 'local', resumedAfterForecaster: true },
            }));
          }).catch(() => undefined);
        }

        if (youtubeWasPlayingRef.current && activePlayerRef.current === 'youtube') {
          youtubeRef.current?.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
            '*',
          );
        }

        localWasPlayingRef.current = false;
        nativeWasPlayingRef.current = false;
        youtubeWasPlayingRef.current = false;
        youtubePausedForForecasterAtRef.current = 0;
      }
    };

    window.addEventListener('message', handleYouTubeState);
    window.addEventListener('weathernow:forecaster-state', handleForecasterState);
    return () => {
      window.removeEventListener('message', handleYouTubeState);
      window.removeEventListener('weathernow:forecaster-state', handleForecasterState);
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        !document.hidden ||
        activePlayerRef.current !== 'youtube' ||
        !isMobileOrTabletViewport()
      ) return;

      youtubeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
        'https://www.youtube-nocookie.com',
      );
      youtubeIsPlayingRef.current = false;
      clearYouTubeMediaNotification();
      window.dispatchEvent(new CustomEvent('weathernow:music-state', {
        detail: { playing: false, source: 'youtube', paused: true },
      }));
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    const sendYouTubeCommand = (func: string) => {
      if (activePlayerRef.current !== 'youtube') return;
      youtubeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func, args: [] }),
        'https://www.youtube-nocookie.com',
      );
    };

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        if (document.hidden && isMobileOrTabletViewport()) return;
        sendYouTubeCommand('playVideo');
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        sendYouTubeCommand('pauseVideo');
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => { void playNextYouTube(); });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (activePlayerRef.current !== 'youtube') return;
        const previousIndex = Math.max(0, youtubeIndexRef.current - 1);
        if (previousIndex !== youtubeIndexRef.current) void playYouTubeAt(previousIndex);
      });
    } catch {
      // Some browsers expose Media Session but not every action.
    }

    return () => {
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
      } catch {}
    };
  }, []);

  useEffect(() => {
    const stopForecaster = (event: Event) => {
      const playing = Boolean(
        (event as CustomEvent<{ playing?: boolean }>).detail?.playing,
      );
      // Pausing music because the forecaster started must never cancel the
      // forecast itself. Only a real transition into music playback wins.
      if (!playing) return;
      if (window.speechSynthesis?.speaking || window.speechSynthesis?.pending) {
        window.speechSynthesis.cancel();
      }
    };
    window.addEventListener('weathernow:music-state', stopForecaster);
    return () => window.removeEventListener('weathernow:music-state', stopForecaster);
  }, []);

  useEffect(() => {
    if (!tracks.length || nativePlaylist || activePlayer !== 'local') return;
    void audioRef.current?.play().catch(() => undefined);
  }, [tracks, trackIndex, nativePlaylist, activePlayer]);

  useEffect(() => {
    if (!localVolumeOpen) return;
    const closeVolumeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('.music-volume-control')) setLocalVolumeOpen(false);
    };
    document.addEventListener('pointerdown', closeVolumeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeVolumeOnOutsideClick);
  }, [localVolumeOpen]);

  const loadAudioFiles = (files: File[]) => {
    const audioFiles = files.filter(isSupportedAudioFile);
    if (!audioFiles.length) {
      setYoutubeError('No valid audio files were selected. Video files are not supported.');
      return;
    }
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    pauseYouTubeForDeviceMusic();
    const nextTracks = audioFiles.map((file) => ({ name: file.name, url: URL.createObjectURL(file) }));
    activatePlayer('local');
    stopForecasterSpeech();
    window.dispatchEvent(new CustomEvent('weathernow:music-state', { detail: { playing: true } }));
    objectUrlsRef.current = nextTracks.map((track) => track.url);
    setNativePlaylist(false);
    setTracks(nextTracks);
    // Switching to device audio clears only the YouTube search session.
    setYoutubeResults([]);
    setYoutubeInput('');
    setTrackIndex(0);
    setLocalCurrentTime(0);
    setLocalDuration(0);
    setYoutubeError('');
  };

  const scanDeviceMusic = async () => {
    if (isNativeMobile) {
      const result = await NativeAudio.pickAudio();
      if (!result.tracks.length) return;
      setNativePlaylist(true);
      setTracks(result.tracks);
      setYoutubeResults([]);
      setYoutubeInput('');
      setTrackIndex(0);
      setLocalCurrentTime(0);
      setLocalDuration(0);
      pauseYouTubeForDeviceMusic();
      activatePlayer('local');
      stopForecasterSpeech();
      await NativeAudio.playPlaylist({ tracks: result.tracks, index: 0 });
      nativeIsPlayingRef.current = true;
      window.dispatchEvent(new CustomEvent('weathernow:music-state', { detail: { playing: true } }));
      return;
    }
    // Clear the previous selection so choosing the same MP3 again still fires change.
    if (inputRef.current) inputRef.current.value = '';
    inputRef.current?.click();
  };

  const searchYouTube = async (queryOverride?: string) => {
    if (!youtubeConsent) {
      setYoutubeError('Accept the YouTube and Google privacy notice before searching.');
      return;
    }
    const query = (queryOverride ?? youtubeInput).trim();
    if (query.length < 2) {
      setYoutubeError('Enter a song, artist, or music topic.');
      return;
    }
    setYoutubeError('');
    // Keep the device MP3 player mounted and its playlist intact while a
    // YouTube search is performed. Only clear an already-active YouTube
    // video before replacing it with new search results.
    if (activePlayerRef.current === 'youtube' || youtubeId) closeYouTubePlayer();
    const session = ++youtubeSessionRef.current;
    setIsSearchingYoutube(true);
    setYoutubeInput('');
    setYoutubeSuggestions([]);
    try {
      const response = await fetch(apiUrl(`/api/youtube-search?q=${encodeURIComponent(query)}&type=${youtubeSearchType}`));
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('application/json')) {
        throw new Error('WeatherNow is still running the previous server version. Restart the dashboard server, then try again.');
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'YouTube search failed.');
      if (session !== youtubeSessionRef.current) return;
      setYoutubeConsentAcknowledged(true);
      localStorage.setItem('weathernow_youtube_consent_acknowledged', 'true');
      const results = data.items || [];
      const uniqueResults = youtubeSearchType === 'playlist' ? results : uniquePlaylistSongs([], results);
      youtubePlaylistRef.current = null;
      youtubeNextPageTokenRef.current = null;
      youtubeResultsRef.current = uniqueResults;
      setYoutubeQueueLength(uniqueResults.length);
      setYoutubePlaylistTitle('');
      youtubeIndexRef.current = -1;
      setYoutubeIndex(-1);
      setYoutubeResults(uniqueResults);
      const nextHistory = [query, ...youtubeSearchHistory.filter(item => item.toLowerCase() !== query.toLowerCase())].slice(0, 20);
      setYoutubeSearchHistory(nextHistory);
      localStorage.setItem('weathernow_youtube_search_history', JSON.stringify(nextHistory));
      if (!(data.items || []).length) setYoutubeError('No matching YouTube results were found.');
    } catch (error) {
      if (session === youtubeSessionRef.current) { setYoutubeResults([]); setYoutubeError(error instanceof Error ? error.message : 'YouTube search failed.'); }
    } finally {
      if (session === youtubeSessionRef.current) setIsSearchingYoutube(false);
    }
  };

  useEffect(() => {
    const handleDesktopShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditing = Boolean(target?.closest('input, textarea, select, [contenteditable="true"]'));
      if (event.ctrlKey && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        if (isNativeMobile) void scanDeviceMusic();
        else {
          if (inputRef.current) inputRef.current.value = '';
          inputRef.current?.click();
        }
        return;
      }
      if (event.code !== 'Space' || isEditing || event.ctrlKey || event.altKey || event.metaKey) return;
      event.preventDefault();
      if (activePlayerRef.current === 'youtube' && youtubeId) {
        const command = youtubeIsPlayingRef.current ? 'pauseVideo' : 'playVideo';
        youtubeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: command, args: [] }), 'https://www.youtube-nocookie.com');
      } else if (activePlayerRef.current === 'local' && audioRef.current) {
        if (audioRef.current.paused) void audioRef.current.play().catch(() => undefined);
        else audioRef.current.pause();
      } else if (activePlayerRef.current === 'local' && isNativeMobile && nativePlaylist) {
        if (nativeIsPlayingRef.current) {
          void NativeAudio.pause();
          nativeIsPlayingRef.current = false;
          window.dispatchEvent(new CustomEvent('weathernow:music-state', { detail: { playing: false, paused: true } }));
        } else {
          stopForecasterSpeech();
          void NativeAudio.resume();
          nativeIsPlayingRef.current = true;
          window.dispatchEvent(new CustomEvent('weathernow:music-state', { detail: { playing: true } }));
        }
      }
    };
    window.addEventListener('keydown', handleDesktopShortcut);
    return () => window.removeEventListener('keydown', handleDesktopShortcut);
  }, [youtubeId, nativePlaylist]);

  return (
    <div className="bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-xl p-3 flex flex-col gap-2 shadow-inner flex-none min-h-[220px]">
      <div className="flex flex-col items-start gap-2">
        <div className="flex w-full items-center justify-between gap-2">
          <h3 className="text-[10px] lg:text-xs font-bold uppercase tracking-widest text-sky-800 dark:text-slate-400 flex items-center gap-2">
            <Music2 size={13} className="text-indigo-600 dark:text-indigo-400" />
            {labels.title}
          </h3>
          {onHide && <button type="button" onClick={onHide} className="rounded-md bg-slate-800 px-2 py-2 text-[11px] font-bold text-white hover:bg-slate-700" aria-label="Collapse music player" title="Collapse music player"><ChevronUp size={14} /></button>}
        </div>
        <button onClick={() => void scanDeviceMusic()} className="music-scan-button w-fit self-start whitespace-nowrap flex items-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-500 px-2.5 py-2 text-[11px] font-bold text-white">
          <FolderSearch size={14} /> {labels.scan}
        </button>
        <input ref={inputRef} type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac" multiple className="hidden" onChange={(event) => { const files = Array.from(event.currentTarget.files ?? []) as File[]; event.currentTarget.value = ''; loadAudioFiles(files); }} />
      </div>

      {tracks.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {tracks.length > 1 && (
            <div className="mp3-track-list" aria-label="MP3 playlist">
              {tracks.map((track, index) => (
                <button key={`${track.url}-${index}`} type="button" aria-current={index === trackIndex ? 'true' : undefined}
                  onClick={() => { if (nativePlaylist) { pauseYouTubeForDeviceMusic(); activatePlayer('local'); nativeIsPlayingRef.current = true; void NativeAudio.select({ index }); } else { setLocalCurrentTime(0); setLocalDuration(0); setTrackIndex(index); activatePlayer('local'); } }} className={`mp3-track-row ${index === trackIndex ? 'mp3-track-row-active' : ''}`}>
                  <span className="truncate">{track.name}</span><span className="text-[9px] opacity-70">{index + 1}</span>
                </button>
              ))}
            </div>
          )}
          {nativePlaylist ? (
            <div className="flex items-center justify-center gap-3 rounded-md !bg-white p-2 dark:!bg-slate-800">
              <button aria-label="Previous" onClick={() => { pauseYouTubeForDeviceMusic(); activatePlayer('local'); nativeIsPlayingRef.current = true; void NativeAudio.previous(); }}><SkipBack size={18} /></button>
              <button onClick={() => { pauseYouTubeForDeviceMusic(); activatePlayer('local'); stopForecasterSpeech(); nativeIsPlayingRef.current = true; void NativeAudio.resume(); }} className="text-xs font-bold">Play</button>
              <button onClick={() => { nativeIsPlayingRef.current = false; void NativeAudio.pause(); window.dispatchEvent(new CustomEvent('weathernow:music-state', { detail: { playing: false, paused: true } })); }} className="text-xs font-bold">Pause</button>
              <button aria-label="Next" onClick={() => { pauseYouTubeForDeviceMusic(); activatePlayer('local'); nativeIsPlayingRef.current = true; void NativeAudio.next(); }}><SkipForward size={18} /></button>
              <button aria-label="Stop" onClick={() => { nativeIsPlayingRef.current = false; void NativeAudio.stop(); window.dispatchEvent(new CustomEvent('weathernow:music-state', { detail: { playing: false, stopped: true } })); activatePlayer('none'); setTracks([]); setNativePlaylist(false); }}><X size={18} /></button>
            </div>
          ) : (
            <div className="flex w-full items-center gap-2 rounded-md border border-slate-200 !bg-white p-2 text-slate-900 dark:border-slate-700 dark:!bg-slate-800 dark:text-slate-100">
              <audio ref={(audio) => { audioRef.current = audio; if (audio) audio.volume = localVolume; }} key={tracks[trackIndex]?.url} autoPlay controls={false} onTimeUpdate={(event) => setLocalCurrentTime(event.currentTarget.currentTime)} onLoadedMetadata={(event) => setLocalDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)} onPlaying={() => setLocalPlaying(true)} onWaiting={() => setLocalPlaying(false)} onPlay={() => { if (activePlayerRef.current !== 'local') { pauseYouTubeForDeviceMusic(); activatePlayer('local'); } stopForecasterSpeech(); window.dispatchEvent(new CustomEvent('weathernow:music-state', { detail: { playing: true } })); }} onPause={() => { setLocalPlaying(false); if (suppressLocalPauseEventRef.current) { suppressLocalPauseEventRef.current = false; return; } if (!localWasPlayingRef.current) window.dispatchEvent(new CustomEvent('weathernow:music-state', { detail: { playing: false, paused: true } })); }} onContextMenu={(event) => event.preventDefault()} className="pointer-events-none absolute h-px w-px opacity-0" onEnded={() => { setLocalPlaying(false); setLocalCurrentTime(0); setTrackIndex((index) => (index + 1) % tracks.length); }} src={tracks[trackIndex]?.url} />
              <button type="button" aria-label={localPlaying ? 'Pause MP3' : 'Play MP3'} title={localPlaying ? 'Pause' : 'Play'} onClick={() => { if (audioRef.current?.paused) void audioRef.current.play().catch(() => undefined); else audioRef.current?.pause(); }} className="rounded-md p-1.5 text-black hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-slate-700">{localPlaying ? <Pause size={17} /> : <Play size={17} />}</button>
              <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-800 dark:text-slate-100" title={tracks[trackIndex]?.name}>{tracks[trackIndex]?.name}</span>
              <div className="music-volume-control relative flex items-center">
                <button type="button" aria-label="MP3 volume" title="Volume" onClick={() => setLocalVolumeOpen((open) => !open)} className="rounded-md p-1.5 text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-700">{localVolume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
                {localVolumeOpen && <label className="absolute bottom-9 right-0 z-20 flex flex-col items-center gap-1 rounded-md border border-slate-200 bg-white p-2 text-slate-900 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"><span className="sr-only">MP3 volume</span><input aria-label="MP3 volume" type="range" min="0" max="1" step="0.01" value={localVolume} onChange={(event) => { const volume = Number(event.target.value); setLocalVolume(volume); if (audioRef.current) audioRef.current.volume = volume; }} style={{ writingMode: 'vertical-lr', direction: 'rtl' }} className="h-20 w-2 accent-black dark:accent-blue-500" /><span className="text-[9px]">{Math.round(localVolume * 100)}%</span></label>}
              </div>
              <button type="button" aria-label="Close MP3 player" title="Close" onClick={() => { audioRef.current?.pause(); setLocalPlaying(false); setLocalVolumeOpen(false); window.dispatchEvent(new CustomEvent('weathernow:music-state', { detail: { playing: false, stopped: true } })); activatePlayer('none'); setTracks([]); setTrackIndex(0); }} className="rounded-md p-1.5 text-slate-700 hover:bg-red-100 hover:text-red-600 dark:text-slate-200 dark:hover:bg-red-900/40"><X size={17} /></button>
            </div>
          )}
          {!nativePlaylist && <div ref={equalizerRef} className="mp3-equalizer" data-playing={localPlaying && activePlayer === 'local'} aria-hidden="true">
            {Array.from({ length: MP3_BAR_COUNT }, (_, index) => <span key={index} />)}
          </div>}
          {!nativePlaylist && <label className="mp3-seek-control"><span className="sr-only">MP3 seek</span><input aria-label="MP3 seek" type="range" min="0" max={localDuration || 0} step="0.1" value={Math.min(localCurrentTime, localDuration || 0)} disabled={!localDuration} onChange={(event) => { const time = Number(event.target.value); setLocalCurrentTime(time); if (audioRef.current) audioRef.current.currentTime = time; }} /></label>}
        </div>
      )}

        <div className="mt-3 flex flex-col gap-1.5">
          <span className="text-[11px] text-slate-800 dark:text-slate-200">{labels.youtube}</span>
          <div className="flex items-center gap-1.5">
            <Youtube size={18} className="flex-none text-red-500" />
            <div className="relative min-w-0 flex-1">
              <input value={youtubeInput} onChange={(event) => { setYoutubeSuggestions([]); setYoutubeInput(event.target.value); }} onKeyDown={(event) => event.key === 'Enter' && void searchYouTube()} placeholder={labels.placeholder} autoComplete="off" className="w-full rounded-md border border-sky-200 !bg-white px-3 py-2.5 text-[11px] font-bold placeholder:font-bold text-slate-800 outline-none transition-all focus:border-white focus:ring-1 focus:ring-white focus:shadow-none dark:border-slate-700 dark:!bg-slate-800 dark:text-slate-200 dark:focus:border-blue-500 dark:focus:ring-0" />
              {youtubeInput.trim().length > 0 && youtubeSuggestions.length > 0 && (
                <div className="youtube-search-suggestions absolute bottom-full left-0 right-0 z-[1300] mb-1 max-h-52 overflow-y-auto rounded-md border border-sky-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                  {youtubeSuggestions.map((suggestion) => (
                    <button key={suggestion} type="button" onClick={() => { setYoutubeSuggestions([]); void searchYouTube(suggestion); }} className="block w-full truncate px-3 py-2 text-left text-[11px] font-bold text-slate-900 hover:bg-sky-100 dark:text-slate-100 dark:hover:bg-slate-700">
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button disabled={isSearchingYoutube || !youtubeConsent} onClick={() => void searchYouTube()} className="rounded-md bg-red-600 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 px-3 py-2.5 text-[11px] font-bold text-white">{isSearchingYoutube ? labels.searching : labels.search}</button>
          </div>
          {!youtubeConsentAcknowledged && (
            <label className="flex items-start gap-1.5 text-[9px] leading-tight text-sky-800 dark:text-slate-400">
              <input type="checkbox" checked={youtubeConsent} onChange={(event) => { setYoutubeConsent(event.target.checked); localStorage.setItem('weathernow_youtube_consent', String(event.target.checked)); }} className="mt-0.5" />
              <span>I agree to the <a className="text-blue-600 underline" href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">YouTube Terms</a> and acknowledge the <a className="text-blue-600 underline" href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google Privacy Policy</a>. Search terms are sent to YouTube.</span>
            </label>
          )}
          {youtubeError && <span className="text-[9px] text-red-500">{youtubeError}</span>}
          {youtubeResults.length > 0 && !youtubeId && (
            <div className="youtube-search-results grid max-h-52 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
              {youtubeResults.map((result, index) => (
                <button key={result.playlistId || result.videoId} disabled={isSearchingYoutube} onClick={() => void selectYouTubeResult(result)} className="flex items-center gap-2 rounded-lg border border-sky-200 bg-white p-1.5 text-left font-bold hover:border-red-500 dark:border-slate-700 dark:bg-slate-800">
                  <img src={result.thumbnail} alt="" className="h-[70px] w-[120px] flex-none rounded object-cover" />
                  <span className="min-w-0"><span className="line-clamp-2 text-[10px] font-bold text-slate-900 dark:text-slate-100">{result.title}</span><span className="line-clamp-1 text-[9px] font-bold text-slate-500">{result.playlistId ? 'Playlist' : 'YouTube'} · {result.channelTitle}</span></span>
                </button>
              ))}
            </div>
          )}
        </div>

      {youtubePlaylistTitle && <p className="text-[10px] text-slate-700 dark:text-slate-300">Playlist: {youtubePlaylistTitle} · repeated song titles skipped</p>}
      {youtubeId && (
        <div className="relative h-[220px] min-h-[200px] w-full">
          <iframe
            key={youtubeId}
            ref={youtubeRef}
            className="h-full w-full rounded-lg border border-slate-700"
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?enablejsapi=1&autoplay=0`}
            onLoad={() => {
              youtubeVolumeRef.current.resetFrame();
              youtubeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening' }), 'https://www.youtube-nocookie.com');
            }}
            title="YouTube music player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          {activePlayer !== 'youtube' && (
            <button
              type="button"
              onClick={() => void resumePreservedYouTube()}
              className="absolute inset-0 z-[5] flex items-center justify-center rounded-lg bg-black/35 text-sm font-bold text-white"
              aria-label="Resume YouTube video"
            >
              Resume YouTube
            </button>
          )}
          <button
            type="button"
            onClick={() => closeYouTubePlayer()}
            className="absolute right-2 top-2 z-10 rounded-full bg-black/65 p-2 text-white shadow-lg transition hover:bg-black/85"
            aria-label="Close YouTube player"
            title="Close"
          >
            <X size={18} />
          </button>
          <button
            type="button"
            disabled={youtubeIndex <= 0}
            onClick={() => playYouTubeAt(youtubeIndex - 1)}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/65 p-2 text-white shadow-lg transition hover:bg-black/85 disabled:pointer-events-none disabled:opacity-25"
            aria-label="Previous YouTube result"
            title="Previous"
          >
            <SkipBack size={20} fill="currentColor" />
          </button>
          <button
            type="button"
            disabled={youtubeIndex < 0 || (youtubeIndex >= youtubeQueueLength - 1 && !youtubeNextPageTokenRef.current)}
            onClick={() => void playNextYouTube()}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/65 p-2 text-white shadow-lg transition hover:bg-black/85 disabled:pointer-events-none disabled:opacity-25"
            aria-label="Next playlist song"
            title="Next"
          >
            <SkipForward size={20} fill="currentColor" />
          </button>
        </div>
      )}
    </div>
  );
}
