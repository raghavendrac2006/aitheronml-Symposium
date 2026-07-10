import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Calendar, Users, CheckCircle, Award, Play, Edit3, Clock, 
  MapPin, Bell, LogOut, Check, X, Shield, ChevronRight, CheckCircle2, UserCheck, 
  AlertCircle, Trash2, Settings2, Plus, Info, Lock, Unlock, HelpCircle, FileText, ClipboardList, Layers, RotateCcw,
  Search, LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SymposiumEvent, Attendee, ParticipantResult, MAP_EMAIL_TO_EVENT_ID, Batch } from '../types';
import { INITIAL_EVENTS } from '../initialData';
import ParticipantProfile from './ParticipantProfile';

interface HostDashboardProps {
  user: { email: string; name: string; assignedEventId?: string; role?: string };
  events: SymposiumEvent[];
  attendees: Attendee[];
  batches?: Batch[];
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
  onSaveBatch,
  onDeleteBatch,
  onUpdateEvents,
  onUpdateAttendees,
  onLogout
}: HostDashboardProps) {
  // Tabs: overview, participants, batches, attendance, judging, results
  const [activeTab, setActiveTab] = useState<'overview' | 'participants' | 'batches' | 'attendance' | 'judging' | 'results'>('overview');
  
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
  const [batchCount, setBatchCount] = useState<number>(3);
  const [dynamicBatchNames, setDynamicBatchNames] = useState<string[]>(['Batch 1', 'Batch 2', 'Batch 3']);
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editingBatchName, setEditingBatchName] = useState('');
  const [selectedJudgingBatchId, setSelectedJudgingBatchId] = useState<string>('all');

  // Gate check-in desk states
  const [showGateCheckIn, setShowGateCheckIn] = useState(false);
  const [gateSearchQuery, setGateSearchQuery] = useState('');
  const [gateFilter, setGateFilter] = useState<'all' | 'checked-in' | 'pending'>('all');
  const [gateSelectedBatchId, setGateSelectedBatchId] = useState<string>('all');

  // Sync criteriaScores when selected attendee changes
  useEffect(() => {
    if (selectedAttendeeForJudging) {
      setJudgingRemarks(selectedAttendeeForJudging.remarks || '');
      
      // Load pre-existing scores if present
      const loadedScores: Record<string, string> = {};
      const attendeeScores = (selectedAttendeeForJudging as any).criteriaScores || {};
      
      evaluationCriteria.forEach(crit => {
        if (attendeeScores[crit.id] !== undefined) {
          loadedScores[crit.id] = String(attendeeScores[crit.id]);
        } else {
          // Fallback if total score exists but breakdown doesn't (distributed evenly)
          if (selectedAttendeeForJudging.score !== undefined && selectedAttendeeForJudging.score > 0) {
            const evenDist = Math.min(crit.maxScore, Math.round(selectedAttendeeForJudging.score / evaluationCriteria.length));
            loadedScores[crit.id] = String(evenDist);
          } else {
            loadedScores[crit.id] = '0';
          }
        }
      });
      setCriteriaScores(loadedScores);
      setCriterionError(null);
    } else {
      setCriteriaScores({});
      setJudgingRemarks('');
    }
  }, [selectedAttendeeForJudging, evaluationCriteria]);

  // Batch helper functions
  const eventBatches = batches.filter(b => b.eventId === (myAssignedEvent?.id || ''));

  useEffect(() => {
    if (eventBatches.length > 0 && (selectedJudgingBatchId === 'all' || !eventBatches.some(b => b.id === selectedJudgingBatchId))) {
      setSelectedJudgingBatchId(eventBatches[0].id);
    }
  }, [eventBatches]);

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

    // Filter dynamicBatchNames to ensure none are empty
    const namesToUse = dynamicBatchNames.map(n => n.trim()).filter(Boolean);
    const K = namesToUse.length;
    if (K <= 0) return alert("Please specify at least one batch name.");

    // Generate K batch objects
    const newBatchesList: Batch[] = [];
    const nowStr = new Date().toISOString();
    
    // Sort attendees by createdAt / registration order to enforce first-come first-served
    const sortedAttendees = [...myAttendees].sort((a, b) => {
      const timeA = a.createdAt || a.id || '';
      const timeB = b.createdAt || b.id || '';
      return timeA.localeCompare(timeB);
    });

    const N = sortedAttendees.length;
    
    // Create Batches
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

    // Divide attendees
    const baseSize = Math.floor(N / K);
    const remainder = N % K;
    
    // To match: "One batch must consist of 16 participants, but one participant is getting extra, 
    // so that extra participant will be assigned to the second batch, the last batch, in that way."
    // So the first K - remainder batches get baseSize elements, and the last remainder batches get baseSize + 1 elements.
    
    const updatedAttendees = [...attendees];
    let currentIdx = 0;
    
    for (let i = 0; i < K; i++) {
      const groupSize = (i >= K - remainder) ? (baseSize + 1) : baseSize;
      const currentBatchId = newBatchesList[i].id;
      const currentBatchName = newBatchesList[i].name;

      for (let j = 0; j < groupSize; j++) {
        if (currentIdx < N) {
          const attendeeToUpdate = sortedAttendees[currentIdx];
          // Find this attendee in the global attendees array and update it
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

    // Save Batches
    if (onSaveBatch) {
      for (const b of newBatchesList) {
        onSaveBatch(b);
      }
    }

    // Update Attendees
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
      // Unassign participants
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
      // Update participants batchName as well!
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
    const updated = events.map(e => {
      if (e.id === myAssignedEvent.id) {
        return { ...e, status: 'Live' as const };
      }
      return e;
    });
    onUpdateEvents(updated);
    setShowGateCheckIn(true);
    setConfirmationMessage('Event Started & Gate Check-In Desk Opened!');
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
  const handleMarkAttendance = (attendeeId: string, status: 'Present' | 'Absent') => {
    if (isEventCompleted || isResultsPublished) return;
    const updated = attendees.map(a => {
      if (a.id === attendeeId) {
        return { 
          ...a, 
          attendanceStatus: status,
          checkedInAt: status === 'Present' ? (a.checkedInAt || new Date().toISOString()) : undefined
        } as Attendee;
      }
      return a;
    });
    onUpdateAttendees(updated);
  };

  // Scoring / Evaluation functions
  const handleCriteriaScoreChange = (critId: string, val: string) => {
    setCriteriaScores(prev => ({ ...prev, [critId]: val }));
    setCriterionError(null);
  };

  const handleSaveEvaluation = (status: 'Completed' | 'In Progress') => {
    if (!selectedAttendeeForJudging) return;

    // Validate inputs
    let total = 0;
    for (const crit of evaluationCriteria) {
      const valStr = criteriaScores[crit.id] || '0';
      const val = parseFloat(valStr);
      if (isNaN(val) || val < 0 || val > crit.maxScore) {
        setCriterionError(`Invalid entry for ${crit.name}. Score must be between 0 and ${crit.maxScore}`);
        return;
      }
      total += val;
    }

    // Success - update participant document
    const updatedAttendees = attendees.map(a => {
      if (a.id === selectedAttendeeForJudging.id) {
        return {
          ...a,
          score: total,
          remarks: judgingRemarks,
          judgingStatus: status,
          criteriaScores: criteriaScores
        } as Attendee;
      }
      return a;
    });

    onUpdateAttendees(updatedAttendees);
    
    // Refresh selection profile
    const refetched = updatedAttendees.find(a => a.id === selectedAttendeeForJudging.id) || null;
    setSelectedAttendeeForJudging(refetched);

    setConfirmationMessage(`Evaluation ${status === 'Completed' ? 'Submitted' : 'Saved as Draft'}`);
    setTimeout(() => setConfirmationMessage(null), 3000);
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
      { rank: 1, participantName: rank1?.name || 'Unassigned', college: rank1?.college || 'N/A', score: String(rank1?.score || 0) },
      { rank: 2, participantName: rank2?.name || 'Unassigned', college: rank2?.college || 'N/A', score: String(rank2?.score || 0) },
      { rank: 3, participantName: rank3?.name || 'Unassigned', college: rank3?.college || 'N/A', score: String(rank3?.score || 0) },
    ];

    // 1. Update event in state
    const updatedEvents = events.map(ev => {
      if (ev.id === myAssignedEvent.id) {
        return {
          ...ev,
          status: 'Completed' as const,
          resultsSubmitted: true,
          resultsPublished: true, // Custom flag to handle locks explicitly
          results: resultsList
        } as SymposiumEvent;
      }
      return ev;
    });
    onUpdateEvents(updatedEvents);

    // 2. Save Result document to Firestore "results" collection
    const resultDoc = {
      resultId: `RES-${myAssignedEvent.id}`,
      eventId: myAssignedEvent.id,
      rank1: rank1 ? `${rank1.name} [ID: ${rank1.id}] (${rank1.college})` : 'Unassigned',
      rank2: rank2 ? `${rank2.name} [ID: ${rank2.id}] (${rank2.college})` : 'Unassigned',
      rank3: rank3 ? `${rank3.name} [ID: ${rank3.id}] (${rank3.college})` : 'Unassigned',
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

  if (false) {
    const presentCount = myAttendees.filter(a => a.attendanceStatus === 'Present').length;
    const absentCount = myAttendees.filter(a => a.attendanceStatus === 'Absent').length;
    const pendingCount = myAttendees.filter(a => !a.attendanceStatus || a.attendanceStatus === 'Pending').length;

    return (
      <div id="gate-check-in-desk" className="min-h-screen bg-background text-on-background flex flex-col font-sans">
        {/* Header */}
        <header className="bg-surface shadow-xs px-6 h-16 border-b border-outline-variant flex justify-between items-center z-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black shadow-xs">
              🚪
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-primary tracking-tight leading-none">
                Gate Entry Check-In Desk
              </h1>
              <p className="text-[10px] text-on-surface-variant font-bold mt-1 uppercase tracking-wider">
                Symposium Track: {myAssignedEvent.title} • {myAssignedEvent.location}
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              setShowGateCheckIn(false);
              setGateSearchQuery('');
            }}
            className="px-4 h-10 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-lg border border-outline-variant/60 transition-all cursor-pointer flex items-center gap-1.5"
          >
            Return to Workspace Hub ✕
          </button>
        </header>

        {/* Workspace Grid */}
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col lg:flex-row gap-6 overflow-hidden h-[calc(100vh-64px)]">
          
          {/* Left Desk Controls */}
          <div className="w-full lg:w-[320px] shrink-0 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="bg-surface border border-outline-variant rounded-2xl p-5 space-y-3.5 shadow-xs">
                <span className="text-[10px] font-black text-primary uppercase tracking-wider block">Coordinator Instructions</span>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Welcome students at the gate. Simply ask for their <strong>Participant ID</strong>, search it on the right list, and click <strong>Check-In</strong> to mark them as Present!
                </p>
                <div className="bg-primary/5 border border-primary/20 p-3 rounded-xl text-[10px] text-primary font-bold leading-relaxed">
                  💡 PRO TIP: Set the auto-batch selector below to automatically put students into Batch 1 or Batch 2 upon check-in!
                </div>
              </div>

              {/* Stats Block */}
              <div className="bg-surface border border-outline-variant rounded-2xl p-4.5 space-y-3 shadow-xs">
                <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider block border-b pb-1.5">Desk Check-in Stats</span>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-on-surface-variant font-semibold">Total Registered</span>
                    <span className="font-mono font-black text-on-surface">{myAttendees.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-600 font-bold">Present (Checked-In)</span>
                    <span className="font-mono font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">{presentCount}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-error font-bold">Absent</span>
                    <span className="font-mono font-black text-error bg-error/10 px-2 py-0.5 rounded">{absentCount}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-amber-600 font-bold">Pending Arrival</span>
                    <span className="font-mono font-black text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded">{pendingCount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick action button */}
            <div className="bg-surface border border-outline-variant rounded-2xl p-4 space-y-2 pb-4 shadow-xs">
              <span className="text-[9px] font-black text-on-surface-variant uppercase block tracking-wider">Desk Actions</span>
              <button
                onClick={() => {
                  const updated = attendees.map(a => {
                    if ((a.registeredEventId === myAssignedEvent.id || a.eventId === myAssignedEvent.id) && (!a.attendanceStatus || a.attendanceStatus === 'Pending')) {
                      return { ...a, attendanceStatus: 'Absent' } as Attendee;
                    }
                    return a;
                  });
                  onUpdateAttendees(updated);
                  setConfirmationMessage('All remaining pending attendees marked Absent');
                  setTimeout(() => setConfirmationMessage(null), 3000);
                }}
                disabled={isEventCompleted || isResultsPublished}
                className="w-full py-2.5 bg-surface hover:bg-surface-container text-on-surface-variant border border-outline-variant/60 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                Mark Pending as Absent
              </button>
            </div>
          </div>

          {/* Right Desk Roster Workspace */}
          <div className="flex-1 bg-surface border border-outline-variant rounded-2xl p-5 flex flex-col h-full overflow-hidden shadow-xs">
            
            {/* Filter & Search Header */}
            <div className="space-y-4 pb-4 border-b border-outline-variant/40">
              <div className="flex flex-col md:flex-row gap-3">
                {/* Search box with autoFocus */}
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-outline absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search by Participant ID, Name, or College... (Press Enter to Check-In)"
                    autoFocus
                    value={gateSearchQuery}
                    onChange={(e) => setGateSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const queryStr = gateSearchQuery.toLowerCase().trim();
                        if (!queryStr) return;
                        
                        const matches = myAttendees.filter(a => {
                          return (
                            (a.participantId || '').toLowerCase() === queryStr ||
                            (a.id || '').toLowerCase() === queryStr ||
                            a.name.toLowerCase().includes(queryStr)
                          );
                        });

                        if (matches.length === 1) {
                          const target = matches[0];
                          let updatedBatchFields = {};
                          if (gateSelectedBatchId !== 'all') {
                            const targetBatch = batches.find(b => b.id === gateSelectedBatchId);
                            if (targetBatch) {
                              updatedBatchFields = {
                                batchId: gateSelectedBatchId,
                                batchName: targetBatch.name
                              };
                            }
                          }

                          const updated = attendees.map(a => {
                            if (a.id === target.id) {
                              return { 
                                ...a, 
                                attendanceStatus: 'Present',
                                checkedInAt: a.checkedInAt || new Date().toISOString(),
                                ...updatedBatchFields
                              } as Attendee;
                            }
                            return a;
                          });
                          onUpdateAttendees(updated);
                          setConfirmationMessage(`Successfully checked in ${target.name} (Attended)!`);
                          setTimeout(() => setConfirmationMessage(null), 3500);
                          setGateSearchQuery('');
                        }
                      }
                    }}
                    className="w-full h-10 pl-9 pr-8 bg-surface-container-low border border-outline rounded-xl text-xs font-semibold focus:border-primary focus:outline-none placeholder:text-outline"
                  />
                  {gateSearchQuery && (
                    <button 
                      onClick={() => setGateSearchQuery('')}
                      className="absolute right-3 top-3 text-xs font-bold text-on-surface-variant hover:text-on-surface"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Status selection filters */}
                <div className="flex gap-1 bg-surface-container-low border border-outline-variant/60 rounded-xl p-1">
                  {(['all', 'checked-in', 'pending'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setGateFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer capitalize ${
                        gateFilter === f 
                          ? 'bg-primary text-on-primary border-primary shadow-xs' 
                          : 'bg-transparent text-on-surface-variant border-transparent hover:bg-surface-container'
                      }`}
                    >
                      {f === 'checked-in' ? 'Present' : f === 'pending' ? 'Not Checked-In' : 'All Roster'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto assignment to Batch setting */}
              <div className="flex flex-wrap items-center gap-3 bg-surface-container-low p-3 rounded-xl border border-outline-variant/40">
                <span className="text-[10px] font-black text-on-surface-variant uppercase">Check-In Auto-Batcher Desk:</span>
                <select
                  value={gateSelectedBatchId}
                  onChange={(e) => setGateSelectedBatchId(e.target.value)}
                  className="h-8 px-2.5 bg-surface border border-outline rounded-lg text-xs text-on-surface font-extrabold"
                >
                  <option value="all">Keep general pool (No auto-assignment)</option>
                  {eventBatches.map(b => (
                    <option key={b.id} value={b.id}>Auto-assign to: {b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scrollable list of attendees */}
            <div className="flex-1 overflow-y-auto space-y-2 mt-4 pr-1">
              {myAttendees
                .filter(a => {
                  if (!gateSearchQuery.trim()) return true;
                  const query = gateSearchQuery.toLowerCase();
                  return (
                    a.name.toLowerCase().includes(query) ||
                    (a.participantId || '').toLowerCase().includes(query) ||
                    (a.id || '').toLowerCase().includes(query) ||
                    a.college.toLowerCase().includes(query)
                  );
                })
                .filter(a => {
                  if (gateFilter === 'checked-in') return a.attendanceStatus === 'Present';
                  if (gateFilter === 'pending') return a.attendanceStatus !== 'Present';
                  return true;
                }).length === 0 ? (
                <div className="p-16 text-center space-y-2">
                  <p className="text-sm font-bold text-on-surface">No participants found</p>
                  <p className="text-xs text-on-surface-variant">Verify spelling or try searching a different query.</p>
                </div>
              ) : (
                myAttendees
                  .filter(a => {
                    if (!gateSearchQuery.trim()) return true;
                    const query = gateSearchQuery.toLowerCase();
                    return (
                      a.name.toLowerCase().includes(query) ||
                      (a.participantId || '').toLowerCase().includes(query) ||
                      (a.id || '').toLowerCase().includes(query) ||
                      a.college.toLowerCase().includes(query)
                    );
                  })
                  .filter(a => {
                    if (gateFilter === 'checked-in') return a.attendanceStatus === 'Present';
                    if (gateFilter === 'pending') return a.attendanceStatus !== 'Present';
                    return true;
                  })
                  .map(att => {
                    const isCheckedIn = att.attendanceStatus === 'Present';

                    return (
                      <div 
                        key={att.id}
                        className={`p-4 border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                          isCheckedIn 
                            ? 'bg-emerald-500/5 border-emerald-500/30' 
                            : 'bg-surface-container-lowest border-outline-variant/35 hover:border-outline-variant'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs font-black text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-lg shrink-0">
                              {att.participantId || att.id}
                            </span>
                            <h3 className="font-black text-sm text-on-surface leading-none truncate">
                              {att.name}
                            </h3>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-xs font-medium text-on-surface-variant">
                            <span>🏫 {att.college}</span>
                            {att.batchName && (
                              <span className="bg-secondary-container text-on-secondary-container px-1.5 py-0.2 rounded font-black uppercase text-[9px] border border-secondary/10">
                                📦 {att.batchName}
                              </span>
                            )}
                            <span className="text-[10px] opacity-75 capitalize">
                              👤 {att.registrationType || att.regType || 'Individual'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Batch selection dropdown */}
                          <select
                            value={att.batchId || ''}
                            onChange={(e) => handleAssignToBatch(att.id, e.target.value)}
                            disabled={isEventCompleted || isResultsPublished}
                            className="h-8 px-2 bg-surface border border-outline rounded-lg text-[10px] font-bold text-on-surface uppercase disabled:opacity-50 cursor-pointer"
                          >
                            <option value="">No Batch</option>
                            {eventBatches.map(b => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>

                          {/* Attended & Not Attended Button Group */}
                          <div className="flex items-center gap-1 bg-surface-container-low border border-outline-variant/60 p-1 rounded-xl">
                            {/* Attended (Present) */}
                            <button
                              onClick={() => {
                                let updatedBatchFields = {};
                                if (gateSelectedBatchId !== 'all') {
                                  const targetBatch = batches.find(b => b.id === gateSelectedBatchId);
                                  if (targetBatch) {
                                    updatedBatchFields = {
                                      batchId: gateSelectedBatchId,
                                      batchName: targetBatch.name
                                    };
                                  }
                                }
                                const updated = attendees.map(a => {
                                  if (a.id === att.id) {
                                    return { 
                                      ...a, 
                                      attendanceStatus: 'Present',
                                      checkedInAt: a.checkedInAt || new Date().toISOString(),
                                      ...updatedBatchFields
                                    } as Attendee;
                                  }
                                  return a;
                                });
                                onUpdateAttendees(updated);
                                setConfirmationMessage(`Successfully checked in ${att.name} (Attended)!`);
                                setTimeout(() => setConfirmationMessage(null), 3000);
                              }}
                              disabled={isEventCompleted || isResultsPublished}
                              className={`h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border transition-all cursor-pointer ${
                                att.attendanceStatus === 'Present'
                                  ? 'bg-emerald-600 text-on-emerald border-emerald-600 shadow-xs'
                                  : 'bg-transparent border-transparent text-on-surface-variant hover:bg-surface-container'
                              } disabled:opacity-50`}
                            >
                              <Check className="w-3 h-3 font-bold" /> Attended
                            </button>

                            {/* Not Attended (Absent) */}
                            <button
                              onClick={() => {
                                const updated = attendees.map(a => {
                                  if (a.id === att.id) {
                                    return { 
                                      ...a, 
                                      attendanceStatus: 'Absent'
                                    } as Attendee;
                                  }
                                  return a;
                                });
                                onUpdateAttendees(updated);
                                setConfirmationMessage(`Successfully marked ${att.name} as Not Attended!`);
                                setTimeout(() => setConfirmationMessage(null), 3000);
                              }}
                              disabled={isEventCompleted || isResultsPublished}
                              className={`h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border transition-all cursor-pointer ${
                                att.attendanceStatus === 'Absent'
                                  ? 'bg-error text-on-error border-error shadow-xs'
                                  : 'bg-transparent border-transparent text-on-surface-variant hover:bg-surface-container'
                              } disabled:opacity-50`}
                            >
                              <X className="w-3 h-3" /> Not Attended
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="host-shell" className="min-h-screen bg-background text-on-background flex flex-col font-sans">
      
      {/* Mobile AppBar header */}
      <header className="bg-surface shadow-xs lg:hidden fixed top-0 w-full z-40 flex justify-between items-center px-4 h-16 border-b border-outline-variant">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="font-extrabold text-sm text-primary tracking-tight leading-none">
            AItheronML Symposium OS
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full uppercase">
            {myAssignedEvent.status}
          </span>
          <button onClick={onLogout} className="p-1.5 text-on-surface-variant hover:text-error">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex pt-16 lg:pt-0 flex-1">
        
        {/* Host Coordinator Sidebar - Strict Menu Layout constraint */}
        <nav className="bg-surface border-r border-outline-variant hidden lg:flex flex-col pt-6 pb-6 h-screen fixed left-0 top-0 w-[280px] z-30 shadow-xs">
          <div className="px-6 mb-6 flex flex-col gap-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black shadow-sm">
                OS
              </div>
              <div>
                <h2 className="font-black text-sm text-primary tracking-tight leading-none">AItheronML</h2>
                <p className="text-[9px] text-on-surface-variant uppercase font-semibold mt-1 tracking-wider">
                  Symposium Host OS
                </p>
              </div>
            </div>
            <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/35 mt-2">
              <span className="text-[10px] text-on-surface-variant font-bold uppercase block tracking-wider">Assigned Coordinator Event</span>
              <span className="text-xs font-bold text-on-surface block mt-0.5 truncate">{myAssignedEvent.title}</span>
            </div>
          </div>

          {/* Navigation Links matching the Host Sidebar requirement */}
          <div className="flex-1 px-3 flex flex-col gap-1">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-full transition-all ${
                activeTab === 'overview' 
                  ? 'bg-secondary-container text-on-secondary-container shadow-xs' 
                  : 'text-on-surface-variant hover:bg-surface-variant/40'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Overview</span>
            </button>

            <button 
              onClick={() => setActiveTab('participants')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-full transition-all ${
                activeTab === 'participants' 
                  ? 'bg-secondary-container text-on-secondary-container shadow-xs' 
                  : 'text-on-surface-variant hover:bg-surface-variant/40'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Participants</span>
            </button>

            <button 
              onClick={() => setActiveTab('batches')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-full transition-all ${
                activeTab === 'batches' 
                  ? 'bg-secondary-container text-on-secondary-container shadow-xs' 
                  : 'text-on-surface-variant hover:bg-surface-variant/40'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span>Batches</span>
            </button>

            <button 
              onClick={() => setActiveTab('attendance')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-full transition-all ${
                activeTab === 'attendance' 
                  ? 'bg-secondary-container text-on-secondary-container shadow-xs' 
                  : 'text-on-surface-variant hover:bg-surface-variant/40'
              }`}
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>Attendance</span>
            </button>

            <button 
              onClick={() => setActiveTab('judging')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-full transition-all ${
                activeTab === 'judging' 
                  ? 'bg-secondary-container text-on-secondary-container shadow-xs' 
                  : 'text-on-surface-variant hover:bg-surface-variant/40'
              }`}
            >
              <ClipboardList className="w-4 h-4 shrink-0" />
              <span>Judging</span>
            </button>

            <button 
              onClick={() => setActiveTab('results')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold rounded-full transition-all ${
                activeTab === 'results' 
                  ? 'bg-secondary-container text-on-secondary-container shadow-xs' 
                  : 'text-on-surface-variant hover:bg-surface-variant/40'
              }`}
            >
              <Award className="w-4 h-4 shrink-0" />
              <span>Results</span>
            </button>

          </div>

          <div className="mt-auto px-3 pt-4 border-t border-outline-variant/60">
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-on-surface-variant rounded-full hover:bg-error/10 hover:text-error transition-all"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Logout Portal</span>
            </button>
          </div>
        </nav>

        {/* Workspace Canvas Container */}
        <main className="flex-1 lg:ml-[280px] pt-4 lg:pt-8 px-4 md:px-8 pb-12 w-full max-w-7xl mx-auto">
          
          {/* Confirmation Message Overlay Toast */}
          <AnimatePresence>
            {confirmationMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-primary text-on-primary font-bold px-4 py-3 rounded-xl shadow-lg border border-primary-fixed mb-6 flex items-center gap-2.5 text-xs text-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{confirmationMessage}</span>
                </div>
                <button onClick={() => setConfirmationMessage(null)} className="hover:opacity-85">✕</button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline-variant/40 pb-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">Event Workspace Hub</h1>
                  <p className="text-xs text-on-surface-variant">Permanent Host Workspace for conducting and coordinating the event.</p>
                </div>
                <div className="flex items-center gap-2 bg-surface border px-4 py-1.5 rounded-full text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-1" />
                  <span>Coordinator: {user.name}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Details Grid Block */}
                <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-2xl p-6 space-y-4 shadow-xs">
                  <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-outline-variant/40">
                    <Info className="w-4 h-4" /> General Symposium Parameters
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase block">Event Name</span>
                      <span className="text-base font-extrabold text-on-surface block leading-tight">{myAssignedEvent.title}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase block">Physical Venue</span>
                      <span className="text-sm font-extrabold text-on-surface flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        {myAssignedEvent.location}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase block">Category / Track</span>
                      <span className="inline-flex h-6 px-3 bg-primary/10 text-primary text-xs font-bold rounded-full items-center">
                        {myAssignedEvent.track}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase block">Current Event Status</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          myAssignedEvent.status === 'Live' ? 'bg-error animate-pulse' : 
                          myAssignedEvent.status === 'Completed' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`} />
                        <span className="text-sm font-extrabold text-on-surface">{myAssignedEvent.status}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase block">Assigned Hosts</span>
                      <span className="text-xs font-semibold text-on-surface block bg-surface-container-low px-2.5 py-1.5 border rounded-lg">
                        🧑‍🏫 {myAssignedEvent.hostName || user.name}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase block">Assigned Judges</span>
                      <span className="text-xs font-semibold text-on-surface block bg-surface-container-low px-2.5 py-1.5 border rounded-lg truncate">
                        ⚖️ {myAssignedEvent.judgeIds?.map(j => j.includes('@') ? j.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : j).join(', ') || 'External Evaluation Panel'}
                      </span>
                    </div>
                  </div>

                  {/* Attendance Stats Cards nested inside */}
                  <div className="pt-4 border-t border-outline-variant/40 mt-6">
                    <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Roster Check-in Summary</h4>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-surface-container-low p-3 rounded-xl border">
                        <span className="text-xs font-bold text-primary block text-2xl">{totalRegistered}</span>
                        <span className="text-[9px] font-bold text-on-surface-variant uppercase">Registered</span>
                      </div>
                      <div className="bg-surface-container-low p-3 rounded-xl border">
                        <span className="text-xs font-bold text-emerald-600 block text-2xl">{totalCheckedIn}</span>
                        <span className="text-[9px] font-bold text-on-surface-variant uppercase">Checked-In</span>
                      </div>
                      <div className="bg-surface-container-low p-3 rounded-xl border">
                        <span className="text-xs font-bold text-amber-600 block text-2xl">{totalPendingAttendance}</span>
                        <span className="text-[9px] font-bold text-on-surface-variant uppercase">Pending</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Operational Controller Panel */}
                <div className="bg-surface border border-outline-variant rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-xs">
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-outline-variant/40">
                      <Settings2 className="w-4 h-4" /> Operational Controls
                    </h3>
                    <p className="text-xs text-on-surface-variant">
                      Coordinating hosts must trigger appropriate lifecycle states as the symposium progresses physically.
                    </p>

                    {isResultsPublished && (
                      <div className="bg-primary/5 border border-primary/15 p-3.5 rounded-xl flex items-start gap-2 text-xs text-primary">
                        <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <span className="font-bold block">Roster Locked</span>
                          <span className="text-[10px] opacity-90 block leading-tight">
                            Event results have been compiled and published. Evaluation scoring is permanently locked. Only Super Admin can unlock.
                          </span>
                        </div>
                      </div>
                    )}

                  </div>

                  <div className="space-y-3">
                    {/* START EVENT Lifecycle switch */}
                    {myAssignedEvent.status === 'Upcoming' && (
                      <button 
                        onClick={handleStartEvent}
                        className="w-full h-12 bg-primary text-on-primary hover:bg-primary/95 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                      >
                        <Play className="w-4 h-4" /> Start Event (Upcoming → Live)
                      </button>
                    )}

                    {/* END EVENT Lifecycle switch */}
                    {myAssignedEvent.status === 'Live' && (
                      <button 
                        onClick={handleEndEvent}
                        className="w-full h-12 bg-error text-on-error hover:opacity-95 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                      >
                        <Check className="w-4 h-4" /> End Event (Live → Completed)
                      </button>
                    )}

                    {myAssignedEvent.status === 'Completed' && !isResultsPublished && (
                      <div className="space-y-3">
                        <div className="bg-amber-100 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 border border-amber-300 p-3 rounded-xl text-center text-xs">
                          <AlertCircle className="w-4 h-4 mx-auto mb-1 text-amber-700" />
                          Event is completed. Attendance/Judging edits are deactivated. Proceed to compiling and publishing the Results tab!
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleResetEvent('Upcoming')}
                            className="py-2.5 px-3 bg-surface border border-outline hover:bg-surface-container text-on-surface font-semibold rounded-lg text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-on-surface-variant" /> Reset to Upcoming
                          </button>
                          <button
                            onClick={() => handleResetEvent('Live')}
                            className="py-2.5 px-3 bg-primary text-on-primary hover:bg-primary/95 font-semibold rounded-lg text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Play className="w-3.5 h-3.5" /> Re-open (Live)
                          </button>
                        </div>
                      </div>
                    )}

                    {isResultsPublished && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/15 border border-emerald-200 text-emerald-700 dark:text-emerald-300 p-3.5 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1.5">
                        <CheckCircle className="w-4 h-4" /> Results Successfully Certified
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* TAB: PARTICIPANTS */}
          {activeTab === 'participants' && (
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/40">
                    <div>
                      <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">Participant Roster</h1>
                      <p className="text-xs text-on-surface-variant">View and manage registrations dedicated explicitly to {myAssignedEvent.title}.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        placeholder="Search Roster..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-10 px-3 bg-surface border border-outline rounded-lg text-xs font-medium w-48 sm:w-60 focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="bg-surface border border-outline-variant rounded-2xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-surface-container border-b border-outline-variant">
                            <th className="p-4 font-bold text-on-surface uppercase">Participant ID</th>
                            <th className="p-4 font-bold text-on-surface uppercase">Name & College</th>
                            <th className="p-4 font-bold text-on-surface uppercase">Team Name</th>
                            <th className="p-4 font-bold text-on-surface uppercase">Attendance</th>
                            <th className="p-4 font-bold text-on-surface uppercase">Judging Status</th>
                            <th className="p-4 font-bold text-on-surface uppercase text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {myAttendees.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.college.toLowerCase().includes(searchQuery.toLowerCase()) || a.id.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-on-surface-variant italic">No matched participants found.</td>
                            </tr>
                          ) : (
                            myAttendees.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.college.toLowerCase().includes(searchQuery.toLowerCase()) || a.id.toLowerCase().includes(searchQuery.toLowerCase())).map(att => (
                              <tr 
                                key={att.id} 
                                className="border-b border-outline-variant/30 hover:bg-surface-container/30 transition-colors"
                              >
                                <td className="p-4 font-mono font-bold text-primary">{att.participantId || att.id}</td>
                                <td className="p-4">
                                  <div className="font-extrabold text-on-surface text-sm">{att.name}</div>
                                  <div className="text-[10px] text-on-surface-variant font-medium">{att.college}</div>
                                </td>
                                <td className="p-4 font-semibold text-on-surface-variant text-sm">
                                  {att.teamName || 'Individual'}
                                </td>
                                <td className="p-4">
                                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                                    att.attendanceStatus === 'Present' ? 'bg-primary/10 text-primary border-primary/20' : 
                                    att.attendanceStatus === 'Absent' ? 'bg-error-container text-on-error-container border-error/20' : 
                                    'bg-surface-variant text-on-surface-variant'
                                  }`}>
                                    {att.attendanceStatus || 'Pending'}
                                  </span>
                                </td>
                                <td className="p-4">
                                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                                    att.judgingStatus === 'Completed' ? 'bg-teal-100 text-teal-800 border-teal-200' : 
                                    att.judgingStatus === 'In Progress' ? 'bg-amber-100 text-amber-800 border-amber-200' : 
                                    'bg-surface-variant text-on-surface-variant'
                                  }`}>
                                    {att.judgingStatus || 'Not Started'}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                    <button 
                                      onClick={() => setSelectedAttendeeForProfile(att)}
                                      className="h-8 px-2.5 border border-outline hover:bg-surface-container-high rounded text-[10px] font-bold transition-all"
                                    >
                                      Details
                                    </button>
                                    
                                    {att.attendanceStatus === 'Present' && !isResultsPublished && !isEventCompleted && (
                                      <button 
                                        onClick={() => {
                                          setSelectedAttendeeForJudging(att);
                                          setActiveTab('judging');
                                        }}
                                        className="h-8 px-2.5 bg-primary text-on-primary hover:opacity-90 rounded text-[10px] font-bold transition-all"
                                      >
                                        Judge
                                      </button>
                                    )}

                                    {!isEventCompleted && !isResultsPublished && att.attendanceStatus !== 'Present' && (
                                      <button 
                                        onClick={() => handleMarkAttendance(att.id, 'Present')}
                                        className="h-8 px-2.5 border border-primary text-primary hover:bg-primary/5 rounded text-[10px] font-bold transition-all"
                                      >
                                        Check In
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* TAB: BATCHES */}
          {activeTab === 'batches' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/40">
                <div>
                  <h1 className="text-xl font-extrabold text-on-surface tracking-tight">Batch Management</h1>
                  <p className="text-xs text-on-surface-variant">Divide participants into rounds or batches, manage statuses, and track attendance.</p>
                </div>
                <button
                  onClick={() => {
                    setIsCreatingBatch(true);
                    setBatchCount(3);
                    setDynamicBatchNames(['Batch 1', 'Batch 2', 'Batch 3']);
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-full text-xs font-bold shadow-md hover:bg-primary/90 transition-all flex items-center gap-1.5 cursor-pointer self-start"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Batch</span>
                </button>
              </div>

              {/* Create Batch Dialog Overlay Inline Card */}
              {isCreatingBatch && (
                <div className="p-5 bg-surface-container border border-outline-variant rounded-2xl max-w-md space-y-4 shadow-md">
                  <h3 className="text-sm font-extrabold text-primary">Create & Distribute Batches</h3>
                  
                  <div className="bg-primary/5 p-3 rounded-xl border border-primary/20 text-xs text-primary leading-normal">
                    💡 All <strong>{myAttendees.length}</strong> participants registered for this event will be automatically divided equally across these batches on a first-come, first-served basis.
                  </div>

                  <form onSubmit={handleCreateBatch} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-1.5">
                        How many batches do you want to create?
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={batchCount}
                        onChange={(e) => {
                          const count = Math.max(1, parseInt(e.target.value) || 1);
                          setBatchCount(count);
                          setDynamicBatchNames(prev => {
                            const next = [...prev];
                            if (next.length < count) {
                              for (let i = next.length; i < count; i++) {
                                next.push(`Batch ${i + 1}`);
                              }
                            } else {
                              next.splice(count);
                            }
                            return next;
                          });
                        }}
                        className="w-full h-10 px-3 bg-surface border border-outline rounded-lg text-xs font-semibold text-on-surface"
                        required
                      />
                    </div>

                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      <label className="block text-[10px] font-bold text-on-surface-variant uppercase">
                        Batch Names
                      </label>
                      {dynamicBatchNames.map((name, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-xs font-bold text-on-surface-variant shrink-0 w-16">
                            Batch {index + 1}:
                          </span>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setDynamicBatchNames(prev => {
                                const next = [...prev];
                                next[index] = val;
                                return next;
                              });
                            }}
                            placeholder={`Batch ${index + 1} Name`}
                            className="flex-1 h-10 px-3 bg-surface border border-outline rounded-lg text-xs text-on-surface"
                            required
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end gap-2 text-xs font-bold pt-2 border-t border-outline-variant/30">
                      <button
                        type="button"
                        onClick={() => setIsCreatingBatch(false)}
                        className="px-4 h-9 border border-outline rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 h-9 bg-primary text-on-primary rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        Create & Divide
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Batches List Panel */}
                <div className="bg-surface border border-outline-variant rounded-2xl p-4 shadow-xs space-y-3">
                  <h3 className="text-xs uppercase font-extrabold text-on-surface-variant border-b border-outline-variant/40 pb-2">
                    Event Batches ({eventBatches.length})
                  </h3>

                  {eventBatches.length === 0 ? (
                    <div className="py-8 text-center text-xs text-on-surface-variant font-medium">
                      No batches created for this event yet. Create a batch to start organizing!
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[450px] overflow-y-auto">
                      {eventBatches.map(b => {
                        const count = attendees.filter(a => a.batchId === b.id).length;
                        const isSelected = selectedBatchId === b.id;
                        return (
                          <div
                            key={b.id}
                            onClick={() => setSelectedBatchId(b.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-secondary-container/50 border-primary' 
                                : 'bg-surface-container-low border-outline-variant hover:bg-surface-container'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              {editingBatchId === b.id ? (
                                <div className="flex-1 flex gap-1 mr-2" onClick={e => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={editingBatchName}
                                    onChange={e => setEditingBatchName(e.target.value)}
                                    className="w-full h-8 px-2 bg-surface border border-outline rounded text-xs"
                                  />
                                  <button
                                    onClick={() => handleRenameBatch(b.id, editingBatchName)}
                                    className="p-1 bg-primary text-white rounded text-xs"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={() => setEditingBatchId(null)}
                                    className="p-1 border border-outline rounded text-xs"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <div className="font-bold text-xs text-on-surface">{b.name}</div>
                              )}

                              <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => {
                                    setEditingBatchId(b.id);
                                    setEditingBatchName(b.name);
                                  }}
                                  className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                                  title="Rename"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBatchClick(b.id)}
                                  className="p-1 text-on-surface-variant hover:text-error transition-colors"
                                  title="Delete Batch"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-outline-variant/30 text-[10px]">
                              <div className="flex items-center gap-1 font-bold text-on-surface-variant">
                                <Users className="w-3.5 h-3.5" />
                                <span>{count} participants</span>
                              </div>
                              <select
                                value={b.status || 'Waiting'}
                                onChange={e => handleUpdateBatchStatus(b.id, e.target.value as any)}
                                onClick={e => e.stopPropagation()}
                                className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase border border-outline ${
                                  b.status === 'Live' 
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                    : b.status === 'Completed'
                                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                                      : 'bg-amber-100 text-amber-800 border-amber-300'
                                }`}
                              >
                                <option value="Waiting">Waiting</option>
                                <option value="Live">Live</option>
                                <option value="Completed">Completed</option>
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Batch Members Panel */}
                <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-2xl p-4 shadow-xs space-y-4">
                  {selectedBatchId ? (() => {
                    const activeBatch = eventBatches.find(b => b.id === selectedBatchId);
                    if (!activeBatch) return <div className="text-xs text-on-surface-variant">Selected batch not found.</div>;
                    const members = attendees.filter(a => a.batchId === selectedBatchId);
                    const unassignedAttendees = attendees.filter(a => (a.registeredEventId === myAssignedEvent.id || a.eventId === myAssignedEvent.id) && !a.batchId);

                    return (
                      <>
                        <div className="flex justify-between items-center border-b border-outline-variant/40 pb-2">
                          <div>
                            <span className="text-[10px] uppercase font-extrabold text-primary block">Active Batch View</span>
                            <h4 className="text-sm font-extrabold text-on-surface">{activeBatch.name}</h4>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-bold border ${
                            activeBatch.status === 'Live' 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                              : activeBatch.status === 'Completed'
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}>
                            {activeBatch.status || 'Waiting'}
                          </span>
                        </div>

                        {/* Assign New Members Inline Form */}
                        {unassignedAttendees.length > 0 && (
                          <div className="p-3 bg-surface-container border border-outline-variant rounded-xl flex flex-col sm:flex-row items-center gap-3">
                            <span className="text-xs font-bold text-on-surface shrink-0">Assign Participant:</span>
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleAssignToBatch(e.target.value, selectedBatchId);
                                  e.target.value = '';
                                }
                              }}
                              className="flex-1 h-9 px-3 bg-surface border border-outline rounded-lg text-xs text-on-surface"
                            >
                              <option value="">Select an unassigned participant...</option>
                              {unassignedAttendees.map(u => (
                                <option key={u.id} value={u.id}>
                                  {u.participantId} - {u.name} ({u.teamName ? `Team: ${u.teamName}` : 'Individual'})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Batch Members List */}
                        <div className="space-y-2">
                          <h5 className="text-xs font-bold text-on-surface-variant">Batch Roster ({members.length})</h5>
                          {members.length === 0 ? (
                            <div className="py-12 border-2 border-dashed border-outline-variant rounded-xl text-center text-xs text-on-surface-variant font-medium">
                              No participants assigned to this batch yet. Assign some above!
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                  <tr className="bg-surface-container border-b border-outline-variant text-on-surface">
                                    <th className="p-3 font-bold">ID</th>
                                    <th className="p-3 font-bold">Name</th>
                                    <th className="p-3 font-bold">College</th>
                                    <th className="p-3 font-bold">Attendance</th>
                                    <th className="p-3 font-bold text-right">Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {members.map(m => (
                                    <tr key={m.id} className="border-b border-outline-variant/30 hover:bg-surface-container/30 transition-colors">
                                      <td className="p-3 font-bold text-primary">{m.participantId || m.id}</td>
                                      <td className="p-3">
                                        <div className="font-bold text-on-surface text-xs">{m.name}</div>
                                        {m.teamName && (
                                          <div className="text-[10px] text-primary font-bold">Team: {m.teamName}</div>
                                        )}
                                      </td>
                                      <td className="p-3 text-on-surface-variant text-[11px] font-medium">{m.college}</td>
                                      <td className="p-3">
                                        <select
                                          value={m.attendanceStatus || 'Pending'}
                                          onChange={(e) => {
                                            const updatedAttendees = attendees.map(att => {
                                              if (att.id === m.id) {
                                                return { ...att, attendanceStatus: e.target.value as any };
                                              }
                                              return att;
                                            });
                                            onUpdateAttendees(updatedAttendees);
                                          }}
                                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                            m.attendanceStatus === 'Present' 
                                              ? 'bg-emerald-100 text-emerald-800' 
                                              : m.attendanceStatus === 'Absent'
                                                ? 'bg-red-100 text-red-800'
                                                : 'bg-amber-100 text-amber-800'
                                          }`}
                                        >
                                          <option value="Pending">Pending</option>
                                          <option value="Present">Present</option>
                                          <option value="Absent">Absent</option>
                                        </select>
                                      </td>
                                      <td className="p-3 text-right">
                                        <button
                                          onClick={() => handleAssignToBatch(m.id, '')}
                                          className="text-[10px] text-error font-bold hover:underline"
                                        >
                                          Unassign
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })() : (
                    <div className="py-24 text-center text-xs text-on-surface-variant font-medium">
                      Select a batch from the left to view participants, track attendance, and assign new registrations.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: ATTENDANCE */}
          {activeTab === 'attendance' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/40">
                <div>
                  <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">Roster Check-in</h1>
                  <p className="text-xs text-on-surface-variant">Digitally evaluate student check-in states to verify physical venue arrivals.</p>
                </div>
                <input 
                  type="text" 
                  placeholder="Quick find attendee..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 px-3 bg-surface border border-outline rounded-lg text-xs font-medium w-48 focus:border-primary focus:outline-none"
                />
              </div>

              {(isEventCompleted || isResultsPublished) && (
                <div className="bg-primary/5 border border-primary/15 p-4 rounded-xl text-xs text-primary flex items-center gap-2">
                  <Lock className="w-4.5 h-4.5 shrink-0" />
                  <span>Attendance edits are locked. This event is Completed / Published.</span>
                </div>
              )}

              {/* Status statistics block */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface-container-low border p-4 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface-variant uppercase">Checked In Present</span>
                  <span className="text-xl font-black text-primary">{totalCheckedIn}</span>
                </div>
                <div className="bg-surface-container-low border p-4 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface-variant uppercase">Absent</span>
                  <span className="text-xl font-black text-error">{myAttendees.filter(a => a.attendanceStatus === 'Absent').length}</span>
                </div>
                <div className="bg-surface-container-low border p-4 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface-variant uppercase">Pending Actions</span>
                  <span className="text-xl font-black text-amber-600">{totalPendingAttendance}</span>
                </div>
              </div>

              <div className="bg-surface rounded-2xl border border-outline-variant p-4 space-y-2 max-h-[500px] overflow-y-auto">
                {myAttendees.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.college.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                  <p className="p-8 text-center text-xs text-on-surface-variant italic">No matched participants found.</p>
                ) : (
                  myAttendees.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.college.toLowerCase().includes(searchQuery.toLowerCase())).map(att => (
                    <div 
                      key={att.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between bg-surface-container-lowest p-3 border border-outline-variant/35 rounded-xl gap-3 hover:border-outline-variant transition-all"
                    >
                      <div>
                        <h3 className="font-extrabold text-sm text-on-surface flex items-center gap-2">
                          {att.name}
                          <span className="font-mono text-[10px] text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">
                            {att.participantId || att.id}
                          </span>
                        </h3>
                        <p className="text-xs text-on-surface-variant font-medium mt-0.5">{att.college} • {att.teamName ? `Team: ${att.teamName}` : 'Individual'}</p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleMarkAttendance(att.id, 'Present')}
                          disabled={isEventCompleted || isResultsPublished}
                          className={`h-9 px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                            att.attendanceStatus === 'Present' 
                              ? 'bg-primary text-on-primary border-primary' 
                              : 'border-outline text-on-surface-variant hover:bg-surface-container'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <Check className="w-3.5 h-3.5" /> Present
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(att.id, 'Absent')}
                          disabled={isEventCompleted || isResultsPublished}
                          className={`h-9 px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                            att.attendanceStatus === 'Absent' 
                              ? 'bg-error-container text-on-error-container border-error/20' 
                              : 'border-outline text-on-surface-variant hover:bg-surface-container'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <X className="w-3.5 h-3.5" /> Absent
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* TAB: JUDGING */}
          {activeTab === 'judging' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              
              <div className="pb-3 border-b border-outline-variant/40 flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">Judging Evaluation Portal</h1>
                  <p className="text-xs text-on-surface-variant">Hosts register offline verbal scores from Judges. Select checked-in participants to evaluate.</p>
                </div>
                
                {/* Expand criteria controls */}
                <button
                  onClick={() => setShowCriteriaConfig(!showCriteriaConfig)}
                  className="px-3 py-1.5 border border-primary text-primary hover:bg-primary/5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>Configure Criteria</span>
                </button>
              </div>

              {/* Collapsable Criteria config - Non Permanent requirement */}
              <AnimatePresence>
                {showCriteriaConfig && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-surface border border-outline-variant p-5 rounded-2xl space-y-4 overflow-hidden"
                  >
                    <div className="border-b pb-2">
                      <h3 className="font-extrabold text-xs text-primary uppercase tracking-wider">Evaluation Parameters Configurator</h3>
                      <p className="text-[10px] text-on-surface-variant">Create and remove metrics. These parameters dynamically generate assessment forms instantly.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Active criteria list */}
                      <div className="md:col-span-2 space-y-2">
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase block">Current Active Criteria</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {evaluationCriteria.map(crit => (
                            <div key={crit.id} className="flex justify-between items-center bg-surface-container-low border px-3 py-2 rounded-xl text-xs">
                              <span className="font-bold text-on-surface">{crit.name} <span className="text-primary font-mono">(Max: {crit.maxScore})</span></span>
                              <button 
                                onClick={() => handleRemoveCriterion(crit.id)}
                                disabled={isResultsPublished || isEventCompleted}
                                className="text-error hover:bg-error/10 p-1 rounded-lg disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Add new criteria form */}
                      <form onSubmit={handleAddCriterion} className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/40 space-y-3">
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase block">Add Custom Metric</span>
                        
                        <div>
                          <label className="text-[10px] font-bold text-on-surface-variant block mb-1">Criterion Name</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Q&A Defense" 
                            required
                            value={newCriterionName}
                            onChange={(e) => setNewCriterionName(e.target.value)}
                            className="w-full h-8 px-2.5 bg-surface border rounded text-xs text-on-surface"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-on-surface-variant block mb-1">Maximum Scale Weight</label>
                          <input 
                            type="number" 
                            min="1" 
                            max="100" 
                            required
                            value={newCriterionMax}
                            onChange={(e) => setNewCriterionMax(e.target.value)}
                            className="w-full h-8 px-2.5 bg-surface border rounded text-xs text-on-surface"
                          />
                        </div>

                        <button 
                          type="submit"
                          disabled={isResultsPublished || isEventCompleted}
                          className="w-full h-9 bg-primary text-on-primary rounded text-xs font-bold hover:opacity-90 disabled:opacity-50"
                        >
                          Insert Metric Parameters
                        </button>
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Status Warning Banners */}
              {!isEventLive && !isEventCompleted && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 text-amber-800 dark:text-amber-200 p-4 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>The event has not been started yet. Please launch the event in the Overview tab to initiate attendee evaluations.</span>
                </div>
              )}

              {(isEventCompleted || isResultsPublished) && (
                <div className="bg-primary/5 border border-primary/15 p-4 rounded-xl text-xs text-primary flex items-center gap-2">
                  <Lock className="w-5 h-5 shrink-0" />
                  <span>Judging edits are disabled. Results are published / completed and compiled standings are locked.</span>
                </div>
              )}

              {/* Main Workspace split columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* LEFT COL: Checked-In Participants list */}
                <div className="bg-surface border border-outline-variant rounded-2xl p-4 space-y-3 flex flex-col h-[600px]">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase block">Select Checked-In Presentee</span>
                    
                    {/* Batch wise selection filter */}
                    <div className="flex flex-col gap-1 pb-1">
                      <label className="text-[9px] font-bold text-primary uppercase">Select Batch</label>
                      <select
                        value={selectedJudgingBatchId}
                        onChange={(e) => setSelectedJudgingBatchId(e.target.value)}
                        className="w-full h-8 px-2 bg-surface border border-outline rounded text-xs text-on-surface font-semibold"
                      >
                        <option value="all">All Batches</option>
                        {eventBatches.map(b => (
                          <option key={b.id} value={b.id}>{b.name} ({b.status || 'Waiting'})</option>
                        ))}
                      </select>
                    </div>

                    {/* Judging status filters */}
                    <div className="flex gap-1">
                      {(['all', 'Not Started', 'In Progress', 'Completed'] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setJudgingFilter(tab)}
                          className={`px-2 py-1 rounded text-[9px] font-bold border capitalize ${
                            judgingFilter === tab 
                              ? 'bg-secondary-container text-on-secondary-container border-secondary/20' 
                              : 'bg-surface text-on-surface-variant'
                          }`}
                        >
                          {tab === 'all' ? 'All Status' : tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Real-time Top 3 Leaderboard Standings Preview */}
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3 space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-on-surface uppercase flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-primary" /> Live Standings (Top 3)
                      </h4>
                      <span className="text-[8px] font-black bg-primary/10 text-primary px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                        Dynamic Ranks
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {(() => {
                        const top3 = myAttendees
                          .filter(a => a.attendanceStatus === 'Present' && a.judgingStatus === 'Completed')
                          .sort((a, b) => (b.score || 0) - (a.score || 0))
                          .slice(0, 3);

                        if (top3.length === 0) {
                          return (
                            <p className="text-[9px] text-on-surface-variant italic text-center py-1">
                              No completed evaluations yet.
                            </p>
                          );
                        }

                        return top3.map((student, idx) => {
                          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
                          const colors = idx === 0 ? 'text-amber-800 dark:text-amber-300 bg-amber-500/10 border-amber-500/20' : 
                                         idx === 1 ? 'text-slate-800 dark:text-slate-300 bg-slate-500/10 border-slate-500/20' : 
                                         'text-amber-700 dark:text-amber-400 bg-amber-700/5 border-amber-700/10';
                          return (
                            <div 
                              key={student.id} 
                              className={`flex justify-between items-center px-2.5 py-1.5 border rounded-xl ${colors} transition-all`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-xs font-bold">{medal}</span>
                                <div className="min-w-0">
                                  <span className="text-[11px] font-black block truncate leading-none">{student.name}</span>
                                  <span className="text-[8px] font-medium opacity-85 block truncate font-mono uppercase">{student.participantId || student.id}</span>
                                </div>
                              </div>
                              <span className="font-mono text-[11px] font-black whitespace-nowrap">
                                {student.score} pts
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Scrollable grid of Presentees */}
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                    {myAttendees.filter(a => a.attendanceStatus === 'Present').length === 0 ? (
                      <p className="text-center text-xs text-on-surface-variant italic py-10 leading-tight">
                        No checked-in participants available. Attendee check-ins must be marked Present in the Attendance tab first.
                      </p>
                    ) : (
                      myAttendees
                        .filter(a => a.attendanceStatus === 'Present')
                        .filter(a => selectedJudgingBatchId === 'all' || a.batchId === selectedJudgingBatchId)
                        .filter(a => judgingFilter === 'all' || (a.judgingStatus || 'Not Started') === judgingFilter)
                        .sort((a, b) => {
                          const timeA = a.checkedInAt || a.createdAt || '';
                          const timeB = b.checkedInAt || b.createdAt || '';
                          return timeA.localeCompare(timeB);
                        })
                        .map(att => (
                          <button
                            key={att.id}
                            onClick={() => setSelectedAttendeeForJudging(att)}
                            className={`w-full text-left p-3 border rounded-xl flex items-start gap-2.5 transition-all ${
                              selectedAttendeeForJudging?.id === att.id 
                                ? 'bg-primary/5 border-primary shadow-xs' 
                                : 'border-outline-variant/40 hover:bg-surface-container-low'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-black text-on-surface block truncate">{att.name}</span>
                              <span className="text-[9px] font-bold text-on-surface-variant uppercase truncate block">{att.college}</span>
                              
                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-mono text-[9px] text-primary">{att.participantId || att.id}</span>
                                <span className={`text-[8px] font-bold uppercase px-1.5 py-0.2 border rounded ${
                                  att.judgingStatus === 'Completed' ? 'bg-teal-50 text-teal-700 border-teal-200' : 
                                  att.judgingStatus === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                  'bg-surface-variant text-on-surface-variant'
                                }`}>
                                  {att.judgingStatus || 'Not Started'}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))
                    )}
                  </div>
                </div>

                {/* RIGHT COL: Evaluation grading sheet form */}
                <div className="md:col-span-2 bg-surface border border-outline-variant rounded-2xl p-6 flex flex-col h-[600px]">
                  {!selectedAttendeeForJudging ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                      <ClipboardList className="w-14 h-14 text-outline" />
                      <div className="max-w-sm">
                        <h3 className="font-extrabold text-sm text-on-surface">No Participant Selected</h3>
                        <p className="text-xs text-on-surface-variant mt-1">
                          Select an checked-in active presentee from the left roster layout to load evaluation parameters and record marks.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full space-y-4">
                      
                      {/* Form Header */}
                      <div className="border-b border-outline-variant/40 pb-3 flex justify-between items-start">
                        <div>
                          <h3 className="text-base font-extrabold text-on-surface flex items-center gap-1.5">
                            Evaluating: {selectedAttendeeForJudging.name}
                          </h3>
                          <p className="text-[10px] text-on-surface-variant font-medium">
                            College: {selectedAttendeeForJudging.college} • ID: {selectedAttendeeForJudging.participantId || selectedAttendeeForJudging.id}
                          </p>
                        </div>
                        <button 
                          onClick={() => setSelectedAttendeeForJudging(null)}
                          className="p-1 rounded-full hover:bg-surface-container"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Criteria entry blocks */}
                      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                        
                        {/* Validation Error banner */}
                        {criterionError && (
                          <div className="p-3 bg-error-container text-on-error-container text-xs font-bold rounded-lg border border-error/20 flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4" />
                            <span>{criterionError}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {evaluationCriteria.map(crit => {
                            const currentVal = criteriaScores[crit.id] || '0';
                            const parsedVal = parseFloat(currentVal);
                            const isErr = isNaN(parsedVal) || parsedVal < 0 || parsedVal > crit.maxScore;

                            return (
                              <div key={crit.id} className="bg-surface-container-low border border-outline-variant/35 p-3 rounded-xl space-y-1.5">
                                <div className="flex justify-between items-center text-xs font-bold text-on-surface-variant">
                                  <span className="text-on-surface">{crit.name}</span>
                                  <span>Max: {crit.maxScore}</span>
                                </div>
                                <input 
                                  type="number" 
                                  min="0" 
                                  max={crit.maxScore}
                                  step="0.5"
                                  disabled={isResultsPublished || isEventCompleted || !isEventLive}
                                  value={currentVal}
                                  onChange={(e) => handleCriteriaScoreChange(crit.id, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSaveEvaluation('Completed');
                                    }
                                  }}
                                  className={`w-full h-10 px-3 bg-surface border rounded-lg text-sm font-semibold text-on-surface ${
                                    isErr ? 'border-error text-error focus:border-error' : 'border-outline focus:border-primary'
                                  }`}
                                />
                              </div>
                            );
                          })}
                        </div>

                        {/* General Remarks block */}
                        <div className="space-y-1.5 mt-2">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase block">Judge Remarks / Evaluation Comments</label>
                          <textarea 
                            rows={3}
                            disabled={isResultsPublished || isEventCompleted || !isEventLive}
                            placeholder="Type assessor feedback comments and verbal judge notations..."
                            value={judgingRemarks}
                            onChange={(e) => setJudgingRemarks(e.target.value)}
                            className="w-full p-3 bg-surface border border-outline rounded-lg text-xs font-medium text-on-surface focus:border-primary focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Form Footer Action panel */}
                      <div className="pt-4 border-t border-outline-variant/45 flex justify-between items-center">
                        <div className="text-xs">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase block leading-none">Calculated Score</span>
                          <span className="text-xl font-black text-primary">
                            {/* Compute dynamic sum */}
                            {evaluationCriteria.reduce((acc, c) => acc + parseFloat(criteriaScores[c.id] || '0'), 0)}
                            <span className="text-xs text-on-surface-variant font-medium"> / {evaluationCriteria.reduce((acc, c) => acc + c.maxScore, 0)}</span>
                          </span>
                        </div>

                        <div className="flex gap-2">
                          {isEventLive && !isResultsPublished && (
                            <>
                              <button
                                onClick={() => handleSaveEvaluation('In Progress')}
                                className="h-10 px-4 border border-outline-variant hover:bg-surface-container rounded-lg text-xs font-bold transition-all"
                              >
                                Save Draft
                              </button>
                              <button
                                onClick={() => handleSaveEvaluation('Completed')}
                                className="h-10 px-4 bg-primary text-on-primary hover:opacity-95 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Submit Evaluation
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}

              {/* Ranks compilation Podium / Batch-wise Standings */}
              {eventBatches.length > 0 ? (
                <div className="space-y-8">
                  {eventBatches.map(batch => {
                    const batchAttendees = myAttendees
                      .filter(a => a.attendanceStatus === 'Present' && a.judgingStatus === 'Completed' && a.batchId === batch.id)
                      .sort((a, b) => (b.score || 0) - (a.score || 0));

                    return (
                      <div key={batch.id} className="bg-surface rounded-2xl border border-outline-variant p-6 space-y-6 shadow-xs">
                        <div className="flex justify-between items-center border-b border-outline-variant/40 pb-3">
                          <div>
                            <h3 className="text-lg font-black text-on-surface flex items-center gap-2">
                              <Award className="w-5 h-5 text-primary" /> {batch.name} Standings
                            </h3>
                            <p className="text-[10px] text-on-surface-variant font-medium">Rankings compiled specifically for {batch.name}.</p>
                          </div>
                          <span className={`text-[10px] font-black px-2.5 py-0.5 border rounded-full uppercase tracking-wider ${
                            batch.status === 'Completed' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                            batch.status === 'Live' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-surface-variant text-on-surface-variant'
                          }`}>
                            {batch.status || 'Waiting'}
                          </span>
                        </div>

                        {/* Batch Podium */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* 1st Place */}
                          <div className="bg-amber-50 dark:bg-amber-950/10 border-2 border-amber-400 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between h-44 shadow-xs">
                            <div className="absolute -right-4 -bottom-4 text-amber-300/30 font-black text-7xl pointer-events-none select-none">1</div>
                            <div>
                              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">🥇 First Place</span>
                              <h4 className="text-lg font-black text-on-surface mt-2 truncate">
                                {batchAttendees[0]?.name || 'Unassigned'}
                              </h4>
                              <p className="text-xs text-on-surface-variant font-medium truncate">
                                {batchAttendees[0]?.college || 'N/A'}
                              </p>
                            </div>
                            <div className="text-xs font-bold mt-4">
                              Score:{' '}
                              <span className="text-lg font-black text-amber-800 dark:text-amber-300">
                                {batchAttendees[0]?.score || 0} pts
                              </span>
                            </div>
                          </div>

                          {/* 2nd Place */}
                          <div className="bg-surface-container border border-outline-variant p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between h-44 shadow-xs">
                            <div className="absolute -right-4 -bottom-4 text-on-surface-variant/10 font-black text-7xl pointer-events-none select-none">2</div>
                            <div>
                              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">🥈 Second Place</span>
                              <h4 className="text-lg font-black text-on-surface mt-2 truncate">
                                {batchAttendees[1]?.name || 'Unassigned'}
                              </h4>
                              <p className="text-xs text-on-surface-variant font-medium truncate">
                                {batchAttendees[1]?.college || 'N/A'}
                              </p>
                            </div>
                            <div className="text-xs font-bold mt-4">
                              Score:{' '}
                              <span className="text-lg font-black text-primary">
                                {batchAttendees[1]?.score || 0} pts
                              </span>
                            </div>
                          </div>

                          {/* 3rd Place */}
                          <div className="bg-amber-900/5 dark:bg-amber-900/10 border border-amber-800/10 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between h-44 shadow-xs">
                            <div className="absolute -right-4 -bottom-4 text-amber-900/10 font-black text-7xl pointer-events-none select-none">3</div>
                            <div>
                              <span className="text-[10px] font-bold text-amber-900/85 dark:text-amber-400 uppercase tracking-wider block">🥉 Third Place</span>
                              <h4 className="text-lg font-black text-on-surface mt-2 truncate">
                                {batchAttendees[2]?.name || 'Unassigned'}
                              </h4>
                              <p className="text-xs text-on-surface-variant font-medium truncate">
                                {batchAttendees[2]?.college || 'N/A'}
                              </p>
                            </div>
                            <div className="text-xs font-bold mt-4">
                              Score:{' '}
                              <span className="text-lg font-black text-primary">
                                {batchAttendees[2]?.score || 0} pts
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Batch Detailed Table */}
                        <div className="bg-surface rounded-2xl border border-outline-variant/60 p-4 shadow-xs space-y-2">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase block">Full Batch Leaderboard</span>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-surface-container border-b">
                                  <th className="p-2.5 font-bold text-on-surface uppercase w-16">Rank</th>
                                  <th className="p-2.5 font-bold text-on-surface uppercase w-28">ID</th>
                                  <th className="p-2.5 font-bold text-on-surface uppercase">Participant</th>
                                  <th className="p-2.5 font-bold text-on-surface uppercase">College</th>
                                  <th className="p-2.5 font-bold text-on-surface uppercase w-28">Total Score</th>
                                  <th className="p-2.5 font-bold text-on-surface uppercase">Judge Remarks</th>
                                </tr>
                              </thead>
                              <tbody>
                                {batchAttendees.length === 0 ? (
                                  <tr>
                                    <td colSpan={6} className="p-4 text-center text-on-surface-variant italic">No evaluated presentees in this batch.</td>
                                  </tr>
                                ) : (
                                  batchAttendees.map((att, idx) => (
                                    <tr key={att.id} className="border-b border-outline-variant/30 hover:bg-surface-container-low transition-all">
                                      <td className="p-2.5 font-bold">
                                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                      </td>
                                      <td className="p-2.5 font-mono font-bold text-primary">{att.participantId || att.id}</td>
                                      <td className="p-2.5 font-extrabold text-on-surface">{att.name}</td>
                                      <td className="p-2.5 text-on-surface-variant font-medium">{att.college}</td>
                                      <td className="p-2.5 font-black text-primary">{att.score || 0}</td>
                                      <td className="p-2.5 text-on-surface-variant italic truncate max-w-xs">{att.remarks || 'No remarks.'}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Unbatched Standings (if any) */}
                  {(() => {
                    const unassignedAttendees = myAttendees
                      .filter(a => a.attendanceStatus === 'Present' && a.judgingStatus === 'Completed' && !a.batchId)
                      .sort((a, b) => (b.score || 0) - (a.score || 0));

                    if (unassignedAttendees.length === 0) return null;

                    return (
                      <div className="bg-surface rounded-2xl border border-outline-variant p-6 space-y-6 shadow-xs">
                        <div className="flex justify-between items-center border-b border-outline-variant/40 pb-3">
                          <div>
                            <h3 className="text-lg font-black text-on-surface flex items-center gap-2">
                              <Award className="w-5 h-5 text-primary" /> Unbatched Participants Standings
                            </h3>
                            <p className="text-[10px] text-on-surface-variant font-medium">Rankings of evaluated participants not assigned to any batch.</p>
                          </div>
                        </div>

                        {/* Unbatched Podium */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* 1st Place */}
                          <div className="bg-amber-50 dark:bg-amber-950/10 border-2 border-amber-400 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between h-44 shadow-xs">
                            <div className="absolute -right-4 -bottom-4 text-amber-300/30 font-black text-7xl pointer-events-none select-none">1</div>
                            <div>
                              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">🥇 First Place</span>
                              <h4 className="text-lg font-black text-on-surface mt-2 truncate">
                                {unassignedAttendees[0]?.name || 'Unassigned'}
                              </h4>
                              <p className="text-xs text-on-surface-variant font-medium truncate">
                                {unassignedAttendees[0]?.college || 'N/A'}
                              </p>
                            </div>
                            <div className="text-xs font-bold mt-4">
                              Score:{' '}
                              <span className="text-lg font-black text-amber-800 dark:text-amber-300">
                                {unassignedAttendees[0]?.score || 0} pts
                              </span>
                            </div>
                          </div>

                          {/* 2nd Place */}
                          <div className="bg-surface-container border border-outline-variant p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between h-44 shadow-xs">
                            <div className="absolute -right-4 -bottom-4 text-on-surface-variant/10 font-black text-7xl pointer-events-none select-none">2</div>
                            <div>
                              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">🥈 Second Place</span>
                              <h4 className="text-lg font-black text-on-surface mt-2 truncate">
                                {unassignedAttendees[1]?.name || 'Unassigned'}
                              </h4>
                              <p className="text-xs text-on-surface-variant font-medium truncate">
                                {unassignedAttendees[1]?.college || 'N/A'}
                              </p>
                            </div>
                            <div className="text-xs font-bold mt-4">
                              Score:{' '}
                              <span className="text-lg font-black text-primary">
                                {unassignedAttendees[1]?.score || 0} pts
                              </span>
                            </div>
                          </div>

                          {/* 3rd Place */}
                          <div className="bg-amber-900/5 dark:bg-amber-900/10 border border-amber-800/10 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between h-44 shadow-xs">
                            <div className="absolute -right-4 -bottom-4 text-amber-900/10 font-black text-7xl pointer-events-none select-none">3</div>
                            <div>
                              <span className="text-[10px] font-bold text-amber-900/85 dark:text-amber-400 uppercase tracking-wider block">🥉 Third Place</span>
                              <h4 className="text-lg font-black text-on-surface mt-2 truncate">
                                {unassignedAttendees[2]?.name || 'Unassigned'}
                              </h4>
                              <p className="text-xs text-on-surface-variant font-medium truncate">
                                {unassignedAttendees[2]?.college || 'N/A'}
                              </p>
                            </div>
                            <div className="text-xs font-bold mt-4">
                              Score:{' '}
                              <span className="text-lg font-black text-primary">
                                {unassignedAttendees[2]?.score || 0} pts
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Unbatched Detailed Table */}
                        <div className="bg-surface rounded-2xl border border-outline-variant/60 p-4 shadow-xs space-y-2">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase block">Full Unbatched Leaderboard</span>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-surface-container border-b">
                                  <th className="p-2.5 font-bold text-on-surface uppercase w-16">Rank</th>
                                  <th className="p-2.5 font-bold text-on-surface uppercase w-28">ID</th>
                                  <th className="p-2.5 font-bold text-on-surface uppercase">Participant</th>
                                  <th className="p-2.5 font-bold text-on-surface uppercase">College</th>
                                  <th className="p-2.5 font-bold text-on-surface uppercase w-28">Total Score</th>
                                  <th className="p-2.5 font-bold text-on-surface uppercase">Judge Remarks</th>
                                </tr>
                              </thead>
                              <tbody>
                                {unassignedAttendees.map((att, idx) => (
                                  <tr key={att.id} className="border-b border-outline-variant/30 hover:bg-surface-container-low transition-all">
                                    <td className="p-2.5 font-bold">
                                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                    </td>
                                    <td className="p-2.5 font-mono font-bold text-primary">{att.participantId || att.id}</td>
                                    <td className="p-2.5 font-extrabold text-on-surface">{att.name}</td>
                                    <td className="p-2.5 text-on-surface-variant font-medium">{att.college}</td>
                                    <td className="p-2.5 font-black text-primary">{att.score || 0}</td>
                                    <td className="p-2.5 text-on-surface-variant italic truncate max-w-xs">{att.remarks || 'No remarks.'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* FIRST PLACE */}
                    <div className="bg-amber-50 dark:bg-amber-950/10 border-2 border-amber-400 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between h-48 shadow-sm">
                      <div className="absolute -right-4 -bottom-4 text-amber-300/30 font-black text-8xl pointer-events-none select-none">1</div>
                      
                      <div>
                        <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">🥇 Grand Winner (Rank 1)</span>
                        <h3 className="text-xl font-black text-on-surface mt-2">
                          {myAttendees.filter(a => a.attendanceStatus === 'Present' && a.judgingStatus === 'Completed').sort((a,b) => (b.score || 0) - (a.score || 0))[0]?.name || 'Unassigned'}
                        </h3>
                        <p className="text-xs text-on-surface-variant font-medium truncate">
                          {myAttendees.filter(a => a.attendanceStatus === 'Present' && a.judgingStatus === 'Completed').sort((a,b) => (b.score || 0) - (a.score || 0))[0]?.college || 'N/A'}
                        </p>
                      </div>

                      <div className="text-xs font-bold mt-4">
                        Score:{' '}
                        <span className="text-lg font-black text-amber-800 dark:text-amber-300">
                          {myAttendees.filter(a => a.attendanceStatus === 'Present' && a.judgingStatus === 'Completed').sort((a,b) => (b.score || 0) - (a.score || 0))[0]?.score || 0}
                        </span>
                      </div>
                    </div>

                    {/* SECOND PLACE */}
                    <div className="bg-surface-container border-2 border-outline p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between h-48 shadow-xs">
                      <div className="absolute -right-4 -bottom-4 text-on-surface-variant/10 font-black text-8xl pointer-events-none select-none">2</div>
                      
                      <div>
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">🥈 Runner Up (Rank 2)</span>
                        <h3 className="text-xl font-black text-on-surface mt-2">
                          {myAttendees.filter(a => a.attendanceStatus === 'Present' && a.judgingStatus === 'Completed').sort((a,b) => (b.score || 0) - (a.score || 0))[1]?.name || 'Unassigned'}
                        </h3>
                        <p className="text-xs text-on-surface-variant font-medium truncate">
                          {myAttendees.filter(a => a.attendanceStatus === 'Present' && a.judgingStatus === 'Completed').sort((a,b) => (b.score || 0) - (a.score || 0))[1]?.college || 'N/A'}
                        </p>
                      </div>

                      <div className="text-xs font-bold mt-4">
                        Score:{' '}
                        <span className="text-lg font-black text-primary">
                          {myAttendees.filter(a => a.attendanceStatus === 'Present' && a.judgingStatus === 'Completed').sort((a,b) => (b.score || 0) - (a.score || 0))[1]?.score || 0}
                        </span>
                      </div>
                    </div>

                    {/* THIRD PLACE */}
                    <div className="bg-amber-900/5 dark:bg-amber-900/10 border border-amber-800/20 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between h-48 shadow-xs">
                      <div className="absolute -right-4 -bottom-4 text-amber-900/10 font-black text-8xl pointer-events-none select-none">3</div>
                      
                      <div>
                        <span className="text-[10px] font-bold text-amber-900/85 dark:text-amber-400 uppercase tracking-wider block">🥉 Second Runner Up (Rank 3)</span>
                        <h3 className="text-xl font-black text-on-surface mt-2">
                          {myAttendees.filter(a => a.attendanceStatus === 'Present' && a.judgingStatus === 'Completed').sort((a,b) => (b.score || 0) - (a.score || 0))[2]?.name || 'Unassigned'}
                        </h3>
                        <p className="text-xs text-on-surface-variant font-medium truncate">
                          {myAttendees.filter(a => a.attendanceStatus === 'Present' && a.judgingStatus === 'Completed').sort((a,b) => (b.score || 0) - (a.score || 0))[2]?.college || 'N/A'}
                        </p>
                      </div>

                      <div className="text-xs font-bold mt-4">
                        Score:{' '}
                        <span className="text-lg font-black text-primary">
                          {myAttendees.filter(a => a.attendanceStatus === 'Present' && a.judgingStatus === 'Completed').sort((a,b) => (b.score || 0) - (a.score || 0))[2]?.score || 0}
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Comprehensive Leaderboard Score list */}
                  <div className="bg-surface rounded-2xl border border-outline-variant p-5 shadow-xs space-y-4">
                    <div className="border-b pb-2">
                      <h3 className="font-extrabold text-xs text-primary uppercase tracking-wider">Comprehensive Score Registry</h3>
                      <p className="text-[10px] text-on-surface-variant">Ranks ordered dynamically by total calculated assessor score metrics.</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-surface-container border-b">
                            <th className="p-3 font-bold text-on-surface uppercase">Rank</th>
                            <th className="p-3 font-bold text-on-surface uppercase">ID</th>
                            <th className="p-3 font-bold text-on-surface uppercase">Participant</th>
                            <th className="p-3 font-bold text-on-surface uppercase">College</th>
                            <th className="p-3 font-bold text-on-surface uppercase">Total Score</th>
                            <th className="p-3 font-bold text-on-surface uppercase">Judge Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {myAttendees.filter(a => a.attendanceStatus === 'Present' && a.judgingStatus === 'Completed').length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-on-surface-variant italic">No evaluated presentees recorded yet.</td>
                            </tr>
                          ) : (
                            myAttendees
                              .filter(a => a.attendanceStatus === 'Present' && a.judgingStatus === 'Completed')
                              .sort((a, b) => (b.score || 0) - (a.score || 0))
                              .map((att, idx) => (
                                <tr key={att.id} className="border-b border-outline-variant/30 hover:bg-surface-container-low transition-all">
                                  <td className="p-3 font-bold">
                                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                  </td>
                                  <td className="p-3 font-mono font-bold text-primary">{att.participantId || att.id}</td>
                                  <td className="p-3 font-extrabold text-on-surface text-sm">{att.name}</td>
                                  <td className="p-3 text-on-surface-variant font-medium">{att.college}</td>
                                  <td className="p-3 font-black text-primary text-sm">{att.score || 0}</td>
                                  <td className="p-3 text-on-surface-variant italic truncate max-w-xs">{att.remarks || 'No assessor feedback remarks recorded.'}</td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

        </main>
      </div>

    </div>
  );
}
