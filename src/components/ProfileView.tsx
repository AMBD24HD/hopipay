import { useState, useRef } from 'react';
import { Order, User } from '../types';
import { 
  LogOut, 
  ShieldCheck, 
  User as UserIcon, 
  Package, 
  RefreshCw,
  Clock, 
  Phone, 
  CheckCircle2,
  Camera,
  Loader2,
  Ban,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { uploadImageToImgBB } from '../utils/imgbb';

interface ProfileViewProps {
  user: User;
  orders: Order[];
  onSignOut: () => void;
  showToast: (text: string, type: 'success' | 'error' | 'info') => void;
  mode?: 'all' | 'profile' | 'orders';
  onNavigate?: (view: 'home' | 'order' | 'order-list' | 'profile' | 'admin') => void;
  whatsapp?: string;
  onUpdateAvatar?: (avatarUrl: string) => void;
}

export default function ProfileView({ 
  user, 
  orders, 
  onSignOut, 
  showToast, 
  mode = 'all',
  onNavigate,
  whatsapp = '8801604366679',
  onUpdateAvatar
}: ProfileViewProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSignOut = () => {
    onSignOut();
    showToast('সফলভাবে লগআউট করা হয়েছে!', 'info');
  };

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    // Reset input so re-selecting same file triggers onChange
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      showToast('অনুগ্রহ করে একটি ইমেজ ফাইল (JPG, PNG, WebP) সিলেক্ট করুন', 'error');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showToast('ছবির সাইজ ১৫ মেগাবাইট এর বেশি হতে পারবে না', 'error');
      return;
    }

    setIsUploading(true);
    showToast('ছবি আপলোড হচ্ছে...', 'info');

    try {
      const uploadedUrl = await uploadImageToImgBB(file);
      if (onUpdateAvatar) {
        onUpdateAvatar(uploadedUrl);
      }
      showToast('প্রোফাইল ছবি সফলভাবে আপলোড করা হয়েছে!', 'success');
    } catch (err: any) {
      console.error('Upload error:', err);
      showToast(err?.message || 'ছবি আপলোড করতে ব্যর্থ হয়েছে', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusStyle = (status: Order['status']) => {
    switch (status) {
      case 'Success':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'Cancelled':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      default:
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    }
  };

  const getStatusText = (status: Order['status']) => {
    switch (status) {
      case 'Success':
        return 'সম্পন্ন';
      case 'Cancelled':
        return 'বাতিল';
      default:
        return 'অপেক্ষমান';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Hidden File Input for Avatar Upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleAvatarFileSelect} 
        accept="image/png, image/jpeg, image/webp, image/gif" 
        className="hidden" 
      />

      {/* 1. TOP USER CARD (Matching site's emerald-cyan dark glass theme) */}
      {(mode === 'all' || mode === 'profile') && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="ios-glass p-5 sm:p-7 rounded-[26px] border border-emerald-500/20 bg-[#070e17]/85 relative overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.5)]"
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 left-1/4 w-72 h-36 bg-emerald-500/10 blur-3xl pointer-events-none -z-10" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
            {/* Left: Avatar with center upload icon & User Info */}
            <div className="flex items-center gap-4 text-center sm:text-left w-full sm:w-auto flex-col sm:flex-row">
              {/* Glowing Circular Avatar with Centered Camera */}
              <div className="relative shrink-0 group">
                <div 
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  title="ছবি আপলোড করতে ক্লিক করুন"
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 bg-gradient-to-tr from-emerald-500/50 via-cyan-500/30 to-emerald-400/50 shadow-[0_0_24px_rgba(16,185,129,0.25)] flex items-center justify-center cursor-pointer transition-all duration-300 group-hover:scale-105"
                  style={{ borderRadius: '9999px' }}
                >
                  <div 
                    className="w-full h-full rounded-full bg-[#03070d] overflow-hidden flex items-center justify-center relative border border-white/15"
                    style={{ borderRadius: '9999px', WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
                  >
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover rounded-full" 
                        style={{ borderRadius: '9999px' }}
                      />
                    ) : (
                      <>
                        {/* Event horizon nebula glow default background */}
                        <div 
                          className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.9)_0%,rgba(16,185,129,0.5)_25%,rgba(6,11,18,0.95)_70%,#03070d_100%)] opacity-80" 
                          style={{ borderRadius: '9999px' }}
                        />
                        
                        {/* Center Camera Icon when no avatar is set - 100% round */}
                        <div className="relative z-10 flex flex-col items-center justify-center text-center">
                          <div 
                            className="w-10 h-10 rounded-full bg-emerald-500/25 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)] group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-[#03070d] transition-all duration-200"
                            style={{ borderRadius: '9999px' }}
                          >
                            <Camera className="w-4 h-4" />
                          </div>
                          <span className="text-[8px] text-white/90 font-bold mt-1 tracking-tight">ছবি দিন</span>
                        </div>
                      </>
                    )}

                    {/* Uploading Overlay in Middle - 100% round */}
                    {isUploading && (
                      <div 
                        className="absolute inset-0 rounded-full bg-black/85 flex flex-col items-center justify-center z-20 gap-1"
                        style={{ borderRadius: '9999px' }}
                      >
                        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                        <span className="text-[8px] text-emerald-400 font-bold">আপলোড হচ্ছে...</span>
                      </div>
                    )}

                    {/* Hover Overlay with Center Camera Icon when Avatar is already present - 100% round */}
                    {user.avatar && !isUploading && (
                      <div 
                        className="absolute inset-0 rounded-full bg-black/65 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity duration-200 z-10"
                        style={{ borderRadius: '9999px' }}
                      >
                        <div 
                          className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-[#03070d] shadow-lg mb-0.5 group-hover:scale-105 transition-transform"
                          style={{ borderRadius: '9999px' }}
                        >
                          <Camera className="w-4 h-4" />
                        </div>
                        <span className="text-[8px] text-white font-bold tracking-tight">ছবি পরিবর্তন</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Verified Shield Icon Badge (Bottom-Right of Avatar) */}
                <div className="absolute bottom-0 right-0 bg-[#070e17] p-0.5 rounded-full z-20">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-sm" title="Verified Account">
                    <ShieldCheck className="w-3 h-3 fill-emerald-500/30" />
                  </div>
                </div>
              </div>

              {/* User Details & Action buttons */}
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center sm:justify-start gap-1.5">
                  <UserIcon className="w-5 h-5 text-emerald-400 inline" /> {user.name}
                </h3>
                <p className="text-xs sm:text-sm text-white/60 font-medium">
                  ইমেইল: <span className="text-white/80">{user.email}</span>
                </p>

                <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  {user.isBanned ? (
                    <span className="bg-rose-500/20 border border-rose-500/50 text-rose-300 text-[11px] font-black px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-lg shadow-rose-950/50 animate-pulse">
                      <Ban className="w-3.5 h-3.5 text-rose-400" /> অ্যাকাউন্ট ব্যান করা (BANNED)
                    </span>
                  ) : (
                    <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Verified Account
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Logout Button */}
            <div className="flex items-center justify-center sm:justify-end w-full sm:w-auto">
              <button
                onClick={handleSignOut}
                className="px-5 py-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center gap-2 transition active:scale-95 cursor-pointer shadow-lg"
              >
                <LogOut className="w-4 h-4" /> লগআউট (Logout)
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Prominent Red Alert Card if User Account is Banned */}
      {user.isBanned && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-5 sm:p-6 rounded-[24px] bg-gradient-to-r from-rose-950/95 via-[#23050a]/95 to-[#150205]/95 border-2 border-rose-500/60 shadow-2xl shadow-rose-950/80 flex items-start gap-4 text-rose-100 relative overflow-hidden"
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 shadow-inner mt-0.5">
            <Ban className="w-6 h-6 text-rose-400" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-base sm:text-lg font-black text-rose-300 tracking-tight">
                আপনার অ্যাকাউন্টটি সাময়িকভাবে ব্যান/স্থগিত করা হয়েছে (Account Banned)
              </h4>
              <span className="px-2 py-0.5 rounded-md bg-rose-500 text-white font-black text-[10px] tracking-wider uppercase">
                সব সার্ভিস বন্ধ
              </span>
            </div>
            <p className="text-xs sm:text-sm text-rose-200/90 font-medium leading-relaxed">
              অ্যাডমিন কর্তৃপক্ষ কর্তৃক এই অ্যাকাউন্টটি স্থগিত রাখা হয়েছে। ফলে সকল নতুন ডলার ক্রয়-বিক্রয় ও লেনদেন সাময়িকভাবে বন্ধ আছে। অ্যাকাউন্ট সম্পর্কিত সহায়তার জন্য লাইভ চ্যাটে অ্যাডমিনের সাথে কথা বলুন।
            </p>
          </div>
        </motion.div>
      )}

      {/* 2. ACTION CARDS ROW (Orders & Trade - themed in emerald/cyan glass) */}
      {(mode === 'all' || mode === 'profile') && (
        <div className="grid grid-cols-2 gap-4">
          {/* Orders Card */}
          <motion.div
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate ? onNavigate('order-list') : null}
            className="ios-glass p-5 sm:p-6 rounded-[24px] border border-emerald-500/20 hover:border-emerald-400/40 bg-[#070e17]/80 transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-3 shadow-lg group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
            <div className="w-13 h-13 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center group-hover:bg-emerald-500/20 group-hover:border-emerald-500/50 group-hover:scale-105 transition-all shadow-inner">
              <Package className="w-6 h-6 text-emerald-400 transition" />
            </div>
            <div>
              <span className="text-sm sm:text-base font-black text-white group-hover:text-emerald-400 transition block">
                অর্ডার (Orders)
              </span>
            </div>
          </motion.div>

          {/* Trade Card (ট্রেড - Opens Trade View on Click) */}
          <motion.div
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate ? onNavigate('order') : null}
            className="ios-glass p-5 sm:p-6 rounded-[24px] border border-cyan-500/20 hover:border-cyan-400/40 bg-[#070e17]/80 transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-3 shadow-lg group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
            <div className="w-13 h-13 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center group-hover:bg-cyan-500/20 group-hover:border-cyan-500/50 group-hover:scale-105 transition-all shadow-inner">
              <RefreshCw className="w-6 h-6 text-cyan-400 group-hover:rotate-180 transition-all duration-500" />
            </div>
            <div>
              <span className="text-sm sm:text-base font-black text-white group-hover:text-cyan-400 transition block">
                ট্রেড (Trade)
              </span>
            </div>
          </motion.div>
        </div>
      )}

      {/* 3. SUPPORT & INFO BOX (সহায়তা ও তথ্য - Themed perfectly with emerald/cyan) */}
      {(mode === 'all' || mode === 'profile') && (
        <div className="ios-glass p-6 sm:p-7 rounded-[26px] border border-emerald-500/20 bg-[#070e17]/85 space-y-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h4 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              সহায়তা ও তথ্য (Support & Info)
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-white/70 pt-1">
            {/* Operation Time */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-[11px] text-white/40 uppercase font-black tracking-wider">অপারেশন সময়</p>
                <p className="text-white font-bold text-xs sm:text-sm mt-0.5">
                  সকাল ১০:০০ টা থেকে রাত ১০:০০ টা (প্রতিদিন)
                </p>
              </div>
            </div>

            {/* Helpline Number */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-[11px] text-white/40 uppercase font-black tracking-wider">হেল্পলাইন ও সাপোর্ট নম্বর</p>
                <p className="text-emerald-400 font-mono font-black text-xs sm:text-sm mt-0.5">
                  01604366679
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. ORDERS LIST SECTION (When viewing in 'orders' mode or in 'all') */}
      {(mode === 'all' || mode === 'orders') && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-400" /> অর্ডার হিস্ট্রি
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.length === 0 ? (
              <div className="col-span-full py-14 text-center ios-glass rounded-[24px] border border-emerald-500/15 bg-[#070e17]/80 space-y-3">
                <Package className="w-10 h-10 text-white/20 mx-auto" />
                <p className="text-sm font-semibold text-white/40">আপনি এখনো কোনো অর্ডার করেননি</p>
                <p className="text-xs text-white/30 max-w-xs mx-auto">
                  বাই-সেল শুরু করুন, আপনার সমস্ত অর্ডার হিস্ট্রি এখানে সংরক্ষিত থাকবে।
                </p>
              </div>
            ) : (
              orders.map((order, idx) => {
                const isBuy = order.orderType === 'buy';
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="ios-glass p-5 rounded-2xl border border-emerald-500/15 bg-[#070e17]/85 flex justify-between items-center hover:border-emerald-500/30 transition-all shadow-md group relative overflow-hidden"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isBuy ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {isBuy ? 'বাই' : 'সেল'}
                        </span>
                        <h4 className="text-sm sm:text-base font-black text-white tracking-tight">
                          {order.method}
                        </h4>
                      </div>
                      
                      <p className={`text-xs font-black ${isBuy ? 'text-cyan-400' : 'text-emerald-400'}`}>
                        ৳ {order.amountBDT.toLocaleString('bn-BD', { minimumFractionDigits: 1 })} BDT
                      </p>
                      <p className="text-[10px] text-white/50 font-bold">
                        পরিমাণ: ${order.amountUSD} • {isBuy ? 'প্রেরক' : 'প্রাপক'}: {order.phone}
                      </p>
                      {isBuy && order.userReceiveAddress && (
                        <p className="text-[10px] text-cyan-400 font-semibold break-all">
                          রিসিভ ঠিকানা: {order.userReceiveAddress}
                        </p>
                      )}
                      <p className="text-[10px] text-white/40 font-mono select-all">
                        TxID: {order.txid}
                      </p>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1.5">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full border ${getStatusStyle(order.status)} uppercase tracking-wider`}>
                        {getStatusText(order.status)}
                      </span>
                      <span className="text-[9px] text-white/30 font-bold">
                        {new Date(order.time).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
