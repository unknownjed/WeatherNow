import React, { useEffect, useRef, useState } from 'react';
import { FolderSearch, Music2, SkipBack, SkipForward, X, Youtube } from 'lucide-react';

interface LocalTrack {
  name: string;
  url: string;
}

interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
}

const isSupportedAudioFile = (file: File) => {
  const mimeType = file.type.toLowerCase();
  if (mimeType.startsWith('video/')) return false;
  if (mimeType.startsWith('audio/')) return true;
  if (mimeType) return false;
  return /\.(mp3|wav|m4a|aac|ogg|oga|flac|opus)$/i.test(file.name);
};

const stopForecasterSpeech = () => {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    window.dispatchEvent(new CustomEvent('weathernow:forecaster-state', { detail: { speaking: false } }));
  }
};

const musicLabels: Record<string, { title: string; scan: string; search: string; searching: string; placeholder: string }> = {
  en: { title: 'Music Player', scan: 'Scan device music', search: 'Search', searching: 'Searching…', placeholder: 'Search music on YouTube' },
  es: { title: 'Reproductor de música', scan: 'Buscar música del dispositivo', search: 'Buscar', searching: 'Buscando…', placeholder: 'Buscar música en YouTube' },
  fr: { title: 'Lecteur de musique', scan: 'Analyser la musique', search: 'Rechercher', searching: 'Recherche…', placeholder: 'Rechercher de la musique sur YouTube' },
  de: { title: 'Musik-Player', scan: 'Gerätemusik scannen', search: 'Suchen', searching: 'Suche…', placeholder: 'Musik auf YouTube suchen' },
  it: { title: 'Lettore musicale', scan: 'Scansiona musica', search: 'Cerca', searching: 'Ricerca…', placeholder: 'Cerca musica su YouTube' },
  pt: { title: 'Reprodutor de música', scan: 'Procurar música', search: 'Pesquisar', searching: 'Pesquisando…', placeholder: 'Pesquisar música no YouTube' },
  ja: { title: '音楽プレーヤー', scan: '端末の音楽を検索', search: '検索', searching: '検索中…', placeholder: 'YouTubeで音楽を検索' },
  ko: { title: '음악 플레이어', scan: '기기 음악 검색', search: '검색', searching: '검색 중…', placeholder: 'YouTube에서 음악 검색' },
  zh: { title: '音乐播放器', scan: '扫描设备音乐', search: '搜索', searching: '搜索中…', placeholder: '在 YouTube 上搜索音乐' },
  hi: { title: 'म्यूजिक प्लेयर', scan: 'डिवाइस संगीत स्कैन करें', search: 'खोजें', searching: 'खोज रहा है…', placeholder: 'YouTube पर संगीत खोजें' },
  ru: { title: 'Музыкальный плеер', scan: 'Сканировать музыку', search: 'Поиск', searching: 'Поиск…', placeholder: 'Поиск музыки на YouTube' },
  ar: { title: 'مشغل الموسيقى', scan: 'فحص موسيقى الجهاز', search: 'بحث', searching: 'جارٍ البحث…', placeholder: 'ابحث عن موسيقى على YouTube' },
};

export function MusicWidget({ language = 'en' }: { language?: string }) {
  const labels = musicLabels[language] || musicLabels.en;
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const youtubeRef = useRef<HTMLIFrameElement>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const localWasPlayingRef = useRef(false);
  const youtubeIsPlayingRef = useRef(false);
  const youtubeWasPlayingRef = useRef(false);
  const youtubeResultsRef = useRef<YouTubeSearchResult[]>([]);
  const youtubeIndexRef = useRef(-1);
  const youtubeNextPageTokenRef = useRef<string | null>(null);
  const youtubeQueryRef = useRef('');
  const youtubeLoadingMoreRef = useRef(false);
  const [tracks, setTracks] = useState<LocalTrack[]>([]);
  const [trackIndex, setTrackIndex] = useState(0);
  const [youtubeInput, setYoutubeInput] = useState('');
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [youtubeError, setYoutubeError] = useState('');
  const [youtubeResults, setYoutubeResults] = useState<YouTubeSearchResult[]>([]);
  const [youtubeSuggestions, setYoutubeSuggestions] = useState<string[]>([]);
  const [youtubeIndex, setYoutubeIndex] = useState(-1);
  const [isSearchingYoutube, setIsSearchingYoutube] = useState(false);
  const [youtubeConsent, setYoutubeConsent] = useState(() => localStorage.getItem('weathernow_youtube_consent') === 'true');
  const [youtubeConsentAcknowledged, setYoutubeConsentAcknowledged] = useState(() => localStorage.getItem('weathernow_youtube_consent_acknowledged') === 'true');

  useEffect(() => () => objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

  useEffect(() => {
    youtubeResultsRef.current = youtubeResults;
  }, [youtubeResults]);

  useEffect(() => {
    const query = youtubeInput.trim();
    if (!youtubeConsent || query.length < 2) {
      setYoutubeSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/youtube-search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        const seen = new Set<string>();
        const suggestions = (data.items || []).map((item: YouTubeSearchResult) => item.title.trim()).filter((title: string) => {
          const key = title.toLowerCase();
          if (!title || seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 6);
        setYoutubeSuggestions(suggestions);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setYoutubeSuggestions([]);
      }
    }, 600);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [youtubeConsent, youtubeInput]);

  const playYouTubeAt = (index: number) => {
    const result = youtubeResultsRef.current[index];
    if (!result) return;
    stopForecasterSpeech();
    window.dispatchEvent(new CustomEvent('weathernow:music-state', { detail: { playing: true } }));
    audioRef.current?.pause();
    localWasPlayingRef.current = false;
    setTracks([]);
    youtubeIndexRef.current = index;
    setYoutubeIndex(index);
    setYoutubeId(result.videoId);
  };

  const normalizeMusicTitle = (title: string) => title
    .toLowerCase()
    .replace(/&(?:amp|quot|#39);/g, ' ')
    .replace(/[\[(](?:official|lyrics?|audio|video|visuali[sz]er|music video)[^\])]*[\])]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const loadMoreYouTubeResults = async () => {
    const pageToken = youtubeNextPageTokenRef.current;
    const query = youtubeQueryRef.current;
    if (!pageToken || !query || youtubeLoadingMoreRef.current) return false;
    youtubeLoadingMoreRef.current = true;
    try {
      const response = await fetch(`/api/youtube-search?q=${encodeURIComponent(query)}&pageToken=${encodeURIComponent(pageToken)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load more songs.');
      const existingTitles = new Set(youtubeResultsRef.current.map((item) => normalizeMusicTitle(item.title)));
      const additions = (data.items || []).filter((item: YouTubeSearchResult) => {
        const normalized = normalizeMusicTitle(item.title);
        if (!normalized || existingTitles.has(normalized)) return false;
        existingTitles.add(normalized);
        return true;
      });
      const combined = [...youtubeResultsRef.current, ...additions];
      youtubeResultsRef.current = combined;
      youtubeNextPageTokenRef.current = data.nextPageToken || null;
      setYoutubeResults(combined);
      return additions.length > 0;
    } catch (error) {
      setYoutubeError(error instanceof Error ? error.message : 'Unable to load more songs.');
      return false;
    } finally {
      youtubeLoadingMoreRef.current = false;
    }
  };

  const playNextYouTube = async () => {
    const nextIndex = youtubeIndexRef.current + 1;
    if (nextIndex < youtubeResultsRef.current.length) {
      playYouTubeAt(nextIndex);
      return;
    }
    const added = await loadMoreYouTubeResults();
    if (added && nextIndex < youtubeResultsRef.current.length) playYouTubeAt(nextIndex);
  };

  useEffect(() => {
    const handleYouTubeState = (event: MessageEvent) => {
      if (!String(event.origin).includes('youtube')) return;
      try {
        const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (message?.event === 'onStateChange' || message?.info?.playerState !== undefined) {
          const state = typeof message.info === 'number' ? message.info : message.info?.playerState;
          youtubeIsPlayingRef.current = state === 1;
          if (state === 1) stopForecasterSpeech();
          if (state === 0) void playNextYouTube();
        }
      } catch {}
    };

    const handleForecasterState = (event: Event) => {
      const speaking = Boolean((event as CustomEvent<{ speaking: boolean }>).detail?.speaking);
      const audio = audioRef.current;
      if (speaking) {
        localWasPlayingRef.current = Boolean(audio && !audio.paused);
        if (localWasPlayingRef.current) audio?.pause();
        youtubeWasPlayingRef.current = youtubeIsPlayingRef.current;
        if (youtubeWasPlayingRef.current) {
          youtubeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
        }
      } else {
        if (localWasPlayingRef.current) void audio?.play().catch(() => undefined);
        if (youtubeWasPlayingRef.current) {
          youtubeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
        }
        localWasPlayingRef.current = false;
        youtubeWasPlayingRef.current = false;
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
    const stopForecaster = () => {
      if (window.speechSynthesis?.speaking || window.speechSynthesis?.pending) window.speechSynthesis.cancel();
    };
    window.addEventListener('weathernow:music-state', stopForecaster);
    return () => window.removeEventListener('weathernow:music-state', stopForecaster);
  }, []);

  useEffect(() => {
    if (!tracks.length) return;
    void audioRef.current?.play().catch(() => undefined);
  }, [tracks, trackIndex]);

  const loadAudioFiles = (files: File[]) => {
    const audioFiles = files.filter(isSupportedAudioFile);
    if (!audioFiles.length) {
      setYoutubeError('No valid audio files were selected. Video files are not supported.');
      return;
    }
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    youtubeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }), '*');
    youtubeIsPlayingRef.current = false;
    youtubeWasPlayingRef.current = false;
    const nextTracks = audioFiles.map((file) => ({ name: file.name, url: URL.createObjectURL(file) }));
    stopForecasterSpeech();
    window.dispatchEvent(new CustomEvent('weathernow:music-state', { detail: { playing: true } }));
    objectUrlsRef.current = nextTracks.map((track) => track.url);
    setTracks(nextTracks);
    setTrackIndex(0);
    setYoutubeId(null);
    youtubeIndexRef.current = -1;
    setYoutubeIndex(-1);
    setYoutubeError('');
  };

  const scanDeviceMusic = () => {
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
    setIsSearchingYoutube(true);
    setYoutubeError('');
    setYoutubeId(null);
    setYoutubeInput('');
    setYoutubeSuggestions([]);
    try {
      const response = await fetch(`/api/youtube-search?q=${encodeURIComponent(query)}`);
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('application/json')) {
        throw new Error('WeatherNow is still running the previous server version. Restart the dashboard server, then try again.');
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'YouTube search failed.');
      setYoutubeConsentAcknowledged(true);
      localStorage.setItem('weathernow_youtube_consent_acknowledged', 'true');
      const results = data.items || [];
      const uniqueTitles = new Set<string>();
      const uniqueResults = results.filter((item: YouTubeSearchResult) => {
        const normalized = normalizeMusicTitle(item.title);
        if (!normalized || uniqueTitles.has(normalized)) return false;
        uniqueTitles.add(normalized);
        return true;
      });
      youtubeQueryRef.current = query;
      youtubeNextPageTokenRef.current = data.nextPageToken || null;
      youtubeResultsRef.current = uniqueResults;
      youtubeIndexRef.current = -1;
      setYoutubeIndex(-1);
      setYoutubeResults(uniqueResults);
      if (!(data.items || []).length) setYoutubeError('No embeddable music videos were found.');
    } catch (error) {
      setYoutubeResults([]);
      setYoutubeError(error instanceof Error ? error.message : 'YouTube search failed.');
    } finally {
      setIsSearchingYoutube(false);
    }
  };

  return (
    <div className="bg-sky-50 dark:bg-slate-900 border border-sky-200 dark:border-slate-800 rounded-xl p-3 flex flex-col gap-2 shadow-inner flex-none min-h-[220px]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[10px] lg:text-xs font-bold uppercase tracking-widest text-sky-800 dark:text-slate-400 flex items-center gap-2">
          <Music2 size={13} className="text-indigo-600 dark:text-indigo-400" />
          {labels.title}
        </h3>
        <button onClick={scanDeviceMusic} className="music-scan-button flex items-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-500 px-3 py-2 text-[11px] font-bold text-white">
          <FolderSearch size={14} /> {labels.scan}
        </button>
        <input ref={inputRef} type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac" multiple className="hidden" onChange={(event) => loadAudioFiles(Array.from(event.target.files || []))} />
      </div>

      {tracks.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <select value={trackIndex} onChange={(event) => setTrackIndex(Number(event.target.value))} className="min-w-0 flex-1 rounded-md border border-sky-200 bg-white px-2 py-1 text-[10px] text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {tracks.map((track, index) => <option key={track.url} value={index}>{track.name}</option>)}
            </select>
          </div>
          <audio ref={audioRef} key={tracks[trackIndex]?.url} autoPlay controls controlsList="nodownload" onPlay={() => { stopForecasterSpeech(); window.dispatchEvent(new CustomEvent('weathernow:music-state', { detail: { playing: true } })); }} onContextMenu={(event) => event.preventDefault()} className="h-8 w-full" onEnded={() => setTrackIndex((index) => (index + 1) % tracks.length)} src={tracks[trackIndex]?.url} />
        </div>
      )}

        <div className="mt-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <Youtube size={18} className="flex-none text-red-500" />
            <div className="relative min-w-0 flex-1">
              <input value={youtubeInput} onChange={(event) => setYoutubeInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && void searchYouTube()} placeholder={labels.placeholder} autoComplete="off" className="w-full rounded-md border border-sky-200 !bg-white px-3 py-2.5 text-[11px] text-slate-800 outline-none transition-all focus:border-white focus:ring-1 focus:ring-white focus:shadow-none dark:border-slate-700 dark:!bg-slate-800 dark:text-slate-200 dark:focus:border-blue-500 dark:focus:ring-0" />
              {youtubeSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-[1300] mt-1 overflow-hidden rounded-md border border-sky-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                  {youtubeSuggestions.map((suggestion) => (
                    <button key={suggestion} type="button" onClick={() => { setYoutubeSuggestions([]); void searchYouTube(suggestion); }} className="block w-full truncate px-3 py-2 text-left text-[11px] text-slate-900 hover:bg-sky-100 dark:text-slate-100 dark:hover:bg-slate-700">
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
            <div className="grid max-h-52 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
              {youtubeResults.map((result, index) => (
                <button key={result.videoId} onClick={() => playYouTubeAt(index)} className="flex items-center gap-2 rounded-lg border border-sky-200 bg-white p-1.5 text-left hover:border-red-500 dark:border-slate-700 dark:bg-slate-800">
                  <img src={result.thumbnail} alt="" className="h-[70px] w-[120px] flex-none rounded object-cover" />
                  <span className="min-w-0"><span className="line-clamp-2 text-[10px] font-bold text-slate-900 dark:text-slate-100">{result.title}</span><span className="line-clamp-1 text-[9px] text-slate-500">YouTube · {result.channelTitle}</span></span>
                </button>
              ))}
            </div>
          )}
        </div>

      {youtubeId && (
        <div className="relative h-[220px] min-h-[200px] w-full">
          <iframe
            ref={youtubeRef}
            className="h-full w-full rounded-lg border border-slate-700"
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?enablejsapi=1&autoplay=1`}
            onLoad={() => youtubeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening' }), '*')}
            title="YouTube music player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          <button
            type="button"
            onClick={() => { setYoutubeId(null); youtubeIsPlayingRef.current = false; }}
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
            disabled={youtubeIndex < 0 || (youtubeIndex >= youtubeResults.length - 1 && !youtubeNextPageTokenRef.current)}
            onClick={() => void playNextYouTube()}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/65 p-2 text-white shadow-lg transition hover:bg-black/85 disabled:pointer-events-none disabled:opacity-25"
            aria-label="Next YouTube result"
            title="Next"
          >
            <SkipForward size={20} fill="currentColor" />
          </button>
        </div>
      )}
    </div>
  );
}
