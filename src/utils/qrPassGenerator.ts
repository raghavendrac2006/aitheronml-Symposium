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

  let teamMembersSuffix = '';
  if (isTeam && attendee.teamMembers && attendee.teamMembers.length > 0) {
    const memberNames = attendee.teamMembers.map(m => m.name).join(', ');
    teamMembersSuffix = `, members: ${memberNames}`;
  }

  if (secondAttendee) {
    const secondId = secondAttendee.participantId || secondAttendee.id;
    return `${firstId} & ${secondId}, ${displayPrefix} : ${displayName}${teamMembersSuffix},${attendee.registeredEventTitle} & ${secondAttendee.registeredEventTitle}`;
  } else {
    return `${firstId}, ${displayPrefix} : ${displayName}${teamMembersSuffix},${attendee.registeredEventTitle}`;
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
        // --- 1. Sleek Cyberpunk Tech Background ---
        ctx.fillStyle = '#090a1e'; // Midnight space navy
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw subtle technological grid pattern
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.03)';
        ctx.lineWidth = 1;
        const gridGap = 30;
        for (let x = 0; x < canvas.width; x += gridGap) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridGap) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        // Draw abstract glowing technological orbits
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.06)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 200, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 300, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(canvas.width, canvas.height, 220, 0, Math.PI * 2);
        ctx.stroke();

        // --- 2. Premium Glowing Neon Borders ---
        ctx.shadowColor = '#3b82f6';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
        ctx.lineWidth = 8;
        ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

        ctx.shadowBlur = 0; // Reset shadow glow
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

        ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);

        // --- 3. Premium Header Card Box ---
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(40, 45, canvas.width - 80, 80, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#60a5fa'; // Neon light blue
        ctx.font = '900 23px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('AItheronML Symposium', canvas.width / 2, 80);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
        ctx.fillText('KUPPAM ENGINEERING COLLEGE  •  DEPT OF CSE', canvas.width / 2, 105);

        // --- 4. Participant Badge Card ---
        ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(40, 145, canvas.width - 80, 85, 16);
        ctx.fill();
        ctx.stroke();

        // Name text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 21px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        const titleText = isTeam ? `Team: ${displayName}` : displayName;
        ctx.fillText(titleText, 60, 182);

        // Category Tag Badge on the right
        ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(canvas.width - 185, 161, 125, 26, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#10b981'; // Emerald Green accent
        ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(isTeam ? 'TEAM PASS' : 'INDIVIDUAL PASS', canvas.width - 122, 177);

        // Subtitle role text
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(isTeam ? `LEADER: ${attendee.name}` : 'OFFICIAL PARTICIPANT', 60, 204);

        if (isTeam && attendee.teamMembers && attendee.teamMembers.length > 0) {
          const names = attendee.teamMembers.map(m => m.name).join(', ');
          ctx.fillStyle = '#475569';
          ctx.font = '500 9px system-ui, -apple-system, sans-serif';
          ctx.fillText(`MEMBERS: ${names}`, 60, 218);
        }

        // --- 5. Event Info Cards ---
        if (secondAttendee) {
          const secondId = secondAttendee.participantId || secondAttendee.id;

          // Event 1 (Morning Card)
          ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.beginPath();
          ctx.roundRect(40, 250, canvas.width - 80, 52, 10);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#e2e8f0';
          ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`M: ${attendee.registeredEventTitle}`, 55, 273);
          ctx.fillStyle = '#3b82f6';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'right';
          ctx.fillText(`ID: ${firstId}`, canvas.width - 55, 273);
          ctx.fillStyle = '#64748b';
          ctx.font = '8px system-ui, -apple-system, sans-serif';
          ctx.fillText('MORNING EVENT DESK', canvas.width - 55, 288);

          // Event 2 (Afternoon Card)
          ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.beginPath();
          ctx.roundRect(40, 312, canvas.width - 80, 52, 10);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#e2e8f0';
          ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`A: ${secondAttendee.registeredEventTitle}`, 55, 335);
          ctx.fillStyle = '#3b82f6';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'right';
          ctx.fillText(`ID: ${secondId}`, canvas.width - 55, 335);
          ctx.fillStyle = '#64748b';
          ctx.font = '8px system-ui, -apple-system, sans-serif';
          ctx.fillText('AFTERNOON EVENT DESK', canvas.width - 55, 350);

          // --- 6. QR Code Area with Glowing Neon Border Frame ---
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#3b82f6';
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.roundRect(140, 385, 320, 320, 16);
          ctx.fill();
          ctx.shadowBlur = 0; // Reset

          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 3;
          ctx.strokeRect(138, 383, 324, 324);
          ctx.drawImage(qrImg, 150, 395, 300, 300);

          // --- 7. Bottom Unified ID Badge Block ---
          ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(100, 735, 400, 85, 12);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('UNIFIED ENTRY PASS IDS', canvas.width / 2, 755);

          ctx.fillStyle = '#60a5fa';
          ctx.font = 'bold 24px monospace';
          ctx.fillText(`${firstId}  •  ${secondId}`, canvas.width / 2, 784);

          const memberCount = isTeam ? 1 + (attendee.teamMembers || []).length : 1;
          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
          ctx.fillText(`TOTAL MEMBERS: ${memberCount}`, canvas.width / 2, 804);

        } else {
          // --- Single Event Layout ---
          ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
          ctx.beginPath();
          ctx.roundRect(40, 245, canvas.width - 80, 52, 10);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#e2e8f0';
          ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(attendee.registeredEventTitle, 55, 275);
          ctx.fillStyle = '#64748b';
          ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText('REGISTERED EVENT TRACK', canvas.width - 55, 275);

          // --- 6. QR Code Area with Glowing Neon Border Frame ---
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#3b82f6';
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.roundRect(140, 315, 320, 320, 16);
          ctx.fill();
          ctx.shadowBlur = 0; // Reset

          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 3;
          ctx.strokeRect(138, 313, 324, 324);
          ctx.drawImage(qrImg, 150, 325, 300, 300);

          // --- 7. Bottom ID Badge Block ---
          ctx.fillStyle = 'rgba(30, 41, 59, 0.4)';
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(120, 665, 360, 85, 12);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('PARTICIPANT IDENTIFICATION ID', canvas.width / 2, 685);

          ctx.fillStyle = '#60a5fa';
          ctx.font = 'bold 28px monospace';
          ctx.fillText(firstId, canvas.width / 2, 712);

          const memberCount = isTeam ? 1 + (attendee.teamMembers || []).length : 1;
          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
          ctx.fillText(`TOTAL MEMBERS: ${memberCount}`, canvas.width / 2, 735);
        }

        // --- 8. Ticket Footer Section ---
        const footerDividerY = secondAttendee ? 840 : 770;
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(40, footerDividerY);
        ctx.lineTo(canvas.width - 40, footerDividerY);
        ctx.stroke();

        // Footer Instructions text
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Please download and keep this QR Pass safe.', canvas.width / 2, footerDividerY + 35);

        ctx.fillStyle = '#64748b';
        ctx.font = '10px system-ui, -apple-system, sans-serif';
        ctx.fillText('Must show this QR Code at the entry desk for check-in.', canvas.width / 2, footerDividerY + 58);

        // Issued Timestamp
        const dateStr = attendee.registrationDate ? new Date(attendee.registrationDate).toLocaleString() : new Date().toLocaleString();
        ctx.fillStyle = '#475569';
        ctx.font = '9px monospace';
        ctx.fillText(`Issued: ${dateStr}`, canvas.width / 2, footerDividerY + 95);

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
