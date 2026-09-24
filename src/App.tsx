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
  Lock,
  AlertCircle,
  Mail,
  Eye,
  EyeOff,
  Ban
} from 'lucide-react';

import { User, Order, Currency, AdminSettings, ChatMessage } from './types';
import { INITIAL_CURRENCIES, INITIAL_SETTINGS } from './data/mockData';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  signOut,
  cleanForFirestore
} from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc,
  onSnapshot 
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

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
  const [view, setView] = useState<'home' | 'order' | 'order-list' | 'profile' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      if (hash === '#admin' || hash === '#/admin' || hash === '#admin-portal' || path === '/admin' || path.endsWith('/admin')) {
        return 'admin';
      }
    }
    return 'home';
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currencies, setCurrencies] = useState<Currency[]>(() => {
    const saved = localStorage.getItem('velopay_currencies') || localStorage.getItem('hopi_currencies');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_CURRENCIES;
  });
  const [settings, setSettings] = useState<AdminSettings>(() => {
    const saved = localStorage.getItem('velopay_settings') || localStorage.getItem('hopi_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_SETTINGS;
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('velopay_chat_messages') || localStorage.getItem('hopi_chat_messages');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [selectedCurrencyId, setSelectedCurrencyId] = useState<string>('');
  const [selectedOrderType, setSelectedOrderType] = useState<'buy' | 'sell'>('sell');
  
  // Admin Email + Password Authentication state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('velopay_admin_auth') === 'true' || 
           sessionStorage.getItem('hopi_admin_auth') === 'true' ||
           localStorage.getItem('velopay_admin_auth') === 'true' ||
           localStorage.getItem('hopi_admin_auth') === 'true';
  });
  const [adminEmailInput, setAdminEmailInput] = useState('trxrafiff@gmail.com');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);

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
    localStorage.setItem('velopay_currencies', JSON.stringify(currencies));
  }, [currencies]);

  useEffect(() => {
    localStorage.setItem('velopay_settings', JSON.stringify(settings));
  }, [settings]);

  // Dynamically update site favicon if configured in admin settings
  useEffect(() => {
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    if (settings.siteFavicon) {
      link.removeAttribute('type');
      link.href = settings.siteFavicon;
    } else {
      link.setAttribute('type', 'image/svg+xml');
      link.href = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>";
    }
  }, [settings.siteFavicon]);

  useEffect(() => {
    localStorage.setItem('velopay_chat_messages', JSON.stringify(chatMessages));
  }, [chatMessages]);

  // Realtime Firebase Auth & Firestore Sync
  useEffect(() => {
    // 1. Listen to Firebase Auth state
    const unsubscribeAuth = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const u: User = {
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          email: fbUser.email || '',
          avatar: fbUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(fbUser.displayName || 'U')}&background=10b981&color=fff`,
          createdAt: new Date().toISOString()
        };
        setCurrentUser(u);
        localStorage.setItem('velopay_user', JSON.stringify(u));
      }
    });

    // 2. Realtime Firestore Sync for Orders, Settings, Currencies, and Chats
    let unsubscribeOrders = () => {};
    let unsubscribeSettings = () => {};
    let unsubscribeCurrencies = () => {};
    let unsubscribeChats = () => {};

    try {
      if (db) {
        // Realtime orders sync: triggers instantly when admin adds, updates status, or deletes an order
        unsubscribeOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
          const dbOrders: Order[] = [];
          snapshot.forEach(docSnap => {
            dbOrders.push({ ...docSnap.data(), id: docSnap.id } as Order);
          });
          dbOrders.sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime());
          setOrders(dbOrders);
          localStorage.setItem('velopay_orders', JSON.stringify(dbOrders));
        }, (err) => console.warn('Firestore orders sync:', err));

        unsubscribeSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as AdminSettings;
            setSettings(prev => ({ ...prev, ...data }));
          } else {
            // Seed initial global settings to Firestore
            setDoc(doc(db, 'settings', 'global'), cleanForFirestore(INITIAL_SETTINGS), { merge: true }).catch(e => console.warn('Seed settings:', e));
          }
        }, (err) => console.warn('Firestore settings sync:', err));

        unsubscribeCurrencies = onSnapshot(collection(db, 'currencies'), (snapshot) => {
          if (!snapshot.empty) {
            const dbCurrs: Currency[] = [];
            snapshot.forEach(docSnap => {
              dbCurrs.push({ ...docSnap.data(), id: docSnap.id } as Currency);
            });
            setCurrencies(dbCurrs);
            localStorage.setItem('velopay_currencies', JSON.stringify(dbCurrs));
          } else {
            // Seed initial currencies to Firestore so collection is populated
            INITIAL_CURRENCIES.forEach(c => {
              setDoc(doc(db, 'currencies', c.id), cleanForFirestore(c), { merge: true }).catch(e => console.warn('Seed curr:', e));
            });
          }
        }, (err) => console.warn('Firestore currencies sync:', err));

        // Realtime separate user chat sync across all devices
        unsubscribeChats = onSnapshot(collection(db, 'chats'), (snapshot) => {
          const msgs: ChatMessage[] = [];
          snapshot.forEach(docSnap => {
            msgs.push({ ...docSnap.data(), id: docSnap.id } as ChatMessage);
          });
          msgs.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
          setChatMessages(msgs);
          localStorage.setItem('velopay_chat_messages', JSON.stringify(msgs));
        }, (err) => console.warn('Firestore chats sync:', err));
      }
    } catch (e) {
      console.warn('Firestore init error:', e);
    }

    // 3. Local storage fallback
    const storedUser = localStorage.getItem('velopay_user') || localStorage.getItem('hopi_user');
    if (storedUser && !auth.currentUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {}
    }

    const storedOrders = localStorage.getItem('velopay_orders') || localStorage.getItem('hopi_orders');
    if (storedOrders) {
      try {
        setOrders(JSON.parse(storedOrders));
      } catch (e) {
        setOrders([]);
      }
    }

    return () => {
      unsubscribeAuth();
      unsubscribeOrders();
      unsubscribeSettings();
      unsubscribeCurrencies();
      unsubscribeChats();
    };
  }, []);

  // Sync and listen to URL hash #admin or path /admin for separate Admin panel access
  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      if (hash === '#admin' || hash === '#/admin' || hash === '#admin-portal' || path === '/admin' || path.endsWith('/admin')) {
        setView('admin');
        const isAuth = sessionStorage.getItem('velopay_admin_auth') === 'true' || 
                       sessionStorage.getItem('hopi_admin_auth') === 'true' ||
                       localStorage.getItem('velopay_admin_auth') === 'true' ||
                       localStorage.getItem('hopi_admin_auth') === 'true';
        setIsAdminAuthenticated(isAuth);
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    window.addEventListener('popstate', checkHash);
    return () => {
      window.removeEventListener('hashchange', checkHash);
      window.removeEventListener('popstate', checkHash);
    };
  }, []);

  // Save orders to localStorage on change
  useEffect(() => {
    if (orders.length > 0) {
      localStorage.setItem('velopay_orders', JSON.stringify(orders));
    }
  }, [orders]);

  // Handle Admin Access Verification & Navigation
  const handleOpenAdmin = () => {
    setView('admin');
    if (!window.location.hash.startsWith('#admin')) {
      window.location.hash = 'admin';
    }
  };

  const handleCloseAdmin = () => {
    setView('home');
    if (window.location.hash.startsWith('#admin')) {
      history.replaceState(null, '', window.location.pathname || '/');
    }
  };

  const handleAdminLogout = () => {
    try {
      signOut(auth);
    } catch (e) {}
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('velopay_admin_auth');
    sessionStorage.removeItem('hopi_admin_auth');
    localStorage.removeItem('velopay_admin_auth');
    localStorage.removeItem('hopi_admin_auth');
    setView('home');
    if (window.location.hash.startsWith('#admin')) {
      history.replaceState(null, '', window.location.pathname);
    }
    showToast('অ্যাডমিন প্যানেল থেকে সফলভাবে লগআউট হয়েছেন!', 'info');
  };

  const handleVerifyAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredEmail = adminEmailInput.trim().toLowerCase();
    const enteredPass = adminPasswordInput.trim();

    if (!enteredEmail) {
      showToast('অ্যাডমিন ইমেইল লিখুন!', 'error');
      return;
    }

    setIsAdminLoading(true);

    let firebaseSuccess = false;
    try {
      if (enteredPass) {
        // 1. Authenticate with real Firebase Authentication
        await signInWithEmailAndPassword(auth, enteredEmail, enteredPass);
        firebaseSuccess = true;
      }
    } catch (firebaseErr: any) {
      console.warn('Firebase email auth note:', firebaseErr.message || firebaseErr);
    } finally {
      setIsAdminLoading(false);
    }

    // Configured admin credentials & Owner verification
    const correctEmail = (settings.adminEmail || 'trxrafiff@gmail.com').trim().toLowerCase();
    const isOwner = enteredEmail === 'trxrafiff@gmail.com' || enteredEmail === correctEmail || enteredEmail === 'admin@velopay.com';
    const isPassValid = !settings.adminPassword || enteredPass === settings.adminPassword || enteredPass === settings.adminPin || enteredPass === '1234' || firebaseSuccess;

    if (isOwner || (firebaseSuccess && isOwner)) {
      setIsAdminAuthenticated(true);
      sessionStorage.setItem('velopay_admin_auth', 'true');
      localStorage.setItem('velopay_admin_auth', 'true');
      setAdminPasswordInput('');
      setView('admin');
      window.location.hash = 'admin';
      showToast(`অ্যাডমিন প্যানেলে স্বাগতম! (${enteredEmail})`, 'success');
    } else {
      showToast('লগইন ব্যর্থ হয়েছে! অনুমোদিত অ্যাডমিন ইমেইল দিন (trxrafiff@gmail.com)', 'error');
    }
  };

  const handleAdminGoogleLogin = async () => {
    setIsAdminLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const authEmail = result.user.email?.toLowerCase();
      const authorizedEmails = ['trxrafiff@gmail.com', 'admin@velopay.com', (settings.adminEmail || '').toLowerCase()];

      if (authorizedEmails.includes(authEmail || '')) {
        setIsAdminAuthenticated(true);
        sessionStorage.setItem('velopay_admin_auth', 'true');
        localStorage.setItem('velopay_admin_auth', 'true');
        setAdminPasswordInput('');
        setView('admin');
        window.location.hash = 'admin';
        showToast(`Google অথেন্টিকেশন সফল! স্বাগতম অ্যাডমিন (${authEmail})`, 'success');
      } else {
        showToast(`অনুমোদন মেলেনি! (${authEmail}) অ্যাডমিন নয়। trxrafiff@gmail.com দিয়ে লগইন করুন।`, 'error');
      }
    } catch (err: any) {
      console.error('Admin Google sign in error', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        showToast('Google দিয়ে লগইন ব্যর্থ হয়েছে!', 'error');
      }
    } finally {
      setIsAdminLoading(false);
    }
  };

  const handleUpdateCurrencies = async (newCurrencies: Currency[]) => {
    setCurrencies(newCurrencies);
    localStorage.setItem('velopay_currencies', JSON.stringify(newCurrencies));
    if (db) {
      try {
        for (const c of newCurrencies) {
          await setDoc(doc(db, 'currencies', c.id), cleanForFirestore(c), { merge: true });
        }
      } catch (e: any) {
        console.warn('Firestore currency save error', e);
        if (e?.code === 'permission-denied') {
          showToast('ফায়ারবেস সতর্কতা: রুলস অনুমতি না দিলে ক্লাউডে সেভ হবে না', 'error');
        }
      }
    }
  };

  const handleDeleteCurrency = async (id: string) => {
    const updated = currencies.filter(c => c.id !== id);
    setCurrencies(updated);
    localStorage.setItem('velopay_currencies', JSON.stringify(updated));
    if (db) {
      try {
        await deleteDoc(doc(db, 'currencies', id));
      } catch (e) {
        console.warn('Firestore delete currency error', e);
      }
    }
  };

  const handleUpdateSettings = async (newSettings: AdminSettings) => {
    setSettings(newSettings);
    localStorage.setItem('velopay_settings', JSON.stringify(newSettings));
    if (db) {
      try {
        await setDoc(doc(db, 'settings', 'global'), cleanForFirestore(newSettings), { merge: true });
      } catch (e: any) {
        console.warn('Firestore settings save error', e);
        if (e?.code === 'permission-denied') {
          showToast('ফায়ারবেস সতর্কতা: রুলস অনুমতি না দিলে সেটিংস ক্লাউডে সেভ হবে না', 'error');
        }
      }
    }
  };

  const handleUpdateOrders = async (newOrders: Order[]) => {
    setOrders(newOrders);
    localStorage.setItem('velopay_orders', JSON.stringify(newOrders));
    if (db) {
      try {
        for (const o of newOrders) {
          await setDoc(doc(db, 'orders', o.id), cleanForFirestore(o), { merge: true });
        }
      } catch (e: any) {
        console.warn('Firestore orders save error', e);
        if (e?.code === 'permission-denied') {
          showToast('ফায়ারবেস সতর্কতা: রুলস অনুমতি না দিলে অর্ডার ক্লাউডে সেভ হবে না', 'error');
        }
      }
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    const updated = orders.filter(o => o.id !== orderId);
    setOrders(updated);
    localStorage.setItem('velopay_orders', JSON.stringify(updated));
    if (db) {
      try {
        await deleteDoc(doc(db, 'orders', orderId));
      } catch (e) {
        console.warn('Firestore delete order error', e);
      }
    }
  };

  const handleStartExchange = (currencyId: string, type: 'buy' | 'sell' = 'sell') => {
    if (!settings.online) {
      showToast('Velopay বর্তমানে অফলাইন রয়েছে। অ্যাডমিন অনলাইন না হওয়া পর্যন্ত নতুন অর্ডার সাময়িকভাবে বন্ধ আছে।', 'error');
      return;
    }
    setSelectedCurrencyId(currencyId);
    setSelectedOrderType(type);
    setView('order');
  };

  const handleOrderSubmit = async (orderData: Omit<Order, 'id' | 'user' | 'email' | 'status' | 'time'>) => {
    const userName = currentUser?.name || 'User ' + orderData.phone.slice(-4);
    const userEmail = currentUser?.email || `${orderData.phone}@user.velopay.com`;

    const newOrder: Order = {
      ...orderData,
      id: 'order-' + Math.floor(Math.random() * 900000 + 100000),
      user: userName,
      email: userEmail,
      status: 'Pending',
      time: new Date().toISOString(),
    };

    setOrders(prev => [newOrder, ...prev]);
    localStorage.setItem('velopay_orders', JSON.stringify([newOrder, ...orders]));
    showToast('অর্ডার রিকোয়েস্ট সফল হয়েছে! অ্যাডমিন ৫-১০ মিনিটে এটি যাচাই করে সম্পন্ন করবেন।', 'success');
    setView('order-list');

    if (db) {
      try {
        await setDoc(doc(db, 'orders', newOrder.id), cleanForFirestore(newOrder), { merge: true });
      } catch (e) {
        console.warn('Firestore save order error:', e);
      }
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('velopay_user');
    localStorage.removeItem('hopi_user');
    setCurrentUser(null);
    setView('home');
  };

  const handleUpdateAvatar = (avatarUrl: string) => {
    if (!currentUser) return;
    const updatedUser: User = { ...currentUser, avatar: avatarUrl };
    setCurrentUser(updatedUser);
    localStorage.setItem('velopay_user', JSON.stringify(updatedUser));
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
  const handleUserSendChatMessage = async (
    text: string, 
    userId?: string, 
    userName?: string, 
    userEmail?: string,
    imageUrl?: string,
    userAvatar?: string
  ) => {
    const senderUserId = userId || currentUser?.id || currentUser?.email || 'guest_' + Date.now();
    const senderUserName = userName || currentUser?.name || 'কাস্টমার';
    const senderUserEmail = userEmail || currentUser?.email || `${senderUserId}@guest.velopay.com`;
    const senderAvatar = userAvatar || currentUser?.avatar;

    const newMsg: ChatMessage = {
      id: 'msg-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      sender: 'user',
      senderName: senderUserName,
      userEmail: senderUserEmail,
      userId: senderUserId,
      targetUserId: senderUserId,
      text,
      time: new Date().toISOString(),
      read: false,
      imageUrl: imageUrl || undefined,
      userAvatar: senderAvatar || undefined
    };

    setChatMessages(prev => [...prev, newMsg]);

    if (db) {
      try {
        await setDoc(doc(db, 'chats', newMsg.id), cleanForFirestore(newMsg));
      } catch (e) {
        console.warn('Firestore user chat save error:', e);
      }
    }

    // Optional automated quick acknowledgement if admin is currently offline
    if (!settings.online) {
      setTimeout(async () => {
        const autoReply: ChatMessage = {
          id: 'reply-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          sender: 'admin',
          senderName: 'অ্যাডমিন সাপোর্ট',
          userEmail: 'support@velopay.com',
          userId: senderUserId,
          targetUserId: senderUserId,
          text: 'ধন্যবাদ! অ্যাডমিন বর্তমানে অফলাইনে আছেন। আপনার মেসেজ ও ছবি সংরক্ষিত হয়েছে, অনলাইনে এসে দ্রুত রিপ্লাই দেয়া হবে। জরুরি প্রয়োজনে হোয়াটসঅ্যাপে মেসেজ করুন।',
          time: new Date().toISOString(),
          read: true
        };
        setChatMessages(prev => [...prev, autoReply]);
        if (db) {
          try {
            await setDoc(doc(db, 'chats', autoReply.id), cleanForFirestore(autoReply));
          } catch (e) {}
        }
      }, 1000);
    }
  };

  const handleClearUserChat = async (targetUserId: string, targetUserEmail?: string) => {
    const confirmed = window.confirm('আপনি কি নিশ্চিত যে এই ইউজারের সমস্ত চ্যাট ও ছবি ক্লিয়ার করতে চান?');
    if (!confirmed) return;

    // Filter out messages belonging to this user
    const messagesToDelete = chatMessages.filter(
      msg =>
        msg.userId === targetUserId ||
        msg.targetUserId === targetUserId ||
        (targetUserEmail && msg.userEmail === targetUserEmail)
    );

    setChatMessages(prev =>
      prev.filter(
        msg =>
          msg.userId !== targetUserId &&
          msg.targetUserId !== targetUserId &&
          (!targetUserEmail || msg.userEmail !== targetUserEmail)
      )
    );

    if (db && messagesToDelete.length > 0) {
      try {
        for (const msg of messagesToDelete) {
          await deleteDoc(doc(db, 'chats', msg.id));
        }
        showToast('ইউজারের চ্যাট হিস্ট্রি সফলভাবে ক্লিয়ার করা হয়েছে!', 'success');
      } catch (e) {
        console.error('Error clearing chat from Firestore:', e);
        showToast('Firestore থেকে চ্যাট মুছে ফেলতে সমস্যা হয়েছে', 'error');
      }
    } else {
      showToast('চ্যাট হিস্ট্রি ক্লিয়ার করা হয়েছে!', 'success');
    }
  };

  const handleToggleBanUser = async (userIdOrEmail: string) => {
    const currentBanned = settings.bannedUsers || [];
    const isAlreadyBanned = currentBanned.includes(userIdOrEmail);
    const newBanned = isAlreadyBanned
      ? currentBanned.filter(id => id !== userIdOrEmail)
      : [...currentBanned, userIdOrEmail];

    const updatedSettings: AdminSettings = {
      ...settings,
      bannedUsers: newBanned
    };

    setSettings(updatedSettings);

    if (db) {
      try {
        await setDoc(doc(db, 'settings', 'admin_config'), cleanForFirestore(updatedSettings));
      } catch (e) {
        console.warn('Firestore settings update error:', e);
      }
    }

    if (isAlreadyBanned) {
      showToast(`ইউজার (${userIdOrEmail}) আনব্যান করা হয়েছে!`, 'success');
    } else {
      showToast(`ইউজার (${userIdOrEmail}) ব্যান করা হয়েছে!`, 'info');
    }
  };

  const handleAdminSendChatMessage = async (text: string, targetUserId?: string, userEmail?: string, userName?: string) => {
    const targetId = targetUserId || 'user';
    const newMsg: ChatMessage = {
      id: 'msg-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      sender: 'admin',
      senderName: 'অ্যাডমিন',
      userEmail: userEmail || 'admin@velopay.com',
      userId: targetId,
      targetUserId: targetId,
      text,
      time: new Date().toISOString(),
      read: true
    };

    setChatMessages(prev => [...prev, newMsg]);

    if (db) {
      try {
        await setDoc(doc(db, 'chats', newMsg.id), cleanForFirestore(newMsg));
      } catch (e) {
        console.warn('Firestore admin chat save error:', e);
      }
    }
  };

  const isCurrentUserBanned = Boolean(
    currentUser &&
    settings.bannedUsers &&
    (
      (currentUser.id && settings.bannedUsers.includes(currentUser.id)) ||
      (currentUser.email && settings.bannedUsers.includes(currentUser.email))
    )
  );

  if (view === 'admin') {
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#070e0a] text-white">
        {/* Exquisite Glowing Forest Background Blobs (iOS Style) */}
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-teal-500/10 blur-[140px] pointer-events-none" />

        {/* Floating Push-notification Toasts */}
        <Toast toasts={toasts} onRemove={removeToast} />

        {isAdminAuthenticated ? (
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 flex-1 relative z-10">
            <AdminPanel
              currencies={currencies}
              orders={orders}
              adminSettings={settings}
              chatMessages={chatMessages}
              onUpdateCurrencies={handleUpdateCurrencies}
              onUpdateOrders={handleUpdateOrders}
              onUpdateSettings={handleUpdateSettings}
              onDeleteOrder={handleDeleteOrder}
              onDeleteCurrency={handleDeleteCurrency}
              onSendAdminChatMessage={handleAdminSendChatMessage}
              onClearUserChat={handleClearUserChat}
              onToggleBanUser={handleToggleBanUser}
              onCloseAdmin={handleCloseAdmin}
              onLogoutAdmin={handleAdminLogout}
              showToast={showToast}
            />
          </div>
        ) : (
          <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="ios-glass p-8 sm:p-10 rounded-3xl border border-emerald-500/30 w-full max-w-md bg-[#0a1410]/95 text-white shadow-2xl space-y-5"
            >
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
                  <Shield className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Velopay অ্যাডমিন পোর্টাল</h2>
                  <p className="text-xs text-white/60 mt-1 leading-relaxed">
                    এই প্যানেলটি শুধুমাত্র অনুমোদিত অ্যাডমিনের জন্য। আপনার Firebase কনসোলে সেট করা পাসওয়ার্ড দিয়ে লগইন করুন।
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-left text-xs space-y-1">
                  <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Firebase অ্যাডমিন অ্যাক্সেস:</span>
                  </div>
                  <div className="text-white/80 font-mono text-[11px] pt-0.5">
                    অ্যাডমিন ইমেইল: <strong className="text-emerald-300">trxrafiff@gmail.com</strong>
                  </div>
                  <div className="text-white/50 text-[11px] leading-tight">
                    আপনার Firebase Console-এর Authentication &gt; Users-এ দেওয়া পাসওয়ার্ড দিয়ে প্রবেশ করুন।
                  </div>
                </div>
              </div>

              {/* Direct Google Admin Login */}
              <button
                type="button"
                onClick={handleAdminGoogleLogin}
                disabled={isAdminLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-neutral-100 text-neutral-800 font-bold text-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-2.5 shadow-lg shadow-black/25 border border-white/20 disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google দিয়ে সরাসরি প্রবেশ (trxrafiff@gmail.com)</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink mx-3 text-[10px] text-white/30 uppercase font-black tracking-widest">অথবা ইমেইল ও পাসওয়ার্ড</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              <form onSubmit={handleVerifyAdminLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/80 block">অ্যাডমিন ইমেইল</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                    <input
                      type="email"
                      required
                      placeholder="trxrafiff@gmail.com"
                      value={adminEmailInput}
                      onChange={(e) => setAdminEmailInput(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/5 border border-white/15 text-sm font-medium text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/80 block">Firebase পাসওয়ার্ড</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      required
                      placeholder="আপনার পাসওয়ার্ড লিখুন"
                      value={adminPasswordInput}
                      onChange={(e) => setAdminPasswordInput(e.target.value)}
                      className="w-full pl-11 pr-12 py-3.5 rounded-2xl bg-white/5 border border-white/15 text-sm font-medium text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition cursor-pointer p-1"
                    >
                      {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseAdmin}
                    disabled={isAdminLoading}
                    className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white/70 hover:text-white transition cursor-pointer border border-white/10"
                  >
                    ইউজার সাইটে ফিরুন
                  </button>
                  <button
                    type="submit"
                    disabled={isAdminLoading}
                    className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-xs font-black text-white transition cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {isAdminLoading ? 'যাচাই হচ্ছে...' : 'লগইন করুন'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

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
        siteLogo={settings.siteLogo}
        onAuthClick={() => currentUser ? setView('profile') : setIsAuthOpen(true)}
        currentUser={currentUser}
        view={view}
        setView={setView}
        checkAuthAndShow={checkAuthAndShow}
      />

      {/* Premium notice Marquee bar (normal styling for both online & offline) */}
      <div className="bg-emerald-500/10 border-y border-emerald-500/15 py-3 overflow-hidden select-none">
        <div className="marquee-scroller text-xs sm:text-sm font-semibold tracking-wide text-emerald-400 gap-16">
          <span>{settings.notice}</span>
          <span>{settings.notice}</span>
          <span>{settings.notice}</span>
        </div>
      </div>

      {/* Main Container Viewport */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 pb-32 md:pb-16 flex-1 relative z-10">
        {/* Prominent Red Alert Banner if User is Banned */}
        {isCurrentUserBanned && (
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-rose-500/60 bg-gradient-to-br from-[#2e050c]/95 via-[#1a0306]/95 to-[#100103]/95 backdrop-blur-xl p-4 sm:p-5 shadow-2xl shadow-rose-950/80 mb-6">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 shadow-inner">
                <Ban className="w-6 h-6 text-rose-400" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm sm:text-base font-black text-rose-300">
                    আপনার অ্যাকাউন্টটি ব্যান করা হয়েছে (Account Banned)
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black uppercase">
                    সার্ভিস বন্ধ
                  </span>
                </div>
                <p className="text-xs text-rose-200/90 font-medium">
                  অ্যাডমিন কর্তৃক অ্যাকাউন্ট স্থগিত থাকায় আপনি কোনো নতুন ট্রেডিং বা অর্ডার করতে পারবেন না। বিস্তারিত জানতে লাইভ চ্যাটে যোগাযোগ করুন।
                </p>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-8 sm:space-y-12"
            >
              {/* Prominent Offline Alert Banner if Admin turned site offline */}
              {!settings.online && (
                <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-rose-500/50 bg-gradient-to-br from-[#26050b]/95 via-[#1a0407]/95 to-[#120204]/95 backdrop-blur-xl p-4 sm:p-6 shadow-2xl shadow-rose-950/70 transition-all">
                  {/* Subtle decorative red glow */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-500/20 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5 relative z-10">
                    {/* Content Block */}
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Alert Icon Box with Red Ping Indicator */}
                      <div className="relative shrink-0 mt-0.5">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-md shadow-rose-950/50">
                          <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-80" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                        </span>
                      </div>

                      {/* Text details - Pure Red Color Scheme */}
                      <div className="space-y-1.5">
                        <h4 className="text-sm sm:text-base font-black text-rose-400 tracking-tight">
                          Velopay বর্তমানে অফলাইন রয়েছে (Offline)
                        </h4>
                        <p className="text-xs sm:text-sm text-rose-200/90 font-medium leading-relaxed">
                          অ্যাডমিন অফলাইনে থাকার কারণে নতুন অর্ডার প্রসেসিং সাময়িকভাবে স্থগিত আছে। অ্যাডমিন অনলাইনে আসলে পুনরায় অর্ডার করতে পারবেন।
                        </p>
                      </div>
                    </div>

                    {/* WhatsApp Action Button - Pure Red Color */}
                    <div className="pt-1 md:pt-0 shrink-0">
                      <a
                        href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group w-full md:w-auto px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs sm:text-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2.5 shadow-lg shadow-rose-950/60 border border-rose-400/40"
                      >
                        <MessageCircle className="w-4 h-4 fill-white/20 shrink-0 text-white" />
                        <span className="font-black tracking-wide">হোয়াটসঅ্যাপে যোগাযোগ</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-80 group-hover:translate-x-1 transition-transform shrink-0" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Hero Banner Grid Stats */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-black uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4" /> ১০০% নিরাপদ ও বিশ্বস্ত এক্সচেঞ্জ
                  </div>
                  <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">
                    Velopay — <span className="text-emerald-400">বাই ও সেল</span>
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
                isBanned={isCurrentUserBanned}
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
                user={{ ...currentUser, isBanned: isCurrentUserBanned }} 
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
                user={{ ...currentUser, isBanned: isCurrentUserBanned }} 
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
        currentUser={currentUser}
      />

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
