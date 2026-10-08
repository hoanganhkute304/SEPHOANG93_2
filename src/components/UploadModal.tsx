import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileCode,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  Loader2,
  Database,
  Monitor,
  Smartphone,
  Image as ImageIcon,
  Sparkles,
  Trash2,
  AlignLeft,
} from 'lucide-react';
import type { AppItem, PlatformType } from '../types';
import { saveAppToFirestore } from '../firebase';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAppCreated: (newApp: AppItem) => void;
}

// 4MB chunks for fast, reliable streaming and smooth progress
const CHUNK_SIZE = 4 * 1024 * 1024;

// Client-side image processor for banners (max 1280x720, compact JPEG)
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

// Client-side image processor for icons (max 256x256 square, compact PNG/JPEG)
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

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onAppCreated,
}) => {
  const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file');
  const [platform, setPlatform] = useState<PlatformType>('windows');

  // Core fields
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Images
  const [bannerUrl, setBannerUrl] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [isProcessingBanner, setIsProcessingBanner] = useState(false);
  const [isProcessingIcon, setIsProcessingIcon] = useState(false);

  // Upload progress & state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successApp, setSuccessApp] = useState<AppItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setError(null);

      const lower = file.name.toLowerCase();
      if (lower.endsWith('.exe')) {
        setPlatform('windows');
      } else if (lower.endsWith('.apk')) {
        setPlatform('android');
      }

      // Automatically fill the name if empty
      if (!name) {
        const cleanName = file.name
          .replace(/\.(exe|apk|zip|msi)$/i, '')
          .replace(/[_-]/g, ' ')
          .replace(/\bv\d+(\.\d+)*/i, '')
          .trim();
        setName(cleanName || file.name);
      }
    }
  };

  // Client-side banner image selection
  const handleBannerSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const imgFile = e.target.files[0];
      setIsProcessingBanner(true);
      setError(null);
      try {
        const dataUrl = await processBannerFile(imgFile);
        setBannerUrl(dataUrl);
      } catch (err) {
        console.error('Error reading banner image:', err);
        setError('Không thể đọc file ảnh nền. Vui lòng chọn ảnh khác.');
      } finally {
        setIsProcessingBanner(false);
      }
    }
  };

  // Client-side icon image selection
  const handleIconSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const imgFile = e.target.files[0];
      setIsProcessingIcon(true);
      setError(null);
      try {
        const dataUrl = await processIconFile(imgFile);
        setIconUrl(dataUrl);
      } catch (err) {
        console.error('Error reading icon image:', err);
        setError('Không thể đọc file ảnh icon. Vui lòng chọn ảnh khác.');
      } finally {
        setIsProcessingIcon(false);
      }
    }
  };

  const uploadChunk = (
    uploadId: string,
    chunkIndex: number,
    totalChunks: number,
    chunkBlob: Blob,
    filename: string,
    retryCount = 0
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const query = `uploadId=${encodeURIComponent(uploadId)}&chunkIndex=${chunkIndex}&totalChunks=${totalChunks}&filename=${encodeURIComponent(filename)}`;
      xhr.open('POST', `/api/upload-chunk?${query}`, true);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.setRequestHeader('X-Upload-Id', uploadId);
      xhr.setRequestHeader('X-Chunk-Index', String(chunkIndex));

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            reject(new Error(data.error || `Lỗi tải mảnh file (${xhr.status})`));
          } catch {
            reject(new Error(`Lỗi tải mảnh file (${xhr.status})`));
          }
        }
      };

      xhr.onerror = () => {
        if (retryCount < 2) {
          setTimeout(() => {
            uploadChunk(uploadId, chunkIndex, totalChunks, chunkBlob, filename, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, 400);
        } else {
          reject(new Error(`Lỗi kết nối khi tải mảnh file ${chunkIndex + 1}/${totalChunks}`));
        }
      };

      xhr.send(chunkBlob);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (uploadMode === 'file' && !selectedFile) {
      setError('Vui lòng chọn 1 file (.exe hoặc .apk) từ máy tính của bạn trước khi bấm Lưu.');
      return;
    }

    if (uploadMode === 'link' && !externalUrl.trim()) {
      setError('Vui lòng nhập link tải file trực tiếp (Google Drive, GitHub, v.v.).');
      return;
    }

    const appName = name.trim() || selectedFile?.name.replace(/\.[^/.]+$/, '') || 'Ứng dụng';

    setIsSubmitting(true);
    setUploadProgress(0);

    const defaultIcon =
      platform === 'windows'
        ? 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80';

    const finalIcon = iconUrl.trim() || defaultIcon;

    try {
      if (uploadMode === 'file' && selectedFile) {
        const file = selectedFile;
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const uploadId = `up_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        // Upload chunk by chunk
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(file.size, start + CHUNK_SIZE);
          const chunkBlob = file.slice(start, end);

          setStatusText(`Đang truyền phần ${i + 1}/${totalChunks} (${((end / (1024 * 1024))).toFixed(1)} MB)...`);
          const currentPercent = Math.round(((i) / totalChunks) * 90);
          setUploadProgress(currentPercent);

          await uploadChunk(uploadId, i, totalChunks, chunkBlob, file.name);
        }

        // Complete and assemble file
        setStatusText('Đang hoàn tất và lưu vào cơ sở dữ liệu...');
        setUploadProgress(95);

        const completeRes = await fetch('/api/upload-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadId,
            totalChunks,
            filename: file.name,
            name: appName,
            platform,
            version: 'v1.0.0',
            category: platform === 'windows' ? 'Phần mềm PC' : 'Ứng dụng Android',
            description: description.trim(),
            uploadedBy: 'Người phát triển',
            bannerUrl: bannerUrl.trim(),
            iconUrl: finalIcon,
          }),
        });

        const completeData = await completeRes.json();
        if (!completeRes.ok || !completeData.success) {
          throw new Error(completeData.error || 'Lỗi ghép file trên máy chủ');
        }

        const appToSave: AppItem = {
          ...completeData.data,
          iconUrl: finalIcon,
          bannerUrl: bannerUrl.trim(),
          description: description.trim(),
        };

        setUploadProgress(100);
        setStatusText('Hoàn tất!');
        setSuccessApp(appToSave);

        // Save to Firebase Firestore
        try {
          await saveAppToFirestore(appToSave);
        } catch (e) {
          console.warn('Firestore sync error:', e);
        }

        onAppCreated(appToSave);
      } else {
        // Direct link submission
        setStatusText('Đang lưu thông tin...');
        setUploadProgress(50);

        const res = await fetch('/api/apps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: appName,
            platform,
            downloadUrl: externalUrl.trim(),
            version: 'v1.0.0',
            category: platform === 'windows' ? 'Phần mềm PC' : 'Ứng dụng Android',
            description: description.trim(),
            uploadedBy: 'Người dùng',
            bannerUrl: bannerUrl.trim(),
            iconUrl: finalIcon,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Lỗi khi lưu vào cơ sở dữ liệu');
        }

        const appToSave: AppItem = {
          ...data.data,
          iconUrl: finalIcon,
          bannerUrl: bannerUrl.trim(),
          description: description.trim(),
        };

        setUploadProgress(100);
        setSuccessApp(appToSave);

        // Save to Firebase Firestore
        try {
          await saveAppToFirestore(appToSave);
        } catch (e) {
          console.warn('Firestore sync error:', e);
        }

        onAppCreated(appToSave);
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message || 'Có lỗi xảy ra khi tải lên. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSelectedFile(null);
    setExternalUrl('');
    setName('');
    setDescription('');
    setBannerUrl('');
    setIconUrl('');
    setSuccessApp(null);
    setError(null);
    setUploadProgress(0);
    setStatusText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Gửi App / File Lên CSDL
              </h3>
              <p className="text-xs text-slate-400">
                Lưu trữ vĩnh viễn trên Firebase Firestore
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

        {/* Success screen */}
        {successApp ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold text-white">Đã Đăng Lên CSDL Thành Công!</h4>
            <p className="text-sm text-slate-300">
              Phần mềm <b>{successApp.name}</b> ({successApp.fileSize}) đã được lưu trữ an toàn trong Firebase và hiển thị trên trang chủ.
            </p>

            {/* Banner preview if added */}
            {successApp.bannerUrl && (
              <div className="max-w-xs mx-auto rounded-xl overflow-hidden border border-slate-800 shadow-md">
                <img
                  src={successApp.bannerUrl}
                  alt="Ảnh nền đã lưu"
                  className="w-full h-24 object-cover"
                />
              </div>
            )}

            <div className="pt-4 flex items-center justify-center gap-3">
              <button
                onClick={handleResetForm}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Đăng thêm file khác
              </button>
              <button
                onClick={onClose}
                className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition-colors cursor-pointer"
              >
                Xem ngay trên trang
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            {/* Error banner on top */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Choose upload type */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  uploadMode === 'file'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Tải file từ máy</span>
              </button>

              <button
                type="button"
                onClick={() => setUploadMode('link')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  uploadMode === 'link'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Dán link tải trực tiếp</span>
              </button>
            </div>

            {/* File dropzone or URL input */}
            {uploadMode === 'file' ? (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept=".exe,.apk,.zip,.msi"
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                    selectedFile
                      ? 'border-blue-500/80 bg-blue-500/10'
                      : 'border-slate-700 hover:border-blue-500/60 bg-slate-950/50'
                  }`}
                >
                  <FileCode
                    className={`w-10 h-10 mx-auto mb-2 ${
                      selectedFile ? 'text-blue-400' : 'text-slate-500'
                    }`}
                  />
                  {selectedFile ? (
                    <div>
                      <div className="text-sm font-bold text-white truncate max-w-xs mx-auto">
                        {selectedFile.name}
                      </div>
                      <div className="text-xs text-blue-400 mt-1 font-mono">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Nhấp để đổi file khác
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm font-semibold text-slate-200">
                        Nhấn vào đây để chọn file <span className="text-blue-400 font-mono">.exe</span> hoặc{' '}
                        <span className="text-emerald-400 font-mono">.apk</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Hỗ trợ file dung lượng lớn tự động chia nhỏ mượt mà
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Link tải file (Google Drive, GitHub, MediaFire, link trực tiếp...)
                </label>
                <input
                  type="text"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://drive.google.com/... hoặc link direct"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {/* Platform toggle */}
            <div className="flex items-center justify-between text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <span className="text-slate-400 font-medium">Nền tảng:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPlatform('windows')}
                  className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    platform === 'windows'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Windows (.exe)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlatform('android')}
                  className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    platform === 'android'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Android (.apk)</span>
                </button>
              </div>
            </div>

            {/* App Name input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tên ứng dụng / phần mềm <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="vd: Tên phần mềm của bạn"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* CHỌN ẢNH ICON / LOGO */}
            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Ảnh Icon / Logo Ứng Dụng (Tùy chọn)</span>
                </label>
                {iconUrl && (
                  <button
                    type="button"
                    onClick={() => setIconUrl('')}
                    className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Xóa icon</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {iconUrl ? (
                  <img
                    src={iconUrl}
                    alt="Icon xem trước"
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-md bg-slate-850 shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl border border-slate-700 bg-slate-850 flex items-center justify-center text-slate-500 shrink-0">
                    <Sparkles className="w-6 h-6 text-slate-600" />
                  </div>
                )}

                <div className="flex-1">
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
                    className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
                  >
                    {isProcessingIcon ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>{isProcessingIcon ? 'Đang đọc icon...' : iconUrl ? 'Đổi icon khác từ máy' : 'Chọn ảnh Icon từ máy tính'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* CHỌN ẢNH NỀN / BANNER */}
            <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-400" />
                  <span>Ảnh Nền / Banner Ứng Dụng (Tùy chọn)</span>
                </label>
                {bannerUrl && (
                  <button
                    type="button"
                    onClick={() => setBannerUrl('')}
                    className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Xóa ảnh nền</span>
                  </button>
                )}
              </div>

              {/* Banner Preview if selected */}
              {bannerUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-700 h-28 group">
                  <img
                    src={bannerUrl}
                    alt="Ảnh nền đã chọn"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end justify-between p-2.5">
                    <span className="text-[11px] text-emerald-400 font-medium bg-slate-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                      ✓ Đã áp dụng ảnh nền
                    </span>
                    <button
                      type="button"
                      onClick={() => bannerInputRef.current?.click()}
                      className="text-[11px] text-slate-200 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700 transition-colors shadow cursor-pointer"
                    >
                      Đổi ảnh khác
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Upload banner button */}
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
                className="w-full py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700/80 transition-colors cursor-pointer"
              >
                {isProcessingBanner ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                ) : (
                  <Upload className="w-4 h-4 text-blue-400" />
                )}
                <span>
                  {isProcessingBanner
                    ? 'Đang xử lý ảnh nền...'
                    : bannerUrl
                    ? 'Nhấp để đổi ảnh nền khác từ máy tính'
                    : 'Nhấp để chọn ảnh nền từ máy tính'}
                </span>
              </button>
            </div>

            {/* MÔ TẢ ỨNG DỤNG */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <AlignLeft className="w-3.5 h-3.5 text-blue-400" />
                <span>Mô tả ứng dụng / phần mềm (Tùy chọn)</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Nhập mô tả tính năng nổi bật, cách cài đặt, phím tắt hoặc lưu ý khi dùng..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
              />
            </div>

            {/* Progress Bar when uploading */}
            {isSubmitting && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1.5 truncate max-w-[280px]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400 shrink-0" />
                    <span className="truncate">{statusText || 'Đang tải lên và lưu CSDL...'}</span>
                  </span>
                  <span className="font-mono font-bold text-blue-400">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error display right before submit button if any */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-slate-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang tải... ({uploadProgress}%)</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 stroke-[2.5]" />
                    <span>Lưu &amp; Đăng Lên CSDL</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
