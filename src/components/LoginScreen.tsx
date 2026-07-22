import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldCheck, UserCheck, AlertCircle, Key, X } from 'lucide-react';
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
        let authSuccess = false;
        try {
          await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
          authSuccess = true;
        } catch (regErr: any) {
          console.warn("Auto registration or double-check failed", regErr);
          if (regErr.code === 'auth/email-already-in-use') {
            try {
              await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
              authSuccess = true;
            } catch (signInErr) {
              console.warn("Subsequent sign-in failed", signInErr);
            }
          }
        }

        if (authSuccess) {
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
      }

      // Check local storage / local users if Firebase auth failed and is offline
      if (err.code === 'auth/network-request-failed') {
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
      }

      let msg = 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'You have entered the wrong password. Try again.';
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
              alt="AItheronML Logo" 
              className="w-12 h-12 md:w-16 md:h-16 object-contain" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCNp7wPZZt0kyC0HnoRobbyP7YNijLj2AgCWj2CIBtUiyM2wZtHai4BCSoy5EPpKIjpXJVLoVJYbyvN-X1eXJm2Jm41oYFQl2a7F9ucujLCb70JSfK6htpklUrKbWQLfa19D5mAcdVjGm0h0b1iCpzn2MosuBRyAqhBBJGdgz0pd8gMrz_1PwhJ2UyXWukg6PeRcw6QUNXOXrOe0OTr7IIzuThhZ53zow2Ytv0QQWHNJEzHQMRB7_GNYZJbEN4h4zc65YDlZq6UGKsG"
              referrerPolicy="no-referrer"
            />
            <img 
              alt="CSE AI&amp;ML Logo" 
              className="w-12 h-12 md:w-16 md:h-16 object-contain" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBt28uq_wm7gJZMv8HipcL93mqUC84oZw6TudoX5AwnON6PlaApJaLQ9O6idymZom791HTPJvDkv23WFptz-CLeMAqVl77oKXaxM0YxrjK8CFKILiXfDvhJw8aBkuCqeOwLIm4rw4XglcnJebMDPWPnWa1WwFqNOS8X7_lnHfGrP9gWL2DGscxbZnbEegTgkwxvDE_HWHcdgToc-ikUxWMQt1NRSo3GpBWjXboWfrOnECQnwMXYzIdCb87KvGXwcC6xMbWbEL9gH_IS"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </header>

      {/* Main Hero Content */}
      <main className="relative z-20 flex flex-col items-center justify-center flex-grow text-center px-4 mt-8 w-full">
        <div className="max-w-4xl space-y-4">
          <div className="mb-6 space-y-2">
            <p className="text-white font-bold uppercase tracking-widest text-lg opacity-100">Department of Computer Science and Engineering</p>
            <p className="text-white font-bold text-lg opacity-100">(Artificial Intelligence &amp; Machine Learning)</p>
          </div>
          
          <h1 className="text-white text-5xl md:text-[84px] leading-tight mb-1" style={{ textShadow: 'rgba(0, 0, 0, 0.3) 0px 2px 4px', fontWeight: 700 }}>
            AItheronML 2k26
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
                      alert('Please contact the super admin to reset your password.');
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
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center z-20 pb-4">
        <p className="text-[11px] text-white/60 font-medium">Authorized University Personnel Only</p>
      </footer>



    </div>
  );
}
