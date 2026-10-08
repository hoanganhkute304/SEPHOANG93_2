import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipForward,
  SkipBack,
  Disc3,
  ChevronUp,
  ChevronDown,
  Settings2,
  ListMusic,
} from 'lucide-react';
import type { TrackItem } from '../firebase';

const DEFAULT_TRACKS: TrackItem[] = [
  {
    id: 'default-1',
    title: 'Cyber Beats Relax',
    artist: 'Lofi Electronic Chill',
    url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
  },
  {
    id: 'default-2',
    title: 'Night Drive Synth',
    artist: 'Synthwave Neon',
    url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3',
  },
  {
    id: 'default-3',
    title: 'Lo-Fi Chill Hop Beat',
    artist: 'Gaming Lounge',
    url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3',
  },
  {
    id: 'default-4',
    title: 'Ambient Deep Space',
    artist: 'Atmospheric Sound',
    url: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_7314271891.mp3',
  },
];

interface MusicPlayerProps {
  tracks?: TrackItem[];
  isAdminMod?: boolean;
  onOpenEditMusic?: () => void;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  tracks: externalTracks,
  isAdminMod = false,
  onOpenEditMusic,
}) => {
  const activePlaylist =
    externalTracks && externalTracks.length > 0 ? externalTracks : DEFAULT_TRACKS;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [volume, setVolume] = useState(0.65);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fallback Web Audio Ambient Synthesizer
  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthNodesRef = useRef<{
    gainNode: GainNode;
    intervalId: number;
    oscillators: OscillatorNode[];
  } | null>(null);

  const safeIndex =
    currentTrackIndex >= activePlaylist.length ? 0 : currentTrackIndex;
  const currentTrack = activePlaylist[safeIndex] || activePlaylist[0];

  // Helper to start the Web Audio Ambient Synth if an external MP3 fails or stalls
  const startSynthFallback = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      stopSynthFallback();

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(isMuted ? 0 : volume * 0.18, ctx.currentTime);
      masterGain.connect(ctx.destination);

      // Cyber ambient chord progression (Cm - Eb - Ab - Bb)
      const chordNotes = [
        [130.81, 155.56, 196.0],
        [155.56, 196.0, 233.08],
        [103.83, 130.81, 164.81],
        [116.54, 146.83, 174.61],
      ];

      let chordIndex = 0;
      let activeOscs: OscillatorNode[] = [];

      const playChord = () => {
        activeOscs.forEach((osc) => {
          try {
            osc.stop(ctx.currentTime + 1.2);
          } catch {
            // ignore
          }
        });
        activeOscs = [];

        const notes = chordNotes[chordIndex % chordNotes.length];
        notes.forEach((freq) => {
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(450, ctx.currentTime);

          gain.gain.setValueAtTime(0.01, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 1.2);
          gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 3.8);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(masterGain);

          osc.start();
          activeOscs.push(osc);
        });

        chordIndex++;
      };

      playChord();
      const intervalId = window.setInterval(playChord, 4000);

      synthNodesRef.current = {
        gainNode: masterGain,
        intervalId,
        oscillators: activeOscs,
      };
    } catch (e) {
      console.warn('Web Audio synth error:', e);
    }
  };

  const stopSynthFallback = () => {
    if (synthNodesRef.current) {
      clearInterval(synthNodesRef.current.intervalId);
      synthNodesRef.current.oscillators.forEach((osc) => {
        try {
          osc.stop();
        } catch {
          // ignore
        }
      });
      synthNodesRef.current = null;
    }
  };

  // Toggle Play / Pause
  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      stopSynthFallback();
      setIsPlaying(false);
    } else {
      audioRef.current.volume = isMuted ? 0 : volume;
      const playPromise = audioRef.current.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.warn('Audio play fallback to Web Audio synthesizer:', err);
            startSynthFallback();
            setIsPlaying(true);
          });
      }
    }
  };

  // Next Track
  const handleNext = () => {
    const nextIdx = (safeIndex + 1) % activePlaylist.length;
    setCurrentTrackIndex(nextIdx);
    stopSynthFallback();
    if (audioRef.current) {
      audioRef.current.src = activePlaylist[nextIdx].url;
      if (isPlaying) {
        audioRef.current.play().catch(() => startSynthFallback());
      }
    }
  };

  // Previous Track
  const handlePrev = () => {
    const prevIdx =
      (safeIndex - 1 + activePlaylist.length) % activePlaylist.length;
    setCurrentTrackIndex(prevIdx);
    stopSynthFallback();
    if (audioRef.current) {
      audioRef.current.src = activePlaylist[prevIdx].url;
      if (isPlaying) {
        audioRef.current.play().catch(() => startSynthFallback());
      }
    }
  };

  // Volume change
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (synthNodesRef.current && audioCtxRef.current) {
      synthNodesRef.current.gainNode.gain.setValueAtTime(
        newVolume * 0.18,
        audioCtxRef.current.currentTime
      );
    }
  };

  // Toggle Mute
  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (audioRef.current) {
      audioRef.current.volume = nextMuted ? 0 : volume;
    }
    if (synthNodesRef.current && audioCtxRef.current) {
      synthNodesRef.current.gainNode.gain.setValueAtTime(
        nextMuted ? 0 : volume * 0.18,
        audioCtxRef.current.currentTime
      );
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSynthFallback();
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return (
    <div className="fixed bottom-5 left-5 z-40 select-none">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={currentTrack.url}
        loop={activePlaylist.length === 1}
        preload="auto"
        onError={() => {
          if (isPlaying) {
            startSynthFallback();
          }
        }}
        onEnded={handleNext}
      />

      {/* Main Container */}
      <div className="bg-slate-900/90 hover:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl p-2.5 sm:p-3 transition-all duration-300">
        <div className="flex items-center gap-3">
          {/* Vinyl / Disc icon with spin animation when playing */}
          <button
            type="button"
            onClick={togglePlay}
            title={isPlaying ? 'Tạm dừng nhạc' : 'Phát nhạc nền'}
            className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 hover:from-purple-500 hover:to-blue-400 flex items-center justify-center text-white shadow-lg shadow-purple-500/25 transition-all transform active:scale-95 cursor-pointer shrink-0"
          >
            <Disc3
              className={`w-6 h-6 ${isPlaying ? 'animate-spin' : ''}`}
              style={{ animationDuration: '4s' }}
            />
            <span className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40 rounded-xl">
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-white" />
              ) : (
                <Play className="w-4 h-4 fill-white ml-0.5" />
              )}
            </span>
          </button>

          {/* Track Info & Equalizer */}
          <div
            className="flex-1 min-w-[120px] max-w-[180px] cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white truncate block">
                {currentTrack.title}
              </span>

              {/* Animated Equalizer Bars when playing */}
              {isPlaying && (
                <div className="flex items-end gap-0.5 h-3 shrink-0">
                  <span className="w-0.5 h-full bg-purple-400 animate-pulse rounded-full" />
                  <span
                    className="w-0.5 h-2/3 bg-blue-400 animate-pulse rounded-full"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-0.5 h-full bg-pink-400 animate-pulse rounded-full"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-400 truncate font-mono">
              {isPlaying ? currentTrack.artist : 'Nhấn để phát nhạc'}
            </p>
          </div>

          {/* Quick Play/Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
              isPlaying
                ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title={isPlaying ? 'Tạm dừng nhạc' : 'Phát nhạc nền'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {/* Edit / Manage Playlist button (Visible in Admin Mod or when onOpenEditMusic provided) */}
          {isAdminMod && onOpenEditMusic && (
            <button
              type="button"
              onClick={onOpenEditMusic}
              className="w-8 h-8 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 flex items-center justify-center transition-colors cursor-pointer"
              title="Quản lý / Thêm sửa xóa bài hát (Admin Mod)"
            >
              <ListMusic className="w-4 h-4" />
            </button>
          )}

          {/* Expand / Collapse toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
            title={isExpanded ? 'Thu gọn' : 'Mở rộng bảng điều khiển nhạc'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {/* Expanded Controls: Volume Slider, Next/Prev, Mute, Playlist count */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col gap-2.5 animate-in fade-in duration-200">
            {/* Playback navigation buttons */}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Bài trước"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                <span>
                  {safeIndex + 1} / {activePlaylist.length}
                </span>
                {isAdminMod && onOpenEditMusic && (
                  <button
                    type="button"
                    onClick={onOpenEditMusic}
                    className="text-amber-400 hover:underline flex items-center gap-1 ml-1 cursor-pointer"
                  >
                    <Settings2 className="w-3 h-3" />
                    <span>Sửa Playlist</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Bài tiếp theo"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Volume control */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                className="text-slate-400 hover:text-white cursor-pointer"
                title={isMuted ? 'Bật âm' : 'Tắt âm'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                title="Âm lượng"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
