import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, QrCode as QrIcon, Smartphone, Download, ExternalLink, Check, Copy } from 'lucide-react';
import type { AppItem } from '../types';

interface QrModalProps {
  app: AppItem | null;
  onClose: () => void;
}

export const QrModal: React.FC<QrModalProps> = ({ app, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!app) return;

    // Build the direct download or app page URL
    const baseUrl = window.location.origin;
    const downloadTarget = app.downloadUrl.startsWith('http')
      ? app.downloadUrl
      : `${baseUrl}/api/apps/${app.id}/download-file`;

    QRCode.toDataURL(downloadTarget, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR code gen error:', err));
  }, [app]);

  if (!app) return null;

  const downloadTarget = app.downloadUrl.startsWith('http')
    ? app.downloadUrl
    : `${window.location.origin}/api/apps/${app.id}/download-file`;

  const handleCopy = () => {
    navigator.clipboard.writeText(downloadTarget);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-center">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center mb-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
            <QrIcon className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Quét QR Tải Về Điện Thoại</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Dùng Camera hoặc Zalo/Google Lens trên Android để quét tải nhanh
          </p>
        </div>

        {/* QR Display */}
        <div className="bg-white p-4 rounded-xl inline-block shadow-inner mx-auto mb-4 border border-slate-200">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`QR Code ${app.name}`} className="w-56 h-56 mx-auto" />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-sm">
              Đang tạo mã QR...
            </div>
          )}
        </div>

        {/* App Info pill */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-left mb-4 flex items-center gap-3">
          <img
            src={app.iconUrl}
            alt={app.name}
            className="w-10 h-10 rounded-xl object-cover border border-slate-800 bg-slate-800"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80';
            }}
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">{app.name}</h4>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-emerald-400 font-mono">{app.version}</span>
              <span>•</span>
              <span>{app.fileSize}</span>
            </div>
          </div>
        </div>

        {/* Copy Link button */}
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Đã sao chép link' : 'Sao chép link tải'}
          </button>
          <a
            href={downloadTarget}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Tải trực tiếp
          </a>
        </div>
      </div>
    </div>
  );
};
