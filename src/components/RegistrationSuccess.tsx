import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Attendee } from '../types';
import { Clipboard, Check, Download, Home, CheckCircle2, AlertTriangle } from 'lucide-react';
import { downloadQrPass } from '../utils/qrPassGenerator';
import QRCode from 'qrcode';

interface RegistrationSuccessProps {
  attendee: Attendee;
  secondAttendee?: Attendee;
  onReturnHome: () => void;
  isSpotSuccess?: boolean;
}

export default function RegistrationSuccess({ 
  attendee, 
  secondAttendee,
  onReturnHome, 
  isSpotSuccess = false 
}: RegistrationSuccessProps) {
  const [copied, setCopied] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const numMembers = (attendee.teamName && attendee.teamMembers) ? attendee.teamMembers.length + 1 : 1;
  const numEvents = secondAttendee ? 2 : 1;
  const totalAmount = numMembers * numEvents * 100;

  useEffect(() => {
    let isMounted = true;
    const initQrAndDownload = async () => {
      try {
        // Generate QR code data URL first (for on-screen display)
        const { formatQrContent } = await import('../utils/qrPassGenerator');
        const qrContent = formatQrContent(attendee, secondAttendee);
        const dataUrl = await QRCode.toDataURL(qrContent, {
          errorCorrectionLevel: 'H',
          margin: 1,
          width: 300,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        
        if (isMounted) {
          setQrDataUrl(dataUrl);
        }

        // Trigger automatic unified pass PNG download
        await downloadQrPass(attendee, secondAttendee);
      } catch (err) {
        console.error("Failed to automatically generate or download QR pass", err);
        if (isMounted) {
          setDownloadError("Registration successful, but QR download failed. Please contact the organizer.");
        }
      }
    };
    
    // Tiny delay to ensure browser rendering is stable before triggering download
    const timer = setTimeout(() => {
      initQrAndDownload();
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [attendee, secondAttendee]);

  const handleCopyId = () => {
    const pId = secondAttendee 
      ? `${attendee.participantId || attendee.id}, ${secondAttendee.participantId || secondAttendee.id}`
      : (attendee.participantId || attendee.id);
    navigator.clipboard.writeText(pId);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadPass = async () => {
    try {
      setDownloadError(null);
      await downloadQrPass(attendee, secondAttendee);
    } catch (err) {
      console.error("Failed to download registration QR pass manually", err);
      setDownloadError("Registration successful, but QR download failed. Please contact the organizer.");
    }
  };

  const formattedDate = attendee.registrationDate 
    ? new Date(attendee.registrationDate).toLocaleString() 
    : new Date().toLocaleString();

  return (
    <div id="registration-success-container" className="flex flex-col min-h-screen text-on-surface bg-background">
      <main className="flex-grow flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-md w-full text-center">
          
          {/* Success Banner */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary-container text-primary mb-4 shadow-sm">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-primary mb-1">
              {isSpotSuccess ? 'Spot Registration Active' : 'Registration Successful'}
            </h1>
            <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
              Your entry record for Kuppam Engineering College "AItheronML Symposium" has been logged and secured.
            </p>
          </div>
 
          {/* Action Notice Callout Box */}
          <div className="mb-6 p-4 rounded-2xl flex items-start gap-3 text-left shadow-md border text-white" style={{ backgroundColor: '#600000', borderColor: '#400000' }}>
            <AlertTriangle className="w-5 h-5 text-white shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black uppercase text-white tracking-wider">Pass Download Required</h4>
              <p className="text-[11px] text-white font-semibold leading-relaxed mt-0.5 opacity-95">
                Please download this entry pass immediately. You must present this QR Code pass at the symposium registration desk for verification and entry check-in on the event day.
              </p>
            </div>
          </div>

          {/* Payment Calculation Box */}
          <div className="mb-6 p-4 rounded-2xl flex items-start gap-3 text-left shadow-md border bg-primary-container text-on-primary-container border-primary/20">
            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 text-primary font-bold">
              ₹
            </div>
            <div className="flex-1 w-full">
              <h4 className="text-xs font-black uppercase text-primary tracking-wider">Registration Fee Due</h4>
              <p className="text-[11px] font-semibold leading-relaxed mt-0.5 opacity-90 text-on-primary-container">
                Please pay this exact amount at the registration desk on the event day.
              </p>
              
              <div className="mt-3 p-3 bg-surface/50 rounded-xl border border-primary/10">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="text-on-surface-variant font-semibold">Participants:</span>
                  <span className="font-bold text-on-surface">{numMembers} {numMembers > 1 ? 'Members' : 'Person'}</span>
                </div>
                <div className="flex justify-between items-center text-xs mb-2.5">
                  <span className="text-on-surface-variant font-semibold">Events Registered:</span>
                  <span className="font-bold text-on-surface">{numEvents} {numEvents > 1 ? 'Events' : 'Event'}</span>
                </div>
                <div className="pt-2 border-t border-primary/20 flex justify-between items-center">
                  <span className="text-xs font-black uppercase text-primary tracking-wider">Total Amount</span>
                  <span className="text-lg font-black text-primary">₹{totalAmount}</span>
                </div>
              </div>
            </div>
          </div>
 
          {/* Clean registration details layout */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-md border border-outline-variant space-y-6 text-left">
            
            {/* Download Error Indicator */}
            {downloadError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{downloadError}</span>
              </div>
            )}

            {/* Copy Toast Indicator */}
            {copied && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-700 text-xs font-semibold rounded-lg flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span>Participant ID(s) Copied Successfully</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <span className="block text-[10px] uppercase font-bold text-on-surface-variant mb-0.5">
                  {attendee.teamName ? 'Team Name' : 'Participant Name'}
                </span>
                <span className="text-sm font-semibold text-on-surface">
                  {attendee.teamName ? attendee.teamName : attendee.name}
                </span>
              </div>

              {attendee.teamName && (
                <div>
                  <span className="block text-[10px] uppercase font-bold text-on-surface-variant mb-0.5">Team Leader</span>
                  <span className="text-sm font-semibold text-on-surface">{attendee.name}</span>
                </div>
              )}

              {attendee.teamName && attendee.teamMembers && attendee.teamMembers.length > 0 && (
                <div>
                  <span className="block text-[10px] uppercase font-bold text-on-surface-variant mb-0.5">Team Members (Total: {attendee.teamMembers.length + 1})</span>
                  <span className="text-sm font-semibold text-on-surface">
                    {attendee.teamMembers.map(m => m.name).join(', ')}
                  </span>
                </div>
              )}

              {secondAttendee ? (
                <>
                  <div className="py-2 border-t border-outline-variant/30 space-y-3">
                    <h3 className="text-xs font-bold text-primary uppercase">Event 1 (Morning)</h3>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-on-surface-variant mb-0.5">Morning Participant ID</span>
                      <span className="text-sm font-mono font-bold text-primary">{attendee.participantId || attendee.id}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-on-surface-variant mb-0.5">Registered Morning Event</span>
                      <span className="text-sm font-semibold text-on-surface">{attendee.registeredEventTitle}</span>
                    </div>
                  </div>

                  <div className="py-2 border-t border-outline-variant/30 space-y-3">
                    <h3 className="text-xs font-bold text-primary uppercase">Event 2 (Afternoon)</h3>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-on-surface-variant mb-0.5">Afternoon Participant ID</span>
                      <span className="text-sm font-mono font-bold text-primary">{secondAttendee.participantId || secondAttendee.id}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-on-surface-variant mb-0.5">Registered Afternoon Event</span>
                      <span className="text-sm font-semibold text-on-surface">{secondAttendee.registeredEventTitle}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-on-surface-variant mb-0.5">Participant ID</span>
                    <span className="text-sm font-mono font-bold text-primary">{attendee.participantId || attendee.id}</span>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase font-bold text-on-surface-variant mb-0.5">Registered Event</span>
                    <span className="text-sm font-semibold text-on-surface">{attendee.registeredEventTitle}</span>
                  </div>
                </>
              )}

              <div className="pt-2 border-t border-outline-variant/30">
                <span className="block text-[10px] uppercase font-bold text-on-surface-variant mb-0.5">Registration Date</span>
                <span className="text-sm font-semibold text-on-surface">{formattedDate}</span>
              </div>

              <div>
                <span className="block text-[10px] uppercase font-bold text-on-surface-variant mb-0.5">Registration Status</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-700 font-bold rounded-full text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Confirmed (Pending Check-in)
                </span>
              </div>

              {/* Centered QR Pass Integration */}
              <div className="pt-5 border-t border-outline-variant/30 flex flex-col items-center justify-center gap-2.5">
                <span className="block text-[10px] uppercase font-black tracking-widest text-primary text-center">Your Entry QR Pass</span>
                {qrDataUrl ? (
                  <div className="bg-white p-3 rounded-2xl border border-outline-variant shadow-xs">
                    <img 
                      src={qrDataUrl} 
                      alt="Registration QR Pass" 
                      className="w-44 h-44 block select-none" 
                    />
                  </div>
                ) : (
                  <div className="w-44 h-44 rounded-2xl bg-surface-container-high animate-pulse flex items-center justify-center">
                    <span className="text-xs text-on-surface-variant">Generating QR...</span>
                  </div>
                )}
                <p className="text-[10px] text-on-surface-variant font-semibold text-center max-w-[240px] leading-normal mt-1">
                  Keep this QR safe and show it at the check-in desk on arrival.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons precisely requested */}
          <div className="mt-8 flex flex-col gap-2.5">
            <button 
              onClick={handleCopyId}
              className="bg-secondary-container text-on-secondary-container h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-all w-full cursor-pointer border border-outline-variant/50"
            >
              <Clipboard className="w-4 h-4" />
              {secondAttendee ? 'Copy Participant IDs' : 'Copy Participant ID'}
            </button>

            <button 
              onClick={handleDownloadPass}
              className="bg-primary text-white h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-md w-full cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Download Registration Pass
            </button>

            <button 
              onClick={onReturnHome}
              className="border border-outline text-on-surface h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-surface-container-high transition-all w-full cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Return Home
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
