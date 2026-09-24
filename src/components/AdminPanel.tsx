import { useState, useEffect, useMemo, useRef } from 'react';
import { Currency, Order, AdminSettings, ChatMessage, User } from '../types';
import { 
  Shield, 
  Settings, 
  Coins, 
  ShoppingBag, 
  MessageSquare, 
  Power, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Upload, 
  Image as ImageIcon, 
  ExternalLink, 
  RefreshCw, 
  TrendingUp, 
  Users, 
  ArrowRight,
  Phone,
  DollarSign,
  Landmark,
  Wallet,
  CreditCard,
  Globe,
  ShieldCheck,
  Send,
  AlertCircle,
  Bolt,
  Search,
  CheckCheck,
  ChevronLeft,
  MessageCircle,
  User as UserIcon,
  Sparkles,
  UserX,
  UserCheck,
  ZoomIn,
  Ban,
  ChevronUp,
  ChevronDown,
  Mail,
  Calendar,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { uploadImageToImgBB } from '../utils/imgbb';
import { renderCurrencyVisual } from './CurrencyList';

interface AdminPanelProps {
  currencies: Currency[];
  orders: Order[];
  adminSettings: AdminSettings;
  chatMessages: ChatMessage[];
  registeredUsers?: User[];
  onUpdateCurrencies: (currencies: Currency[]) => void;
  onUpdateOrders: (orders: Order[]) => void;
  onUpdateSettings: (settings: AdminSettings) => void;
  onDeleteOrder?: (id: string) => void;
  onDeleteCurrency?: (id: string) => void;
  onSendAdminChatMessage: (text: string, targetUserId?: string, userEmail?: string, userName?: string) => void;
  onClearUserChat?: (targetUserId: string, targetUserEmail?: string) => void;
  onToggleBanUser?: (userIdOrEmail: string) => void;
  onCloseAdmin: () => void;
  onLogoutAdmin?: () => void;
  showToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

const AVAILABLE_ICONS = [
  { id: 'wallet', label: 'ওয়ালেট (Wallet)', icon: Wallet },
  { id: 'bank', label: 'ব্যাংক (Bank)', icon: Landmark },
  { id: 'coins', label: 'কয়েন/ট্রেড (Coins)', icon: Coins },
  { id: 'credit-card', label: 'কার্ড (Card)', icon: CreditCard },
  { id: 'globe', label: 'গ্লোবাল (Globe)', icon: Globe },
  { id: 'dollar', label: 'ডলার (Dollar)', icon: DollarSign },
  { id: 'shield', label: 'নিরাপদ (Shield)', icon: ShieldCheck }
];

export default function AdminPanel({
  currencies,
  orders,
  adminSettings,
  chatMessages,
  registeredUsers = [],
  onUpdateCurrencies,
  onUpdateOrders,
  onUpdateSettings,
  onDeleteOrder,
  onDeleteCurrency,
  onSendAdminChatMessage,
  onClearUserChat,
  onToggleBanUser,
  onCloseAdmin,
  onLogoutAdmin,
  showToast
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'currencies' | 'orders' | 'chat' | 'users' | 'settings'>('currencies');
  const [orderFilter, setOrderFilter] = useState<'all' | 'Pending' | 'Success' | 'Cancelled'>('all');
  const [adminReplyText, setAdminReplyText] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Separate Per-User Chat states
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const chatMessagesContainerRef = useRef<HTMLDivElement>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // Users Tab states
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'banned'>('all');

  // Editing state for currencies
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<AdminSettings>(adminSettings);

  // Sync settingsForm whenever adminSettings prop updates (e.g. from Firestore)
  useEffect(() => {
    setSettingsForm(adminSettings);
  }, [adminSettings]);

  // Chat scroll helpers
  const scrollChatToTop = () => {
    if (chatMessagesContainerRef.current) {
      chatMessagesContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollChatToBottom = () => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Comprehensive list of all site users from Firestore Auth, Orders, and Live Chat
  const allUsersList = useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      email: string;
      avatar?: string;
      createdAt?: string;
      totalOrders: number;
      totalAmountUSD: number;
      isBanned: boolean;
      source: 'auth' | 'order' | 'chat';
    }>();

    const bannedList = adminSettings.bannedUsers || [];

    // 1. Registered / Logged-in Users from Auth / Firestore
    if (registeredUsers && registeredUsers.length > 0) {
      registeredUsers.forEach(u => {
        const key = (u.email || u.id || '').toLowerCase().trim();
        if (!key) return;
        const isBanned = Boolean(
          (u.id && bannedList.includes(u.id)) ||
          (u.email && bannedList.includes(u.email.toLowerCase())) ||
          bannedList.includes(key)
        );
        map.set(key, {
          id: u.id || key,
          name: u.name || key.split('@')[0],
          email: u.email || key,
          avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'U')}&background=10b981&color=fff&bold=true`,
          createdAt: u.createdAt || new Date().toISOString(),
          totalOrders: 0,
          totalAmountUSD: 0,
          isBanned,
          source: 'auth'
        });
      });
    }

    // 2. Users from Orders
    orders.forEach(o => {
      const key = (o.email || o.user || '').toLowerCase().trim();
      if (!key) return;
      const isBanned = Boolean(
        bannedList.includes(key) || 
        (o.email && bannedList.includes(o.email.toLowerCase()))
      );
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: o.user || key.split('@')[0],
          email: o.email || key,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(o.user || 'U')}&background=0284c7&color=fff&bold=true`,
          createdAt: o.time || new Date().toISOString(),
          totalOrders: 0,
          totalAmountUSD: 0,
          isBanned,
          source: 'order'
        });
      }
      const item = map.get(key)!;
      item.totalOrders += 1;
      item.totalAmountUSD += o.amountUSD || 0;
      if (o.user && (!item.name || item.name === 'User' || item.name.startsWith('User '))) {
        item.name = o.user;
      }
    });

    // 3. Users from Chat Messages
    chatMessages.forEach(msg => {
      if (msg.sender === 'user' && msg.userEmail) {
        const key = msg.userEmail.toLowerCase().trim();
        if (!key) return;
        const isBanned = Boolean(
          bannedList.includes(key) || 
          (msg.userId && bannedList.includes(msg.userId))
        );
        if (!map.has(key)) {
          map.set(key, {
            id: msg.userId || key,
            name: msg.senderName && msg.senderName !== 'অ্যাডমিন' ? msg.senderName : key.split('@')[0],
            email: msg.userEmail,
            avatar: msg.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.senderName || 'U')}&background=10b981&color=fff&bold=true`,
            createdAt: msg.time,
            totalOrders: 0,
            totalAmountUSD: 0,
            isBanned,
            source: 'chat'
          });
        }
        const item = map.get(key)!;
        if (msg.userAvatar && !item.avatar) {
          item.avatar = msg.userAvatar;
        }
        if (msg.senderName && msg.senderName !== 'অ্যাডমিন' && (!item.name || item.name === 'User')) {
          item.name = msg.senderName;
        }
      }
    });

    // Recalculate order counts for all
    map.forEach((item, key) => {
      const userOrders = orders.filter(o => (o.email && o.email.toLowerCase() === key) || o.user === item.name);
      item.totalOrders = userOrders.length;
      item.totalAmountUSD = userOrders.reduce((sum, o) => sum + (o.amountUSD || 0), 0);
    });

    const list = Array.from(map.values());
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return list;
  }, [registeredUsers, orders, chatMessages, adminSettings.bannedUsers]);

  // Compute distinct user chat threads
  const userThreads = useMemo(() => {
    const map = new Map<string, {
      userId: string;
      userName: string;
      userEmail: string;
      userAvatar?: string;
      lastMessage?: ChatMessage;
      unreadCount: number;
      totalOrders: number;
      isBanned: boolean;
    }>();

    const bannedList = adminSettings.bannedUsers || [];

    // 1. Group from chatMessages
    chatMessages.forEach(msg => {
      const uId = msg.userId || (msg.sender === 'user' ? msg.userEmail : msg.targetUserId) || 'guest';
      const isBanned = Boolean(
        bannedList.includes(uId) || 
        bannedList.includes(msg.userEmail) || 
        (msg.userId && bannedList.includes(msg.userId))
      );

      if (!map.has(uId)) {
        map.set(uId, {
          userId: uId,
          userName: msg.senderName && msg.senderName !== 'অ্যাডমিন' ? msg.senderName : (msg.userEmail.split('@')[0] || 'User'),
          userEmail: msg.userEmail,
          userAvatar: msg.userAvatar,
          unreadCount: 0,
          totalOrders: orders.filter(o => o.email === msg.userEmail).length,
          isBanned
        });
      }
      const thread = map.get(uId)!;
      if (msg.userAvatar && !thread.userAvatar) {
        thread.userAvatar = msg.userAvatar;
      }
      if (!thread.lastMessage || new Date(msg.time).getTime() > new Date(thread.lastMessage.time).getTime()) {
        thread.lastMessage = msg;
      }
      if (msg.sender === 'user' && !msg.read) {
        thread.unreadCount += 1;
      }
    });

    // 2. Also incorporate users from orders so admin can chat with any customer
    orders.forEach(order => {
      const uId = order.email;
      const isBanned = Boolean(bannedList.includes(uId) || bannedList.includes(order.email));
      if (!map.has(uId)) {
        map.set(uId, {
          userId: uId,
          userName: order.user || order.email.split('@')[0],
          userEmail: order.email,
          userAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(order.user || 'U')}&background=10b981&color=fff`,
          unreadCount: 0,
          totalOrders: orders.filter(o => o.email === order.email).length,
          isBanned
        });
      } else {
        const thread = map.get(uId)!;
        thread.totalOrders = orders.filter(o => o.email === order.email).length;
        if (order.user && (thread.userName === 'User' || thread.userName.startsWith('User '))) {
          thread.userName = order.user;
        }
      }
    });

    const list = Array.from(map.values());
    list.sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.time).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.time).getTime() : 0;
      return timeB - timeA;
    });
    return list;
  }, [chatMessages, orders, adminSettings.bannedUsers]);

  // Auto-select first thread if none is selected
  useEffect(() => {
    if (!selectedChatUserId && userThreads.length > 0) {
      setSelectedChatUserId(userThreads[0].userId);
    }
  }, [selectedChatUserId, userThreads]);

  // Auto-scroll to bottom of chat when messages change
  useEffect(() => {
    if (activeTab === 'chat') {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, chatMessages, selectedChatUserId]);

  // 1-Tap Toggle Online / Offline
  const handleToggleOnline = () => {
    const updated = { ...adminSettings, online: !adminSettings.online };
    onUpdateSettings(updated);
    setSettingsForm(updated);
    showToast(`অ্যাডমিন স্ট্যাটাস: ${updated.online ? 'অনলাইন (Active)' : 'অফলাইন (Offline)'} করা হয়েছে!`, 'success');
  };

  // Order Actions: Complete, Cancel, Delete
  const handleOrderStatusChange = (orderId: string, status: 'Success' | 'Cancelled') => {
    const updatedOrders = orders.map(o => o.id === orderId ? { ...o, status } : o);
    onUpdateOrders(updatedOrders);
    showToast(status === 'Success' ? 'অর্ডার সফল (Complete) করা হয়েছে!' : 'অর্ডার বাতিল (Cancelled) করা হয়েছে!', 'info');
  };

  // Instant Order Deletion with immediate feedback (No blocking browser confirm)
  const handleDeleteOrder = (orderId: string) => {
    if (onDeleteOrder) {
      onDeleteOrder(orderId);
    } else {
      const updatedOrders = orders.filter(o => o.id !== orderId);
      onUpdateOrders(updatedOrders);
    }
    showToast('অর্ডার অবিলম্বে ডিলিট করা হয়েছে!', 'success');
  };

  // Image Upload handler for currency, payment logos, site logo & favicon
  const handleFileUpload = async (file: File, target: 'currency' | 'bkash' | 'nagad' | 'siteLogo' | 'siteFavicon') => {
    setIsUploading(true);
    try {
      showToast('ছবি আপলোড হচ্ছে...', 'info');
      const uploadedUrl = await uploadImageToImgBB(file);
      if (target === 'currency' && editingCurrency) {
        setEditingCurrency({ ...editingCurrency, imageUrl: uploadedUrl });
      } else if (target === 'bkash') {
        const updated = { ...settingsForm, bkashLogo: uploadedUrl };
        setSettingsForm(updated);
        onUpdateSettings(updated);
      } else if (target === 'nagad') {
        const updated = { ...settingsForm, nagadLogo: uploadedUrl };
        setSettingsForm(updated);
        onUpdateSettings(updated);
      } else if (target === 'siteLogo') {
        const updated = { ...settingsForm, siteLogo: uploadedUrl };
        setSettingsForm(updated);
        onUpdateSettings(updated);
      } else if (target === 'siteFavicon') {
        const updated = { ...settingsForm, siteFavicon: uploadedUrl };
        setSettingsForm(updated);
        onUpdateSettings(updated);
      }
      showToast('ছবি সফলভাবে আপলোড হয়েছে!', 'success');
    } catch (err: any) {
      showToast(err.message || 'ছবি আপলোড ব্যর্থ হয়েছে', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Save edited or newly added currency
  const handleSaveCurrency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCurrency) return;

    if (!editingCurrency.name.trim()) {
      showToast('কারেন্সির নাম আবশ্যক!', 'error');
      return;
    }

    let updatedCurrencies: Currency[];
    if (isAddingNew) {
      const newCurrency: Currency = {
        ...editingCurrency,
        id: editingCurrency.id || 'curr-' + Date.now()
      };
      updatedCurrencies = [...currencies, newCurrency];
      showToast('নতুন কারেন্সি যোগ করা হয়েছে!', 'success');
    } else {
      updatedCurrencies = currencies.map(c => c.id === editingCurrency.id ? editingCurrency : c);
      showToast('কারেন্সি তথ্য আপডেট করা হয়েছে!', 'success');
    }

    onUpdateCurrencies(updatedCurrencies);
    setEditingCurrency(null);
    setIsAddingNew(false);
  };

  const handleDeleteCurrency = (id: string) => {
    if (confirm('আপনি কি এই কারেন্সি কার্ডটি ডিলিট করতে চান?')) {
      const updated = currencies.filter(c => c.id !== id);
      onUpdateCurrencies(updated);
      if (onDeleteCurrency) {
        onDeleteCurrency(id);
      }
      showToast('কারেন্সি মুছে ফেলা হয়েছে!', 'info');
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(settingsForm);
    showToast('সাইট সেটিংস ও স্ট্যাটস সফলভাবে সেভ করা হয়েছে!', 'success');
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReplyText.trim()) return;
    const currentThread = userThreads.find(t => t.userId === selectedChatUserId);
    const targetUserId = currentThread?.userId || selectedChatUserId || 'user';
    const targetEmail = currentThread?.userEmail || 'user@velopay.com';
    const targetName = currentThread?.userName || 'কাস্টমার';

    onSendAdminChatMessage(adminReplyText.trim(), targetUserId, targetEmail, targetName);
    setAdminReplyText('');
    showToast(`${targetName}-কে উত্তর পাঠানো হয়েছে!`, 'success');
  };

  const filteredOrders = orders.filter(o => {
    if (orderFilter === 'all') return true;
    return o.status === orderFilter;
  });

  const pendingCount = orders.filter(o => o.status === 'Pending').length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Top Admin Navigation Bar */}
      <div className="ios-glass p-5 sm:p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0a1120]/80">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Velopay অ্যাডমিন প্যানেল</h2>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                Control Portal
              </span>
            </div>
            <p className="text-xs text-white/60">রেট, ওয়ালেট আইকন, লিমিট, অর্ডার এবং লাইভ স্ট্যাটাস পরিচালনা করুন</p>
          </div>
        </div>

        {/* 1-Tap Online/Offline Switch & User View Button */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* 1-Tap Toggle: All Green when Online, All Red when Offline */}
          <button
            onClick={handleToggleOnline}
            className={`px-4 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 transition cursor-pointer border shadow-md active:scale-95 duration-200 ${
              adminSettings.online 
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 shadow-emerald-500/10' 
                : 'bg-rose-500/20 border-rose-500/50 text-rose-400 hover:bg-rose-500/30 shadow-rose-500/20'
            }`}
          >
            <Power className={`w-4 h-4 ${adminSettings.online ? 'text-emerald-400' : 'text-rose-400'}`} />
            <span className={adminSettings.online ? 'text-emerald-400' : 'text-rose-400'}>
              স্ট্যাটাস: {adminSettings.online ? 'অনলাইন (Active)' : 'অফলাইন (Inactive)'}
            </span>
            <span className={`w-2.5 h-2.5 rounded-full ${adminSettings.online ? 'bg-emerald-400 animate-ping' : 'bg-rose-500 animate-pulse'}`} />
          </button>

          {/* Switch to User View */}
          <button
            onClick={onCloseAdmin}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer border border-white/10 active:scale-95"
            title="মূল ইউজার ওয়েবসাইটে ফিরে যান"
          >
            <span>ইউজার সাইট দেখুন</span>
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
          </button>

          {/* Admin Logout */}
          {onLogoutAdmin && (
            <button
              onClick={onLogoutAdmin}
              className="px-3.5 py-2.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95"
              title="অ্যাডমিন প্যানেল থেকে লগআউট করুন"
            >
              <Power className="w-3.5 h-3.5 text-rose-400" />
              <span>লগআউট</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Overview Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="ios-glass p-4 sm:p-5 rounded-2xl border border-white/10">
          <div className="flex justify-between items-center text-white/50 text-xs font-bold mb-1">
            <span>মোট অর্ডার</span>
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">{orders.length} টি</div>
          <div className="text-[10px] text-emerald-400 mt-1 font-bold">পেন্ডিং: {pendingCount} টি</div>
        </div>

        <div className="ios-glass p-4 sm:p-5 rounded-2xl border border-white/10">
          <div className="flex justify-between items-center text-white/50 text-xs font-bold mb-1">
            <span>মোট কারেন্সি</span>
            <Coins className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">{currencies.length} টি</div>
          <div className="text-[10px] text-cyan-400 mt-1 font-bold">সকল রেট সক্রিয়</div>
        </div>

        <div className="ios-glass p-4 sm:p-5 rounded-2xl border border-white/10">
          <div className="flex justify-between items-center text-white/50 text-xs font-bold mb-1">
            <span>মোট বিনিময় সম্পন্ন</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
            ${adminSettings.totalExchangedUSD.toLocaleString()}
          </div>
          <div className="text-[10px] text-white/40 mt-1 font-bold">ইউএসডি ডলার</div>
        </div>

        <div className="ios-glass p-4 sm:p-5 rounded-2xl border border-white/10">
          <div className="flex justify-between items-center text-white/50 text-xs font-bold mb-1">
            <span>সক্রিয় ক্লায়েন্ট</span>
            <Users className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-teal-400 font-mono">
            {adminSettings.activeUsersCount.toLocaleString()}+
          </div>
          <div className="text-[10px] text-white/40 mt-1 font-bold">বাংলাদেশি ইউজার</div>
        </div>
      </div>

      {/* Admin Tab Navigation */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/5 scrollbar-none">
        <button
          onClick={() => setActiveTab('currencies')}
          className={`flex-1 min-w-[130px] py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'currencies'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Coins className="w-4 h-4" /> কারেন্সি ও রেট ({currencies.length})
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 min-w-[130px] py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer relative ${
            activeTab === 'orders'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> অর্ডার ম্যানেজমেন্ট ({orders.length})
          {pendingCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping ml-1" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 min-w-[130px] py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer relative ${
            activeTab === 'users'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" /> ইউজার তালিকা ({allUsersList.length})
          {adminSettings.bannedUsers && adminSettings.bannedUsers.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-mono ml-1">
              {adminSettings.bannedUsers.length} ব্যান
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 min-w-[130px] py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'chat'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <MessageSquare className="w-4 h-4" /> লাইভ চ্যাট ইনবক্স ({chatMessages.length})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 min-w-[130px] py-3 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Settings className="w-4 h-4" /> সাইট সেটিংস ও স্ট্যাটস
        </button>
      </div>

      {/* TAB 1: CURRENCY & RATE MANAGEMENT */}
      {activeTab === 'currencies' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-400" /> কারেন্সি, ওয়ালেট কার্ড ও রেট কনফিগারেশন
              </h3>
              <p className="text-xs text-white/50 mt-1">
                প্রতিটি কার্ডের আইকন, ইমেজ আপলোড, বাই ও সেল রেট এবং মিনিমাম/ম্যাক্সিমাম লিমিট আপডেট করুন।
              </p>
            </div>

            <button
              onClick={() => {
                setIsAddingNew(true);
                setEditingCurrency({
                  id: 'curr-' + Date.now(),
                  name: '',
                  sellRate: 120,
                  buyRate: 124,
                  address: '',
                  type: 'wallet',
                  symbol: 'USD',
                  placeholder: 'অ্যাকাউন্ট আইডি/ইমেইল লিখুন',
                  icon: 'wallet',
                  minBuy: 5,
                  maxBuy: 1000,
                  minSell: 5,
                  maxSell: 1000,
                  reserve: 2000
                });
              }}
              className="px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" /> নতুন কারেন্সি যোগ করুন
            </button>
          </div>

          {/* Currency Edit Modal / Form Drawer */}
          {editingCurrency && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="ios-glass p-6 sm:p-8 rounded-3xl border border-emerald-500/30 bg-[#0c1524] shadow-2xl relative"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
                <h4 className="text-lg font-black text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-emerald-400" />
                  {isAddingNew ? 'নতুন কারেন্সি তৈরি করুন' : `${editingCurrency.name} এডিট করুন`}
                </h4>
                <button
                  onClick={() => {
                    setEditingCurrency(null);
                    setIsAddingNew(false);
                  }}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCurrency} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-emerald-400 uppercase">কারেন্সির পুরো নাম</label>
                    <input
                      type="text"
                      required
                      placeholder="যেমন: Payeer USD বা Binance USDT"
                      value={editingCurrency.name}
                      onChange={(e) => setEditingCurrency({ ...editingCurrency, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Symbol */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-emerald-400 uppercase">সিম্বল (Symbol)</label>
                    <input
                      type="text"
                      required
                      placeholder="যেমন: USD, USDT, WMZ"
                      value={editingCurrency.symbol}
                      onChange={(e) => setEditingCurrency({ ...editingCurrency, symbol: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Type */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-emerald-400 uppercase">কারেন্সি ক্যাটাগরি</label>
                    <select
                      value={editingCurrency.type}
                      onChange={(e) => setEditingCurrency({ ...editingCurrency, type: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 text-white text-sm font-bold focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="wallet">ওয়ালেট (Wallet / e-Currency)</option>
                      <option value="crypto">ক্রিপ্টোকারেন্সি (Crypto)</option>
                      <option value="giftcard">গিফট কার্ড (Gift Card)</option>
                    </select>
                  </div>

                  {/* Sell Rate */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-emerald-400 uppercase">
                      সেল রেট (Sell Rate - আমরা কিনবো ৳)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={editingCurrency.sellRate}
                      onChange={(e) => setEditingCurrency({ ...editingCurrency, sellRate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-emerald-400 text-sm font-black focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Buy Rate */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-cyan-400 uppercase">
                      বাই রেট (Buy Rate - আমরা বেচবো ৳)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={editingCurrency.buyRate}
                      onChange={(e) => setEditingCurrency({ ...editingCurrency, buyRate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-cyan-400 text-sm font-black focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Reserve */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-emerald-400 uppercase">রিজার্ভ পরিমাণ ($ USD)</label>
                    <input
                      type="number"
                      value={editingCurrency.reserve || 0}
                      onChange={(e) => setEditingCurrency({ ...editingCurrency, reserve: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Min Sell Limit */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-white/70 uppercase">সর্বনিম্ন সেল লিমিট ($ USD)</label>
                    <input
                      type="number"
                      value={editingCurrency.minSell ?? 5}
                      onChange={(e) => setEditingCurrency({ ...editingCurrency, minSell: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Max Sell Limit */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-white/70 uppercase">সর্বোচ্চ সেল লিমিট ($ USD)</label>
                    <input
                      type="number"
                      value={editingCurrency.maxSell ?? 1000}
                      onChange={(e) => setEditingCurrency({ ...editingCurrency, maxSell: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Min Buy Limit */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-white/70 uppercase">সর্বনিম্ন বাই লিমিট ($ USD)</label>
                    <input
                      type="number"
                      value={editingCurrency.minBuy ?? 5}
                      onChange={(e) => setEditingCurrency({ ...editingCurrency, minBuy: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Max Buy Limit */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-white/70 uppercase">সর্বোচ্চ বাই লিমিট ($ USD)</label>
                    <input
                      type="number"
                      value={editingCurrency.maxBuy ?? 1000}
                      onChange={(e) => setEditingCurrency({ ...editingCurrency, maxBuy: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Deposit Address */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[11px] font-black text-emerald-400 uppercase">
                      আমাদের ডিপোজিট অ্যাড্রেস (যেখানে ইউজার ডলার পাঠাবে)
                    </label>
                    <input
                      type="text"
                      placeholder="TRC20 অ্যাড্রেস / Payeer ID / ইমেইল"
                      value={editingCurrency.address}
                      onChange={(e) => setEditingCurrency({ ...editingCurrency, address: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Placeholder for User Address */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[11px] font-black text-emerald-400 uppercase">
                      ইউজারের রিসিভ অ্যাড্রেস ইনপুট ফিল্ডের প্লেসহোল্ডার
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: আপনার Payeer অ্যাকাউন্ট নম্বর লিখুন"
                      value={editingCurrency.placeholder}
                      onChange={(e) => setEditingCurrency({ ...editingCurrency, placeholder: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* ICON & IMAGE CUSTOMIZATION SECTION */}
                <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-black text-white flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-emerald-400" /> কার্ডের আইকন বা ইমেজ লোগো নির্ধারণ করুন
                      </h5>
                      <p className="text-xs text-white/50 mt-0.5">
                        আপনি আইকন সিলেক্ট করতে পারেন অথবা কাস্টম ছবি/লোগো আপলোড করতে পারেন (যেমন: Payeer USD লোগো)।
                      </p>
                    </div>

                    {/* Live Preview Box */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-[10px] font-bold text-white/60">লাইভ প্রিভিউ:</span>
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center overflow-hidden p-1">
                        {renderCurrencyVisual(editingCurrency, "w-6 h-6")}
                      </div>
                    </div>
                  </div>

                  {/* 1. Icon Select */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-white/70">ক) যেকোনো ডিফল্ট আইকন পছন্দ করুন:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                      {AVAILABLE_ICONS.map((item) => {
                        const IconComp = item.icon;
                        const isSelected = (!editingCurrency.imageUrl && (editingCurrency.icon || 'wallet') === item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setEditingCurrency({ ...editingCurrency, icon: item.id, imageUrl: '' })}
                            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 text-center transition cursor-pointer ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-md'
                                : 'border-white/5 bg-white/5 hover:border-white/20 text-white/70'
                            }`}
                          >
                            <IconComp className="w-5 h-5" />
                            <span className="text-[10px] font-bold">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Image Upload or Custom URL */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <label className="text-[11px] font-bold text-white/70">
                      খ) অথবা কাস্টম ছবি / লোগো আপলোড করুন (বা ছবির URL দিন):
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div className="flex items-center gap-2">
                        <label className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition">
                          <Upload className="w-4 h-4 text-emerald-400" />
                          <span>{isUploading ? 'আপলোড হচ্ছে...' : 'ডিভাইস থেকে ছবি আপলোড'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file, 'currency');
                            }}
                          />
                        </label>
                        {editingCurrency.imageUrl && (
                          <button
                            type="button"
                            onClick={() => setEditingCurrency({ ...editingCurrency, imageUrl: '' })}
                            className="px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold"
                          >
                            রিমুভ
                          </button>
                        )}
                      </div>

                      <input
                        type="url"
                        placeholder="বা ছবির ডিরেক্ট URL পেস্ট করুন (https://...)"
                        value={editingCurrency.imageUrl || ''}
                        onChange={(e) => setEditingCurrency({ ...editingCurrency, imageUrl: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCurrency(null);
                      setIsAddingNew(false);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold transition cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black transition cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" /> সেভ ও আপডেট করুন
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Currencies Table / Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currencies.map((curr) => (
              <div
                key={curr.id}
                className="ios-glass p-5 rounded-2xl border border-white/10 hover:border-emerald-500/30 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center p-1 overflow-hidden">
                        {renderCurrencyVisual(curr, "w-6 h-6")}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white">{curr.name}</h4>
                        <span className="text-[10px] font-bold text-white/50 uppercase">{curr.symbol} • {curr.type}</span>
                      </div>
                    </div>
                    <span className="text-xs font-black px-2 py-0.5 rounded-md bg-white/5 text-emerald-400 border border-white/5">
                      ${curr.reserve || 0}
                    </span>
                  </div>

                  {/* Rates */}
                  <div className="grid grid-cols-2 gap-2 bg-black/40 p-2.5 rounded-xl border border-white/5 text-center text-xs font-black">
                    <div>
                      <span className="text-[9px] text-white/40 block font-normal">সেল রেট (Sell)</span>
                      <span className="text-emerald-400">{curr.sellRate} ৳</span>
                    </div>
                    <div className="border-l border-white/5">
                      <span className="text-[9px] text-white/40 block font-normal">বাই রেট (Buy)</span>
                      <span className="text-cyan-400">{curr.buyRate} ৳</span>
                    </div>
                  </div>

                  {/* Limits */}
                  <div className="mt-2 text-[10px] text-white/40 font-medium flex justify-between">
                    <span>সেল লিমিট: ${curr.minSell || 5} - ${curr.maxSell || 1000}</span>
                    <span>বাই লিমিট: ${curr.minBuy || 5} - ${curr.maxBuy || 1000}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                  <button
                    onClick={() => {
                      setEditingCurrency(curr);
                      setIsAddingNew(false);
                    }}
                    className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-emerald-400" /> এডিট
                  </button>
                  <button
                    onClick={() => handleDeleteCurrency(curr.id)}
                    className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: ORDER MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" /> কাস্টমার অর্ডার তালিকা ও প্রসেসিং
              </h3>
              <p className="text-xs text-white/50 mt-1">অর্ডার চেক করে সফল (Complete), বাতিল (Cancel) বা ডিলিট করুন।</p>
            </div>

            {/* Filter Buttons */}
            <div className="inline-flex p-1 bg-white/5 rounded-2xl border border-white/5">
              {(['all', 'Pending', 'Success', 'Cancelled'] as const).map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setOrderFilter(filterKey)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                    orderFilter === filterKey
                      ? 'bg-emerald-500 text-white shadow'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  {filterKey === 'all' ? 'সকল' : filterKey === 'Pending' ? 'পেন্ডিং' : filterKey === 'Success' ? 'কমপ্লিট' : 'বাতিল'}
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="ios-glass p-12 rounded-3xl border border-white/10 text-center text-white/50">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-bold text-sm">এই ফিল্টারে কোনো অর্ডার পাওয়া যায়নি</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="ios-glass p-5 rounded-2xl border border-white/10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 hover:border-white/20 transition"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        order.orderType === 'sell' 
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                      }`}>
                        {order.orderType === 'sell' ? 'ডলার সেল (বিক্রি)' : 'ডলার বাই (ক্রয়)'}
                      </span>

                      <span className="text-xs font-bold text-white/40">#{order.id}</span>
                      <span className="text-xs font-bold text-white/60">
                        {new Date(order.time).toLocaleString('bn-BD')}
                      </span>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        order.status === 'Success' 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : order.status === 'Cancelled'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-yellow-500/20 text-yellow-400 animate-pulse'
                      }`}>
                        {order.status === 'Success' ? 'সফল (Completed)' : order.status === 'Cancelled' ? 'বাতিল' : 'পেন্ডিং'}
                      </span>
                    </div>

                    <div className="text-sm font-black text-white flex items-center gap-2">
                      <span>{order.user} ({order.email})</span>
                      <span className="text-white/30">•</span>
                      <span className="text-emerald-400">{order.amountUSD} USD</span>
                      <span className="text-white/30">=</span>
                      <span className="text-cyan-400">{order.amountBDT.toLocaleString('bn-BD')} BDT</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs text-white/70 pt-1">
                      <div>
                        <span className="text-white/40 block text-[10px]">কারেন্সি:</span>
                        <span className="font-bold">{order.method}</span>
                      </div>
                      <div>
                        <span className="text-white/40 block text-[10px]">{order.payoutMethod} নম্বর:</span>
                        <span className="font-mono font-bold text-emerald-400">{order.phone}</span>
                      </div>
                      <div>
                        <span className="text-white/40 block text-[10px]">ট্রানজেকশন আইডি (TxID):</span>
                        <span className="font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded">{order.txid}</span>
                      </div>
                      {order.userReceiveAddress && (
                        <div>
                          <span className="text-white/40 block text-[10px]">ইউজার রিসিভ অ্যাড্রেস:</span>
                          <span className="font-mono font-bold text-cyan-300 truncate block max-w-[200px]" title={order.userReceiveAddress}>
                            {order.userReceiveAddress}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Status Action Buttons */}
                  <div className="flex items-center gap-2 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-white/5 flex-wrap">
                    {/* Direct Chat with Customer */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedChatUserId(order.email);
                        setActiveTab('chat');
                      }}
                      className="px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white text-xs font-black transition cursor-pointer border border-cyan-500/20 flex items-center gap-1.5 active:scale-95 shadow-sm"
                      title="এই ইউজারের সাথে আলাদা চ্যাট করুন"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> চ্যাট করুন
                    </button>

                    {order.status !== 'Success' && (
                      <button
                        type="button"
                        onClick={() => handleOrderStatusChange(order.id, 'Success')}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white text-xs font-black transition cursor-pointer border border-emerald-500/30 flex items-center gap-1.5 active:scale-95 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" /> কমপ্লিট করুন
                      </button>
                    )}

                    {order.status !== 'Cancelled' && (
                      <button
                        type="button"
                        onClick={() => handleOrderStatusChange(order.id, 'Cancelled')}
                        className="px-3.5 py-2 rounded-xl bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-white text-xs font-black transition cursor-pointer border border-yellow-500/20 flex items-center gap-1.5 active:scale-95 shadow-sm"
                      >
                        <X className="w-3.5 h-3.5" /> বাতিল করুন
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteOrder(order.id)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition cursor-pointer border border-rose-500/20 active:scale-90 shadow-sm"
                      title="অর্ডারটি সাথে সাথে ডিলিট করুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MULTI-USER SEPARATE LIVE CHAT INBOX */}
      {activeTab === 'chat' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" /> ইউজার ভিত্তিক লাইভ চ্যাট পোর্টাল
              </h3>
              <p className="text-xs text-white/50 mt-0.5">
                প্রতিটি ইউজারের জন্য আলাদা ইনবক্স। ইউজার সিলেক্ট করে তাদের সাথে পৃথকভাবে কথা বলুন।
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white/70">
                মোট ইউজার: {userThreads.length}
              </span>
              {userThreads.reduce((acc, t) => acc + t.unreadCount, 0) > 0 && (
                <span className="px-3 py-1 rounded-xl bg-rose-500/20 border border-rose-500/30 text-xs font-black text-rose-400 animate-pulse">
                  নতুন মেসেজ: {userThreads.reduce((acc, t) => acc + t.unreadCount, 0)}
                </span>
              )}
            </div>
          </div>

          {/* Dual Panel Chat Layout */}
          <div className="ios-glass rounded-3xl border border-white/10 overflow-hidden grid grid-cols-1 lg:grid-cols-12 h-[640px] bg-[#0c1422]/90 shadow-2xl">
            {/* Left Sidebar: User Conversations List (Col 4 / 12) */}
            <div className="lg:col-span-4 border-r border-white/10 flex flex-col h-full bg-black/25">
              {/* Search User Input */}
              <div className="p-3.5 border-b border-white/10 shrink-0">
                <div className="relative">
                  <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ইউজারের নাম বা ইমেইল খুঁজুন..."
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-emerald-500 transition"
                  />
                  {chatSearchQuery && (
                    <button
                      onClick={() => setChatSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* User Threads List */}
              <div className="flex-1 overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-white/10">
                {userThreads.length === 0 ? (
                  <div className="p-8 text-center text-white/40 space-y-2">
                    <Users className="w-10 h-10 mx-auto opacity-30" />
                    <p className="text-xs font-bold">এখনো কোনো ইউজার মেসেজ দেয়নি</p>
                    <p className="text-[11px] text-white/30">ইউজাররা সাইট থেকে চ্যাট করলেই এখানে তাদের পৃথক নাম প্রদর্শিত হবে।</p>
                  </div>
                ) : (
                  userThreads
                    .filter(t => 
                      t.userName.toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
                      t.userEmail.toLowerCase().includes(chatSearchQuery.toLowerCase())
                    )
                    .map((thread) => {
                      const isSelected = selectedChatUserId === thread.userId;
                      return (
                        <div
                          key={thread.userId}
                          onClick={() => setSelectedChatUserId(thread.userId)}
                          className={`p-3.5 flex items-start gap-3 cursor-pointer transition relative group ${
                            isSelected
                              ? 'bg-emerald-500/15 border-l-4 border-l-emerald-400'
                              : 'hover:bg-white/[0.04]'
                          }`}
                        >
                          {/* User Avatar */}
                          <div className="relative shrink-0 mt-0.5">
                            {thread.userAvatar ? (
                              <img
                                src={thread.userAvatar}
                                alt={thread.userName}
                                referrerPolicy="no-referrer"
                                className="w-10 h-10 rounded-full object-cover border border-white/10"
                              />
                            ) : (
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs border ${
                                isSelected
                                  ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400/50 shadow-md shadow-emerald-500/20'
                                  : 'bg-white/10 text-white/80 border-white/10'
                              }`}>
                                {thread.userName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            {thread.unreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 border-2 border-[#0c1422] animate-ping" />
                            )}
                          </div>

                          {/* User Info & Message Snippet */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <h4 className={`text-xs font-black truncate ${isSelected ? 'text-emerald-300' : 'text-white'}`}>
                                  {thread.userName}
                                </h4>
                                {thread.isBanned && (
                                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[8px] font-black uppercase shrink-0">
                                    BANNED
                                  </span>
                                )}
                              </div>
                              {thread.lastMessage && (
                                <span className="text-[9px] text-white/40 shrink-0 font-mono">
                                  {new Date(thread.lastMessage.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-white/50 truncate font-mono mb-1">
                              {thread.userEmail}
                            </p>

                            <div className="flex items-center justify-between gap-1">
                              <p className="text-[11px] text-white/60 truncate flex-1">
                                {thread.lastMessage ? thread.lastMessage.text : 'চ্যাট শুরু করুন...'}
                              </p>
                              {thread.unreadCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black shrink-0">
                                  {thread.unreadCount}
                                </span>
                              )}
                              {thread.totalOrders > 0 && (
                                <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-emerald-400 text-[9px] font-bold shrink-0">
                                  {thread.totalOrders} অর্ডার
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Right Pane: Selected User's Message Thread (Col 8 / 12) */}
            <div className="lg:col-span-8 flex flex-col h-full bg-[#080e18]/80">
              {(() => {
                const currentThread = userThreads.find(t => t.userId === selectedChatUserId);
                const currentThreadMessages = chatMessages.filter(msg => {
                  if (!selectedChatUserId) return false;
                  return (
                    msg.userId === selectedChatUserId ||
                    msg.targetUserId === selectedChatUserId ||
                    (currentThread?.userEmail && msg.userEmail === currentThread.userEmail)
                  );
                });

                if (!currentThread) {
                  return (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-white/40 space-y-3">
                      <MessageSquare className="w-14 h-14 opacity-20" />
                      <h4 className="text-base font-bold text-white/70">ইউজার চ্যাট নির্বাচন করুন</h4>
                      <p className="text-xs max-w-sm text-white/40">
                        বামের তালিকা থেকে যেকোনো ইউজারের ওপর ক্লিক করে তাদের আলাদা চ্যাট দেখুন এবং মেসেজ পাঠান।
                      </p>
                    </div>
                  );
                }

                return (
                  <>
                    {/* Active Conversation Top Bar */}
                    <div className="p-4 border-b border-white/10 bg-white/[0.02] flex flex-wrap items-center justify-between gap-3 shrink-0">
                      <div className="flex items-center gap-3">
                        {currentThread.userAvatar ? (
                          <img
                            src={currentThread.userAvatar}
                            alt={currentThread.userName}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 rounded-full object-cover border border-emerald-500/40 shadow-md shadow-emerald-500/20"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center font-black text-sm shadow-md">
                            {currentThread.userName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-white">{currentThread.userName}</h4>
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            {currentThread.isBanned ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-black border border-rose-500/40 animate-pulse">
                                অ্যাকাউন্ট ব্যান করা (BANNED)
                              </span>
                            ) : (
                              currentThread.totalOrders > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30">
                                  {currentThread.totalOrders} টি অর্ডার
                                </span>
                              )
                            )}
                          </div>
                          <p className="text-xs text-white/50 font-mono">{currentThread.userEmail}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Quick Scroll Up Button */}
                        <button
                          type="button"
                          onClick={scrollChatToTop}
                          title="উপরে যান (Scroll to Top)"
                          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition active:scale-90 cursor-pointer border border-white/10"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>

                        {/* Quick Scroll Down Button */}
                        <button
                          type="button"
                          onClick={scrollChatToBottom}
                          title="নিচে যান (Scroll to Bottom)"
                          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center justify-center transition active:scale-90 cursor-pointer border border-white/10"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>

                        {/* Ban / Unban User Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (onToggleBanUser) {
                              onToggleBanUser(currentThread.userId || currentThread.userEmail);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border active:scale-95 ${
                            currentThread.isBanned
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30'
                              : 'bg-white/5 text-rose-300/80 border-rose-500/30 hover:bg-rose-500/20 hover:text-white'
                          }`}
                          title={currentThread.isBanned ? 'অ্যাকাউন্ট আনব্যান করুন' : 'অ্যাকাউন্ট ব্যান করুন'}
                        >
                          {currentThread.isBanned ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-300">আনব্যান (Unban)</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-3.5 h-3.5 text-rose-400" />
                              <span>ব্যান করুন (Ban)</span>
                            </>
                          )}
                        </button>

                        {/* Clear Chat Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (onClearUserChat) {
                              onClearUserChat(currentThread.userId, currentThread.userEmail);
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                          title="এই ইউজারের সাথে পূর্বের সব চ্যাট ক্লিয়ার করুন"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>চ্যাট ক্লিয়ার</span>
                        </button>

                        {/* Copy User Email */}
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(currentThread.userEmail);
                            showToast('ইমেইল কপি করা হয়েছে!', 'success');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-white/10"
                        >
                          ইমেইল কপি
                        </button>
                      </div>
                    </div>

                    {/* Messages Body */}
                    <div 
                      ref={chatMessagesContainerRef}
                      className="flex-1 p-5 overflow-y-auto space-y-3.5 scrollbar-thin scrollbar-thumb-white/10 relative"
                    >
                      {currentThreadMessages.length === 0 ? (
                        <div className="text-center text-white/40 py-24 space-y-2">
                          <Sparkles className="w-10 h-10 mx-auto text-emerald-400/40" />
                          <p className="text-sm font-bold text-white/70">{currentThread.userName}-এর সাথে কোনো মেসেজ হিস্ট্রি নেই</p>
                          <p className="text-xs text-white/40">নিচের বক্সে মেসেজ লিখে সরাসরি এই ইউজারকে পাঠান।</p>
                        </div>
                      ) : (
                        currentThreadMessages.map((msg) => {
                          const isAdmin = msg.sender === 'admin';
                          const avatar = msg.userAvatar || currentThread.userAvatar;
                          return (
                            <div
                              key={msg.id}
                              className={`flex items-start gap-2.5 ${isAdmin ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                              {/* Avatar beside message */}
                              <div className="shrink-0 mt-1">
                                {isAdmin ? (
                                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center text-xs font-black shadow-sm">
                                    👑
                                  </div>
                                ) : (
                                  avatar ? (
                                    <img src={avatar} alt="User" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover border border-white/20 shadow-sm" />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 flex items-center justify-center text-[10px] font-black">
                                      {currentThread.userName.charAt(0).toUpperCase()}
                                    </div>
                                  )
                                )}
                              </div>

                              <div className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'} max-w-[85%]`}>
                                <div className="flex items-center gap-2 mb-1 px-1">
                                  <span className={`text-[10px] font-bold ${isAdmin ? 'text-emerald-400' : 'text-cyan-400'}`}>
                                    {isAdmin ? 'অ্যাডমিন (আপনি)' : (msg.senderName || currentThread.userName)}
                                  </span>
                                  <span className="text-[9px] text-white/30 font-mono">
                                    {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>

                                <div className={`p-3.5 rounded-2xl text-xs leading-relaxed break-words shadow-md ${
                                  isAdmin
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-sm'
                                    : 'bg-white/10 border border-white/10 text-white rounded-tl-sm'
                                }`}>
                                  {/* Image attachment if user uploaded photo / screenshot */}
                                  {msg.imageUrl && (
                                    <div 
                                      onClick={() => setPreviewModalUrl(msg.imageUrl!)}
                                      className="mb-2 rounded-xl overflow-hidden border border-white/20 relative group cursor-pointer max-w-[240px]"
                                      title="ছবি বড় করে দেখতে ক্লিক করুন"
                                    >
                                      <img 
                                        src={msg.imageUrl} 
                                        alt="Attachment" 
                                        referrerPolicy="no-referrer"
                                        className="w-full max-h-48 object-cover transition-transform group-hover:scale-105" 
                                      />
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                        <ZoomIn className="w-5 h-5 text-white" />
                                      </div>
                                    </div>
                                  )}
                                  <p>{msg.text}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatMessagesEndRef} />
                    </div>

                    {/* Quick Reply Suggestion Chips */}
                    <div className="px-4 py-2 bg-black/40 border-t border-white/5 flex gap-2 overflow-x-auto scrollbar-none shrink-0">
                      <span className="text-[10px] text-white/40 font-bold self-center shrink-0">কুইক রিপ্লাই:</span>
                      {[
                        'আপনার অর্ডারটি সফলভাবে সম্পন্ন হয়েছে, ওয়ালেট চেক করুন!',
                        'পেমেন্ট ভেরিফাই করা হচ্ছে, ৫ মিনিট অপেক্ষা করুন।',
                        'দয়া করে সঠিক ট্রানজেকশন আইডি (TxID) দিন।',
                        'জরুরি প্রয়োজনে আমাদের হোয়াটসঅ্যাপ নম্বরে মেসেজ দিন।'
                      ].map((chipText, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setAdminReplyText(chipText)}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-300 text-white/60 text-[10px] font-medium whitespace-nowrap transition cursor-pointer border border-white/5 active:scale-95"
                        >
                          {chipText}
                        </button>
                      ))}
                    </div>

                    {/* Bottom Admin Reply Form */}
                    <form onSubmit={handleSendReply} className="p-3.5 bg-black/60 border-t border-white/10 flex gap-2 shrink-0">
                      <input
                        type="text"
                        placeholder={`${currentThread.userName}-কে উত্তর লিখে পাঠান...`}
                        value={adminReplyText}
                        onChange={(e) => setAdminReplyText(e.target.value)}
                        className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:border-emerald-500 transition"
                      />
                      <button
                        type="submit"
                        disabled={!adminReplyText.trim()}
                        className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-white text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 shrink-0"
                      >
                        <Send className="w-4 h-4" />
                        <span>পাঠান</span>
                      </button>
                    </form>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: USERS MANAGEMENT & BAN SYSTEM */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" /> ইউজার ম্যানেজমেন্ট ও ব্যান সিস্টেম (User Accounts)
              </h3>
              <p className="text-xs text-white/50 mt-1">
                সাইটের সকল রেজিস্টার্ড ইউজার ও কাস্টমারদের প্রোফাইল। এখান থেকে সহজে যে কাউকে ১-ক্লিকে ব্যান বা আনব্যান করুন।
              </p>
            </div>

            {/* Quick Summary Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white/80 text-xs font-bold">
                মোট ইউজার: <strong className="text-emerald-400 font-mono">{allUsersList.length}</strong>
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold">
                সক্রিয়: <strong className="text-emerald-400 font-mono">{allUsersList.filter(u => !u.isBanned).length}</strong>
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-bold">
                ব্যান করা: <strong className="text-rose-400 font-mono">{allUsersList.filter(u => u.isBanned).length}</strong>
              </span>
            </div>
          </div>

          {/* Search & Status Filter Toolbar */}
          <div className="ios-glass p-4 rounded-2xl border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0a1120]/70">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="ইউজারের নাম বা Gmail/ইমেইল দিয়ে খুঁজুন..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-emerald-500 transition"
              />
              {userSearchQuery && (
                <button
                  type="button"
                  onClick={() => setUserSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5 shrink-0">
              <button
                type="button"
                onClick={() => setUserFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  userFilter === 'all'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                সব ইউজার ({allUsersList.length})
              </button>
              <button
                type="button"
                onClick={() => setUserFilter('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  userFilter === 'active'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                সক্রিয় ({allUsersList.filter(u => !u.isBanned).length})
              </button>
              <button
                type="button"
                onClick={() => setUserFilter('banned')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  userFilter === 'banned'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                ব্যান করা ({allUsersList.filter(u => u.isBanned).length})
              </button>
            </div>
          </div>

          {/* User Cards / List */}
          {(() => {
            const filteredUsers = allUsersList.filter(u => {
              const matchesSearch = 
                u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                u.id.toLowerCase().includes(userSearchQuery.toLowerCase());
              
              if (!matchesSearch) return false;
              if (userFilter === 'active') return !u.isBanned;
              if (userFilter === 'banned') return u.isBanned;
              return true;
            });

            if (filteredUsers.length === 0) {
              return (
                <div className="ios-glass p-12 rounded-3xl border border-white/10 text-center space-y-3 bg-[#0c1422]/60">
                  <Users className="w-12 h-12 text-white/20 mx-auto" />
                  <h4 className="text-base font-bold text-white/70">কোনো ইউজার পাওয়া যায়নি</h4>
                  <p className="text-xs text-white/40 max-w-sm mx-auto">
                    {userSearchQuery ? `"${userSearchQuery}" দিয়ে কোনো অ্যাকাউন্ট খুঁজে পাওয়া যায়নি।` : 'এখনো কোনো ইউজার সাইটে প্রবেশ করেনি।'}
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id + user.email}
                    className={`ios-glass p-5 rounded-2xl border transition-all duration-200 relative overflow-hidden flex flex-col justify-between space-y-4 ${
                      user.isBanned
                        ? 'border-rose-500/40 bg-gradient-to-br from-[#1e0508]/80 to-[#100305]/80 shadow-lg shadow-rose-950/30'
                        : 'border-white/10 bg-[#0c1422]/70 hover:border-emerald-500/30 shadow-md'
                    }`}
                  >
                    {/* User Top Info */}
                    <div className="flex items-start gap-3.5">
                      {/* Avatar */}
                      <div className="relative shrink-0 mt-0.5">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            referrerPolicy="no-referrer"
                            className={`w-12 h-12 rounded-2xl object-cover border-2 shadow-md ${
                              user.isBanned ? 'border-rose-500/60 shadow-rose-950/50' : 'border-emerald-500/40 shadow-emerald-950/40'
                            }`}
                          />
                        ) : (
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border-2 ${
                            user.isBanned
                              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                              : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          }`}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {user.isBanned && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] shadow">
                            <Ban className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      {/* Name & Email */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-sm font-black text-white truncate">{user.name}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 border ${
                            user.isBanned
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          }`}>
                            {user.isBanned ? 'ব্যান করা' : 'সক্রিয়'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-white/60 font-mono truncate">
                          <Mail className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>

                        {user.createdAt && (
                          <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span>
                              {new Date(user.createdAt).toLocaleDateString([], {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats & Orders Info */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-black/40 border border-white/5 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-white/40 uppercase font-bold block">মোট অর্ডার</span>
                        <span className="text-sm font-black text-white font-mono">{user.totalOrders} টি</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-white/40 uppercase font-bold block">মোট ভলিউম</span>
                        <span className="text-sm font-black text-emerald-400 font-mono">${user.totalAmountUSD.toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Action Buttons: Ban/Unban, Chat, Copy Email */}
                    <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                      {/* 1-Click Ban / Unban Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (onToggleBanUser) {
                            onToggleBanUser(user.id || user.email);
                          }
                        }}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer border active:scale-95 ${
                          user.isBanned
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                        }`}
                      >
                        {user.isBanned ? (
                          <>
                            <UserCheck className="w-4 h-4 text-emerald-400" />
                            <span>আনব্যান করুন (Unban)</span>
                          </>
                        ) : (
                          <>
                            <UserX className="w-4 h-4 text-rose-400" />
                            <span>ব্যান করুন (Ban)</span>
                          </>
                        )}
                      </button>

                      {/* Direct Chat with User */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedChatUserId(user.id || user.email);
                          setActiveTab('chat');
                        }}
                        className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-white/80 hover:text-emerald-300 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-white/10 active:scale-95"
                        title="এই ইউজারের সাথে চ্যাট করুন"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                        <span>চ্যাট</span>
                      </button>

                      {/* Copy Email */}
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(user.email);
                          showToast('ইউজার ইমেইল কপি করা হয়েছে!', 'success');
                        }}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition cursor-pointer border border-white/10 active:scale-95"
                        title="ইমেইল কপি করুন"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 5: SITE SETTINGS & STATS */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-400" /> সাইট সেটিংস ও স্ট্যাটস কনফিগারেশন
            </h3>
            <p className="text-xs text-white/50 mt-1">
              মোট বিনিময় সম্পন্ন, সক্রিয় ক্লায়েন্ট সংখ্যা, নোটিশ বার্তা, বিকাশ ও নগদ নম্বর এবং লোগো পরিবর্তন করুন।
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="ios-glass p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6 bg-[#0c1422]/80">
            {/* Key Platform Stats (Total Exchanged USD & Active Users) */}
            <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
              <h4 className="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> প্ল্যাটফর্ম স্ট্যাটস (হোম পেজে প্রদর্শিত সংখ্যা)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/80">
                    মোট বিনিময় সম্পন্ন ($ USD)
                  </label>
                  <input
                    type="number"
                    required
                    value={settingsForm.totalExchangedUSD}
                    onChange={(e) => setSettingsForm({ ...settingsForm, totalExchangedUSD: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-emerald-400 font-mono text-base font-black focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-white/40">বর্তমানে হোমপেজে দেখায়: ${settingsForm.totalExchangedUSD.toLocaleString()} USD</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/80">
                    সক্রিয় ক্লায়েন্ট সংখ্যা (Active Clients)
                  </label>
                  <input
                    type="number"
                    required
                    value={settingsForm.activeUsersCount}
                    onChange={(e) => setSettingsForm({ ...settingsForm, activeUsersCount: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-teal-400 font-mono text-base font-black focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-white/40">বর্তমানে হোমপেজে দেখায়: {settingsForm.activeUsersCount.toLocaleString()}+ বাংলাদেশি ইউজার</span>
                </div>
              </div>
            </div>

            {/* Site Branding: Logo (Header pic beside Velopay & time) & Favicon */}
            <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
              <div>
                <h4 className="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4" /> সাইট লোগো ও ফেভিকন (Site Logo & Favicon)
                </h4>
                <p className="text-xs text-white/50 mt-1">
                  হেডারে Velopay এবং সময়ের পাশে প্রদর্শিত সাইট লোগো এবং ব্রাউজার ট্যাবের ফেভিকন পরিবর্তন করুন।
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Site Logo Config (velopay ar time ar paser ta) */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-white flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-emerald-400" /> সাইট পিক / লোগো (Site Logo)
                      </span>
                      <span className="text-[10px] text-white/40 block mt-0.5">
                        হেডারে Velopay ও সময়ের পাশে শো হবে
                      </span>
                    </div>
                    {/* Live Preview Box */}
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 overflow-hidden border border-emerald-400/40 shrink-0">
                      {settingsForm.siteLogo ? (
                        <img 
                          src={settingsForm.siteLogo} 
                          alt="Site Logo Preview" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <Bolt className="w-6 h-6 text-white animate-pulse" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/60">লোগো ছবি URL বা সরাসরি আপলোড</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://.../logo.png"
                        value={settingsForm.siteLogo || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, siteLogo: e.target.value })}
                        onBlur={() => onUpdateSettings(settingsForm)}
                        className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
                      />
                      <label className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold cursor-pointer transition flex items-center gap-1.5 shrink-0">
                        <Upload className="w-3.5 h-3.5" />
                        <span>আপলোড</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileUpload(f, 'siteLogo');
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  {settingsForm.siteLogo && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...settingsForm, siteLogo: '' };
                        setSettingsForm(updated);
                        onUpdateSettings(updated);
                        showToast('লোগো মুছে ডিফল্ট আইকন সেট করা হয়েছে!', 'info');
                      }}
                      className="text-[10px] text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> লোগো মুছে ডিফল্ট আইকন রাখুন
                    </button>
                  )}
                </div>

                {/* Favicon Config */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-white flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-cyan-400" /> সাইট ফেভিকন (Site Favicon)
                      </span>
                      <span className="text-[10px] text-white/40 block mt-0.5">
                        ব্রাউজার ট্যাবে এই আইকনটি প্রদর্শিত হবে
                      </span>
                    </div>
                    {/* Live Preview Box */}
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white shadow-md overflow-hidden border border-cyan-400/40 shrink-0 p-1">
                      {settingsForm.siteFavicon ? (
                        <img 
                          src={settingsForm.siteFavicon} 
                          alt="Favicon Preview" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain" 
                        />
                      ) : (
                        <Globe className="w-5 h-5 text-cyan-400" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/60">ফেভিকন ছবি URL বা সরাসরি আপলোড</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://.../favicon.png"
                        value={settingsForm.siteFavicon || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, siteFavicon: e.target.value })}
                        onBlur={() => onUpdateSettings(settingsForm)}
                        className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                      />
                      <label className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-bold cursor-pointer transition flex items-center gap-1.5 shrink-0">
                        <Upload className="w-3.5 h-3.5" />
                        <span>আপলোড</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileUpload(f, 'siteFavicon');
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  {settingsForm.siteFavicon && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...settingsForm, siteFavicon: '' };
                        setSettingsForm(updated);
                        onUpdateSettings(updated);
                        showToast('ফেভিকন মুছে ডিফল্ট রাখা হয়েছে!', 'info');
                      }}
                      className="text-[10px] text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> ফেভিকন মুছে ডিফল্ট রাখুন
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* bKash & Nagad Numbers and Logos */}
            <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400" /> বিকাশ ও নগদ পেমেন্ট নম্বর এবং কাস্টম লোগো
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* bKash Config */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-pink-400">বিকাশ (bKash) সেটিংস</span>
                    <div className="w-9 h-9 rounded-full aspect-square overflow-hidden border-2 border-pink-500/40 bg-white p-0.5 shadow-sm flex items-center justify-center shrink-0">
                      {settingsForm.bkashLogo ? (
                        <img src={settingsForm.bkashLogo} alt="bKash" referrerPolicy="no-referrer" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#E2136E] to-pink-500 text-white text-[9px] font-black flex items-center justify-center">
                          bKash
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/60">বিকাশ পার্সোনাল নম্বর (ডলার বাইয়ের জন্য)</label>
                    <input
                      type="text"
                      value={settingsForm.adminBkashNumber}
                      onChange={(e) => setSettingsForm({ ...settingsForm, adminBkashNumber: e.target.value })}
                      onBlur={() => onUpdateSettings(settingsForm)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/60">বিকাশ কাস্টম লোগো URL বা আপলোড</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://.../bkash.png"
                        value={settingsForm.bkashLogo || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, bkashLogo: e.target.value })}
                        onBlur={() => onUpdateSettings(settingsForm)}
                        className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono"
                      />
                      <label className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold cursor-pointer transition flex items-center gap-1">
                        <Upload className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileUpload(f, 'bkash');
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  {settingsForm.bkashLogo && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...settingsForm, bkashLogo: '' };
                        setSettingsForm(updated);
                        onUpdateSettings(updated);
                        showToast('বিকাশ লোগো মুছে ডিফল্ট রাখা হয়েছে!', 'info');
                      }}
                      className="text-[10px] text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> বিকাশ লোগো মুছে ডিফল্ট রাখুন
                    </button>
                  )}
                </div>

                {/* Nagad Config */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-orange-400">নগদ (Nagad) সেটিংস</span>
                    <div className="w-9 h-9 rounded-full aspect-square overflow-hidden border-2 border-orange-500/40 bg-white p-0.5 shadow-sm flex items-center justify-center shrink-0">
                      {settingsForm.nagadLogo ? (
                        <img src={settingsForm.nagadLogo} alt="Nagad" referrerPolicy="no-referrer" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#F7941D] to-orange-500 text-white text-[9px] font-black flex items-center justify-center">
                          Nagad
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/60">নগদ পার্সোনাল নম্বর (ডলার বাইয়ের জন্য)</label>
                    <input
                      type="text"
                      value={settingsForm.adminNagadNumber}
                      onChange={(e) => setSettingsForm({ ...settingsForm, adminNagadNumber: e.target.value })}
                      onBlur={() => onUpdateSettings(settingsForm)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/60">নগদ কাস্টম লোগো URL বা আপলোড</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="https://.../nagad.png"
                        value={settingsForm.nagadLogo || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, nagadLogo: e.target.value })}
                        onBlur={() => onUpdateSettings(settingsForm)}
                        className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-mono"
                      />
                      <label className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold cursor-pointer transition flex items-center gap-1">
                        <Upload className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFileUpload(f, 'nagad');
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  {settingsForm.nagadLogo && (
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...settingsForm, nagadLogo: '' };
                        setSettingsForm(updated);
                        onUpdateSettings(updated);
                        showToast('নগদ লোগো মুছে ডিফল্ট রাখা হয়েছে!', 'info');
                      }}
                      className="text-[10px] text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> নগদ লোগো মুছে ডিফল্ট রাখুন
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Announcement Notice & WhatsApp */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-white/80">নোটিশ / ঘোষণা বার্তা (স্ক্রল ব্যানার)</label>
                <textarea
                  rows={2}
                  value={settingsForm.notice}
                  onChange={(e) => setSettingsForm({ ...settingsForm, notice: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs leading-relaxed focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/80">হোয়াটসঅ্যাপ নম্বর (কান্ট্রি কোড সহ)</label>
                <input
                  type="text"
                  placeholder="8801700000000"
                  value={settingsForm.whatsapp}
                  onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Admin Portal Credentials (Email + Password + PIN) */}
            <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
              <div>
                <h4 className="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-4 h-4" /> অ্যাডমিন পোর্টাল লগইন তথ্য (Admin Credentials)
                </h4>
                <p className="text-xs text-white/50 mt-1">
                  অ্যাডমিন প্যানেলে প্রবেশের ইমেইল এবং পাসওয়ার্ড পরিবর্তন করুন।
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/80">অ্যাডমিন ইমেইল</label>
                  <input
                    type="email"
                    required
                    placeholder="trxrafiff@gmail.com"
                    value={settingsForm.adminEmail || 'trxrafiff@gmail.com'}
                    onChange={(e) => setSettingsForm({ ...settingsForm, adminEmail: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/80">অ্যাডমিন পাসওয়ার্ড (Firebase / Local)</label>
                  <input
                    type="text"
                    placeholder="আপনার গোপন পাসওয়ার্ড লিখুন"
                    value={settingsForm.adminPassword || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, adminPassword: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-emerald-400 text-sm font-mono font-bold focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/80">অ্যাডমিন ব্যাকআপ পিন</label>
                  <input
                    type="text"
                    placeholder="1234"
                    value={settingsForm.adminPin || '1234'}
                    onChange={(e) => setSettingsForm({ ...settingsForm, adminPin: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-4 border-t border-white/10">
              <button
                type="submit"
                className="px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-sm transition cursor-pointer shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center gap-2"
              >
                <Check className="w-5 h-5" /> সকল সেটিংস সেভ করুন
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lightbox Preview Modal for Chat Images */}
      {previewModalUrl && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div
            className="relative max-w-2xl max-h-[85vh] bg-[#0c1420] rounded-2xl overflow-hidden border border-white/20 p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewModalUrl(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={previewModalUrl}
              alt="Screenshot"
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
