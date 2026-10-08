import React, { useState } from 'react';
import { Edit3, Save, X, ShieldCheck } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface SocialLinks {
  discord: string;
  tiktok: string;
  youtube: string;
  instagram: string;
  telegram?: string;
}

interface SocialLinksBarProps {
  isAdminMod?: boolean;
  socials: SocialLinks;
  onUpdateSocials: (newSocials: SocialLinks) => void;
}

export const SocialLinksBar: React.FC<SocialLinksBarProps> = ({
  isAdminMod = false,
  socials,
  onUpdateSocials,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempLinks, setTempLinks] = useState<SocialLinks>(socials);
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenEdit = () => {
    setTempLinks({
      discord: socials.discord || 'https://discord.gg',
      tiktok: socials.tiktok || 'https://tiktok.com',
      youtube: socials.youtube || 'https://youtube.com',
      instagram: socials.instagram || socials.telegram || 'https://instagram.com',
    });
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'socials'), {
        ...tempLinks,
        updatedAt: new Date().toISOString(),
      });
      onUpdateSocials(tempLinks);
      setIsEditing(false);
    } catch (err) {
      console.error('Lỗi lưu mạng xã hội:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="py-6 flex flex-col items-center justify-center gap-3">
      {/* Chỉ để lại các logo mạng xã hội: DISCORD, TIKTOK, YOUTUBE, INSTAGRAM */}
      <div className="flex items-center justify-center gap-4 sm:gap-6">
        {/* 1. DISCORD LOGO */}
        <a
          href={socials.discord || 'https://discord.gg'}
          target="_blank"
          rel="noopener noreferrer"
          title="Discord"
          className="w-12 h-12 rounded-2xl bg-slate-900/80 hover:bg-[#5865F2] flex items-center justify-center text-slate-300 hover:text-white transition-all duration-200 transform hover:scale-110 hover:shadow-xl hover:shadow-[#5865F2]/40 group cursor-pointer shadow-md backdrop-blur-md"
        >
          <svg
            className="w-6 h-6 fill-[#5865F2] group-hover:fill-white transition-colors"
            viewBox="0 0 24 24"
          >
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
        </a>

        {/* 2. TIKTOK LOGO - Chuẩn nét, chính xác, không lỗi */}
        <a
          href={socials.tiktok || 'https://tiktok.com'}
          target="_blank"
          rel="noopener noreferrer"
          title="TikTok"
          className="w-12 h-12 rounded-2xl bg-slate-900/80 hover:bg-black flex items-center justify-center text-slate-300 hover:text-white transition-all duration-200 transform hover:scale-110 hover:shadow-xl hover:shadow-pink-500/35 group cursor-pointer shadow-md backdrop-blur-md"
        >
          <svg
            className="w-6 h-6 transition-transform group-hover:scale-105"
            viewBox="0 0 24 24"
          >
            <path
              fill="#25F4EE"
              d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"
              transform="translate(-0.4, -0.4)"
            />
            <path
              fill="#FE2C55"
              d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"
              transform="translate(0.4, 0.4)"
            />
            <path
              fill="#FFFFFF"
              d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"
            />
          </svg>
        </a>

        {/* 3. YOUTUBE LOGO */}
        <a
          href={socials.youtube || 'https://youtube.com'}
          target="_blank"
          rel="noopener noreferrer"
          title="YouTube"
          className="w-12 h-12 rounded-2xl bg-slate-900/80 hover:bg-[#FF0000] flex items-center justify-center text-slate-300 hover:text-white transition-all duration-200 transform hover:scale-110 hover:shadow-xl hover:shadow-[#FF0000]/40 group cursor-pointer shadow-md backdrop-blur-md"
        >
          <svg
            className="w-6 h-6 fill-[#FF0000] group-hover:fill-white transition-colors"
            viewBox="0 0 24 24"
          >
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
        </a>

        {/* 4. INSTAGRAM LOGO (Đã thay thế Telegram thành Instagram theo yêu cầu) */}
        <a
          href={socials.instagram || socials.telegram || 'https://instagram.com'}
          target="_blank"
          rel="noopener noreferrer"
          title="Instagram"
          className="w-12 h-12 rounded-2xl bg-slate-900/80 hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] flex items-center justify-center text-slate-300 hover:text-white transition-all duration-200 transform hover:scale-110 hover:shadow-xl hover:shadow-pink-500/40 group cursor-pointer shadow-md backdrop-blur-md"
        >
          <svg
            className="w-6 h-6 fill-[#E1306C] group-hover:fill-white transition-colors"
            viewBox="0 0 24 24"
          >
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
        </a>
      </div>

      {/* Admin Mod edit button - chỉ hiện khi Admin Mod đang BẬT */}
      {isAdminMod && (
        <button
          type="button"
          onClick={handleOpenEdit}
          className="text-[11px] bg-slate-900/90 hover:bg-slate-800 text-amber-300 font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
        >
          <Edit3 className="w-3 h-3" />
          <span>Sửa link mạng xã hội</span>
        </button>
      )}

      {/* Edit Social Links Modal for Admin Mod */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10">
            <div className="px-6 py-4 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-white">Sửa Link Mạng Xã Hội (Admin Mod)</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Link Discord
                </label>
                <input
                  type="text"
                  value={tempLinks.discord}
                  onChange={(e) => setTempLinks({ ...tempLinks, discord: e.target.value })}
                  placeholder="https://discord.gg/..."
                  className="w-full bg-slate-950 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Link TikTok
                </label>
                <input
                  type="text"
                  value={tempLinks.tiktok}
                  onChange={(e) => setTempLinks({ ...tempLinks, tiktok: e.target.value })}
                  placeholder="https://www.tiktok.com/@..."
                  className="w-full bg-slate-950 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Link YouTube
                </label>
                <input
                  type="text"
                  value={tempLinks.youtube}
                  onChange={(e) => setTempLinks({ ...tempLinks, youtube: e.target.value })}
                  placeholder="https://youtube.com/@..."
                  className="w-full bg-slate-950 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Link Instagram
                </label>
                <input
                  type="text"
                  value={tempLinks.instagram}
                  onChange={(e) => setTempLinks({ ...tempLinks, instagram: e.target.value })}
                  placeholder="https://www.instagram.com/..."
                  className="w-full bg-slate-950 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-pink-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Đang lưu...' : 'Lưu Link'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
