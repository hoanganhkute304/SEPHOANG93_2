import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, ShieldCheck, Download, Settings, Play } from 'lucide-react';

export const AndroidInstallGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full bg-slate-900/50 border border-slate-800/80 rounded-2xl overflow-hidden transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-900/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">
              Hướng dẫn cài đặt file APK trên điện thoại Android
            </h4>
            <p className="text-xs text-slate-400">
              Chỉ mất 30 giây để cài đặt file APK tải về từ kho lưu trữ
            </p>
          </div>
        </div>
        <div className="text-slate-400">
          {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-2 border-t border-slate-800/60 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3.5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs">
                1
              </span>
              <Download className="w-4 h-4" />
              <span>Tải file APK về máy</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Nhấn nút <b>"Tải về APK"</b> hoặc quét mã QR bằng camera. Trình duyệt có thể hỏi xác nhận, hãy chọn <b>"Vẫn tải xuống"</b>.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3.5">
            <div className="flex items-center gap-2 text-teal-400 font-semibold mb-1.5">
              <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center text-xs">
                2
              </span>
              <Settings className="w-4 h-4" />
              <span>Cho phép nguồn này</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Khi mở file, nếu máy báo "Bảo mật", vào <b>Cài đặt</b> &gt; Bật công tắc <b>"Cho phép cài đặt từ nguồn này"</b> (Chrome/Zalo/Tệp tin).
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3.5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs">
                3
              </span>
              <Play className="w-4 h-4" />
              <span>Cài đặt & Thưởng thức</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Nhấn <b>"Cài đặt"</b> (Install). Sau khi hoàn tất bấm <b>"Mở"</b> để sử dụng app Android ngay lập tức!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
