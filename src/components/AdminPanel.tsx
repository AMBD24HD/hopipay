import { useState, useEffect } from 'react';
import { Currency, Order, AdminSettings, ChatMessage } from '../types';
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
  Bolt
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { uploadImageToImgBB } from '../utils/imgbb';
import { renderCurrencyVisual } from './CurrencyList';

interface AdminPanelProps {
  currencies: Currency[];
  orders: Order[];
  adminSettings: AdminSettings;
  chatMessages: ChatMessage[];
  onUpdateCurrencies: (currencies: Currency[]) => void;
  onUpdateOrders: (orders: Order[]) => void;
  onUpdateSettings: (settings: AdminSettings) => void;
  onDeleteOrder?: (id: string) => void;
  onDeleteCurrency?: (id: string) => void;
  onSendAdminChatMessage: (text: string, userEmail?: string) => void;
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
  onUpdateCurrencies,
  onUpdateOrders,
  onUpdateSettings,
  onDeleteOrder,
  onDeleteCurrency,
  onSendAdminChatMessage,
  onCloseAdmin,
  onLogoutAdmin,
  showToast
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'currencies' | 'orders' | 'settings' | 'chat'>('currencies');
  const [orderFilter, setOrderFilter] = useState<'all' | 'Pending' | 'Success' | 'Cancelled'>('all');
  const [adminReplyText, setAdminReplyText] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Editing state for currencies
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<AdminSettings>(adminSettings);

  // Sync settingsForm whenever adminSettings prop updates (e.g. from Firestore)
  useEffect(() => {
    setSettingsForm(adminSettings);
  }, [adminSettings]);

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

  const handleDeleteOrder = (orderId: string) => {
    if (confirm('আপনি কি নিশ্চিত এই অর্ডারটি মুছে ফেলতে চান?')) {
      const updatedOrders = orders.filter(o => o.id !== orderId);
      onUpdateOrders(updatedOrders);
      if (onDeleteOrder) {
        onDeleteOrder(orderId);
      }
      showToast('অর্ডার সফলভাবে ডিলিট করা হয়েছে!', 'success');
    }
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
    onSendAdminChatMessage(adminReplyText.trim());
    setAdminReplyText('');
    showToast('মেসেজ পাঠানো হয়েছে!', 'success');
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
                  <div className="flex items-center gap-2 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-white/5">
                    {order.status !== 'Success' && (
                      <button
                        onClick={() => handleOrderStatusChange(order.id, 'Success')}
                        className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white text-xs font-black transition cursor-pointer border border-emerald-500/30 flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" /> কমপ্লিট করুন
                      </button>
                    )}

                    {order.status !== 'Cancelled' && (
                      <button
                        onClick={() => handleOrderStatusChange(order.id, 'Cancelled')}
                        className="px-3.5 py-2 rounded-xl bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-white text-xs font-black transition cursor-pointer border border-yellow-500/20 flex items-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" /> বাতিল করুন
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteOrder(order.id)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition cursor-pointer border border-rose-500/20"
                      title="ডিলিট করুন"
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

      {/* TAB 3: LIVE CHAT INBOX */}
      {activeTab === 'chat' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" /> লাইভ সাপোর্ট চ্যাট ইনবক্স
            </h3>
            <p className="text-xs text-white/50 mt-1">ইউজারদের মেসেজের সরাসরি উত্তর দিন। মেসেজ সাইটের লাইভ চ্যাটে প্রদর্শিত হবে।</p>
          </div>

          <div className="ios-glass rounded-3xl border border-white/10 overflow-hidden flex flex-col h-[550px] bg-[#0c1422]/80">
            {/* Messages Display */}
            <div className="flex-1 p-6 overflow-y-auto space-y-3.5 scrollbar-thin scrollbar-thumb-white/10">
              {chatMessages.length === 0 ? (
                <div className="text-center text-white/40 py-20">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="font-bold">এখনও কোনো লাইভ মেসেজ আসেনি</p>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isAdmin = msg.sender === 'admin';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-[10px] font-bold text-white/50">
                          {isAdmin ? 'অ্যাডমিন (আপনি)' : `${msg.senderName} (${msg.userEmail})`}
                        </span>
                        <span className="text-[9px] text-white/30">
                          {new Date(msg.time).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isAdmin
                          ? 'bg-emerald-600 text-white rounded-tr-sm shadow-md'
                          : 'bg-white/10 border border-white/10 text-white rounded-tl-sm'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Admin Quick Reply Box */}
            <form onSubmit={handleSendReply} className="p-4 bg-black/50 border-t border-white/10 flex gap-3">
              <input
                type="text"
                placeholder="এখানে উত্তর লিখে সেন্ড করুন..."
                value={adminReplyText}
                onChange={(e) => setAdminReplyText(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/40 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={!adminReplyText.trim()}
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Send className="w-4 h-4" /> উত্তর পাঠান
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: SITE SETTINGS & STATS */}
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
    </div>
  );
}
