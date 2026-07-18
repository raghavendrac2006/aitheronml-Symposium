import React, { useState, useEffect, useRef } from 'react';
import { checkInParticipantTransaction, redeemFoodTransaction } from '../firebaseSync';
import { Attendee } from '../types';
import { CheckCircle, XCircle, QrCode, Search, UserCheck, Utensils } from 'lucide-react';

interface ScannerDeskProps {
  mode: 'checkin' | 'food';
  attendees: Attendee[];
}

export default function ScannerDesk({ mode, attendees }: ScannerDeskProps) {
  const [scannedInput, setScannedInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Status states
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusDetails, setStatusDetails] = useState<{
    message: string;
    name?: string;
    id?: string;
    timestamp?: string;
  } | null>(null);

  // Active searched participant (before action button is pressed)
  const [matchedAttendee, setMatchedAttendee] = useState<Attendee | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Keep input focused at all times for seamless scanner integration
  useEffect(() => {
    if (status === 'idle') {
      const focusInput = () => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      };
      
      focusInput();
      
      // Auto-refocus on document click/focus
      document.addEventListener('click', focusInput);
      window.addEventListener('focus', focusInput);
      
      return () => {
        document.removeEventListener('click', focusInput);
        window.removeEventListener('focus', focusInput);
      };
    }
  }, [status]);

  // Search local state for visual confirmation before transaction runs
  useEffect(() => {
    // Extract ID (e.g. SYM-000001) from input string
    const parsedId = parseParticipantId(scannedInput);
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
  function parseParticipantId(text: string): string {
    if (!text) return '';
    const cleanText = text.trim();
    // Match SYM-XXXXXX or SYM-XXXXXX-SPOT format
    const match = cleanText.match(/SYM-\d{6}(?:-SPOT)?/i);
    return match ? match[0].toUpperCase() : cleanText.toUpperCase();
  }

  // Handle auto-reset after 3 seconds for continuous scanning flow
  useEffect(() => {
    if (status !== 'idle') {
      const timer = setTimeout(() => {
        setStatus('idle');
        setStatusDetails(null);
        setScannedInput('');
        setMatchedAttendee(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedInput.trim() || loading) return;

    const participantId = parseParticipantId(scannedInput);
    if (!participantId) {
      setStatus('error');
      setStatusDetails({
        message: "Invalid ID format scanned. Format must contain e.g. 'SYM-000001'"
      });
      return;
    }

    setLoading(true);

    try {
      if (mode === 'checkin') {
        const res = await checkInParticipantTransaction(participantId);
        if (res.success) {
          setStatus('success');
          setStatusDetails({
            message: res.message,
            name: res.name || matchedAttendee?.name || 'Participant',
            id: res.id || participantId,
            timestamp: res.timestamp
          });
        } else {
          setStatus('error');
          setStatusDetails({
            message: res.message,
            name: res.name || matchedAttendee?.name,
            id: res.id || participantId,
            timestamp: res.timestamp
          });
        }
      } else {
        // Canteen / Food Mode
        const res = await redeemFoodTransaction(participantId);
        if (res.success) {
          setStatus('success');
          setStatusDetails({
            message: res.message,
            name: res.name || matchedAttendee?.name || 'Participant',
            id: res.id || participantId,
            timestamp: res.timestamp
          });
        } else {
          setStatus('error');
          setStatusDetails({
            message: res.message,
            name: res.name || matchedAttendee?.name,
            id: res.id || participantId,
            timestamp: res.timestamp
          });
        }
      }
    } catch (err: any) {
      setStatus('error');
      setStatusDetails({
        message: err.message || "An unexpected error occurred."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = () => {
    if (inputRef.current) {
      // Simulate form submit
      const form = inputRef.current.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  // --- Success Screen Render ---
  if (status === 'success' && statusDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-emerald-600 text-white rounded-3xl p-8 text-center shadow-lg animate-fade-in transition-all">
        <CheckCircle className="w-24 h-24 text-white animate-bounce mb-6" />
        <h1 className="text-3xl font-black uppercase tracking-wider mb-2">
          {mode === 'checkin' ? 'Check-in Verified' : 'Food Served'}
        </h1>
        <p className="text-emerald-100 font-semibold mb-6 text-sm">{statusDetails.message}</p>
        
        <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-2xl p-6 w-full max-w-sm space-y-4 text-left">
          <div>
            <span className="block text-[10px] text-emerald-200 font-bold uppercase tracking-widest">Participant Name</span>
            <span className="text-lg font-bold">{statusDetails.name}</span>
          </div>
          <div>
            <span className="block text-[10px] text-emerald-200 font-bold uppercase tracking-widest">Participant ID</span>
            <span className="text-lg font-mono font-bold">{statusDetails.id}</span>
          </div>
          {statusDetails.timestamp && (
            <div>
              <span className="block text-[10px] text-emerald-200 font-bold uppercase tracking-widest">Timestamp</span>
              <span className="text-xs font-mono font-semibold">
                {new Date(statusDetails.timestamp).toLocaleString()}
              </span>
            </div>
          )}
        </div>
        <p className="text-[10px] text-emerald-200 animate-pulse font-medium mt-8">
          Returning to scanner mode automatically...
        </p>
      </div>
    );
  }

  // --- Error / Rejection Screen Render ---
  if (status === 'error' && statusDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-rose-600 text-white rounded-3xl p-8 text-center shadow-lg animate-fade-in transition-all">
        <XCircle className="w-24 h-24 text-white animate-pulse mb-6" />
        <h1 className="text-3xl font-black uppercase tracking-wider mb-2">
          {mode === 'checkin' ? 'Check-in Rejected' : 'Redemption Rejected'}
        </h1>
        
        <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-2xl p-6 w-full max-w-sm space-y-4 text-left mt-4">
          <div className="text-rose-100 font-bold text-center border-b border-white/10 pb-3">
            REASON: {statusDetails.message}
          </div>
          {statusDetails.name && (
            <div>
              <span className="block text-[10px] text-rose-200 font-bold uppercase tracking-widest">Participant Name</span>
              <span className="text-base font-bold">{statusDetails.name}</span>
            </div>
          )}
          {statusDetails.id && (
            <div>
              <span className="block text-[10px] text-rose-200 font-bold uppercase tracking-widest">Participant ID</span>
              <span className="text-base font-mono font-bold">{statusDetails.id}</span>
            </div>
          )}
          {statusDetails.timestamp && (
            <div>
              <span className="block text-[10px] text-rose-200 font-bold uppercase tracking-widest">Original Action Time</span>
              <span className="text-xs font-mono font-semibold">
                {new Date(statusDetails.timestamp).toLocaleString()}
              </span>
            </div>
          )}
        </div>
        <p className="text-[10px] text-rose-200 animate-pulse font-medium mt-8">
          Resetting scanner automatically...
        </p>
      </div>
    );
  }

  // --- Scanning Interface Render ---
  return (
    <div className="bg-surface rounded-2xl border border-outline-variant/60 p-8 shadow-md max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-outline-variant/40 pb-4">
        <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
          {mode === 'checkin' ? <UserCheck className="w-6 h-6" /> : <Utensils className="w-6 h-6" />}
        </div>
        <div>
          <h2 className="text-lg font-black text-on-surface leading-tight">
            {mode === 'checkin' ? 'Pass Activation Desk' : 'Food Redemption Desk'}
          </h2>
          <p className="text-xs text-on-surface-variant font-medium mt-0.5">
            {mode === 'checkin' 
              ? 'Scan or type participant QR code details to check-in and activate their symposium pass.' 
              : 'Scan or type QR code details to redeem lunch coupon codes.'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={scannedInput}
            onChange={(e) => setScannedInput(e.target.value)}
            placeholder="Scan QR Pass (or type SYM-XXXXXX ID here)..."
            className="w-full h-14 pl-12 pr-4 rounded-xl border border-outline bg-transparent text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-mono tracking-wide"
            disabled={loading}
            autoComplete="off"
            autoFocus
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/75">
            <QrCode className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Real-time search preview display */}
        {matchedAttendee ? (
          <div className="bg-surface-container-low border border-outline-variant/50 rounded-2xl p-5 space-y-4 animate-fade-in">
            <div className="flex justify-between items-start border-b border-outline-variant/30 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-primary tracking-widest">Matched Record</span>
                <h3 className="text-base font-black text-on-surface mt-0.5">
                  {matchedAttendee.teamName ? `Team: ${matchedAttendee.teamName}` : matchedAttendee.name}
                </h3>
              </div>
              <span className="text-xs font-mono font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                {matchedAttendee.participantId || matchedAttendee.id}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="block text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">College</span>
                <span className="font-semibold text-on-surface truncate block" title={matchedAttendee.college}>
                  {matchedAttendee.college}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Department</span>
                <span className="font-semibold text-on-surface block">
                  {matchedAttendee.branch || 'N/A'} • {matchedAttendee.year || 'N/A'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Registered Event</span>
                <span className="font-semibold text-on-surface block">{matchedAttendee.registeredEventTitle}</span>
              </div>
              <div>
                <span className="block text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Roster Status</span>
                <span className={`inline-flex items-center gap-1 mt-0.5 font-bold uppercase text-[9px] px-2 py-0.25 rounded-md ${
                  matchedAttendee.checked_in 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}>
                  {matchedAttendee.checked_in ? 'Checked In' : 'Pending Check-in'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleActionClick}
              disabled={loading}
              className={`w-full h-12 rounded-xl text-white font-black uppercase text-xs tracking-wider transition-all cursor-pointer shadow-md ${
                mode === 'checkin' 
                  ? 'bg-emerald-600 hover:bg-emerald-500 hover:shadow-lg' 
                  : 'bg-amber-600 hover:bg-amber-500 hover:shadow-lg'
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
            <div className="bg-surface-container-low border border-outline-variant/40 rounded-xl p-4 flex items-center gap-2.5 text-xs text-on-surface-variant">
              <Search className="w-4 h-4 shrink-0 text-on-surface-variant/75" />
              <span>Looking up participant record for "{parseParticipantId(scannedInput)}"...</span>
            </div>
          )
        )}
      </form>
    </div>
  );
}
