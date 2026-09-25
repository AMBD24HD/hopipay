import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles, Headphones, Paperclip, Image as ImageIcon, Loader2, ZoomIn, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatMessage, AdminSettings } from '../types';
import { uploadImageToImgBB } from '../utils/imgbb';

interface LiveChatWidgetProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, userId?: string, userName?: string, userEmail?: string, imageUrl?: string, userAvatar?: string) => void;
  adminSettings: AdminSettings;
  currentUser?: { id?: string; name: string; email: string; avatar?: string } | null;
  isOpenControlled?: boolean;
  onToggleControlled?: (open: boolean) => void;
  onRequireAuth?: () => void;
  isBanned?: boolean;
}

export default function LiveChatWidget({
  messages,
  onSendMessage,
  adminSettings,
  currentUser,
  isOpenControlled,
  onToggleControlled,
  onRequireAuth,
  isBanned = false
}: LiveChatWidgetProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = isOpenControlled !== undefined ? isOpenControlled : internalIsOpen;
  const setIsOpen = (val: boolean) => {
    if (val && !currentUser && onRequireAuth) {
      onRequireAuth();
      return;
    }
    setInternalIsOpen(val);
    if (onToggleControlled) onToggleControlled(val);
  };

  const [inputText, setInputText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const scrollToTop = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
    if (!inputText.trim() && !selectedImagePreview) return;
    onSendMessage(
      inputText.trim() || '📷 ছবি/স্ক্রিনশট', 
      effectiveUserId, 
      effectiveUserName, 
      effectiveUserEmail,
      selectedImagePreview || undefined,
      currentUser?.avatar
    );
    setInputText('');
    setSelectedImagePreview(null);
  };

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      alert('অনুগ্রহ করে একটি ছবি ফাইল (JPG, PNG, WebP) নির্বাচন করুন');
      return;
    }

    setIsUploadingImage(true);
    try {
      const uploadedUrl = await uploadImageToImgBB(file);
      setSelectedImagePreview(uploadedUrl);
    } catch (err: any) {
      console.error('Chat image upload error:', err);
      alert(err?.message || 'ছবি আপলোড করতে ব্যর্থ হয়েছে!');
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <>
      {/* Floating Chat Trigger Button - Placed on the right side and slightly higher as requested */}
      <div className="fixed bottom-28 sm:bottom-30 md:bottom-10 right-4 sm:right-6 z-40">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isBanned ? 'লাইভ চ্যাট' : 'অ্যাডমিন সাপোর্ট'}
          id="admin-support-chat-button"
          className={`relative px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full text-white shadow-2xl flex items-center gap-2 backdrop-blur-md cursor-pointer select-none transition-all duration-300 border ${
            isBanned || !adminSettings.online
              ? 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-500 hover:from-rose-500 hover:to-red-500 shadow-rose-950/70 border-rose-300/40'
              : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/70 border-emerald-300/35'
          }`}
        >
          {/* Light Dot and Headphone Icon together */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0 items-center justify-center">
              {isBanned || !adminSettings.online ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
                  <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-white shadow-sm shadow-white" />
                </>
              ) : (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-300 shadow-sm shadow-emerald-300" />
                </>
              )}
            </span>

            <div className="shrink-0 flex items-center justify-center">
              {isOpen ? (
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              ) : (
                <Headphones className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              )}
            </div>
          </div>

          <span className="text-xs sm:text-sm font-black tracking-wide whitespace-nowrap drop-shadow-sm">
            {isBanned ? 'লাইভ চ্যাট' : 'অ্যাডমিন সাপোর্ট'}
          </span>

          {unreadCount > 0 && !isOpen && (
            <span className={`ml-0.5 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border border-black/40 shadow-sm animate-bounce ${
              isBanned || !adminSettings.online ? 'bg-amber-400 text-black' : 'bg-rose-500'
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
              className={`fixed bottom-40 md:bottom-24 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 right-auto md:right-6 z-50 w-[calc(100vw-32px)] max-w-sm sm:w-96 h-[500px] max-h-[72vh] rounded-3xl bg-[#08121a]/95 backdrop-blur-2xl border shadow-2xl flex flex-col overflow-hidden text-white ${
                isBanned || !adminSettings.online ? 'border-rose-500/30 shadow-rose-950/50' : 'border-emerald-500/25 shadow-emerald-950/40'
              }`}
            >
              {/* Header */}
              <div className={`p-3.5 bg-gradient-to-r ${
                isBanned || !adminSettings.online
                  ? 'from-rose-950/80 via-red-950/60 to-slate-900/90'
                  : 'from-emerald-950/80 via-teal-950/60 to-slate-900/90'
              } border-b border-white/10 flex items-center justify-between shrink-0`}>
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className={`w-9 h-9 rounded-full border flex items-center justify-center font-black ${
                      isBanned || !adminSettings.online
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                        : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    }`}>
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-[#08121a] ${
                        isBanned || !adminSettings.online ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400 animate-pulse'
                      }`}
                    />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                      {isBanned ? 'লাইভ চ্যাট' : 'অ্যাডমিন সাপোর্ট'}
                      {isBanned && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-600/60 text-white font-bold border border-rose-400/40">
                          ব্যান সাপোর্ট
                        </span>
                      )}
                    </h4>
                    <p className={`text-[10px] font-bold flex items-center gap-1.5 ${
                      isBanned
                        ? 'text-rose-300 font-bold'
                        : adminSettings.online ? 'text-white/60' : 'text-rose-400 font-bold'
                    }`}>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isBanned || !adminSettings.online ? 'bg-rose-500 animate-pulse' : 'bg-emerald-400 animate-pulse'
                        }`}
                      />
                      {isBanned
                        ? 'আনব্যান ও জরুরি সহায়তা'
                        : adminSettings.online
                        ? 'অ্যাডমিন অনলাইনে আছেন'
                        : 'অ্যাডমিন বর্তমানে অফলাইনে আছেন'}
                    </p>
                  </div>
                </div>

                {/* Header Action Controls: Close */}
                <div className="flex items-center gap-1.5">
                  {/* Close Chat Button */}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-rose-500/20 flex items-center justify-center text-white/70 hover:text-rose-300 transition cursor-pointer border border-white/10"
                    title="চ্যাট বন্ধ করুন"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chat Messages Body */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-white/10 relative"
              >
                {/* Default Welcome Message */}
                <div className="flex items-start gap-2.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border ${
                    isBanned || !adminSettings.online
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}>
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="max-w-[85%] bg-white/5 border border-white/10 p-3 rounded-2xl rounded-tl-sm text-xs leading-relaxed text-white/90">
                    <p className={`font-bold text-[10px] mb-1 ${isBanned || !adminSettings.online ? 'text-rose-400' : 'text-emerald-400'}`}>
                      লাইভ চ্যাট হেল্পলাইন
                    </p>
                    {isBanned
                      ? 'স্বাগতম! অ্যাকাউন্ট স্থগিত বা ব্যান সম্পর্কে যেকোনো তথ্য ও আনব্যানের রিকোয়েস্ট জানাতে এখানে মেসেজ দিন।'
                      : 'স্বাগতম! Velopay লাইভ চ্যাটে যেকোনো জিজ্ঞাসা বা অর্ডার সমস্যা সম্পর্কে সরাসরি মেসেজ দিন।'}
                  </div>
                </div>

                {/* Dynamic Messages */}
                {myMessages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  const avatarUrl = msg.userAvatar || (isUser ? currentUser?.avatar : undefined);
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold overflow-hidden border ${
                          isUser
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                            : (adminSettings.online ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30')
                        }`}
                      >
                        {isUser ? (
                          avatarUrl ? (
                            <img src={avatarUrl} alt="User" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-3.5 h-3.5" />
                          )
                        ) : (
                          <Bot className="w-3.5 h-3.5" />
                        )}
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
                          <span className="text-[8px] opacity-60 font-mono">
                            {new Date(msg.time).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        {/* Image Attachment (Photo / Screenshot) */}
                        {msg.imageUrl && (
                          <div
                            onClick={() => setPreviewModalUrl(msg.imageUrl!)}
                            className="mt-1 mb-1.5 rounded-xl overflow-hidden border border-white/20 relative group cursor-pointer max-w-[200px]"
                            title="ছবি বড় করে দেখতে ক্লিক করুন"
                          >
                            <img
                              src={msg.imageUrl}
                              alt="Attachment"
                              referrerPolicy="no-referrer"
                              className="w-full max-h-36 object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <ZoomIn className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        )}

                        <p className="break-words">{msg.text}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />

                {/* In-Chat Quick Scroll Buttons Capsule */}
                <div className="sticky bottom-2 right-2 flex justify-end gap-1.5 z-10 pointer-events-none">
                  <div className="pointer-events-auto flex items-center gap-1 bg-[#08121a]/90 backdrop-blur-md p-1 rounded-xl border border-white/10 shadow-lg">
                    <button
                      type="button"
                      onClick={scrollToTop}
                      title="উপরে যান"
                      className="p-1 rounded-lg bg-white/5 hover:bg-emerald-500/30 text-white/80 hover:text-white transition active:scale-95 cursor-pointer text-[10px] flex items-center gap-0.5"
                    >
                      <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
                    </button>
                    <button
                      type="button"
                      onClick={scrollToBottom}
                      title="নিচে যান"
                      className="p-1 rounded-lg bg-white/5 hover:bg-emerald-500/30 text-white/80 hover:text-white transition active:scale-95 cursor-pointer text-[10px] flex items-center gap-0.5"
                    >
                      <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Hidden File Picker for Image Upload */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageFileSelect}
                accept="image/png, image/jpeg, image/webp, image/gif"
                className="hidden"
              />

              {/* Input Form & Preview */}
              <div className="p-3 bg-black/40 border-t border-white/10 shrink-0">
                {/* Image selected preview bar */}
                {selectedImagePreview && (
                  <div className="relative px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 mb-2">
                    <img src={selectedImagePreview} alt="Preview" className="w-7 h-7 rounded-lg object-cover" />
                    <span className="text-[10px] text-emerald-300 font-bold truncate flex-1">ছবি আপলোড সম্পন্ন, মেসেজ পাঠান</span>
                    <button
                      type="button"
                      onClick={() => setSelectedImagePreview(null)}
                      className="text-white/60 hover:text-white p-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSend} className="flex items-center gap-2">
                  {/* Photo / Screenshot Upload Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0 border border-white/10 active:scale-95 disabled:opacity-50"
                    title="সমস্যা বা পেমেন্টের স্ক্রিনশট/ছবি আপলোড করুন"
                  >
                    {isUploadingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    ) : (
                      <Paperclip className="w-4 h-4 text-emerald-400" />
                    )}
                  </button>

                  <input
                    type="text"
                    placeholder={selectedImagePreview ? "ছবির সাথে ক্যাপশন লিখুন..." : "মেসেজ লিখুন..."}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className={`flex-1 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none transition ${
                      adminSettings.online ? 'focus:border-emerald-500' : 'focus:border-rose-500'
                    }`}
                  />

                  <button
                    type="submit"
                    disabled={!inputText.trim() && !selectedImagePreview}
                    className={`w-10 h-10 rounded-xl text-white flex items-center justify-center transition cursor-pointer shadow-md disabled:opacity-40 shrink-0 ${
                      adminSettings.online
                        ? 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20'
                        : 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/20'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Full Lightbox Preview Modal */}
              {previewModalUrl && (
                <div
                  className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
                  onClick={() => setPreviewModalUrl(null)}
                >
                  <div
                    className="relative max-w-lg max-h-[85vh] bg-[#0c1420] rounded-2xl overflow-hidden border border-white/20 p-2 shadow-2xl"
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
                      alt="Full Screenshot"
                      referrerPolicy="no-referrer"
                      className="max-w-full max-h-[80vh] object-contain rounded-lg"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
