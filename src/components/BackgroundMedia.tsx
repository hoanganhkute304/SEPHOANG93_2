import React from 'react';
import type { BackgroundSettings } from '../firebase';

interface Props {
  settings: BackgroundSettings;
}

export const BackgroundMedia: React.FC<Props> = ({ settings }) => {
  const {
    mediaType = 'image',
    videoUrl,
    imageUrl,
    brightness = 0.45,
    blur = 0,
    positionX = 50,
    positionY = 50,
    scale = 1.05,
    fitMode = 'cover',
    contrast = 1.1,
    overlayOpacity = 0.75,
  } = settings;

  const styleFilter: React.CSSProperties = {
    filter: `brightness(${brightness}) blur(${blur}px) contrast(${contrast})`,
    transform: `scale(${scale})`,
    objectPosition: `${positionX}% ${positionY}%`,
    objectFit: fitMode,
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-slate-950">
      {mediaType === 'video' && videoUrl ? (
        <video
          src={videoUrl}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full transition-all duration-700 ease-out"
          style={styleFilter}
        />
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt="Site Background"
          className="w-full h-full transition-all duration-700 ease-out"
          style={styleFilter}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40" />
      )}

      {/* Lớp phủ tối mờ (Overlay) dựa theo overlayOpacity trên Firebase */}
      <div
        className="absolute inset-0 bg-slate-950 transition-opacity duration-500"
        style={{ opacity: overlayOpacity }}
      />
    </div>
  );
};