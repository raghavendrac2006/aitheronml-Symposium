import React, { useState } from 'react';
import { motion } from 'motion/react';
import { SymposiumEvent, Attendee } from '../types';
import { saveAttendeeToFirestore } from '../firebaseSync';

interface PublicRegistrationProps {
  events: SymposiumEvent[];
  attendees?: Attendee[];
  onRegistrationSuccess: (newAttendee: Attendee) => void;
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
  const [memberCount, setMemberCount] = useState<number>(2);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!fullName || !collegeName || !branch || !year || !mobile || !email || !eventId) {
      setError('Please fill out all required fields.');
      setLoading(false);
      return;
    }

    if (regType === 'team' && !teamName) {
      setError('Please provide a team name for Team Entry.');
      setLoading(false);
      return;
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
      const participantId = `SYM-${String(nextNum).padStart(6, '0')}`;

      // Create attendee object matching Section 11 schema perfectly
      const newAttendee: Attendee = {
        id: participantId,
        participantId: participantId,
        name: fullName.trim(),
        college: collegeName.trim(),
        branch: branch.trim(),
        year: year,
        phone: mobile.trim(),
        email: email.trim().toLowerCase(),
        eventId: eventId,
        registeredEventId: eventId,
        registeredEventTitle: eventTitle,
        teamId: regType === 'team' ? `team-${participantId}` : '',
        registrationType: regType,
        regType: regType,
        attendanceStatus: 'Pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        teamName: regType === 'team' ? teamName.trim() : undefined,
        memberCount: regType === 'team' ? Number(memberCount) : undefined,
        registrationDate: new Date().toISOString(),
        accessLevel: regType === 'team' ? 'Team All-Access' : 'Individual Pass',
        secureToken: `${participantId}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
      };

      // Save to Firestore
      await saveAttendeeToFirestore(newAttendee);

      // Trigger callback with success data
      onRegistrationSuccess(newAttendee);

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
                  className="space-y-4 pt-2"
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
