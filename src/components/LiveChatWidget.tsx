import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles, Headphones } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage, AdminSettings } from '../types';

interface LiveChatWidgetProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, userId?: string, userName?: string, userEmail?: string) => void;
  adminSettings: AdminSettings;
  currentUser?: { id?: string; name: string; email: string; avatar?: string } | null;
}

export default function LiveChatWidget({
  messages,
  onSendMessage,
  adminSettings,
  currentUser
}: LiveChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Generate persistent guest ID if user is not logged in
  const [guestId] = useState<string>(() => {
    let gid = localStorage.getItem('velopay_chat_guest_id');
    if (!gid) {
      gid = 'guest_' + Math.floor(Math.random() * 90000 + 10000);
      localStorage.setItem('velopay_chat_guest_id', gid);
    }
    return gid;
  });

  const effectiveUserId = currentUser?.id || currentUser?.email || guestId;
  const effectiveUserName = currentUser?.name || 'গেস্ট কাস্টমার';
  const effectiveUserEmail = currentUser?.email || `${guestId}@guest.velopay.com`;

  // Filter messages so this user ONLY sees their own chat with Admin
  const myMessages = messages.filter((msg) => {
    const isFromMe = msg.userId === effectiveUserId || (currentUser?.email && msg.userEmail === currentUser.email);
    const isTargetedToMe = msg.targetUserId === effectiveUserId || (currentUser?.email && msg.userEmail === currentUser.email);
    return isFromMe || isTargetedToMe;
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0);
    } else {
      const unread = myMessages.filter(m => m.sender === 'admin' && !m.read).length;
      setUnreadCount(unread);
    }
  }, [isOpen, myMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim(), effectiveUserId, effectiveUserName, effectiveUserEmail);
    setInputText('');
  };

  return (
    <>
      {/* Floating Chat Trigger Button - Placed on the right side and slightly higher as requested */}
      <div className="fixed bottom-28 sm:bottom-30 md:bottom-10 right-4 sm:right-6 z-40">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="অ্যাডমিন সাপোর্ট"
          id="admin-support-chat-button"
          className={`relative px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full text-white shadow-2xl flex items-center gap-2 backdrop-blur-md cursor-pointer select-none transition-all duration-300 border ${
            adminSettings.online
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/70 border-emerald-300/35'
              : 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-500 hover:from-rose-500 hover:to-red-500 shadow-rose-950/70 border-rose-300/40'
          }`}
        >
          {/* Light Dot and Headphone Icon together (closely placed with gap-1.5) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* 1. Green / Red status light (ota faste, close to icon) */}
            <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0 items-center justify-center">
              {adminSettings.online ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-300 shadow-sm shadow-emerald-300" />
                </>
              ) : (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
                  <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-white shadow-sm shadow-white" />
                </>
              )}
            </span>

            {/* 2. Headphone Icon */}
            <div className="shrink-0 flex items-center justify-center">
              {isOpen ? (
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              ) : (
                <Headphones className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              )}
            </div>
          </div>

          {/* 3. Bengali text: অ্যাডমিন সাপোর্ট */}
          <span className="text-xs sm:text-sm font-black tracking-wide whitespace-nowrap drop-shadow-sm">
            অ্যাডমিন সাপোর্ট
          </span>

          {/* Unread Message Counter Badge */}
          {unreadCount > 0 && !isOpen && (
            <span className={`ml-0.5 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border border-black/40 shadow-sm animate-bounce ${
              adminSettings.online ? 'bg-rose-500' : 'bg-amber-400 text-black'
            }`}>
              {unreadCount}
            </span>
          )}
        </motion.button>
      </div>

      {/* Live Chat Window Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Backdrop overlay to prevent background scroll confusion on small screens */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-xs z-45 md:hidden"
              onClick={() => setIsOpen(false)}
            />

            {/* Chat Box: Opens in Center on Mobile, Right-aligned on Desktop */}
            <motion.div
              initial={{ opacity: 0, y: 25, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 26, stiffness: 360 }}
              className={`fixed bottom-40 md:bottom-24 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 right-auto md:right-6 z-50 w-[calc(100vw-32px)] max-w-sm sm:w-96 h-[480px] max-h-[70vh] rounded-3xl bg-[#08121a]/95 backdrop-blur-2xl border shadow-2xl flex flex-col overflow-hidden text-white ${
                adminSettings.online ? 'border-emerald-500/25 shadow-emerald-950/40' : 'border-rose-500/30 shadow-rose-950/50'
              }`}
            >
              {/* Header */}
              <div className={`p-4 bg-gradient-to-r ${
                adminSettings.online
                  ? 'from-emerald-950/80 via-teal-950/60 to-slate-900/90'
                  : 'from-rose-950/80 via-red-950/60 to-slate-900/90'
              } border-b border-white/10 flex items-center justify-between shrink-0`}>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-black ${
                      adminSettings.online
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                    }`}>
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-[#08121a] ${
                        adminSettings.online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500 animate-pulse'
                      }`}
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                      অ্যাডমিন সাপোর্ট
                    </h4>
                    <p className={`text-[10px] font-bold flex items-center gap-1.5 ${
                      adminSettings.online ? 'text-white/60' : 'text-rose-400 font-bold'
                    }`}>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          adminSettings.online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500 animate-pulse'
                        }`}
                      />
                      {adminSettings.online
                        ? 'অ্যাডমিন অনলাইনে আছেন'
                        : 'অ্যাডমিন বর্তমানে অফলাইনে আছেন'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-white/10">
                {/* Default Welcome Message */}
                <div className="flex items-start gap-2.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border ${
                    adminSettings.online
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  }`}>
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="max-w-[85%] bg-white/5 border border-white/10 p-3 rounded-2xl rounded-tl-sm text-xs leading-relaxed text-white/90">
                    <p className={`font-bold text-[10px] mb-1 ${adminSettings.online ? 'text-emerald-400' : 'text-rose-400'}`}>
                      অ্যাডমিন সাপোর্ট
                    </p>
                    স্বাগতম! Velopay অ্যাডমিন সাপোর্টে যেকোনো জিজ্ঞাসা বা অর্ডার সমস্যা সম্পর্কে সরাসরি মেসেজ দিন।
                  </div>
                </div>

                {/* Dynamic Messages */}
                {myMessages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                          isUser
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : (adminSettings.online ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30')
                        }`}
                      >
                        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                      </div>

                      <div
                        className={`max-w-[82%] p-3 rounded-2xl text-xs leading-relaxed ${
                          isUser
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-sm shadow-md'
                            : 'bg-white/10 border border-white/10 text-white/95 rounded-tl-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-[9px] font-black opacity-75">
                            {isUser ? (currentUser?.name || 'আপনি') : 'অ্যাডমিন'}
                          </span>
                          <span className="text-[8px] opacity-60">
                            {new Date(msg.time).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="break-words">{msg.text}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Form */}
              <form
                onSubmit={handleSend}
                className="p-3 bg-black/40 border-t border-white/10 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  placeholder="মেসেজ লিখুন..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className={`flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none transition ${
                    adminSettings.online ? 'focus:border-emerald-500' : 'focus:border-rose-500'
                  }`}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className={`w-10 h-10 rounded-xl text-white flex items-center justify-center transition cursor-pointer shadow-md disabled:opacity-40 ${
                    adminSettings.online
                      ? 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20'
                      : 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/20'
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
