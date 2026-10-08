import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Video,
  Image as ImageIcon,
  Save,
  Trash2,
  Sliders,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Play,
} from 'lucide-react';
import type { BackgroundSettings } from '../firebase';
import { saveBackgroundSettings, deleteBackgroundSettings } from '../firebase';

interface EditBackgroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: BackgroundSettings;
  onSettingsSaved: (settings: BackgroundSettings) => void;
}

// Preset Videos
const PRESET_VIDEOS = [
  {
    name: 'Mạch điện tử Neon (Mặc định)',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-circuit-board-with-moving-lights-42526-large.mp4',
    thumb: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&auto=format&fit=crop&q=80',
  },
  {
    name: 'Laser Neon trừu tượng',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-loop-41487-large.mp4',
    thumb: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=300&auto=format&fit=crop&q=80',
  },
  {
    name: 'Màn hình dữ liệu Ma trận',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-with-code-31910-large.mp4',
    thumb: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&auto=format&fit=crop&q=80',
  },
];

// Preset Images
const PRESET_IMAGES = [
  {
    name: 'Thành phố Cyberpunk',
    url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=2070&auto=format&fit=crop',
  },
  {
    name: 'Phòng Gaming Huyền ảo',
    url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop',
  },
  {
    name: 'Vũ trụ Tinh vân Sâu',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=2070&auto=format&fit=crop',
  },
  {
    name: 'Neon Lưới Synthwave',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2070&auto=format&fit=crop',
  },
];

export const EditBackgroundModal: React.FC<EditBackgroundModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSettingsSaved,
}) => {
  const [mediaType, setMediaType] = useState<'video' | 'image'>(
    currentSettings.mediaType || 'video'
  );
  const [videoUrl, setVideoUrl] = useState(currentSettings.videoUrl || '');
  const [imageUrl, setImageUrl] = useState(currentSettings.imageUrl || '');
  const [brightness, setBrightness] = useState(
    currentSettings.brightness !== undefined ? currentSettings.brightness : 0.45
  );
  const [blur, setBlur] = useState(currentSettings.blur || 0);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Process image from user device
  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1920;
        const maxHeight = 1080;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setImageUrl(loadEvent.target?.result as string);
          setMediaType('image');
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setImageUrl(compressedDataUrl);
        setMediaType('image');
        setStatusMessage({ text: 'Đã tải ảnh lên thành công!', type: 'success' });
      };
      img.src = loadEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Save changes to Firebase Firestore
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    const newSettings: BackgroundSettings = {
      mediaType,
      videoUrl: videoUrl.trim(),
      imageUrl: imageUrl.trim(),
      brightness,
      blur,
    };

    try {
      await saveBackgroundSettings(newSettings);
      onSettingsSaved(newSettings);
      setStatusMessage({ text: 'Đã lưu cài đặt nền vào Firebase thành công!', type: 'success' });
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('Lỗi lưu cài đặt nền:', err);
      setStatusMessage({ text: 'Lỗi khi lưu cài đặt vào Firestore!', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default
  const handleResetToDefault = async () => {
    if (!window.confirm('Bạn có chắc muốn khôi phục ảnh/video nền về mặc định?')) return;
    setIsSaving(true);
    try {
      await deleteBackgroundSettings();
      const defaultSettings: BackgroundSettings = {
        mediaType: 'video',
        videoUrl: '',
        imageUrl: '',
        brightness: 0.45,
        blur: 0,
      };
      onSettingsSaved(defaultSettings);
      setMediaType('video');
      setVideoUrl('');
      setImageUrl('');
      setBrightness(0.45);
      setBlur(0);
      setStatusMessage({ text: 'Đã khôi phục nền mặc định thành công!', type: 'success' });
      setTimeout(() => onClose(), 600);
    } catch (err) {
      console.error('Lỗi xóa cài đặt nền:', err);
      setStatusMessage({ text: 'Lỗi khi khôi phục nền!', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/10 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Quản Lý Ảnh Nền & Video Nền</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono">
                  Admin Mod
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Thêm, xóa, sửa ảnh hoặc video phía sau trang web
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
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1">
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

          {/* Mode Selector: Video vs Image */}
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-950 rounded-2xl">
            <button
              type="button"
              onClick={() => setMediaType('video')}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mediaType === 'video'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Dùng Video Nền</span>
            </button>
            <button
              type="button"
              onClick={() => setMediaType('image')}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mediaType === 'image'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Dùng Ảnh Nền</span>
            </button>
          </div>

          {/* VIDEO CONTROLS */}
          {mediaType === 'video' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Link Video MP4 (Lặp vô tận)
                </label>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://example.com/video.mp4 (để trống để dùng video mặc định)"
                  className="w-full bg-slate-950 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                />
              </div>

              {/* Preset Videos */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  Hoặc chọn video chất lượng cao mẫu:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {PRESET_VIDEOS.map((preset, idx) => (
                    <div
                      key={idx}
                      onClick={() => setVideoUrl(preset.url)}
                      className={`relative rounded-xl overflow-hidden cursor-pointer group p-2.5 bg-slate-950 hover:bg-slate-800 transition-all ${
                        videoUrl === preset.url ? 'ring-2 ring-purple-500 bg-purple-500/10' : ''
                      }`}
                    >
                      <div className="h-16 rounded-lg overflow-hidden mb-1.5 relative">
                        <img
                          src={preset.thumb}
                          alt={preset.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Play className="w-5 h-5 text-white/80" />
                        </div>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-300 truncate">
                        {preset.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* IMAGE CONTROLS */}
          {mediaType === 'image' && (
            <div className="space-y-4">
              {/* File upload from device */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tải ảnh nền từ thiết bị của bạn
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl flex flex-col items-center justify-center gap-2 bg-slate-950/60 hover:bg-slate-950 text-slate-300 transition-all cursor-pointer"
                >
                  <Upload className="w-6 h-6 text-purple-400" />
                  <span className="text-xs font-semibold">Bấm để chọn ảnh từ máy tính / điện thoại</span>
                  <span className="text-[10px] text-slate-500">Hỗ trợ JPG, PNG, WEBP (Tự động nén tối ưu)</span>
                </button>
              </div>

              {/* Direct image URL input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Hoặc nhập đường dẫn ảnh (URL)
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full bg-slate-950 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                />
              </div>

              {/* Preset Images */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  Hình nền mẫu chất lượng cao (1-click):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESET_IMAGES.map((preset, idx) => (
                    <div
                      key={idx}
                      onClick={() => setImageUrl(preset.url)}
                      className={`relative rounded-xl overflow-hidden cursor-pointer group h-20 transition-all ${
                        imageUrl === preset.url ? 'ring-2 ring-purple-500' : ''
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 flex items-end">
                        <span className="text-[10px] text-white font-medium truncate">
                          {preset.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Image Preview */}
              {imageUrl && (
                <div className="relative rounded-xl overflow-hidden h-28 bg-slate-950">
                  <img
                    src={imageUrl}
                    alt="Xem trước ảnh nền"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="px-2 py-1 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Xóa ảnh</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BRIGHTNESS & BLUR ADJUSTMENTS */}
          <div className="p-4 bg-slate-950 rounded-2xl space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                <span>Độ sáng nền (Brightness)</span>
              </span>
              <span className="text-xs font-mono text-purple-400 font-bold">
                {Math.round(brightness * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.15"
              max="0.85"
              step="0.05"
              value={brightness}
              onChange={(e) => setBrightness(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <p className="text-[10px] text-slate-500">
              Khuyên dùng: 35% - 50% để chữ và các ứng dụng luôn nổi bật, dễ đọc.
            </p>
          </div>

          {/* ACTIONS */}
          <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={handleResetToDefault}
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
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all transform active:scale-95 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Đang lưu vào Firebase...' : 'Lưu Cài Đặt Nền'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
