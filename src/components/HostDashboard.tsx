import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Calendar, Users, CheckCircle, Award, Play, Edit3, Clock, 
  MapPin, Bell, LogOut, Check, X, Shield, ChevronRight, CheckCircle2, UserCheck, 
  AlertCircle, Trash2, Settings2, Plus, Info, Lock, Unlock, HelpCircle, FileText, ClipboardList, Layers, RotateCcw,
  Search, LogIn, Trophy, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { SymposiumEvent, Attendee, ParticipantResult, MAP_EMAIL_TO_EVENT_ID, Batch } from '../types';
import { INITIAL_EVENTS } from '../initialData';
import ParticipantProfile from './ParticipantProfile';
import HostRegistrationTab from './HostRegistrationTab';
import ManualWinnersEntry from './ManualWinnersEntry';


interface HostDashboardProps {
  user: { email: string; name: string; assignedEventId?: string; role?: string };
  events: SymposiumEvent[];
  attendees: Attendee[];
  batches?: Batch[];
  isOnline?: boolean;
  onSaveBatch?: (batch: Batch) => void;
  onDeleteBatch?: (id: string) => void;
  onUpdateEvents: (updated: SymposiumEvent[]) => void;
  onUpdateAttendees: (updated: Attendee[]) => void;
  onLogout: () => void;
}

export default function HostDashboard({
  user,
  events,
  attendees,
  batches = [],
  isOnline = true,
  onSaveBatch,
  onDeleteBatch,
  onUpdateEvents,
  onUpdateAttendees,
  onLogout
}: HostDashboardProps) {
  // Navigation active tab (kept for state compatibility, not used for rendering tabs)
  const [activeTab, setActiveTab] = useState<'overview' | 'participants' | 'batches' | 'attendance' | 'judging' | 'results' | 'registration' | 'winners'>('overview');
  
  // Selected Profile State (for detail modal)
  const [selectedAttendeeForProfile, setSelectedAttendeeForProfile] = useState<Attendee | null>(null);
  
  // Confirmation State
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);



  // Get the single assigned event for this Host based on permanent IDs or email mapping fallback with triple redundancy
  const fallbackEventId = user.email ? MAP_EMAIL_TO_EVENT_ID[user.email.toLowerCase()] : '';
  let myAssignedEvent = (user.assignedEventId && user.assignedEventId !== 'none' && events.find(e => e.id === user.assignedEventId)) || 
                        events.find(e => e.hostEmail?.toLowerCase() === user.email?.toLowerCase()) || 
                        events.find(e => e.id === fallbackEventId);
  
  // High-reliability fallback to INITIAL_EVENTS if not found in dynamic loaded events
  if (!myAssignedEvent && INITIAL_EVENTS) {
    myAssignedEvent = (user.assignedEventId && user.assignedEventId !== 'none' && INITIAL_EVENTS.find(e => e.id === user.assignedEventId)) || 
                      INITIAL_EVENTS.find(e => e.hostEmail?.toLowerCase() === user.email?.toLowerCase()) || 
                      INITIAL_EVENTS.find(e => e.id === fallbackEventId);
  }
  
  // Filter events assigned to this Host (only this one single assigned event can ever be seen/accessed)
  const myEvents = myAssignedEvent ? [myAssignedEvent] : [];
  
  // Filter attendees for my events
  const myEventIds = myEvents.map(e => e.id);
  const myAttendees = attendees.filter(a => myEventIds.includes(a.registeredEventId) || myEventIds.includes(a.eventId));

  // Configurable Evaluation Criteria (Stored in component state, with localstorage sync fallback)
  const [evaluationCriteria, setEvaluationCriteria] = useState<Array<{ id: string; name: string; maxScore: number }>>(() => {
    const saved = localStorage.getItem(`criteria_${myAssignedEvent?.id || 'default'}`);
    return saved ? JSON.parse(saved) : [
      { id: 'innovation', name: 'Innovation', maxScore: 20 },
      { id: 'presentation', name: 'Presentation', maxScore: 20 },
      { id: 'techKnowledge', name: 'Technical Knowledge', maxScore: 20 },
      { id: 'implementation', name: 'Implementation', maxScore: 20 },
      { id: 'qa', name: 'Questions & Answers', maxScore: 20 }
    ];
  });

  // Save criteria changes to localStorage
  useEffect(() => {
    if (myAssignedEvent) {
      localStorage.setItem(`criteria_${myAssignedEvent.id}`, JSON.stringify(evaluationCriteria));
    }
  }, [evaluationCriteria, myAssignedEvent]);

  // Selected Participant for Evaluation
  const [selectedAttendeeForJudging, setSelectedAttendeeForJudging] = useState<Attendee | null>(null);
  
  // Score Form state for criteria
  const [criteriaScores, setCriteriaScores] = useState<Record<string, string>>({});
  const [judgingRemarks, setJudgingRemarks] = useState('');
  const [criterionError, setCriterionError] = useState<string | null>(null);

  // New Criterion Creator state
  const [newCriterionName, setNewCriterionName] = useState('');
  const [newCriterionMax, setNewCriterionMax] = useState('20');
  const [showCriteriaConfig, setShowCriteriaConfig] = useState(false);

  // Batch states
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [newBatchName, setNewBatchName] = useState('');
  const [batchCount, setBatchCount] = useState<number | ''>(3);
  const [dynamicBatchNames, setDynamicBatchNames] = useState<string[]>(['Batch 1', 'Batch 2', 'Batch 3']);
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [showStartBatchModal, setShowStartBatchModal] = useState(false);
  const [selectedStartBatchId, setSelectedStartBatchId] = useState<string>('');
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editingBatchName, setEditingBatchName] = useState('');
  const [selectedJudgingBatchId, setSelectedJudgingBatchId] = useState<string>('all');

  // Gate check-in desk states
  const [showGateCheckIn, setShowGateCheckIn] = useState(false);
  const [gateSearchQuery, setGateSearchQuery] = useState('');
  const [gateFilter, setGateFilter] = useState<'all' | 'checked-in' | 'pending'>('all');
  const [gateSelectedBatchId, setGateSelectedBatchId] = useState<string>('all');

  // Console operational states
  const [activeConsoleFilter, setActiveConsoleFilter] = useState<string>('all');
  const [isPublishConfirmOpen, setIsPublishConfirmOpen] = useState(false);
  const [expandedBatchIds, setExpandedBatchIds] = useState<string[]>([]);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'queue' | 'scoring' | 'standings'>('queue');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Console state selectors
  const eventBatches = batches.filter(b => b.eventId === (myAssignedEvent?.id || ''));

  const consoleQueueAttendees = myAttendees.filter(a => {
    const isLeaderOrIndividual = a.regType !== 'team' || a.teamMembers !== undefined || a.accessLevel === 'Team Leader Pass';
    return isLeaderOrIndividual;
  });

  const filteredConsoleQueue = consoleQueueAttendees.filter(a => {
    if (activeConsoleFilter === 'waiting') {
      return a.attendanceStatus === 'Present' && a.judgingStatus !== 'Completed';
    } else if (activeConsoleFilter === 'checked-in') {
      return a.attendanceStatus === 'Present';
    } else if (activeConsoleFilter === 'evaluating') {
      return a.judgingStatus === 'In Progress';
    } else if (activeConsoleFilter === 'evaluated') {
      return a.judgingStatus === 'Completed';
    } else if (activeConsoleFilter !== 'all') {
      return a.batchId === activeConsoleFilter;
    }
    return true;
  });

  const sortedConsoleQueue = [...filteredConsoleQueue].sort((a, b) => {
    const aEval = a.judgingStatus === 'Completed' ? 1 : 0;
    const bEval = b.judgingStatus === 'Completed' ? 1 : 0;
    return aEval - bEval;
  });

  const latestSelectedAttendee = selectedAttendeeForJudging ? attendees.find(a => a.id === selectedAttendeeForJudging.id) || null : null;
  const currentActiveJudgingAttendee = latestSelectedAttendee || sortedConsoleQueue.find(a => a.judgingStatus !== 'Completed') || sortedConsoleQueue[0] || null;
  const currentActiveJudgingAttendeeId = currentActiveJudgingAttendee?.id;

  // Sync criteriaScores when current active attendee changes
  useEffect(() => {
    if (currentActiveJudgingAttendee) {
      setJudgingRemarks(currentActiveJudgingAttendee.remarks || '');
      
      const loadedScores: Record<string, string> = {};
      const attendeeScores = (currentActiveJudgingAttendee as any).criteriaScores || {};
      
      evaluationCriteria.forEach(crit => {
        if (attendeeScores[crit.id] !== undefined) {
          loadedScores[crit.id] = String(attendeeScores[crit.id]);
        } else {
          if (currentActiveJudgingAttendee.score !== undefined && currentActiveJudgingAttendee.score > 0) {
            const evenDist = Math.min(crit.maxScore, Math.round(currentActiveJudgingAttendee.score / evaluationCriteria.length));
            loadedScores[crit.id] = String(evenDist);
          } else {
            loadedScores[crit.id] = '';
          }
        }
      });
      setCriteriaScores(loadedScores);
      setCriterionError(null);
    } else {
      setCriteriaScores({});
      setJudgingRemarks('');
    }
  }, [currentActiveJudgingAttendeeId, evaluationCriteria]);

  const handleExportParticipants = () => {
    if (!myAssignedEvent) return;
    
    try {
      const wb = XLSX.utils.book_new();
      const headers = ['Student Name', 'Registration Type', 'Team Name', 'Participant ID', 'Email', 'Mobile', 'College', 'Event', 'Status', 'Attendance'];
      const wsData = [headers];

      myAttendees.forEach(a => {
        // Leader
        wsData.push([
          a.name,
          a.regType || 'individual',
          a.teamName || 'N/A',
          a.participantId || a.id,
          a.email,
          a.phone,
          a.college,
          a.registeredEventTitle || myAssignedEvent.title,
          a.paymentStatus || 'Pending',
          a.attendanceStatus || 'Pending'
        ]);

        // Team members
        if (a.regType === 'team' && a.teamMembers) {
          a.teamMembers.forEach(m => {
            wsData.push([
              m.name,
              'team',
              a.teamName || 'N/A',
              a.participantId || a.id,
              m.email,
              m.phone,
              a.college,
              a.registeredEventTitle || myAssignedEvent.title,
              a.paymentStatus || 'Pending',
              a.attendanceStatus || 'Pending'
            ]);
          });
        }
      });

      const sheetName = myAssignedEvent.title.substring(0, 31).replace(/[\\/?*[\]]/g, '');
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Participants');
      
      const fileName = `${myAssignedEvent.id}_participants_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error("Failed to export participants:", err);
      alert("Failed to export participants. Please check the console for errors.");
    }
  };

  const handleSaveEvaluationInline = async (att: Attendee, status: 'Completed' | 'In Progress') => {
    let total = 0;
    for (const crit of evaluationCriteria) {
      const valStr = criteriaScores[crit.id];
      const val = (valStr === undefined || valStr === '') ? 0 : parseFloat(valStr);
      if (isNaN(val) || val < 0 || val > crit.maxScore) {
        setCriterionError(`Invalid entry for ${crit.name}. Score must be between 0 and ${crit.maxScore}`);
        setToast({ message: `Score error: ${crit.name}`, type: 'error' });
        return;
      }
      total += val;
    }

    const updatedAttendee = {
      ...att,
      score: total,
      remarks: judgingRemarks,
      judgingStatus: status,
      criteriaScores: criteriaScores
    } as Attendee;

    const updatedList = attendees.map(a => a.id === att.id ? updatedAttendee : a);
    onUpdateAttendees(updatedList);

    const { saveAttendeeToFirestore: saveFn } = await import('../firebaseSync');
    await saveFn(updatedAttendee);

    if (status === 'Completed') {
      setToast({ message: `Evaluation Submitted for ${att.name}`, type: 'success' });
    } else {
      setToast({ message: `Draft saved for ${att.name}`, type: 'info' });
    }

    if (status === 'Completed' && att.batchId) {
      const batchAttendees = updatedList.filter(a => 
        (a.registeredEventId === myAssignedEvent.id || a.eventId === myAssignedEvent.id) && 
        a.batchId === att.batchId
      );
      const presentAttendees = batchAttendees.filter(a => a.attendanceStatus === 'Present');
      const allScored = presentAttendees.length > 0 && presentAttendees.every(a => a.judgingStatus === 'Completed');
      
      if (allScored) {
        handleUpdateBatchStatus(att.batchId, 'Completed');
        setToast({ message: `Batch ${att.batchName || ''} completed & closed!`, type: 'success' });
      }
    }

    if (status === 'Completed') {
      const currentIndex = sortedConsoleQueue.findIndex(a => a.id === att.id);
      const nextIndex = currentIndex + 1;
      if (nextIndex < sortedConsoleQueue.length) {
        const nextAtt = sortedConsoleQueue[nextIndex];
        setSelectedAttendeeForJudging(nextAtt);
        setTimeout(() => {
          const rowEl = document.getElementById(`queue-row-${nextAtt.id}`);
          if (rowEl) {
            rowEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }, 50);
      } else {
        setToast({ message: 'All queue participants evaluated!', type: 'success' });
      }
    } else {
      setSelectedAttendeeForJudging(updatedAttendee);
    }
  };

  const moveConsoleSelection = (dir: number) => {
    if (sortedConsoleQueue.length === 0) return;
    const active = currentActiveJudgingAttendee;
    const currentIndex = active ? sortedConsoleQueue.findIndex(a => a.id === active.id) : -1;
    let nextIndex = currentIndex + dir;
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= sortedConsoleQueue.length) nextIndex = sortedConsoleQueue.length - 1;

    const nextAtt = sortedConsoleQueue[nextIndex];
    if (nextAtt) {
      setSelectedAttendeeForJudging(nextAtt);
      const rowEl = document.getElementById(`queue-row-${nextAtt.id}`);
      if (rowEl) {
        rowEl.scrollIntoView({ block: 'nearest' });
      }
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const isEditing = active && (
        active.tagName === 'INPUT' || 
        active.tagName === 'TEXTAREA' || 
        active.getAttribute('contenteditable') === 'true'
      );

      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (currentActiveJudgingAttendee) {
          handleSaveEvaluationInline(currentActiveJudgingAttendee, 'In Progress');
        }
        return;
      }

      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        if (currentActiveJudgingAttendee) {
          handleSaveEvaluationInline(currentActiveJudgingAttendee, 'Completed');
        }
        return;
      }

      if (isEditing) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveConsoleSelection(-1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveConsoleSelection(1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentActiveJudgingAttendee) {
          setSelectedAttendeeForJudging(currentActiveJudgingAttendee);
          setTimeout(() => {
            const firstInput = document.getElementById(`score-input-${evaluationCriteria[0]?.id}`);
            if (firstInput) {
              (firstInput as HTMLInputElement).focus();
              (firstInput as HTMLInputElement).select();
            }
          }, 50);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [sortedConsoleQueue, currentActiveJudgingAttendee, criteriaScores, judgingRemarks]);

  // Batch helper functions
  const handleAssignToBatch = (attendeeId: string, batchId: string) => {
    const targetBatch = batches.find(b => b.id === batchId);
    const updatedAttendees = attendees.map(a => {
      if (a.id === attendeeId) {
        return {
          ...a,
          batchId: batchId || undefined,
          batchName: targetBatch ? targetBatch.name : undefined
        };
      }
      return a;
    });
    onUpdateAttendees(updatedAttendees);
  };

  const handleUpdateBatchStatus = (batchId: string, status: 'Waiting' | 'Live' | 'Completed') => {
    const targetBatch = batches.find(b => b.id === batchId);
    if (targetBatch && onSaveBatch) {
      const updatedBatch = { ...targetBatch, status };
      onSaveBatch(updatedBatch);
    }
  };

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myAssignedEvent) return;

    const namesToUse = dynamicBatchNames.map(n => n.trim()).filter(Boolean);
    const K = namesToUse.length;
    if (K <= 0) return alert("Please specify at least one batch name.");

    const newBatchesList: Batch[] = [];
    const nowStr = new Date().toISOString();
    
    const sortedAttendees = [...myAttendees].sort((a, b) => {
      const timeA = a.createdAt || a.id || '';
      const timeB = b.createdAt || b.id || '';
      return timeA.localeCompare(timeB);
    });

    const N = sortedAttendees.length;
    
    for (let i = 0; i < K; i++) {
      const bName = namesToUse[i];
      const newB: Batch = {
        id: `batch-${myAssignedEvent.id}-${Date.now()}-${i}`,
        eventId: myAssignedEvent.id,
        name: bName,
        status: 'Waiting',
        createdAt: nowStr
      };
      newBatchesList.push(newB);
    }

    const baseSize = Math.floor(N / K);
    const remainder = N % K;
    
    const updatedAttendees = [...attendees];
    let currentIdx = 0;
    
    for (let i = 0; i < K; i++) {
      const groupSize = (i >= K - remainder) ? (baseSize + 1) : baseSize;
      const currentBatchId = newBatchesList[i].id;
      const currentBatchName = newBatchesList[i].name;

      for (let j = 0; j < groupSize; j++) {
        if (currentIdx < N) {
          const attendeeToUpdate = sortedAttendees[currentIdx];
          const globalIdx = updatedAttendees.findIndex(a => a.id === attendeeToUpdate.id);
          if (globalIdx >= 0) {
            updatedAttendees[globalIdx] = {
              ...updatedAttendees[globalIdx],
              batchId: currentBatchId,
              batchName: currentBatchName
            };
          }
          currentIdx++;
        }
      }
    }

    if (onSaveBatch) {
      for (const b of newBatchesList) {
        onSaveBatch(b);
      }
    }

    onUpdateAttendees(updatedAttendees);
    setIsCreatingBatch(false);
    if (newBatchesList.length > 0) {
      setSelectedBatchId(newBatchesList[0].id);
    }
  };

  const handleDeleteBatchClick = (id: string) => {
    if (confirm('Are you sure you want to delete this batch? All participants in this batch will be unassigned.')) {
      if (onDeleteBatch) {
        onDeleteBatch(id);
      }
      const updatedAttendees = attendees.map(a => {
        if (a.batchId === id) {
          return { ...a, batchId: undefined, batchName: undefined };
        }
        return a;
      });
      onUpdateAttendees(updatedAttendees);
      if (selectedBatchId === id) {
        setSelectedBatchId('');
      }
    }
  };

  const handleRenameBatch = (id: string, name: string) => {
    const targetBatch = batches.find(b => b.id === id);
    if (targetBatch && onSaveBatch) {
      const updatedBatch = { ...targetBatch, name };
      onSaveBatch(updatedBatch);
      const updatedAttendees = attendees.map(a => {
        if (a.batchId === id) {
          return { ...a, batchName: name };
        }
        return a;
      });
      onUpdateAttendees(updatedAttendees);
      setEditingBatchId(null);
    }
  };

  // Filter & Search states inside modules
  const [searchQuery, setSearchQuery] = useState('');
  const [judgingFilter, setJudgingFilter] = useState<'all' | 'Not Started' | 'In Progress' | 'Completed'>('all');

  // Guard Clause for unassigned host
  if (!myAssignedEvent) {
    return (
      <div className="min-h-screen bg-background text-on-background flex flex-col items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-surface border border-outline-variant p-8 rounded-2xl text-center space-y-5 shadow-lg">
          <AlertCircle className="w-14 h-14 text-error mx-auto animate-bounce" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-on-surface">No Event Assigned</h2>
            <p className="text-sm text-on-surface-variant">
              Your host account is not permanently assigned to any active symposium event. Please contact Super Admin to assign your host role.
            </p>
          </div>
          <button 
            onClick={onLogout} 
            className="w-full h-11 bg-primary text-on-primary font-semibold rounded-lg text-sm transition-all hover:bg-primary/95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Sign Out Portal
          </button>
        </div>
      </div>
    );
  }

  // Derived Values
  const isEventLive = myAssignedEvent.status === 'Live';
  const isEventCompleted = myAssignedEvent.status === 'Completed';
  const isResultsPublished = (myAssignedEvent as any).resultsPublished || myAssignedEvent.resultsSubmitted;

  // Check-In & Attendance Metrics
  const totalRegistered = myAttendees.length;
  const totalCheckedIn = myAttendees.filter(a => a.attendanceStatus === 'Present').length;
  const totalPendingAttendance = myAttendees.filter(a => a.attendanceStatus === 'Pending' || !a.attendanceStatus).length;

  // Operational transition handlers
  const handleStartEvent = () => {
    if (eventBatches.length === 0) {
      if (confirm('No batches have been created for this event yet. Would you like to automatically create "Batch 1" with all registered participants and start judging?')) {
        const nowStr = new Date().toISOString();
        const defaultB: Batch = {
          id: `batch-${myAssignedEvent.id}-${Date.now()}-0`,
          eventId: myAssignedEvent.id,
          name: 'Batch 1',
          status: 'Live',
          createdAt: nowStr
        };
        
        if (onSaveBatch) {
          onSaveBatch(defaultB);
        }
        
        const updatedAttendees = attendees.map(a => {
          if (a.registeredEventId === myAssignedEvent.id || a.eventId === myAssignedEvent.id) {
            return { ...a, batchId: defaultB.id, batchName: defaultB.name };
          }
          return a;
        });
        onUpdateAttendees(updatedAttendees);
        
        const updatedEvents = events.map(e => {
          if (e.id === myAssignedEvent.id) {
            return { ...e, status: 'Live' as const };
          }
          return e;
        });
        onUpdateEvents(updatedEvents);
        
        setSelectedJudgingBatchId(defaultB.id);
        setActiveTab('judging');
        setConfirmationMessage('Batch 1 created and event started!');
        setTimeout(() => setConfirmationMessage(null), 4000);
      } else {
        const updatedEvents = events.map(e => {
          if (e.id === myAssignedEvent.id) {
            return { ...e, status: 'Live' as const };
          }
          return e;
        });
        onUpdateEvents(updatedEvents);
        setActiveTab('batches');
      }
    } else {
      setShowStartBatchModal(true);
      setSelectedStartBatchId(eventBatches[0].id);
    }
  };

  const handleConfirmStartWithBatch = () => {
    if (!selectedStartBatchId) return;
    
    const updatedEvents = events.map(e => {
      if (e.id === myAssignedEvent.id) {
        return { ...e, status: 'Live' as const };
      }
      return e;
    });
    onUpdateEvents(updatedEvents);
    
    handleUpdateBatchStatus(selectedStartBatchId, 'Live');
    
    setSelectedJudgingBatchId(selectedStartBatchId);
    setActiveTab('judging');
    setShowStartBatchModal(false);
    
    setConfirmationMessage(`Event started & ${eventBatches.find(b => b.id === selectedStartBatchId)?.name || 'selected batch'} is now Live!`);
    setTimeout(() => setConfirmationMessage(null), 4000);
  };

  const handleEndEvent = () => {
    const updated = events.map(e => {
      if (e.id === myAssignedEvent.id) {
        return { ...e, status: 'Completed' as const };
      }
      return e;
    });
    onUpdateEvents(updated);
    setConfirmationMessage('Event Completed Successfully');
    setTimeout(() => setConfirmationMessage(null), 4000);
  };

  const handleResetEvent = (newStatus: 'Upcoming' | 'Live') => {
    const updated = events.map(e => {
      if (e.id === myAssignedEvent.id) {
        return { 
          ...e, 
          status: newStatus as any,
          resultsSubmitted: false,
          resultsPublished: false,
          results: []
        };
      }
      return e;
    });
    onUpdateEvents(updated);
    if (newStatus === 'Live') {
      setShowGateCheckIn(true);
    }
    setConfirmationMessage(`Event Reset to ${newStatus} Successfully`);
    setTimeout(() => setConfirmationMessage(null), 4000);
  };

  // Quick Attendance change
  const handleMarkAttendance = async (attendeeId: string, status: 'Present' | 'Absent') => {
    if (isEventCompleted || isResultsPublished) return;
    let targetAtt: Attendee | null = null;
    const updated = attendees.map(a => {
      if (a.id === attendeeId) {
        targetAtt = { 
          ...a, 
          attendanceStatus: status,
          checkedInAt: status === 'Present' ? (a.checkedInAt || new Date().toISOString()) : undefined
        } as Attendee;
        return targetAtt;
      }
      return a;
    });
    onUpdateAttendees(updated);
    if (targetAtt) {
      const { saveAttendeeToFirestore: saveFn } = await import('../firebaseSync');
      await saveFn(targetAtt);
    }
  };

  // Scoring / Evaluation functions
  const handleCriteriaScoreChange = (critId: string, val: string) => {
    setCriteriaScores(prev => ({ ...prev, [critId]: val }));
    setCriterionError(null);
  };

  // Add customized criteria
  const handleAddCriterion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCriterionName.trim()) return;
    const maxVal = parseInt(newCriterionMax);
    if (isNaN(maxVal) || maxVal <= 0) return;

    const newId = 'custom_' + Date.now();
    setEvaluationCriteria(prev => [
      ...prev,
      { id: newId, name: newCriterionName.trim(), maxScore: maxVal }
    ]);
    
    setNewCriterionName('');
    setNewCriterionMax('20');
  };

  // Remove criterion
  const handleRemoveCriterion = (id: string) => {
    if (evaluationCriteria.length <= 1) {
      alert('You must have at least one evaluation criterion.');
      return;
    }
    setEvaluationCriteria(prev => prev.filter(c => c.id !== id));
  };

  // Publish Results compiling and locking
  const handlePublishResults = () => {
    const presentEvaluated = myAttendees
      .filter(a => a.attendanceStatus === 'Present' && a.judgingStatus === 'Completed')
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    const rank1 = presentEvaluated[0];
    const rank2 = presentEvaluated[1];
    const rank3 = presentEvaluated[2];

    const resultsList: ParticipantResult[] = [
      { 
        rank: 1, 
        participantName: rank1?.teamName ? rank1.teamName : (rank1?.name || 'Unassigned'), 
        college: rank1?.college || 'N/A', 
        score: String(rank1?.score || 0) 
      },
      { 
        rank: 2, 
        participantName: rank2?.teamName ? rank2.teamName : (rank2?.name || 'Unassigned'), 
        college: rank2?.college || 'N/A', 
        score: String(rank2?.score || 0) 
      },
      { 
        rank: 3, 
        participantName: rank3?.teamName ? rank3.teamName : (rank3?.name || 'Unassigned'), 
        college: rank3?.college || 'N/A', 
        score: String(rank3?.score || 0) 
      },
    ];

    const updatedEvents = events.map(ev => {
      if (ev.id === myAssignedEvent.id) {
        return {
          ...ev,
          status: 'Completed' as const,
          resultsSubmitted: true,
          resultsPublished: true, 
          results: resultsList
        } as SymposiumEvent;
      }
      return ev;
    });
    onUpdateEvents(updatedEvents);

    const resultDoc = {
      resultId: `RES-${myAssignedEvent.id}`,
      eventId: myAssignedEvent.id,
      rank1: rank1 ? (rank1.teamName ? `${rank1.teamName} (Leader: ${rank1.name}) [ID: ${rank1.id}] (${rank1.college})` : `${rank1.name} [ID: ${rank1.id}] (${rank1.college})`) : 'Unassigned',
      rank2: rank2 ? (rank2.teamName ? `${rank2.teamName} (Leader: ${rank2.name}) [ID: ${rank2.id}] (${rank2.college})` : `${rank2.name} [ID: ${rank2.id}] (${rank2.college})`) : 'Unassigned',
      rank3: rank3 ? (rank3.teamName ? `${rank3.teamName} (Leader: ${rank3.name}) [ID: ${rank3.id}] (${rank3.college})` : `${rank3.name} [ID: ${rank3.id}] (${rank3.college})`) : 'Unassigned',
      judgeRemarks: `Ranks automatically compiled and certified by Host for ${myAssignedEvent.title} on ${new Date().toLocaleDateString()}`,
      published: true,
      publishedAt: new Date().toISOString(),
      publishedBy: user.email
    };

    import('../firebaseSync').then(m => {
      m.saveResult(resultDoc);
    });

    setConfirmationMessage('Results Compiled and Published successfully');
    setTimeout(() => setConfirmationMessage(null), 5000);
  };

  // Consolidated Event status updater
  const updateEventStatus = (status: 'Upcoming' | 'Live' | 'Paused' | 'Completed') => {
    const updatedEvents = events.map(e => {
      if (e.id === myAssignedEvent.id) {
        return { ...e, status };
      }
      return e;
    });
    onUpdateEvents(updatedEvents);
    setToast({ message: `Event status set to ${status}`, type: 'success' });
  };

  // Determine active timeline stage
  let activeTimelineStage = 'Upcoming';
  if (isResultsPublished) {
    activeTimelineStage = 'Published';
  } else if (isEventCompleted) {
    activeTimelineStage = 'Results Ready';
  } else if (isEventLive || myAssignedEvent.status === 'Paused') {
    const presentCount = myAttendees.filter(a => a.attendanceStatus === 'Present').length;
    const evaluatedCount = myAttendees.filter(a => a.judgingStatus === 'Completed').length;
    if (presentCount > 0 && evaluatedCount >= presentCount) {
      activeTimelineStage = 'Results Ready';
    } else if (evaluatedCount > 0) {
      activeTimelineStage = 'Judging';
    } else if (presentCount > 0) {
      activeTimelineStage = 'Attendance Completed';
    } else {
      activeTimelineStage = 'Started';
    }
  }

  const timelineStages = [
    { id: 'Upcoming', label: 'Upcoming' },
    { id: 'Started', label: 'Event Started' },
    { id: 'Attendance Completed', label: 'Attendance Done' },
    { id: 'Judging', label: 'Judging Live' },
    { id: 'Results Ready', label: 'Results Ready' },
    { id: 'Published', label: 'Published' }
  ];

  const activeStageIndex = timelineStages.findIndex(s => s.id === activeTimelineStage);

  const handleSkipEvaluation = () => {
    if (!currentActiveJudgingAttendee) return;
    const currentIndex = sortedConsoleQueue.findIndex(a => a.id === currentActiveJudgingAttendee.id);
    const nextIndex = currentIndex + 1;
    if (nextIndex < sortedConsoleQueue.length) {
      const nextAtt = sortedConsoleQueue[nextIndex];
      setSelectedAttendeeForJudging(nextAtt);
      setToast({ message: `Skipped to ${nextAtt.name}`, type: 'info' });
      setTimeout(() => {
        const rowEl = document.getElementById(`queue-row-${nextAtt.id}`);
        if (rowEl) {
          rowEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }, 50);
    } else {
      setToast({ message: 'End of queue reached', type: 'info' });
    }
  };

  return (
    <div id="host-console" className="min-h-screen bg-background text-on-background flex flex-col font-sans overflow-x-hidden">
      
      {/* Event Header & Action Bar */}
      <header className="bg-surface border-b border-outline-variant/60 shadow-xs px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 z-40">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black shadow-sm text-xl">
            🏆
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-extrabold text-lg text-primary tracking-tight leading-none">
                {myAssignedEvent.title}
              </h1>
              <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                myAssignedEvent.status === 'Live'
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : myAssignedEvent.status === 'Paused'
                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                  : myAssignedEvent.status === 'Completed'
                  ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                  : 'bg-outline-variant/20 text-on-surface-variant border-outline-variant/30'
              }`}>
                {myAssignedEvent.status || 'Upcoming'}
              </span>
              {isOnline === false ? (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold flex items-center gap-1 border border-amber-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Offline Mode
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Connected
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant font-semibold mt-1">
              📍 Venue: <strong className="text-on-surface">{myAssignedEvent.location}</strong> • Host: {user.name} ({user.email})
            </p>
          </div>
        </div>

        {/* Quick Action Button Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Start / Resume Event */}
          {(myAssignedEvent.status === 'Upcoming' || !myAssignedEvent.status) && (
            <button
              onClick={() => updateEventStatus('Live')}
              className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Play className="w-4 h-4" /> Start Event
            </button>
          )}

          {myAssignedEvent.status === 'Paused' && (
            <button
              onClick={() => updateEventStatus('Live')}
              className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Play className="w-4 h-4" /> Resume Event
            </button>
          )}

          {/* Pause Event */}
          {myAssignedEvent.status === 'Live' && (
            <button
              onClick={() => updateEventStatus('Paused')}
              className="h-10 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Clock className="w-4 h-4" /> Pause Event
            </button>
          )}

          {/* End Event */}
          {(myAssignedEvent.status === 'Live' || myAssignedEvent.status === 'Paused') && (
            <button
              onClick={() => updateEventStatus('Completed')}
              className="h-10 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <X className="w-4 h-4" /> End Event
            </button>
          )}

          {/* Publish Results */}
          <button
            onClick={() => setIsPublishConfirmOpen(true)}
            disabled={!isEventCompleted || isResultsPublished}
            className="h-10 px-4 bg-primary text-on-primary font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Award className="w-4 h-4" /> Publish Results
          </button>

          {/* Export Participants CSV/Excel */}
          <button
            onClick={handleExportParticipants}
            className="h-10 px-4 bg-surface-container border border-outline-variant hover:bg-surface-container-high text-on-surface-variant font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export Participants
          </button>

          {/* Declare Winners Toggle Button */}
          <button 
            onClick={() => setActiveTab(activeTab === 'winners' ? 'overview' : 'winners')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-sm cursor-pointer ${
              activeTab === 'winners' 
                ? 'bg-amber-500 text-white shadow-amber-500/25 ring-2 ring-amber-500/50' 
                : 'bg-surface border border-outline-variant text-on-surface hover:bg-surface-container hover:border-amber-500/50 hover:text-amber-600'
            }`}
          >
            <Trophy className={`w-4 h-4 ${activeTab === 'winners' ? 'text-white' : 'text-amber-500'}`} />
            <span className="hidden sm:inline">Declare Winners</span>
          </button>
          
          {/* Check-in Desk Toggle Button */}
          <button
            onClick={() => setActiveTab(activeTab === 'registration' ? 'overview' : 'registration')}
            className={`h-10 px-4 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              activeTab === 'registration' 
                ? 'bg-primary text-on-primary' 
                : 'bg-surface-container border border-outline-variant hover:bg-surface-container-high text-on-surface-variant'
            }`}
          >
            <UserCheck className="w-4 h-4" /> Registration Module
          </button>

          {/* Help Center */}
          <button
            onClick={() => setIsHelpModalOpen(true)}
            className="h-10 px-3 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" /> Help Center
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="h-10 px-3 bg-surface-container border border-outline-variant hover:bg-surface-container-high text-on-surface-variant font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      {activeTab === 'winners' ? (
        <div className="flex-1 overflow-y-auto bg-surface relative z-10">
          <ManualWinnersEntry 
            event={myAssignedEvent}
            attendees={attendees}
            onClose={() => setActiveTab('overview')}
          />
        </div>
      ) : activeTab === 'registration' ? (
        <div className="flex-1 overflow-y-auto bg-surface relative z-10">
          <HostRegistrationTab 
            hostAssignedEventId={myAssignedEvent?.id || ''} 
            attendees={attendees} 
          />
        </div>
      ) : (
      <div className="flex-1 flex flex-col min-h-0 lg:h-[calc(100vh-80px)]">
          {/* Mobile Navigation Segment Tabs */}
          <div className="lg:hidden flex items-center justify-between bg-surface border-b border-outline-variant/60 p-2 gap-1 sticky top-0 z-30 shrink-0 bg-white">
            <button
              onClick={() => setMobileTab('queue')}
              className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-xl transition-all border ${
                mobileTab === 'queue'
                  ? 'bg-primary border-primary text-on-primary shadow-xs'
                  : 'bg-surface border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              Queue ({sortedConsoleQueue.length})
            </button>
            <button
              onClick={() => setMobileTab('scoring')}
              className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-xl transition-all border relative ${
                mobileTab === 'scoring'
                  ? 'bg-primary border-primary text-on-primary shadow-xs'
                  : 'bg-surface border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              Scoring Desk
              {currentActiveJudgingAttendee && (
                <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-amber-500" />
              )}
            </button>
            <button
              onClick={() => setMobileTab('standings')}
              className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider rounded-xl transition-all border ${
                mobileTab === 'standings'
                  ? 'bg-primary border-primary text-on-primary shadow-xs'
                  : 'bg-surface border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              Standings
            </button>
          </div>

          <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 md:p-6 overflow-y-auto lg:overflow-hidden min-h-0">
          
          {/* ==================================================== */}
          {/* COLUMN 1 (Left): Batch Control & Participant Queue  */}
          {/* ==================================================== */}
          <section className={`col-span-1 lg:col-span-4 flex flex-col gap-4 lg:h-full lg:overflow-hidden min-w-0 ${
            mobileTab === 'queue' ? 'flex' : 'hidden lg:flex'
          }`}>
          
          {/* Batches Collapsible List */}
          <div className="bg-surface border border-outline-variant/60 rounded-2xl p-4 flex flex-col gap-3 shadow-xs shrink-0 max-h-[220px] overflow-y-auto">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-primary uppercase tracking-wider block">Event Batches</span>
              <button
                onClick={() => setIsCreatingBatch(!isCreatingBatch)}
                className="text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-lg hover:bg-primary/20 transition-all"
              >
                {isCreatingBatch ? 'Cancel' : '+ Generate'}
              </button>
            </div>

            {isCreatingBatch && (
              <form onSubmit={handleCreateBatch} className="bg-surface-container-low border border-outline-variant/40 p-3 rounded-xl space-y-2.5">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-[8px] font-black uppercase text-on-surface-variant">Batch Count</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={batchCount}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : parseInt(e.target.value);
                        setBatchCount(val);
                        if (typeof val === 'number') {
                          const arr = Array.from({ length: val }, (_, i) => `Batch ${i + 1}`);
                          setDynamicBatchNames(arr);
                        }
                      }}
                      className="w-full h-8 px-2.5 bg-surface border border-outline-variant rounded-lg text-xs outline-none"
                    />
                  </div>
                </div>
                {dynamicBatchNames.map((name, i) => (
                  <input
                    key={i}
                    type="text"
                    placeholder={`Batch ${i + 1} Name`}
                    value={name}
                    onChange={(e) => {
                      const updated = [...dynamicBatchNames];
                      updated[i] = e.target.value;
                      setDynamicBatchNames(updated);
                    }}
                    className="w-full h-8 px-2.5 bg-surface border border-outline-variant rounded-lg text-xs outline-none"
                  />
                ))}
                <button
                  type="submit"
                  className="w-full h-8 bg-primary text-on-primary font-semibold text-xs rounded-lg hover:bg-primary/95 transition-all"
                >
                  Confirm Batches
                </button>
              </form>
            )}

            {eventBatches.length === 0 ? (
              <p className="text-[10px] text-on-surface-variant italic">No batches created. Use "+ Generate" to create batches.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {eventBatches.map(batch => {
                  const bCount = myAttendees.filter(a => a.batchId === batch.id).length;
                  const isExpanded = expandedBatchIds.includes(batch.id);
                  const isFiltered = activeConsoleFilter === batch.id;

                  return (
                    <div 
                      key={batch.id} 
                      className={`border rounded-xl p-2.5 transition-all ${
                        isFiltered 
                          ? 'border-primary bg-primary/5 shadow-xs' 
                          : 'border-outline-variant bg-surface hover:border-outline-variant-high'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-on-surface">{batch.name}</span>
                          <span className="text-[9px] font-semibold text-on-surface-variant bg-surface-container px-1.5 py-0.2 rounded">
                            {bCount}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              if (isFiltered) {
                                setActiveConsoleFilter('all');
                              } else {
                                setActiveConsoleFilter(batch.id);
                              }
                            }}
                            className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-all ${
                              isFiltered 
                                ? 'bg-primary text-on-primary border-primary' 
                                : 'bg-surface hover:bg-surface-container border-outline-variant'
                            }`}
                          >
                            Filter Queue
                          </button>
                          <button
                            onClick={() => {
                              setExpandedBatchIds(prev => 
                                isExpanded ? prev.filter(id => id !== batch.id) : [...prev, batch.id]
                              );
                            }}
                            className="p-0.5 text-on-surface-variant hover:text-on-surface"
                          >
                            <span className="material-symbols-outlined !text-sm">
                              {isExpanded ? 'expand_less' : 'expand_more'}
                            </span>
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-2 pt-2 border-t border-outline-variant/40 space-y-1 max-h-[100px] overflow-y-auto">
                          {myAttendees.filter(a => a.batchId === batch.id).length === 0 ? (
                            <p className="text-[9px] text-on-surface-variant italic">No participants in batch</p>
                          ) : (
                            myAttendees.filter(a => a.batchId === batch.id).map(a => (
                              <div key={a.id} className="flex justify-between items-center text-[9px] text-on-surface-variant">
                                <span>{a.name} ({a.participantId || a.id})</span>
                                <span className={a.attendanceStatus === 'Present' ? 'text-emerald-600 font-bold' : 'text-amber-600'}>
                                  {a.attendanceStatus === 'Present' ? 'Present' : 'Pending'}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Participant Queue List */}
          <div className="flex-1 bg-surface border border-outline-variant/60 rounded-2xl p-4 flex flex-col gap-3 shadow-xs overflow-hidden h-full">
            <span className="text-[10px] font-black text-primary uppercase tracking-wider block">Participant Queue</span>
            
            {/* Live Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-outline absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search name, ID, college..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 bg-surface-container-low border border-outline-variant rounded-xl text-xs outline-none focus:border-primary placeholder:text-outline"
              />
            </div>

            {/* Console Filter Pills */}
            <div className="flex flex-wrap gap-1 pb-1 shrink-0 overflow-x-auto">
              {[
                { id: 'all', label: 'All' },
                { id: 'waiting', label: 'Waiting' },
                { id: 'checked-in', label: 'Checked In' },
                { id: 'evaluating', label: 'Evaluating' },
                { id: 'evaluated', label: 'Evaluated' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setActiveConsoleFilter(opt.id)}
                  className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-all ${
                    activeConsoleFilter === opt.id
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-surface-container-low text-on-surface-variant border-outline-variant/40 hover:bg-surface-container'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Queue Roster */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
              {sortedConsoleQueue.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-xs font-bold text-on-surface">Queue is Empty</p>
                  <p className="text-[10px] text-on-surface-variant mt-1">Adjust search filter query or mark attendance</p>
                </div>
              ) : (
                sortedConsoleQueue.map(att => {
                  const isActive = currentActiveJudgingAttendee?.id === att.id;
                  const isEvaluated = att.judgingStatus === 'Completed';
                  const isEvaluating = att.judgingStatus === 'In Progress';

                  return (
                    <div
                      key={att.id}
                      id={`queue-row-${att.id}`}
                      onClick={() => {
                        setSelectedAttendeeForJudging(att);
                        setMobileTab('scoring');
                      }}
                      className={`p-3 border rounded-xl flex flex-col justify-between gap-2.5 transition-all cursor-pointer ${
                        isActive
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : isEvaluated
                          ? 'border-outline-variant/40 bg-surface-container-low/40 opacity-70 hover:opacity-100'
                          : 'border-outline-variant/60 bg-surface hover:border-outline-variant'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[9px] font-black text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.2 rounded leading-none shrink-0">
                              {att.participantId || att.id}
                            </span>
                            <span className="font-extrabold text-xs text-on-surface truncate block">
                              {att.name}
                            </span>
                          </div>
                          {att.teamName && (
                            <span className="text-[9px] font-bold text-amber-600 block mt-0.5 truncate">
                              👥 Team: {att.teamName}
                            </span>
                          )}
                          <span className="text-[9px] text-on-surface-variant block mt-0.5 truncate font-semibold">
                            🏫 {att.college} • {att.batchName || 'Unbatched'}
                          </span>
                        </div>

                        {/* Status badges */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            isEvaluated
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : isEvaluating
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              : 'bg-outline-variant/20 text-on-surface-variant border border-outline-variant/30'
                          }`}>
                            {isEvaluated ? 'Evaluated' : isEvaluating ? 'Evaluating' : 'Not Started'}
                          </span>
                          
                          <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            att.attendanceStatus === 'Present'
                              ? 'bg-teal-500/10 text-teal-600'
                              : 'bg-rose-500/10 text-rose-600'
                          }`}>
                            {att.attendanceStatus === 'Present' ? 'Checked In' : 'Absent'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-outline-variant/30 pt-2 shrink-0">
                        {isEvaluated ? (
                          <span className="text-[10px] font-extrabold text-primary">
                            Score: {att.score || 0} pts
                          </span>
                        ) : (
                          <span className="text-[9px] text-on-surface-variant italic">Waiting score</span>
                        )}

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAttendeeForJudging(att);
                              setMobileTab('scoring');
                              setTimeout(() => {
                                const firstInput = document.getElementById(`score-input-${evaluationCriteria[0]?.id}`);
                                if (firstInput) {
                                  (firstInput as HTMLInputElement).focus();
                                }
                              }, 50);
                            }}
                            className="text-[9px] font-extrabold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-all"
                          >
                            Evaluate
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* ==================================================== */}
        {/* COLUMN 2 (Center): Inline Evaluation Panel          */}
        {/* ==================================================== */}
        <section className={`col-span-1 lg:col-span-5 flex flex-col gap-4 lg:h-full lg:overflow-hidden min-w-0 ${
          mobileTab === 'scoring' ? 'flex' : 'hidden lg:flex'
        }`}>
          
          <div className="bg-surface border border-outline-variant/60 rounded-2xl p-5 flex flex-col gap-4 shadow-xs h-full overflow-hidden">
            <div className="flex justify-between items-center border-b border-outline-variant/40 pb-3 shrink-0">
              <div>
                <span className="text-[10px] font-black text-primary uppercase tracking-wider block">Judge Panel (Inline)</span>
                <h2 className="font-extrabold text-sm text-on-surface mt-0.5">Assessor Evaluation Desk</h2>
              </div>
              
              <button
                onClick={() => setShowCriteriaConfig(!showCriteriaConfig)}
                className="p-1 text-on-surface-variant hover:text-on-surface"
                title="Configure criteria"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>

            {showCriteriaConfig && (
              <div className="bg-surface-container-low border border-outline-variant/40 p-4 rounded-xl space-y-3 shrink-0">
                <span className="text-[9px] font-black text-on-surface-variant uppercase block">Manage Scoring Criteria</span>
                
                <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                  {evaluationCriteria.map(crit => (
                    <div key={crit.id} className="flex justify-between items-center text-xs bg-surface border border-outline-variant p-2 rounded-lg">
                      <span className="font-bold">{crit.name} (max: {crit.maxScore})</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCriterion(crit.id)}
                        className="text-error hover:text-error-dark"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddCriterion} className="flex items-center gap-2 pt-2 border-t border-outline-variant/40">
                  <input
                    type="text"
                    placeholder="New Criteria (e.g. Innovation)"
                    value={newCriterionName}
                    onChange={(e) => setNewCriterionName(e.target.value)}
                    className="flex-1 h-8 px-2.5 bg-surface border border-outline-variant rounded-lg text-xs outline-none"
                  />
                  <input
                    type="number"
                    value={newCriterionMax}
                    onChange={(e) => setNewCriterionMax(e.target.value)}
                    className="w-14 h-8 px-2 bg-surface border border-outline-variant rounded-lg text-xs outline-none text-center"
                    placeholder="Max"
                  />
                  <button
                    type="submit"
                    className="h-8 px-3 bg-primary text-on-primary rounded-lg text-xs font-semibold hover:bg-primary/95"
                  >
                    Add
                  </button>
                </form>
              </div>
            )}

            {!currentActiveJudgingAttendee ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <AlertCircle className="w-12 h-12 text-outline-variant/80 mb-2" />
                <p className="text-xs font-bold text-on-surface">No Participant Available</p>
                <p className="text-[10px] text-on-surface-variant mt-1">Queue is empty or criteria filters returned 0 entries.</p>
              </div>
            ) : (
              <>
                {/* Desktop Judging Panel */}
                <div className="hidden lg:flex flex-1 flex-col gap-4 overflow-y-auto pr-1 min-h-0">
                  
                  {/* Active participant card header */}
                  <div className="bg-surface-container-low border border-outline-variant/45 p-4 rounded-xl flex justify-between items-start gap-2 shrink-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] font-black text-primary bg-primary/10 border border-primary/20 px-2 py-0.2 rounded">
                          {currentActiveJudgingAttendee.participantId || currentActiveJudgingAttendee.id}
                        </span>
                        <h3 className="font-black text-sm text-on-surface">
                          {currentActiveJudgingAttendee.name}
                        </h3>
                      </div>
                      {currentActiveJudgingAttendee.teamName && (
                        <p className="text-xs font-black text-amber-600 mt-1">
                          👥 Team Leader: {currentActiveJudgingAttendee.teamName}
                        </p>
                      )}
                      <div className="text-[10px] text-on-surface-variant mt-1.5 font-bold space-y-0.5">
                        <p>🏫 College: <span className="text-on-surface">{currentActiveJudgingAttendee.college}</span></p>
                        <p>📧 Email: {currentActiveJudgingAttendee.email} • 📞 Mobile: {(currentActiveJudgingAttendee as any).mobile || currentActiveJudgingAttendee.phone || 'N/A'}</p>
                        {currentActiveJudgingAttendee.teamMembers && currentActiveJudgingAttendee.teamMembers.length > 0 && (
                          <p className="text-amber-800 dark:text-amber-300 font-bold">
                            👥 Members: {currentActiveJudgingAttendee.teamMembers.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Attendance check box directly inline */}
                    <div className="flex flex-col items-end gap-1.5">
                      <label className="flex items-center gap-1.5 cursor-pointer bg-surface border border-outline-variant px-2.5 py-1.5 rounded-lg text-[10px] font-bold">
                        <input
                          type="checkbox"
                          checked={currentActiveJudgingAttendee.attendanceStatus === 'Present'}
                          onChange={(e) => {
                            const status = e.target.checked ? 'Present' : 'Absent';
                            handleMarkAttendance(currentActiveJudgingAttendee.id, status);
                            setToast({ 
                              message: `Marked ${currentActiveJudgingAttendee.name} ${status}`, 
                              type: 'info' 
                            });
                          }}
                          disabled={isResultsPublished}
                          className="rounded border-outline-variant text-primary focus:ring-0 cursor-pointer"
                        />
                        <span>Checked In</span>
                      </label>
                      <span className="text-[9px] text-on-surface-variant font-bold">
                        Batch: {currentActiveJudgingAttendee.batchName || 'Unassigned'}
                      </span>
                    </div>
                  </div>

                  {/* Score Input Matrix */}
                  <div className="space-y-3">
                    <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-wider block">Evaluation Metrics</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {evaluationCriteria.map(crit => {
                        const currentVal = criteriaScores[crit.id] || '';
                        const parsedVal = parseFloat(currentVal);
                        const isErr = currentVal !== '' && (isNaN(parsedVal) || parsedVal < 0 || parsedVal > crit.maxScore);

                        return (
                          <div key={crit.id} className="bg-surface-container-low border border-outline-variant/40 p-3 rounded-xl space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                              <span className="text-on-surface">{crit.name}</span>
                              <span className="text-on-surface-variant font-semibold">Max: {crit.maxScore}</span>
                            </div>
                            
                            <input
                              type="number"
                              id={`score-input-${crit.id}`}
                              value={currentVal}
                              placeholder=""
                              onChange={(e) => handleCriteriaScoreChange(crit.id, e.target.value)}
                              disabled={isResultsPublished}
                              className={`w-full h-8 px-2.5 bg-surface border rounded-lg text-xs outline-none ${
                                isErr ? 'border-error focus:ring-error' : 'border-outline focus:border-primary'
                              }`}
                            />
                            {isErr && (
                              <span className="text-[8px] text-error font-bold block">
                                Out of range (0-{crit.maxScore})
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Assessor Remarks */}
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black text-on-surface-variant uppercase tracking-wider">Evaluation Remarks</label>
                    <textarea
                      rows={2}
                      placeholder="Enter judging remarks, notes, or critique feedback..."
                      value={judgingRemarks}
                      onChange={(e) => setJudgingRemarks(e.target.value)}
                      disabled={isResultsPublished}
                      className="w-full p-2.5 bg-surface border border-outline-variant rounded-xl text-xs outline-none focus:border-primary placeholder:text-outline-variant/80"
                    />
                  </div>

                  {criterionError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg text-[10px] font-bold text-rose-600 flex items-center gap-1.5">
                      <span>⚠️ {criterionError}</span>
                    </div>
                  )}

                  {/* Score lock notification if results are published */}
                  {isResultsPublished && (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg text-[9px] font-bold text-amber-700 flex items-center gap-1.5 shrink-0">
                      <span>🔒 Official standings have been compiled and published. Scores are locked in read-only mode.</span>
                    </div>
                  )}

                  {/* Panel Action Buttons */}
                  {!isResultsPublished && (
                    <div className="flex items-center gap-3 pt-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleSkipEvaluation}
                        className="h-10 px-4 border border-outline-variant hover:bg-surface-container text-on-surface-variant font-semibold rounded-xl text-xs transition-all cursor-pointer"
                      >
                        Skip
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEvaluationInline(currentActiveJudgingAttendee, 'In Progress')}
                        className="flex-1 h-10 border border-outline-variant hover:bg-surface-container text-on-surface-variant font-semibold rounded-xl text-xs transition-all cursor-pointer"
                      >
                        Save Draft
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEvaluationInline(currentActiveJudgingAttendee, 'Completed')}
                        className="flex-1 h-10 bg-primary hover:bg-primary/95 text-on-primary font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer"
                      >
                        Save & Next
                      </button>
                    </div>
                  )}

                </div>

                {/* Mobile-only Judging Panel */}
                <div className="lg:hidden flex flex-col gap-4 flex-grow min-h-0 overflow-y-auto">
                  
                  {/* Batch & Queue Progress Header */}
                  {(() => {
                    const batchAttendees = myAttendees.filter(a => a.batchId === currentActiveJudgingAttendee.batchId);
                    const presentAttendees = batchAttendees.filter(a => a.attendanceStatus === 'Present');
                    const judgedCount = presentAttendees.filter(a => a.judgingStatus === 'Completed').length;
                    const totalCount = presentAttendees.length;
                    const progressPercentage = totalCount > 0 ? (judgedCount / totalCount) * 100 : 0;

                    return (
                      <div className="bg-surface-container-low border border-outline-variant/40 p-4 rounded-2xl space-y-3 shrink-0">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase text-on-surface-variant tracking-wider">
                          <span>Batch: {currentActiveJudgingAttendee.batchName || 'Unassigned'}</span>
                          <span>Progress: {judgedCount}/{totalCount} Judged</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                        
                        {/* Judged, Current and Pending indicator badges list */}
                        <div className="space-y-1">
                          <span className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest block">Roster Overview</span>
                          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                            {presentAttendees.map(a => {
                              const isCurrent = a.id === currentActiveJudgingAttendee.id;
                              const isJudged = a.judgingStatus === 'Completed';
                              
                              return (
                                <div 
                                  key={a.id}
                                  onClick={() => {
                                    setSelectedAttendeeForJudging(a);
                                    setMobileTab('scoring');
                                  }}
                                  className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                                    isCurrent 
                                      ? 'bg-amber-500 border-amber-600 text-white font-extrabold shadow-sm' 
                                      : isJudged 
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                      : 'bg-surface border-outline-variant/30 text-on-surface-variant'
                                  }`}
                                >
                                  <span className="mr-1">{isJudged ? '✓' : isCurrent ? '▶' : '○'}</span>
                                  {a.teamName || a.name}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Large Team Info Card */}
                  <div className="bg-surface-container-low border border-outline-variant/40 p-5 rounded-2xl space-y-4">
                    <div className="border-b border-outline-variant/30 pb-3 flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <span className="font-mono text-[9px] font-black text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded leading-none shrink-0 inline-block mb-1.5">
                          {currentActiveJudgingAttendee.participantId || currentActiveJudgingAttendee.id}
                        </span>
                        <h2 className="font-black text-base text-on-surface leading-tight">
                          {currentActiveJudgingAttendee.name}
                        </h2>
                        {currentActiveJudgingAttendee.teamName && (
                          <p className="text-xs font-black text-amber-600 mt-1">
                            👥 Team Name: {currentActiveJudgingAttendee.teamName}
                          </p>
                        )}
                        {currentActiveJudgingAttendee.teamMembers && currentActiveJudgingAttendee.teamMembers.length > 0 && (
                          <p className="text-[10px] text-amber-700 font-bold mt-1">
                            👥 Members: {currentActiveJudgingAttendee.teamMembers.join(', ')}
                          </p>
                        )}
                      </div>

                      <label className="flex items-center gap-1.5 cursor-pointer bg-surface border border-outline-variant px-3 py-2 rounded-xl text-xs font-bold shrink-0 shadow-sm">
                        <input
                          type="checkbox"
                          checked={currentActiveJudgingAttendee.attendanceStatus === 'Present'}
                          onChange={(e) => {
                            const status = e.target.checked ? 'Present' : 'Absent';
                            handleMarkAttendance(currentActiveJudgingAttendee.id, status);
                            setToast({ 
                              message: `Marked ${currentActiveJudgingAttendee.name} ${status}`, 
                              type: 'info' 
                            });
                          }}
                          disabled={isResultsPublished}
                          className="rounded border-outline-variant text-primary focus:ring-0 cursor-pointer w-4 h-4"
                        />
                        <span>Present</span>
                      </label>
                    </div>
                    
                    <div className="text-[10px] text-on-surface-variant font-medium space-y-1">
                      <p>🏫 College: <span className="text-on-surface font-semibold">{currentActiveJudgingAttendee.college}</span></p>
                      <p>📧 Email: {currentActiveJudgingAttendee.email} <span className="opacity-40">•</span> 📞 Phone: {(currentActiveJudgingAttendee as any).mobile || currentActiveJudgingAttendee.phone || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Large Score Controls */}
                  <div className="space-y-4">
                    <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest block pl-1">Metrics Judging Form</span>
                    
                    <div className="space-y-3">
                      {evaluationCriteria.map(crit => {
                        const currentVal = criteriaScores[crit.id] || '';
                        const parsedVal = parseFloat(currentVal);
                        const scoreNum = isNaN(parsedVal) ? 0 : parsedVal;
                        const isErr = currentVal !== '' && (isNaN(parsedVal) || parsedVal < 0 || parsedVal > crit.maxScore);

                        const adjustScore = (delta: number) => {
                          if (isResultsPublished) return;
                          const nextScore = Math.max(0, Math.min(crit.maxScore, scoreNum + delta));
                          handleCriteriaScoreChange(crit.id, String(nextScore));
                        };

                        return (
                          <div key={crit.id} className="bg-surface-container-low border border-outline-variant/40 p-4 rounded-2xl space-y-3 shadow-xs">
                            <div className="flex justify-between items-center text-xs font-bold">
                              <span className="text-on-surface text-sm">{crit.name}</span>
                              <span className="text-on-surface-variant">Max Score: {crit.maxScore}</span>
                            </div>
                            
                            {/* Big Touch-Friendly Controls */}
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                disabled={isResultsPublished}
                                onClick={() => adjustScore(-1)}
                                className="w-12 h-12 bg-surface-container border border-outline-variant hover:bg-surface-container-high text-on-surface text-lg font-black rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
                              >
                                -
                              </button>
                              
                              <div className="flex-1 relative">
                                <input
                                  type="number"
                                  id={`mobile-score-input-${crit.id}`}
                                  value={currentVal}
                                  placeholder="0"
                                  onChange={(e) => handleCriteriaScoreChange(crit.id, e.target.value)}
                                  disabled={isResultsPublished}
                                  className={`w-full h-12 text-center text-base font-black bg-surface border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 ${
                                    isErr ? 'border-error text-error' : 'border-outline text-primary'
                                  }`}
                                />
                              </div>

                              <button
                                type="button"
                                disabled={isResultsPublished}
                                onClick={() => adjustScore(1)}
                                className="w-12 h-12 bg-surface-container border border-outline-variant hover:bg-surface-container-high text-on-surface text-lg font-black rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
                              >
                                +
                              </button>
                            </div>
                            
                            {isErr && (
                              <span className="text-[9px] text-error font-black block text-center animate-pulse">
                                Out of range (0 - {crit.maxScore})
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Large Comments/Remarks Field */}
                  <div className="space-y-1.5 bg-surface-container-low border border-outline-variant/40 p-4 rounded-2xl shadow-xs">
                    <label className="block text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Judges Remarks / Feedback</label>
                    <textarea
                      rows={3}
                      placeholder="Type feedback notes, strengths, or questions answered..."
                      value={judgingRemarks}
                      onChange={(e) => setJudgingRemarks(e.target.value)}
                      disabled={isResultsPublished}
                      className="w-full p-3 bg-surface border border-outline-variant rounded-xl text-sm outline-none focus:border-primary placeholder:text-outline-variant/70 min-h-[90px]"
                    />
                  </div>

                  {criterionError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-xs font-bold text-rose-600 flex items-center gap-1.5 animate-pulse">
                      <span>⚠️ {criterionError}</span>
                    </div>
                  )}

                  {/* Large Action Buttons */}
                  {!isResultsPublished && (
                    <div className="flex flex-col gap-2.5 pt-2 shrink-0">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleSkipEvaluation}
                          className="flex-1 h-12 border border-outline hover:bg-surface-container text-on-surface-variant font-black rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                        >
                          Skip
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEvaluationInline(currentActiveJudgingAttendee, 'In Progress')}
                          className="flex-1 h-12 border border-outline hover:bg-surface-container text-on-surface-variant font-black rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                        >
                          Save Draft
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveEvaluationInline(currentActiveJudgingAttendee, 'Completed')}
                        className="w-full h-14 bg-primary hover:bg-primary/95 text-on-primary font-black rounded-xl text-sm uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                      >
                        Submit Score & Next Team
                      </button>
                    </div>
                  )}

                </div>
              </>
            )}
          </div>
        </section>

        <section className={`col-span-1 lg:col-span-3 flex flex-col gap-4 lg:h-full lg:overflow-hidden min-w-0 ${
          mobileTab === 'standings' ? 'flex' : 'hidden lg:flex'
        }`}>
          
          {/* Summary Panel */}
          <div className="bg-surface border border-outline-variant/60 rounded-2xl p-4 flex flex-col gap-3 shadow-xs shrink-0">
            <span className="text-[10px] font-black text-primary uppercase tracking-wider block">Summary Stats</span>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-surface-container-low p-2 rounded-xl text-center">
                <span className="text-[8px] font-black text-on-surface-variant uppercase">Registered</span>
                <p className="text-sm font-black text-on-surface mt-0.5">{totalRegistered}</p>
              </div>
              <div className="bg-surface-container-low p-2 rounded-xl text-center">
                <span className="text-[8px] font-black text-emerald-600 uppercase">Checked In</span>
                <p className="text-sm font-black text-emerald-600 mt-0.5">{totalCheckedIn}</p>
              </div>
              <div className="bg-surface-container-low p-2 rounded-xl text-center">
                <span className="text-[8px] font-black text-amber-600 uppercase">Pending</span>
                <p className="text-sm font-black text-amber-600 mt-0.5">{totalPendingAttendance}</p>
              </div>
              <div className="bg-surface-container-low p-2 rounded-xl text-center">
                <span className="text-[8px] font-black text-primary uppercase">Evaluated</span>
                <p className="text-sm font-black text-primary mt-0.5">
                  {myAttendees.filter(a => a.judgingStatus === 'Completed').length}
                </p>
              </div>
            </div>

            <div className="border-t border-outline-variant/40 pt-2 grid grid-cols-2 gap-2">
              <div className="text-center">
                <span className="text-[8px] font-black text-on-surface-variant uppercase">Top Score</span>
                <p className="text-sm font-black text-primary">
                  {(() => {
                    const scoredList = myAttendees.filter(a => a.judgingStatus === 'Completed' && a.score !== undefined);
                    return scoredList.length > 0 ? Math.max(...scoredList.map(a => a.score || 0)) : 0;
                  })()}
                </p>
              </div>
              <div className="text-center">
                <span className="text-[8px] font-black text-on-surface-variant uppercase">Average</span>
                <p className="text-sm font-black text-on-surface">
                  {(() => {
                    const scoredList = myAttendees.filter(a => a.judgingStatus === 'Completed' && a.score !== undefined);
                    return scoredList.length > 0 
                      ? (scoredList.reduce((sum, a) => sum + (a.score || 0), 0) / scoredList.length).toFixed(1)
                      : '0.0';
                  })()}
                </p>
              </div>
            </div>
          </div>

          {/* Live Leaderboard */}
          <div className="bg-surface border border-outline-variant/60 rounded-2xl p-4 flex flex-col gap-3 shadow-xs min-h-[160px] overflow-hidden">
            <span className="text-[10px] font-black text-primary uppercase tracking-wider block">Live Leaderboard</span>
            
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {myAttendees
                .filter(a => a.attendanceStatus === 'Present' && a.judgingStatus === 'Completed')
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .length === 0 ? (
                <p className="text-[10px] text-on-surface-variant italic text-center py-4">No evaluations completed yet.</p>
              ) : (
                myAttendees
                  .filter(a => a.attendanceStatus === 'Present' && a.judgingStatus === 'Completed')
                  .sort((a, b) => (b.score || 0) - (a.score || 0))
                  .map((stud, idx) => {
                    const isGold = idx === 0;
                    const isSilver = idx === 1;
                    const isBronze = idx === 2;

                    return (
                      <div 
                        key={stud.id} 
                        className={`flex justify-between items-center px-2.5 py-1.5 border rounded-xl transition-all ${
                          isGold 
                            ? 'bg-amber-50/10 border-amber-500/30 text-amber-800' 
                            : isSilver 
                            ? 'bg-slate-50/10 border-slate-500/20 text-slate-700'
                            : isBronze 
                            ? 'bg-amber-700/5 border-amber-700/10 text-amber-700' 
                            : 'bg-surface-container-lowest border-outline-variant/30 text-on-surface-variant'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-black w-4 shrink-0">
                            {isGold ? '🥇' : isSilver ? '🥈' : isBronze ? '🥉' : `${idx + 1}`}
                          </span>
                          <span className="font-extrabold text-xs truncate">
                            {stud.teamName ? stud.teamName : stud.name}
                          </span>
                        </div>
                        <span className="font-black text-xs shrink-0">
                          {stud.score || 0}
                        </span>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* Event Timeline */}
          <div className="bg-surface border border-outline-variant/60 rounded-2xl p-4 flex flex-col gap-3 shadow-xs shrink-0">
            <span className="text-[10px] font-black text-primary uppercase tracking-wider block">Event Stage Timeline</span>
            
            <div className="space-y-2 pt-1">
              {timelineStages.map((stage, idx) => {
                const isActive = stage.id === activeTimelineStage;
                const isCompleted = idx < activeStageIndex;

                return (
                  <div key={stage.id} className="flex items-center gap-2.5">
                    <div className="relative flex flex-col items-center">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black shrink-0 ${
                        isActive
                          ? 'bg-primary text-on-primary ring-2 ring-primary/30'
                          : isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-outline-variant/40 text-on-surface-variant'
                      }`}>
                        {isCompleted ? '✓' : ''}
                      </div>
                      {idx < timelineStages.length - 1 && (
                        <div className={`w-0.5 h-4 my-0.5 ${
                          isCompleted ? 'bg-emerald-600' : 'bg-outline-variant/30'
                        }`} />
                      )}
                    </div>
                    <span className={`text-[10px] font-extrabold capitalize ${
                      isActive ? 'text-primary' : isCompleted ? 'text-emerald-700' : 'text-on-surface-variant'
                    }`}>
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </section>

      </main>
      </div>
      )}

      {/* Confirmation Publish Modal */}
      {isPublishConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-surface border border-outline-variant/60 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <Award className="w-6 h-6 animate-pulse shrink-0" />
              <h3 className="text-base font-black text-on-surface">Publish Final Results?</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Are you sure you want to compile and publish the official standings for <strong>{myAssignedEvent.title}</strong>? Once published, all judging scores and criteria will become **read-only** and locked permanently.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsPublishConfirmOpen(false)}
                className="px-4 py-2 border border-outline-variant rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handlePublishResults();
                  setIsPublishConfirmOpen(false);
                }}
                className="px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-semibold hover:bg-primary/95 transition-all shadow-md cursor-pointer"
              >
                Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Event with Batch Selection Modal */}
      {showStartBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#c7c5d2] p-6 max-w-md w-full text-gray-800 text-left space-y-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Play className="w-5 h-5 text-[#080c5f]" /> Start Batch Evaluation
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Select which batch you would like to start judging right now. This will make the event live and activate the chosen batch.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-700">Choose Batch</label>
              <select
                value={selectedStartBatchId}
                onChange={(e) => setSelectedStartBatchId(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:border-[#080c5f] focus:ring-1 focus:ring-[#080c5f]"
              >
                {eventBatches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.status || 'Waiting'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowStartBatchModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStartWithBatch}
                className="px-4 py-2 bg-[#080c5f] text-white rounded-lg text-xs font-semibold hover:bg-[#080c5f]/95 shadow-sm"
              >
                Start Judging
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-on-surface text-surface shadow-lg text-xs font-bold animate-slide-up">
          <div className={`w-2 h-2 rounded-full shrink-0 ${
            toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'error' ? 'bg-error' : 'bg-primary'
          }`} />
          <span>{toast.message}</span>
        </div>
      )}

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
