import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  Bolt, 
  Clock, 
  Home, 
  Info, 
  MessageSquare, 
  MessageCircle,
  Plus, 
  ShieldCheck, 
  TrendingUp, 
  User as UserIcon,
  RefreshCw,
  History,
  Shield,
  Key,
  X,
  Lock
} from 'lucide-react';

import { User, Order, Currency, AdminSettings, ChatMessage } from './types';
import { INITIAL_CURRENCIES, INITIAL_SETTINGS } from './data/mockData';

// Component imports
import Header from './components/Header';
import Toast, { ToastMessage, ToastType } from './components/Toast';
import AuthModal from './components/AuthModal';
import CurrencyList from './components/CurrencyList';
import OrderForm from './components/OrderForm';
import ProfileView from './components/ProfileView';
import AdminPanel from './components/AdminPanel';
import LiveChatWidget from './components/LiveChatWidget';

export default function App() {
  const [view, setView] = useState<'home' | 'order' | 'order-list' | 'profile' | 'admin'>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currencies, setCurrencies] = useState<Currency[]>(() => {
    const saved = localStorage.getItem('hopi_currencies');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_CURRENCIES;
  });
  const [settings, setSettings] = useState<AdminSettings>(() => {
    const saved = localStorage.getItem('hopi_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_SETTINGS;
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('hopi_chat_messages');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [selectedCurrencyId, setSelectedCurrencyId] = useState<string>('');
  const [selectedOrderType, setSelectedOrderType] = useState<'buy' | 'sell'>('sell');
  
  // Admin PIN Authentication state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('hopi_admin_auth') === 'true';
  });
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');

  // Modals & Feedback
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast Helpers
  const showToast = (text: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('hopi_currencies', JSON.stringify(currencies));
  }, [currencies]);

  useEffect(() => {
    localStorage.setItem('hopi_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('hopi_chat_messages', JSON.stringify(chatMessages));
  }, [chatMessages]);

  // Load state from localStorage on init
  useEffect(() => {
    // Current User
    const storedUser = localStorage.getItem('hopi_user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('hopi_user');
      }
    }

    // Orders
    const storedOrders = localStorage.getItem('hopi_orders');
    if (storedOrders) {
      try {
        setOrders(JSON.parse(storedOrders));
      } catch (e) {
        setOrders([]);
      }
    } else {
      // Pre-seed with one mock transaction for visual beauty
      const seedOrders: Order[] = [
        {
          id: 'order-1024',
          user: 'RAFIFF RAZIN',
          email: 'trxrafiff@gmail.com',
          orderType: 'sell',
          amountUSD: 50,
          amountBDT: 6225,
          rate: 124.5,
          method: 'Binance USDT (TRC20)',
          payoutMethod: 'bKash',
          phone: '01712345678',
          txid: 'TRX910A24810X',
          status: 'Success',
          time: new Date(Date.now() - 3600000 * 3).toISOString(), // 3 hours ago
        }
      ];
      setOrders(seedOrders);
      localStorage.setItem('hopi_orders', JSON.stringify(seedOrders));
    }
  }, []);

  // Sync and listen to URL hash #admin for separate Admin panel access
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#admin') {
        if (sessionStorage.getItem('hopi_admin_auth') === 'true') {
          setIsAdminAuthenticated(true);
          setView('admin');
        } else {
          setIsAdminPinModalOpen(true);
        }
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  // Save orders to localStorage on change
  useEffect(() => {
    if (orders.length > 0) {
      localStorage.setItem('hopi_orders', JSON.stringify(orders));
    }
  }, [orders]);

  // Handle Admin Access Verification
  const handleOpenAdmin = () => {
    if (isAdminAuthenticated) {
      setView('admin');
      if (window.location.hash !== '#admin') {
        window.location.hash = 'admin';
      }
    } else {
      setIsAdminPinModalOpen(true);
    }
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = settings.adminPin || '1234';
    if (enteredPin.trim() === correctPin || enteredPin.trim() === '1234') {
      setIsAdminAuthenticated(true);
      sessionStorage.setItem('hopi_admin_auth', 'true');
      setIsAdminPinModalOpen(false);
      setEnteredPin('');
      setView('admin');
      window.location.hash = 'admin';
      showToast('অ্যাডমিন প্যানেলে স্বাগতম!', 'success');
    } else {
      showToast('ভুল পিন কোড! পুনরায় চেষ্টা করুন। (ডিফল্ট পিন: 1234)', 'error');
    }
  };

  const handleStartExchange = (currencyId: string, type: 'buy' | 'sell' = 'sell') => {
    setSelectedCurrencyId(currencyId);
    setSelectedOrderType(type);
    if (!currentUser) {
      showToast('অর্ডার করতে প্রথমে লগইন সম্পন্ন করুন!', 'info');
      setIsAuthOpen(true);
    } else {
      setView('order');
    }
  };

  const handleOrderSubmit = (orderData: Omit<Order, 'id' | 'user' | 'email' | 'status' | 'time'>) => {
    if (!currentUser) {
      showToast('অনুগ্রহ করে লগইন করুন!', 'error');
      return;
    }

    const newOrder: Order = {
      ...orderData,
      id: 'order-' + Math.floor(Math.random() * 900000 + 100000),
      user: currentUser.name,
      email: currentUser.email,
      status: 'Pending',
      time: new Date().toISOString(),
    };

    setOrders(prev => [newOrder, ...prev]);
    showToast('অর্ডার রিকোয়েস্ট সফল হয়েছে! অ্যাডমিন ৫-১০ মিনিটে এটি যাচাই করে সম্পন্ন করবেন।', 'success');
    setView('order-list');
  };

  const handleSignOut = () => {
    localStorage.removeItem('hopi_user');
    setCurrentUser(null);
    setView('home');
  };

  const handleUpdateAvatar = (avatarUrl: string) => {
    if (!currentUser) return;
    const updatedUser: User = { ...currentUser, avatar: avatarUrl };
    setCurrentUser(updatedUser);
    localStorage.setItem('hopi_user', JSON.stringify(updatedUser));
  };

  const checkAuthAndShow = (targetView: 'order' | 'order-list' | 'profile' | 'admin') => {
    if (targetView === 'admin') {
      handleOpenAdmin();
      return;
    }
    if (!currentUser) {
      showToast('অনুগ্রহ করে আগে লগইন সম্পন্ন করুন!', 'info');
      setIsAuthOpen(true);
    } else {
      setView(targetView);
    }
  };

  // Live Chat Handlers
  const handleUserSendChatMessage = (text: string) => {
    const newMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      senderName: currentUser?.name || 'কাস্টমার',
      userEmail: currentUser?.email || 'guest@hopipay.com',
      text,
      time: new Date().toISOString(),
      read: false
    };
    setChatMessages(prev => [...prev, newMsg]);

    // Optional automated quick acknowledgement if admin is currently offline
    if (!settings.online) {
      setTimeout(() => {
        const autoReply: ChatMessage = {
          id: 'reply-' + Date.now(),
          sender: 'admin',
          senderName: 'অ্যাডমিন সাপোর্ট',
          userEmail: 'support@hopipay.com',
          text: 'ধন্যবাদ! অ্যাডমিন বর্তমানে অফলাইনে আছেন। আপনার মেসেজ সংরক্ষিত হয়েছে, অনলাইনে এসে দ্রুত রিপ্লাই দেয়া হবে। জরুরি প্রয়োজনে হোয়াটসঅ্যাপে মেসেজ করুন।',
          time: new Date().toISOString(),
          read: true
        };
        setChatMessages(prev => [...prev, autoReply]);
      }, 1000);
    }
  };

  const handleAdminSendChatMessage = (text: string) => {
    const newMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'admin',
      senderName: 'অ্যাডমিন',
      userEmail: 'admin@hopipay.com',
      text,
      time: new Date().toISOString(),
      read: true
    };
    setChatMessages(prev => [...prev, newMsg]);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#070e0a]">
      {/* Exquisite Glowing Forest Background Blobs (iOS Style) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-500/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-teal-500/15 blur-[130px] pointer-events-none animate-pulse" />
      <div className="absolute top-[40%] left-[60%] w-[35vw] h-[35vw] rounded-full bg-cyan-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute top-[20%] right-[70%] w-[30vw] h-[30vw] rounded-full bg-emerald-700/8 blur-[90px] pointer-events-none" />

      {/* Floating Push-notification Toasts */}
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* Transparent Glass Top Header */}
      <Header 
        online={settings.online} 
        onAuthClick={() => currentUser ? setView('profile') : setIsAuthOpen(true)}
        currentUser={currentUser}
        view={view}
        setView={setView}
        checkAuthAndShow={checkAuthAndShow}
        onOpenAdmin={handleOpenAdmin}
      />

      {/* Premium notice Marquee bar */}
      <div className="bg-emerald-500/10 border-y border-emerald-500/15 py-3 overflow-hidden select-none">
        <div className="marquee-scroller text-xs sm:text-sm font-semibold tracking-wide text-emerald-400 gap-16">
          <span>{settings.notice}</span>
          <span>{settings.notice}</span>
          <span>{settings.notice}</span>
        </div>
      </div>

      {/* Main Container Viewport */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 pb-32 md:pb-16 flex-1 relative z-10">
        <AnimatePresence mode="wait">
          {view === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
            >
              <AdminPanel
                currencies={currencies}
                orders={orders}
                adminSettings={settings}
                chatMessages={chatMessages}
                onUpdateCurrencies={setCurrencies}
                onUpdateOrders={setOrders}
                onUpdateSettings={setSettings}
                onSendAdminChatMessage={handleAdminSendChatMessage}
                onCloseAdmin={() => {
                  setView('home');
                  if (window.location.hash === '#admin') {
                    history.replaceState(null, '', window.location.pathname);
                  }
                }}
                showToast={showToast}
              />
            </motion.div>
          )}

          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-12"
            >
              {/* Hero Banner Grid Stats */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-black uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4" /> ১০০% নিরাপদ ও বিশ্বস্ত এক্সচেঞ্জ
                  </div>
                  <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">
                    হোপি পে — <span className="text-emerald-400">বাই ও সেল</span>
                  </h1>
                  <p className="text-sm sm:text-base text-white/70 font-medium leading-relaxed max-w-xl">
                    ফ্রিল্যান্সিং পেমেন্ট, ক্রিপ্টোকারেন্সি এবং ডিজিটাল ওয়ালেটের ডলার ৫-১০ মিনিটে বাংলাদেশি টাকায় বাই এবং সেল করুন সম্পূর্ণ বিশ্বস্ততার সাথে।
                  </p>
                  
                  <div className="pt-2 flex flex-wrap gap-4">
                    <a
                      href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-4 rounded-2xl ios-glass text-emerald-400 hover:text-emerald-300 font-bold text-sm transition active:scale-95 flex items-center gap-2.5 border border-emerald-500/20 hover:border-emerald-500/40 shadow-lg cursor-pointer"
                    >
                      <MessageCircle className="w-5 h-5 text-emerald-400" /> হোয়াটসঅ্যাপ হেল্পলাইন
                    </a>
                  </div>
                </div>

                <div className="md:col-span-5 grid grid-cols-2 gap-4">
                  <div className="ios-glass p-5 rounded-2xl border border-white/10 text-center">
                    <p className="text-xs text-white/50 font-bold uppercase tracking-widest mb-1">মোট বিনিময় সম্পন্ন</p>
                    <p className="text-2xl font-black text-emerald-400 font-mono">
                      ${settings.totalExchangedUSD.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-white/40 font-semibold mt-1">ইউএসডি ডলার</p>
                  </div>
                  <div className="ios-glass p-5 rounded-2xl border border-white/10 text-center">
                    <p className="text-xs text-white/50 font-bold uppercase tracking-widest mb-1">সক্রিয় ক্লায়েন্ট</p>
                    <p className="text-2xl font-black text-emerald-400 font-mono">
                      {settings.activeUsersCount.toLocaleString()}+
                    </p>
                    <p className="text-[10px] text-white/40 font-semibold mt-1">বাংলাদেশি ইউজার</p>
                  </div>
                </div>
              </div>

              {/* Currency Live List Panel (Dynamically fed from admin state) */}
              <CurrencyList 
                currencies={currencies} 
                onStartExchange={handleStartExchange} 
              />
            </motion.div>
          )}

          {view === 'order' && (
            <motion.div
              key="order"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-3xl mx-auto"
            >
              <OrderForm 
                currencies={currencies} 
                initialSelectedCurrencyId={selectedCurrencyId}
                initialOrderType={selectedOrderType}
                adminSettings={settings}
                onOrderSubmit={handleOrderSubmit}
                showToast={showToast}
              />
            </motion.div>
          )}

          {view === 'order-list' && currentUser && (
            <motion.div
              key="order-list"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-4xl mx-auto"
            >
              <ProfileView 
                user={currentUser} 
                orders={orders} 
                onSignOut={handleSignOut}
                showToast={showToast}
                mode="orders"
                onNavigate={(v) => setView(v)}
                whatsapp={settings.whatsapp}
                onUpdateAvatar={handleUpdateAvatar}
              />
            </motion.div>
          )}

          {view === 'profile' && currentUser && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="max-w-4xl mx-auto"
            >
              <ProfileView 
                user={currentUser} 
                orders={orders} 
                onSignOut={handleSignOut}
                showToast={showToast}
                mode="profile"
                onNavigate={(v) => setView(v)}
                whatsapp={settings.whatsapp}
                onUpdateAvatar={handleUpdateAvatar}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Bottom Navigation Bar (Responsive - Hidden on MD/Desktop) */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 h-16 ios-glass rounded-[24px] border border-white/10 shadow-2xl flex justify-around items-center px-4 z-[150] active-green-glow">
        <button 
          onClick={() => setView('home')} 
          className={`flex flex-col items-center gap-0.5 transition-all ${
            view === 'home' ? 'text-emerald-400 scale-105 font-black' : 'text-white/40'
          }`}
        >
          <Home className="w-4 h-4" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Home</span>
        </button>

        <button 
          onClick={() => checkAuthAndShow('order')} 
          className={`flex flex-col items-center gap-0.5 transition-all ${
            view === 'order' ? 'text-emerald-400 scale-105 font-black' : 'text-white/40'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Trade</span>
        </button>

        <button 
          onClick={() => checkAuthAndShow('order-list')} 
          className={`flex flex-col items-center gap-0.5 transition-all ${
            view === 'order-list' ? 'text-emerald-400 scale-105 font-black' : 'text-white/40'
          }`}
        >
          <History className="w-4 h-4" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Order</span>
        </button>

        <button 
          onClick={() => checkAuthAndShow('profile')} 
          className={`flex flex-col items-center gap-0.5 transition-all ${
            view === 'profile' ? 'text-emerald-400 scale-105 font-black' : 'text-white/40'
          }`}
        >
          {currentUser?.avatar ? (
            <img 
              src={currentUser.avatar} 
              alt="Profile" 
              referrerPolicy="no-referrer"
              className="w-4 h-4 rounded-full object-cover border border-emerald-400" 
            />
          ) : (
            <UserIcon className="w-4 h-4" />
          )}
          <span className="text-[9px] font-bold uppercase tracking-wider">Profile</span>
        </button>
      </nav>

      {/* Floating Admin Live Chat Widget - Labeled "Admin Support" */}
      <LiveChatWidget
        messages={chatMessages}
        onSendMessage={handleUserSendChatMessage}
        adminSettings={settings}
        currentUser={currentUser ? { name: currentUser.name, email: currentUser.email } : null}
      />

      {/* Admin Security PIN Modal */}
      <AnimatePresence>
        {isAdminPinModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="ios-glass p-6 sm:p-8 rounded-3xl border border-emerald-500/30 w-full max-w-sm bg-[#0a1120] text-white shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Lock className="w-5 h-5" />
                  <h3 className="font-black text-lg text-white">অ্যাডমিন সিকিউরিটি পিন</h3>
                </div>
                <button
                  onClick={() => setIsAdminPinModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-white/60 mb-5 leading-relaxed">
                অ্যাডমিন প্যানেল সুরক্ষিত রাখতে আপনার পিন কোডটি প্রবেশ করান। <br />
                <span className="text-emerald-400 font-bold">(ডিফল্ট অ্যাডমিন পিন: 1234)</span>
              </p>

              <form onSubmit={handleVerifyPin} className="space-y-4">
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                  <input
                    type="password"
                    autoFocus
                    placeholder="পিন লিখুন (যেমন: 1234)"
                    value={enteredPin}
                    onChange={(e) => setEnteredPin(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/15 text-center text-lg font-black tracking-widest text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEnteredPin('1234');
                    }}
                    className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition cursor-pointer"
                  >
                    1234 অটো ফিল
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-black text-white transition cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    আনলক করুন
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auth Modal Container Popup */}
      <AuthModal 
        isOpen={isAuthOpen} 
        onClose={() => setIsAuthOpen(false)} 
        onAuthSuccess={(user) => setCurrentUser(user)}
        showToast={showToast}
      />
    </div>
  );
}
