export type TrackType = 'Technical' | 'Non-Technical';
export type EventStatus = 'Live' | 'Upcoming' | 'Completed' | 'Paused';

export interface ParticipantResult {
  rank: number;
  participantName: string;
  college: string;
  score: string;
}

// Replaces/aliased with SymposiumEvent to keep UI working while integrating requested fields
export interface SymposiumEvent {
  id: string; // compatibility
  eventId: string; // requested
  title: string; // compatibility
  eventName: string; // requested
  track: TrackType; // compatibility
  category: TrackType; // requested
  session: string;
  subtitle: string;
  registeredCount: number;
  checkedInCount?: number; // requested
  status: EventStatus;
  hostEmail: string;
  hostName: string;
  icon: string; // Key of Lucide icons
  startsIn?: string; // e.g. "Starts in 2h"
  location: string; // compatibility
  venue: string; // requested
  resultsSubmitted: boolean;
  results?: ParticipantResult[];
  
  // Extra requested fields for EVENTS COLLECTION
  eventDate?: string;
  registrationOpen?: boolean;
  registrationClose?: boolean;
  hostIds?: string[];
  judgeIds?: string[];
  minimumTeamSize?: number;
  maximumTeamSize?: number;
  winnerIds?: string[];
}

// Replaces/aliased with Attendee
export interface Attendee {
  id: string; // compatibility
  participantId: string; // requested
  name: string;
  email: string;
  phone: string;
  college: string;
  registeredEventId: string; // compatibility
  eventId: string; // requested
  registeredEventTitle: string;
  attendanceStatus: 'Present' | 'Absent' | 'Pending';
  score?: number;
  branch?: string;
  year?: string;
  regType?: 'individual' | 'team';
  registrationType?: 'individual' | 'team'; // requested
  teamName?: string;
  teamId?: string; // requested
  memberCount?: number;
  registrationDate?: string;
  createdAt?: string; // requested
  updatedAt?: string; // requested
  accessLevel?: string;
  secureToken?: string;
  qrCode?: string; // requested
  judgingStatus?: 'Not Started' | 'In Progress' | 'Completed';
  remarks?: string;
  criteriaScores?: Record<string, string>;
  
  // Operational Improvements Fields
  batchId?: string;
  batchName?: string;
  paymentStatus?: 'Pending' | 'Paid' | 'Waived';
  checkedInAt?: string;
  checked_in?: boolean;
  checked_in_at?: string | null;
  lunch_status?: string | null;
  lunch_redeemed_at?: string | null;
  teamMembers?: Array<{
    name: string;
    phone: string;
    email: string;
    participantId: string;
  }>;
}

export interface Batch {
  id: string;
  eventId: string;
  name: string;
  status: 'Waiting' | 'Live' | 'Completed';
  createdAt: string;
}

export interface Team {
  teamId: string;
  teamName: string;
  leaderId: string;
  memberIds: string[];
  eventId: string;
  createdAt: string;
}

export interface Host {
  hostId: string;
  name: string;
  email: string;
  phone: string;
  assignedEvents: string[];
  status: 'Active' | 'Inactive';
}

export interface Judge {
  judgeId: string;
  name: string;
  email: string;
  phone: string;
  assignedEvents: string[];
  status: 'Active' | 'Inactive';
}

export interface Result {
  resultId: string;
  eventId: string;
  rank1: string;
  rank2: string;
  rank3: string;
  judgeRemarks: string;
  published: boolean;
  publishedAt: string;
}

export interface UserSession {
  email: string;
  role: 'superadmin' | 'host' | 'judge' | 'registration';
  name: string;
  assignedEventId?: string;
}

export const MAP_EMAIL_TO_EVENT_ID: Record<string, string> = {
  'paperpresentation@aitheronml.in': 'paper_presentation',
  'projectexpo@aitheronml.in': 'project_expo',
  'aiagent@aitheronml.in': 'ai_agent_challenge',
  'aivideo@aitheronml.in': 'ai_video_generation',
  'dsa@aitheronml.in': 'dsa_challenge',
  'vibecoding@aitheronml.in': 'vibe_coding',
  'techquiz@aitheronml.in': 'technical_quiz',
  'photography@aitheronml.in': 'photography',
  'logo@aitheronml.in': 'logo_identification',
  'treasurehunt@aitheronml.in': 'treasure_hunt',
  'freefire@aitheronml.in': 'freefire',
};

export const MAP_EMAIL_TO_NAME: Record<string, string> = {
  'paperpresentation@aitheronml.in': 'Gauthami & Charan.P',
  'projectexpo@aitheronml.in': 'Mounika & B Pavani',
  'aiagent@aitheronml.in': 'Tharun K & O S Praveen',
  'aivideo@aitheronml.in': 'Vignati & Akshaya',
  'dsa@aitheronml.in': 'C.Raghavendra & Kesiya',
  'vibecoding@aitheronml.in': 'Deekshitha & B S Nandini',
  'techquiz@aitheronml.in': 'Charan Teja & Akash',
  'photography@aitheronml.in': 'Arif & Nikitha',
  'logo@aitheronml.in': 'Pranav & Zaara',
  'treasurehunt@aitheronml.in': 'Vivek & Indumathi',
  'freefire@aitheronml.in': 'Thoufiq & Sarkesh',
};

export function normalizeEmail(emailStr: string): string {
  if (!emailStr) return '';
  let clean = emailStr.replace(/\s+/g, '').toLowerCase();
  clean = clean.replace(/dotin$/i, '.in').replace(/dotcom$/i, '.com');
  
  const [username, domain] = clean.split('@');
  if (!username) return clean;

  // Let's normalize common username typos or spaces that were stripped
  let normUsername = username;
  if (username.startsWith('paper')) normUsername = 'paperpresentation';
  else if (username.startsWith('project')) normUsername = 'projectexpo';
  else if (username.startsWith('aiagent') || username.startsWith('agent')) normUsername = 'aiagent';
  else if (username.startsWith('aivideo') || username.startsWith('video')) normUsername = 'aivideo';
  else if (username.startsWith('dsa')) normUsername = 'dsa';
  else if (username.startsWith('vibe')) normUsername = 'vibecoding';
  else if (username.startsWith('techquiz') || username.startsWith('quiz')) normUsername = 'techquiz';
  else if (username.startsWith('photograph')) normUsername = 'photography';
  else if (username.startsWith('logo')) normUsername = 'logo';
  else if (username.startsWith('treasure')) normUsername = 'treasurehunt';
  else if (username.startsWith('free')) normUsername = 'freefire';
  else if (username.startsWith('registration')) normUsername = 'registration';
  else if (username.startsWith('superadmin')) return 'superadmin@gmail.com';

  const knownUsernames = [
    'paperpresentation',
    'projectexpo',
    'aiagent',
    'aivideo',
    'dsa',
    'vibecoding',
    'techquiz',
    'photography',
    'logo',
    'treasurehunt',
    'freefire',
    'registration'
  ];

  if (knownUsernames.includes(normUsername)) {
    return `${normUsername}@aitheronml.in`;
  }

  // If not a known username, but domain is a typo of aitheronml.in
  if (domain && (domain.includes('atrium') || domain.includes('aith') || domain.includes('atriumml') || domain.includes('aitheron'))) {
    return `${normUsername}@aitheronml.in`;
  }

  return clean;
}

