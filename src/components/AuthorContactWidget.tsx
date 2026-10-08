import React, { useState } from 'react';
import {
  User,
  Copy,
  Check,
  Mail,
  Phone,
  Edit3,
  Save,
  X,
  ShieldCheck,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import type { AuthorInfoSettings } from '../firebase';
import { saveAuthorSettings } from '../firebase';

interface AuthorContactWidgetProps {
  authorInfo: AuthorInfoSettings;
  isAdminMod?: boolean;
  onUpdateAuthorInfo?: (newInfo: AuthorInfoSettings) => void;
  onShowToast?: (message: string) => void;
}

export const AuthorContactWidget: React.FC<AuthorContactWidgetProps> = ({
  authorInfo,
  isAdminMod = false,
  onUpdateAuthorInfo,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempInfo, setTempInfo] = useState<AuthorInfoSettings>(authorInfo);
  const [isSaving, setIsSaving] = useState(false);

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = authorInfo.email || 'kute123kuto123@gmail.com';
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    if (onShowToast) {
      onShowToast(`Đã sao chép: ${textToCopy}`);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const fullText = `${authorInfo.name || 'SEPHOANG 93'} - Email: ${authorInfo.email}${
      authorInfo.phone ? ` - SĐT: ${authorInfo.phone}` : ''
    }`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    if (onShowToast) {
      onShowToast('Đã sao chép thông tin tác giả!');
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveAuthorSettings(tempInfo);
      if (onUpdateAuthorInfo) {
        onUpdateAuthorInfo(tempInfo);
      }
      setIsEditing(false);
      if (onShowToast) {
        onShowToast('Đã cập nhật thông tin tác giả vào Firebase!');
      }
    } catch (err) {
      console.error('Lỗi lưu thông tin tác giả:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 select-none">
      {/* Expanded Details Card */}
      {isExpanded && (
        <div className="mb-3 w-72 sm:w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl p-4 text-xs animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm leading-tight">
                  {authorInfo.name || 'SEPHOANG 93'}
                </h4>
                <p className="text-[10px] text-slate-400">
                  {authorInfo.bio || 'Tác giả & Nhà phát triển'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {isAdminMod && (
                <button
                  type="button"
                  onClick={() => {
                    setTempInfo(authorInfo);
                    setIsEditing(true);
                  }}
                  className="p-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 transition-colors cursor-pointer"
                  title="Sửa thông tin của tôi (Admin Mod)"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {/* Email Field with Copy Button */}
            <div className="flex items-center justify-between gap-2 bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="font-mono text-slate-200 truncate">{authorInfo.email}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="px-2 py-0.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] flex items-center gap-1 transition-all active:scale-95 cursor-pointer shrink-0"
                title="Sao chép email"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Đã copy' : 'Copy'}</span>
              </button>
            </div>

            {/* Optional Phone / Zalo */}
            {authorInfo.phone && (
              <div className="flex items-center justify-between gap-2 bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="font-mono text-slate-200 truncate">{authorInfo.phone}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(authorInfo.phone || '');
                    setCopied(true);
                    if (onShowToast) onShowToast(`Đã sao chép: ${authorInfo.phone}`);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 font-bold text-[10px] flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>
            )}

            {/* Quick copy all button */}
            <button
              type="button"
              onClick={handleCopyAll}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-blue-400" />
              <span>Sao chép toàn bộ thông tin</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Bottom-Right Trigger Pill */}
      <div className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 hover:border-blue-500/40 rounded-2xl shadow-2xl p-1.5 sm:p-2 transition-all duration-300 hover:shadow-blue-500/10">
        {/* User Avatar / Badge */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-2.5 py-1 text-xs text-left cursor-pointer group"
          title="Nhấp để xem chi tiết thông tin tác giả"
        >
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0 group-hover:scale-105 transition-transform">
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col min-w-0 max-w-[130px] sm:max-w-[170px]">
            <span className="text-[11px] font-bold text-white truncate leading-tight group-hover:text-blue-300 transition-colors">
              {authorInfo.name || 'SEPHOANG 93'}
            </span>
            <span className="text-[10px] text-slate-400 truncate font-mono">
              {authorInfo.email}
            </span>
          </div>
        </button>

        {/* 1-Click Fast COPY Button directly on the widget */}
        <button
          type="button"
          onClick={handleCopyEmail}
          className={`px-2.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-md active:scale-95 ${
            copied
              ? 'bg-emerald-500 text-slate-950 font-bold'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
          }`}
          title="Sao chép nhanh email"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Đã copy!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Copy</span>
            </>
          )}
        </button>

        {/* Expand / Collapse toggle */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          title={isExpanded ? 'Thu gọn' : 'Xem thêm'}
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Edit Modal (Admin Mod) */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-slate-900 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10">
            <div className="px-5 py-3.5 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Sửa Thông Tin Tác Giả (Admin Mod)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Tên hiển thị / Tác giả
                </label>
                <input
                  type="text"
                  value={tempInfo.name}
                  onChange={(e) => setTempInfo({ ...tempInfo, name: e.target.value })}
                  placeholder="SEPHOANG 93"
                  className="w-full bg-slate-950 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Email (người dùng sẽ sao chép)
                </label>
                <input
                  type="email"
                  value={tempInfo.email}
                  onChange={(e) => setTempInfo({ ...tempInfo, email: e.target.value })}
                  placeholder="kute123kuto123@gmail.com"
                  className="w-full bg-slate-950 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Số điện thoại / Zalo (tùy chọn)
                </label>
                <input
                  type="text"
                  value={tempInfo.phone || ''}
                  onChange={(e) => setTempInfo({ ...tempInfo, phone: e.target.value })}
                  placeholder="0987.xxx.xxx"
                  className="w-full bg-slate-950 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Mô tả ngắn / Chức danh
                </label>
                <input
                  type="text"
                  value={tempInfo.bio || ''}
                  onChange={(e) => setTempInfo({ ...tempInfo, bio: e.target.value })}
                  placeholder="Nhà sáng tạo / Developer"
                  className="w-full bg-slate-950 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Đang lưu...' : 'Lưu Vào Firebase'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
