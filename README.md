# AItheronML Symposium Management System (Symposium OS)
### Kuppam Engineering College

This technical document outlines the architecture, database schema, workflow, and user role hierarchy of the AItheronML Symposium Management System (Symposium OS). Developed specifically for Kuppam Engineering College, this full-stack web application is designed to coordinate, register, track, and manage technical and non-technical symposium events.

---

## 1. System Overview

The application is structured to facilitate end-to-end symposium operations. By utilizing Google Firestore as the primary database alongside local state storage for offline fallback capability, the system ensures seamless check-in, real-time synchronization, and robust performance under varying network conditions.

Key system attributes:
*   **Target Institution:** Kuppam Engineering College.
*   **Scope:** Academic Symposium Management (AItheronML).
*   **Database Integration:** Google Firestore with automatic offline synchronization.
*   **Identity System:** Human-readable participant identifier keys (format: `SYM-XXXXXX`).

---

## 2. Technical Workflow

The system employs a sequential workflow spanning public registration to final result publication and certification.

```
Participant
     ↓
Registration (Public / Spot Registration)
     ↓
Firestore (Primary Cloud Storage & Offline Local Queue)
     ↓
Admin / Host Verification (QR Code Scanning & Access Pass Validation)
     ↓
Attendance Logging (Real-time Checked In / Present status tracking)
     ↓
Judge Evaluation (Scoring & Feedback input)
     ↓
Results Compilation (First, Second, and Third Rank designation)
     ↓
Results Publication & Certification
```

---

## 3. User Roles & Permission Hierarchy

The system enforces a role-based access control architecture to segregate administrative, logistical, and evaluation responsibilities.

| User Role | Permissions Description |
| :--- | :--- |
| **Super Admin** | Full read and write access. Centrally manages all technical/non-technical events, registrants, hosts, judges, and system-wide configurations. |
| **Host (Coordinators)** | Restricted write access. Manages assigned events only, verifies attendance, monitors checked-in statistics, and inputs event results. |
| **Judge** | Restricted read/write access. Views assigned participants and evaluates performance for assigned events. Inputs rankings, scores, and remarks. |
| **Participant** | Read-only access to own registration profile, registered events list, and generated QR access pass. |

---

## 4. Database Architecture (Google Firestore)

The application models its data using seven collection structures.

### 4.1. `users` Collection
Stores user profiles and authorization roles.
*   `email` (string) - Unique identifier (Document ID).
*   `name` (string) - Display name.
*   `role` (string) - Authorization level (`superadmin`, `host`, `judge`).

### 4.2. `participants` Collection
Maintains registration records and real-time attendance logs.
*   `participantId` (string) - Format: `SYM-XXXXXX`.
*   `name` (string) - Participant full name.
*   `college` (string) - Academic institution.
*   `branch` (string) - Engineering branch (e.g., CSE, ECE).
*   `year` (string) - Year of study.
*   `phone` (string) - Contact number.
*   `email` (string) - Contact email address.
*   `eventId` (string) - Registered event reference ID.
*   `teamId` (string, optional) - Assigned team reference ID.
*   `registrationType` (string) - Individual or Team registration.
*   `attendanceStatus` (string) - Pending, Present, or Absent.
*   `qrCode` (string) - URL reference or encoded identifier data.
*   `createdAt` (string) - Timestamp of registration.
*   `updatedAt` (string) - Timestamp of last modification.

### 4.3. `events` Collection
Defines symposium tracks and participant capacities.
*   `eventId` (string) - Reference ID.
*   `eventName` (string) - Title of the technical or non-technical event.
*   `category` (string) - Classification (`Technical` or `Non-Technical`).
*   `venue` (string) - Physical location (e.g., Seminar Hall, Lab 3).
*   `eventDate` (string) - Slated date/time.
*   `status` (string) - Live, Upcoming, or Completed.
*   `registrationOpen` (boolean) - Switch for registration status.
*   `registrationClose` (boolean) - Switch for registration status.
*   `hostIds` (array of strings) - References to assigned Hosts.
*   `judgeIds` (array of strings) - References to assigned Judges.
*   `minimumTeamSize` (number) - Minimum allowed members per team.
*   `maximumTeamSize` (number) - Maximum allowed members per team.
*   `registeredCount` (number) - Total registered participants.
*   `checkedInCount` (number) - Verified present participants.
*   `winnerIds` (array of strings) - IDs of winning participants/teams.

### 4.4. `teams` Collection
Saves collaborative team structures.
*   `teamId` (string) - Unique identifier.
*   `teamName` (string) - Name of the registered team.
*   `leaderId` (string) - Participant ID of the team leader.
*   `memberIds` (array of strings) - Participant IDs of all registered team members.
*   `eventId` (string) - Reference to registered event.
*   `createdAt` (string) - Timestamp of team creation.

### 4.5. `hosts` Collection
Details assigned event managers.
*   `hostId` (string) - Unique ID.
*   `name` (string) - Coordinator name.
*   `email` (string) - Coordinator email.
*   `phone` (string) - Contact number.
*   `assignedEvents` (array of strings) - Assigned Event IDs.
*   `status` (string) - Active or Inactive.

### 4.6. `judges` Collection
Details evaluation panels.
*   `judgeId` (string) - Unique ID.
*   `name` (string) - Judge name.
*   `email` (string) - Judge email.
*   `phone` (string) - Contact number.
*   `assignedEvents` (array of strings) - Assigned Event IDs.
*   `status` (string) - Active or Inactive.

### 4.7. `results` Collection
Records evaluation scores and final winner certificates.
*   `resultId` (string) - Unique ID.
*   `eventId` (string) - Reference to evaluated event.
*   `rank1` (string) - Reference to First Place winner (Participant ID / Team Name).
*   `rank2` (string) - Reference to Second Place winner (Participant ID / Team Name).
*   `rank3` (string) - Reference to Third Place winner (Participant ID / Team Name).
*   `judgeRemarks` (string) - Comments and scoring justifications.
*   `published` (boolean) - Flag designating results visibility.
*   `publishedAt` (string) - Timestamp of publication.

---

## 5. Event Directory

The application maintains the official schedule and directories for the authorized Kuppam Engineering College events:

### Technical Events
1.  **Paper Presentation:** Academic paper reading and review sessions.
2.  **Poster Presentation:** Visual technical poster evaluations.
3.  **White Coding:** Algorithms and logic assessment on empty editors/boards.
4.  **Project Expo:** Prototype exhibitions and technical demo evaluations.

### Non-Technical Events
1.  **Photography:** High-contrast environmental and event photo competition.
2.  **Treasure Hunt:** Analytical clue-solving and campus navigation event.
3.  **Free Fire:** Tactical gaming assessment.
4.  **Dumb Charades:** Performance-based team interpretation.

---

## 6. Functional Architecture & Components

*   **Public Registration:** Simple interface allowing individual or team registrations. In team registrations, only the *Team Name* is requested during public entry; team members can be updated later by administrators/volunteers.
*   **Participant Profile Canvas:** Accessible via QR scan or search lookup. Displays the participant's ID, attendance status, registration date, and team information. Includes a custom print layout to output high-resolution QR codes to paper media.
*   **Registration Success Screen:** Displays the QR code and registered event details upon successful entry with download-as-image capabilities.
*   **Administrative Monitor:** Consolidates cross-event analytics, real-time check-in counts, and registrations. Provides a table view with a multi-criteria filter (All, Present, Absent, Checked In).
*   **Offline Synchronization Layer:** Tracks connection status and queues write/delete requests locally during dropouts, applying them to the remote Firestore server immediately upon recovery.
