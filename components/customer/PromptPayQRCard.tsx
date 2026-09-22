'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { generatePromptPayPayload } from '@/lib/payments/promptpay';

interface PromptPayQRCardProps {
  amount: number;
  orderNumber?: string;
  promptpayId?: string;
  accountName?: string;
  bankName?: string;
  showDetails?: boolean;
}

export function PromptPayQRCard({
  amount,
  orderNumber,
  promptpayId = '0988251064',
  accountName = 'ศักดาวิชญ์ คำใจ',
  bankName = 'พร้อมเพย์',
  showDetails = true,
}: PromptPayQRCardProps) {
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const targetAccount = (promptpayId && promptpayId.trim().length > 0 ? promptpayId : '0988251064').trim();
  const targetName = accountName || 'ศักดาวิชญ์ คำใจ';
  const targetBank = bankName || 'พร้อมเพย์';

  useEffect(() => {
    let cancelled = false;
    setError(null);

    async function generate() {
      try {
        const payload = generatePromptPayPayload(targetAccount, amount);
        if (!payload || !payload.startsWith('000201')) {
          throw new Error('ไม่สามารถสร้างรหัส PromptPay Payload ได้');
        }

        const url = await QRCode.toDataURL(payload, {
          width: 360,
          margin: 2,
          errorCorrectionLevel: 'H',
          color: {
            dark: '#0369a1', // Sky-700
            light: '#ffffff',
          },
        });

        if (!cancelled) {
          setQrImageUrl(url);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('PromptPay QR generation error:', err);
          setError(err instanceof Error ? err.message : 'ไม่สามารถสร้าง QR Code ได้');
        }
      }
    }

    void generate();

    return () => {
      cancelled = true;
    };
  }, [amount, targetAccount]);

  function downloadQr() {
    if (!qrImageUrl) return;
    const a = document.createElement('a');
    a.href = qrImageUrl;
    a.download = `NayMos-QR-${orderNumber || 'pay'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-white border border-sky-100 shadow-sm w-full max-w-[340px] mx-auto select-none">
      {/* Header instruction */}
      <div className="w-full text-center mb-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-800 text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
          สแกน QR Code เพื่อชำระเงิน
        </span>
      </div>

      {/* QR Container */}
      <div className="relative p-2.5 bg-white rounded-2xl border-2 border-sky-300 shadow-xs flex flex-col items-center">
        {qrImageUrl ? (
          <div className="relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrImageUrl}
              alt="สแกน QR Code เพื่อชำระเงิน"
              className="w-56 h-56 sm:w-60 sm:h-60 object-contain rounded-xl bg-white"
            />
          </div>
        ) : error ? (
          <div className="w-56 h-56 sm:w-60 sm:h-60 flex flex-col items-center justify-center text-rose-500 gap-2 bg-rose-50/50 rounded-xl border border-rose-100 p-4 text-center">
            <AlertTriangle className="h-7 w-7 text-rose-500" />
            <span className="text-xs font-medium">{error}</span>
          </div>
        ) : (
          <div className="w-56 h-56 sm:w-60 sm:h-60 flex flex-col items-center justify-center text-slate-400 gap-2 bg-sky-50/50 rounded-xl border border-sky-100">
            <Loader2 className="h-7 w-7 animate-spin text-sky-500" />
            <span className="text-xs font-medium">กำลังโหลด QR Code...</span>
          </div>
        )}

        {/* Clean watermark banner below QR canvas */}
        <div className="mt-2 text-center px-2 py-1 bg-sky-50/80 rounded-lg border border-sky-100 w-full max-w-[240px]">
          <p className="text-[10px] text-sky-800 font-bold leading-tight">
            QR นี้สำหรับชำระเงินให้ NayMosGameShop เท่านั้น
          </p>
          <p className="text-[9px] text-sky-600 font-medium">
            โปรดตรวจสอบชื่อบัญชีก่อนโอนทุกครั้ง
          </p>
        </div>
      </div>

      {showDetails && (
        <div className="w-full mt-3 flex flex-col items-center text-center space-y-2">
          {/* Account name & bank only */}
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-3.5 py-2 w-full text-left">
            <div className="text-xs text-slate-600 flex justify-between items-center">
              <span>ชื่อบัญชี:</span>
              <span className="font-bold text-sky-950">{targetName}</span>
            </div>
            <div className="text-[11px] text-slate-500 flex justify-between items-center mt-1">
              <span>ช่องทาง:</span>
              <span className="font-medium text-slate-700">{targetBank}</span>
            </div>
          </div>

          {qrImageUrl && (
            <button
              type="button"
              onClick={downloadQr}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              บันทึกรูป QR Code
            </button>
          )}

          <div className="px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200/80 text-[11px] text-amber-800 flex items-center gap-1.5 text-left w-full">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium">โอนเงินเสร็จแล้ว อย่าลืมอัปโหลดสลิปด้านล่างนะครับ</span>
          </div>
        </div>
      )}
    </div>
  );
}
