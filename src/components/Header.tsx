import { useState, useEffect } from 'react';
import { Bolt, User as UserIcon, LogIn, Clock, Home, RefreshCw, History, Ban, LogOut } from 'lucide-react';
import { User } from '../types';

interface HeaderProps {
  online: boolean;
  siteLogo?: string;
  onAuthClick: () => void;
  currentUser: User | null;
  view: 'home' | 'order' | 'order-list' | 'profile' | 'admin';
  setView: (view: 'home' | 'order' | 'order-list' | 'profile' | 'admin') => void;
  checkAuthAndShow: (targetView: 'order' | 'order-list' | 'profile') => void;
  isBanned?: boolean;
  onSignOut?: () => void;
}

export default function Header({ 
  online, 
  siteLogo,
  onAuthClick, 
  currentUser, 
  view, 
  setView, 
  checkAuthAndShow,
  isBanned = false,
  onSignOut
}: HeaderProps) {
  const [timeStr, setTimeStr] = useState<string>('সময়...');
  const [greeting, setGreeting] = useState<string>('শুভ দিন!');

  useEffect(() => {
    const updateTimeAndGreeting = () => {
      const now = new Date();
      // Time in Dhaka
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Dhaka',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      };
      
      try {
        setTimeStr(now.toLocaleTimeString('bn-BD', options));
      } catch (e) {
        setTimeStr(now.toLocaleTimeString('en-US', { hour12: true }));
      }

      // Greeting based on Dhaka hours
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dhaka',
        hour: 'numeric',
        hour12: false,
      });
      const hours = parseInt(formatter.format(now)) || now.getHours();

      if (hours >= 5 && hours < 12) {
        setGreeting('শুভ সকাল!');
      } else if (hours >= 12 && hours < 16) {
        setGreeting('শুভ দুপুর!');
      } else if (hours >= 16 && hours < 20) {
        setGreeting('শুভ সন্ধ্যা!');
      } else {
        setGreeting('শুভ রাত্রি!');
      }
    };

    updateTimeAndGreeting();
    const interval = setInterval(updateTimeAndGreeting, 1000);
    return () => clearInterval(interval);
  }, []);

  // When User is Banned: Header only shows BAN ACCOUNT title, no Home/Trade/Order/Online/Profile!
  if (isBanned) {
    return (
      <header className="sticky top-0 z-[100] ios-glass bg-rose-950/60 border-b border-rose-500/30 py-3.5 px-4 sm:px-8 shadow-xl shadow-rose-950/50">
        <div className="max-w-7xl mx-auto w-full flex justify-between items-center gap-4">
          {/* Left: Branding with Ban Icon */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-950/60 shrink-0 border border-rose-400/40">
              <Ban className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">VeloxPay</span>
              </div>
              <span className="text-[11px] font-black text-rose-400 flex items-center gap-1">
                🚫 অ্যাকাউন্ট স্থগিত
              </span>
            </div>
          </div>

          {/* Center: Prominent BAN ACCOUNT Header Title */}
          <div className="flex items-center justify-center">
            <div className="px-4 py-1.5 sm:px-6 sm:py-2 rounded-2xl bg-rose-600/30 border border-rose-500/60 text-white shadow-lg shadow-rose-950/70 flex items-center gap-2 animate-pulse">
              <Ban className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400 shrink-0" />
              <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-rose-200">
                BAN ACCOUNT
              </span>
            </div>
          </div>

          {/* Right: Logout Button Only */}
          <div>
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-white/10 hover:bg-rose-600 hover:text-white border border-rose-500/40 text-rose-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>লগআউট</span>
              </button>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-[100] ios-glass bg-emerald-950/20 border-b border-emerald-500/15 py-4 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto w-full flex justify-between items-center gap-4">
        {/* Left: Branding & Greeting */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div 
            onClick={() => setView('home')}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition cursor-pointer shrink-0 overflow-hidden border border-emerald-400/30"
          >
            {siteLogo ? (
              <img 
                src={siteLogo} 
                alt="VeloxPay" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover" 
              />
            ) : (
              <Bolt className="w-6 h-6 animate-pulse text-white" />
            )}
          </div>
          <div onClick={() => setView('home')} className="cursor-pointer">
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">VeloxPay</span>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest hidden sm:inline-block font-sans">
                • {greeting}
              </span>
            </div>
            <span className="text-xs font-black text-white/70 flex items-center gap-1.5 font-mono">
              <Clock className="w-3 h-3 text-emerald-400" /> {timeStr}
            </span>
          </div>
        </div>

        {/* Center: Desktop Navigation Bar */}
        <nav className="hidden md:flex items-center gap-1.5 bg-white/[0.03] border border-white/5 p-1 rounded-2xl">
          <button 
            onClick={() => setView('home')}
            className={`px-4 py-1.5 rounded-xl transition flex flex-col items-center gap-0.5 ${
              view === 'home' 
                ? 'bg-emerald-500 text-white shadow-md' 
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Home</span>
          </button>
          <button 
            onClick={() => checkAuthAndShow('order')}
            className={`px-4 py-1.5 rounded-xl transition flex flex-col items-center gap-0.5 ${
              view === 'order' 
                ? 'bg-emerald-500 text-white shadow-md' 
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Trade</span>
          </button>
          <button 
            onClick={() => checkAuthAndShow('order-list')}
            className={`px-4 py-1.5 rounded-xl transition flex flex-col items-center gap-0.5 ${
              view === 'order-list' 
                ? 'bg-emerald-500 text-white shadow-md' 
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Order</span>
          </button>
        </nav>

        {/* Right: Status Capsule & Auth controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Admin Status Capsule: Pure Green when Online, Pure Red when Offline */}
          <div className={`px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-full flex items-center gap-1.5 sm:gap-2 border transition-all duration-300 ${
            online 
              ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400 shadow-sm shadow-emerald-500/10' 
              : 'bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-sm shadow-rose-500/20'
          }`}>
            <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500 animate-pulse'}`} />
            <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider inline ${
              online ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {online ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* User Profile Capsule button */}
          <button
            onClick={() => checkAuthAndShow('profile')}
            className={`hidden md:flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl border transition active:scale-95 cursor-pointer ${
              view === 'profile' 
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' 
                : 'border-white/10 bg-white/5 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-white'
            }`}
          >
            {currentUser ? (
              <>
                {currentUser.avatar ? (
                  <img 
                    src={currentUser.avatar} 
                    alt={currentUser.name} 
                    referrerPolicy="no-referrer"
                    className="w-3.5 h-3.5 rounded-full object-cover border border-emerald-400" 
                  />
                ) : (
                  <UserIcon className={`w-3.5 h-3.5 ${view === 'profile' ? 'text-white' : 'text-emerald-400'}`} />
                )}
                <span className="text-[9px] font-black uppercase tracking-wider">Profile</span>
              </>
            ) : (
              <>
                <LogIn className={`w-3.5 h-3.5 ${view === 'profile' ? 'text-white' : 'text-emerald-400'}`} />
                <span className="text-[9px] font-black uppercase tracking-wider">Login</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

