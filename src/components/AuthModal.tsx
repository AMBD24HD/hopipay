import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fingerprint, Lock, Mail, User, X } from 'lucide-react';
import { User as UserType } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserType) => void;
  showToast: (text: string, type: 'success' | 'error') => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess, showToast }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      showToast('সবগুলো ঘর পূরণ করুন!', 'error');
      return;
    }

    if (isSignUp && !name) {
      showToast('আপনার নামটি লিখুন!', 'error');
      return;
    }

    // Process simulation
    const userData: UserType = {
      name: isSignUp ? name : email.split('@')[0].toUpperCase(),
      email: email,
      createdAt: new Date().toISOString(),
    };

    // Store in localStorage
    localStorage.setItem('hopi_user', JSON.stringify(userData));
    onAuthSuccess(userData);
    showToast(isSignUp ? 'অ্যাকাউন্ট তৈরি সফল হয়েছে!' : 'লগইন সফল হয়েছে!', 'success');
    onClose();
  };

  const handleDemoLogin = () => {
    const demoUser: UserType = {
      name: 'RAFIFF RAZIN',
      email: 'trxrafiff@gmail.com',
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('hopi_user', JSON.stringify(demoUser));
    onAuthSuccess(demoUser);
    showToast('ডেমো অ্যাকাউন্ট দিয়ে লগইন করা হয়েছে!', 'success');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Dialog Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-md relative z-10 ios-glass rounded-[32px] overflow-hidden p-8 active-green-glow"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white/5 hover:bg-emerald-500/20 text-white/60 hover:text-emerald-400 flex items-center justify-center transition active:scale-90"
            >
              <X className="w-5 h-5" />
            </button>

            <form onSubmit={handleSubmit} className="text-center">
              {/* iOS TouchID / Fingerprint Icon */}
              <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Fingerprint className="w-9 h-9 animate-pulse" />
              </div>

              <h2 className="text-2xl font-black text-white tracking-tight">
                {isSignUp ? 'নতুন অ্যাকাউন্ট খুলুন' : 'স্বাগতম ব্যাক!'}
              </h2>
              <p className="text-xs text-white/50 mt-1 mb-6 font-medium">
                {isSignUp ? 'আপনার তথ্যগুলো দিয়ে রেজিস্ট্রেশন সম্পন্ন করুন' : 'আপনার অ্যাকাউন্টে লগইন করুন'}
              </p>

              <div className="space-y-4 text-left">
                {isSignUp && (
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400/60" />
                    <input
                      type="text"
                      placeholder="আপনার নাম লিখুন"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 rounded-2xl ios-glass-input text-sm font-medium"
                    />
                  </div>
                )}

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400/60" />
                  <input
                    type="email"
                    placeholder="ইমেইল অ্যাড্রেস (Gmail)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl ios-glass-input text-sm font-medium"
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400/60" />
                  <input
                    type="password"
                    placeholder="পাসওয়ার্ড লিখুন"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl ios-glass-input text-sm font-medium"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-500/10 active:scale-95 transition cursor-pointer"
                >
                  {isSignUp ? 'অ্যাকাউন্ট তৈরি করুন' : 'প্রবেশ করুন'}
                </button>
              </div>
            </form>

            <div className="relative flex py-4 items-center">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-4 text-[10px] text-white/30 uppercase font-black tracking-widest">অথবা</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleDemoLogin}
                className="w-full py-3.5 rounded-2xl bg-white/5 hover:bg-emerald-500/10 border border-white/10 text-emerald-400 font-bold text-sm transition active:scale-95 cursor-pointer"
              >
                ডেমো অ্যাকাউন্ট দিয়ে সরাসরি লগইন
              </button>

              <p className="text-center text-xs text-white/45 font-medium pt-2">
                {isSignUp ? 'ইতিমধ্যে অ্যাকাউন্ট আছে?' : 'অ্যাকাউন্ট তৈরি করা নেই?'}
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-emerald-400 font-bold ml-2 hover:underline focus:outline-none"
                >
                  {isSignUp ? 'লগইন করুন' : 'নতুন খুলুন'}
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
