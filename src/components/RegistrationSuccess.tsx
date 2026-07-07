import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Attendee } from '../types';
import { Clipboard, Check, Download, Home } from 'lucide-react';

interface RegistrationSuccessProps {
  attendee: Attendee;
  onReturnHome: () => void;
  isSpotSuccess?: boolean;
}

export default function RegistrationSuccess({ 
  attendee, 
  onReturnHome, 
  isSpotSuccess = false 
}: RegistrationSuccessProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    const pId = attendee.participantId || attendee.id;
    navigator.clipboard.writeText(pId);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadPass = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background slate-blue
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dynamic decorative borders
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    // Title Header
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AItheronML Symposium 2026', canvas.width / 2, 75);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('OFFICIAL PARTICIPANT PASS', canvas.width / 2, 110);

    // Divider line
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, 135);
    ctx.lineTo(canvas.width - 50, 135);
    ctx.stroke();

    // Participant Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(attendee.name, canvas.width / 2, 185);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('PARTICIPANT NAME', canvas.width / 2, 210);

    // Participant ID (Primary reference)
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(attendee.participantId || attendee.id, canvas.width / 2, 260);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('PARTICIPANT ID', canvas.width / 2, 285);

    // Registered Event
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.fillText(attendee.registeredEventTitle, canvas.width / 2, 325);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText('REGISTERED EVENT', canvas.width / 2, 345);

    // Registration Date
    const dateStr = attendee.registrationDate ? new Date(attendee.registrationDate).toLocaleString() : new Date().toLocaleString();
    ctx.fillStyle = '#64748b';
    ctx.font = '11px monospace';
    ctx.fillText(`Issued: ${dateStr}`, canvas.width / 2, 375);

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `Pass_${attendee.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to export Canvas to PNG image", err);
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
            
            {/* Copy Toast Indicator */}
            {copied && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-700 text-xs font-semibold rounded-lg flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span>Participant ID Copied Successfully</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <span className="block text-[10px] uppercase font-bold text-on-surface-variant mb-0.5">Participant ID</span>
                <span className="text-sm font-mono font-bold text-primary">{attendee.participantId || attendee.id}</span>
              </div>

              <div>
                <span className="block text-[10px] uppercase font-bold text-on-surface-variant mb-0.5">Registered Event</span>
                <span className="text-sm font-semibold text-on-surface">{attendee.registeredEventTitle}</span>
              </div>

              <div>
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
              Copy Participant ID
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
