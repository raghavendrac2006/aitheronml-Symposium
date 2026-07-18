import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Calendar, Mic, Users, Settings, HelpCircle, 
  Search, Bell, User, Plus, FileText, Layers, HelpCircle as QuizIcon, 
  Camera, Map, Brain, Image as ImageIcon, Check, X, LogOut, ArrowUpRight, 
  MapPin, Clock, Edit3, Trash2, CheckCircle2, AlertCircle, Building, Award, Unlock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SymposiumEvent, Attendee, TrackType, EventStatus, UserSession, Batch } from '../types';
import ParticipantProfile from './ParticipantProfile';
import PublicRegistration from './PublicRegistration';
import RegistrationSuccess from './RegistrationSuccess';
import { clearAllRegistrationsAndReset } from '../firebaseSync';
import ScannerDesk from './ScannerDesk';
import { QrCode, Utensils } from 'lucide-react';

interface AdminDashboardProps {
  user: UserSession;
  events: SymposiumEvent[];
  attendees: Attendee[];
  batches?: Batch[];
  onUpdateEvents: (updated: SymposiumEvent[]) => void;
  onUpdateAttendees: (updated: Attendee[]) => void;
  onSaveBatch?: (batch: Batch) => void;
  onDeleteBatch?: (id: string) => void;
  onLogout: () => void;
}

export default function AdminDashboard({
  user,
  events,
  attendees,
  batches = [],
  onUpdateEvents,
  onUpdateAttendees,
  onSaveBatch,
  onDeleteBatch,
  onLogout
}: AdminDashboardProps) {
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'symposia' | 'attendees' | 'settings' | 'spot-registration' | 'new-registration' | 'results-batches' | 'qr-scanner' | 'food-scanner'>(
    'dashboard'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleResetDatabase = async () => {
    if (window.confirm("ARE YOU ABSOLUTELY SURE? This will permanently delete all student registrations, gate entries, batches, and results, resetting everything back to 0 so you can start testing from the first registration. This action is IRREVERSIBLE.")) {
      setIsResetting(true);
      try {
        await clearAllRegistrationsAndReset();
        alert("The system has been successfully reset! All registrations have been cleared, and event counts are reset to 0. You can now register new participants.");
        window.location.reload();
      } catch (e) {
        console.error("Failed to reset database:", e);
        alert("Reset failed: " + (e instanceof Error ? e.message : String(e)));
      } finally {
        setIsResetting(false);
      }
    }
  };
  
  // Selected Profile State
  const [selectedAttendeeForProfile, setSelectedAttendeeForProfile] = useState<Attendee | null>(null);
  const [spotAttendeeSuccess, setSpotAttendeeSuccess] = useState<Attendee | null>(null);
  const [spotAttendeeSecondSuccess, setSpotAttendeeSecondSuccess] = useState<Attendee | null>(null);

  // Console operational states
  const [activeConsoleFilter, setActiveConsoleFilter] = useState<string>('all');
  const [selectedConsoleIds, setSelectedConsoleIds] = useState<string[]>([]);
  const [showBulkConfirm, setShowBulkConfirm] = useState<'pay' | 'checkin' | 'delete' | 'batch' | null>(null);
  const [bulkTargetBatchId, setBulkTargetBatchId] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  React.useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // New Filters for Registration Management
  const [collegeFilter, setCollegeFilter] = useState<string>('all');
  const [regTypeFilter, setRegTypeFilter] = useState<string>('all');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<string>('all');
  
  // Modals
  const [isNewEventOpen, setIsNewEventOpen] = useState(false);
  const [selectedEventForManage, setSelectedEventForManage] = useState<SymposiumEvent | null>(null);

  // Event Editing States
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [editEventLocation, setEditEventLocation] = useState('');
  const [editEventHostName, setEditEventHostName] = useState('');
  const [editEventHostEmail, setEditEventHostEmail] = useState('');
  const [editEventSession, setEditEventSession] = useState<'Morning' | 'Afternoon'>('Morning');

  // Sidebar and Help modal states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Registration Custom URL Origin State
  const [registrationBaseUrl, setRegistrationBaseUrl] = useState(() => {
    const saved = localStorage.getItem('symposium_registration_base_url');
    return saved || window.location.origin;
  });

  // Attendee Editing States
  const [isEditingAttendee, setIsEditingAttendee] = useState(false);
  const [editAttName, setEditAttName] = useState('');
  const [editAttCollege, setEditAttCollege] = useState('');
  const [editAttYear, setEditAttYear] = useState('');
  const [editAttBranch, setEditAttBranch] = useState('');
  const [editAttPhone, setEditAttPhone] = useState('');
  const [editAttEmail, setEditAttEmail] = useState('');
  const [editAttTeamName, setEditAttTeamName] = useState('');
  const [editAttTeamMembers, setEditAttTeamMembers] = useState<Array<{ name: string; phone: string; email: string; participantId: string }>>([]);

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

  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);

  const consoleFilters = [
    { id: 'all', label: 'All' },
    { id: 'pending-payment', label: 'Pending Payment' },
    { id: 'paid', label: 'Paid' },
    { id: 'checked-in', label: 'Checked In' },
    { id: 'not-checked-in', label: 'Not Checked In' },
    { id: 'morning-session', label: 'Morning Session' },
    { id: 'afternoon-session', label: 'Afternoon Session' },
    { id: 'technical', label: 'Technical' },
    { id: 'non-technical', label: 'Non-Technical' },
  ];

  // Console state selectors
  const filteredConsoleAttendees = attendees.filter(a => {
    const isLeaderOrIndividual = a.regType !== 'team' || a.teamMembers !== undefined || a.accessLevel === 'Team Leader Pass';
    if (!isLeaderOrIndividual) return false;

    const sLower = (attendeeSearch || '').toLowerCase().trim();
    if (sLower) {
      const matchesSearch = (
        (a.participantId || '').toLowerCase().includes(sLower) ||
        (a.id || '').toLowerCase().includes(sLower) ||
        (a.name || '').toLowerCase().includes(sLower) ||
        (a.teamName || '').toLowerCase().includes(sLower) ||
        (a.phone || '').includes(sLower) ||
        (a.college || '').toLowerCase().includes(sLower) ||
        (a.email || '').toLowerCase().includes(sLower) ||
        (a.teamMembers?.some(m => 
          (m.name || '').toLowerCase().includes(sLower) ||
          (m.phone || '').includes(sLower) ||
          (m.email || '').toLowerCase().includes(sLower)
        ) ?? false)
      );
      if (!matchesSearch) return false;
    }

    const ev = events.find(e => e.id === a.registeredEventId);
    if (activeConsoleFilter === 'pending-payment') {
      if (a.paymentStatus === 'Paid') return false;
    } else if (activeConsoleFilter === 'paid') {
      if (a.paymentStatus !== 'Paid') return false;
    } else if (activeConsoleFilter === 'checked-in') {
      if (a.attendanceStatus !== 'Present') return false;
    } else if (activeConsoleFilter === 'not-checked-in') {
      if (a.attendanceStatus === 'Present') return false;
    } else if (activeConsoleFilter === 'morning-session') {
      const s = (ev?.session || '').toLowerCase();
      if (!s.includes('morning') && !s.includes('full-day') && !s.includes('full day')) return false;
    } else if (activeConsoleFilter === 'afternoon-session') {
      const s = (ev?.session || '').toLowerCase();
      if (!s.includes('afternoon') && !s.includes('full-day') && !s.includes('full day')) return false;
    } else if (activeConsoleFilter === 'technical') {
      if (ev?.track !== 'Technical') return false;
    } else if (activeConsoleFilter === 'non-technical') {
      if (ev?.track !== 'Non-Technical') return false;
    }

    return true;
  });

  const currentActiveAttendee = filteredConsoleAttendees.find(a => a.id === selectedAttendeeForProfile?.id) || filteredConsoleAttendees[0] || null;

  const handleTogglePayment = async (att: Attendee) => {
    const nextStatus = att.paymentStatus === 'Paid' ? 'Pending' : 'Paid';
    const updatedAtt = { ...att, paymentStatus: nextStatus } as Attendee;
    
    const updatedList = attendees.map(a => a.id === att.id ? updatedAtt : a);
    onUpdateAttendees(updatedList);
    
    if (selectedAttendeeForProfile?.id === att.id || (!selectedAttendeeForProfile && filteredConsoleAttendees[0]?.id === att.id)) {
      setSelectedAttendeeForProfile(updatedAtt);
    }
    
    const { saveAttendeeToFirestore: saveFn } = await import('../firebaseSync');
    await saveFn(updatedAtt);

    if (nextStatus === 'Paid') {
      setToast({ message: 'Payment Verified', type: 'success' });
    } else {
      setToast({ message: 'Payment Set to Pending', type: 'info' });
    }
  };

  const handleToggleAttendance = async (att: Attendee) => {
    const nextStatus = att.attendanceStatus === 'Present' ? 'Pending' : 'Present';
    const updatedAtt = { 
      ...att, 
      attendanceStatus: nextStatus,
      checkedInAt: nextStatus === 'Present' ? new Date().toISOString() : undefined
    } as Attendee;

    const updatedList = attendees.map(a => a.id === att.id ? updatedAtt : a);
    onUpdateAttendees(updatedList);

    if (selectedAttendeeForProfile?.id === att.id || (!selectedAttendeeForProfile && filteredConsoleAttendees[0]?.id === att.id)) {
      setSelectedAttendeeForProfile(updatedAtt);
    }

    const { saveAttendeeToFirestore: saveFn } = await import('../firebaseSync');
    await saveFn(updatedAtt);

    if (nextStatus === 'Present') {
      setToast({ message: 'Participant Checked In', type: 'success' });
    } else {
      setToast({ message: 'Check-in Revoked', type: 'info' });
    }
  };

  const handleRemarksChange = async (att: Attendee, val: string) => {
    const updatedAtt = { ...att, remarks: val } as Attendee;

    const updatedList = attendees.map(a => a.id === att.id ? updatedAtt : a);
    onUpdateAttendees(updatedList);

    if (selectedAttendeeForProfile?.id === att.id || (!selectedAttendeeForProfile && filteredConsoleAttendees[0]?.id === att.id)) {
      setSelectedAttendeeForProfile(updatedAtt);
    }

    const { saveAttendeeToFirestore: saveFn } = await import('../firebaseSync');
    await saveFn(updatedAtt);
  };

  const handleSaveAttendee = async (att: Attendee) => {
    const { saveAttendeeToFirestore: saveFn } = await import('../firebaseSync');
    await saveFn(att);
    setToast({ message: 'Participant details saved', type: 'success' });
  };

  const handleSaveAndNext = async () => {
    const active = currentActiveAttendee;
    if (!active) return;

    const { saveAttendeeToFirestore: saveFn } = await import('../firebaseSync');
    await saveFn(active);

    const currentIndex = filteredConsoleAttendees.findIndex(a => a.id === active.id);
    const nextIndex = currentIndex + 1;

    if (nextIndex >= filteredConsoleAttendees.length) {
      setToast({ message: 'Saved. End of list reached', type: 'info' });
      return;
    }

    const nextAtt = filteredConsoleAttendees[nextIndex];
    setSelectedAttendeeForProfile(nextAtt);

    setTimeout(() => {
      const rowEl = document.getElementById(`row-${nextAtt.id}`);
      if (rowEl) {
        rowEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 50);

    setToast({ message: 'Saved & Loaded next participant', type: 'success' });
  };

  const moveSelection = (dir: number) => {
    if (filteredConsoleAttendees.length === 0) return;
    const active = currentActiveAttendee;
    const currentIndex = active ? filteredConsoleAttendees.findIndex(a => a.id === active.id) : -1;
    
    let nextIndex = currentIndex + dir;
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= filteredConsoleAttendees.length) nextIndex = filteredConsoleAttendees.length - 1;

    const nextAtt = filteredConsoleAttendees[nextIndex];
    if (nextAtt) {
      setSelectedAttendeeForProfile(nextAtt);
      const rowEl = document.getElementById(`row-${nextAtt.id}`);
      if (rowEl) {
        rowEl.scrollIntoView({ block: 'nearest' });
      }
    }
  };

  const handleBulkMarkPaid = async () => {
    if (selectedConsoleIds.length === 0) return;
    const { saveAttendeeToFirestore: saveFn } = await import('../firebaseSync');
    
    let updatedList = [...attendees];
    for (const id of selectedConsoleIds) {
      const att = attendees.find(a => a.id === id);
      if (att) {
        const updatedAtt = { ...att, paymentStatus: 'Paid' } as Attendee;
        updatedList = updatedList.map(a => a.id === id ? updatedAtt : a);
        await saveFn(updatedAtt);
      }
    }
    
    onUpdateAttendees(updatedList);
    setSelectedConsoleIds([]);
    setShowBulkConfirm(null);
    setToast({ message: 'Selected participants marked as Paid', type: 'success' });
  };

  const handleBulkMarkCheckedIn = async () => {
    if (selectedConsoleIds.length === 0) return;
    const { saveAttendeeToFirestore: saveFn } = await import('../firebaseSync');

    let updatedList = [...attendees];
    for (const id of selectedConsoleIds) {
      const att = attendees.find(a => a.id === id);
      if (att) {
        const updatedAtt = { 
          ...att, 
          attendanceStatus: 'Present',
          checkedInAt: new Date().toISOString()
        } as Attendee;
        updatedList = updatedList.map(a => a.id === id ? updatedAtt : a);
        await saveFn(updatedAtt);
      }
    }

    onUpdateAttendees(updatedList);
    setSelectedConsoleIds([]);
    setShowBulkConfirm(null);
    setToast({ message: 'Selected participants Checked In', type: 'success' });
  };

  const handleBulkDelete = async () => {
    if (selectedConsoleIds.length === 0) return;
    const { deleteDoc, doc } = await import('firebase/firestore');
    const { db } = await import('../firebase');

    let updatedList = attendees.filter(a => !selectedConsoleIds.includes(a.id));
    let updatedEvents = [...events];

    for (const id of selectedConsoleIds) {
      const att = attendees.find(a => a.id === id);
      if (att) {
        try {
          await deleteDoc(doc(db, 'participants', id));
        } catch (e) {
          console.warn("Bulk delete document error:", e);
        }
        updatedEvents = updatedEvents.map(ev => ev.id === att.registeredEventId ? { ...ev, registeredCount: Math.max(0, ev.registeredCount - 1) } : ev);
      }
    }

    onUpdateAttendees(updatedList);
    onUpdateEvents(updatedEvents);
    setSelectedConsoleIds([]);
    setShowBulkConfirm(null);
    setToast({ message: 'Selected registrations revoked', type: 'success' });
  };

  const handleBulkAssignBatch = async () => {
    if (selectedConsoleIds.length === 0 || !bulkTargetBatchId) return;
    const selectedBatch = (batches || []).find(b => b.id === bulkTargetBatchId);
    if (!selectedBatch) return;

    const { saveAttendeeToFirestore: saveFn } = await import('../firebaseSync');

    let updatedList = [...attendees];
    for (const id of selectedConsoleIds) {
      const att = attendees.find(a => a.id === id);
      if (att) {
        const updatedAtt = { 
          ...att, 
          batchId: selectedBatch.id,
          batchName: selectedBatch.name
        } as Attendee;
        updatedList = updatedList.map(a => a.id === id ? updatedAtt : a);
        await saveFn(updatedAtt);
      }
    }

    onUpdateAttendees(updatedList);
    setSelectedConsoleIds([]);
    setBulkTargetBatchId('');
    setShowBulkConfirm(null);
    setToast({ message: `Assigned selected participants to ${selectedBatch.name}`, type: 'success' });
  };

  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isEditing = active && (
        active.tagName === 'INPUT' || 
        active.tagName === 'TEXTAREA' || 
        active.getAttribute('contenteditable') === 'true'
      );

      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (currentActiveAttendee) {
          handleSaveAttendee(currentActiveAttendee);
        }
        return;
      }

      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleSaveAndNext();
        return;
      }

      if (isEditing) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveSelection(-1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveSelection(1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentActiveAttendee) {
          handleToggleAttendance(currentActiveAttendee);
        }
      } else {
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const searchInput = document.getElementById('console-search-input');
          if (searchInput) {
            searchInput.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [filteredConsoleAttendees, currentActiveAttendee]);

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
  const activeHostsSet = new Set(events.map(e => e.hostEmail).filter(Boolean));
  const dynamicTotalParticipants = attendees.length;
  const dynamicTotalEvents = events.length;
  const dynamicActiveHosts = activeHostsSet.size;
  const todayPrefix = new Date().toISOString().split('T')[0];
  const todaysRegistrations = attendees.filter(a => a.createdAt && a.createdAt.startsWith(todayPrefix)).length;

  const handleDownloadAllData = () => {
    // Generate CSV contents
    const headers = [
      'Student Name',
      'Registration Type',
      'Team Name',
      'Participant ID',
      'Email ID',
      'Mobile Number',
      'Registered Event'
    ];

    const rows: string[][] = [];

    attendees.forEach(a => {
      // Leader row
      rows.push([
        a.name,
        a.regType || 'individual',
        a.teamName || 'N/A',
        a.participantId || a.id,
        a.email,
        a.phone,
        a.registeredEventTitle
      ]);

      // Team members rows
      if (a.regType === 'team' && a.teamMembers) {
        a.teamMembers.forEach(m => {
          rows.push([
            m.name,
            'team',
            a.teamName || 'N/A',
            a.participantId || a.id, // shares identical participant ID
            m.email,
            m.phone,
            a.registeredEventTitle
          ]);
        });
      }
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${(val || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `symposium_all_students_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast({ message: 'Symposium data exported successfully to CSV!', type: 'success' });
  };

  const handleSaveEventEdits = async () => {
    if (!selectedEventForManage) return;

    const updatedEvent = {
      ...selectedEventForManage,
      location: editEventLocation,
      venue: editEventLocation,
      hostName: editEventHostName,
      hostEmail: editEventHostEmail,
      session: editEventSession
    } as SymposiumEvent;

    const updatedEventsList = events.map(e => e.id === selectedEventForManage.id ? updatedEvent : e);
    onUpdateEvents(updatedEventsList);

    setSelectedEventForManage(updatedEvent);
    setIsEditingEvent(false);

    const { saveEventToFirestore } = await import('../firebaseSync');
    await saveEventToFirestore(updatedEvent);

    setToast({ message: 'Event details updated successfully', type: 'success' });
  };

  const handleDownloadQrHd = async (urlToEncode: string) => {
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(urlToEncode)}`;
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'symposium_registration_qr_hd.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast({ message: 'HD QR Code downloaded successfully!', type: 'success' });
    } catch (err) {
      console.error(err);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(urlToEncode)}`;
      window.open(qrUrl, '_blank');
      setToast({ message: 'Opened HD QR Code in new window', type: 'info' });
    }
  };

  const handleCopyLink = (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setToast({ message: 'Registration link copied to clipboard!', type: 'success' });
      }).catch((err) => {
        console.warn('Clipboard write failed, using fallback copy strategy', err);
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setToast({ message: 'Registration link copied to clipboard!', type: 'success' });
    } catch (err) {
      console.error('Fallback copy failed', err);
      setToast({ message: 'Failed to copy link. Please manually copy the URL.', type: 'error' });
    }
    document.body.removeChild(textArea);
  };

  const handleSaveAttendeeEdits = async () => {
    if (!currentActiveAttendee) return;

    const updatedAttendee = {
      ...currentActiveAttendee,
      name: editAttName,
      college: editAttCollege,
      year: editAttYear,
      branch: editAttBranch,
      phone: editAttPhone,
      email: editAttEmail,
      teamName: editAttTeamName || undefined,
      teamMembers: editAttTeamMembers.length > 0 ? editAttTeamMembers : undefined
    } as Attendee;

    const updatedList = attendees.map(a => a.id === currentActiveAttendee.id ? updatedAttendee : a);
    onUpdateAttendees(updatedList);

    setSelectedAttendeeForProfile(updatedAttendee);
    setIsEditingAttendee(false);

    const { saveAttendeeToFirestore } = await import('../firebaseSync');
    await saveAttendeeToFirestore(updatedAttendee);

    setToast({ message: 'Participant details updated successfully!', type: 'success' });
  };

  useEffect(() => {
    if (currentActiveAttendee) {
      setEditAttName(currentActiveAttendee.name || '');
      setEditAttCollege(currentActiveAttendee.college || '');
      setEditAttYear(currentActiveAttendee.year || '');
      setEditAttBranch(currentActiveAttendee.branch || '');
      setEditAttPhone(currentActiveAttendee.phone || '');
      setEditAttEmail(currentActiveAttendee.email || '');
      setEditAttTeamName(currentActiveAttendee.teamName || '');
      setEditAttTeamMembers(currentActiveAttendee.teamMembers || []);
      setIsEditingAttendee(false);
    }
  }, [currentActiveAttendee?.id]);

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
          {/* Collapse sidebar button */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            className="hidden lg:flex items-center justify-center p-2 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer mr-1"
          >
            <span className="material-symbols-outlined !text-xl">
              {isSidebarCollapsed ? "menu" : "menu_open"}
            </span>
          </button>
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
        <nav className={`${isSidebarCollapsed ? 'hidden' : 'hidden lg:flex'} flex-col w-[220px] bg-surface border-r border-outline-variant fixed left-0 top-16 bottom-0 z-30 py-6`}>
          <div className="px-4 pb-4 mb-4 border-b border-outline-variant/50">
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
                    setActiveTab('dashboard');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-full transition-all ${
                    activeTab === 'dashboard' 
                      ? 'bg-secondary-container text-on-secondary-container' 
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span>Overview</span>
                </button>

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
                  onClick={() => {
                    setSelectedAttendeeForProfile(null);
                    setSpotAttendeeSuccess(null);
                    setActiveTab('qr-scanner');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-full transition-all ${
                    activeTab === 'qr-scanner' 
                      ? 'bg-secondary-container text-on-secondary-container' 
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <QrCode className="w-4 h-4 shrink-0" />
                  <span>Pass Check-in</span>
                </button>

                <button 
                  onClick={() => {
                    setSelectedAttendeeForProfile(null);
                    setSpotAttendeeSuccess(null);
                    setActiveTab('food-scanner');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-full transition-all ${
                    activeTab === 'food-scanner' 
                      ? 'bg-secondary-container text-on-secondary-container' 
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <Utensils className="w-4 h-4 shrink-0" />
                  <span>Food Redemption</span>
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
                  onClick={() => {
                    setSelectedAttendeeForProfile(null);
                    setSpotAttendeeSuccess(null);
                    setActiveTab('results-batches');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-full transition-all ${
                    activeTab === 'results-batches' 
                      ? 'bg-secondary-container text-on-secondary-container' 
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <Award className="w-4 h-4 shrink-0" />
                  <span>Results &amp; Batches</span>
                </button>

                <button 
                  onClick={() => {
                    setSelectedAttendeeForProfile(null);
                    setSpotAttendeeSuccess(null);
                    setActiveTab('qr-scanner');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-full transition-all ${
                    activeTab === 'qr-scanner' 
                      ? 'bg-secondary-container text-on-secondary-container' 
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <QrCode className="w-4 h-4 shrink-0" />
                  <span>Pass Check-in</span>
                </button>

                <button 
                  onClick={() => {
                    setSelectedAttendeeForProfile(null);
                    setSpotAttendeeSuccess(null);
                    setActiveTab('food-scanner');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold rounded-full transition-all ${
                    activeTab === 'food-scanner' 
                      ? 'bg-secondary-container text-on-secondary-container' 
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <Utensils className="w-4 h-4 shrink-0" />
                  <span>Food Redemption</span>
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
              onClick={() => setIsHelpModalOpen(true)}
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
        <main className={`flex-1 ${isSidebarCollapsed ? 'lg:ml-0' : 'lg:ml-[220px]'} p-4 md:p-8 bg-surface-bright min-h-[calc(100vh-4rem)] transition-all duration-300`}>
          
          {/* Dashboard Tab Workspace */}
          {activeTab === 'dashboard' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              
              {/* Screen title heading bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant/30 pb-4">
                <div>
                  <h1 className="text-3xl font-bold text-on-surface tracking-tight">Symposium Overview</h1>
                  <p className="text-sm text-on-surface-variant mt-1">High-level metrics and active event management.</p>
                </div>
                {user.role === 'superadmin' && (
                  <button
                    onClick={handleDownloadAllData}
                    className="h-10 px-4 bg-primary text-on-primary font-bold rounded-xl text-xs flex items-center gap-1.5 hover:bg-primary/95 transition-all shadow-xs cursor-pointer shrink-0"
                  >
                    <span className="material-symbols-outlined !text-sm">download</span>
                    <span>Export All Students (CSV)</span>
                  </button>
                )}
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
                    <span>Real-time database sync</span>
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
                    Assigned coordinator roles
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
                    <span>Registered on {new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Wall pasted Self-Registration QR Code Card */}
              <div className="bg-surface rounded-2xl p-6 border border-surface-variant shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="space-y-3 text-left w-full lg:max-w-xl">
                  <h3 className="text-lg font-bold text-on-surface">Self-Registration QR Code & URL Link</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Project or print this QR code. Participants can scan it with their mobile devices or click the registration link to open the self-registration form directly, bypassing the admin login screen.
                  </p>
                  
                  {/* Custom Domain Settings Field */}
                  <div className="space-y-1 bg-surface-container-low p-3 rounded-xl border border-outline-variant/30">
                    <label className="block text-[10px] font-bold text-primary uppercase">Custom Registration Domain</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={registrationBaseUrl}
                        onChange={(e) => {
                          setRegistrationBaseUrl(e.target.value);
                          localStorage.setItem('symposium_registration_base_url', e.target.value);
                        }}
                        placeholder="e.g. https://symposium-kec.vercel.app"
                        className="flex-1 h-8 px-2.5 bg-surface border border-outline-variant rounded-lg text-xs outline-none focus:border-primary text-on-surface"
                      />
                      <button
                        onClick={() => {
                          setRegistrationBaseUrl(window.location.origin);
                          localStorage.removeItem('symposium_registration_base_url');
                          setToast({ message: 'Reset to local connection origin', type: 'info' });
                        }}
                        className="h-8 px-2.5 bg-surface border border-outline text-on-surface rounded-lg text-[10px] font-bold uppercase hover:bg-surface-container transition-all cursor-pointer"
                      >
                        Reset Origin
                      </button>
                    </div>
                    <span className="text-[9px] text-on-surface-variant block mt-1">
                      ℹ️ Edit this URL if your symposium registration is hosted on a custom Vercel domain.
                    </span>
                  </div>

                  <div className="pt-2 text-xs font-semibold text-primary flex items-center gap-2 flex-wrap">
                    <span>Registration Link:</span>
                    <a 
                      href={`${registrationBaseUrl}/?mode=register&hideAdminSignIn=true`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="underline hover:text-primary/80 font-mono break-all"
                    >
                      {registrationBaseUrl}/?mode=register&hideAdminSignIn=true
                    </a>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-3 bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 shrink-0 w-full sm:w-auto">
                  <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-outline-variant shadow-xs">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(registrationBaseUrl + '/?mode=register&hideAdminSignIn=true')}`}
                      alt="Registration QR Code" 
                      className="w-36 h-36"
                    />
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1.5">Scan to Register</span>
                  </div>
                  <div className="flex items-center gap-2 w-full">
                    <button
                      onClick={() => handleDownloadQrHd(`${registrationBaseUrl}/?mode=register&hideAdminSignIn=true`)}
                      title="Download high-definition 1000x1000px QR code"
                      className="flex-1 h-9 px-3 bg-primary text-on-primary font-bold rounded-lg text-[10px] flex items-center justify-center gap-1 hover:bg-primary/95 transition-all cursor-pointer shadow-xs"
                    >
                      <span className="material-symbols-outlined !text-sm">download</span>
                      <span>Download HD</span>
                    </button>
                    <button
                      onClick={() => handleCopyLink(`${registrationBaseUrl}/?mode=register&hideAdminSignIn=true`)}
                      title="Copy registration link"
                      className="h-9 w-9 bg-surface border border-outline text-on-surface hover:bg-surface-container rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-xs"
                    >
                      <span className="material-symbols-outlined !text-sm">content_copy</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bento Grid: All Symposium Events matching design system constraints */}
              <div className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-6 shadow-sm">
                
                {/* Header row with + New Event button */}
                <div className="flex items-center justify-between mb-6 border-b border-outline-variant/30 pb-4">
                  <h2 className="text-xl font-bold text-on-surface">All Symposium Events</h2>
                  {user.role === 'superadmin' && (
                    <button 
                      onClick={() => setIsNewEventOpen(true)}
                      className="h-10 bg-primary text-on-primary font-semibold text-xs px-4 rounded-xl hover:bg-primary/95 shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      New Event
                    </button>
                  )}
                </div>

                {/* Two main tracks layout grids stacked vertically */}
                <div className="space-y-8">
                  
                  {/* Technical Track list */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-extrabold text-primary uppercase tracking-wider border-b border-primary/20 pb-1.5 mb-3">
                      Technical Track
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                              <Edit3 className="w-3.5 h-3.5" /> Manage Event
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Non-Technical Track list */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-extrabold text-secondary uppercase tracking-wider border-b border-secondary/25 pb-1.5 mb-3">
                      Non-Technical Track
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                  ? 'bg-error-container text-on-error-container animate-pulse' 
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





          {/* Attendees Tab Workspace (Fast Operations Console Redesign) */}
          {activeTab === 'attendees' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
              {/* Header section with Stats & Actions */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-on-surface tracking-tight flex items-center gap-2">
                    <span className="material-symbols-outlined !text-3xl text-primary">terminal</span>
                    Registration Desk Console
                  </h1>
                  <p className="text-xs text-on-surface-variant font-semibold">
                    Real-time participant check-in, payment verification, and batch assignments.
                  </p>
                </div>
                
                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                  {/* Status Stats Summary Pill */}
                  <div className="hidden lg:flex items-center gap-4 bg-surface-container-low px-4 py-1.5 rounded-full border border-outline-variant/30 text-[11px] font-bold shrink-0">
                    <span className="text-on-surface-variant">
                      Total: <strong className="text-primary">{attendees.length}</strong>
                    </span>
                    <span className="h-3 w-px bg-outline-variant/60" />
                    <span className="text-emerald-600">
                      Paid: <strong>{attendees.filter(a => a.paymentStatus === 'Paid').length}</strong>
                    </span>
                    <span className="h-3 w-px bg-outline-variant/60" />
                    <span className="text-primary">
                      Checked In: <strong>{attendees.filter(a => a.attendanceStatus === 'Present').length}</strong>
                    </span>
                  </div>

                  <button 
                    onClick={() => setIsRightPanelCollapsed(!isRightPanelCollapsed)}
                    className="flex items-center gap-2 h-10 px-3 md:px-4 bg-surface border border-outline rounded-xl text-xs font-semibold hover:bg-surface-container transition-all cursor-pointer shadow-xs shrink-0"
                  >
                    <span className="material-symbols-outlined !text-sm">
                      {isRightPanelCollapsed ? 'dock_to_left' : 'dock_to_right'}
                    </span>
                    <span className="hidden sm:inline">{isRightPanelCollapsed ? 'Show Quick Actions' : 'Hide Quick Actions'}</span>
                    <span className="sm:hidden">{isRightPanelCollapsed ? 'Show Actions' : 'Hide Actions'}</span>
                  </button>

                  <button 
                    onClick={() => {
                      setSelectedAttendeeForProfile(null);
                      setSpotAttendeeSuccess(null);
                      setActiveTab('spot-registration');
                    }}
                    className="bg-primary text-on-primary h-10 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 hover:bg-primary/95 transition-all cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" /> Spot Register
                  </button>
                </div>
              </div>

              {/* Toast Message Display */}
              {toast && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-on-surface text-surface shadow-lg text-xs font-bold animate-slide-up">
                  <span className="material-symbols-outlined text-primary-fixed !text-base">
                    {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
                  </span>
                  <span>{toast.message}</span>
                </div>
              )}

              {/* Bulk operations bar */}
              {selectedConsoleIds.length > 0 && (
                <motion.div 
                  initial={{ y: -20, opacity: 0 }} 
                  animate={{ y: 0, opacity: 1 }} 
                  className="bg-primary-fixed text-on-primary-fixed px-5 py-3 rounded-2xl border border-primary/25 flex flex-wrap gap-4 items-center justify-between shadow-md"
                >
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="material-symbols-outlined !text-lg">rule</span>
                    <span>{selectedConsoleIds.length} participants selected</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button 
                      onClick={() => setShowBulkConfirm('pay')}
                      className="bg-surface hover:bg-surface-container text-on-surface px-3 py-1.5 rounded-lg text-xs font-bold border border-outline-variant/40 cursor-pointer transition-all"
                    >
                      Mark Paid
                    </button>
                    <button 
                      onClick={() => setShowBulkConfirm('checkin')}
                      className="bg-surface hover:bg-surface-container text-on-surface px-3 py-1.5 rounded-lg text-xs font-bold border border-outline-variant/40 cursor-pointer transition-all"
                    >
                      Mark Checked In
                    </button>
                    <button 
                      onClick={() => setShowBulkConfirm('batch')}
                      className="bg-surface hover:bg-surface-container text-on-surface px-3 py-1.5 rounded-lg text-xs font-bold border border-outline-variant/40 cursor-pointer transition-all"
                    >
                      Assign Batch
                    </button>
                    <button 
                      onClick={() => setShowBulkConfirm('delete')}
                      className="bg-error-container hover:bg-error-container/90 text-on-error-container px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all"
                    >
                      Delete Registrations
                    </button>
                    <button 
                      onClick={() => setSelectedConsoleIds([])}
                      className="text-on-surface-variant hover:text-on-surface px-2 text-xs font-semibold cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Split Layout Container */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT PANEL: Search, filters, list (col-span-7 or full-width) */}
                <div className={`${isRightPanelCollapsed ? "lg:col-span-12" : "lg:col-span-7"} space-y-4`}>
                  
                  {/* Search and Filters box */}
                  <div className="bg-surface p-4 rounded-2xl border border-outline-variant/60 space-y-3 shadow-xs">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
                      <input 
                        id="console-search-input"
                        type="text" 
                        placeholder="Smart Search (Type ID, Name, Phone, Email, Team name...)" 
                        value={attendeeSearch}
                        onChange={(e) => setAttendeeSearch(e.target.value)}
                        className="w-full h-11 pl-10 pr-4 bg-surface-container border border-outline rounded-xl text-xs font-semibold focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                      />
                      {attendeeSearch && (
                        <button 
                          onClick={() => setAttendeeSearch('')}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface text-xs font-bold"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Quick Pill Filters */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                      {consoleFilters.map(filter => {
                        const isActive = activeConsoleFilter === filter.id;
                        return (
                          <button
                            key={filter.id}
                            onClick={() => {
                              setActiveConsoleFilter(filter.id);
                              setSelectedConsoleIds([]);
                            }}
                            className={`h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer shrink-0 border ${
                              isActive 
                                ? 'bg-primary border-primary text-on-primary shadow-xs' 
                                : 'bg-surface border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
                            }`}
                          >
                            {filter.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Participant List */}
                  <div className="bg-surface rounded-2xl border border-outline-variant/60 overflow-hidden shadow-xs">
                    <div className="max-h-[600px] overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-surface-container-low border-b border-outline-variant/50 sticky top-0 z-10">
                            <th className="p-3 w-10 text-center">
                              <input 
                                type="checkbox"
                                checked={filteredConsoleAttendees.length > 0 && selectedConsoleIds.length === filteredConsoleAttendees.length}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedConsoleIds(filteredConsoleAttendees.map(a => a.id));
                                  } else {
                                    setSelectedConsoleIds([]);
                                  }
                                }}
                                className="w-3.5 h-3.5 text-primary border-outline rounded focus:ring-primary"
                              />
                            </th>
                            <th className="p-3 font-bold text-on-surface uppercase tracking-wider text-[10px]">Participant</th>
                            <th className="p-3 font-bold text-on-surface uppercase tracking-wider text-[10px]">Registered Event</th>
                            <th className="p-3 font-bold text-on-surface uppercase tracking-wider text-[10px]">Payment</th>
                            <th className="p-3 font-bold text-on-surface uppercase tracking-wider text-[10px]">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredConsoleAttendees.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-on-surface-variant font-medium">
                                No participants matched the current search / filters.
                              </td>
                            </tr>
                          ) : (
                            filteredConsoleAttendees.map(att => {
                              const isSelected = currentActiveAttendee?.id === att.id;
                              const isChecked = selectedConsoleIds.includes(att.id);
                              
                              const paymentColorClass = att.paymentStatus === 'Paid' 
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20';

                              const attendanceColorClass = att.attendanceStatus === 'Present'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';

                              return (
                                <tr 
                                  key={att.id} 
                                  id={`row-${att.id}`}
                                  onClick={(e) => {
                                    if ((e.target as HTMLElement).tagName === 'INPUT') return;
                                    setSelectedAttendeeForProfile(att);
                                  }}
                                  className={`border-b border-outline-variant/20 hover:bg-surface-container-low transition-colors cursor-pointer select-none ${
                                    isSelected ? 'bg-primary/5 border-l-4 border-l-primary font-bold' : ''
                                  }`}
                                >
                                  <td className="p-3 text-center">
                                    <input 
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedConsoleIds([...selectedConsoleIds, att.id]);
                                        } else {
                                          setSelectedConsoleIds(selectedConsoleIds.filter(id => id !== att.id));
                                        }
                                      }}
                                      className="w-3.5 h-3.5 text-primary border-outline rounded focus:ring-primary"
                                    />
                                  </td>
                                  <td className="p-3 space-y-0.5">
                                    <div className="font-bold text-on-surface text-sm flex items-center gap-1.5">
                                      {att.teamName ? (
                                        <span className="truncate">Team: {att.teamName}</span>
                                      ) : (
                                        <span className="truncate">{att.name}</span>
                                      )}
                                      <span className="text-[10px] text-primary/75 bg-primary/5 px-1.5 py-0.25 rounded-md font-semibold">
                                        {att.id}
                                      </span>
                                    </div>
                                    {att.teamName && (
                                      <div className="text-[10px] text-on-surface-variant font-medium">Leader: {att.name}</div>
                                    )}
                                    <div className="text-[10px] text-on-surface-variant">
                                      {att.phone} • {att.email}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <div className="font-semibold text-on-surface">{att.registeredEventTitle}</div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.25 rounded ${
                                        att.regType === 'team' ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-primary-fixed text-on-primary-fixed'
                                      }`}>
                                        {att.regType || 'individual'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${paymentColorClass}`}>
                                      {att.paymentStatus === 'Paid' ? 'Paid' : 'Pending'}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${attendanceColorClass}`}>
                                      {att.attendanceStatus === 'Present' ? 'Checked In' : 'Absent'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

{/* RIGHT PANEL: Quick Action Panel (col-span-5) */}
                 {!isRightPanelCollapsed && (
                   <div className="lg:col-span-5">
                     {currentActiveAttendee ? (
                       <div className="bg-surface rounded-2xl border border-outline-variant/60 p-6 space-y-6 shadow-md sticky top-6">
                         
                         {/* Title / Action Header */}
                         <div className="border-b border-outline-variant/40 pb-4 flex justify-between items-start">
                           <div>
                             <div className="text-[10px] font-black uppercase text-primary tracking-widest">Selected Participant</div>
                             <h2 className="text-lg font-black text-on-surface mt-0.5 leading-tight">
                               {currentActiveAttendee.teamName ? `Team: ${currentActiveAttendee.teamName}` : currentActiveAttendee.name}
                             </h2>
                             <div className="text-xs text-on-surface-variant font-medium mt-1">
                               ID: <strong className="text-primary font-bold">{currentActiveAttendee.id}</strong>
                             </div>
                           </div>
                           <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                             currentActiveAttendee.regType === 'team' ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-primary-fixed text-on-primary-fixed'
                           }`}>
                             {currentActiveAttendee.regType || 'individual'}
                           </span>
                         </div>

                         {/* Participant Fields (Editable or Static) */}
                         {isEditingAttendee ? (
                           <div className="space-y-4 text-xs font-semibold text-on-surface-variant">
                             <div className="grid grid-cols-2 gap-3">
                               <div>
                                 <label className="block text-[10px] font-bold text-primary uppercase mb-1">Leader / Name</label>
                                 <input
                                   type="text"
                                   value={editAttName}
                                   onChange={(e) => setEditAttName(e.target.value)}
                                   className="w-full h-9 px-2 bg-surface border border-outline rounded-lg text-xs outline-none focus:border-primary text-on-surface"
                                 />
                               </div>
                               <div>
                                 <label className="block text-[10px] font-bold text-primary uppercase mb-1">College</label>
                                 <input
                                   type="text"
                                   value={editAttCollege}
                                   onChange={(e) => setEditAttCollege(e.target.value)}
                                   className="w-full h-9 px-2 bg-surface border border-outline rounded-lg text-xs outline-none focus:border-primary text-on-surface"
                                 />
                               </div>
                               <div>
                                 <label className="block text-[10px] font-bold text-primary uppercase mb-1">Year</label>
                                 <input
                                   type="text"
                                   value={editAttYear}
                                   onChange={(e) => setEditAttYear(e.target.value)}
                                   className="w-full h-9 px-2 bg-surface border border-outline rounded-lg text-xs outline-none focus:border-primary text-on-surface"
                                 />
                               </div>
                               <div>
                                 <label className="block text-[10px] font-bold text-primary uppercase mb-1">Branch</label>
                                 <input
                                   type="text"
                                   value={editAttBranch}
                                   onChange={(e) => setEditAttBranch(e.target.value)}
                                   className="w-full h-9 px-2 bg-surface border border-outline rounded-lg text-xs outline-none focus:border-primary text-on-surface"
                                 />
                               </div>
                               <div>
                                 <label className="block text-[10px] font-bold text-primary uppercase mb-1">Phone</label>
                                 <input
                                   type="text"
                                   value={editAttPhone}
                                   onChange={(e) => setEditAttPhone(e.target.value)}
                                   className="w-full h-9 px-2 bg-surface border border-outline rounded-lg text-xs outline-none focus:border-primary text-on-surface"
                                 />
                               </div>
                               <div>
                                 <label className="block text-[10px] font-bold text-primary uppercase mb-1">Email</label>
                                 <input
                                   type="email"
                                   value={editAttEmail}
                                   onChange={(e) => setEditAttEmail(e.target.value)}
                                   className="w-full h-9 px-2 bg-surface border border-outline rounded-lg text-xs outline-none focus:border-primary text-on-surface"
                                 />
                               </div>
                               {currentActiveAttendee.regType === 'team' && (
                                 <div className="col-span-2">
                                   <label className="block text-[10px] font-bold text-primary uppercase mb-1">Team Name</label>
                                   <input
                                     type="text"
                                     value={editAttTeamName}
                                     onChange={(e) => setEditAttTeamName(e.target.value)}
                                     className="w-full h-9 px-2 bg-surface border border-outline rounded-lg text-xs outline-none focus:border-primary text-on-surface"
                                   />
                                 </div>
                               )}
                             </div>

                             {/* Editable Team Members */}
                             {currentActiveAttendee.regType === 'team' && editAttTeamMembers.length > 0 && (
                               <div className="space-y-3 pt-2 border-t border-outline-variant/20">
                                 <span className="text-[10px] font-bold text-primary uppercase block">Team Members Details</span>
                                 <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                                   {editAttTeamMembers.map((m, idx) => (
                                     <div key={idx} className="bg-surface-container-low border border-outline-variant/30 rounded-lg p-2.5 space-y-2">
                                       <span className="text-[9px] text-on-surface-variant font-bold uppercase block">Member {idx + 1}</span>
                                       <input
                                         type="text"
                                         value={m.name}
                                         onChange={(e) => {
                                           const newMembers = [...editAttTeamMembers];
                                           newMembers[idx].name = e.target.value;
                                           setEditAttTeamMembers(newMembers);
                                         }}
                                         placeholder="Name"
                                         className="w-full h-8 px-2 bg-surface border border-outline-variant rounded-md text-xs outline-none focus:border-primary text-on-surface"
                                       />
                                       <div className="grid grid-cols-2 gap-2">
                                         <input
                                           type="text"
                                           value={m.phone}
                                           onChange={(e) => {
                                             const newMembers = [...editAttTeamMembers];
                                             newMembers[idx].phone = e.target.value;
                                             setEditAttTeamMembers(newMembers);
                                           }}
                                           placeholder="Phone"
                                           className="w-full h-8 px-2 bg-surface border border-outline-variant rounded-md text-xs outline-none focus:border-primary text-on-surface"
                                         />
                                         <input
                                           type="email"
                                           value={m.email}
                                           onChange={(e) => {
                                             const newMembers = [...editAttTeamMembers];
                                             newMembers[idx].email = e.target.value;
                                             setEditAttTeamMembers(newMembers);
                                           }}
                                           placeholder="Email"
                                           className="w-full h-8 px-2 bg-surface border border-outline-variant rounded-md text-xs outline-none focus:border-primary text-on-surface"
                                         />
                                       </div>
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             )}

                             <div className="flex gap-2 pt-2">
                               <button
                                 onClick={handleSaveAttendeeEdits}
                                 className="flex-1 h-10 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/95 transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1"
                               >
                                 <span className="material-symbols-outlined !text-sm">save</span>
                                 <span>Save Participant</span>
                               </button>
                               <button
                                 onClick={() => setIsEditingAttendee(false)}
                                 className="flex-1 h-10 bg-surface border border-outline text-on-surface-variant hover:bg-surface-container-low rounded-xl text-xs font-semibold transition-all cursor-pointer"
                               >
                                 Cancel
                               </button>
                             </div>
                           </div>
                         ) : (
                           <>
                             {/* Participant Fields Grid */}
                             <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-on-surface-variant">
                               <div>
                                 <span className="text-[10px] font-bold text-primary uppercase block">Leader / Name</span>
                                 <span className="text-on-surface block mt-0.5 truncate">{currentActiveAttendee.name}</span>
                               </div>
                               <div>
                                 <span className="text-[10px] font-bold text-primary uppercase block">College</span>
                                 <span className="text-on-surface block mt-0.5 truncate" title={currentActiveAttendee.college}>
                                   {currentActiveAttendee.college || 'N/A'}
                                 </span>
                               </div>
                               <div>
                                 <span className="text-[10px] font-bold text-primary uppercase block">Academic Info</span>
                                 <span className="text-on-surface block mt-0.5 truncate">
                                   {currentActiveAttendee.year || 'N/A'} • {currentActiveAttendee.branch || 'N/A'}
                                 </span>
                               </div>
                               <div>
                                 <span className="text-[10px] font-bold text-primary uppercase block">Contact</span>
                                 <span className="text-on-surface block mt-0.5 truncate">
                                   {currentActiveAttendee.phone}
                                 </span>
                               </div>
                               <div className="col-span-2">
                                 <span className="text-[10px] font-bold text-primary uppercase block">Email Address</span>
                                 <span className="text-on-surface block mt-0.5 truncate">{currentActiveAttendee.email}</span>
                               </div>
                               <div className="col-span-2 border-t border-outline-variant/20 pt-3">
                                 <span className="text-[10px] font-bold text-primary uppercase block">Registered Event</span>
                                 <span className="text-on-surface block mt-0.5 font-bold text-sm">
                                   {currentActiveAttendee.registeredEventTitle}
                                 </span>
                               </div>
                             </div>

                             {/* Quick Action Switches */}
                             <div className="grid grid-cols-2 gap-4 border-t border-b border-outline-variant/35 py-4">
                               <label className="flex items-center gap-3 p-3 rounded-xl border border-outline-variant/40 bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer select-none">
                                 <input 
                                   type="checkbox"
                                   checked={currentActiveAttendee.paymentStatus === 'Paid'}
                                   onChange={() => handleTogglePayment(currentActiveAttendee)}
                                   className="w-5 h-5 text-primary border-outline rounded focus:ring-primary cursor-pointer"
                                 />
                                 <div className="flex flex-col">
                                   <span className="text-xs font-bold text-on-surface">Paid</span>
                                   <span className="text-[9px] text-on-surface-variant">Verify Payment</span>
                                 </div>
                               </label>

                               <label className="flex items-center gap-3 p-3 rounded-xl border border-outline-variant/40 bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer select-none">
                                 <input 
                                   type="checkbox"
                                   checked={currentActiveAttendee.attendanceStatus === 'Present'}
                                   onChange={() => handleToggleAttendance(currentActiveAttendee)}
                                   className="w-5 h-5 text-primary border-outline rounded focus:ring-primary cursor-pointer"
                                 />
                                 <div className="flex flex-col">
                                   <span className="text-xs font-bold text-on-surface">Checked In</span>
                                   <span className="text-[9px] text-on-surface-variant">Mark Present</span>
                                 </div>
                               </label>
                             </div>

                             {/* Team Members List (If applicable) */}
                             {currentActiveAttendee.regType === 'team' && currentActiveAttendee.teamMembers && currentActiveAttendee.teamMembers.length > 0 && (
                               <div className="space-y-2 border-b border-outline-variant/35 pb-4">
                                 <span className="text-[10px] font-bold text-primary uppercase block">Additional Team Members</span>
                                 <div className="space-y-2 max-h-36 overflow-y-auto">
                                   {currentActiveAttendee.teamMembers.map((m, idx) => (
                                     <div key={idx} className="bg-surface-container-low border border-outline-variant/30 rounded-lg p-2.5 text-[11px] font-semibold text-on-surface">
                                       <div className="flex justify-between">
                                         <span>{m.name}</span>
                                         <span className="text-[9px] text-on-surface-variant">Member {idx + 1}</span>
                                       </div>
                                       <div className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                                         {m.phone} • {m.email}
                                       </div>
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             )}

                             {/* Remarks TextArea (Auto-save) */}
                             <div className="space-y-1">
                               <span className="text-[10px] font-bold text-primary uppercase block">Remarks</span>
                               <textarea
                                 placeholder="Add operational notes or remarks (auto-saves)..."
                                 value={currentActiveAttendee.remarks || ''}
                                 onChange={(e) => handleRemarksChange(currentActiveAttendee, e.target.value)}
                                 className="w-full h-20 p-3 bg-surface-container-low border border-outline rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                               />
                             </div>

                             {/* Control Panel Action Buttons */}
                             <div className="flex items-center gap-3 pt-2">
                               <button
                                 onClick={() => {
                                   setEditAttName(currentActiveAttendee.name || '');
                                   setEditAttCollege(currentActiveAttendee.college || '');
                                   setEditAttYear(currentActiveAttendee.year || '');
                                   setEditAttBranch(currentActiveAttendee.branch || '');
                                   setEditAttPhone(currentActiveAttendee.phone || '');
                                   setEditAttEmail(currentActiveAttendee.email || '');
                                   setEditAttTeamName(currentActiveAttendee.teamName || '');
                                   setEditAttTeamMembers(currentActiveAttendee.teamMembers || []);
                                   setIsEditingAttendee(true);
                                 }}
                                 className="flex-1 h-11 bg-surface border border-outline text-on-surface hover:bg-surface-container-low rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                               >
                                 <span className="material-symbols-outlined !text-sm">edit</span>
                                 <span>Edit Details</span>
                               </button>
                               <button
                                 onClick={handleSaveAndNext}
                                 className="flex-1 h-11 bg-primary text-on-primary hover:bg-primary/95 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                               >
                                 <span>Next Entry</span>
                                 <span className="material-symbols-outlined !text-sm">arrow_forward</span>
                               </button>
                             </div>
                           </>
                         )}

                         {/* Revoke Registration Button */}
                         <button
                           onClick={() => {
                             if (confirm(`Are you sure you want to revoke/delete registration for ${currentActiveAttendee.name}?`)) {
                               onUpdateAttendees(attendees.filter(a => a.id !== currentActiveAttendee.id));
                               onUpdateEvents(events.map(ev => ev.id === currentActiveAttendee.registeredEventId ? { ...ev, registeredCount: Math.max(0, ev.registeredCount - 1) } : ev));
                               setToast({ message: 'Registration successfully revoked.', type: 'info' });
                             }
                           }}
                           className="w-full py-2 bg-error/5 text-error hover:bg-error/10 border border-error/15 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all"
                         >
                           <Trash2 className="w-3.5 h-3.5" /> Revoke Registration Entry
                         </button>

                       </div>
                     ) : (
                       <div className="bg-surface rounded-2xl border border-outline-variant/60 p-12 text-center text-on-surface-variant font-semibold shadow-xs sticky top-6">
                         <span className="material-symbols-outlined !text-4xl text-outline mb-3">account_box</span>
                         <p className="text-xs font-bold">No active selection</p>
                         <p className="text-[11px] text-on-surface-variant/75 mt-1 leading-relaxed">
                           Select any participant from the roster list on the left to show the quick actions console.
                         </p>
                       </div>
                     )}
                   </div>
                 )}

              </div>

              {/* Custom Bulk Confirm Dialog */}
              {showBulkConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    className="bg-surface border border-outline-variant/60 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-left"
                  >
                    <h3 className="text-base font-black text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-warning">warning</span>
                      Confirm Bulk Action
                    </h3>
                    
                    <p className="text-xs text-on-surface-variant font-semibold leading-relaxed">
                      {showBulkConfirm === 'pay' && `Are you sure you want to mark all ${selectedConsoleIds.length} selected participants as Paid?`}
                      {showBulkConfirm === 'checkin' && `Are you sure you want to mark all ${selectedConsoleIds.length} selected participants as Checked In?`}
                      {showBulkConfirm === 'delete' && `WARNING: Are you sure you want to permanently delete/revoke registrations for all ${selectedConsoleIds.length} selected participants?`}
                      {showBulkConfirm === 'batch' && `Select a batch to assign to all ${selectedConsoleIds.length} selected participants:`}
                    </p>

                    {showBulkConfirm === 'batch' && (
                      <select 
                        value={bulkTargetBatchId}
                        onChange={(e) => setBulkTargetBatchId(e.target.value)}
                        className="w-full h-11 px-3 bg-surface-container border border-outline rounded-xl text-xs font-bold outline-none"
                      >
                        <option value="">Choose Batch...</option>
                        {(batches || []).map(b => {
                          const ev = events.find(e => e.id === b.eventId);
                          return (
                            <option key={b.id} value={b.id}>
                              {b.name} - {ev?.title || 'Unknown Event'}
                            </option>
                          );
                        })}
                      </select>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => {
                          setShowBulkConfirm(null);
                          setBulkTargetBatchId('');
                        }}
                        className="flex-1 h-10 bg-surface border border-outline text-on-surface hover:bg-surface-container-low rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (showBulkConfirm === 'pay') handleBulkMarkPaid();
                          if (showBulkConfirm === 'checkin') handleBulkMarkCheckedIn();
                          if (showBulkConfirm === 'delete') handleBulkDelete();
                          if (showBulkConfirm === 'batch') handleBulkAssignBatch();
                        }}
                        disabled={showBulkConfirm === 'batch' && !bulkTargetBatchId}
                        className={`flex-1 h-10 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
                          showBulkConfirm === 'delete' ? 'bg-error hover:bg-error/95' : 'bg-primary hover:bg-primary/95'
                        }`}
                      >
                        Confirm
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}

          {/* New Registration Tab Workspace */}
          {activeTab === 'new-registration' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {spotAttendeeSuccess ? (
                <RegistrationSuccess 
                  attendee={spotAttendeeSuccess}
                  secondAttendee={spotAttendeeSecondSuccess || undefined}
                  onReturnHome={() => {
                    setSpotAttendeeSuccess(null);
                    setSpotAttendeeSecondSuccess(null);
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
                    onRegistrationSuccess={(newAtt, extra) => {
                      const allNew = [newAtt, ...(extra || [])];
                      onUpdateAttendees([...attendees, ...allNew]);
                      
                      let updatedEvents = [...events];
                      allNew.forEach(att => {
                        updatedEvents = updatedEvents.map(ev => ev.id === att.registeredEventId ? { ...ev, registeredCount: ev.registeredCount + 1 } : ev);
                      });
                      onUpdateEvents(updatedEvents);

                      setSpotAttendeeSuccess(newAtt);
                      if (extra && extra.length > 0) {
                        setSpotAttendeeSecondSuccess(extra[0]);
                      } else {
                        setSpotAttendeeSecondSuccess(null);
                      }
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
                  secondAttendee={spotAttendeeSecondSuccess || undefined}
                  onReturnHome={() => {
                    setSpotAttendeeSuccess(null);
                    setSpotAttendeeSecondSuccess(null);
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
                    onRegistrationSuccess={(newAtt, extra) => {
                      const mappedNewAtt = { ...newAtt };
                      if (!mappedNewAtt.id.endsWith('-SPOT')) {
                        mappedNewAtt.id = `${mappedNewAtt.id}-SPOT`;
                      }
                      const mappedExtra = (extra || []).map(m => {
                        const copy = { ...m };
                        if (!copy.id.endsWith('-SPOT')) {
                          copy.id = `${copy.id}-SPOT`;
                        }
                        return copy;
                      });
                      const allNew = [mappedNewAtt, ...mappedExtra];
                      onUpdateAttendees([...attendees, ...allNew]);

                      let updatedEvents = [...events];
                      allNew.forEach(att => {
                        updatedEvents = updatedEvents.map(ev => ev.id === att.registeredEventId ? { ...ev, registeredCount: ev.registeredCount + 1 } : ev);
                      });
                      onUpdateEvents(updatedEvents);

                      setSpotAttendeeSuccess(mappedNewAtt);
                      if (mappedExtra && mappedExtra.length > 0) {
                        setSpotAttendeeSecondSuccess(mappedExtra[0]);
                      } else {
                        setSpotAttendeeSecondSuccess(null);
                      }
                    }}
                    onBackToLogin={() => {}}
                  />
                </div>
              )}
            </motion.div>
          )}



          {/* Results & Batches Tab Workspace */}
          {activeTab === 'results-batches' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-on-surface tracking-tight">Results &amp; Batches Monitor</h1>
                <p className="text-sm text-on-surface-variant mt-1">
                  Track real-time batch progression, evaluate batch standings, and verify completed event winners.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {events.map(ev => {
                  const evBatches = batches.filter(b => b.eventId === ev.id);
                  const evAttendees = attendees.filter(a => a.registeredEventId === ev.id || a.eventId === ev.id);
                  
                  return (
                    <div key={ev.id} className="bg-surface rounded-2xl border border-outline-variant p-6 shadow-xs space-y-4">
                      
                      {/* Event Header Card Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/30">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center font-bold">
                            {renderEventIcon(ev.icon)}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                              {ev.title}
                              <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                                {ev.track}
                              </span>
                            </h3>
                            <p className="text-xs text-on-surface-variant leading-none mt-1">
                              Coordinator: {ev.hostName} ({ev.hostEmail}) • Venue: {ev.location || ev.venue}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                            ev.status === 'Live' 
                              ? 'bg-error-container text-on-error-container animate-pulse' 
                              : ev.status === 'Completed'
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-amber-100 text-amber-800'
                          }`}>
                            {ev.status}
                          </span>
                        </div>
                      </div>

                      {/* Batches Table and Dynamic Winners */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Batches List Block */}
                        <div className="lg:col-span-2 space-y-3">
                          <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                            <Layers className="w-4 h-4" /> Batches Configuration ({evBatches.length})
                          </h4>
                          
                          {evBatches.length === 0 ? (
                            <p className="text-xs text-on-surface-variant italic py-4 bg-surface-container-low border rounded-xl text-center">
                              No batches have been created by the event host yet.
                            </p>
                          ) : (
                            <div className="overflow-x-auto border border-outline-variant/40 rounded-xl">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-surface-container border-b">
                                    <th className="p-3 font-bold text-on-surface uppercase">Batch Name</th>
                                    <th className="p-3 font-bold text-on-surface uppercase">Status</th>
                                    <th className="p-3 font-bold text-on-surface uppercase">Participants</th>
                                    <th className="p-3 font-bold text-on-surface uppercase">Batch Winner (Live)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {evBatches.map(b => {
                                    const bAttendees = evAttendees.filter(a => a.batchId === b.id);
                                    const presentAttendees = bAttendees.filter(a => a.attendanceStatus === 'Present');
                                    
                                    // Calculate winner dynamically
                                    const scored = presentAttendees
                                      .filter(a => a.judgingStatus === 'Completed')
                                      .sort((x, y) => (y.score || 0) - (x.score || 0));
                                    const winner = scored[0];
                                    
                                    return (
                                      <tr key={b.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low transition-colors">
                                        <td className="p-3 font-bold text-on-surface">{b.name}</td>
                                        <td className="p-3">
                                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                            b.status === 'Live' 
                                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                              : b.status === 'Completed'
                                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                                          }`}>
                                            {b.status || 'Waiting'}
                                          </span>
                                        </td>
                                        <td className="p-3 font-medium text-on-surface-variant">
                                          {bAttendees.length} assigned ({presentAttendees.length} present)
                                        </td>
                                        <td className="p-3 font-bold text-primary">
                                          {winner ? (
                                            <span className="flex items-center gap-1">
                                              🏆 {winner.name} <span className="text-[10px] text-on-surface-variant font-mono">({winner.score} pts)</span>
                                            </span>
                                          ) : (
                                            <span className="text-on-surface-variant/60 italic font-normal">
                                              {presentAttendees.length === 0 ? 'No present attendees' : 'Evaluation pending'}
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* Official Results / Standings Panel */}
                        <div className="bg-surface-container-low border border-outline-variant/60 p-4 rounded-2xl flex flex-col justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 mb-3 border-b pb-2">
                              <Award className="w-4 h-4" /> Official Event Podium
                            </h4>
                            
                            {ev.resultsSubmitted ? (
                              <div className="space-y-2">
                                {ev.results?.map(res => {
                                  const medal = res.rank === 1 ? '🥇' : res.rank === 2 ? '🥈' : '🥉';
                                  return (
                                    <div key={res.rank} className="flex justify-between items-center bg-white border p-2.5 rounded-xl text-xs">
                                      <div className="flex items-center gap-1.5 font-bold">
                                        <span>{medal}</span>
                                        <div>
                                          <span className="block text-on-surface">{res.participantName}</span>
                                          <span className="block text-[8px] text-on-surface-variant uppercase">{res.college}</span>
                                        </div>
                                      </div>
                                      <span className="font-mono font-bold text-primary">{res.score} pts</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center py-8 text-center text-on-surface-variant/60 italic text-xs space-y-2">
                                <AlertCircle className="w-8 h-8 text-outline-variant" />
                                <div>
                                  <span className="font-bold block text-on-surface-variant">Results Not Submitted</span>
                                  <span className="text-[10px] block opacity-80 mt-0.5">Event coordinator has not compiled and published official standings yet.</span>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Event Summary stats */}
                          <div className="mt-4 pt-3 border-t border-outline-variant/30 text-[10px] text-on-surface-variant font-medium flex justify-between">
                            <span>Registered: {evAttendees.length}</span>
                            <span>Scored: {evAttendees.filter(a => a.judgingStatus === 'Completed').length}</span>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
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

              {/* Danger Zone */}
              <div className="bg-error-container/10 border border-error/30 rounded-2xl p-6 max-w-xl space-y-4">
                <div className="flex items-center gap-2 text-error">
                  <AlertCircle size={20} />
                  <h3 className="text-lg font-bold">Danger Zone</h3>
                </div>
                <p className="text-xs text-on-surface-variant">
                  This action will permanently delete all dynamic student registrations, team lists, check-in statuses, batches, and round score sheets in the Firestore database and local caches, resetting all event registered counts to 0. Use this to clear dummy test data and start fresh.
                </p>
                <div>
                  <button 
                    onClick={handleResetDatabase}
                    disabled={isResetting}
                    className="bg-error text-on-error h-10 px-6 rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isResetting ? 'Resetting System...' : 'Clear All Registrations & Start Fresh'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Pass Check-in Scanner Desk Workspace */}
          {activeTab === 'qr-scanner' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <ScannerDesk mode="checkin" attendees={attendees} />
            </motion.div>
          )}

          {/* Food Redemption Scanner Desk Workspace */}
          {activeTab === 'food-scanner' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <ScannerDesk mode="food" attendees={attendees} />
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

                  {isEditingEvent ? (
                    <div className="space-y-2.5 pt-2">
                      <div>
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Physical Location</label>
                        <input
                          type="text"
                          value={editEventLocation}
                          onChange={(e) => setEditEventLocation(e.target.value)}
                          className="w-full h-8 px-2 bg-surface border border-outline rounded-lg text-xs outline-none focus:border-primary text-on-surface"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Assigned Host Name</label>
                        <input
                          type="text"
                          value={editEventHostName}
                          onChange={(e) => setEditEventHostName(e.target.value)}
                          className="w-full h-8 px-2 bg-surface border border-outline rounded-lg text-xs outline-none focus:border-primary text-on-surface"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Assigned Host Email</label>
                        <input
                          type="email"
                          value={editEventHostEmail}
                          onChange={(e) => setEditEventHostEmail(e.target.value)}
                          className="w-full h-8 px-2 bg-surface border border-outline rounded-lg text-xs outline-none focus:border-primary text-on-surface"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1">Event Timing Session</label>
                        <select
                          value={editEventSession}
                          onChange={(e) => setEditEventSession(e.target.value as any)}
                          className="w-full h-8 px-2 bg-surface border border-outline rounded-lg text-xs outline-none focus:border-primary text-on-surface"
                        >
                          <option value="Morning">Morning Session (09:30 AM - 12:30 PM)</option>
                          <option value="Afternoon">Afternoon Session (01:30 PM - 04:30 PM)</option>
                        </select>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={handleSaveEventEdits}
                          className="flex-1 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold hover:bg-primary/95 transition-all cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setIsEditingEvent(false)}
                          className="flex-1 py-1.5 bg-surface-container border border-outline text-on-surface-variant rounded-lg text-xs font-semibold hover:bg-surface-container-high transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
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
                        <span className="text-on-surface-variant block">Event Session:</span>
                        <span className="font-bold text-on-surface block">
                          {selectedEventForManage.session} Session ({selectedEventForManage.session === 'Morning' ? '09:30 AM - 12:30 PM' : '01:30 PM - 04:30 PM'})
                        </span>
                      </div>

                      <div>
                        <span className="text-on-surface-variant block">Registrations Count:</span>
                        <span className="font-bold text-on-surface">{selectedEventForManage.registeredCount} Attendees</span>
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={() => {
                            setEditEventLocation(selectedEventForManage.location || '');
                            setEditEventHostName(selectedEventForManage.hostName || '');
                            setEditEventHostEmail(selectedEventForManage.hostEmail || '');
                            setEditEventSession((selectedEventForManage.session as any) || 'Morning');
                            setIsEditingEvent(true);
                          }}
                          className="w-full h-8 border border-primary text-primary hover:bg-primary hover:text-on-primary rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit Details
                        </button>
                      </div>
                    </>
                  )}

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

      {/* Support & Help Center Modal */}
      <AnimatePresence>
        {isHelpModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-outline-variant/60 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl text-center"
            >
              <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined !text-3xl">support_agent</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-on-surface">Symposium Help Desk</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Need any immediate operational or technical support? Contact the symposium coordinator directly.
                </p>
              </div>
              
              <div className="bg-surface-container-low border border-outline-variant/40 p-4 rounded-xl space-y-1">
                <span className="text-[10px] font-black text-primary uppercase block">Coordinator Contact Number</span>
                <span className="text-lg font-black text-on-surface tracking-wide block select-all">8121280857</span>
              </div>

              <div className="flex gap-2">
                <a 
                  href="tel:8121280857"
                  className="flex-1 h-10 bg-primary text-on-primary font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 hover:bg-primary/95 transition-all shadow-xs"
                >
                  <span className="material-symbols-outlined !text-sm">call</span>
                  <span>Call Coordinator</span>
                </a>
                <button
                  onClick={() => setIsHelpModalOpen(false)}
                  className="px-4 h-10 bg-surface border border-outline text-on-surface-variant hover:bg-surface-container rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
