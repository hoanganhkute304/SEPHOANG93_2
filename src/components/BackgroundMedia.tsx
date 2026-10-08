import React, { useState } from 'react';
import type { BackgroundSettings } from '../firebase';

interface BackgroundMediaProps {
  settings?: BackgroundSettings;
}

export const BackgroundMedia: React.FC<BackgroundMediaProps> = ({ settings }) => {
  const [videoLoaded, setVideoLoaded] = useState(false);

  const mediaType = settings?.mediaType || 'video';
  const customVideoUrl = settings?.videoUrl?.trim();
  const customImageUrl = settings?.imageUrl?.trim();
  const brightness = settings?.brightness !== undefined ? settings.brightness : 0.45;
  const blur = settings?.blur || 0;

  // Default high quality dark cyber ambient video background loop
  const defaultVideo =
    'https://assets.mixkit.co/videos/preview/mixkit-circuit-board-with-moving-lights-42526-large.mp4';
  const activeVideo = customVideoUrl || defaultVideo;

  // Default cyber gaming wallpaper fallback
  const defaultImage =
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop';
  const activeImage = customImageUrl || defaultImage;

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
      {/* 1. Base Image Layer (luôn sẵn sàng, tải ngay) */}
      <img
        src={activeImage}
        alt="Background"
        style={{
          filter: `brightness(${brightness}) contrast(1.2) blur(${blur}px)`,
        }}
        className="absolute inset-0 w-full h-full object-cover scale-105 transition-all duration-700"
      />

      {/* 2. Video Layer (nếu mediaType là 'video') */}
      {mediaType === 'video' && (
        <video
          key={activeVideo}
          autoPlay
          loop
          muted
          playsInline
          onCanPlay={() => setVideoLoaded(true)}
          style={{
            filter: `brightness(${brightness}) contrast(1.2) blur(${blur}px)`,
          }}
          className={`absolute inset-0 w-full h-full object-cover scale-105 transition-opacity duration-1000 ${
            videoLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <source src={activeVideo} type="video/mp4" />
        </video>
      )}

      {/* Dark Cinematic Gradient Overlay để đảm bảo nội dung và ứng dụng luôn dễ nhìn */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-950/70 to-slate-950/95 backdrop-blur-[1px]" />
    </div>
  );
};
