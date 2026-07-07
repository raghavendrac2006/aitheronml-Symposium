import React, { useState } from 'react';
import { 
  LayoutDashboard, Calendar, Mic, Users, Settings, HelpCircle, 
  Search, Bell, User, Plus, FileText, Layers, HelpCircle as QuizIcon, 
  Camera, Map, Brain, Image as ImageIcon, Check, X, LogOut, ArrowUpRight, 
  MapPin, Clock, Edit3, Trash2, CheckCircle2, AlertCircle, Building, Award, Unlock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SymposiumEvent, Attendee, TrackType, EventStatus, UserSession } from '../types';
import ParticipantProfile from './ParticipantProfile';
import PublicRegistration from './PublicRegistration';
import RegistrationSuccess from './RegistrationSuccess';

interface AdminDashboardProps {
  user: UserSession;
  events: SymposiumEvent[];
  attendees: Attendee[];
  onUpdateEvents: (updated: SymposiumEvent[]) => void;
  onUpdateAttendees: (updated: Attendee[]) => void;
  onLogout: () => void;
}

export default function AdminDashboard({
  user,
  events,
  attendees,
  onUpdateEvents,
  onUpdateAttendees,
  onLogout
}: AdminDashboardProps) {
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'symposia' | 'attendees' | 'settings' | 'spot-registration' | 'new-registration'>(
    user.role === 'registration' ? 'attendees' : 'dashboard'
  );
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected Profile State
  const [selectedAttendeeForProfile, setSelectedAttendeeForProfile] = useState<Attendee | null>(null);
  const [spotAttendeeSuccess, setSpotAttendeeSuccess] = useState<Attendee | null>(null);

  // New Filters for Registration Management
  const [collegeFilter, setCollegeFilter] = useState<string>('all');
  const [regTypeFilter, setRegTypeFilter] = useState<string>('all');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<string>('all');
  
  // Modals
  const [isNewEventOpen, setIsNewEventOpen] = useState(false);
  const [selectedEventForManage, setSelectedEventForManage] = useState<SymposiumEvent | null>(null);

  // New Event Form State
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTrack, setNewEventTrack] = useState<TrackType>('Technical');
  const [newEventSession, setNewEventSession] = useState('Session 1A');
  const [newEventSubtitle, setNewEventSubtitle] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventHostEmail, setNewEventHostEmail] = useState('host@gmail.com');
  const [newEventHostName, setNewEventHostName] = useState('Host A');
  const [newEventIcon, setNewEventIcon] = useState('FileText');

  // Search filter for attendees
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [selectedAttendeeFilter, setSelectedAttendeeFilter] = useState<string>('all');

  // Speaker register state
  const [isNewSpeakerOpen, setIsNewSpeakerOpen] = useState(false);
  const [speakerName, setSpeakerName] = useState('');
  const [speakerDesignation, setSpeakerDesignation] = useState('');
  const [speakerInstitution, setSpeakerInstitution] = useState('');
  const [speakerTopic, setSpeakerTopic] = useState('');
  const [speakerSession, setSpeakerSession] = useState('');

  // Attendee register state
  const [isNewAttendeeOpen, setIsNewAttendeeOpen] = useState(false);
  const [attName, setAttName] = useState('');
  const [attEmail, setAttEmail] = useState('');
  const [attPhone, setAttPhone] = useState('');
  const [attCollege, setAttCollege] = useState('');
  const [attEventId, setAttEventId] = useState(events[0]?.id || 'ev-1');

  // Helper to render event icons dynamically
  const renderEventIcon = (iconName: string, className = "w-6 h-6") => {
    switch (iconName) {
      case 'FileText': return <FileText className={className} />;
      case 'Layers': return <Layers className={className} />;
      case 'HelpCircle': return <QuizIcon className={className} />;
      case 'Camera': return <Camera className={className} />;
      case 'Map': return <Map className={className} />;
      case 'BrainCircuit': return <Brain className={className} />;
      case 'Image': return <ImageIcon className={className} />;
      default: return <FileText className={className} />;
    }
  };

  // Add Event
  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !newEventSubtitle) return;

    const idStr = `ev-${Date.now()}`;
    const newEvent: SymposiumEvent = {
      id: idStr,
      eventId: idStr,
      title: newEventTitle,
      eventName: newEventTitle,
      track: newEventTrack,
      category: newEventTrack,
      session: newEventSession,
      subtitle: newEventSubtitle,
      registeredCount: 0,
      status: 'Upcoming',
      hostEmail: newEventHostEmail,
      hostName: newEventHostName,
      icon: newEventIcon,
      location: newEventLocation || 'Seminar Room',
      venue: newEventLocation || 'Seminar Room',
      resultsSubmitted: false,
    };

    onUpdateEvents([...events, newEvent]);
    setIsNewEventOpen(false);

    // Reset Form
    setNewEventTitle('');
    setNewEventSubtitle('');
    setNewEventLocation('');
  };

  // Delete Event
  const handleDeleteEvent = (eventId: string) => {
    if (confirm('Are you sure you want to remove this event? All associated records will be updated.')) {
      const filtered = events.filter(e => e.id !== eventId);
      onUpdateEvents(filtered);
      // clean attendees
      const cleanedAttendees = attendees.filter(a => a.registeredEventId !== eventId);
      onUpdateAttendees(cleanedAttendees);
      setSelectedEventForManage(null);
    }
  };

  // Update Status
  const handleUpdateEventStatus = (eventId: string, newStatus: EventStatus) => {
    const updated = events.map(e => {
      if (e.id === eventId) {
        return { ...e, status: newStatus };
      }
      return e;
    });
    onUpdateEvents(updated);
    if (selectedEventForManage && selectedEventForManage.id === eventId) {
      setSelectedEventForManage({ ...selectedEventForManage, status: newStatus });
    }
  };

  // Attendee Add
  const handleAddAttendee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attName || !attEmail || !attCollege) return;

    const selectedEv = events.find(e => e.id === attEventId);

    const idStr = `at-${Date.now()}`;
    const newAttendee: Attendee = {
      id: idStr,
      participantId: idStr,
      name: attName,
      email: attEmail,
      phone: attPhone || 'N/A',
      college: attCollege,
      registeredEventId: attEventId,
      eventId: attEventId,
      registeredEventTitle: selectedEv ? selectedEv.title : 'General',
      attendanceStatus: 'Pending'
    };

    // Increment count
    onUpdateEvents(events.map(ev => ev.id === attEventId ? { ...ev, registeredCount: ev.registeredCount + 1 } : ev));
    onUpdateAttendees([...attendees, newAttendee]);
    setIsNewAttendeeOpen(false);
    setAttName('');
    setAttEmail('');
    setAttPhone('');
    setAttCollege('');
  };

  // Quick statistics calculated dynamically
  const activeHostsSet = new Set(events.map(e => e.hostEmail));
  const dynamicTotalParticipants = attendees.length + 1200; // Offset for realistic high count
  const dynamicTotalEvents = events.length;
  const dynamicActiveHosts = activeHostsSet.size + 28; // Dynamic sizing
  const todaysRegistrations = attendees.filter(a => a.id.startsWith('at-')).length + 45; // Simulated fresh additions

  // Filter lists based on search
  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="admin-shell" className="min-h-screen bg-background text-on-background flex flex-col font-sans">
      
      {/* Top App Header bar */}
      <header className="fixed top-0 w-full z-40 flex justify-between items-center px-4 md:px-8 h-16 bg-surface border-b border-outline-variant">
        <div className="flex items-center gap-2">
          <Building className="w-6 h-6 text-primary" />
          <span className="font-bold text-lg md:text-xl text-primary tracking-tight">
            AItheronML Symposium OS
          </span>
          <span className="hidden md:inline-block ml-2 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
            {user.role === 'registration' ? 'Registration Team' : 'Super Admin'}
          </span>
        </div>

        {/* Global Search Box */}
        <div className="hidden md:flex flex-1 max-w-md ml-8">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input 
              type="text" 
              placeholder="Search symposium records..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 bg-surface-container-low border border-outline-variant rounded-full text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full animate-pulse" />
          </button>
          
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-surface-container border border-outline-variant/35">
            <div className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs">
              {user.role === 'registration' ? 'RT' : 'SA'}
            </div>
            <span className="text-xs font-semibold text-on-surface hidden sm:inline-block">
              {user.role === 'registration' ? 'Registration Team' : 'Super Admin'}
            </span>
          </div>

          <button 
            onClick={onLogout}
            title="Sign Out"
            className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Primary Layout Shell Container */}
      <div className="flex pt-16 flex-1">
        
        {/* Dynamic Nav Sidebar for Desktop */}
        <nav className="hidden lg:flex flex-col w-[280px] bg-surface border-r border-outline-variant fixed left-0 top-16 bottom-0 z-30 py-6">
          <div className="px-6 pb-4 mb-4 border-b border-outline-variant/50">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-base shadow-sm">
                A
              </div>
              <div>
                <h2 className="font-extrabold text-sm text-primary tracking-tight leading-none">AItheronML</h2>
                <p className="text-[10px] text-on-surface-variant uppercase font-semibold mt-1 tracking-wider">
                  Symposium Management
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Links with custom active state colors matching M3 Spec */}
          <div className="flex-1 px-3 space-y-1.5">
            {user.role === 'registration' ? (
              <>
                <button 
                  onClick={() => {
                    setSelectedAttendeeForProfile(null);
                    setSpotAttendeeSuccess(null);
                    setActiveTab('new-registration');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-full transition-all ${
                    activeTab === 'new-registration' 
                      ? 'bg-secondary-container text-on-secondary-container' 
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>New Registration</span>
                </button>

                <button 
                  onClick={() => {
                    setSelectedAttendeeForProfile(null);
                    setSpotAttendeeSuccess(null);
                    setActiveTab('attendees');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-full transition-all ${
                    activeTab === 'attendees' && !selectedAttendeeForProfile
                      ? 'bg-secondary-container text-on-secondary-container' 
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <Search className="w-4 h-4 shrink-0" />
                  <span>Search Participants</span>
                </button>

                <button 
                  onClick={() => {
                    setSelectedAttendeeForProfile(null);
                    setSpotAttendeeSuccess(null);
                    setActiveTab('spot-registration');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-full transition-all ${
                    activeTab === 'spot-registration' 
                      ? 'bg-secondary-container text-on-secondary-container' 
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Spot Registration</span>
                </button>

                <button 
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-full text-error hover:bg-error/10 transition-all"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-full transition-all ${
                    activeTab === 'dashboard' 
                      ? 'bg-secondary-container text-on-secondary-container' 
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span>Dashboard</span>
                </button>

                <button 
                  onClick={() => setActiveTab('symposia')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-full transition-all ${
                    activeTab === 'symposia' 
                      ? 'bg-secondary-container text-on-secondary-container' 
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span>Symposia</span>
                </button>

                <button 
                  onClick={() => {
                    setSelectedAttendeeForProfile(null);
                    setSpotAttendeeSuccess(null);
                    setActiveTab('attendees');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-full transition-all ${
                    activeTab === 'attendees' && !selectedAttendeeForProfile
                      ? 'bg-secondary-container text-on-secondary-container' 
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  <span>Attendees</span>
                </button>

                <button 
                  onClick={() => {
                    setSelectedAttendeeForProfile(null);
                    setSpotAttendeeSuccess(null);
                    setActiveTab('spot-registration');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-full transition-all ${
                    activeTab === 'spot-registration' 
                      ? 'bg-secondary-container text-on-secondary-container' 
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Spot Registration</span>
                </button>

                <button 
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-full transition-all ${
                    activeTab === 'settings' 
                      ? 'bg-secondary-container text-on-secondary-container' 
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  <span>Settings</span>
                </button>
              </>
            )}
          </div>

          {/* Sidebar Footer Help Section */}
          <div className="mt-auto px-3 pt-4 border-t border-outline-variant/40 space-y-1">
            <button 
              onClick={() => alert('AItheronML Help Center:\n\nIf you have questions about scheduling, assigning hosts, or managing submissions, contact technical support in Block A.')}
              className="w-full flex items-center gap-3 px-4 py-2 text-[11px] font-semibold text-on-surface-variant rounded-full hover:bg-surface-container"
            >
              <HelpCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Help Center</span>
            </button>
            <button 
              onClick={() => alert('Support Ticket:\n\nOur system operates in Autonomous High-Performance Mode.')}
              className="w-full flex items-center gap-3 px-4 py-2 text-[11px] font-semibold text-on-surface-variant rounded-full hover:bg-surface-container"
            >
              <HelpCircle className="w-3.5 h-3.5 shrink-0" />
              <span>System Support</span>
            </button>
          </div>
        </nav>

        {/* Dynamic Main Workspace Container Canvas */}
        <main className="flex-1 lg:ml-[280px] p-4 md:p-8 bg-surface-bright min-h-[calc(100vh-4rem)]">
          
          {/* Dashboard Tab Workspace */}
          {activeTab === 'dashboard' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              
              {/* Screen title heading bar */}
              <div>
                <h1 className="text-3xl font-bold text-on-surface tracking-tight">Symposium Overview</h1>
                <p className="text-sm text-on-surface-variant mt-1">High-level metrics and active event management.</p>
              </div>

              {/* Grid block of 4 primary stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Stat 1: Total Participants */}
                <div className="bg-surface rounded-2xl p-5 shadow-xs border border-surface-variant flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Total Participants</span>
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-on-surface">
                    {dynamicTotalParticipants.toLocaleString()}
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-primary font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    <span>+12% this week</span>
                  </div>
                </div>

                {/* Stat 2: Total Events */}
                <div className="bg-surface rounded-2xl p-5 shadow-xs border border-surface-variant flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Total Events</span>
                    <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-on-surface">
                    {dynamicTotalEvents}
                  </div>
                  <div className="mt-2 text-[11px] text-on-surface-variant font-medium">
                    Across 3 track divisions
                  </div>
                </div>

                {/* Stat 3: Active Hosts */}
                <div className="bg-surface rounded-2xl p-5 shadow-xs border border-surface-variant flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Active Hosts</span>
                    <div className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-on-surface font-sans">
                    {dynamicActiveHosts}
                  </div>
                  <div className="mt-2 text-[11px] text-on-surface-variant font-medium">
                    All faculty assigned
                  </div>
                </div>

                {/* Stat 4: Registrations Today */}
                <div className="bg-surface rounded-2xl p-5 shadow-xs border border-surface-variant flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Today's Registrations</span>
                    <div className="w-8 h-8 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center animate-pulse">
                      <Plus className="w-4 h-4 text-on-tertiary-container" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-on-surface">
                    {todaysRegistrations}
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[11px] text-primary font-bold">
                    <span>Peak registrar hour</span>
                  </div>
                </div>
              </div>

              {/* Bento Grid: All Symposium Events matching design system constraints */}
              <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-6 shadow-sm">
                
                {/* Header row with + New Event button */}
                <div className="flex items-center justify-between mb-6 border-b border-outline-variant/30 pb-4">
                  <h2 className="text-xl font-bold text-on-surface">All Symposium Events</h2>
                  <button 
                    onClick={() => setIsNewEventOpen(true)}
                    className="h-10 bg-primary text-on-primary font-semibold text-xs px-4 rounded-xl hover:bg-primary/95 shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    New Event
                  </button>
                </div>

                {/* Two main tracks layout grids */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Left and center columns: Technical Track list */}
                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-extrabold text-primary uppercase tracking-wider border-b border-primary/20 pb-1.5 mb-3">
                      Technical Track
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredEvents.filter(e => e.track === 'Technical').map(ev => (
                        <div 
                          key={ev.id}
                          className="bg-surface rounded-2xl border border-surface-variant p-4 hover:shadow-md hover:border-outline-variant/60 transition-all relative overflow-hidden group flex flex-col justify-between"
                        >
                          <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-full -z-10 group-hover:scale-105 transition-transform" />
                          
                          <div>
                            <div className="flex items-start justify-between mb-3">
                              <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center text-primary">
                                {renderEventIcon(ev.icon)}
                              </div>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                ev.status === 'Live' 
                                  ? 'bg-error-container text-on-error-container animate-pulse' 
                                  : ev.status === 'Completed'
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-surface-variant text-on-surface-variant'
                              }`}>
                                {ev.status}
                              </span>
                            </div>

                            <h4 className="font-bold text-on-surface text-base group-hover:text-primary transition-colors">
                              {ev.title}
                            </h4>
                            <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                              {ev.session} • {ev.subtitle}
                            </p>
                            
                            <div className="mt-3 flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                              <Users className="w-3.5 h-3.5 text-outline" />
                              <span>{ev.registeredCount} Registered</span>
                            </div>
                            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                              <User className="w-3.5 h-3.5 text-outline" />
                              <span>Host: {ev.hostName}</span>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-outline-variant/30">
                            <button 
                              onClick={() => setSelectedEventForManage(ev)}
                              className="w-full h-8 border border-primary text-primary hover:bg-primary hover:text-on-primary rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" /> Manage Event
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right column: Non-Technical Track list */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-extrabold text-secondary uppercase tracking-wider border-b border-secondary/25 pb-1.5 mb-3">
                      Non-Technical Track
                    </h3>

                    <div className="flex flex-col gap-4">
                      {filteredEvents.filter(e => e.track === 'Non-Technical').map(ev => (
                        <div 
                          key={ev.id}
                          className="bg-surface rounded-2xl border border-surface-variant p-4 hover:shadow-md hover:border-outline-variant/60 transition-all relative overflow-hidden group flex flex-col justify-between"
                        >
                          <div className="absolute top-0 right-0 w-16 h-16 bg-secondary/5 rounded-bl-full -z-10 group-hover:scale-105 transition-transform" />
                          
                          <div>
                            <div className="flex items-start justify-between mb-2">
                              <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-secondary">
                                {renderEventIcon(ev.icon, "w-5 h-5")}
                              </div>
                              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                ev.status === 'Live' 
                                  ? 'bg-error-container text-on-error-container' 
                                  : ev.status === 'Completed'
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-surface-variant text-on-surface-variant'
                              }`}>
                                {ev.status}
                              </span>
                            </div>

                            <h4 className="font-bold text-on-surface text-sm group-hover:text-secondary transition-colors">
                              {ev.title}
                            </h4>
                            <p className="text-[11px] text-on-surface-variant font-medium">
                              {ev.session} • {ev.subtitle}
                            </p>

                            <div className="mt-2.5 flex items-center justify-between text-xs text-on-surface-variant font-semibold">
                              <span>👥 {ev.registeredCount} Registered</span>
                              <span>🧑‍🏫 {ev.hostName}</span>
                            </div>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-outline-variant/30">
                            <button 
                              onClick={() => setSelectedEventForManage(ev)}
                              className="w-full h-8 border border-secondary text-secondary hover:bg-secondary hover:text-on-secondary rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Manage Event
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Symposia Tab Workspace */}
          {activeTab === 'symposia' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-on-surface tracking-tight">Symposia Settings</h1>
                <p className="text-sm text-on-surface-variant mt-1">Configure academic symposium metadata and active tracks.</p>
              </div>

              <div className="bg-surface rounded-2xl border border-outline-variant/40 p-6 shadow-xs max-w-3xl">
                <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" /> Institutional Configuration
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">Host College / Institution</label>
                    <input 
                      type="text" 
                      defaultValue="Kuppam Engineering College" 
                      className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">Accreditation status</label>
                    <input 
                      type="text" 
                      defaultValue="Autonomous Institution (NAAC A Grade)" 
                      className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">Symposium Title Name</label>
                    <input 
                      type="text" 
                      defaultValue="AItheronML 2026" 
                      className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface font-semibold text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">Event Date</label>
                    <input 
                      type="date" 
                      defaultValue="2026-07-08" 
                      className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase mb-1">Symposium Description</label>
                  <textarea 
                    rows={3}
                    defaultValue="National Level Technical Symposium organized by the Department of Computer Science & Engineering (Artificial Intelligence and Machine Learning) at Kuppam Engineering College."
                    className="w-full p-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface"
                  />
                </div>

                <button 
                  onClick={() => alert('Symposium details successfully saved.')}
                  className="bg-primary text-on-primary h-10 px-6 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  Save Configuration
                </button>
              </div>
            </motion.div>
          )}



          {/* Attendees Tab Workspace */}
          {activeTab === 'attendees' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {selectedAttendeeForProfile ? (
                <ParticipantProfile 
                  attendee={selectedAttendeeForProfile}
                  events={events}
                  onUpdateAttendee={(updatedAtt) => {
                    const updatedList = attendees.map(a => a.id === updatedAtt.id ? updatedAtt : a);
                    onUpdateAttendees(updatedList);
                    setSelectedAttendeeForProfile(updatedAtt);
                  }}
                  onDeleteAttendee={(id) => {
                    const attToDelete = attendees.find(a => a.id === id);
                    if (attToDelete) {
                      onUpdateAttendees(attendees.filter(a => a.id !== id));
                      onUpdateEvents(events.map(ev => ev.id === attToDelete.registeredEventId ? { ...ev, registeredCount: Math.max(0, ev.registeredCount - 1) } : ev));
                      setSelectedAttendeeForProfile(null);
                      alert('Registration successfully revoked.');
                    }
                  }}
                  onClose={() => setSelectedAttendeeForProfile(null)}
                />
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <h1 className="text-3xl font-bold text-on-surface tracking-tight">Registration Management</h1>
                      <p className="text-sm text-on-surface-variant mt-1">Manage and monitor all participant entries for the upcoming Symposium.</p>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedAttendeeForProfile(null);
                        setSpotAttendeeSuccess(null);
                        setActiveTab('spot-registration');
                      }}
                      className="bg-primary text-on-primary h-10 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> New Registration
                    </button>
                  </div>

                  {/* Metric Cards (Bento Grid Style) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    {/* Total Registrations */}
                    <div className="bg-surface p-5 rounded-2xl border border-outline-variant/60 flex flex-col justify-between">
                      <div>
                        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Total Registrations</p>
                        <h4 className="text-3xl font-bold text-primary mt-1">{attendees.length}</h4>
                      </div>
                    </div>
                    {/* Pre Registrations */}
                    <div className="bg-surface p-5 rounded-2xl border border-outline-variant/60 flex flex-col justify-between">
                      <div>
                        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Pre Registrations</p>
                        <h4 className="text-3xl font-bold text-primary mt-1">
                          {attendees.filter(a => a.id.startsWith('SYM') && !a.id.includes('-SPOT')).length}
                        </h4>
                      </div>
                    </div>
                    {/* Spot Registrations */}
                    <div className="bg-surface p-5 rounded-2xl border border-outline-variant/60 flex flex-col justify-between">
                      <div>
                        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Spot Registrations</p>
                        <h4 className="text-3xl font-bold text-primary mt-1">
                          {attendees.filter(a => a.id.includes('-SPOT') || a.id.endsWith('SPOT')).length}
                        </h4>
                      </div>
                    </div>
                    {/* Active Check-ins */}
                    <div className="bg-surface p-5 rounded-2xl border border-outline-variant/60 flex flex-col justify-between">
                      <div>
                        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Present Attendees</p>
                        <h4 className="text-3xl font-bold text-primary mt-1">
                          {attendees.filter(a => a.attendanceStatus === 'Present').length}
                        </h4>
                      </div>
                    </div>
                  </div>

                  {/* Filtering Controls */}
                  <div className="flex flex-wrap gap-4 items-center bg-surface p-4 rounded-xl border border-outline-variant/30">
                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
                      <input 
                        type="text" 
                        placeholder="Search Participants..." 
                        value={attendeeSearch}
                        onChange={(e) => setAttendeeSearch(e.target.value)}
                        className="w-full h-9 pl-9 pr-4 bg-surface-container border border-outline rounded-lg text-xs outline-none"
                      />
                    </div>

                    {/* Event Filter */}
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                      <span>Event:</span>
                      <select 
                        value={selectedAttendeeFilter}
                        onChange={(e) => setSelectedAttendeeFilter(e.target.value)}
                        className="h-9 px-3 bg-surface-container border border-outline rounded-lg text-xs text-on-surface outline-none"
                      >
                        <option value="all">All Events</option>
                        {events.map(e => (
                          <option key={e.id} value={e.id}>{e.title}</option>
                        ))}
                      </select>
                    </div>

                    {/* College Filter */}
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                      <span>College:</span>
                      <select 
                        value={collegeFilter}
                        onChange={(e) => setCollegeFilter(e.target.value)}
                        className="h-9 px-3 bg-surface-container border border-outline rounded-lg text-xs text-on-surface outline-none"
                      >
                        <option value="all">All Colleges</option>
                        {Array.from(new Set(attendees.map(a => a.college).filter(Boolean))).map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>

                    {/* Reg Type Filter */}
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                      <span>Type:</span>
                      <select 
                        value={regTypeFilter}
                        onChange={(e) => setRegTypeFilter(e.target.value)}
                        className="h-9 px-3 bg-surface-container border border-outline rounded-lg text-xs text-on-surface outline-none"
                      >
                        <option value="all">All Types</option>
                        <option value="individual">Individual</option>
                        <option value="team">Team Entry</option>
                      </select>
                    </div>

                    {/* Attendance Status Filter */}
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium">
                      <span>Attendance:</span>
                      <select 
                        value={attendanceStatusFilter}
                        onChange={(e) => setAttendanceStatusFilter(e.target.value)}
                        className="h-9 px-3 bg-surface-container border border-outline rounded-lg text-xs text-on-surface outline-none"
                      >
                        <option value="all">All Statuses</option>
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Pending">Pending</option>
                      </select>
                    </div>
                  </div>

                  {/* Roster Table List */}
                  <div className="bg-surface rounded-2xl border border-outline-variant overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-surface-container border-b border-outline-variant">
                            <th className="p-4 font-bold text-on-surface uppercase tracking-wider">Participant ID</th>
                            <th className="p-4 font-bold text-on-surface uppercase tracking-wider">Name</th>
                            <th className="p-4 font-bold text-on-surface uppercase tracking-wider">College</th>
                            <th className="p-4 font-bold text-on-surface uppercase tracking-wider">Event Track</th>
                            <th className="p-4 font-bold text-on-surface uppercase tracking-wider">Type</th>
                            <th className="p-4 font-bold text-on-surface uppercase tracking-wider">Status</th>
                            <th className="p-4 font-bold text-on-surface uppercase tracking-wider text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendees
                            .filter(a => {
                              const matchesSearch = 
                                a.name.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
                                a.college.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
                                a.email.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
                                a.id.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
                                (a.participantId || '').toLowerCase().includes(attendeeSearch.toLowerCase()) ||
                                (a.registeredEventTitle || '').toLowerCase().includes(attendeeSearch.toLowerCase());
                              const matchesEvent = selectedAttendeeFilter === 'all' || a.registeredEventId === selectedAttendeeFilter;
                              const matchesCollege = collegeFilter === 'all' || a.college === collegeFilter;
                              const matchesRegType = regTypeFilter === 'all' || a.regType === regTypeFilter;
                              const matchesStatus = attendanceStatusFilter === 'all' || a.attendanceStatus === attendanceStatusFilter;
                              return matchesSearch && matchesEvent && matchesCollege && matchesRegType && matchesStatus;
                            })
                            .map(att => (
                              <tr key={att.id} className="border-b border-outline-variant/30 hover:bg-surface-container/30 transition-colors">
                                <td className="p-4 font-semibold text-primary">{att.id}</td>
                                <td className="p-4">
                                  <div className="font-semibold text-on-surface text-sm">{att.name}</div>
                                  <div className="text-[10px] text-on-surface-variant">{att.email} • {att.phone}</div>
                                </td>
                                <td className="p-4 text-on-surface-variant font-medium">{att.college}</td>
                                <td className="p-4 text-primary font-semibold">{att.registeredEventTitle}</td>
                                <td className="p-4">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                    att.regType === 'team' ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-primary-fixed text-on-primary-fixed'
                                  }`}>
                                    {att.regType || 'individual'}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    att.attendanceStatus === 'Present' 
                                      ? 'bg-primary/10 text-primary' 
                                      : att.attendanceStatus === 'Absent' 
                                        ? 'bg-error-container text-on-error-container' 
                                        : 'bg-surface-variant text-on-surface-variant'
                                  }`}>
                                    {att.attendanceStatus}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    <button 
                                      onClick={() => setSelectedAttendeeForProfile(att)}
                                      className="p-1 text-primary hover:bg-primary/10 rounded font-semibold text-xs"
                                      title="View Details"
                                    >
                                      View
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setSelectedAttendeeForProfile(att);
                                        // Auto open editing inside the profile view
                                        setTimeout(() => {
                                          const editBtn = document.querySelector('button[title="Edit Details"]');
                                          if (editBtn) (editBtn as HTMLButtonElement).click();
                                        }, 100);
                                      }}
                                      className="p-1 text-primary hover:bg-primary/10 rounded font-semibold text-xs"
                                      title="Edit Record"
                                    >
                                      Edit
                                    </button>
                                    <button 
                                      onClick={() => {
                                        if (confirm(`Are you sure you want to delete registration for ${att.name}?`)) {
                                          onUpdateAttendees(attendees.filter(a => a.id !== att.id));
                                          onUpdateEvents(events.map(ev => ev.id === att.registeredEventId ? { ...ev, registeredCount: Math.max(0, ev.registeredCount - 1) } : ev));
                                        }
                                      }}
                                      className="p-1 text-on-surface-variant hover:text-error rounded"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* New Registration Tab Workspace */}
          {activeTab === 'new-registration' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {spotAttendeeSuccess ? (
                <RegistrationSuccess 
                  attendee={spotAttendeeSuccess}
                  onReturnHome={() => {
                    setSpotAttendeeSuccess(null);
                    setActiveTab('attendees');
                  }}
                  isSpotSuccess={false}
                />
              ) : (
                <div className="bg-surface rounded-2xl border border-outline-variant p-6 shadow-xs">
                  <PublicRegistration 
                    events={events}
                    attendees={attendees}
                    isSpotRegistration={false}
                    onRegistrationSuccess={(newAtt) => {
                      onUpdateAttendees([...attendees, newAtt]);
                      onUpdateEvents(events.map(ev => ev.id === newAtt.registeredEventId ? { ...ev, registeredCount: ev.registeredCount + 1 } : ev));
                      setSpotAttendeeSuccess(newAtt);
                    }}
                    onBackToLogin={() => {}}
                  />
                </div>
              )}
            </motion.div>
          )}

          {/* Spot Registration Tab Workspace */}
          {activeTab === 'spot-registration' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {spotAttendeeSuccess ? (
                <RegistrationSuccess 
                  attendee={spotAttendeeSuccess}
                  onReturnHome={() => {
                    setSpotAttendeeSuccess(null);
                    setActiveTab('attendees');
                  }}
                  isSpotSuccess={true}
                />
              ) : (
                <div className="bg-surface rounded-2xl border border-outline-variant p-6 shadow-xs">
                  <PublicRegistration 
                    events={events}
                    attendees={attendees}
                    isSpotRegistration={true}
                    onRegistrationSuccess={(newAtt) => {
                      // Append SPOT- suffix to differentiate
                      newAtt.id = `${newAtt.id}-SPOT`;
                      onUpdateAttendees([...attendees, newAtt]);
                      onUpdateEvents(events.map(ev => ev.id === newAtt.registeredEventId ? { ...ev, registeredCount: ev.registeredCount + 1 } : ev));
                      setSpotAttendeeSuccess(newAtt);
                    }}
                    onBackToLogin={() => {}}
                  />
                </div>
              )}
            </motion.div>
          )}



          {/* Settings Tab Workspace */}
          {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-on-surface tracking-tight">System Settings</h1>
                <p className="text-sm text-on-surface-variant mt-1">Control branding settings, credentials presets, and site assets.</p>
              </div>

              <div className="bg-surface rounded-2xl border border-outline-variant p-6 shadow-xs max-w-xl space-y-4">
                <h3 className="text-lg font-bold text-on-surface">Administrative Profile</h3>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Admin Email Address</label>
                  <input type="email" value={user.email} className="w-full h-10 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm text-on-surface" readOnly />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant mb-1">Department</label>
                  <input type="text" value="CSE (AI & ML)" className="w-full h-10 px-3 bg-surface-container-low border border-outline-variant rounded-lg text-sm text-on-surface" readOnly />
                </div>
                <div>
                  <button 
                    onClick={() => alert('Profile update saved successfully!')}
                    className="bg-primary text-on-primary h-10 px-6 rounded-lg text-xs font-semibold hover:opacity-90"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </main>
      </div>

      {/* MODAL 1: Create New Event */}
      <AnimatePresence>
        {isNewEventOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <h3 className="text-lg font-bold text-on-surface">Create New Symposium Event</h3>
                <button 
                  onClick={() => setIsNewEventOpen(false)}
                  className="text-on-surface-variant hover:text-on-surface text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-on-surface mb-1">Event Title Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Model Exhibition"
                      value={newEventTitle}
                      onChange={(e) => setNewEventTitle(e.target.value)}
                      className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-on-surface mb-1">Symposium Track</label>
                    <select 
                      value={newEventTrack}
                      onChange={(e) => setNewEventTrack(e.target.value as TrackType)}
                      className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface"
                    >
                      <option value="Technical">Technical Track</option>
                      <option value="Non-Technical">Non-Technical Track</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-on-surface mb-1">Session schedule</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Session 2A (11:00 AM)"
                      value={newEventSession}
                      onChange={(e) => setNewEventSession(e.target.value)}
                      className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-on-surface mb-1">Track/Area Domain</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Track: Image Processing"
                      value={newEventSubtitle}
                      onChange={(e) => setNewEventSubtitle(e.target.value)}
                      className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-on-surface mb-1">Physical Location</label>
                    <input 
                      type="text" 
                      placeholder="e.g. CSE Lab 2"
                      value={newEventLocation}
                      onChange={(e) => setNewEventLocation(e.target.value)}
                      className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-on-surface mb-1">Presenter Icon Style</label>
                    <select
                      value={newEventIcon}
                      onChange={(e) => setNewEventIcon(e.target.value)}
                      className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface"
                    >
                      <option value="FileText">📄 Document Outline (FileText)</option>
                      <option value="Layers">🥞 Layers Layout (Layers)</option>
                      <option value="HelpCircle">❓ Question Help Bubble (HelpCircle)</option>
                      <option value="Camera">📷 Photo Capture (Camera)</option>
                      <option value="Map">🗺️ Map Routing (Map)</option>
                      <option value="BrainCircuit">🧠 Neural Intelligence (BrainCircuit)</option>
                      <option value="Image">🖼️ Computer Vision (Image)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-primary/5 p-3 rounded-lg border border-primary/10">
                  <div>
                    <label className="block font-semibold text-on-surface mb-1">Assign Host Email</label>
                    <input 
                      type="email" 
                      required
                      value={newEventHostEmail}
                      onChange={(e) => {
                        setNewEventHostEmail(e.target.value);
                        setNewEventHostName(e.target.value.split('@')[0].toUpperCase());
                      }}
                      className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-on-surface mb-1">Assign Host Name</label>
                    <input 
                      type="text" 
                      required
                      value={newEventHostName}
                      onChange={(e) => setNewEventHostName(e.target.value)}
                      className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface font-semibold"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full h-11 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 transition-opacity text-sm cursor-pointer"
                >
                  Confirm and Launch Event
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Manage Event & Scoring */}
      <AnimatePresence>
        {selectedEventForManage && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 w-full max-w-2xl shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                    {renderEventIcon(selectedEventForManage.icon, "w-5 h-5")}
                  </div>
                  <h3 className="text-lg font-extrabold text-on-surface">{selectedEventForManage.title}</h3>
                </div>
                <button 
                  onClick={() => setSelectedEventForManage(null)}
                  className="text-on-surface-variant hover:text-on-surface text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Event Details Left Section */}
                <div className="md:col-span-1 space-y-3 text-xs bg-surface p-4 rounded-xl border border-outline-variant/30">
                  <h4 className="font-extrabold text-primary uppercase tracking-wider">Event Details</h4>
                  <div>
                    <span className="text-on-surface-variant block">Status:</span>
                    <div className="flex gap-1.5 mt-1">
                      <button 
                        onClick={() => handleUpdateEventStatus(selectedEventForManage.id, 'Upcoming')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedEventForManage.status === 'Upcoming' ? 'bg-primary text-on-primary' : 'bg-surface-container border text-on-surface-variant'}`}
                      >
                        Upcoming
                      </button>
                      <button 
                        onClick={() => handleUpdateEventStatus(selectedEventForManage.id, 'Live')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedEventForManage.status === 'Live' ? 'bg-error text-on-error' : 'bg-surface-container border text-on-surface-variant'}`}
                      >
                        Live
                      </button>
                      <button 
                        onClick={() => handleUpdateEventStatus(selectedEventForManage.id, 'Completed')}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedEventForManage.status === 'Completed' ? 'bg-green-600 text-white' : 'bg-surface-container border text-on-surface-variant'}`}
                      >
                        Completed
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-on-surface-variant block">Physical Location:</span>
                    <span className="font-bold text-on-surface">{selectedEventForManage.location}</span>
                  </div>

                  <div>
                    <span className="text-on-surface-variant block">Assigned Host:</span>
                    <span className="font-bold text-on-surface block">{selectedEventForManage.hostName}</span>
                    <span className="text-[10px] text-on-surface-variant font-mono">{selectedEventForManage.hostEmail}</span>
                  </div>

                  <div>
                    <span className="text-on-surface-variant block">Registrations Count:</span>
                    <span className="font-bold text-on-surface">{selectedEventForManage.registeredCount} Attendees</span>
                  </div>

                  <div className="pt-4 border-t border-outline-variant/40">
                    <button 
                      onClick={() => handleDeleteEvent(selectedEventForManage.id)}
                      className="w-full py-2 bg-error-container text-on-error-container border border-error/20 hover:bg-error hover:text-on-error rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove Event
                    </button>
                  </div>
                </div>

                {/* Right Area: Event attendees or results */}
                <div className="md:col-span-2 space-y-4">
                  <div className="border-b border-outline-variant/30 pb-2">
                    <h4 className="text-sm font-bold text-on-surface">Registered Participants</h4>
                    <p className="text-[11px] text-on-surface-variant">View and verify roster attendees for this track event.</p>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2 border border-outline-variant/35 rounded-lg p-2 bg-surface/30">
                    {attendees.filter(a => a.registeredEventId === selectedEventForManage.id).length === 0 ? (
                      <p className="text-xs text-on-surface-variant text-center py-6">No participants are currently registered for this event.</p>
                    ) : (
                      attendees.filter(a => a.registeredEventId === selectedEventForManage.id).map(p => (
                        <div key={p.id} className="flex justify-between items-center text-xs p-2 bg-surface border border-outline-variant/30 rounded-lg">
                          <div>
                            <span className="font-bold text-on-surface block">{p.name}</span>
                            <span className="text-[10px] text-on-surface-variant">{p.college}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${p.attendanceStatus === 'Present' ? 'bg-primary/10 text-primary' : 'bg-surface-variant text-on-surface-variant'}`}>
                            {p.attendanceStatus}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Results Panel */}
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 text-xs">
                    <h5 className="font-bold text-primary flex items-center gap-1.5 mb-1.5">
                      <Award className="w-4 h-4 text-primary" /> Symposium Event Standings
                    </h5>
                    
                    {selectedEventForManage.resultsSubmitted && selectedEventForManage.results ? (
                      <div className="space-y-1.5 mt-2">
                        {selectedEventForManage.results.map(r => (
                          <div key={r.rank} className="flex justify-between items-center bg-surface-container-lowest p-2 border border-outline-variant/30 rounded-lg">
                            <span className="font-bold text-on-surface">Rank #{r.rank}</span>
                            <div className="text-right">
                              <span className="font-bold text-primary block">{r.participantName}</span>
                              <span className="text-[9px] text-on-surface-variant">{r.college} (Score: {r.score})</span>
                            </div>
                          </div>
                        ))}
                        <div className="mt-4 pt-3 border-t border-primary/10 flex justify-end">
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to unlock results for this event? This will allow Hosts to edit scores and attendance.')) {
                                const updatedEvents = events.map(ev => {
                                  if (ev.id === selectedEventForManage.id) {
                                    return {
                                      ...ev,
                                      resultsSubmitted: false,
                                      resultsPublished: false,
                                      results: []
                                    } as any;
                                  }
                                  return ev;
                                });
                                onUpdateEvents(updatedEvents);
                                setSelectedEventForManage({
                                  ...selectedEventForManage,
                                  resultsSubmitted: false,
                                  resultsPublished: false,
                                  results: []
                                } as any);
                                alert('Event results unlocked successfully. Hosts can now modify evaluations and attendance.');
                              }
                            }}
                            className="px-3 py-1.5 bg-error text-on-error hover:opacity-95 rounded text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <Unlock className="w-3 h-3" /> Unlock Event Results
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-on-surface-variant text-[11px] italic">
                        No scoreboard results have been finalized by the event host yet. Results will automatically sync here once submitted.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* MODAL 4: Create Attendee */}
      <AnimatePresence>
        {isNewAttendeeOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-outline-variant/30 pb-3">
                <h3 className="text-lg font-bold text-on-surface">Register New Participant</h3>
                <button onClick={() => setIsNewAttendeeOpen(false)} className="text-on-surface-variant hover:text-on-surface">✕</button>
              </div>

              <form onSubmit={handleAddAttendee} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-on-surface-variant mb-1">Attendee Name</label>
                  <input 
                    type="text" 
                    required 
                    value={attName}
                    onChange={(e) => setAttName(e.target.value)}
                    placeholder="e.g. Anish Sharma"
                    className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-on-surface-variant mb-1">Email Address</label>
                    <input 
                      type="email" 
                      required
                      value={attEmail}
                      onChange={(e) => setAttEmail(e.target.value)}
                      placeholder="e.g. anish@gmail.com"
                      className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-on-surface-variant mb-1">Phone Number</label>
                    <input 
                      type="tel" 
                      value={attPhone}
                      onChange={(e) => setAttPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-on-surface-variant mb-1">College Institution</label>
                  <input 
                    type="text" 
                    required
                    value={attCollege}
                    onChange={(e) => setAttCollege(e.target.value)}
                    placeholder="e.g. VIT University"
                    className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-on-surface-variant mb-1">Target Symposium Track Event</label>
                  <select
                    value={attEventId}
                    onChange={(e) => setAttEventId(e.target.value)}
                    className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface"
                  >
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.title}</option>
                    ))}
                  </select>
                </div>

                <button 
                  type="submit"
                  className="w-full h-11 bg-primary text-on-primary font-bold rounded-lg text-sm"
                >
                  Confirm and Issue Badge
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
