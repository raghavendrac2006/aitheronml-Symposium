# AitheronML Symposium Management System

A comprehensive, full-stack event management and registration system built for the AitheronML Symposium. This platform handles attendee registrations, role-based dashboards, QR code ticketing, and live event check-ins.

## ✨ Key Features

### 👥 Role-Based Access Control
- **Super Admin**: Full oversight of the symposium. Can view all registrations, track payments, manually add participants, and monitor overall event metrics.
- **Registration Team**: Dedicated portal for handling on-the-spot registrations and payment verification.
- **Event Hosts**: Specialized dashboards for individual event coordinators (e.g., Paper Presentation, Hackathons) to manage their specific participants and scan tickets.

### 📝 Seamless Public Registration
- Modern, responsive registration form for participants.
- Integrated UPI payment flow with automated QR code generation based on the required fee (individual vs. team pricing).
- Payment reference number tracking for manual verification.

### 🎫 QR Code Ticketing & Check-in
- Auto-generates a unique QR Code pass for every successful registration.
- Event Hosts feature a built-in **Live QR Scanner** in their dashboards to instantly verify tickets and check participants into their specific events.

### ⚡ Tech Stack
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS, Lucide React (Icons), Framer Motion (Animations)
- **Backend/Database**: Firebase (Auth & Firestore)
- **Testing**: Playwright (for load testing and E2E flows)

---

## 🚀 Getting Started

If you want to clone and use this repository for your own event, you will need to connect it to your own Firebase project.

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/raghavendrac2006/aitheronml-Symposium.git
cd aitheronml-Symposium
npm install
```

### 3. Firebase Setup
You must create a new Firebase project to act as the backend for this application.

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. **Enable Authentication**: Go to Build > Authentication, and enable the **Email/Password** sign-in method.
3. **Enable Firestore**: Go to Build > Firestore Database, and create a database. 
   - Under the "Rules" tab, you can start in test mode, but ensure you update them to restrict write access to authenticated users later.
4. **Register Web App**: Go to Project Overview > Project Settings > General, and scroll down to "Your apps". Click the Web (</>) icon to register a new web app.

### 4. Environment Configuration
1. In the root directory of the project, copy `.env.example` to a new file named `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open your new `.env` file and fill in the values provided by Firebase when you registered your web app in the previous step:
   ```env
   VITE_FIREBASE_API_KEY="your-firebase-api-key"
   VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
   VITE_FIREBASE_PROJECT_ID="your-project-id"
   VITE_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
   VITE_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
   VITE_FIREBASE_APP_ID="your-firebase-app-id"
   ```

### 5. Start the Development Server
Once configured, you can start the local Vite server:
```bash
npm run dev
```
Navigate to `http://localhost:5173` to view the application.

---

## 🛡️ Default Administrator Accounts
Because the app relies on Firebase Auth for role management, you will need to manually create the initial users in your Firebase Authentication console using these specific emails to gain dashboard access:

- **Super Admin**: `superadmin@gmail.com`
- **Registration Desk**: `registration@aitheronml.in`
- **Event Hosts**: (e.g., `paperpresentation@aitheronml.in`, `dsa@aitheronml.in`) — *See `src/types.ts` and `src/initialData.ts` for the full list of mapped host emails.*

*Note: You can set the passwords for these accounts to whatever you like during creation in the Firebase console.*
