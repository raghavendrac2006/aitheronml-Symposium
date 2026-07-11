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
    <div id="login-container" className="min-h-screen bg-background text-on-background relative flex flex-col justify-start overflow-hidden font-sans">
      
      {/* Background Asset */}
      <div className="absolute inset-0 z-0">
        <div 
          className="w-full h-full bg-cover bg-center scale-105 transform transition-transform duration-1000" 
          style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAB0Hxaj9oYZv_qbhc9t18pj1PENvA_KjugxxKpSn7vg72lWN-y2MZ9pIHyi66c-jn61ubusNdOp1X07CvNSJbBoSmswk7CgJeGaasAVWucCi9a2FJlJuCs50JTOx9tny-Ui-8-hgUOVJivkW8Hg4TsanJOXcbLM4cqEI5B2xmoo9YBKdwg9XGaOOoAR6Ww5f76NhcWQokrJuXLHOiU5ekh6w0PwTXp_SGtlSfIR6CszYoMJ7F3GgUcUKhptbERYR0O540eiuoMIFsV")' }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(rgba(8, 12, 95, 0.7), rgba(8, 12, 95, 0.9))' }} />
      </div>

      {/* Top Navigation Area */}
      <header className="relative z-20 flex justify-between items-start p-8 md:px-8 md:py-6 w-full">
        {/* Left Side: KEC Logo & College Name */}
        <div className="flex items-center gap-4 text-left">
          <img 
            alt="KEC Logo" 
            className="w-16 h-16 md:w-20 md:h-20 object-contain" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBhzQx8AAY4b-Os88jwlrrvra9Y-cdmGf-QQn92y-m8gHRNcUqT3rgjmhnjW6xT7CvAaFmTEy2W8uLfUdCL76UUFD5MLFDo3EbiVOHDz3jKth0BYuRQ5fzngsvQ1iYgILoLbVCMF7xBjMOGComKOn-pJg_5VOezELkR5Yj_R-gla9SqdK7ZRhfdlgV9hT4jM9C4BLh5Nxcu4LRLHkMBElDVXguyx8L7Y--bkS8HJIVvx987ET7BITOKbK-dT7DFBO1xNUpNQKgCwiHu"
            referrerPolicy="no-referrer"
          />
          <div className="hidden md:block">
            <h1 className="text-2xl text-white uppercase font-bold tracking-tight">
              Kuppam ENGINEERING COLLEGE
            </h1>
            <p className="text-[11px] font-medium tracking-[0.5px] text-white opacity-90">(Autonomous)</p>
          </div>
        </div>
        
        {/* Right Side: Dept & Symposium Logos */}
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <img 
              alt="CSE AI&amp;ML Logo" 
              className="w-12 h-12 md:w-16 md:h-16 object-contain" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBfVNxhI4hlz74i8jpOEScujvU8Yj9wJ6mUXpB8uAeHUOzaxYxSbq7MC6tyY_zKaIOndyYVHspX5gnWTlROzl3rm0dqo-rRD9GAfaY6UHQBwwjEwlPeIYdb6Agc9N23gluV80xX7L2ZKdtg6hAEQOdg69tuuM4uV9pssYenJgWtvUN5XmIWQJBnp8TfG_WssjluhF85hTqzBvluE5uIXRz_J4FgQnseW7Q84a-F4_Fu5UoWnkPmDWDorBVfLb7hcwDvdB6vPUTkTi-f"
              referrerPolicy="no-referrer"
            />
            <img 
              alt="AItheronML Logo" 
              className="w-12 h-12 md:w-16 md:h-16 object-contain" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDNjUSMqxvbevuodKNEqJikkk1HG5iAnbV5M_ZK1ye5LuKVBMFEQAe48GUcLuhmjVS9PokHQ8o42Ho6Z0PDbgBWKZQyyYUNS4HooEvT9BTI52ltQERzPx--1PfNdDhbBZpjM9xjFXS7ThLlbr7STe8LqkYZtzdxNbZPLBZeIbJnGZVMTLggA-pOmTjFqMiK_Jx7ZrPX1muEmyTKquhXWKolRCZRwqcIqeTfAaj2nm2qQ1Z1WYitbvwj9NUADU4XS-GVkTc9AKdd9Xs"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </header>

      {/* Main Hero Content */}
      <main className="relative z-20 flex flex-col items-center justify-center flex-grow text-center px-4 -mt-12 w-full">
        <div className="max-w-4xl space-y-4">
          <div className="mb-6 space-y-2">
            <p className="text-white font-bold uppercase tracking-widest text-lg opacity-100">Department of Computer Science and Engineering</p>
            <p className="text-white font-bold text-lg opacity-100">(Artificial Intelligence &amp; Machine Learning)</p>
          </div>
          
          <h1 className="text-white text-5xl md:text-[84px] leading-tight mb-1" style={{ textShadow: 'rgba(0, 0, 0, 0.3) 0px 2px 4px', fontWeight: 700 }}>
            AItheronML 2K25
          </h1>
          
          <div className="space-y-1 pb-8">
            <h2 className="text-[28px] leading-[36px] text-white font-semibold">
              National Level Technical Symposium
            </h2>
            <p className="text-[22px] leading-[28px] text-white tracking-wide font-medium">
              Unleashing the Future of Intelligence
            </p>
          </div>

          {/* Modern Corporate Login Box */}
          <div className="login-box w-full max-w-md mx-auto p-8 rounded-lg border text-left bg-white border-[#c7c5d2]">
            <h3 className="text-2xl font-semibold text-[#080c5f] mb-6">Login</h3>

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

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#464651]" htmlFor="email">Email Address</label>
                <input 
                  className="w-full px-4 py-2 rounded-lg border border-[#c7c5d2] focus:border-[#080c5f] focus:ring-1 focus:ring-[#080c5f] text-gray-900 outline-none transition-all" 
                  id="email" 
                  placeholder="name@example.com" 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-[#464651]" htmlFor="password">Password</label>
                  <button 
                    type="button"
                    onClick={() => {
                      alert('Demo Credentials:\n\nSuper Admin:\nEmail: superadmin@gmail.com\nPassword: 12345678\n\nEvent Hosts:\nUse any official host email, e.g. paperpresentation@aitheronml.in\nPassword: 12345678');
                    }}
                    className="text-xs text-[#080c5f] hover:underline font-medium"
                  >
                    Forgot?
                  </button>
                </div>
                <input 
                  className="w-full px-4 py-2 rounded-lg border border-[#c7c5d2] focus:border-[#080c5f] focus:ring-1 focus:ring-[#080c5f] text-gray-900 outline-none transition-all" 
                  id="password" 
                  placeholder="••••••••" 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <button 
                id="sign-in-btn"
                disabled={isSubmitting}
                className="w-full text-white font-medium py-3 rounded-lg shadow-sm transition-all active:scale-[0.98] flex justify-center items-center gap-2 cursor-pointer" 
                style={{ backgroundColor: 'rgb(33, 39, 115)' }}
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
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Register link */}
              <div className="text-center mt-2">
                <button 
                  type="button"
                  onClick={() => setIsRegisterOpen(true)}
                  className="text-xs font-semibold text-[#080c5f] hover:underline"
                >
                  Don't have an account? Register for the symposium
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center z-20 pb-4">
        <p className="text-[11px] text-white/60 font-medium">Authorized University Personnel Only</p>
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
