import React from 'react';
import { Edit3 } from 'lucide-react';

interface SephoangTextLogoProps {
  className?: string;
  customLogoUrl?: string;
  isAdminMod?: boolean;
  onEditLogo?: () => void;
}

export const SephoangTextLogo: React.FC<SephoangTextLogoProps> = ({
  className = 'h-10 sm:h-12 w-auto',
  customLogoUrl,
  isAdminMod = false,
  onEditLogo,
}) => {
  return (
    <div className="relative flex items-center gap-2 group select-none">
      <div
        onClick={isAdminMod && onEditLogo ? onEditLogo : undefined}
        className={`relative flex items-center bg-transparent ${
          isAdminMod ? 'cursor-pointer hover:opacity-90' : ''
        } ${className}`}
        title={isAdminMod ? 'Nhấp để Thêm, Xóa, Sửa Logo Header' : 'SEPHOANG 93'}
      >
        <img
          src={customLogoUrl || '/sephoang93-logo.svg'}
          alt="SEPHOANG 93"
          className="h-full w-auto max-w-[260px] sm:max-w-[340px] object-contain group-hover:brightness-110 transition-all duration-200 bg-transparent mix-blend-screen"
          style={{ mixBlendMode: 'screen' }}
        />

        {/* Admin Mod Edit Pencil Badge directly on the logo */}
        {isAdminMod && onEditLogo && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditLogo();
            }}
            title="Sửa logo ở trên (Header Logo)"
            className="absolute -top-1 -right-2 p-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-transform hover:scale-110 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Admin Mode Label if in Admin Mod */}
      {isAdminMod && onEditLogo && (
        <button
          type="button"
          onClick={onEditLogo}
          className="hidden md:flex items-center gap-1 text-[11px] bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold px-2 py-1 rounded-lg transition-colors cursor-pointer"
        >
          <Edit3 className="w-3 h-3" />
          <span>Sửa Logo Trên</span>
        </button>
      )}
    </div>
  );
};
