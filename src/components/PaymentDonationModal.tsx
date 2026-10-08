import React from 'react';
import { X } from 'lucide-react';
import type { AppItem } from '../types';
import type { PaymentSettings } from '../firebase';

interface PaymentDonationModalProps {
  isOpen: boolean;
  app: AppItem | null;
  settings: PaymentSettings;
  isAdminMod?: boolean;
  onClose: () => void;
  onSettingsUpdated?: (newSettings: PaymentSettings) => void;
}

export const PaymentDonationModal: React.FC<PaymentDonationModalProps> = ({
  isOpen,
  settings,
  onClose,
}) => {
  if (!isOpen) return null;

  // SĐT MoMo của tác giả: 0981083304
  const momoNumber = settings.momoPhone || '0981083304';
  const qrImage =
    settings.momoQrUrl ||
    `https://api.qrserver.com/v1/create-qr-code/?size=700x700&data=2|99|${momoNumber}|||0|0|0|Ung%20ho%20tac%20gia|transfer_myqr`;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-slate-950/95 border border-white/10 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col items-center justify-center max-w-[95vw] max-h-[92vh] animate-pop-in cursor-default"
      >
        {/* Nút đóng góc phải */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-white p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 transition-colors cursor-pointer z-10"
          title="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ẢNH QR TO (BỎ SAO CHÉP) */}
        <div className="relative bg-white p-3 sm:p-4 rounded-2xl shadow-2xl">
          <img
            src={qrImage}
            alt="MoMo QR"
            className="w-72 h-72 sm:w-96 sm:h-96 md:w-[420px] md:h-[420px] object-contain rounded-xl"
          />
        </div>

        {/* DÒNG CHỮ NHỎ: gay có thể bỏ qua donate */}
        <p className="text-[11px] sm:text-xs text-slate-400 font-mono italic mt-3 tracking-wide text-center">
          gay có thể bỏ qua donate
        </p>
      </div>
    </div>
  );
};
