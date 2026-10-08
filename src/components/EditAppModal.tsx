import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Image as ImageIcon,
  Trash2,
  Save,
  ShieldCheck,
  AlignLeft,
} from 'lucide-react';
import type { AppItem } from '../types';
import { updateAppInFirestore } from '../firebase';

interface EditAppModalProps {
  app: AppItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAppUpdated: (updatedApp: AppItem) => void;
}

// Client-side image processor for banners (max 1280x720)
function processBannerFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1280;
        const maxHeight = 720;
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
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Client-side image processor for icons (max 256x256 square)
function processIconFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const size = Math.min(Math.max(img.width, img.height), 256);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/png', 0.85);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export const EditAppModal: React.FC<EditAppModalProps> = ({
  app,
  isOpen,
  onClose,
  onAppUpdated,
}) => {
  if (!isOpen || !app) return null;

  const [name, setName] = useState(app.name);
  const [description, setDescription] = useState(app.description || '');
  const [iconUrl, setIconUrl] = useState(app.iconUrl);
  const [bannerUrl, setBannerUrl] = useState(app.bannerUrl || '');
  const [version, setVersion] = useState(app.version || 'v1.0.0');

  const [isProcessingIcon, setIsProcessingIcon] = useState(false);
  const [isProcessingBanner, setIsProcessingBanner] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const iconInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const isWindows = app.platform === 'windows' || app.fileExtension === '.exe';
  const defaultIcon = isWindows
    ? 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80'
    : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80';

  const handleIconSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsProcessingIcon(true);
      setError(null);
      try {
        const dataUrl = await processIconFile(e.target.files[0]);
        setIconUrl(dataUrl);
      } catch (err) {
        console.error('Error processing icon:', err);
        setError('Không thể đọc file ảnh icon. Vui lòng chọn ảnh khác.');
      } finally {
        setIsProcessingIcon(false);
      }
    }
  };

  const handleBannerSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsProcessingBanner(true);
      setError(null);
      try {
        const dataUrl = await processBannerFile(e.target.files[0]);
        setBannerUrl(dataUrl);
      } catch (err) {
        console.error('Error processing banner:', err);
        setError('Không thể đọc file ảnh nền. Vui lòng chọn ảnh khác.');
      } finally {
        setIsProcessingBanner(false);
      }
    }
  };

  const handleResetToDefaultIcon = () => {
    setIconUrl(defaultIcon);
  };

  const handleRemoveBanner = () => {
    setBannerUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Tên ứng dụng không được để trống.');
      return;
    }

    setIsSaving(true);
    setError(null);

    const updates: Partial<AppItem> = {
      name: name.trim(),
      description: description.trim(),
      iconUrl: iconUrl.trim() || defaultIcon,
      bannerUrl: bannerUrl.trim(),
      version: version.trim() || 'v1.0.0',
    };

    try {
      // 1. Update in Firebase Firestore
      await updateAppInFirestore(app.id, updates);

      // 2. Update in Server
      await fetch(`/api/apps/${app.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }).catch((e) => console.warn('Server update err:', e));

      const updatedApp: AppItem = {
        ...app,
        ...updates,
      };

      onAppUpdated(updatedApp);
      onClose();
    } catch (err: any) {
      console.error('Lỗi cập nhật ứng dụng:', err);
      setError(err.message || 'Lỗi khi lưu cập nhật. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header with Admin Badge */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Sửa Thông Tin &amp; Logo
                </h3>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/30">
                  ADMIN MOD
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Chỉnh sửa logo, ảnh nền và thông tin lưu trực tiếp vào Firebase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. THÊM / XÓA / SỬA ẢNH LOGO (ICON) */}
          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Ảnh Logo / Icon Ứng Dụng</span>
              </label>
              {iconUrl !== defaultIcon && (
                <button
                  type="button"
                  onClick={handleResetToDefaultIcon}
                  className="text-[11px] text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Xóa ảnh tự chọn (Về mặc định)</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <img
                src={iconUrl}
                alt="Logo hiện tại"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-700 shadow-md bg-slate-850 shrink-0"
              />

              <div className="flex-1 space-y-1.5">
                <input
                  type="file"
                  ref={iconInputRef}
                  onChange={handleIconSelect}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => iconInputRef.current?.click()}
                  disabled={isProcessingIcon}
                  className="w-full py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
                >
                  {isProcessingIcon ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                  <span>{isProcessingIcon ? 'Đang đọc ảnh...' : 'Chọn ảnh Logo mới từ máy tính'}</span>
                </button>
                <p className="text-[11px] text-slate-500">
                  Hỗ trợ PNG, JPG, ICO. Tự động căn chỉnh vuông góc đẹp mắt.
                </p>
              </div>
            </div>
          </div>

          {/* 2. THÊM / XÓA / SỬA ẢNH NỀN BANNER */}
          <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-400" />
                <span>Ảnh Nền / Banner Ứng Dụng</span>
              </label>
              {bannerUrl && (
                <button
                  type="button"
                  onClick={handleRemoveBanner}
                  className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Xóa ảnh nền</span>
                </button>
              )}
            </div>

            {bannerUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-700 h-24">
                <img
                  src={bannerUrl}
                  alt="Ảnh nền"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    className="px-3 py-1 bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg border border-slate-700 shadow cursor-pointer"
                  >
                    Đổi ảnh nền khác
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  ref={bannerInputRef}
                  onChange={handleBannerSelect}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={isProcessingBanner}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
                >
                  {isProcessingBanner ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                  )}
                  <span>{isProcessingBanner ? 'Đang đọc ảnh...' : 'Thêm ảnh nền từ máy tính'}</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. TÊN ỨNG DỤNG */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Tên phần mềm <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* 4. MÔ TẢ ỨNG DỤNG */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>Mô tả ứng dụng</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập mô tả tính năng hoặc lưu ý sử dụng..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
            />
          </div>

          {/* 5. PHIÊN BẢN */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Phiên bản hiển thị
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="v1.0.0"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Lưu Thay Đổi (Cập nhật Firebase)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
