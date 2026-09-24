import { useState, useEffect } from 'react';
import { Currency, Order, AdminSettings } from '../types';
import { Copy, Check, DollarSign, Smartphone, Key, ArrowRight, ArrowDownUp, Landmark } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { INITIAL_SETTINGS } from '../data/mockData';
import { renderCurrencyVisual } from './CurrencyList';

interface OrderFormProps {
  currencies: Currency[];
  initialSelectedCurrencyId?: string;
  initialOrderType?: 'buy' | 'sell';
  adminSettings?: AdminSettings;
  onOrderSubmit: (orderData: Omit<Order, 'id' | 'user' | 'email' | 'status' | 'time'>) => void;
  showToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function OrderForm({ 
  currencies, 
  initialSelectedCurrencyId, 
  initialOrderType = 'sell',
  adminSettings = INITIAL_SETTINGS,
  onOrderSubmit, 
  showToast 
}: OrderFormProps) {
  const [orderType, setOrderType] = useState<'buy' | 'sell'>(initialOrderType);
  const [selectedCurrencyId, setSelectedCurrencyId] = useState(initialSelectedCurrencyId || currencies[0]?.id || '');
  const [amountUSD, setAmountUSD] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [txid, setTxid] = useState<string>('');
  const [userReceiveAddress, setUserReceiveAddress] = useState<string>('');
  const [payoutMethod, setPayoutMethod] = useState<'bKash' | 'Nagad'>('bKash');
  const [copied, setCopied] = useState(false);

  // Sync with prop if it changes
  useEffect(() => {
    if (initialSelectedCurrencyId) {
      setSelectedCurrencyId(initialSelectedCurrencyId);
    }
  }, [initialSelectedCurrencyId]);

  useEffect(() => {
    if (initialOrderType) {
      setOrderType(initialOrderType);
    }
  }, [initialOrderType]);

  const selectedCurrency = currencies.find(c => c.id === selectedCurrencyId) || currencies[0];
  const rate = selectedCurrency ? (orderType === 'sell' ? selectedCurrency.sellRate : selectedCurrency.buyRate) : 0;
  const calculatedBDT = (parseFloat(amountUSD) || 0) * rate;

  const minLimit = orderType === 'sell' ? (selectedCurrency?.minSell || 5) : (selectedCurrency?.minBuy || 5);
  const maxLimit = orderType === 'sell' ? (selectedCurrency?.maxSell || 2000) : (selectedCurrency?.maxBuy || 2000);

  const handleCopyText = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    showToast('কপি করা হয়েছে!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedUSD = parseFloat(amountUSD);
    if (!amountUSD || isNaN(parsedUSD) || parsedUSD <= 0) {
      showToast('সটীক ডলারের পরিমাণ লিখুন!', 'error');
      return;
    }

    if (parsedUSD < minLimit) {
      showToast(`ন্যূনতম অর্ডারের পরিমাণ $${minLimit} ডলার!`, 'error');
      return;
    }

    if (parsedUSD > maxLimit) {
      showToast(`সর্বোচ্চ অর্ডারের পরিমাণ $${maxLimit} ডলার!`, 'error');
      return;
    }

    if (!phone) {
      showToast(orderType === 'sell' ? 'টাকা গ্রহণের বিকাশ/নগদ নম্বর লিখুন!' : 'টাকা পাঠানোর বিকাশ/নগদ নম্বর লিখুন!', 'error');
      return;
    }
    if (orderType === 'buy' && !userReceiveAddress) {
      showToast('আপনার ডলার রিসিভ করার ওয়ালেট অ্যাড্রেস/ইমেইল লিখুন!', 'error');
      return;
    }
    if (!txid) {
      showToast('পেমেন্ট ভেরিফাই করতে ট্রানজেকশন আইডি (TxID) লিখুন!', 'error');
      return;
    }

    onOrderSubmit({
      orderType,
      amountUSD: parsedUSD,
      amountBDT: calculatedBDT,
      rate,
      method: selectedCurrency.name,
      payoutMethod,
      phone,
      txid,
      userReceiveAddress: orderType === 'buy' ? userReceiveAddress : undefined,
    });
  };

  const adminPaymentDetails = payoutMethod === 'bKash' ? adminSettings.adminBkashNumber : adminSettings.adminNagadNumber;

  return (
    <div className="space-y-6">
      {/* Page Title & Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            {orderType === 'sell' ? 'ডলার সেল রিকোয়েস্ট (Sell)' : 'ডলার বাই রিকোয়েস্ট (Buy)'}
          </h3>
          <p className="text-xs text-white/50 mt-1">সবগুলো তথ্য নির্ভুলভাবে পূরণ করে অর্ডার কনফার্ম করুন।</p>
        </div>

        {/* Dynamic Buy/Sell Switcher */}
        <div className="inline-flex p-1 bg-white/5 rounded-2xl border border-white/5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setOrderType('sell')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
              orderType === 'sell'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            ডলার সেল
          </button>
          <button
            type="button"
            onClick={() => setOrderType('buy')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
              orderType === 'buy'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            ডলার বাই
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="ios-glass p-6 sm:p-8 rounded-[30px] border border-white/10 space-y-6">
        {/* Method Select */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block ml-1">১. মেথড সিলেক্ট করুন</label>
          <select
            value={selectedCurrencyId}
            onChange={(e) => setSelectedCurrencyId(e.target.value)}
            className="w-full px-4 py-4 rounded-2xl bg-black/40 border border-white/10 text-white font-bold text-sm focus:outline-none focus:border-emerald-500 transition"
          >
            {currencies.map(c => (
              <option key={c.id} value={c.id} className="bg-[#0c1710] text-white">
                {c.name} — {orderType === 'sell' ? `১$ = ${c.sellRate}৳ (সেল)` : `১$ = ${c.buyRate}৳ (বাই)`}
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic Instruction Panels Based on Buy/Sell */}
        <AnimatePresence mode="wait">
          {orderType === 'sell' ? (
            <motion.div
              key="sell-instr"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/25 shadow-xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-[40px]" />
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1.5">
                আমাদের পেমেন্ট অ্যাড্রেস (নিচের ঠিকানায় ডলার পাঠান)
              </p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-black text-white break-all select-all font-mono">
                  {selectedCurrency.address}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyText(selectedCurrency.address)}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 transition active:scale-90"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="buy-instr"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/25 shadow-xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-[40px]" />
              <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1.5">
                আমাদের BDT ওয়ালেট নম্বর (নিচের নম্বরে টাকা পাঠান)
              </p>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className={`w-8 h-8 rounded-full aspect-square overflow-hidden border p-0.5 flex items-center justify-center shrink-0 shadow-sm ${
                    payoutMethod === 'bKash' ? 'border-[#E2136E]/60 bg-white' : 'border-[#F7941D]/60 bg-white'
                  }`}>
                    {payoutMethod === 'bKash' ? (
                      adminSettings?.bkashLogo ? (
                        <img src={adminSettings.bkashLogo} alt="bKash" referrerPolicy="no-referrer" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#E2136E] to-pink-500 text-white text-[8px] font-black flex items-center justify-center">
                          bKash
                        </div>
                      )
                    ) : (
                      adminSettings?.nagadLogo ? (
                        <img src={adminSettings.nagadLogo} alt="Nagad" referrerPolicy="no-referrer" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#F7941D] to-orange-500 text-white text-[8px] font-black flex items-center justify-center">
                          Nagad
                        </div>
                      )
                    )}
                  </div>
                  <span className="text-sm font-black text-white break-all select-all font-mono">
                    {adminPaymentDetails}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText(adminPaymentDetails.split(' ')[0])}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 transition active:scale-90"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Payment Selectors */}
        <div className="space-y-2">
          <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block ml-1">
            ২. {orderType === 'sell' ? 'টাকা নিবেন কিসে?' : 'টাকা পাঠিয়েছেন কিসে?'}
          </label>
          <div className="grid grid-cols-2 gap-4">
            {/* bKash */}
            <div
              onClick={() => setPayoutMethod('bKash')}
              className={`p-4 rounded-2xl border-2 cursor-pointer text-center flex flex-col items-center gap-2.5 transition duration-300 ${
                payoutMethod === 'bKash'
                  ? 'border-[#E2136E] bg-[#E2136E]/10 shadow-lg shadow-[#E2136E]/15'
                  : 'border-white/5 bg-white/5 hover:border-white/10'
              }`}
            >
              {/* Perfectly Circular Logo Wrapper */}
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full aspect-square overflow-hidden border-2 border-[#E2136E]/60 bg-white p-0.5 shadow-md shadow-[#E2136E]/20 flex items-center justify-center shrink-0">
                {adminSettings?.bkashLogo ? (
                  <img 
                    src={adminSettings.bkashLogo} 
                    alt="bKash" 
                    referrerPolicy="no-referrer" 
                    className="w-full h-full rounded-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#E2136E] via-[#D12053] to-pink-500 flex items-center justify-center text-white font-black text-xs shadow-inner">
                    bKash
                  </div>
                )}
              </div>
              <span className="text-xs font-black text-white">বিকাশ ওয়ালেট</span>
            </div>

            {/* Nagad */}
            <div
              onClick={() => setPayoutMethod('Nagad')}
              className={`p-4 rounded-2xl border-2 cursor-pointer text-center flex flex-col items-center gap-2.5 transition duration-300 ${
                payoutMethod === 'Nagad'
                  ? 'border-[#F7941D] bg-[#F7941D]/10 shadow-lg shadow-[#F7941D]/15'
                  : 'border-white/5 bg-white/5 hover:border-white/10'
              }`}
            >
              {/* Perfectly Circular Logo Wrapper */}
              <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full aspect-square overflow-hidden border-2 border-[#F7941D]/60 bg-white p-0.5 shadow-md shadow-[#F7941D]/20 flex items-center justify-center shrink-0">
                {adminSettings?.nagadLogo ? (
                  <img 
                    src={adminSettings.nagadLogo} 
                    alt="Nagad" 
                    referrerPolicy="no-referrer" 
                    className="w-full h-full rounded-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#F7941D] via-[#EA580C] to-orange-500 flex items-center justify-center text-white font-black text-xs shadow-inner">
                    Nagad
                  </div>
                )}
              </div>
              <span className="text-xs font-black text-white">নগদ ওয়ালেট</span>
            </div>
          </div>
        </div>

        {/* Inputs Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">৩. পরিমাণ (USD)</label>
              <span className="text-[10px] font-bold text-white/50">
                লিমিট: ${minLimit} - ${maxLimit}
              </span>
            </div>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500/60" />
              <input
                type="number"
                placeholder={`যেমন: ${minLimit}`}
                min={minLimit}
                max={maxLimit}
                value={amountUSD}
                onChange={(e) => setAmountUSD(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl ios-glass-input text-sm font-black"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block ml-1">
              ৪. আপনার {payoutMethod === 'bKash' ? 'বিকাশ' : 'নগদ'} নম্বর
            </label>
            <div className="relative">
              <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500/60" />
              <input
                type="text"
                placeholder="017XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl ios-glass-input text-sm font-black"
              />
            </div>
          </div>
        </div>

        {/* Additional user address for Buy orders */}
        {orderType === 'buy' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-1.5"
          >
            <label className="text-[10px] font-black text-cyan-400 uppercase tracking-widest block ml-1">
              ৫. আপনার রিসিভার অ্যাড্রেস (যেখানে আমরা ডলার পাঠাবো)
            </label>
            <div className="relative">
              <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-500/60" />
              <input
                type="text"
                placeholder={selectedCurrency.placeholder}
                value={userReceiveAddress}
                onChange={(e) => setUserReceiveAddress(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl ios-glass-input text-sm font-bold"
              />
            </div>
          </motion.div>
        )}

        {/* TxID Field */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block ml-1">
            {orderType === 'sell' ? '৬. পেমেন্ট ট্রানজেকশন আইডি (TxID)' : '৬. বিকাশ/নগদ পেমেন্ট ট্রানজেকশন আইডি (TxID)'}
          </label>
          <div className="relative">
            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500/60" />
            <input
              type="text"
              placeholder="টাকা বা ডলার পাঠানোর পর প্রাপ্ত ট্রানজেকশন আইডি (TxID)"
              value={txid}
              onChange={(e) => setTxid(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl ios-glass-input text-sm font-bold font-mono"
            />
          </div>
        </div>

        {/* Dynamic Calculation Banner */}
        {parseFloat(amountUSD) > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-4 rounded-2xl border flex justify-between items-center ${
              orderType === 'sell' 
                ? 'bg-emerald-500/10 border-emerald-500/35' 
                : 'bg-cyan-500/10 border-cyan-500/35'
            }`}
          >
            <span className="text-xs text-white/70 font-black">
              {orderType === 'sell' ? 'কনভারশন হিসাব:' : 'পেমেন্ট হিসাব (টাকা):'}
            </span>
            <span className={`text-base font-black tracking-tight ${orderType === 'sell' ? 'text-emerald-400' : 'text-cyan-400'}`}>
              {amountUSD} USD = {calculatedBDT.toLocaleString('bn-BD', { minimumFractionDigits: 1 })} BDT
            </span>
          </motion.div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className={`w-full py-4 rounded-2xl text-white font-black text-md shadow-lg active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r ${
            orderType === 'sell' 
              ? 'from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-emerald-500/10' 
              : 'from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/10'
          }`}
        >
          অর্ডার কনফার্ম করুন <ArrowRight className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}

