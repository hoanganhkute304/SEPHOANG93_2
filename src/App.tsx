import React, { useEffect, useState, useMemo } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  FolderOpen,
  AlertCircle,
} from 'lucide-react';
import type { AppItem } from './types';
import { Navbar } from './components/Navbar';
import { AppCard } from './components/AppCard';
import { AppDetailModal } from './components/AppDetailModal';
import { UploadModal } from './components/UploadModal';
import { QrModal } from './components/QrModal';
import { BackgroundMedia } from './components/BackgroundMedia';
import { PaymentDonationModal } from './components/PaymentDonationModal';
import { SocialLinksBar, type SocialLinks } from './components/SocialLinksBar';
import {
  subscribeToApps,
  saveAppToFirestore,
  incrementFirestoreDownload,
  deleteAppFromFirestore,
  subscribeToSiteSettings,
  subscribeToBackgroundSettings,
  subscribeToPaymentSettings,
  subscribeToSocialLinks,
  type BackgroundSettings,
  type PaymentSettings,
  DEFAULT_PAYMENT_SETTINGS,
} from './firebase';

export default function App() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Header Logo state
  const [headerLogoUrl, setHeaderLogoUrl] = useState<string>('');

  // Background Settings state (Nhận trực tiếp từ Firestore)
  const [backgroundSettings, setBackgroundSettings] = useState<BackgroundSettings>({
    mediaType: 'image',
    videoUrl: '',
    imageUrl: '',
    brightness: 0.45,
    blur: 0,
    positionX: 50,
    positionY: 50,
    scale: 1.05,
    fitMode: 'cover',
    contrast: 1.1,
    overlayOpacity: 0.75,
  });

  // Payment / MoMo QR Settings
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [donationApp, setDonationApp] = useState<AppItem | null>(null);

  // Social Links state
  const [socials, setSocials] = useState<SocialLinks>({
    facebook: '',
    discord: 'https://discord.gg',
    tiktok: 'https://tiktok.com',
    youtube: 'https://youtube.com',
    instagram: 'https://instagram.com',
  });

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [detailApp, setDetailApp] = useState<AppItem | null>(null);
  const [qrApp, setQrApp] = useState<AppItem | null>(null);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Đã sao chép ${label}: ${text}`);
  };

  // Hàm dự phòng đọc dữ liệu từ db.json chỉ khi Firebase rỗng hoặc lỗi mạng
  const fetchAppsFallback = async () => {
    try {
      const res = await fetch('/api/apps');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const mapped = data.data.map((a: AppItem) => ({
          ...a,
          downloadsCount: typeof a.downloadsCount === 'number' ? Math.max(8, a.downloadsCount) : 8,
        }));
        setApps(mapped);
      }
    } catch (err) {
      console.warn('API local fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Lắng nghe trực tiếp Firestore (BỎ fetch API trước để không bị nháy giao diện cũ)
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeToApps(
        (items) => {
          if (items && items.length > 0) {
            setApps(items);
          } else {
            fetchAppsFallback();
          }
          setIsLoading(false);
        },
        (error) => {
          console.warn('Lỗi Firestore apps, chuyển sang API local:', error);
          fetchAppsFallback();
        }
      );
    } catch {
      fetchAppsFallback();
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // 2. Lắng nghe cấu hình Logo
  useEffect(() => {
    const unsub = subscribeToSiteSettings((settings) => {
      if (settings?.headerLogoUrl) {
        setHeaderLogoUrl(settings.headerLogoUrl);
      }
    });
    return () => unsub && unsub();
  }, []);

  // 3. Lắng nghe cấu hình Ảnh/Video nền
  useEffect(() => {
    const unsub = subscribeToBackgroundSettings((settings) => {
      if (settings) {
        setBackgroundSettings((prev) => ({ ...prev, ...settings }));
      }
    });
    return () => unsub && unsub();
  }, []);

  // 4. Lắng nghe cấu hình MoMo
  useEffect(() => {
    const unsub = subscribeToPaymentSettings((settings) => {
      if (settings) {
        setPaymentSettings(settings);
      }
    });
    return () => unsub && unsub();
  }, []);

  // 5. Lắng nghe liên kết mạng xã hội
  useEffect(() => {
    const unsub = subscribeToSocialLinks((data) => {
      if (data && Object.keys(data).length > 0) {
        setSocials((prev) => ({
          ...prev,
          ...data,
        }));
      }
    });
    return () => unsub && unsub();
  }, []);

  // Sắp xếp: Ghim lên đầu -> sortOrder tăng dần -> ngày tạo mới nhất
  const sortedApps = useMemo(() => {
    const list = [...apps];
    list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : 9999;
      const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : 9999;
      if (orderA !== orderB) return orderA - orderB;

      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
    return list;
  }, [apps]);

  // Xử lý nút tải
  const handleDownload = async (app: AppItem) => {
    try {
      if (app.status === 'update') {
        showToast(`Ứng dụng "${app.name}" đang bảo trì cập nhật!`, 'warning');
        return;
      }
      if (app.status === 'coming') {
        showToast(`Ứng dụng "${app.name}" sắp ra mắt, vui lòng quay lại sau!`, 'info');
        return;
      }

      const isWin = app.platform === 'windows' || app.fileExtension === '.exe';

      setApps((prev) =>
        prev.map((item) =>
          item.id === app.id
            ? { ...item, downloadsCount: Math.max(8, item.downloadsCount ?? 8) + 1 }
            : item
        )
      );

      incrementFirestoreDownload(app.id).catch(() => {});
      fetch(`/api/apps/${app.id}/download`, { method: 'POST' }).catch(() => {});

      let targetUrl = app.downloadUrl || '/uploads/Mic93.exe';
      if (!targetUrl.startsWith('http')) {
        targetUrl = window.location.origin + (targetUrl.startsWith('/') ? '' : '/') + targetUrl;
      }

      const link = document.createElement('a');
      link.href = targetUrl;
      link.setAttribute('download', app.filename || (isWin ? 'Mic93.exe' : `${app.name}${app.fileExtension || ''}`));
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (isWin) {
        setDonationApp(app);
      }
    } catch (err) {
      console.error('Lỗi khi tải file:', err);
    }
  };

  const handleDeleteApp = async (id: string) => {
    try {
      setApps((prev) => prev.filter((a) => a.id !== id));
      await deleteAppFromFirestore(id);
      await fetch(`/api/apps/${id}`, { method: 'DELETE' }).catch(() => {});
      showToast('Đã xóa phần mềm', 'info');
    } catch (err) {
      console.error('Lỗi xóa phần mềm:', err);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-500 selection:text-white">
      {/* Background Media */}
      <BackgroundMedia settings={backgroundSettings} />

      {/* Toast Feedback */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-10 z-50 flex items-center gap-2 text-white px-5 py-3 rounded-2xl shadow-2xl font-semibold text-sm animate-in slide-in-from-bottom duration-200 ${
            toast.type === 'warning'
              ? 'bg-amber-600 shadow-[0_0_20px_rgba(217,119,6,0.5)]'
              : toast.type === 'info'
              ? 'bg-purple-600 shadow-[0_0_20px_rgba(147,51,234,0.5)]'
              : 'bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.5)]'
          }`}
        >
          {toast.type === 'warning' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Navbar */}
      <Navbar headerLogoUrl={headerLogoUrl} />

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        {isLoading ? (
          <div className="py-24 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-500" />
            <p className="text-sm">Đang tải dữ liệu...</p>
          </div>
        ) : apps.length === 0 ? (
          <div className="py-20 text-center">
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center mx-auto shadow-inner hover:scale-105 transition-transform">
                <FolderOpen className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">Chưa có ứng dụng nào</h2>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedApps.map((app, idx) => (
              <AppCard
                key={app.id}
                app={app}
                isAdminMod={false}
                animationDelay={`${Math.min(idx * 0.08, 0.6)}s`}
                onOpenDetail={(a) => setDetailApp(a)}
                onOpenQr={(a) => setQrApp(a)}
                onDownload={handleDownload}
                onDelete={(a) => handleDeleteApp(a.id)}
                onOpenDonation={(a) => setDonationApp(a)}
              />
            ))}
          </div>
        )}

        {/* Thanh liên kết mạng xã hội */}
        <SocialLinksBar
          isAdminMod={false}
          socials={socials}
          onUpdateSocials={(newSocials) => setSocials((prev) => ({ ...prev, ...newSocials }))}
        />

        {/* Các nút liên hệ */}
        <div className="pb-14 pt-4 flex flex-row flex-wrap items-center justify-center gap-3 sm:gap-5 text-xs sm:text-sm font-mono tracking-wider text-slate-300">
          <div
            onClick={() => handleCopyText('SEPHOANG #VN2', 'Ingame')}
            className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/90 border border-slate-800/50 hover:border-emerald-500/50 hover:-translate-y-1.5 hover:shadow-[0_8px_20px_rgba(16,185,129,0.25)] transition-all duration-300 cursor-pointer backdrop-blur-sm"
            title="Nhấp để sao chép Ingame"
          >
            <span className="font-bold text-slate-400 group-hover:text-emerald-400 transition-colors">INGAME:</span>
            <span className="text-slate-200 group-hover:text-white transition-colors">SEPHOANG #VN2</span>
          </div>

          <div
            onClick={() => handleCopyText('hoanganhhentai', 'Telegram')}
            className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/90 border border-slate-800/50 hover:border-cyan-500/50 hover:-translate-y-1.5 hover:shadow-[0_8px_20px_rgba(34,211,238,0.25)] transition-all duration-300 cursor-pointer backdrop-blur-sm"
            title="Nhấp để sao chép Telegram"
          >
            <span className="font-bold text-slate-400 group-hover:text-cyan-400 transition-colors">TELEGRAM:</span>
            <span className="text-slate-200 group-hover:text-white transition-colors">hoanganhhentai</span>
          </div>

          <div
            onClick={() => handleCopyText('hoanganhkute304', 'Discord')}
            className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/90 border border-slate-800/50 hover:border-indigo-500/50 hover:-translate-y-1.5 hover:shadow-[0_8px_20px_rgba(99,102,241,0.25)] transition-all duration-300 cursor-pointer backdrop-blur-sm"
            title="Nhấp để sao chép Discord"
          >
            <span className="font-bold text-slate-400 group-hover:text-indigo-400 transition-colors">DISCORD:</span>
            <span className="text-slate-200 group-hover:text-white transition-colors">hoanganhkute304</span>
          </div>

          <div
            onClick={() => handleCopyText('hoanganh3042003@gmail.com', 'Gmail')}
            className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/90 border border-slate-800/50 hover:border-rose-500/50 hover:-translate-y-1.5 hover:shadow-[0_8px_20px_rgba(244,63,94,0.25)] transition-all duration-300 cursor-pointer backdrop-blur-sm"
            title="Nhấp để sao chép Gmail"
          >
            <span className="font-bold text-slate-400 group-hover:text-rose-400 transition-colors">GMAIL:</span>
            <span className="text-slate-200 group-hover:text-white transition-colors">hoanganh3042003@gmail.com</span>
          </div>
        </div>
      </main>

      {/* Modals */}
      <PaymentDonationModal
        isOpen={!!donationApp}
        app={donationApp}
        settings={paymentSettings}
        isAdminMod={false}
        onClose={() => setDonationApp(null)}
      />

      <AppDetailModal
        app={detailApp}
        isAdminMod={false}
        onClose={() => setDetailApp(null)}
        onDownload={handleDownload}
        onOpenQr={(a) => setQrApp(a)}
        onDelete={handleDeleteApp}
        onOpenDonation={(a) => setDonationApp(a)}
      />

      <QrModal app={qrApp} onClose={() => setQrApp(null)} />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onAppCreated={async (newApp) => {
          try {
            await saveAppToFirestore(newApp);
          } catch (e) {
            console.warn('Lỗi lưu Firestore:', e);
          }
          showToast(`Đã lưu ${newApp.name}!`, 'success');
        }}
      />
    </div>
  );
}