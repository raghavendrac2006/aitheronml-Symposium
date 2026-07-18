import QRCode from 'qrcode';
import { Attendee } from '../types';

/**
 * Formats the text encoded in the QR code:
 * - Single Event: `[participantId], [name/team] : [displayName],[eventName]`
 * - Double Events: `[morningId] & [afternoonId], [name/team] : [displayName],[morningEvent] & [afternoonEvent]`
 * 
 * @param attendee - The primary attendee (Morning event)
 * @param secondAttendee - The optional secondary attendee (Afternoon event)
 */
export function formatQrContent(attendee: Attendee, secondAttendee?: Attendee): string {
  const firstId = attendee.participantId || attendee.id;
  const isTeam = attendee.regType === 'team' || attendee.registrationType === 'team';
  const displayPrefix = isTeam ? 'team' : 'name';
  const displayName = isTeam ? (attendee.teamName || attendee.name) : attendee.name;

  if (secondAttendee) {
    const secondId = secondAttendee.participantId || secondAttendee.id;
    return `${firstId} & ${secondId}, ${displayPrefix} : ${displayName},${attendee.registeredEventTitle} & ${secondAttendee.registeredEventTitle}`;
  } else {
    return `${firstId}, ${displayPrefix} : ${displayName},${attendee.registeredEventTitle}`;
  }
}

/**
 * Generates a clean, professional QR Code registration ticket/pass in memory,
 * renders it onto a high-resolution canvas, and triggers a browser download.
 * Returns the generated QR Code data URL so that it can be rendered inside the UI.
 * 
 * @param attendee - The primary participant registration data (Morning event)
 * @param secondAttendee - The secondary participant registration data (Afternoon event, optional)
 * @returns A promise that resolves to the QR Code data URL
 */
export async function downloadQrPass(attendee: Attendee, secondAttendee?: Attendee): Promise<string> {
  const firstId = attendee.participantId || attendee.id;
  const isTeam = attendee.regType === 'team' || attendee.registrationType === 'team';
  const displayName = isTeam ? (attendee.teamName || attendee.name) : attendee.name;

  // Format QR content using the shared function
  const qrContent = formatQrContent(attendee, secondAttendee);

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

  // 2. Render unified pass on an HTML5 canvas in memory
  return new Promise<string>((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = secondAttendee ? 1040 : 920;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error("Unable to obtain 2D context from canvas"));
      return;
    }

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

        // --- Event Details & IDs Layout ---
        if (secondAttendee) {
          const secondId = secondAttendee.participantId || secondAttendee.id;

          // Event 1 (Morning)
          ctx.fillStyle = '#e2e8f0';
          ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
          ctx.fillText(attendee.registeredEventTitle, canvas.width / 2, 235);
          ctx.fillStyle = '#64748b';
          ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
          ctx.fillText(`MORNING EVENT  •  ID: ${firstId}`, canvas.width / 2, 255);

          // Event 2 (Afternoon)
          ctx.fillStyle = '#e2e8f0';
          ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
          ctx.fillText(secondAttendee.registeredEventTitle, canvas.width / 2, 300);
          ctx.fillStyle = '#64748b';
          ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
          ctx.fillText(`AFTERNOON EVENT  •  ID: ${secondId}`, canvas.width / 2, 320);

          // --- QR Code Area ---
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(140, 360, 320, 320, 16);
          ctx.fill();
          ctx.drawImage(qrImg, 150, 370, 300, 300);

          // --- Participant IDs Display at bottom ---
          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
          ctx.fillText('PARTICIPANT PASS ID(S)', canvas.width / 2, 730);

          ctx.fillStyle = '#3b82f6';
          ctx.font = 'bold 24px monospace';
          ctx.fillText(`${firstId} & ${secondId}`, canvas.width / 2, 775);

        } else {
          // Single Event Layout
          ctx.fillStyle = '#e2e8f0';
          ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
          ctx.fillText(attendee.registeredEventTitle, canvas.width / 2, 235);
          ctx.fillStyle = '#64748b';
          ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
          ctx.fillText('REGISTERED EVENT TRACK', canvas.width / 2, 255);

          // --- QR Code Area ---
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.roundRect(140, 290, 320, 320, 16);
          ctx.fill();
          ctx.drawImage(qrImg, 150, 300, 300, 300);

          // --- Participant ID Display at bottom ---
          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
          ctx.fillText('PARTICIPANT ID', canvas.width / 2, 660);

          ctx.fillStyle = '#3b82f6';
          ctx.font = 'bold 36px monospace';
          ctx.fillText(firstId, canvas.width / 2, 710);
        }

        // --- Ticket Footer Divider ---
        const footerDividerY = secondAttendee ? 820 : 750;
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(40, footerDividerY);
        ctx.lineTo(canvas.width - 40, footerDividerY);
        ctx.stroke();

        // Show instructions
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
        ctx.fillText('Keep this QR safe.', canvas.width / 2, footerDividerY + 40);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px system-ui, -apple-system, sans-serif';
        ctx.fillText('Show it at the Registration Desk for Check-in.', canvas.width / 2, footerDividerY + 65);

        // Timestamp
        const dateStr = attendee.registrationDate ? new Date(attendee.registrationDate).toLocaleString() : new Date().toLocaleString();
        ctx.fillStyle = '#475569';
        ctx.font = '10px monospace';
        ctx.fillText(`Issued: ${dateStr}`, canvas.width / 2, footerDividerY + 115);

        // 3. Trigger automatic browser download
        const finalDataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = finalDataUrl;
        link.download = `${firstId}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        resolve(qrDataUrl);
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
