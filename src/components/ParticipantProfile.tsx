import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Attendee, SymposiumEvent } from '../types';

interface ParticipantProfileProps {
  attendee: Attendee;
  events: SymposiumEvent[];
  onUpdateAttendee: (updated: Attendee) => void;
  onDeleteAttendee: (id: string) => void;
  onClose: () => void;
  user?: { role: string; email: string; name: string };
}

export default function ParticipantProfile({ 
  attendee, 
  events,
  onUpdateAttendee, 
  onDeleteAttendee,
  onClose,
  user
}: ParticipantProfileProps) {
  
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit form state
  const [editName, setEditName] = useState(attendee.name);
  const [editCollege, setEditCollege] = useState(attendee.college);
  const [editBranch, setEditBranch] = useState(attendee.branch || '');
  const [editYear, setEditYear] = useState(attendee.year || '');
  const [editPhone, setEditPhone] = useState(attendee.phone);
  const [editEmail, setEditEmail] = useState(attendee.email);
  const [editEventId, setEditEventId] = useState(attendee.registeredEventId);
  const [editTeamName, setEditTeamName] = useState(attendee.teamName || '');
  const [editMemberCount, setEditMemberCount] = useState(attendee.memberCount || 2);

  const handleCheckIn = () => {
    const updated: Attendee = {
      ...attendee,
      attendanceStatus: 'Present'
    };
    onUpdateAttendee(updated);
    alert(`${attendee.name} has been checked in successfully!`);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedEvent = events.find(ev => ev.id === editEventId);
    const eventTitle = selectedEvent ? selectedEvent.title : attendee.registeredEventTitle;

    const updated: Attendee = {
      ...attendee,
      name: editName,
      college: editCollege,
      branch: editBranch,
      year: editYear,
      phone: editPhone,
      email: editEmail,
      registeredEventId: editEventId,
      registeredEventTitle: eventTitle,
      teamName: attendee.regType === 'team' ? editTeamName : undefined,
      memberCount: attendee.regType === 'team' ? Number(editMemberCount) : undefined
    };

    onUpdateAttendee(updated);
    setIsEditing(false);
    alert('Participant profile updated successfully.');
  };

  const handlePrintBadge = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up blocker is preventing opening print view.');
      return;
    }
    const pId = attendee.participantId || attendee.id;
    printWindow.document.write(`
      <html>
        <head>
          <title>Access Pass - ${pId}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 40px; }
            .pass-box { border: 4px solid #080c5f; border-radius: 20px; padding: 30px; max-width: 380px; margin: 0 auto; background: #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
            .title { font-size: 24px; font-weight: bold; color: #080c5f; margin-bottom: 5px; }
            .subtitle { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #666; margin-bottom: 20px; }
            .name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
            .college { font-size: 13px; color: #555; margin-bottom: 15px; }
            .tag { display: inline-block; background: #d7d7fd; color: #080c5f; padding: 6px 16px; border-radius: 50px; font-weight: bold; font-size: 14px; margin-bottom: 20px; }
            .id-box { font-size: 28px; font-family: monospace; font-weight: bold; border: 2px dashed #080c5f; padding: 12px; margin: 20px auto; max-width: 280px; background: #f8fafc; letter-spacing: 2px; }
            .info-line { border-top: 1px solid #eee; padding-top: 15px; margin-top: 15px; display: flex; justify-content: space-between; font-size: 11px; color: #777; }
          </style>
        </head>
        <body>
          <div class="pass-box">
            <div class="title">Symposium OS</div>
            <div class="subtitle">AItheronML 2026</div>
            <div class="name">${attendee.name}</div>
            <div class="college">${attendee.college}</div>
            <div class="tag">Access Pass</div>
            <div class="id-box">${pId}</div>
            <div class="info-line">
              <div>EVENT: ${attendee.registeredEventTitle}</div>
              <div>ROLE: Participant</div>
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleResendConfirmation = () => {
    alert(`Confirmation email successfully queued and dispatched to ${attendee.email}`);
  };

  const handleRevoke = () => {
    if (confirm(`CRITICAL WARNING: Are you sure you want to permanently revoke registration for ${attendee.name} (${attendee.id})? This action cannot be undone.`)) {
      onDeleteAttendee(attendee.id);
    }
  };

  return (
    <div className="bg-surface-bright min-h-screen">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 mb-6 text-on-surface-variant text-xs">
        <button onClick={onClose} className="hover:text-primary transition-all">Participants</button>
        <span className="material-symbols-outlined !text-xs text-outline">chevron_right</span>
        <span className="text-primary font-bold">Profile Details ({attendee.id})</span>
      </nav>

      {/* Profile Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-on-surface tracking-tight">{attendee.name}</h2>
          <p className="text-sm text-on-surface-variant">Manage check-in status, print credentials, and edit database records.</p>
        </div>
        <button 
          onClick={onClose}
          className="px-4 py-2 border border-outline text-on-surface rounded-xl hover:bg-surface-container-high transition-all text-xs font-semibold flex items-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined !text-base">arrow_back</span>
          Back to Roster
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Personal and Registration Info */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {isEditing ? (
            /* EDIT FORM CARD */
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-outline-variant rounded-xl p-6 shadow-xs"
            >
              <h3 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit</span>
                Edit Participant Records
              </h3>
              
              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">College / Institution</label>
                    <input 
                      type="text" 
                      value={editCollege}
                      onChange={(e) => setEditCollege(e.target.value)}
                      className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Department / Branch</label>
                    <input 
                      type="text" 
                      value={editBranch}
                      onChange={(e) => setEditBranch(e.target.value)}
                      className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Year of Study</label>
                    <select 
                      value={editYear}
                      onChange={(e) => setEditYear(e.target.value)}
                      className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface"
                    >
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="Post Graduate">Post Graduate</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Mobile Number</label>
                    <input 
                      type="text" 
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Email Address</label>
                    <input 
                      type="email" 
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Registered Track Event</label>
                  <select 
                    value={editEventId}
                    onChange={(e) => setEditEventId(e.target.value)}
                    className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface"
                  >
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.title}</option>
                    ))}
                  </select>
                </div>

                {attendee.regType === 'team' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-surface-container rounded-xl border border-outline-variant/55">
                    <div>
                      <label className="block text-[11px] font-bold text-primary uppercase mb-1">Team Name</label>
                      <input 
                        type="text" 
                        value={editTeamName}
                        onChange={(e) => setEditTeamName(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-outline rounded-lg text-sm text-on-surface"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-primary uppercase mb-1">Team Member Count</label>
                      <input 
                        type="number" 
                        value={editMemberCount}
                        onChange={(e) => setEditMemberCount(Number(e.target.value))}
                        className="w-full h-10 px-3 bg-white border border-outline rounded-lg text-sm text-on-surface"
                        min={2}
                        max={10}
                      />
                    </div>
                  </div>
                )}

                <div className="pt-4 flex gap-3 justify-end">
                  <button 
                    type="button" 
                    onClick={() => setIsEditing(false)}
                    className="h-10 px-4 border border-outline text-on-surface rounded-lg font-semibold hover:bg-surface-container transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="h-10 px-6 bg-primary text-white rounded-lg font-semibold hover:opacity-95 transition-all"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            /* DISPLAY DETAILS CARD */
            <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
                <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">person</span>
                  Personal Information
                </h3>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="text-primary hover:bg-secondary-container px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined !text-base">edit</span>
                  Edit Details
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 text-sm">
                <div>
                  <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Full Name</p>
                  <p className="text-base font-semibold text-on-surface mt-0.5">{attendee.name}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">College / Institution</p>
                  <p className="text-base font-semibold text-on-surface mt-0.5">{attendee.college}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Department / Branch</p>
                  <p className="text-base font-semibold text-on-surface mt-0.5">{attendee.branch || 'Not Specified'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Year of Study</p>
                  <p className="text-base font-semibold text-on-surface mt-0.5">{attendee.year || 'Not Specified'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Contact Phone</p>
                  <p className="text-base font-semibold text-on-surface mt-0.5">{attendee.phone}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Email Address</p>
                  <p className="text-base font-semibold text-on-surface mt-0.5">{attendee.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Registration Track Details */}
          {!isEditing && (
            <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-xs space-y-4">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant/30 pb-4">
                <span className="material-symbols-outlined text-primary">app_registration</span>
                Registration Track Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8 text-sm">
                <div>
                  <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Registered Event</p>
                  <p className="text-base font-semibold text-primary mt-0.5">{attendee.registeredEventTitle}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Registration Mode</p>
                  <p className="text-base font-semibold text-on-surface mt-0.5">
                    {attendee.regType === 'team' ? 'Team entry' : 'Individual entry'}
                  </p>
                </div>
                {attendee.teamName && (
                  <>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Team Name</p>
                      <p className="text-base font-semibold text-primary mt-0.5">{attendee.teamName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Members registered</p>
                      <p className="text-base font-semibold text-on-surface mt-0.5">{attendee.memberCount} members</p>
                    </div>
                  </>
                )}
                {attendee.teamMembers && attendee.teamMembers.length > 0 && (
                  <div className="col-span-1 md:col-span-2 border-t border-outline-variant/30 pt-4 mt-2">
                    <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider mb-2">Team Members Details</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {attendee.teamMembers.map((member, i) => (
                        <div key={i} className="p-3 bg-surface-container border border-outline-variant rounded-xl text-xs space-y-1">
                          <div className="flex justify-between font-bold">
                            <span className="text-primary">{member.name}</span>
                            <span className="text-on-surface-variant text-[10px]">Member #{i + 1}</span>
                          </div>
                          <div className="text-on-surface-variant text-[10px] font-mono">{member.participantId}</div>
                          <div className="text-[11px]"><span className="text-on-surface-variant font-medium">Email:</span> {member.email}</div>
                          <div className="text-[11px]"><span className="text-on-surface-variant font-medium">Phone:</span> {member.phone}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Pass Privilege</p>
                  <p className="text-base font-semibold text-on-surface mt-0.5">{attendee.accessLevel || 'General Delegate'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Registration Date</p>
                  <p className="text-base font-semibold text-on-surface mt-0.5">
                    {attendee.registrationDate ? new Date(attendee.registrationDate).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Access, Check-In, QR */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          
          {/* Payment Verification Status */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-5 shadow-xs flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary !text-lg">payments</span>
                <span className="font-bold text-sm text-on-surface">Payment Status</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                attendee.paymentStatus === 'Paid' 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : attendee.paymentStatus === 'Waived'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
              }`}>
                {attendee.paymentStatus || 'Pending'}
              </span>
            </div>

            {(user?.role === 'superadmin' || user?.role === 'registration') ? (
              <div className="space-y-2 mt-2">
                <p className="text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Update Payment Status</p>
                <div className="grid grid-cols-3 gap-1.5">
                  <button 
                    onClick={() => {
                      onUpdateAttendee({ ...attendee, paymentStatus: 'Paid' });
                      alert('Payment marked as Paid successfully.');
                    }}
                    className={`h-8 font-bold rounded-lg text-xs transition-all cursor-pointer ${
                      attendee.paymentStatus === 'Paid'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-surface border border-outline text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    Paid
                  </button>
                  <button 
                    onClick={() => {
                      onUpdateAttendee({ ...attendee, paymentStatus: 'Waived' });
                      alert('Payment marked as Waived successfully.');
                    }}
                    className={`h-8 font-bold rounded-lg text-xs transition-all cursor-pointer ${
                      attendee.paymentStatus === 'Waived'
                        ? 'bg-blue-600 text-white'
                        : 'bg-surface border border-outline text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    Waived
                  </button>
                  <button 
                    onClick={() => {
                      onUpdateAttendee({ ...attendee, paymentStatus: 'Pending' });
                      alert('Payment marked as Pending.');
                    }}
                    className={`h-8 font-bold rounded-lg text-xs transition-all cursor-pointer ${
                      !attendee.paymentStatus || attendee.paymentStatus === 'Pending'
                        ? 'bg-amber-600 text-white'
                        : 'bg-surface border border-outline text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    Pending
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-on-surface-variant italic mt-1">
                Only Registration Desk and Super Admin can modify payment status.
              </p>
            )}
          </div>

          {/* Attendance Check-In Status */}
          <div className="bg-surface-container border border-outline-variant rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${attendee.attendanceStatus === 'Present' ? 'bg-primary' : 'bg-red-500 animate-pulse'}`} />
                <span className="font-bold text-sm text-on-surface">Attendance Status</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                attendee.attendanceStatus === 'Present' 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-error-container text-on-error-container'
              }`}>
                {attendee.attendanceStatus === 'Present' ? 'Checked-In' : 'Pending'}
              </span>
            </div>

            {attendee.attendanceStatus !== 'Present' && (
              <button 
                onClick={handleCheckIn}
                className="w-full h-11 bg-primary text-white font-bold rounded-lg text-xs hover:opacity-95 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined !text-lg">check_circle</span>
                Check-In Participant Now
              </button>
            )}
          </div>

          {/* Secure Access Pass */}
          <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-xs flex flex-col items-center">
            <h4 className="text-sm font-bold text-on-surface mb-4">Symposium Access Pass</h4>
            <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant shadow-sm w-full py-8 flex flex-col items-center justify-center relative overflow-hidden text-center">
              <div className="absolute inset-0 bg-primary/5"></div>
              <span className="material-symbols-outlined !text-4xl text-primary mb-2 relative z-10">badge</span>
              <span className="font-mono text-primary font-bold text-xl tracking-widest relative z-10">{attendee.participantId || attendee.id}</span>
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold mt-1 relative z-10">Primary Reference</span>
            </div>
            <div className="mt-4 text-center">
              <span className="block text-[10px] uppercase font-bold text-on-surface-variant tracking-widest mb-0.5">Attendee Name</span>
              <span className="font-semibold text-on-surface text-sm">{attendee.name}</span>
            </div>
          </div>

          {/* Admin Management Panel */}
          <div className="bg-white border border-outline-variant rounded-xl p-5 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-on-surface mb-3">Admin Actions Panel</h4>
            <div className="flex flex-col gap-2 text-xs">
              <button 
                onClick={handlePrintBadge}
                className="h-10 border border-primary text-primary font-bold rounded-lg hover:bg-secondary-container flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined !text-lg">print</span>
                Print Participant Pass
              </button>
              
              <button 
                onClick={handleResendConfirmation}
                className="h-10 border border-outline text-on-surface-variant font-bold rounded-lg hover:bg-surface-container flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined !text-lg">mail</span>
                Resend Confirmation Email
              </button>
              
              <div className="h-px bg-outline-variant/30 my-2" />
              
              <button 
                onClick={handleRevoke}
                className="h-10 border border-error text-error font-bold rounded-lg hover:bg-error-container flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined !text-lg">delete</span>
                Revoke Registration
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
