import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { MAP_EMAIL_TO_EVENT_ID, MAP_EMAIL_TO_NAME, normalizeEmail } from '../types';

interface LoginScreenProps {
  onLogin: (email: string, role: 'superadmin' | 'host' | 'registration', name: string, assignedEventId?: string) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState<'superadmin' | 'host'>('host');
  const [regPassword, setRegPassword] = useState('12345678');
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Normalize inputs
    const trimmedEmail = normalizeEmail(email);
    const trimmedPassword = password.trim();

    try {
      // Try to sign in via Firebase Auth
      await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
      
      // Fetch user role and name from Firestore users collection
      let role = trimmedEmail.includes('superadmin') ? 'superadmin' : trimmedEmail === 'registration@aitheronml.in' ? 'registration' : 'host';
      let name = trimmedEmail.includes('superadmin') ? 'Super Admin' : trimmedEmail === 'registration@aitheronml.in' ? 'Registration Team' : 'Event Host';
      let assignedEventId = MAP_EMAIL_TO_EVENT_ID[trimmedEmail] || '';
      if (trimmedEmail in MAP_EMAIL_TO_NAME) {
        name = MAP_EMAIL_TO_NAME[trimmedEmail];
      }
      
      try {
        const userDoc = await getDoc(doc(db, 'users', trimmedEmail));
        if (userDoc.exists()) {
          const data = userDoc.data();
          role = data.role || role;
          name = data.name || name;
          const dbAssignedEventId = data.assignedEventId;
          assignedEventId = (dbAssignedEventId && dbAssignedEventId !== 'none') ? dbAssignedEventId : assignedEventId;
        } else {
          await setDoc(doc(db, 'users', trimmedEmail), {
            name,
            email: trimmedEmail,
            role,
            assignedEventId,
            status: 'active'
          });
        }
      } catch (firestoreErr) {
        console.warn("Firestore access failed on sign-in, proceeding with email-derived credentials:", firestoreErr);
      }
      
      onLogin(trimmedEmail, role as 'superadmin' | 'host' | 'registration', name, assignedEventId);
    } catch (err: any) {
      console.warn("Auth failed, attempting auto-setup or fallback", err);

      const isDefaultSuperadmin = (trimmedEmail === 'superadmin@gmail.com' && trimmedPassword === '12345678');
      const isOfficialHost = (trimmedEmail in MAP_EMAIL_TO_EVENT_ID && trimmedPassword === '12345678');
      const isRegistrationTeam = (trimmedEmail === 'registration@aitheronml.in' && trimmedPassword === '12345678');

      // Auto-bootstrap default credentials in Firebase Auth if they don't exist yet!
      if (isDefaultSuperadmin || isOfficialHost || isRegistrationTeam) {
        try {
          await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
        } catch (regErr: any) {
          console.warn("Auto registration or double-check failed", regErr);
          if (regErr.code === 'auth/email-already-in-use') {
            try {
              await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
            } catch (signInErr) {
              console.warn("Subsequent sign-in failed", signInErr);
            }
          }
        }

        const role = trimmedEmail.includes('superadmin') ? 'superadmin' : trimmedEmail === 'registration@aitheronml.in' ? 'registration' : 'host';
        const name = MAP_EMAIL_TO_NAME[trimmedEmail] || (trimmedEmail === 'registration@aitheronml.in' ? 'Registration Team' : trimmedEmail.includes('superadmin') ? 'Super Admin' : 'Event Host');
        const assignedEventId = MAP_EMAIL_TO_EVENT_ID[trimmedEmail] || '';
        
        try {
          await setDoc(doc(db, 'users', trimmedEmail), {
            name,
            email: trimmedEmail,
            role,
            assignedEventId,
            status: 'active'
          });
        } catch (firestoreErr) {
          console.warn("Failed to set bootstrapped profile in Firestore", firestoreErr);
        }

        // Always allow login for default credentials even if Firestore permission check was denied
        onLogin(trimmedEmail, role as 'superadmin' | 'host' | 'registration', name, assignedEventId);
        setIsSubmitting(false);
        return;
      }

      // Check local storage / local users if Firebase auth failed and is offline
      try {
        const storedUsers = localStorage.getItem('custom_users');
        const usersList = storedUsers ? JSON.parse(storedUsers) : [];
        
        // Always include default users in local fallback list so they work 100% of the time offline
        if (!usersList.some((u: any) => u.email === 'superadmin@gmail.com')) {
          usersList.push({ email: 'superadmin@gmail.com', pass: '12345678', role: 'superadmin', name: 'Super Admin' });
        }
        if (!usersList.some((u: any) => u.email === 'registration@aitheronml.in')) {
          usersList.push({ email: 'registration@aitheronml.in', pass: '12345678', role: 'registration', name: 'Registration Team' });
        }
        
        Object.entries(MAP_EMAIL_TO_EVENT_ID).forEach(([hostEmail, evId]) => {
          if (!usersList.some((u: any) => u.email === hostEmail)) {
            usersList.push({
              email: hostEmail,
              pass: '12345678',
              role: 'host',
              name: MAP_EMAIL_TO_NAME[hostEmail],
              assignedEventId: evId
            });
          }
        });

        const matchedUser = usersList.find((u: any) => u.email.toLowerCase() === trimmedEmail && u.pass === trimmedPassword);
        if (matchedUser) {
          onLogin(matchedUser.email, matchedUser.role, matchedUser.name, matchedUser.assignedEventId);
          setIsSubmitting(false);
          return;
        }
      } catch (cacheErr) {
        console.error("Failed to parse cached users", cacheErr);
      }

      let msg = 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid password. If using default accounts, please use password "12345678".';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err.code === 'auth/network-request-failed') {
        msg = 'Network connection failed. Operating in offline/cached fallback mode.';
      }
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!regName || !regEmail || !regPassword) {
      setError('Please fill in all registration fields.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsRegistering(true);
    const normalizedEmail = regEmail.trim().toLowerCase();

      try {
        // Create in Firebase Auth
        await createUserWithEmailAndPassword(auth, normalizedEmail, regPassword);

        // Save metadata in Firestore
        try {
          await setDoc(doc(db, 'users', normalizedEmail), {
            name: regName,
            email: normalizedEmail,
            role: regRole,
            createdAt: new Date().toISOString()
          });
        } catch (firestoreErr) {
          console.warn("Could not save registered user profile to Firestore (permissions or database setup pending), continuing locally:", firestoreErr);
        }

        // Sync to local cache
        try {
          const storedUsers = localStorage.getItem('custom_users');
          const usersList = storedUsers ? JSON.parse(storedUsers) : [];
          usersList.push({
            name: regName,
            email: normalizedEmail,
            role: regRole,
            pass: regPassword
          });
          localStorage.setItem('custom_users', JSON.stringify(usersList));
        } catch (cacheErr) {
          console.error("Cache sync failed", cacheErr);
        }

        setRegSuccess(`Account successfully registered for ${regName} as ${regRole === 'superadmin' ? 'Super Admin' : 'Event Host'}. You can now sign in!`);
        
        setRegName('');
        setRegEmail('');
        setPassword(regPassword);
        setEmail(regEmail);

        setTimeout(() => {
          setIsRegisterOpen(false);
          setRegSuccess(null);
        }, 2500);

      } catch (err: any) {
      console.error("Firebase Registration Error", err);
      let msg = 'Registration failed. ' + (err.message || '');
      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email address is already registered in Firebase Authentication.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak. Please use at least 6 characters.';
      }
      setError(msg);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleFillCredentials = (emailToFill: string) => {
    setEmail(emailToFill);
    setPassword('12345678');
    setError(null);
  };

  return (
    <div 
      id="login-container" 
      className="min-h-screen text-white flex flex-col justify-between items-center relative font-sans px-4 py-6 md:px-8"
      style={{ background: 'radial-gradient(circle, #5b589c 0%, #2f2b60 100%)' }}
    >
      {/* Top Header */}
      <header className="w-full flex justify-between items-center z-10 py-2">
        {/* Left Side: Logo and College Name */}
        <div className="flex items-center gap-3">
          <img 
            alt="Kuppam Engineering College Logo" 
            className="w-10 h-10 md:w-14 md:h-14 object-contain" 
            src="https://lh3.googleusercontent.com/aida/AP1WRLtgnUPvtqegkk_J3i7PChobpIKH9MRx0UKcGNvB8DzjiCTygldxeqENFAPbA96vDMK7WPjj2JVby1YtdG5Y30h3QMHtUqh1_LklimkPlmOmo0Sr54ItyiU1nXbcWzQJGsb5YIYgAPd014zTnW-uxE5bnwOMfqsIq-mOZkGmKEpkKbukQNtFIAcO8fj57fzbwHwd4aXlXPqMysCPqDBUzQYM_bw_6KBmsXWB2KxH2kn7t0O0DLhV_n6K59xt"
            referrerPolicy="no-referrer"
          />
          <div className="flex flex-col">
            <span className="font-bold text-white text-base md:text-xl tracking-wider uppercase leading-none">
              Kuppam Engineering College
            </span>
            <span className="text-[10px] md:text-xs text-white/80 mt-1 font-medium leading-none">
              (Autonomous)
            </span>
          </div>
        </div>

        {/* Right Side: Symposium and Department Logos */}
        <div className="flex items-center gap-2">
          <img 
            alt="Symposium Logo" 
            className="w-10 h-10 md:w-12 md:h-12 object-contain" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCNp7wPZZt0kyC0HnoRobbyP7YNijLj2AgCWj2CIBtUiyM2wZtHai4BCSoy5EPpKIjpXJVLoVJYbyvN-X1eXJm2Jm41oYFQl2a7F9ucujLCb70JSfK6htpklUrKbWQLfa19D5mAcdVjGm0h0b1iCpzn2MosuBRyAqhBBJGdgz0pd8gMrz_1PwhJ2UyXWukg6PeRcw6QUNXOXrOe0OTr7IIzuThhZ53zow2Ytv0QQWHNJEzHQMRB7_GNYZJbEN4h4zc65YDlZq6UGKsG"
            referrerPolicy="no-referrer"
          />
          <img 
            alt="Department Logo" 
            className="w-10 h-10 md:w-12 md:h-12 object-contain rounded" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBt28uq_wm7gJZMv8HipcL93mqUC84oZw6TudoX5AwnON6PlaApJaLQ9O6idymZom791HTPJvDkv23WFptz-CLeMAqVl77oKXaxM0YxrjK8CFKILiXfDvhJw8aBkuCqeOwLIm4rw4XglcnJebMDPWPnWa1WwFqNOS8X7_lnHfGrP9gWL2DGscxbZnbEegTgkwxvDE_HWHcdgToc-ikUxWMQt1NRSo3GpBWjXboWfrOnECQnwMXYzIdCb87KvGXwcC6xMbWbEL9gH_IS"
            referrerPolicy="no-referrer"
          />
        </div>
      </header>

      {/* Main Centered Section */}
      <main className="w-full flex-grow flex flex-col justify-center items-center z-10 py-6">
        <div className="w-full max-w-xl flex flex-col items-center gap-6">
          
          {/* Centered branding with increased department font sizes */}
          <div className="text-center px-4 flex flex-col items-center">
            <h3 className="font-extrabold text-sm md:text-lg tracking-widest text-white/95 uppercase mb-1 drop-shadow-sm">
              Department of Computer Science and Engineering
            </h3>
            <h4 className="font-bold text-xs md:text-sm tracking-wider text-white/80 uppercase mb-4 drop-shadow-sm">
              (Artificial Intelligence &amp; Machine Learning)
            </h4>
            
            <motion.h1 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="font-bold tracking-tight text-white mt-1 leading-none drop-shadow"
              style={{ fontSize: 'clamp(2.5rem, 6.5vw, 4.5rem)' }}
            >
              AitheronML 2K25
            </motion.h1>
            
            <p className="text-white/90 font-medium text-xs md:text-sm tracking-wide mt-4">
              National Level Technical Symposium
            </p>
            <p className="text-white/70 text-[10px] md:text-xs italic tracking-wider mt-1">
              Unleashing the Future of Intelligence
            </p>
          </div>

          {/* Login Card */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 md:p-8 relative text-gray-800 text-left"
          >
            <h2 className="text-lg font-bold text-gray-900 tracking-tight mb-4">Login</h2>

            {error && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-xs flex items-start gap-2 border border-red-100"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
              
              {/* Email Address */}
              <div className="flex flex-col">
                <label 
                  htmlFor="login-email"
                  className="text-gray-700 text-xs font-semibold"
                >
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  className="w-full h-11 px-3 mt-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Password */}
              <div className="flex flex-col">
                <div className="flex justify-between items-center">
                  <label 
                    htmlFor="login-password"
                    className="text-gray-700 text-xs font-semibold"
                  >
                    Password
                  </label>
                  <button 
                    type="button" 
                    onClick={() => {
                      alert('Demo Credentials:\n\nSuper Admin:\nEmail: superadmin@gmail.com\nPassword: 12345678\n\nEvent Hosts:\nUse any official host email, e.g. paperpresentation@aitheronml.in\nPassword: 12345678');
                    }} 
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Forgot?
                  </button>
                </div>
                <input
                  id="login-password"
                  type="password"
                  className="w-full h-11 px-3 mt-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 outline-none transition-all"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {/* Submit Button */}
              <button 
                id="sign-in-btn"
                disabled={isSubmitting}
                className="w-full h-11 mt-2 bg-[#030852] hover:bg-[#020536] text-white rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                type="submit"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Logging in...</span>
                  </>
                ) : (
                  <>
                    <span>Login</span>
                    <span className="text-xs">➜</span>
                  </>
                )}
              </button>

              {/* Register link */}
              <div className="text-center mt-2">
                <button 
                  type="button"
                  onClick={() => setIsRegisterOpen(true)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  Don't have an account? Register for the symposium
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center z-10 py-2 border-t border-white/10">
        <p className="text-[10px] md:text-xs text-white/50 flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck className="w-4 h-4 text-white/60 shrink-0" />
          Authorized University Personnel Only
        </p>
      </footer>

      {/* Account Pre-fill floating bubble helper */}
      <div className="fixed bottom-4 right-4 z-40 bg-surface border border-outline-variant p-3 rounded-xl shadow-lg max-w-xs transition-all hover:scale-105">
        <h4 className="text-xs font-bold text-primary mb-2 flex items-center gap-1">
          <UserCheck className="w-3.5 h-3.5" /> Quick Demo Login
        </h4>
        <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
          <button 
            onClick={() => handleFillCredentials('superadmin@gmail.com')}
            className="text-[11px] text-left px-2 py-1 bg-primary/5 hover:bg-primary/15 text-primary rounded font-semibold truncate shrink-0"
          >
            🔑 Admin (superadmin@gmail.com)
          </button>
          <button 
            onClick={() => handleFillCredentials('registration@aitheronml.in')}
            className="text-[11px] text-left px-2 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-700 rounded font-bold truncate shrink-0 animate-pulse"
          >
            📋 Registration Team (12345678)
          </button>
          <button 
            onClick={() => handleFillCredentials('paperpresentation@aitheronml.in')}
            className="text-[11px] text-left px-2 py-1 bg-secondary/5 hover:bg-secondary/15 text-secondary rounded font-medium truncate shrink-0"
          >
            🔑 Paper Pres. Host
          </button>
          <button 
            onClick={() => handleFillCredentials('vibecoding@aitheronml.in')}
            className="text-[11px] text-left px-2 py-1 bg-secondary/5 hover:bg-secondary/15 text-secondary rounded font-medium truncate shrink-0"
          >
            🔑 White Coding Host
          </button>
          <button 
            onClick={() => handleFillCredentials('treasurehunt@aitheronml.in')}
            className="text-[11px] text-left px-2 py-1 bg-secondary/5 hover:bg-secondary/15 text-secondary rounded font-medium truncate shrink-0"
          >
            🔑 Treasure Hunt Host
          </button>
        </div>
      </div>

      {/* Registration Modal Dialog */}
      {isRegisterOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-on-surface">Symposium Self-Registration</h3>
              <button 
                onClick={() => setIsRegisterOpen(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-variant/30"
              >
                ✕
              </button>
            </div>

            {regSuccess ? (
              <div className="p-4 bg-primary/10 text-primary border border-primary/20 rounded-xl text-center text-sm font-medium py-8">
                🎉 {regSuccess}
              </div>
            ) : (
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <p className="text-xs text-on-surface-variant">
                  Register a customized account to explore the AItheronML Symposium OS as a Super Admin or Event Host.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Professor Raghavendra"
                    className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="e.g. raghavendra@gmail.com"
                    className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">System Access Role</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setRegRole('host')}
                      className={`h-10 rounded-lg text-xs font-semibold border transition-all ${
                        regRole === 'host' 
                          ? 'border-primary bg-primary/5 text-primary' 
                          : 'border-outline text-on-surface-variant hover:bg-surface-variant/20'
                      }`}
                    >
                      Event Host
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegRole('superadmin')}
                      className={`h-10 rounded-lg text-xs font-semibold border transition-all ${
                        regRole === 'superadmin' 
                          ? 'border-primary bg-primary/5 text-primary' 
                          : 'border-outline text-on-surface-variant hover:bg-surface-variant/20'
                      }`}
                    >
                      Super Admin
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface mb-1">Password</label>
                  <input 
                    type="text" 
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full h-10 px-3 bg-surface-container border border-outline rounded-lg text-sm text-on-surface font-mono"
                  />
                </div>

                 <button 
                  type="submit"
                  disabled={isRegistering}
                  className={`w-full h-11 mt-2 bg-primary text-on-primary rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 ${
                    isRegistering ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isRegistering ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Registering Account...</span>
                    </>
                  ) : (
                    <span>Create Account</span>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
