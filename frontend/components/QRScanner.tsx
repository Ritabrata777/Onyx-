'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { parseQRData } from '@/lib/wallet';
import SendPayment from './SendPayment';

interface Props {
  onBack: () => void;
}

export default function QRScanner({ onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scannedData, setScannedData] = useState<{ paymentId: string; amount?: string } | null>(null);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    let controls: any;

    const startScanning = async () => {
      try {
        controls = await codeReader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result) => {
            if (result) {
              const data = parseQRData(result.getText());
              setScannedData(data);
              setIsScanning(false);
              controls?.stop();
            }
          }
        );
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera access to scan QR codes.');
        } else {
          setError('Camera not available on this device.');
        }
      }
    };

    if (isScanning) {
      startScanning();
    }

    return () => {
      controls?.stop();
    };
  }, [isScanning]);

  if (scannedData) {
    return (
      <SendPayment
        onBack={onBack}
        prefillPaymentId={scannedData.paymentId}
        prefillAmount={scannedData.amount}
      />
    );
  }

  return (
    <div className="min-h-[100dvh] p-6 flex flex-col">
      <button 
        onClick={onBack} 
        className="text-text/50 mb-6 self-start px-2 py-1 -ml-2 rounded-lg hover:bg-white/5 active:bg-white/10"
      >
        ← Back
      </button>

      <h2 className="text-2xl font-bold mb-6">Scan QR Code</h2>

      <div className="card flex-1 flex flex-col">
        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <div className="text-5xl mb-4">📷</div>
            <p className="text-red-400 mb-6 px-4">{error}</p>
            <button onClick={onBack} className="btn-secondary">
              Go Back
            </button>
          </div>
        ) : (
          <>
            <div className="relative aspect-square bg-black rounded-2xl overflow-hidden mb-4 flex-1 max-h-[400px]">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
              />
              {/* Scanner overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-56 relative">
                  {/* Corner brackets */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                  {/* Scanning line animation */}
                  <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse top-1/2" />
                </div>
              </div>
              {/* Darkened corners */}
              <div className="absolute inset-0 bg-black/50" style={{
                maskImage: 'radial-gradient(circle at center, transparent 120px, black 120px)',
                WebkitMaskImage: 'radial-gradient(circle at center, transparent 120px, black 120px)',
              }} />
            </div>
            <p className="text-text/50 text-center text-sm">
              Point your camera at a payment QR code
            </p>
          </>
        )}
      </div>
    </div>
  );
}
