import React, { useState } from 'react';
import {
  Download,
  QrCode,
  Smartphone,
  Monitor,
  Star,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Edit3,
} from 'lucide-react';
import type { AppItem } from '../types';

interface AppCardProps {
  app: AppItem;
  isAdminMod?: boolean;
  animationDelay?: string;
  onOpenDetail: (app: AppItem) => void;
  onOpenQr: (app: AppItem) => void;
  onDownload: (app: AppItem) => void;
  onDelete: (app: AppItem) => void;
  onEditApp?: (app: AppItem) => void;
  onOpenDonation?: (app: AppItem) => void;
}

export const AppCard: React.FC<AppCardProps> = ({
  app,
  isAdminMod = false,
  animationDelay = '0s',
  onOpenDetail,
  onOpenQr,
  onDownload,
  onDelete,
  onEditApp,
  onOpenDonation,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const isWindows = app.platform === 'windows' || app.fileExtension === '.exe';

  // Lượt tải mặc định bằng 8 nếu chưa có hoặc nhỏ hơn 8, tăng dần khi tải thêm
  const effectiveDownloads =
    typeof app.downloadsCount === 'number' && app.downloadsCount >= 8
      ? app.downloadsCount
      : 8;

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDownloading(true);

    // Call main download logic (tăng lượt tải, bắt đầu tải file)
    onDownload(app);

    // Khi ấn tải EXE thì hiện thêm bảng QR MoMo và PayPal
    if (isWindows && onOpenDonation) {
      onOpenDonation(app);
    }

    setTimeout(() => setIsDownloading(false), 1500);
  };

  const handleQrClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenQr(app);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirmDelete(true);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(app);
    setShowConfirmDelete(false);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirmDelete(false);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEditApp) {
      onEditApp(app);
    }
  };

  return (
    <div
      onClick={() => onOpenDetail(app)}
      style={{ animationDelay }}
      className={`group relative bg-slate-900/80 hover:bg-slate-900/95 backdrop-blur-xl rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between shadow-xl animate-appear-card card-shine ${
        isAdminMod ? 'ring-1 ring-amber-500/40' : 'ring-1 ring-white/5 hover:ring-blue-500/30'
      }`}
    >
      {/* Confirmation Overlay for Delete */}
      {showConfirmDelete && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 z-30 bg-slate-950/95 backdrop-blur-md p-5 flex flex-col items-center justify-center text-center animate-in fade-in duration-150"
        >
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white mb-1">
            Xác nhận xóa ứng dụng?
          </h4>
          <p className="text-xs text-slate-400 mb-4 max-w-xs">
            Hành động này sẽ xóa vĩnh viễn <b>{app.name}</b> khỏi Firebase.
          </p>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCancelDelete}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa ngay</span>
            </button>
          </div>
        </div>
      )}

      {/* Optional Background Banner / Cover Image */}
      {app.bannerUrl ? (
        <div className="relative h-28 w-full overflow-hidden bg-slate-950">
          <img
            src={app.bannerUrl}
            alt={`Ảnh nền ${app.name}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent"></div>

          {/* Quick Edit Banner button in Admin Mode */}
          {isAdminMod && (
            <button
              type="button"
              onClick={handleEditClick}
              className="absolute top-2 right-2 z-10 text-[10px] bg-slate-950/80 hover:bg-slate-900 text-amber-300 px-2 py-1 rounded-md backdrop-blur-sm flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              <span>Sửa Ảnh Nền</span>
            </button>
          )}
        </div>
      ) : null}

      <div className={`p-5 ${app.bannerUrl ? '-mt-8 relative z-10' : ''}`}>
        {/* Top bar: Icon + Platform Badge + Category */}
        <div className="flex items-start gap-3.5 mb-3">
          {/* Logo / Icon (KHÔNG nền đen, không viền cứng, hiệu ứng sạch sẽ) */}
          <div className="relative group/icon shrink-0">
            <img
              src={app.iconUrl}
              alt={app.name}
              className="w-14 h-14 rounded-2xl object-cover shadow-lg group-hover:scale-105 transition-transform bg-transparent"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = isWindows
                  ? 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&auto=format&fit=crop&q=80'
                  : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80';
              }}
            />

            {isAdminMod && (
              <button
                type="button"
                onClick={handleEditClick}
                title="Sửa / Đổi logo ứng dụng"
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-1">
              {isWindows ? (
                <span className="text-[10px] font-bold tracking-wide text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Monitor className="w-3 h-3 text-blue-400" />
                  <span>WINDOWS .EXE</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold tracking-wide text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Smartphone className="w-3 h-3 text-emerald-400" />
                  <span>ANDROID .APK</span>
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors truncate">
              {app.name}
            </h3>

            <p className="text-xs text-slate-400 font-mono truncate">
              {app.category || (isWindows ? 'Phần mềm PC' : 'Ứng dụng Android')}
            </p>
          </div>
        </div>

        {/* Short description */}
        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
          {app.description || 'Chưa có mô tả chi tiết.'}
        </p>

        {/* ĐÃ BỎ 2 CÁI NÀY (Bỏ badge Phiên bản và Yêu cầu hệ điều hành theo đúng yêu cầu) */}
      </div>

      {/* Footer: CÁI DUNG LƯỢNG NẰM CHUNG VỚI CÁI LƯỢT TẢI */}
      <div className="p-4 bg-slate-950/60 flex items-center justify-between gap-2 mt-2">
        {/* Dung lượng NẰM CHUNG với Lượt tải (Mặc định bằng 8 và tăng dần) */}
        <div className="text-[11px] text-slate-300 flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-200 bg-slate-900/90 px-2 py-0.5 rounded-lg border border-slate-800">
            {app.fileSize || 'N/A'}
          </span>
          <span className="text-slate-600">•</span>
          <div className="flex items-center gap-1 text-slate-400">
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>
              <b className="text-white font-mono">{effectiveDownloads.toLocaleString()}</b> lượt tải
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Admin Mod Actions: Sửa Logo & Xóa */}
          {isAdminMod && (
            <>
              <button
                type="button"
                onClick={handleEditClick}
                title="Sửa logo và thông tin ứng dụng"
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Sửa</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteClick}
                title="Xóa ứng dụng khỏi hệ thống"
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}

          {/* QR Button */}
          <button
            type="button"
            onClick={handleQrClick}
            title={isWindows ? 'Xem link & mã QR' : 'Quét QR trên điện thoại'}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <QrCode className={`w-4 h-4 ${isWindows ? 'text-blue-400' : 'text-emerald-400'}`} />
          </button>

          {/* Download Button: Khi ấn tải EXE thì hiện thêm bảng QR MoMo và PayPal */}
          <button
            type="button"
            onClick={handleDownloadClick}
            className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer ${
              isDownloading
                ? 'bg-blue-600 text-white'
                : isWindows
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 active:scale-95'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-95'
            }`}
          >
            {isDownloading ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Đang tải...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{isWindows ? 'Tải .EXE' : 'Tải .APK'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
