import React, { useState } from 'react';
import { motion } from 'motion/react';
import { SymposiumEvent, Attendee } from '../types';
import { saveAttendeeToFirestore } from '../firebaseSync';

interface PublicRegistrationProps {
  events: SymposiumEvent[];
  attendees?: Attendee[];
  onRegistrationSuccess: (newAttendee: Attendee, extraMembers?: Attendee[]) => void;
  onBackToLogin: () => void;
  isSpotRegistration?: boolean; // if true, bypasses landing decoration, simplifies header for admin portal
}

export default function PublicRegistration({ 
  events, 
  attendees = [],
  onRegistrationSuccess, 
  onBackToLogin,
  isSpotRegistration = false
}: PublicRegistrationProps) {
  // Form state
  const [fullName, setFullName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [eventId, setEventId] = useState('');
  const [regType, setRegType] = useState<'individual' | 'team'>('individual');
  const [teamName, setTeamName] = useState('');
  const [teamMembersInput, setTeamMembersInput] = useState<Array<{ name: string; phone: string; email: string }>>([
    { name: '', phone: '', email: '' }
  ]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddMember = () => {
    if (teamMembersInput.length >= 9) {
      alert('Maximum of 10 team members allowed (Leader + 9 Members).');
      return;
    }
    setTeamMembersInput([...teamMembersInput, { name: '', phone: '', email: '' }]);
  };

  const handleRemoveMember = (idx: number) => {
    if (teamMembersInput.length <= 1) {
      alert('A team must have at least 2 members (Leader + 1 Member).');
      return;
    }
    setTeamMembersInput(teamMembersInput.filter((_, i) => i !== idx));
  };

  const handleMemberChange = (idx: number, field: 'name' | 'phone' | 'email', val: string) => {
    const updated = [...teamMembersInput];
    updated[idx][field] = val;
    setTeamMembersInput(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!fullName || !collegeName || !branch || !year || !mobile || !email || !eventId) {
      setError('Please fill out all required fields.');
      setLoading(false);
      return;
    }

    if (regType === 'team') {
      if (!teamName) {
        setError('Please provide a team name for Team Entry.');
        setLoading(false);
        return;
      }
      for (let i = 0; i < teamMembersInput.length; i++) {
        const m = teamMembersInput[i];
        if (!m.name.trim() || !m.phone.trim() || !m.email.trim()) {
          setError(`Please fill in all details for Team Member #${i + 1}.`);
          setLoading(false);
          return;
        }
      }
    }

    try {
      // Find event details
      const selectedEvent = events.find(ev => ev.id === eventId);
      const eventTitle = selectedEvent ? selectedEvent.title : 'AItheronML Symposium';

      // Generate sequential readable Participant ID (SYM-000001 format)
      let nextNum = 1;
      const allAtts = [...attendees];
      if (allAtts.length === 0) {
        // Fallback: search localStorage if attendees not passed
        try {
          const stored = localStorage.getItem('ai_symposium_attendees');
          if (stored) {
            allAtts.push(...JSON.parse(stored));
          }
        } catch (localErr) {
          console.warn("Failed to read attendees from cache", localErr);
        }
      }

      if (allAtts.length > 0) {
        const symIds = allAtts
          .map(a => {
            const m = a.participantId?.match(/^SYM-(\d+)$/);
            return m ? parseInt(m[1], 10) : 0;
          });
        const maxId = Math.max(...symIds, 0);
        nextNum = maxId + 1;
      } else {
        nextNum = 1;
      }

      const leaderParticipantId = `SYM-${String(nextNum).padStart(6, '0')}`;
      const sharedTeamId = regType === 'team' ? `TEAM-${leaderParticipantId}` : '';

      const membersToSave: Attendee[] = [];
      const teamMembersDataForLeader: Array<{ name: string; phone: string; email: string; participantId: string }> = [];

      if (regType === 'team') {
        teamMembersInput.forEach((m, index) => {
          const mIdNum = nextNum + 1 + index;
          const mParticipantId = `SYM-${String(mIdNum).padStart(6, '0')}`;
          
          const memberAttendee: Attendee = {
            id: mParticipantId,
            participantId: mParticipantId,
            name: m.name.trim(),
            college: collegeName.trim(),
            branch: branch.trim(),
            year: year,
            phone: m.phone.trim(),
            email: m.email.trim().toLowerCase(),
            eventId: eventId,
            registeredEventId: eventId,
            registeredEventTitle: eventTitle,
            teamId: sharedTeamId,
            registrationType: 'team',
            regType: 'team',
            attendanceStatus: 'Pending',
            paymentStatus: 'Pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            teamName: teamName.trim(),
            registrationDate: new Date().toISOString(),
            accessLevel: 'Team Member Pass',
            secureToken: `${mParticipantId}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
          };

          membersToSave.push(memberAttendee);
          teamMembersDataForLeader.push({
            name: m.name.trim(),
            phone: m.phone.trim(),
            email: m.email.trim().toLowerCase(),
            participantId: mParticipantId
          });
        });
      }

      // Create attendee object matching Section 11 schema perfectly
      const leaderAttendee: Attendee = {
        id: leaderParticipantId,
        participantId: leaderParticipantId,
        name: fullName.trim(),
        college: collegeName.trim(),
        branch: branch.trim(),
        year: year,
        phone: mobile.trim(),
        email: email.trim().toLowerCase(),
        eventId: eventId,
        registeredEventId: eventId,
        registeredEventTitle: eventTitle,
        teamId: sharedTeamId,
        registrationType: regType,
        regType: regType,
        attendanceStatus: 'Pending',
        paymentStatus: 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        teamName: regType === 'team' ? teamName.trim() : undefined,
        memberCount: regType === 'team' ? 1 + teamMembersInput.length : undefined,
        teamMembers: regType === 'team' ? teamMembersDataForLeader : undefined,
        registrationDate: new Date().toISOString(),
        accessLevel: regType === 'team' ? 'Team Leader Pass' : 'Individual Pass',
        secureToken: `${leaderParticipantId}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
      };

      // Save leader to Firestore
      await saveAttendeeToFirestore(leaderAttendee);

      // Save other members to Firestore
      for (const m of membersToSave) {
        await saveAttendeeToFirestore(m);
      }

      // Trigger callback with success data
      onRegistrationSuccess(leaderAttendee, membersToSave);

    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to complete registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full min-h-screen bg-background text-on-background flex flex-col items-center ${isSpotRegistration ? 'p-0' : 'py-8'}`}>
      {!isSpotRegistration && (
        <header className="w-full max-w-2xl px-6 py-4 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-md overflow-hidden text-white font-bold text-lg">
              AI
            </div>
            <div>
              <h1 className="font-headline-sm text-lg font-bold text-primary">AItheronML</h1>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Symposium OS</p>
            </div>
          </div>
          <button 
            onClick={onBackToLogin}
            className="text-primary hover:bg-secondary-container px-4 py-2 rounded-full font-semibold text-xs transition-all"
          >
            Sign In as Admin
          </button>
        </header>
      )}

      <main className="w-full max-w-2xl px-4 flex-grow flex flex-col justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-surface-container-lowest rounded-2xl shadow-lg border border-outline-variant p-6 md:p-8"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-on-surface mb-2">
              {isSpotRegistration ? 'Spot Registration Intake' : 'Event Registration'}
            </h2>
            <p className="text-sm text-on-surface-variant">
              {isSpotRegistration 
                ? 'High-speed intake optimized for on-site participant check-in.' 
                : 'Join the next frontier of Machine Learning innovation. Please fill out your details below.'
              }
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-xl flex items-center gap-2 text-sm font-semibold">
              <span className="material-symbols-outlined shrink-0 text-red-600">error</span>
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-surface-container-high border-t-primary animate-spin"></div>
              <p className="text-sm text-on-surface-variant animate-pulse font-medium">
                {isSpotRegistration ? 'Creating spot record & entry badge...' : 'Securing your spot at AItheronML...'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-primary uppercase ml-1">Full Name</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Elena Rodriguez" 
                  className="w-full h-12 px-4 rounded-lg border border-outline bg-transparent text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                  required
                />
              </div>

              {/* College & Branch */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-primary uppercase ml-1">College Name</label>
                  <input 
                    type="text" 
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder="e.g. Stanford University" 
                    className="w-full h-12 px-4 rounded-lg border border-outline bg-transparent text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-primary uppercase ml-1">Department / Branch</label>
                  <input 
                    type="text" 
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="e.g. Computer Science Engineering" 
                    className="w-full h-12 px-4 rounded-lg border border-outline bg-transparent text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                    required
                  />
                </div>
              </div>

              {/* Year & Mobile */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-primary uppercase ml-1">Academic Year</label>
                  <select 
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full h-12 px-4 rounded-lg border border-outline bg-transparent text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm appearance-none"
                    required
                  >
                    <option value="">Select Academic Year</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="Post Graduate">Post Graduate</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-primary uppercase ml-1">Mobile Number</label>
                  <input 
                    type="tel" 
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="e.g. +91 9876543210" 
                    className="w-full h-12 px-4 rounded-lg border border-outline bg-transparent text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                    required
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-primary uppercase ml-1">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. elena@research.edu" 
                  className="w-full h-12 px-4 rounded-lg border border-outline bg-transparent text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                  required
                />
              </div>

              {/* Event Track Selection */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-primary uppercase ml-1">Event Track Selection</label>
                <select 
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="w-full h-12 px-4 rounded-lg border border-outline bg-transparent text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm appearance-none"
                  required
                >
                  <option value="">Choose a Symposium Track Event</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({ev.track} Track)
                    </option>
                  ))}
                </select>
              </div>

              {/* Registration Type Radio Group */}
              <div className="py-2 border-t border-b border-outline-variant/30">
                <label className="block text-xs font-semibold text-primary uppercase mb-3 ml-1">Registration Type</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="regType" 
                      checked={regType === 'individual'} 
                      onChange={() => setRegType('individual')}
                      className="w-4 h-4 text-primary border-outline focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-on-surface group-hover:text-primary transition-colors">Individual</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="radio" 
                      name="regType" 
                      checked={regType === 'team'} 
                      onChange={() => setRegType('team')}
                      className="w-4 h-4 text-primary border-outline focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-on-surface group-hover:text-primary transition-colors">Team Entry</span>
                  </label>
                </div>
              </div>

              {/* Dynamic Team Fields */}
              {regType === 'team' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 pt-2 border-l-2 border-primary/20 pl-4"
                >
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-primary uppercase ml-1">Team Name</label>
                    <input 
                      type="text" 
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="e.g. Neural Frontiers Lab" 
                      className="w-full h-12 px-4 rounded-lg border border-outline bg-transparent text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-primary uppercase">Team Members</label>
                      <button
                        type="button"
                        onClick={handleAddMember}
                        className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined !text-sm">add</span>
                        Add Member
                      </button>
                    </div>

                    {teamMembersInput.map((member, index) => (
                      <div key={index} className="p-4 bg-surface-container border border-outline rounded-xl space-y-3 relative">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-on-surface-variant">Team Member #{index + 1}</span>
                          {teamMembersInput.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(index)}
                              className="p-1 text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                              title="Remove member"
                            >
                              <span className="material-symbols-outlined !text-base">delete</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-on-surface-variant uppercase ml-1">Member Name</label>
                            <input
                              type="text"
                              value={member.name}
                              onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                              placeholder="Full Name"
                              className="w-full h-10 px-3 rounded-lg border border-outline bg-transparent text-on-surface focus:border-primary transition-all text-xs animate-none"
                              required
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-on-surface-variant uppercase ml-1">Member Phone</label>
                            <input
                              type="tel"
                              value={member.phone}
                              onChange={(e) => handleMemberChange(index, 'phone', e.target.value)}
                              placeholder="Phone Number"
                              className="w-full h-10 px-3 rounded-lg border border-outline bg-transparent text-on-surface focus:border-primary transition-all text-xs"
                              required
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-on-surface-variant uppercase ml-1">Member Email</label>
                            <input
                              type="email"
                              value={member.email}
                              onChange={(e) => handleMemberChange(index, 'email', e.target.value)}
                              placeholder="Email Address"
                              className="w-full h-10 px-3 rounded-lg border border-outline bg-transparent text-on-surface focus:border-primary transition-all text-xs"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Submit Button */}
              <div className="pt-4">
                <button 
                  type="submit" 
                  className="w-full h-12 bg-primary text-white font-semibold rounded-lg shadow-md hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{isSpotRegistration ? 'Instantly Register & Generate ID' : 'Submit Registration'}</span>
                  <span className="material-symbols-outlined !text-lg">send</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </main>
    </div>
  );
}
