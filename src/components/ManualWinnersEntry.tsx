import React, { useState, useEffect } from 'react';
import { SymposiumEvent, Attendee, Result } from '../types';
import { saveResult } from '../firebaseSync';
import { Trophy, Search, CheckCircle, XCircle, Medal, AlertCircle } from 'lucide-react';

interface ManualWinnersEntryProps {
  event: SymposiumEvent;
  attendees: Attendee[];
  onClose: () => void;
}

export default function ManualWinnersEntry({ event, attendees, onClose }: ManualWinnersEntryProps) {
  const [rank1Id, setRank1Id] = useState('');
  const [rank2Id, setRank2Id] = useState('');
  const [rank3Id, setRank3Id] = useState('');

  const [matchedRank1, setMatchedRank1] = useState<Attendee | null>(null);
  const [matchedRank2, setMatchedRank2] = useState<Attendee | null>(null);
  const [matchedRank3, setMatchedRank3] = useState<Attendee | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Helper to extract Participant ID from scanned/typed data
  function parseParticipantQR(text: string): { id: string } {
    if (!text) return { id: '' };
    const cleanText = text.trim();
    const idMatch = cleanText.match(/CSM-\d{6}(?:-SPOT)?/i);
    return {
      id: idMatch ? idMatch[0].toUpperCase() : cleanText.toUpperCase()
    };
  }

  const findAttendee = (input: string): Attendee | null => {
    const parsedId = parseParticipantQR(input).id;
    if (!parsedId) return null;
    return attendees.find(a => a.participantId === parsedId || a.id === parsedId) || null;
  };

  useEffect(() => {
    setMatchedRank1(findAttendee(rank1Id));
  }, [rank1Id, attendees]);

  useEffect(() => {
    setMatchedRank2(findAttendee(rank2Id));
  }, [rank2Id, attendees]);

  useEffect(() => {
    setMatchedRank3(findAttendee(rank3Id));
  }, [rank3Id, attendees]);

  const handlePublish = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    
    if (!matchedRank1 && !matchedRank2 && !matchedRank3) {
      setErrorMsg("Please enter at least one valid winner to publish results.");
      return;
    }

    setIsSubmitting(true);
    try {
      const resultData: Result = {
        resultId: `res_${event.id}`,
        eventId: event.id,
        rank1: matchedRank1?.participantId || matchedRank1?.id || '',
        rank2: matchedRank2?.participantId || matchedRank2?.id || '',
        rank3: matchedRank3?.participantId || matchedRank3?.id || '',
        judgeRemarks: 'Declared manually by coordinator',
        published: true,
        publishedAt: new Date().toISOString()
      };

      await saveResult(resultData);
      setSuccessMsg(`Winners for ${event.title} have been published successfully!`);
      
      // Optional: automatically close after 3 seconds on success
      setTimeout(() => {
        if (onClose) onClose();
      }, 3000);
      
    } catch (err: any) {
      console.error("Failed to publish winners", err);
      setErrorMsg(err.message || "Failed to publish winners. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRankInput = (
    label: string, 
    value: string, 
    onChange: (val: string) => void, 
    matched: Attendee | null, 
    medalColor: string
  ) => (
    <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/60">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-xl text-white shadow-sm flex items-center justify-center ${medalColor}`}>
          <Medal className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-black text-on-surface uppercase tracking-wide">{label}</h3>
          <p className="text-[10px] text-on-surface-variant font-semibold">Enter Participant ID</p>
        </div>
      </div>
      
      <div className="relative mb-3">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. CSM-000001"
          className="w-full h-12 pl-11 pr-4 rounded-xl border border-outline bg-surface text-on-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-mono tracking-wide"
        />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/75">
          <Search className="w-4 h-4" />
        </div>
      </div>

      {value.length > 2 && (
        <div className="mt-3">
          {matched ? (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-primary uppercase tracking-wider">{matched.name}</p>
                <p className="text-[10px] text-on-surface-variant mt-0.5">{matched.college} • {matched.phone}</p>
              </div>
              <CheckCircle className="text-primary w-5 h-5 shrink-0" />
            </div>
          ) : (
            <div className="bg-error-container/30 border border-error/30 rounded-xl p-3 flex items-center gap-2">
              <XCircle className="text-error w-4 h-4 shrink-0" />
              <p className="text-xs font-bold text-error">Participant not found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 animate-fade-in">
      <div className="bg-surface rounded-3xl border border-outline-variant shadow-lg overflow-hidden">
        
        {/* Header */}
        <div className="bg-primary/5 border-b border-outline-variant/50 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary text-on-primary rounded-2xl shadow-md">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-on-surface tracking-tight">Declare Winners</h2>
              <p className="text-xs text-on-surface-variant font-semibold mt-1">
                Manually assign winners for <span className="text-primary">{event.title}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors cursor-pointer"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6">
          {errorMsg && (
            <div className="bg-error-container/30 border border-error/40 text-error p-4 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold">{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 p-4 rounded-2xl flex items-start gap-3">
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold">{successMsg}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderRankInput('1st Place', rank1Id, setRank1Id, matchedRank1, 'bg-amber-400')}
            {renderRankInput('2nd Place', rank2Id, setRank2Id, matchedRank2, 'bg-slate-400')}
            {renderRankInput('3rd Place', rank3Id, setRank3Id, matchedRank3, 'bg-amber-700')}
          </div>

          <div className="pt-6 border-t border-outline-variant/40 flex justify-end">
            <button
              onClick={handlePublish}
              disabled={isSubmitting || (!matchedRank1 && !matchedRank2 && !matchedRank3)}
              className="bg-primary text-on-primary h-12 px-8 rounded-xl font-black uppercase tracking-wider text-xs shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                'Publishing...'
              ) : (
                <>
                  <Trophy className="w-4 h-4" /> Publish Results
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
