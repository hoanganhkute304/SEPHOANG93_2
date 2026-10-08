import React, { useState, useRef } from 'react';
import {
  X,
  Music,
  Plus,
  Trash2,
  Edit2,
  Save,
  RotateCcw,
  Play,
  Pause,
  Upload,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Loader2,
} from 'lucide-react';
import type { TrackItem } from '../firebase';
import { saveMusicSettings, deleteMusicSettings } from '../firebase';

interface EditMusicModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTracks: TrackItem[];
  onTracksSaved: (tracks: TrackItem[]) => void;
}

// Sample library tracks to pick from
const SAMPLE_LIBRARY: Omit<TrackItem, 'id'>[] = [
  {
    title: 'Cyber Beats Relax',
    artist: 'Lofi Electronic Chill',
    url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
  },
  {
    title: 'Night Drive Synth',
    artist: 'Synthwave Neon',
    url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3',
  },
  {
    title: 'Lo-Fi Chill Hop Beat',
    artist: 'Gaming Lounge',
    url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3',
  },
  {
    title: 'Ambient Deep Space',
    artist: 'Atmospheric Sound',
    url: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_7314271891.mp3',
  },
  {
    title: 'Retro Gaming Vibes',
    artist: 'Pixel Pulse',
    url: 'https://cdn.pixabay.com/download/audio/2022/11/06/audio_1a04ec60cc.mp3',
  },
];

export const EditMusicModal: React.FC<EditMusicModalProps> = ({
  isOpen,
  onClose,
  currentTracks,
  onTracksSaved,
}) => {
  const [tracks, setTracks] = useState<TrackItem[]>(
    currentTracks.length > 0 ? currentTracks : SAMPLE_LIBRARY.map((t, idx) => ({ ...t, id: `track-${idx}` }))
  );

  // Form for adding or editing a track
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [trackTitle, setTrackTitle] = useState('');
  const [trackArtist, setTrackArtist] = useState('');
  const [trackUrl, setTrackUrl] = useState('');

  // Audio preview player
  const [previewTrackUrl, setPreviewTrackUrl] = useState<string | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);

  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  // Toggle Audio Preview
  const handleTogglePreview = (url: string) => {
    if (previewTrackUrl === url && isPreviewPlaying) {
      previewAudioRef.current?.pause();
      setIsPreviewPlaying(false);
    } else {
      setPreviewTrackUrl(url);
      setIsPreviewPlaying(true);
      if (previewAudioRef.current) {
        previewAudioRef.current.src = url;
        previewAudioRef.current.play().catch((e) => console.warn('Preview audio play error:', e));
      }
    }
  };

  // Upload local audio file via backend API to prevent huge base64 Firestore document limit error
  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!trackTitle) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      setTrackTitle(cleanName);
    }

    setIsUploadingAudio(true);
    setStatusMessage({ text: `Đang tải file "${file.name}" lên máy chủ...`, type: 'success' });

    try {
      const formData = new FormData();
      formData.append('audio', file);

      const res = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        setTrackUrl(data.url);
        setStatusMessage({
          text: `Đã nạp file âm thanh thành công! (${(file.size / (1024 * 1024)).toFixed(1)} MB)`,
          type: 'success',
        });
      } else {
        throw new Error(data.error || 'Lỗi tải file lên máy chủ');
      }
    } catch (err: any) {
      console.error('Lỗi upload audio:', err);
      // Fallback: If network fails, notify user
      setStatusMessage({
        text: `Không thể tải file: ${err.message || 'Lỗi mạng'}. Bạn có thể dán link trực tiếp.`,
        type: 'error',
      });
    } finally {
      setIsUploadingAudio(false);
      if (audioFileInputRef.current) {
        audioFileInputRef.current.value = '';
      }
    }
  };

  // Add new track or update existing
  const handleAddOrUpdateTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackTitle.trim() || !trackUrl.trim()) {
      setStatusMessage({ text: 'Vui lòng nhập tên bài hát và đường dẫn nhạc!', type: 'error' });
      return;
    }

    if (editingTrackId) {
      // Update track
      setTracks((prev) =>
        prev.map((t) =>
          t.id === editingTrackId
            ? {
                ...t,
                title: trackTitle.trim(),
                artist: trackArtist.trim() || 'Nghệ sĩ',
                url: trackUrl.trim(),
              }
            : t
        )
      );
      setEditingTrackId(null);
      setStatusMessage({ text: 'Đã cập nhật bài hát trong danh sách!', type: 'success' });
    } else {
      // Add new track
      const newTrack: TrackItem = {
        id: `track-${Date.now()}`,
        title: trackTitle.trim(),
        artist: trackArtist.trim() || 'Nghệ sĩ',
        url: trackUrl.trim(),
      };
      setTracks((prev) => [...prev, newTrack]);
      setStatusMessage({ text: 'Đã thêm bài hát vào danh sách!', type: 'success' });
    }

    // Reset input fields
    setTrackTitle('');
    setTrackArtist('');
    setTrackUrl('');
  };

  // Start editing a track
  const handleStartEdit = (t: TrackItem) => {
    setEditingTrackId(t.id);
    setTrackTitle(t.title);
    setTrackArtist(t.artist);
    setTrackUrl(t.url);
  };

  // Delete a track
  const handleDeleteTrack = (id: string) => {
    if (tracks.length <= 1) {
      setStatusMessage({ text: 'Phải giữ lại ít nhất 1 bài hát trong danh sách!', type: 'error' });
      return;
    }
    setTracks((prev) => prev.filter((t) => t.id !== id));
    if (editingTrackId === id) {
      setEditingTrackId(null);
      setTrackTitle('');
      setTrackArtist('');
      setTrackUrl('');
    }
    setStatusMessage({ text: 'Đã xóa bài hát khỏi danh sách!', type: 'success' });
  };

  // Add from Sample Library
  const handleAddSampleTrack = (sample: Omit<TrackItem, 'id'>) => {
    const newTrack: TrackItem = {
      ...sample,
      id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    setTracks((prev) => [...prev, newTrack]);
    setStatusMessage({ text: `Đã thêm "${sample.title}" vào playlist!`, type: 'success' });
  };

  // Save playlist to Firebase Firestore & Server Backup
  const handleSaveToFirestore = async () => {
    setIsSaving(true);
    setStatusMessage({ text: 'Đang lưu danh sách nhạc lên Firebase...', type: 'success' });

    try {
      // 1. Sanitize tracks: if any track has raw base64 dataUrl, convert it via server endpoint
      const sanitizedTracks: TrackItem[] = [];
      for (const t of tracks) {
        if (t.url.startsWith('data:audio') || t.url.length > 5000) {
          try {
            const convertRes = await fetch('/api/upload-audio-base64', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                dataUrl: t.url,
                filename: `${t.title}.mp3`,
              }),
            });
            const convertData = await convertRes.json();
            if (convertData.success && convertData.url) {
              sanitizedTracks.push({ ...t, url: convertData.url });
              continue;
            }
          } catch (e) {
            console.warn('Convert base64 track error:', e);
          }
        }
        sanitizedTracks.push(t);
      }

      // 2. Save to Firebase Firestore
      await saveMusicSettings({ tracks: sanitizedTracks });

      // 3. Backup to server local storage
      fetch('/api/settings/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tracks: sanitizedTracks }),
      }).catch(() => {});

      onTracksSaved(sanitizedTracks);
      setTracks(sanitizedTracks);
      setStatusMessage({ text: 'Đã lưu danh sách nhạc lên Firebase thành công!', type: 'success' });
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Lỗi lưu danh sách nhạc:', err);
      // Backup to server anyway
      try {
        await fetch('/api/settings/music', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tracks }),
        });
        onTracksSaved(tracks);
        setStatusMessage({
          text: 'Đã lưu danh sách nhạc vào bộ nhớ máy chủ thành công!',
          type: 'success',
        });
        setTimeout(() => onClose(), 800);
      } catch {
        setStatusMessage({
          text: `Lỗi khi lưu nhạc: ${err.message || 'Không thể ghi dữ liệu'}. Vui lòng thử lại!`,
          type: 'error',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default playlist
  const handleResetDefaultPlaylist = async () => {
    if (!window.confirm('Khôi phục danh sách phát nhạc mặc định?')) return;
    setIsSaving(true);
    try {
      await deleteMusicSettings();
      const defaultTracks = SAMPLE_LIBRARY.map((t, idx) => ({ ...t, id: `default-${idx}` }));
      onTracksSaved(defaultTracks);
      setTracks(defaultTracks);
      setEditingTrackId(null);
      setTrackTitle('');
      setTrackArtist('');
      setTrackUrl('');
      setStatusMessage({ text: 'Đã khôi phục danh sách nhạc gốc!', type: 'success' });
      setTimeout(() => onClose(), 600);
    } catch (err) {
      console.error('Lỗi khôi phục nhạc:', err);
      setStatusMessage({ text: 'Lỗi khi khôi phục nhạc!', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Hidden audio element for preview */}
      <audio
        ref={previewAudioRef}
        onEnded={() => setIsPreviewPlaying(false)}
        onError={() => setIsPreviewPlaying(false)}
      />

      <div className="relative w-full max-w-2xl bg-slate-900 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/10 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Quản Lý Danh Sách Nhạc Nền</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono">
                  Admin Mod
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Thêm, sửa, xóa các bài hát phát trên trang web
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-red-500/20 text-red-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Form Thêm / Sửa bài hát */}
          <form
            onSubmit={handleAddOrUpdateTrack}
            className="p-4 bg-slate-950 rounded-2xl space-y-3 ring-1 ring-purple-500/20"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{editingTrackId ? 'Chỉnh sửa bài hát' : 'Thêm bài hát mới vào Playlist'}</span>
              </h4>
              {editingTrackId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTrackId(null);
                    setTrackTitle('');
                    setTrackArtist('');
                    setTrackUrl('');
                  }}
                  className="text-[11px] text-slate-400 hover:text-white"
                >
                  Hủy chỉnh sửa
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Tên bài hát *
                </label>
                <input
                  type="text"
                  value={trackTitle}
                  onChange={(e) => setTrackTitle(e.target.value)}
                  placeholder="VD: Cyber Chill Hop"
                  className="w-full bg-slate-900 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Nghệ sĩ / Thể loại
                </label>
                <input
                  type="text"
                  value={trackArtist}
                  onChange={(e) => setTrackArtist(e.target.value)}
                  placeholder="VD: Lofi Gaming Night"
                  className="w-full bg-slate-900 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Đường dẫn file nhạc (MP3 / OGG / Audio link) *
                </label>
                <input
                  type="file"
                  ref={audioFileInputRef}
                  accept="audio/*"
                  onChange={handleAudioFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isUploadingAudio}
                  onClick={() => audioFileInputRef.current?.click()}
                  className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {isUploadingAudio ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Đang nạp file...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3 h-3" />
                      <span>Tải file MP3 từ máy</span>
                    </>
                  )}
                </button>
              </div>

              <input
                type="text"
                value={trackUrl}
                onChange={(e) => setTrackUrl(e.target.value)}
                placeholder="https://example.com/audio.mp3 hoặc /uploads/..."
                className="w-full bg-slate-900 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isUploadingAudio}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20 cursor-pointer disabled:opacity-50"
              >
                {editingTrackId ? (
                  <>
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Cập Nhật Bài Hát</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm Vào Danh Sách</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Danh sách bài hát hiện tại */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300">
                Danh sách phát hiện có ({tracks.length} bài hát):
              </h4>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {tracks.map((t, idx) => (
                <div
                  key={t.id}
                  className={`p-2.5 rounded-xl bg-slate-950 flex items-center justify-between gap-3 transition-colors ${
                    editingTrackId === t.id ? 'ring-1 ring-purple-500 bg-purple-500/10' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 text-center text-xs font-mono text-slate-500 font-bold">
                      {idx + 1}
                    </span>

                    {/* Preview Button */}
                    <button
                      type="button"
                      onClick={() => handleTogglePreview(t.url)}
                      className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-purple-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title="Nghe thử"
                    >
                      {previewTrackUrl === t.url && isPreviewPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{t.title}</p>
                      <p className="text-[10px] text-slate-400 truncate font-mono">{t.artist}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(t)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                      title="Sửa bài hát"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTrack(t.id)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-500/20 text-slate-400 hover:text-red-400 cursor-pointer"
                      title="Xóa bài hát"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gợi ý thêm từ Thư viện mẫu */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">
              Hoặc thêm nhanh từ Thư viện nhạc chill miễn phí:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SAMPLE_LIBRARY.map((sample, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-xl bg-slate-950/70 hover:bg-slate-950 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-200 truncate">{sample.title}</p>
                    <p className="text-[10px] text-slate-500 truncate">{sample.artist}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddSampleTrack(sample)}
                    className="p-1 px-2 rounded-lg bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Thêm</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ACTIONS */}
          <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleResetDefaultPlaylist}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục mặc định</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleSaveToFirestore}
                disabled={isSaving || isUploadingAudio}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Lưu Danh Sách Nhạc</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
