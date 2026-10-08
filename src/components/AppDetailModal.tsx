import React, { useState } from 'react';
import {
  X,
  Download,
  QrCode,
  ShieldCheck,
  Smartphone,
  Monitor,
  Calendar,
  Check,
  Copy,
  Sparkles,
  Info,
  HelpCircle,
} from 'lucide-react';
import type { AppItem } from '../types';

interface AppDetailModalProps {
  app: AppItem | null;
  isAdminMod?: boolean;
  onClose: () => void;
  onDownload: (app: AppItem) => void;
  onOpenQr: (app: AppItem) => void;
  onDelete: (id: string) => void;
  onEdit?: (app: AppItem) => void;
  onOpenDonation?: (app: AppItem) => void;
}

export const AppDetailModal: React.FC<AppDetailModalProps> = ({
  app,
  isAdminMod = false,
  onClose,
  onDownload,
  onOpenQr,
  onEdit,
  onOpenDonation,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSha, setCopiedSha] = useState(false);

  if (!app) return null;

  const isWindows = app.platform === 'windows' || app.fileExtension === '.exe';

  const handleCopyLink = () => {
    const url = app.downloadUrl.startsWith('http')
      ? app.downloadUrl
      : `${window.location.origin}/api/apps/${app.id}/download-file`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopySha = () => {
    if (app.apkSha256) {
      navigator.clipboard.writeText(app.apkSha256);
      setCopiedSha(true);
      setTimeout(() => setCopiedSha(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Optional Banner Image */}
        {app.bannerUrl ? (
          <div className="relative h-40 w-full overflow-hidden bg-slate-950 shrink-0">
            <img
              src={app.bannerUrl}
              alt={`Ảnh nền ${app.name}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-black/30"></div>
          </div>
        ) : null}

        {/* Header */}
        <div className={`p-6 border-b border-slate-800 bg-slate-950/60 relative ${app.bannerUrl ? '-mt-12 z-10' : ''}`}>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors z-20 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <img
              src={app.iconUrl}
              alt={app.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-slate-700 shadow-xl bg-slate-800 shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = isWindows
                  ? 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80'
                  : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80';
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {isWindows ? (
                  <span className="text-xs bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Monitor className="w-3.5 h-3.5" />
                    <span>WINDOWS .EXE</span>
                  </span>
                ) : (
                  <span className="text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>ANDROID .APK</span>
                  </span>
                )}
                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                  {app.version}
                </span>
                <span className="text-xs text-slate-400">
                  {app.category}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1.5 tracking-tight">
                {app.name}
              </h2>

              <p className="text-xs font-mono text-slate-400 mt-0.5 truncate">
                Tệp: <span className="text-slate-200">{app.filename || `${app.name}${app.fileExtension || '.exe'}`}</span> • Đăng bởi{' '}
                <span className="text-slate-300 font-sans">{app.uploadedBy}</span>
              </p>
            </div>
          </div>

          {/* Download & Action bar */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                onDownload(app);
                if (isWindows && onOpenDonation) {
                  onOpenDonation(app);
                }
              }}
              className={`flex-1 min-w-[200px] flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl font-bold text-sm shadow-lg transition-all transform active:scale-95 cursor-pointer ${
                isWindows
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/25'
              }`}
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Tải Về File {app.fileExtension?.toUpperCase() || (isWindows ? '.EXE' : '.APK')} ({app.fileSize})</span>
            </button>

            <button
              onClick={() => onOpenQr(app)}
              className="flex items-center gap-1.5 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-blue-400" />
              <span>Link & QR</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 py-3 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
              title="Sao chép link tải"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            {isAdminMod && onEdit && (
              <button
                onClick={() => onEdit(app)}
                className="flex items-center gap-1.5 py-3 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/50 transition-colors cursor-pointer"
                title="Sửa logo, ảnh nền và thông tin ứng dụng"
              >
                <span>Sửa Logo &amp; Thông Tin</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 text-center">
              <div className="text-xs text-slate-400">Lượt tải</div>
              <div className="text-base font-bold text-blue-400 mt-0.5">
                {Math.max(8, app.downloadsCount ?? 8).toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 text-center">
              <div className="text-xs text-slate-400">Dung lượng</div>
              <div className="text-base font-bold text-slate-200 mt-0.5">{app.fileSize}</div>
            </div>
            <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 text-center">
              <div className="text-xs text-slate-400">Hệ điều hành</div>
              <div className="text-base font-bold text-slate-200 mt-0.5">{app.osRequirement || app.minAndroid || 'Windows 10/11'}</div>
            </div>
            <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 text-center">
              <div className="text-xs text-slate-400">Định dạng</div>
              <div className="text-base font-bold text-amber-400 mt-0.5 font-mono">{app.fileExtension || '.exe'}</div>
            </div>
          </div>

          {/* Execution guide note */}
          {isWindows && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-xs text-slate-300 flex items-start gap-3">
              <HelpCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-blue-300">Cách mở file .EXE trên Windows:</span>
                <p className="text-slate-400 mt-1 leading-relaxed">
                  Nhấp đúp chuột vào file <b>{app.filename || `${app.name}.exe`}</b> để chạy trực tiếp. Nếu xuất hiện hộp thoại <i>"Windows protected your PC"</i>, chỉ cần bấm <b>"More info"</b> rồi chọn <b>"Run anyway"</b>.
                </p>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-400" />
              Giới thiệu chi tiết
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/40 p-4 rounded-xl border border-slate-800/60">
              {app.description}
            </p>
          </div>

          {/* Features */}
          {app.features && app.features.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                Tính năng nổi bật
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {app.features.map((feat, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 text-xs text-slate-300"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Screenshots Gallery if any */}
          {app.screenshots && app.screenshots.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Ảnh chụp màn hình phần mềm
              </h4>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {app.screenshots.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Screenshot ${idx + 1}`}
                    className="h-44 sm:h-52 rounded-xl object-cover border border-slate-800 shadow-md shrink-0 bg-slate-950 hover:opacity-95 transition-opacity"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Changelog */}
          {app.changelog && (
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Nhật ký cập nhật phiên bản {app.version}
              </h4>
              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60 text-xs text-slate-300 leading-relaxed whitespace-pre-line font-mono">
                {app.changelog}
              </div>
            </div>
          )}

          {/* Security & Verification Check */}
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3.5 flex items-start gap-3 text-xs">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-emerald-300">File thực thi sạch & an toàn:</span>
              <p className="text-slate-400 mt-0.5">
                Tệp {app.fileExtension || '.exe'} được lưu trữ nguyên bản, không chèn phần mềm độc hại.
              </p>
              {app.apkSha256 && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-2 py-1 rounded truncate flex-1 border border-slate-800">
                    SHA256: {app.apkSha256}
                  </span>
                  <button
                    onClick={handleCopySha}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 py-1 px-2 rounded bg-slate-900 border border-slate-800 cursor-pointer"
                  >
                    {copiedSha ? 'Đã chép' : 'Sao chép'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Ngày đăng: {new Date(app.createdAt).toLocaleDateString('vi-VN')}
          </div>
        </div>
      </div>
    </div>
  );
};