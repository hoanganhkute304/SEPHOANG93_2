import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Trash2,
  Save,
  ShieldCheck,
  RotateCcw,
  Scissors,
} from 'lucide-react';
import { saveSiteLogoToFirestore, deleteSiteLogoFromFirestore } from '../firebase';

interface EditHeaderLogoModalProps {
  isOpen: boolean;
  currentLogoUrl?: string;
  onClose: () => void;
  onLogoUpdated: (newLogoUrl: string) => void;
}

// Client-side image processor: Always PNG with transparent background
function processHeaderLogoFile(file: File, removeBlackBackground = true): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1600;
        const maxHeight = 500;
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

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Remove black background if requested (chroma-key dark pixels to transparent)
        if (removeBlackBackground) {
          try {
            const imgData = ctx.getImageData(0, 0, width, height);
            const data = imgData.data;
            const threshold = 35; // Pixels darker than threshold become transparent

            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];

              // Check if pixel is dark/black
              if (r < threshold && g < threshold && b < threshold) {
                // Smoothly fade alpha based on darkness
                const brightness = Math.max(r, g, b);
                if (brightness < 18) {
                  data[i + 3] = 0; // 100% transparent
                } else {
                  data[i + 3] = Math.round(((brightness - 18) / (threshold - 18)) * 255);
                }
              }
            }
            ctx.putImageData(imgData, 0, 0);
          } catch (err) {
            console.warn('Could not remove black background pixels:', err);
          }
        }

        // Always output PNG to preserve alpha channel
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Function to remove black background from an existing data URL
function removeBlackFromDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const threshold = 38;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          if (r < threshold && g < threshold && b < threshold) {
            const brightness = Math.max(r, g, b);
            if (brightness < 20) {
              data[i + 3] = 0;
            } else {
              data[i + 3] = Math.round(((brightness - 20) / (threshold - 20)) * 255);
            }
          }
        }
        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export const EditHeaderLogoModal: React.FC<EditHeaderLogoModalProps> = ({
  isOpen,
  currentLogoUrl,
  onClose,
  onLogoUpdated,
}) => {
  if (!isOpen) return null;

  const [previewLogo, setPreviewLogo] = useState<string>(currentLogoUrl || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [removeBlackBg, setRemoveBlackBg] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsProcessing(true);
      setError(null);
      try {
        const dataUrl = await processHeaderLogoFile(file, removeBlackBg);
        setPreviewLogo(dataUrl);
      } catch (err) {
        console.error('Lỗi đọc ảnh logo:', err);
        setError('Không thể đọc tệp ảnh. Vui lòng chọn ảnh khác.');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleCleanBlackBg = async () => {
    if (!previewLogo) return;
    setIsProcessing(true);
    try {
      const cleaned = await removeBlackFromDataUrl(previewLogo);
      setPreviewLogo(cleaned);
    } catch {
      // ignore
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetToDefault = () => {
    setPreviewLogo('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      if (previewLogo) {
        await saveSiteLogoToFirestore(previewLogo);
        onLogoUpdated(previewLogo);
      } else {
        await deleteSiteLogoFromFirestore();
        onLogoUpdated('');
      }
      onClose();
    } catch (err: any) {
      console.error('Lỗi lưu logo lên Firebase:', err);
      setError('Lỗi khi lưu logo lên Firebase. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 rounded-3xl shadow-2xl overflow-hidden my-auto ring-1 ring-white/10">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Sửa Logo Trang Web (Thanh Header)
                </h3>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded">
                  ADMIN MOD
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Thay đổi logo ở góc trên bên trái, xóa bỏ nền đen để logo trong suốt
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

        {/* Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 text-red-400 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Preview Section với nền kẻ ô trong suốt */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Xem trước Logo trên nền trong suốt:
            </label>
            <div
              className="relative w-full h-24 rounded-2xl flex items-center justify-center p-3 overflow-hidden border border-slate-700/60"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                backgroundColor: '#0f172a',
              }}
            >
              {previewLogo ? (
                <img
                  src={previewLogo}
                  alt="Xem trước logo"
                  className="max-h-full max-w-full object-contain filter drop-shadow-md"
                />
              ) : (
                <img
                  src="/sephoang93-logo.svg"
                  alt="Logo mặc định SEPHOANG 93"
                  className="max-h-full max-w-full object-contain filter drop-shadow-md"
                />
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
              <span>{previewLogo ? 'Logo tự chọn đang nạp' : 'Logo mặc định: SEPHOANG 93 (Đã khử nền đen)'}</span>
              {previewLogo && (
                <button
                  type="button"
                  onClick={handleCleanBlackBg}
                  disabled={isProcessing}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
                  title="Xóa nền đen xung quanh logo"
                >
                  <Scissors className="w-3 h-3" />
                  <span>Xóa nền đen</span>
                </button>
              )}
            </p>
          </div>

          {/* Tùy chọn tự động tách nền đen */}
          <div className="p-3 bg-slate-950 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <div>
                <p className="text-xs font-semibold text-slate-200">
                  Tự động tách nền đen (Trong suốt)
                </p>
                <p className="text-[10px] text-slate-400">
                  Giúp logo hòa nhập hoàn hảo vào video/ảnh nền mà không có viền đen
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={removeBlackBg}
              onChange={(e) => setRemoveBlackBg(e.target.checked)}
              className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
            />
          </div>

          {/* Action: Upload new image from device */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Đang xử lý ảnh & khử nền đen...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-cyan-400" />
                  <span>Tải ảnh Logo mới từ thiết bị (PNG / JPG / WebP)</span>
                </>
              )}
            </button>
          </div>

          {/* Action: Khôi phục logo mặc định */}
          {previewLogo && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa logo tự chọn & Dùng lại logo SEPHOANG 93 gốc</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4 bg-slate-950/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isProcessing}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 stroke-[2.5]" />
                <span>Lưu Logo Lên Firebase</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
