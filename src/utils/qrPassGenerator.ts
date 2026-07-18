import QRCode from 'qrcode';
import { Attendee } from '../types';

/**
 * Generates a clean, professional QR Code registration ticket/pass in memory,
 * renders it onto a high-resolution canvas, and triggers a browser download.
 * 
 * @param attendee - The participant registration data
 * @returns A promise that resolves when the download is triggered
 */
export async function downloadQrPass(attendee: Attendee): Promise<void> {
  const participantId = attendee.participantId || attendee.id;
  const eventName = attendee.registeredEventTitle;
  
  // Format QR content:
  // For Individual: [participantId], name : [name],[eventName]
  // For Team: [participantId], team : [teamName],[eventName]
  const isTeam = attendee.regType === 'team' || attendee.registrationType === 'team';
  const displayPrefix = isTeam ? 'team' : 'name';
  const displayName = isTeam ? (attendee.teamName || attendee.name) : attendee.name;
  
  const qrContent = `${participantId}, ${displayPrefix} : ${displayName},${eventName}`;

  // 1. Generate high-quality QR code data URL (High error correction level, minimal margin)
  const qrDataUrl = await QRCode.toDataURL(qrContent, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 400,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });

  // 2. Render visually stunning pass on an HTML5 canvas in memory
  return new Promise<void>((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 920;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error("Unable to obtain 2D context from canvas"));
      return;
    }

    // Load the QR Code image
    const qrImg = new Image();
    qrImg.onload = () => {
      try {
        // Draw Pass Background (Sleek slate-dark tech card)
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#0f172a'); // slate-900
        gradient.addColorStop(1, '#020617'); // slate-950
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw premium double border
        ctx.strokeStyle = '#3b82f6'; // primary blue
        ctx.lineWidth = 8;
        ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

        ctx.strokeStyle = '#1e293b'; // subtle inner frame
        ctx.lineWidth = 2;
        ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

        // --- Ticket Header ---
        ctx.fillStyle = '#3b82f6';
        ctx.font = '900 24px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('AItheronML Symposium', canvas.width / 2, 70);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
        ctx.fillText('KUPPAM ENGINEERING COLLEGE', canvas.width / 2, 98);

        // Subtle divider line
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(40, 120);
        ctx.lineTo(canvas.width - 40, 120);
        ctx.stroke();

        // --- Participant Details ---
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
        
        const titleText = isTeam ? `Team: ${displayName}` : displayName;
        ctx.fillText(titleText, canvas.width / 2, 165);

        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
        ctx.fillText(isTeam ? `TEAM LEADER: ${attendee.name}` : 'OFFICIAL PARTICIPANT', canvas.width / 2, 190);

        // Registered Event
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
        ctx.fillText(eventName, canvas.width / 2, 235);

        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
        ctx.fillText('REGISTERED EVENT TRACK', canvas.width / 2, 255);

        // --- QR Code Area ---
        // Draw white container box for high contrast QR scanning
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(140, 290, 320, 320, 16);
        ctx.fill();

        // Draw QR Image inside container box
        ctx.drawImage(qrImg, 150, 300, 300, 300);

        // --- Participant ID Footer ---
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        ctx.fillText('PARTICIPANT ID', canvas.width / 2, 660);

        ctx.fillStyle = '#3b82f6';
        ctx.font = 'bold 36px monospace';
        ctx.fillText(participantId, canvas.width / 2, 710);

        // --- Ticket Footer Divider ---
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(40, 750);
        ctx.lineTo(canvas.width - 40, 750);
        ctx.stroke();

        // Show warnings / instructions
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
        ctx.fillText('Keep this QR safe.', canvas.width / 2, 790);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px system-ui, -apple-system, sans-serif';
        ctx.fillText('Show it at the Registration Desk for Check-in.', canvas.width / 2, 815);

        // Timestamp
        const dateStr = attendee.registrationDate ? new Date(attendee.registrationDate).toLocaleString() : new Date().toLocaleString();
        ctx.fillStyle = '#475569';
        ctx.font = '10px monospace';
        ctx.fillText(`Issued: ${dateStr}`, canvas.width / 2, 865);

        // 3. Trigger automatic browser download
        const finalDataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = finalDataUrl;
        link.download = `${participantId}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        resolve();
      } catch (err) {
        reject(err);
      }
    };

    qrImg.onerror = (e) => {
      reject(new Error("Failed to load QR image resource: " + e));
    };

    qrImg.src = qrDataUrl;
  });
}
