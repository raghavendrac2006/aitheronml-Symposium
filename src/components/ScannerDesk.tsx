import React, { useState, useEffect, useRef } from 'react';
import { checkInParticipantTransaction, redeemFoodTransaction } from '../firebaseSync';
import { Attendee } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CheckCircle, XCircle, QrCode, Search, UserCheck, Utensils, Keyboard, Camera, Check } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface ScannerDeskProps {
  mode: 'checkin' | 'food';
  attendees: Attendee[];
}

export default function ScannerDesk({ mode, attendees }: ScannerDeskProps) {
  const [scannedInput, setScannedInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanMethod, setScanMethod] = useState<'camera' | 'manual'>('camera');
  
  // Status states
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusDetails, setStatusDetails] = useState<{
    message: string;
    name?: string;
    id?: string;
    timestamp?: string;
    paymentStatus?: 'Paid' | 'Pending' | 'Waived';
  } | null>(null);

  // For verifying payment status tick in activation mode
  const [isPaymentTicked, setIsPaymentTicked] = useState(false);

  // Active searched participant (before action button is pressed in manual mode)
  const [matchedAttendee, setMatchedAttendee] = useState<Attendee | null>(null);

  // Camera states
  const [cameraError, setCameraError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const qrRegionId = "qr-reader-viewport";

  // Keep input focused when manual mode is selected
  useEffect(() => {
    if (status === 'idle' && scanMethod === 'manual') {
      const focusInput = () => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      };
      
      focusInput();
      document.addEventListener('click', focusInput);
      window.addEventListener('focus', focusInput);
      
      return () => {
        document.removeEventListener('click', focusInput);
        window.removeEventListener('focus', focusInput);
      };
    }
  }, [status, scanMethod]);

  // Search local state for visual confirmation in manual mode
  useEffect(() => {
    const parsedId = parseParticipantQR(scannedInput).id;
    if (!parsedId) {
      setMatchedAttendee(null);
      return;
    }

    const match = attendees.find(a => a.participantId === parsedId || a.id === parsedId);
    if (match) {
      setMatchedAttendee(match);
    } else {
      setMatchedAttendee(null);
    }
  }, [scannedInput, attendees]);

  // Helper to extract Participant ID from scanned QR data
  function parseParticipantQR(text: string): { id: string, token: string | null } {
    if (!text) return { id: '', token: null };
    const cleanText = text.trim();
    const idMatch = cleanText.match(/CSM-\d{6}(?:-SPOT)?/i);
    const tokenMatch = cleanText.match(/\[T:([a-zA-Z0-9-]+)\]/i);
    return {
      id: idMatch ? idMatch[0].toUpperCase() : cleanText.toUpperCase(),
      token: tokenMatch ? tokenMatch[1] : null
    };
  }

  // Camera scanning initialization
  useEffect(() => {
    let isMounted = true;

    if (scanMethod === 'camera' && status === 'idle') {
      setCameraError(null);
      
      // Delay initialization slightly to guarantee DOM elements are rendered
      const initTimer = setTimeout(() => {
        if (!isMounted) return;
        
        try {
          const html5QrCode = new Html5Qrcode(qrRegionId);
          html5QrCodeRef.current = html5QrCode;

          html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: (width, height) => {
                const size = Math.min(width, height) * 0.7;
                return { width: size, height: size };
              }
            },
            (decodedText) => {
              // Successfully decoded code
              if (html5QrCode.isScanning) {
                html5QrCode.stop().then(() => {
                  handleScanTrigger(decodedText);
                }).catch(err => {
                  console.error("Failed to stop camera scanner", err);
                  handleScanTrigger(decodedText);
                });
              }
            },
            (errorMessage) => {
              // Ignore verbose frame processing details
            }
          ).catch(err => {
            console.error("Camera access failed", err);
            if (isMounted) {
              setCameraError("Camera permission denied, or camera is currently occupied by another app.");
            }
          });
        } catch (e: any) {
          console.error("Error creating scanner instance", e);
          if (isMounted) {
            setCameraError(e.message || "Failed to initialize scanner view.");
          }
        }
      }, 350);

      return () => {
        isMounted = false;
        clearTimeout(initTimer);
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().catch(err => console.error("Error stopping scanner on cleanup", err));
        }
      };
    }
  }, [scanMethod, status, mode]);

  // Food mode success screen: automatically resets after 1.5 seconds without clicking anything
  useEffect(() => {
    if (status === 'success' && mode === 'food') {
      const timer = setTimeout(() => {
        handleReset();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, mode]);

  const handleReset = () => {
    setStatus('idle');
    setStatusDetails(null);
    setScannedInput('');
    setMatchedAttendee(null);
    setIsPaymentTicked(false);
    setScanMethod('camera'); // Reset back to default camera scanner
  };

  const handleScanTrigger = async (text: string) => {
    const parsedQR = parseParticipantQR(text);
    const participantId = parsedQR.id;
    if (!participantId) {
      setStatus('error');
      setStatusDetails({
        message: "Invalid QR Code layout. Format must contain a participant sequential ID."
      });
      return;
    }

    setLoading(true);

    try {
      if (mode === 'checkin') {
        const res = await checkInParticipantTransaction(
          participantId,
          parsedQR.token,
          scanMethod === 'manual'
        );
        
        // Find matching local payment status as fallback
        const localMatch = attendees.find(a => a.participantId === participantId || a.id === participantId);
        const initialPaymentStatus = localMatch?.paymentStatus || 'Pending';

        if (res.success) {
          setStatus('success');
          setStatusDetails({
            message: res.message,
            name: res.name || localMatch?.name || 'Participant',
            id: res.id || participantId,
            timestamp: res.timestamp,
            paymentStatus: initialPaymentStatus
          });
          setIsPaymentTicked(initialPaymentStatus === 'Paid');
        } else {
          setStatus('error');
          setStatusDetails({
            message: res.message,
            name: res.name || localMatch?.name,
            id: res.id || participantId,
            timestamp: res.timestamp,
            paymentStatus: initialPaymentStatus
          });
        }
      } else if (mode === 'food') {
        // Canteen Food redemption mode
        const res = await redeemFoodTransaction(
          participantId,
          parsedQR.token,
          scanMethod === 'manual'
        );
        const localMatch = attendees.find(a => a.participantId === participantId || a.id === participantId);
        
        if (res.success) {
          setStatus('success');
          setStatusDetails({
            message: res.message,
            name: res.name || localMatch?.name || 'Participant',
            id: res.id || participantId,
            timestamp: res.timestamp
          });
        } else {
          setStatus('error');
          setStatusDetails({
            message: res.message,
            name: res.name || localMatch?.name,
            id: res.id || participantId,
            timestamp: res.timestamp
          });
        }
      }
    } catch (err: any) {
      setStatus('error');
      setStatusDetails({
        message: err.message || "An unexpected error occurred during scanning."
      });
    } finally {
      setLoading(false);
    }
  };

  // Submit handler for manual typed inputs
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedInput.trim() || loading) return;
    await handleScanTrigger(scannedInput);
  };

  const handleNextActivation = async () => {
    if (!statusDetails || !statusDetails.id) {
      handleReset();
      return;
    }

    setLoading(true);
    try {
      // If verification box was ticked and payment was previously pending, write to database
      if (isPaymentTicked && statusDetails.paymentStatus !== 'Paid') {
        const docRef = doc(db, 'participants', statusDetails.id);
        await updateDoc(docRef, { paymentStatus: 'Paid' });
        
        // Also update local props list value reactively
        const match = attendees.find(a => a.id === statusDetails.id);
        if (match) {
          match.paymentStatus = 'Paid';
        }
      }
      handleReset();
    } catch (err: any) {
      alert("Failed to update payment status: " + err.message);
      handleReset();
    } finally {
      setLoading(false);
    }
  };

  // --- Check-in Success View (With verify payment option) ---
  if (status === 'success' && mode === 'checkin' && statusDetails) {
    const isAlreadyPaid = statusDetails.paymentStatus === 'Paid';
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] bg-emerald-600 text-white rounded-3xl p-6 text-center shadow-lg transition-all animate-fade-in">
        <CheckCircle className="w-20 h-20 text-white mb-5 animate-bounce" />
        <h1 className="text-2xl font-black uppercase tracking-wider mb-1">Pass Activated Successfully!</h1>
        <p className="text-emerald-100 font-semibold mb-6 text-xs">{statusDetails.message}</p>
        
        <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-2xl p-5 w-full max-w-sm space-y-4 text-left">
          <div>
            <span className="block text-[9px] text-emerald-200 font-bold uppercase tracking-widest">Participant Name</span>
            <span className="text-base font-bold">{statusDetails.name}</span>
          </div>
          <div>
            <span className="block text-[9px] text-emerald-200 font-bold uppercase tracking-widest">Participant ID</span>
            <span className="text-base font-mono font-bold">{statusDetails.id}</span>
          </div>
          
          {/* Payment verification checkbox */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            <div>
              <span className="block text-[9px] text-emerald-200 font-bold uppercase tracking-widest">Payment Status</span>
              <span className="text-xs font-semibold">{isAlreadyPaid ? 'Paid & Verified' : 'Unpaid (Verify details)'}</span>
            </div>

            <label className="relative flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={isPaymentTicked}
                disabled={isAlreadyPaid}
                onChange={(e) => setIsPaymentTicked(e.target.checked)}
                className="sr-only peer"
              />
              <div className={`w-10 h-6 rounded-full transition-colors relative ${
                isPaymentTicked ? 'bg-emerald-400' : 'bg-white/20'
              } border border-white/20`}>
                <div className={`w-4.5 h-4.5 rounded-full bg-white absolute top-0.75 transition-all shadow-sm flex items-center justify-center ${
                  isPaymentTicked ? 'left-4.5' : 'left-0.75'
                }`}>
                  {isPaymentTicked && <Check className="w-3 h-3 text-emerald-600" />}
                </div>
              </div>
              <span className="text-xs font-bold">Paid</span>
            </label>
          </div>
        </div>

        <button
          onClick={handleNextActivation}
          disabled={loading}
          className="mt-8 bg-white text-emerald-700 h-12 px-10 rounded-xl font-black uppercase text-xs tracking-wider shadow-md hover:bg-emerald-50 transition-all cursor-pointer w-full max-w-sm"
        >
          {loading ? 'Saving details...' : 'Next'}
        </button>
      </div>
    );
  }

  // --- Canteen Redemption Success (Green blink & Auto-reset) ---
  if (status === 'success' && mode === 'food' && statusDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-emerald-600 text-white rounded-3xl p-8 text-center shadow-lg transition-all animate-pulse-green">
        <CheckCircle className="w-24 h-24 text-white mb-6" />
        <h1 className="text-3xl font-black uppercase tracking-wider mb-2">Food Served</h1>
        <p className="text-emerald-100 font-semibold mb-6 text-sm">Coupon redeemed successfully!</p>
        
        <div className="bg-white/10 border border-white/20 rounded-2xl p-5 w-full max-w-sm space-y-3 text-left">
          <div>
            <span className="block text-[9px] text-emerald-200 font-bold uppercase tracking-widest">Name</span>
            <span className="text-base font-bold">{statusDetails.name}</span>
          </div>
          <div>
            <span className="block text-[9px] text-emerald-200 font-bold uppercase tracking-widest">ID</span>
            <span className="text-base font-mono font-bold">{statusDetails.id}</span>
          </div>
        </div>
      </div>
    );
  }

  // --- Error / Rejection Screen Render (Requires simple Go Back button) ---
  if (status === 'error' && statusDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-rose-600 text-white rounded-3xl p-8 text-center shadow-lg transition-all animate-pulse-red">
        <XCircle className="w-20 h-20 text-white mb-6" />
        <h1 className="text-2xl font-black uppercase tracking-wider mb-2">
          {mode === 'checkin' ? 'Activation Rejected' : 'Redemption Rejected'}
        </h1>
        
        <div className="bg-white/10 border border-white/20 rounded-2xl p-5 w-full max-w-sm space-y-3 text-left my-4">
          <div className="text-rose-100 font-bold text-center border-b border-white/10 pb-3">
            REASON: {statusDetails.message}
          </div>
          {statusDetails.name && (
            <div>
              <span className="block text-[9px] text-rose-200 font-bold uppercase tracking-widest">Name</span>
              <span className="text-sm font-bold">{statusDetails.name}</span>
            </div>
          )}
          {statusDetails.id && (
            <div>
              <span className="block text-[9px] text-rose-200 font-bold uppercase tracking-widest">ID</span>
              <span className="text-sm font-mono font-bold">{statusDetails.id}</span>
            </div>
          )}
          {statusDetails.timestamp && (
            <div>
              <span className="block text-[9px] text-rose-200 font-bold uppercase tracking-widest">Checked In Time</span>
              <span className="text-xs font-mono font-semibold">
                {new Date(statusDetails.timestamp).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={handleReset}
          className="mt-6 bg-white text-rose-700 h-12 px-8 rounded-xl font-black uppercase text-xs tracking-wider shadow-md hover:bg-rose-50 transition-all cursor-pointer w-full max-w-sm"
        >
          Go Back to Scanner
        </button>
      </div>
    );
  }

  // --- Scanning Interface Render ---
  return (
    <div className="bg-surface rounded-2xl border border-outline-variant/60 p-6 shadow-md max-w-lg mx-auto space-y-5">
      {/* Header Panel */}
      <div className="flex justify-between items-start border-b border-outline-variant/40 pb-4">
        <div className="flex gap-3">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
            {mode === 'checkin' ? <UserCheck className="w-5 h-5" /> : <Utensils className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-base font-black text-on-surface leading-tight">
              {mode === 'checkin' ? 'Pass Activation' : 'Canteen Redemption'}
            </h2>
            <p className="text-[10px] text-on-surface-variant font-semibold mt-0.5">
              {mode === 'checkin' 
                ? 'Scan QR Pass with device camera to activate entry pass.' 
                : 'Scan QR Pass with device camera to redeem canteen meal.'}
            </p>
          </div>
        </div>

        {/* Scan Method Toggle Bar */}
        <div className="flex gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/40">
          <button
            onClick={() => setScanMethod('camera')}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              scanMethod === 'camera' 
                ? 'bg-primary text-on-primary shadow-xs' 
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
            title="Scan using Camera"
          >
            <Camera className="w-4 h-4" />
          </button>
          <button
            onClick={() => setScanMethod('manual')}
            className={`p-1.5 rounded-lg transition-all cursor-pointer ${
              scanMethod === 'manual' 
                ? 'bg-primary text-on-primary shadow-xs' 
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
            title="Enter ID manually"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </div>

      {scanMethod === 'camera' ? (
        <div className="space-y-4">
          {/* QR scanner viewport box */}
          <div className="relative overflow-hidden rounded-2xl bg-black aspect-square border border-outline-variant max-w-sm mx-auto shadow-inner">
            <div id={qrRegionId} className="w-full h-full object-cover"></div>
            
            {/* Holographic scanner target reticle overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-[70%] h-[70%] border-2 border-dashed border-primary/40 rounded-xl relative">
                {/* Visual corners */}
                <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-4 border-l-4 border-primary" />
                <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-4 border-r-4 border-primary" />
                <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-4 border-l-4 border-primary" />
                <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-4 border-r-4 border-primary" />
                {/* Glowing scanning laser line */}
                <div className="w-full h-0.5 bg-primary/80 absolute top-0 animate-laser shadow-lg shadow-primary" />
              </div>
            </div>
          </div>

          {cameraError && (
            <div className="bg-error-container/20 border border-error/30 text-error rounded-xl p-3.5 text-xs text-center font-semibold max-w-sm mx-auto animate-fade-in">
              <p>{cameraError}</p>
              <button 
                onClick={() => setScanMethod('manual')}
                className="mt-2.5 bg-error text-white text-[10px] uppercase font-bold py-1.5 px-4 rounded-lg hover:opacity-90"
              >
                Switch to Manual Entry
              </button>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={scannedInput}
              onChange={(e) => setScannedInput(e.target.value)}
              placeholder="Type Participant ID (e.g. CSM-000001)..."
              className="w-full h-12 pl-11 pr-4 rounded-xl border border-outline bg-transparent text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all text-xs font-mono tracking-wide"
              disabled={loading}
              autoComplete="off"
              autoFocus
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/75">
              <Search className="w-4 h-4" />
            </div>
          </div>

          {matchedAttendee ? (
            <div className="bg-surface-container-low border border-outline-variant/50 rounded-xl p-4 space-y-3 animate-fade-in">
              <div className="flex justify-between items-center border-b border-outline-variant/20 pb-2.5">
                <div>
                  <span className="text-[8px] font-black uppercase text-primary tracking-widest">Matched Participant</span>
                  <h3 className="text-sm font-black text-on-surface mt-0.5">
                    {matchedAttendee.name}
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                  {matchedAttendee.participantId || matchedAttendee.id}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[10px]">
                <div>
                  <span className="block text-[8px] text-on-surface-variant font-bold uppercase tracking-wider">College</span>
                  <span className="font-semibold text-on-surface truncate block">
                    {matchedAttendee.college}
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] text-on-surface-variant font-bold uppercase tracking-wider">Event</span>
                  <span className="font-semibold text-on-surface truncate block">
                    {matchedAttendee.registeredEventTitle}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full h-11 rounded-xl text-white font-black uppercase text-xs tracking-wider transition-all cursor-pointer shadow-xs ${
                  mode === 'checkin' 
                    ? 'bg-emerald-600 hover:bg-emerald-500' 
                    : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                ) : mode === 'checkin' ? (
                  'Activate Pass'
                ) : (
                  'Serve Food'
                )}
              </button>
            </div>
          ) : (
            scannedInput.trim() && (
              <div className="text-[10px] text-on-surface-variant italic px-1">
                Looking up participant record for "{parseParticipantQR(scannedInput).id}"...
              </div>
            )
          )}
        </form>
      )}
    </div>
  );
}
