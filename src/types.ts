export type TrackType = 'Technical' | 'Non-Technical';
export type EventStatus = 'Live' | 'Upcoming' | 'Completed';

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
  'posterpresentation@aitheronml.in': 'poster_presentation',
  'vibecoding@aitheronml.in': 'vibe_coding',
  'projectexpo@aitheronml.in': 'project_expo',
  'photography@aitheronml.in': 'photography',
  'treasurehunt@aitheronml.in': 'treasure_hunt',
  'freefire@aitheronml.in': 'free_fire',
  'dumbcharades@aitheronml.in': 'dumb_charades',
};

export const MAP_EMAIL_TO_NAME: Record<string, string> = {
  'paperpresentation@aitheronml.in': 'Paper Presentation Host',
  'posterpresentation@aitheronml.in': 'Poster Presentation Host',
  'vibecoding@aitheronml.in': 'White Coding Host',
  'projectexpo@aitheronml.in': 'Project Expo Host',
  'photography@aitheronml.in': 'Photography Host',
  'treasurehunt@aitheronml.in': 'Treasure Hunt Host',
  'freefire@aitheronml.in': 'Free Fire Host',
  'dumbcharades@aitheronml.in': 'Dumb Charades Host',
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
  else if (username.startsWith('poster')) normUsername = 'posterpresentation';
  else if (username.startsWith('vibe')) normUsername = 'vibecoding';
  else if (username.startsWith('project')) normUsername = 'projectexpo';
  else if (username.startsWith('photograph')) normUsername = 'photography';
  else if (username.startsWith('treasure')) normUsername = 'treasurehunt';
  else if (username.startsWith('free')) normUsername = 'freefire';
  else if (username.startsWith('dumb')) normUsername = 'dumbcharades';
  else if (username.startsWith('registration')) normUsername = 'registration';
  else if (username.startsWith('superadmin')) return 'superadmin@gmail.com';

  const knownUsernames = [
    'paperpresentation',
    'posterpresentation',
    'vibecoding',
    'projectexpo',
    'photography',
    'treasurehunt',
    'freefire',
    'dumbcharades',
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

