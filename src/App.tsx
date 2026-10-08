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

  // XỬ LÝ DOWNLOAD: Tải ngầm không làm reload trang
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

      // 3. Xử lý đường dẫn file
      let targetUrl = app.downloadUrl;
      if (targetUrl.startsWith('/uploads/')) {
        targetUrl = window.location.origin + targetUrl; 
      } else if (!targetUrl.startsWith('http')) {
        targetUrl = window.location.origin + `/api/apps/${app.id}/download-file`;
      }

      // 4. Tạo thẻ <a> ẩn có target="_blank" để tải file ngầm (KHÔNG RELOAD TRANG)
      const link = document.createElement('a');
      link.href = targetUrl;
      link.target = '_blank'; // Quan trọng: Mở tiến trình tải ở tab/nền khác
      link.setAttribute('download', app.filename || `${app.name}${app.fileExtension || (isWin ? '.exe' : '.apk')}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 5. Mở popup Donate nếu là app Windows
      if (isWin) {
        setDonationApp(app);
      }
    } catch {
      window.open(app.downloadUrl, '_blank');
      if (app.platform === 'windows' || app.fileExtension === '.exe') {
        setDonationApp(app);
      }
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

      {/* MÀN CHÀO: HIỆU ỨNG VÉN MƯỢT MÀ */}
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
          <div className="relative group p-6 flex flex-col items-center justify-center">
            <img
              src={headerLogoUrl || '/sephoang93-logo.svg'}
              alt="Logo"
              className="max-h-28 sm:max-h-40 w-auto object-contain filter drop-shadow-[0_0_35px_rgba(56,189,248,0.5)] mix-blend-screen transition-transform duration-700 group-hover:scale-105"
              style={{ mixBlendMode: 'screen' }}
            />
          </div>
        </div>
      )}

      {/* NÚT TẮT / BẬT NHẠC */}
      <button
        type="button"
        onClick={toggleMusic}
        className="fixed bottom-6 left-6 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-black/60 hover:bg-black/80 backdrop-blur-xl border border-purple-500/40 hover:border-purple-500/80 flex items-center justify-center text-[#d946ef] hover:text-[#f0abfc] shadow-[0_0_20px_rgba(217,70,239,0.35)] transition-all transform active:scale-90 cursor-pointer"
        title={isPlayingMusic ? 'Tắt nhạc' : 'Bật nhạc'}
      >
        {isPlayingMusic ? (
          <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
        ) : (
          <VolumeX className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2] opacity-60" />
        )}
      </button>

      {/* Toast Feedback */}
      {toast && (
        <div className="fixed bottom-6 left-20 z-50 flex items-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-2xl shadow-2xl font-semibold text-xs animate-in slide-in-from-bottom duration-200">
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
              <div className="w-16 h-16 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
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

        {/* Contact info bar */}
        <div className="pb-14 pt-2 flex flex-row flex-wrap items-center justify-center gap-4 sm:gap-8 md:gap-10 text-xs sm:text-sm font-mono tracking-wider text-slate-300 select-text">
          <div
            onClick={() => handleCopyText('hoanganhhentai', 'Telegram')}
            className="hover:text-cyan-400 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Nhấp để sao chép Telegram: hoanganhhentai"
          >
            <span className="font-bold text-slate-400">TELEGRAM:</span>
            <span className="text-slate-200 hover:underline">hoanganhhentai</span>
          </div>
          <span className="text-slate-600 hidden sm:inline select-none">•</span>
          <div
            onClick={() => handleCopyText('hoanganhkute304', 'Discord')}
            className="hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Nhấp để sao chép Discord: hoanganhkute304"
          >
            <span className="font-bold text-slate-400">DISCORD:</span>
            <span className="text-slate-200 hover:underline">hoanganhkute304</span>
          </div>
          <span className="text-slate-600 hidden sm:inline select-none">•</span>
          <div
            onClick={() => handleCopyText('hoanganh3042003@gmail.com', 'Gmail')}
            className="hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Nhấp để sao chép Gmail: hoanganh3042003@gmail.com"
          >
            <span className="font-bold text-slate-400">GMAIL:</span>
            <span className="text-slate-200 hover:underline">hoanganh3042003@gmail.com</span>
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