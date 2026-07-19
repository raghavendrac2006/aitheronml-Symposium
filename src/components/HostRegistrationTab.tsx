import React, { useState, useEffect, useRef } from 'react';
import { hostCheckInParticipantTransaction, updatePaymentStatusTransaction } from '../firebaseSync';
import { Attendee } from '../types';
import { CheckCircle, XCircle, QrCode, Search, Keyboard, Check, AlertTriangle, User, Users, CheckCircle2, RotateCcw, UserCheck } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';

interface HostRegistrationTabProps {
  hostAssignedEventId: string;
  attendees: Attendee[];
}

export default function HostRegistrationTab({ hostAssignedEventId, attendees }: HostRegistrationTabProps) {
  const [scannedInput, setScannedInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanMethod, setScanMethod] = useState<'camera' | 'manual'>('camera');
  
  // Status states
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusDetails, setStatusDetails] = useState<{
    message: string;
    attendee?: Attendee;
    timestamp?: string;
  } | null>(null);

  // Active searched participant (before action button is pressed in manual mode)
  const [matchedAttendee, setMatchedAttendee] = useState<Attendee | null>(null);
  
  // Recent scans
  const [recentScans, setRecentScans] = useState<Attendee[]>([]);

  // Camera states
  const [cameraError, setCameraError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const qrRegionId = "host-qr-reader-viewport";

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

  function parseParticipantId(text: string): string {
    if (!text) return '';
    const cleanText = text.trim();
    const match = cleanText.match(/(?:SYM|CSM)-\d{6}(?:-SPOT)?/i);
    return match ? match[0].toUpperCase() : cleanText.toUpperCase();
  }

  // Camera scanning initialization
  useEffect(() => {
    let isMounted = true;

    if (scanMethod === 'camera' && status === 'idle') {
      setCameraError(null);
      
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
              setCameraError("Camera permission denied, or camera is currently occupied.");
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
  }, [scanMethod, status]);

  const handleReset = () => {
    setStatus('idle');
    setStatusDetails(null);
    setScannedInput('');
    setMatchedAttendee(null);
    setVerificationMode(false);
    setScanMethod('camera');
  };

  const [verificationMode, setVerificationMode] = useState<boolean>(false);

  const handleScanTrigger = async (text: string) => {
    const participantId = parseParticipantId(text);
    if (!participantId) {
      setStatus('error');
      setStatusDetails({
        message: "Invalid QR Code layout. Format must contain a participant sequential ID."
      });
      return;
    }

    setLoading(true);

    try {
      const match = attendees.find(a => a.participantId === participantId || a.id === participantId);
      
      if (!match) {
        setStatus('error');
        setStatusDetails({
          message: `Participant with ID ${participantId} not found.`
        });
        setLoading(false);
        return;
      }

      const participantEventId = match.registeredEventId || match.eventId;
      if (participantEventId !== hostAssignedEventId) {
        setStatus('error');
        setStatusDetails({
          message: "This participant is not registered for this event."
        });
        setLoading(false);
        return;
      }

      // Valid event match!
      setStatus('success');
      setStatusDetails({
        message: "Participant Verified for Event",
        attendee: match
      });
      setVerificationMode(true); // Wait for proceed
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setStatusDetails({
        message: "An unexpected error occurred during verification."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProceedCheckIn = async () => {
    if (!statusDetails?.attendee) return;
    
    setLoading(true);
    const participantId = statusDetails.attendee.participantId || statusDetails.attendee.id;
    
    try {
      const res = await hostCheckInParticipantTransaction(participantId, hostAssignedEventId);
      
      if (res.success) {
        setVerificationMode(false); // Finished verification, now show true success briefly
        setStatusDetails(prev => prev ? { ...prev, message: "Checked In Successfully!" } : null);
        
        // Add to recent scans
        setRecentScans(prev => {
          const exists = prev.find(p => p.id === statusDetails.attendee!.id);
          if (exists) return prev;
          return [statusDetails.attendee!, ...prev].slice(0, 5);
        });

        // Auto return to scanner after 2.5 seconds
        setTimeout(() => {
          handleReset();
        }, 2500);
      } else {
        if (res.message.includes("Already Checked In")) {
          setVerificationMode(false);
          setStatusDetails(prev => prev ? { ...prev, message: "Participant Already Checked In" } : null);
          setTimeout(() => {
            handleReset();
          }, 3000);
        } else {
          setStatus('error');
          setStatusDetails({ message: res.message });
        }
      }
    } catch (err: any) {
      setStatus('error');
      setStatusDetails({ message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!statusDetails?.attendee) return;
    setLoading(true);
    const participantId = statusDetails.attendee.participantId || statusDetails.attendee.id;
    try {
      const res = await updatePaymentStatusTransaction(participantId, 'Paid');
      if (res.success) {
        setStatusDetails(prev => {
          if (!prev || !prev.attendee) return prev;
          return {
            ...prev,
            attendee: { ...prev.attendee, paymentStatus: 'Paid' }
          };
        });
      } else {
        alert(res.message); // Fallback alert for payment issues
      }
    } catch (err: any) {
      alert("Failed to mark as paid: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-on-surface">Event Registration</h2>
          <p className="text-sm text-on-surface-variant font-medium">Scan QR codes to verify and check in your participants.</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {status === 'idle' ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Scanner Area */}
            <div className="lg:col-span-8 bg-surface-container border border-outline-variant/50 rounded-3xl overflow-hidden flex flex-col h-[500px]">
              <div className="flex border-b border-outline-variant/50">
                <button
                  onClick={() => { setScanMethod('camera'); setScannedInput(''); }}
                  className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold text-sm transition-colors ${
                    scanMethod === 'camera' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <QrCode className="w-4 h-4" /> Camera Scan
                </button>
                <button
                  onClick={() => { setScanMethod('manual'); setCameraError(null); }}
                  className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold text-sm transition-colors ${
                    scanMethod === 'manual' ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  <Keyboard className="w-4 h-4" /> Manual Entry
                </button>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black/5 relative">
                {scanMethod === 'camera' ? (
                  <div className="w-full max-w-sm aspect-square relative rounded-2xl overflow-hidden bg-black shadow-inner flex items-center justify-center">
                    {cameraError ? (
                      <div className="text-center p-6 space-y-3">
                        <AlertTriangle className="w-10 h-10 text-error mx-auto opacity-80" />
                        <p className="text-error font-medium text-sm">{cameraError}</p>
                        <button 
                          onClick={() => setScanMethod('manual')}
                          className="mt-2 px-4 py-2 bg-surface text-on-surface rounded-lg text-sm font-bold shadow-sm"
                        >
                          Use Manual Entry
                        </button>
                      </div>
                    ) : (
                      <>
                        <div id={qrRegionId} className="w-full h-full [&>video]:object-cover" />
                        <div className="absolute inset-0 pointer-events-none border-[3px] border-primary/30 m-8 rounded-xl z-10">
                          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary -mt-1 -ml-1 rounded-tl-lg" />
                          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary -mt-1 -mr-1 rounded-tr-lg" />
                          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary -mb-1 -ml-1 rounded-bl-lg" />
                          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary -mb-1 -mr-1 rounded-br-lg" />
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="w-full max-w-md space-y-4">
                    <div className="bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant">
                      <label className="block text-sm font-bold text-on-surface-variant mb-2">Participant ID</label>
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline" />
                        <input
                          ref={inputRef}
                          type="text"
                          value={scannedInput}
                          onChange={(e) => setScannedInput(e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && scannedInput.trim()) {
                              handleScanTrigger(scannedInput.trim());
                            }
                          }}
                          placeholder="e.g. SYM-123456"
                          className="w-full bg-surface-container border-2 border-outline focus:border-primary focus:ring-0 rounded-xl py-4 pl-12 pr-4 text-lg font-black tracking-widest text-on-surface"
                        />
                      </div>
                      <button
                        onClick={() => handleScanTrigger(scannedInput.trim())}
                        disabled={!scannedInput.trim() || loading}
                        className="w-full mt-4 bg-primary text-on-primary py-4 rounded-xl font-black text-sm disabled:opacity-50 transition-opacity"
                      >
                        {loading ? 'Verifying...' : 'Verify Participant'}
                      </button>
                    </div>

                    {scannedInput.trim() && matchedAttendee && (
                      <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/50 text-center animate-fade-in">
                        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Found Match</p>
                        <p className="text-lg font-black text-on-surface">{matchedAttendee.name}</p>
                        <p className="text-sm font-medium text-on-surface-variant">{matchedAttendee.college}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Scans Sidebar */}
            <div className="lg:col-span-4 space-y-4">
              <h3 className="text-sm font-black text-on-surface-variant uppercase tracking-wider px-1">Recent Check-ins</h3>
              {recentScans.length === 0 ? (
                <div className="bg-surface-container border border-outline-variant/30 rounded-2xl p-8 text-center text-on-surface-variant">
                  <UserCheck className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">No participants checked in yet during this session.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentScans.map((scan, i) => (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      key={scan.id + '-' + i}
                      className="bg-surface border border-outline-variant/50 p-4 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-on-surface">{scan.name}</p>
                        <p className="text-xs font-mono font-medium text-on-surface-variant">{scan.participantId || scan.id}</p>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ) : status === 'error' ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center p-8 bg-error/10 border-2 border-error/30 rounded-3xl min-h-[400px] text-center"
          >
            <div className="w-24 h-24 bg-error text-on-error rounded-full flex items-center justify-center mb-6 shadow-xl shadow-error/20">
              <XCircle className="w-12 h-12" />
            </div>
            <h3 className="text-3xl font-black text-error mb-2">Access Denied</h3>
            <p className="text-lg text-error/80 font-medium max-w-md">{statusDetails?.message}</p>
            
            <button
              onClick={handleReset}
              className="mt-8 px-8 py-4 bg-error text-on-error hover:bg-error/90 rounded-xl font-bold text-lg shadow-lg transition-all"
            >
              Return to Scanner
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center p-8 bg-green-500/10 border-2 border-green-500/30 rounded-3xl min-h-[500px] text-center relative overflow-hidden"
          >
            {!verificationMode ? (
              <>
                <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-500/20">
                  <CheckCircle className="w-12 h-12" />
                </div>
                <h3 className="text-3xl font-black text-green-700 mb-2">{statusDetails?.message}</h3>
                <p className="text-green-700/80 font-medium">{statusDetails?.attendee?.name}</p>
              </>
            ) : (
              // Verification Mode (GREEN Screen waiting for PROCEED action)
              <div className="w-full max-w-2xl bg-surface border border-outline-variant shadow-xl rounded-2xl overflow-hidden text-left relative z-10">
                <div className="bg-green-500 p-4 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6" />
                    <span className="font-bold text-lg">Verified for this Event</span>
                  </div>
                  <span className="font-mono bg-white/20 px-3 py-1 rounded-lg text-sm font-bold">
                    {statusDetails?.attendee?.participantId || statusDetails?.attendee?.id}
                  </span>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Participant Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Participant Name</p>
                        <p className="text-2xl font-black text-on-surface flex items-center gap-2">
                          <User className="w-5 h-5 text-primary" />
                          {statusDetails?.attendee?.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">College & Dept</p>
                        <p className="text-base font-bold text-on-surface">{statusDetails?.attendee?.college}</p>
                        <p className="text-sm font-medium text-on-surface-variant">{statusDetails?.attendee?.department}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">Contact</p>
                        <p className="text-sm font-medium text-on-surface">{statusDetails?.attendee?.email}</p>
                        <p className="text-sm font-medium text-on-surface">{(statusDetails?.attendee as any)?.mobile || statusDetails?.attendee?.phone}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {statusDetails?.attendee?.teamName && (
                        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl">
                          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Users className="w-4 h-4" /> Team Details
                          </p>
                          <p className="text-lg font-black text-amber-800">{statusDetails?.attendee?.teamName}</p>
                          {statusDetails?.attendee?.teamMembers && (
                            <p className="text-sm font-bold text-amber-700/80 mt-1">
                              Members: {statusDetails?.attendee?.teamMembers.join(', ')}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Payment Status Manual Control */}
                      <div className="bg-surface-container border border-outline-variant p-4 rounded-xl">
                        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Payment Status</p>
                        {statusDetails?.attendee?.paymentStatus === 'Paid' ? (
                          <div className="bg-green-500/10 text-green-700 px-4 py-3 rounded-lg font-bold flex items-center gap-2">
                            <Check className="w-5 h-5" /> Payment Received
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="bg-amber-500/10 text-amber-700 px-4 py-3 rounded-lg font-bold flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5" /> Payment Pending
                            </div>
                            <button
                              onClick={handleMarkAsPaid}
                              disabled={loading}
                              className="w-full bg-on-surface text-surface py-2 rounded-lg font-bold text-sm hover:bg-on-surface/90 disabled:opacity-50"
                            >
                              {loading ? 'Updating...' : 'Mark as Paid'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Checked in Status */}
                      <div className="bg-surface-container border border-outline-variant p-4 rounded-xl">
                        <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Check-in Status</p>
                        {statusDetails?.attendee?.checked_in ? (
                          <div className="text-primary font-bold">Already Checked In</div>
                        ) : (
                          <div className="text-on-surface-variant font-medium">Not Checked In</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-low p-4 border-t border-outline-variant flex justify-end gap-3">
                  <button
                    onClick={handleReset}
                    disabled={loading}
                    className="px-6 py-3 text-on-surface-variant font-bold hover:bg-surface-container-high rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" /> Cancel
                  </button>
                  <button
                    onClick={handleProceedCheckIn}
                    disabled={loading}
                    className="px-8 py-3 bg-primary text-on-primary rounded-xl font-black shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? 'Processing...' : 'Proceed & Check In'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
