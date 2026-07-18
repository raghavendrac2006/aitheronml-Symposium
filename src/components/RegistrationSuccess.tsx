import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Attendee } from '../types';
import { Clipboard, Check, Download, Home } from 'lucide-react';
import { downloadQrPass } from '../utils/qrPassGenerator';

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

  useEffect(() => {
    let isMounted = true;
    const autoDownload = async () => {
      try {
        await downloadQrPass(attendee);
        if (secondAttendee) {
          await downloadQrPass(secondAttendee);
        }
      } catch (err) {
        console.error("Failed to automatically download registration QR pass(es)", err);
        if (isMounted) {
          setDownloadError("Registration successful, but QR download failed. Please contact the organizer.");
        }
      }
    };
    
    // Tiny delay to ensure browser rendering is stable before triggering download
    const timer = setTimeout(() => {
      autoDownload();
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
      await downloadQrPass(attendee);
      if (secondAttendee) {
        await downloadQrPass(secondAttendee);
      }
    } catch (err) {
      console.error("Failed to download registration QR pass(es) manually", err);
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
              <span className="material-symbols-outlined !text-3xl">check_circle</span>
            </div>
            <h1 className="text-2xl font-bold text-primary mb-1">
              {isSpotSuccess ? 'Spot Registration Active' : 'Registration Successful'}
            </h1>
            <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
              Your entry record for Kuppam Engineering College "AItheronML Symposium" has been logged and secured.
            </p>
          </div>

          {/* Clean registration details layout */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-md border border-outline-variant space-y-6 text-left">
            
            {/* Download Error Indicator */}
            {downloadError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-red-600 !text-sm">warning</span>
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
                  <span className="block text-[10px] uppercase font-bold text-on-surface-variant mb-0.5">Team Members</span>
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
