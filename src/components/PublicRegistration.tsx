import React, { useState } from 'react';
import { motion } from 'motion/react';
import { SymposiumEvent, Attendee } from '../types';
import { saveAttendeeToFirestore } from '../firebaseSync';
import { 
  FileText, Layers, Brain, Award, Camera, Map, Gamepad2, Users, Check, AlertCircle, HelpCircle, Info, Clock, MapPin
} from 'lucide-react';

interface PublicRegistrationProps {
  events: SymposiumEvent[];
  attendees?: Attendee[];
  onRegistrationSuccess: (newAttendee: Attendee, extraMembers?: Attendee[]) => void;
  onBackToLogin: () => void;
  isSpotRegistration?: boolean; // if true, bypasses landing decoration, simplifies header for admin portal
  hideAdminSignIn?: boolean;
}

export default function PublicRegistration({ 
  events, 
  attendees = [],
  onRegistrationSuccess, 
  onBackToLogin,
  isSpotRegistration = false,
  hideAdminSignIn = false
}: PublicRegistrationProps) {
  // Form state
  const [fullName, setFullName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [morningEventId, setMorningEventId] = useState('');
  const [afternoonEventId, setAfternoonEventId] = useState('');
  const [regType, setRegType] = useState<'individual' | 'team'>('individual');
  const [teamName, setTeamName] = useState('');
  const [teamMembersInput, setTeamMembersInput] = useState<Array<{ name: string; phone: string; email: string }>>([]);

  // Dynamic session classification helpers (future-proof, case-insensitive)
  const isMorningSession = (ev: SymposiumEvent) => {
    const s = (ev.session || '').toLowerCase();
    return s.includes('morning') || s.includes('full-day') || s.includes('full day');
  };

  const isAfternoonSession = (ev: SymposiumEvent) => {
    const s = (ev.session || '').toLowerCase();
    return s.includes('afternoon') || s.includes('full-day') || s.includes('full day');
  };

  const morningEvents = events.filter(isMorningSession);
  const afternoonEvents = events.filter(isAfternoonSession);

  const morningSelected = events.find(e => e.id === morningEventId);
  const afternoonSelected = events.find(e => e.id === afternoonEventId);
  const selectedEvents = [morningSelected, afternoonSelected].filter(Boolean) as SymposiumEvent[];
  const supportsTeam = selectedEvents.some(ev => (ev.maximumTeamSize || 0) > 1);
  const requiresTeam = selectedEvents.some(ev => (ev.minimumTeamSize || 0) > 1);

  // Time-range getter based on schedule session
  const getEventTime = (ev: SymposiumEvent) => {
    const s = (ev.session || '').toLowerCase();
    if (s.includes('morning')) return '9:00 AM – 12:00 PM';
    if (s.includes('afternoon')) return '1:30 PM – 4:30 PM';
    return '9:00 AM – 4:30 PM'; // Full-Day Session
  };

  // Safe Lucide icon selector
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'FileText': return <FileText className="w-5 h-5 text-primary" />;
      case 'Layers': return <Layers className="w-5 h-5 text-primary" />;
      case 'Brain': return <Brain className="w-5 h-5 text-primary" />;
      case 'Award': return <Award className="w-5 h-5 text-primary" />;
      case 'Camera': return <Camera className="w-5 h-5 text-primary" />;
      case 'Map': return <Map className="w-5 h-5 text-primary" />;
      case 'Gamepad2': return <Gamepad2 className="w-5 h-5 text-primary" />;
      case 'Users': return <Users className="w-5 h-5 text-primary" />;
      default: return <HelpCircle className="w-5 h-5 text-primary" />;
    }
  };

  // Selection toggle handler supporting Full-Day session overriding
  const handleSelectEvent = (ev: SymposiumEvent, slot: 'morning' | 'afternoon') => {
    const isFullDay = (ev.session || '').toLowerCase().includes('full-day') || (ev.session || '').toLowerCase().includes('full day');

    if (slot === 'morning') {
      if (morningEventId === ev.id) {
        // Deselect
        if (isFullDay) {
          setMorningEventId('');
          setAfternoonEventId('');
        } else {
          setMorningEventId('');
        }
      } else {
        // Select
        if (isFullDay) {
          setMorningEventId(ev.id);
          setAfternoonEventId(ev.id);
        } else {
          setMorningEventId(ev.id);
        }
      }
    } else {
      if (afternoonEventId === ev.id) {
        // Deselect
        if (isFullDay) {
          setMorningEventId('');
          setAfternoonEventId('');
        } else {
          setAfternoonEventId('');
        }
      } else {
        // Select
        if (isFullDay) {
          setMorningEventId(ev.id);
          setAfternoonEventId(ev.id);
        } else {
          setAfternoonEventId(ev.id);
        }
      }
    }
  };

  // Disabled states check for card slots
  const isMorningDisabled = (ev: SymposiumEvent) => {
    if (morningEventId === ev.id) return false;
    if (morningEventId !== '') return true;
    if (afternoonEventId !== '') {
      const afternoonSelected = events.find(e => e.id === afternoonEventId);
      const isFullDay = afternoonSelected?.session.toLowerCase().includes('full-day') || afternoonSelected?.session.toLowerCase().includes('full day');
      if (isFullDay) return true;
    }
    return false;
  };

  const isAfternoonDisabled = (ev: SymposiumEvent) => {
    if (afternoonEventId === ev.id) return false;
    if (afternoonEventId !== '') return true;
    if (morningEventId !== '') {
      const morningSelected = events.find(e => e.id === morningEventId);
      const isFullDay = morningSelected?.session.toLowerCase().includes('full-day') || morningSelected?.session.toLowerCase().includes('full day');
      if (isFullDay) return true;
    }
    return false;
  };

  React.useEffect(() => {
    if (requiresTeam) {
      setRegType('team');
    } else if (!supportsTeam) {
      setRegType('individual');
    }
  }, [supportsTeam, requiresTeam]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddMember = () => {
    if (teamMembersInput.length >= 3) {
      alert('Maximum of 4 team members allowed (1 Team Leader + 3 Members).');
      return;
    }
    setTeamMembersInput([...teamMembersInput, { name: '', phone: '', email: '' }]);
  };

  const handleRemoveMember = (idx: number) => {
    setTeamMembersInput(teamMembersInput.filter((_, i) => i !== idx));
  };

  const handleMemberChange = (idx: number, field: 'name' | 'phone' | 'email', val: string) => {
    const updated = [...teamMembersInput];
    updated[idx] = { ...updated[idx], [field]: val };
    setTeamMembersInput(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!fullName || !collegeName || !branch || !year || !mobile || !email) {
      setError('Please fill out all required fields.');
      setLoading(false);
      return;
    }

    if (!morningEventId && !afternoonEventId) {
      setError('Please select at least one event (Morning, Afternoon, or both) to register.');
      setLoading(false);
      return;
    }

    if (regType === 'team') {
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
      // Find selected events to create
      const selectedEventsToCreate: SymposiumEvent[] = [];
      if (morningSelected) {
        selectedEventsToCreate.push(morningSelected);
      }
      if (afternoonSelected && afternoonEventId !== morningEventId) {
        selectedEventsToCreate.push(afternoonSelected);
      }

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
            const cleanId = (a.participantId || a.id || '').replace('-SPOT', '');
            const m = cleanId.match(/^SYM-(\d+)$/);
            return m ? parseInt(m[1], 10) : 0;
          });
        const maxId = Math.max(...symIds, 0);
        nextNum = maxId + 1;
      } else {
        nextNum = 1;
      }

      const createdAttendees: Attendee[] = [];

      for (let i = 0; i < selectedEventsToCreate.length; i++) {
        const ev = selectedEventsToCreate[i];
        const currentNum = nextNum + i;
        const leaderParticipantId = `SYM-${String(currentNum).padStart(6, '0')}`;
        const finalLeaderId = isSpotRegistration ? `${leaderParticipantId}-SPOT` : leaderParticipantId;
        const sharedTeamId = regType === 'team' ? finalLeaderId : '';
        const teamMembersDataForLeader: Array<{
          name: string;
          phone: string;
          email: string;
          college: string;
          branch: string;
          year: string;
          participantId: string;
        }> = [];

        if (regType === 'team') {
          teamMembersInput.forEach((m) => {
            teamMembersDataForLeader.push({
              name: m.name.trim(),
              phone: m.phone.trim(),
              email: m.email.trim().toLowerCase(),
              college: collegeName.trim(),
              branch: branch.trim(),
              year: year,
              participantId: finalLeaderId
            });
          });
        }

        // Create attendee object matching Section 11 schema perfectly
        const attendeeObj: Attendee = {
          id: finalLeaderId,
          participantId: finalLeaderId,
          name: fullName.trim(),
          college: collegeName.trim(),
          branch: branch.trim(),
          year: year,
          phone: mobile.trim(),
          email: email.trim().toLowerCase(),
          eventId: ev.id,
          registeredEventId: ev.id,
          registeredEventTitle: ev.title,
          teamId: sharedTeamId,
          registrationType: regType,
          regType: regType,
          attendanceStatus: isSpotRegistration ? 'Present' : 'Pending',
          paymentStatus: isSpotRegistration ? 'Paid' : 'Pending',
          checkedInAt: isSpotRegistration ? new Date().toISOString() : undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          teamName: regType === 'team' ? (teamName.trim() || undefined) : undefined,
          memberCount: regType === 'team' ? 1 + teamMembersInput.length : undefined,
          teamMembers: regType === 'team' ? teamMembersDataForLeader : undefined,
          registrationDate: new Date().toISOString(),
          accessLevel: regType === 'team' ? 'Team Leader Pass' : 'Individual Pass',
          secureToken: `${leaderParticipantId}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
        };

        // Save attendee to Firestore
        await saveAttendeeToFirestore(attendeeObj);
        createdAttendees.push(attendeeObj);
      }

      // Trigger callback with success data (pass first registration, and extra ones in second argument array)
      if (createdAttendees.length === 1) {
        onRegistrationSuccess(createdAttendees[0], []);
      } else if (createdAttendees.length > 1) {
        onRegistrationSuccess(createdAttendees[0], [createdAttendees[1]]);
      }

    } catch (err: any) {
      console.error("Registration failed:", err);
      setError('Registration failed. Firestore write unsuccessful.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full min-h-screen bg-background text-on-background flex flex-col items-center ${isSpotRegistration ? 'p-0' : 'py-4 md:py-8'}`}>
      {!isSpotRegistration && (
        <header className="w-full max-w-2xl px-4 md:px-6 py-3 md:py-4 flex items-center justify-between mb-2 md:mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-md overflow-hidden text-white font-bold text-lg">
              AI
            </div>
            <div>
              <h1 className="font-headline-sm text-lg font-bold text-primary">AItheronML</h1>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Symposium OS</p>
            </div>
          </div>
          {!hideAdminSignIn && (
            <button 
              onClick={onBackToLogin}
              className="text-primary hover:bg-secondary-container px-4 py-2 rounded-full font-semibold text-xs transition-all"
            >
              Sign In as Admin
            </button>
          )}
        </header>
      )}

      <main className="w-full max-w-2xl px-2 md:px-4 flex-grow flex flex-col justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-surface-container-lowest rounded-2xl shadow-lg border border-outline-variant p-4 md:p-8"
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

              {/* Choose Your Events (Card-Based) */}
              <div className="space-y-6 pt-4 border-t border-outline-variant/30">
                <div>
                  <h3 className="text-sm font-bold text-primary uppercase ml-1">Choose Your Events</h3>
                  <p className="text-xs text-on-surface-variant font-semibold mt-1 ml-1 leading-relaxed">
                    You may participate in:<br />
                    <span className="text-primary font-bold">✓</span> One Morning Session event<br />
                    <span className="text-primary font-bold">✓</span> One Afternoon Session event (Optional)<br />
                    <span className="text-on-surface-variant font-semibold">OR</span><br />
                    <span className="text-primary font-bold">✓</span> Only one event from either session
                  </p>
                </div>

                {/* Morning Session Section */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Morning Session</h4>
                    {morningEventId && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> You have already selected a Morning Session event.
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {morningEvents.map(ev => {
                      const isSelected = morningEventId === ev.id;
                      const isDisabled = isMorningDisabled(ev);
                      return (
                        <motion.div
                          key={ev.id}
                          whileHover={!isDisabled ? { y: -4, scale: 1.01 } : {}}
                          whileTap={!isDisabled ? { scale: 0.99 } : {}}
                          onClick={() => !isDisabled && handleSelectEvent(ev, 'morning')}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              if (!isDisabled) handleSelectEvent(ev, 'morning');
                            }
                          }}
                          tabIndex={isDisabled ? -1 : 0}
                          className={`relative p-5 rounded-2xl border transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-primary ${
                            isSelected 
                              ? 'border-primary bg-primary/5 shadow-md scale-[1.01]' 
                              : isDisabled 
                                ? 'border-outline-variant bg-surface-container-low opacity-50 cursor-not-allowed' 
                                : 'border-outline hover:border-primary/55 bg-surface shadow-xs'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="p-2 rounded-xl bg-primary/10 flex items-center justify-center">
                              {getIcon(ev.icon)}
                            </div>
                            <div className="flex flex-col gap-1 items-end">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                ev.track === 'Technical' 
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                                  : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                              }`}>
                                {ev.track}
                              </span>
                              <span className="text-[10px] font-semibold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                                {ev.session}
                              </span>
                            </div>
                          </div>

                          <h5 className="font-bold text-on-surface text-base mb-2">{ev.title}</h5>
                          {ev.subtitle && (
                            <p className="text-xs text-on-surface-variant mb-4 font-medium line-clamp-2">{ev.subtitle}</p>
                          )}

                          <div className="space-y-1.5 text-xs text-on-surface-variant font-semibold border-t border-outline-variant/20 pt-3">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-primary" />
                              <span>{getEventTime(ev)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-primary" />
                              <span className="truncate">{ev.location}</span>
                            </div>
                          </div>

                          {/* Selected badge overlay */}
                          {isSelected && (
                            <div className="absolute top-3 left-3 bg-primary text-white p-1 rounded-full shadow-xs flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Afternoon Session Section */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Afternoon Session</h4>
                    {afternoonEventId && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> You have already selected an Afternoon Session event.
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {afternoonEvents.map(ev => {
                      const isSelected = afternoonEventId === ev.id;
                      const isDisabled = isAfternoonDisabled(ev);
                      return (
                        <motion.div
                          key={ev.id}
                          whileHover={!isDisabled ? { y: -4, scale: 1.01 } : {}}
                          whileTap={!isDisabled ? { scale: 0.99 } : {}}
                          onClick={() => !isDisabled && handleSelectEvent(ev, 'afternoon')}
                          onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') {
                              e.preventDefault();
                              if (!isDisabled) handleSelectEvent(ev, 'afternoon');
                            }
                          }}
                          tabIndex={isDisabled ? -1 : 0}
                          className={`relative p-5 rounded-2xl border transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-primary ${
                            isSelected 
                              ? 'border-primary bg-primary/5 shadow-md scale-[1.01]' 
                              : isDisabled 
                                ? 'border-outline-variant bg-surface-container-low opacity-50 cursor-not-allowed' 
                                : 'border-outline hover:border-primary/55 bg-surface shadow-xs'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="p-2 rounded-xl bg-primary/10 flex items-center justify-center">
                              {getIcon(ev.icon)}
                            </div>
                            <div className="flex flex-col gap-1 items-end">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                ev.track === 'Technical' 
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                                  : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                              }`}>
                                {ev.track}
                              </span>
                              <span className="text-[10px] font-semibold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                                {ev.session}
                              </span>
                            </div>
                          </div>

                          <h5 className="font-bold text-on-surface text-base mb-2">{ev.title}</h5>
                          {ev.subtitle && (
                            <p className="text-xs text-on-surface-variant mb-4 font-medium line-clamp-2">{ev.subtitle}</p>
                          )}

                          <div className="space-y-1.5 text-xs text-on-surface-variant font-semibold border-t border-outline-variant/20 pt-3">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-primary" />
                              <span>{getEventTime(ev)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-primary" />
                              <span className="truncate">{ev.location}</span>
                            </div>
                          </div>

                          {/* Selected badge overlay */}
                          {isSelected && (
                            <div className="absolute top-3 left-3 bg-primary text-white p-1 rounded-full shadow-xs flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Registration Type Radio Group (Shown dynamically) */}
              {supportsTeam && !requiresTeam && (
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
              )}

              {/* Dynamic Team Fields */}
              {regType === 'team' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 pt-2 border-l-2 border-primary/20 pl-4"
                >
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-primary uppercase ml-1">Team Name (Optional)</label>
                    <input 
                      type="text" 
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="e.g. Neural Frontiers Lab" 
                      className="w-full h-12 px-4 rounded-lg border border-outline bg-transparent text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm"
                    />
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <label className="text-xs font-bold text-primary uppercase">Team Members</label>
                        <p className="text-[10px] text-on-surface-variant font-semibold mt-0.5">
                          Maximum Team Size: 4 Members (1 Team Leader + 3 Members)
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddMember}
                        disabled={teamMembersInput.length >= 3}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer self-start sm:self-auto bg-primary/10 text-primary hover:bg-primary/20 disabled:bg-surface-container-high disabled:text-on-surface-variant/40 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined !text-sm">add</span>
                        Add Member
                      </button>
                    </div>

                    {teamMembersInput.map((member, index) => (
                      <div key={index} className="p-4 bg-surface-container border border-outline rounded-xl space-y-3 relative">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-on-surface-variant">Team Member #{index + 1}</span>
                          {teamMembersInput.length > 0 && (
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
