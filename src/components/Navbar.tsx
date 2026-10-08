import React from 'react';
import { SephoangTextLogo } from './SephoangTextLogo';

interface NavbarProps {
  onOpenUpload?: () => void;
  isAdminMod?: boolean;
  onToggleAdminMod?: () => void;
  headerLogoUrl?: string;
  onEditHeaderLogo?: () => void;
  onEditBackground?: () => void;
  onEditMusic?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  headerLogoUrl,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-transparent backdrop-blur-none">
      <div className="w-full px-3 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand: Logo sát lề trái, hoàn toàn trong suốt, KHÔNG có nền đen */}
        <div className="flex items-center">
          <SephoangTextLogo
            className="h-9 sm:h-11 w-auto"
            customLogoUrl={headerLogoUrl}
            isAdminMod={false}
          />
        </div>

        {/* Tạm thời đã xóa phần Admin Mod theo yêu cầu */}
      </div>
    </header>
  );
};
