import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  FolderOpen,
  Volume2,
  VolumeX,
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
  subscribeToMusicSettings,
  subscribeToPaymentSettings,
  subscribeToSocialLinks,
  type BackgroundSettings,
  type TrackItem,
  type PaymentSettings,
  DEFAULT_PAYMENT_SETTINGS,
} from './firebase';

// Danh sách nhạc mặc định trực tiếp không bị chặn CORS
const DEFAULT_TRACKS: TrackItem[] = [
  {
    id: 'default-1',
    title: 'Cyber Beats Relax',
    artist: 'Lofi Chill',
    url: 'https://actions.google.com/sounds/v1/science_fiction/alien_hum.ogg',
  },
  {
    id: 'default-2',
    title: 'Night Synthwave',
    artist: 'Gaming Lounge',
    url: 'https://actions.google.com/sounds/v1/science_fiction/teleport.ogg',
  },
  {
    id: 'default-3',
    title: 'Ambient Relaxing',
    artist: 'Chill Beats',
    url: 'https://actions.google.com/sounds/v1/water/creek_water_flowing.ogg',
  },
];

export default function App() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Màn hình chào
  const [hasEntered, setHasEntered] = useState(false);
  const [isCurtainLifting, setIsCurtainLifting] = useState(false);

  // Trạng thái phát nhạc
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);

  // Header Logo state
  const [headerLogoUrl, setHeaderLogoUrl] = useState<string>('');

  // Background Settings state
  const [backgroundSettings, setBackgroundSettings] = useState<BackgroundSettings>({
    mediaType: 'video',
    videoUrl: '',
    imageUrl: '',
    brightness: 0.45,
    blur: 0,
  });

  // Music Playlist state
  const [musicPlaylist, setMusicPlaylist] = useState<TrackItem[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Payment / MoMo QR Settings
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(DEFAULT_PAYMENT_SETTINGS);
  const [donationApp, setDonationApp] = useState<AppItem | null>(null);

  // Social Links state
  const [socials, setSocials] = useState<SocialLinks>({
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Đã sao chép ${label}: ${text}`);
  };

  const activePlaylist = musicPlaylist.length > 0 ? musicPlaylist : DEFAULT_TRACKS;
  const currentTrackUrl = activePlaylist[currentTrackIndex]?.url || DEFAULT_TRACKS[0].url;

  // PHÁT NHẠC
  const playAudioSafe = () => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    audio.volume = 0.8;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlayingMusic(true);
        })
        .catch((err) => {
          console.warn('Lỗi phát nhạc:', err);
          if (activePlaylist.length > 1) {
            const nextIdx = (currentTrackIndex + 1) % activePlaylist.length;
            setCurrentTrackIndex(nextIdx);
          }
        });
    }
  };

  // VÉN MÀN VÀ TỰ ĐỘNG PHÁT NHẠC
  const handleEnterSite = () => {
    if (isCurtainLifting || hasEntered) return;
    setIsCurtainLifting(true);

    playAudioSafe();

    setTimeout(() => {
      setHasEntered(true);
    }, 1200);
  };

  // BẬT TẮT NHẠC THỦ CÔNG
  const toggleMusic = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    const audio = audioRef.current;

    if (isPlayingMusic) {
      audio.pause();
      setIsPlayingMusic(false);
    } else {
      playAudioSafe();
    }
  };

  // REST fetch đọc trực tiếp từ server (db.json)
  const fetchAppsFromApi = async () => {
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
      console.warn('API fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppsFromApi();
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = subscribeToApps(
        (items) => {
          if (items && items.length > 0) {
            setApps(items);
          }
          setIsLoading(false);
        },
        () => fetchAppsFromApi()
      );
    } catch {
      fetchAppsFromApi();
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    const unsub = subscribeToSiteSettings((settings) => {
      setHeaderLogoUrl(settings.headerLogoUrl || '');
    });
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeToBackgroundSettings((settings) => {
      if (settings) setBackgroundSettings(settings);
    });
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeToMusicSettings((settings) => {
      if (settings && Array.isArray(settings.tracks)) {
        setMusicPlaylist(settings.tracks);
      }
    });
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeToPaymentSettings((settings) => {
      if (settings) setPaymentSettings(settings);
    });
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeToSocialLinks((data) => {
      if (data && Object.keys(data).length > 0) {
        setSocials((prev) => ({
          discord: data.discord || prev.discord,
          tiktok: data.tiktok || prev.tiktok,
          youtube: data.youtube || prev.youtube,
          instagram: (data as any).instagram || (data as any).telegram || prev.instagram,
        }));
      }
    });
    return () => unsub && unsub();
  }, []);

  const sortedApps = useMemo(() => {
    const list = [...apps];
    list.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    return list;
  }, [apps]);

  // XỬ LÝ DOWNLOAD: Trỏ thẳng ra link trực tiếp để trình duyệt tự tải
  const handleDownload = async (app: AppItem) => {
    try {
      const isWin = app.platform === 'windows' || app.fileExtension === '.exe';
      
      // 1. Tăng số lượt tải ảo trên UI ngay lập tức
      setApps((prev) =>
        prev.map((item) =>
          item.id === app.id
            ? { ...item, downloadsCount: Math.max(8, item.downloadsCount ?? 8) + 1 }
            : item
        )
      );
      
      // 2. Gửi API đếm lượt tải
      incrementFirestoreDownload(app.id).catch(() => {});
      fetch(`/api/apps/${app.id}/download`, { method: 'POST' }).catch(() => {});

      // 3. Xử lý đường dẫn file (Ép ra link trực tiếp ví dụ: https://.../uploads/Mic93.exe)
      let targetUrl = app.downloadUrl;
      if (!targetUrl) {
        targetUrl = `/uploads/${app.filename || 'Mic93.exe'}`;
      }
      
      if (targetUrl.startsWith('/uploads/')) {
        targetUrl = window.location.origin + targetUrl; 
      } else if (!targetUrl.startsWith('http')) {
        targetUrl = window.location.origin + `/api/apps/${app.id}/download-file`;
      }

      // 4. Mở thẳng link tải bằng một tab mới
      // Trình duyệt sẽ thấy đuôi file và tự động tải về, giữ nguyên trang web hiện tại
      window.open(targetUrl, '_blank');

      // 5. Mở popup Donate nếu là app Windows
      if (isWin) {
        setDonationApp(app);
      }
    } catch (err) {
      console.error('Lỗi khi tải:', err);
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

      {/* Audio phát ngầm */}
      <audio
        ref={audioRef}
        src={currentTrackUrl}
        preload="auto"
        loop={activePlaylist.length <= 1}
        onEnded={() => {
          if (activePlaylist.length > 1) {
            const nextIdx = (currentTrackIndex + 1) % activePlaylist.length;
            setCurrentTrackIndex(nextIdx);
            if (audioRef.current) {
              audioRef.current.src = activePlaylist[nextIdx].url;
              audioRef.current.play().catch(() => {});
            }
          }
        }}
        onError={() => {
          if (activePlaylist.length > 1) {
            const nextIdx = (currentTrackIndex + 1) % activePlaylist.length;
            setCurrentTrackIndex(nextIdx);
          }
        }}
        className="hidden"
      />

      {/* MÀN CHÀO: HIỆU ỨNG VÉN MƯỢT MÀ, THÊM HOVER 3D ĐẸP MẮT */}
      {!hasEntered && (
        <div
          onClick={handleEnterSite}
          className={`fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isCurtainLifting
              ? '-translate-y-full opacity-0 scale-105 pointer-events-none'
              : 'translate-y-0 opacity-100 scale-100'
          }`}
          title="Nhấp để vào trang web"
        >
          <div className="relative group p-6 flex flex-col items-center justify-center perspective-[1000px]">
            <img
              src={headerLogoUrl || '/sephoang93-logo.svg'}
              alt="Logo"
              className="max-h-28 sm:max-h-40 w-auto object-contain filter drop-shadow-[0_0_35px_rgba(56,189,248,0.5)] mix-blend-screen transition-all duration-700 ease-out group-hover:scale-110 group-hover:rotate-y-[15deg] group-hover:drop-shadow-[0_0_50px_rgba(56,189,248,0.8)]"
              style={{ mixBlendMode: 'screen' }}
            />
            {/* Lớp nhấp nháy phát sáng nhẹ dưới logo khi hover */}
            <div className="absolute inset-0 bg-cyan-500/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-full w-full h-1/2 mt-auto"></div>
          </div>
        </div>
      )}

      {/* NÚT TẮT / BẬT NHẠC (THÊM HIỆU ỨNG TRỎ VÀO CỰC ĐẸP) */}
      <button
        type="button"
        onClick={toggleMusic}
        className="fixed bottom-6 left-6 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-black/60 hover:bg-black/90 backdrop-blur-xl border border-purple-500/40 hover:border-purple-400 flex items-center justify-center text-[#d946ef] hover:text-[#f0abfc] shadow-[0_0_20px_rgba(217,70,239,0.35)] hover:shadow-[0_0_30px_rgba(217,70,239,0.6)] hover:scale-110 transition-all duration-300 ease-out active:scale-95 cursor-pointer"
        title={isPlayingMusic ? 'Tắt nhạc' : 'Bật nhạc'}
      >
        {isPlayingMusic ? (
          <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2] animate-pulse" />
        ) : (
          <VolumeX className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2] opacity-60" />
        )}
      </button>

      {/* Toast Feedback */}
      {toast && (
        <div className="fixed bottom-6 left-24 z-50 flex items-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.5)] font-semibold text-xs animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4" />
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
            <p className="text-sm">Đang tải danh sách ứng dụng...</p>
          </div>
        ) : apps.length === 0 ? (
          <div className="py-20 text-center">
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center mx-auto shadow-inner hover:scale-105 transition-transform">
                <FolderOpen className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Chưa có ứng dụng nào
              </h2>
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

        {/* Social Links */}
        <SocialLinksBar
          isAdminMod={false}
          socials={socials}
          onUpdateSocials={(newSocials) => setSocials(newSocials)}
        />

        {/* CÁC NÚT LIÊN HỆ DƯỚI CÙNG (CÓ HIỆU ỨNG HOVER NỔI BẬT) */}
        <div className="pb-14 pt-4 flex flex-row flex-wrap items-center justify-center gap-3 sm:gap-5 text-xs sm:text-sm font-mono tracking-wider text-slate-300">
          
          {/* Telegram */}
          <div
            onClick={() => handleCopyText('hoanganhhentai', 'Telegram')}
            className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/90 border border-slate-800/50 hover:border-cyan-500/50 hover:-translate-y-1.5 hover:shadow-[0_8px_20px_rgba(34,211,238,0.25)] transition-all duration-300 cursor-pointer backdrop-blur-sm"
            title="Nhấp để sao chép Telegram"
          >
            <span className="font-bold text-slate-400 group-hover:text-cyan-400 transition-colors">TELEGRAM:</span>
            <span className="text-slate-200 group-hover:text-white transition-colors">hoanganhhentai</span>
          </div>
          
          {/* Discord */}
          <div
            onClick={() => handleCopyText('hoanganhkute304', 'Discord')}
            className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/90 border border-slate-800/50 hover:border-indigo-500/50 hover:-translate-y-1.5 hover:shadow-[0_8px_20px_rgba(99,102,241,0.25)] transition-all duration-300 cursor-pointer backdrop-blur-sm"
            title="Nhấp để sao chép Discord"
          >
            <span className="font-bold text-slate-400 group-hover:text-indigo-400 transition-colors">DISCORD:</span>
            <span className="text-slate-200 group-hover:text-white transition-colors">hoanganhkute304</span>
          </div>
          
          {/* Gmail */}
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
            console.warn('Save to firestore error:', e);
          }
          showToast(`Đã lưu ${newApp.name}!`, 'success');
        }}
      />
    </div>
  );
}