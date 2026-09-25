import { useState } from 'react';
import { Currency } from '../types';
import { 
  ArrowDownRight, 
  ArrowRight, 
  Coins, 
  CreditCard, 
  Gift, 
  Globe, 
  Landmark, 
  TrendingUp, 
  Wallet, 
  ArrowUpRight,
  DollarSign,
  ShieldCheck,
  ChevronDown,
  Check
} from 'lucide-react';
import { motion } from 'motion/react';

interface CurrencyListProps {
  currencies: Currency[];
  onStartExchange: (currencyId: string, type: 'buy' | 'sell') => void;
}

export const renderCurrencyVisual = (currency: Currency, sizeClass = "w-6 h-6") => {
  if (currency.imageUrl) {
    return (
      <img 
        src={currency.imageUrl} 
        alt={currency.name} 
        referrerPolicy="no-referrer"
        className="w-full h-full object-contain rounded-lg p-0.5" 
      />
    );
  }

  const iconType = currency.icon || (
    currency.name.includes('USDT') || currency.name.includes('Binance') ? 'coins' :
    currency.name.includes('Wise') ? 'globe' :
    currency.name.includes('Gift') ? 'credit-card' :
    currency.type === 'crypto' ? 'coins' : 'wallet'
  );

  switch (iconType) {
    case 'bank':
      return <Landmark className={`${sizeClass} text-teal-400`} />;
    case 'coins':
      return <Coins className={`${sizeClass} text-emerald-400`} />;
    case 'credit-card':
      return <CreditCard className={`${sizeClass} text-cyan-400`} />;
    case 'globe':
      return <Globe className={`${sizeClass} text-cyan-400`} />;
    case 'dollar':
      return <DollarSign className={`${sizeClass} text-emerald-400`} />;
    case 'shield':
      return <ShieldCheck className={`${sizeClass} text-emerald-400`} />;
    case 'wallet':
    default:
      return <Wallet className={`${sizeClass} text-emerald-400`} />;
  }
};

export default function CurrencyList({ currencies, onStartExchange }: CurrencyListProps) {
  const [selectedCalcCurrency, setSelectedCalcCurrency] = useState<string>(currencies[0]?.id || '');
  const [calcType, setCalcType] = useState<'buy' | 'sell'>('sell');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const activeCurrency = currencies.find(c => c.id === selectedCalcCurrency) || currencies[0];
  const activeRate = activeCurrency ? (calcType === 'sell' ? activeCurrency.sellRate : activeCurrency.buyRate) : 0;

  return (
    <div className="space-y-12">
      {/* Dynamic Interactive Live Conversion Rate Checker (Currency Selection Only - No Manual Typing) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="ios-glass p-6 sm:p-8 rounded-[30px] border border-white/10 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5 animate-bounce" /> লাইভ কারেন্সি কনভার্টার
            </div>
            <h4 className="text-2xl font-black text-white tracking-tight">কারেন্সি রেট সিলেক্টর</h4>
            <p className="text-sm text-white/60 leading-relaxed font-medium">
              Binance, PayPal সহ যেকোনো কারেন্সি সিলেক্ট করে লাইভ রেট দেখুন এবং সরাসরি ট্রেড শুরু করুন।
            </p>

            {/* Direction Toggle Buttons */}
            <div className="inline-flex p-1 bg-white/5 rounded-2xl border border-white/5 w-full sm:w-auto">
              <button
                onClick={() => setCalcType('sell')}
                className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition duration-300 cursor-pointer ${
                  calcType === 'sell'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                ডলার বিক্রি (Sell)
              </button>
              <button
                onClick={() => setCalcType('buy')}
                className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition duration-300 cursor-pointer ${
                  calcType === 'buy'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                ডলার ক্রয় (Buy)
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white/5 border border-white/10 p-6 rounded-2xl space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-11 gap-4 items-center">
              {/* Currency Selection Dropdown & 1 USD display (No manual typing) */}
              <div className="sm:col-span-5 space-y-1.5 relative">
                <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block ml-1">
                  কারেন্সি নির্বাচন করুন
                </label>
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full px-3.5 py-3 rounded-xl bg-black/50 border border-white/15 text-white text-xs sm:text-sm font-bold flex items-center justify-between gap-2 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden p-0.5">
                          {renderCurrencyVisual(activeCurrency, "w-4 h-4")}
                        </div>
                        <div className="px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/10 truncate">
                          <span className="text-xs font-bold text-white truncate">{activeCurrency?.name}</span>
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-white/60 transition-transform shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 z-50 ios-glass rounded-xl border border-white/15 bg-[#070e17]/95 shadow-2xl overflow-hidden p-1">
                        <div className="max-h-56 overflow-y-auto overflow-x-hidden space-y-1 pr-1">
                          {currencies.map(c => {
                            const isSelected = c.id === selectedCalcCurrency;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setSelectedCalcCurrency(c.id);
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full px-3 py-2 rounded-lg flex items-center justify-between gap-2 transition text-left cursor-pointer ${
                                  isSelected ? 'bg-emerald-500/20 border border-emerald-500/40 text-white' : 'hover:bg-white/10 text-white/80'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                  <div className="w-6 h-6 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden p-0.5">
                                    {renderCurrencyVisual(c, "w-3.5 h-3.5")}
                                  </div>
                                  <span className="text-xs font-bold text-white truncate">{c.name}</span>
                                </div>
                                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                    <span className="text-xs text-white/50 font-bold">পরিমাণ:</span>
                    <span className="text-sm font-black text-white">১ ডলার (1 USD)</span>
                  </div>
                </div>
              </div>

              {/* Icon representation of exchange */}
              <div className="sm:col-span-1 flex justify-center py-2 sm:py-0">
                <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                  <ArrowRight className="w-4 h-4 hidden sm:block" />
                  <ArrowDownRight className="w-4 h-4 sm:hidden" />
                </div>
              </div>

              {/* Output BDT Display (No manual typing) */}
              <div className="sm:col-span-5 space-y-1.5">
                <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block ml-1">
                  {calcType === 'sell' ? 'আপনি পাবেন (টাকা)' : 'আপনাকে দিতে হবে (টাকা)'}
                </label>
                <div className="flex flex-col gap-2">
                  <div className="px-3.5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between shadow-inner">
                    <span className="text-xs font-black text-emerald-400 tracking-wider">BDT</span>
                    <span className="text-lg sm:text-xl font-black text-emerald-400 tracking-tight">
                      {activeRate.toLocaleString('bn-BD', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ৳
                    </span>
                  </div>

                  <div className="px-3.5 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-between">
                    <span className="text-xs text-white/50 font-bold">লাইভ রেট:</span>
                    <span className="text-xs font-bold text-emerald-400">১ $ = {activeRate} ৳</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Grid displays */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            লাইভ রেটসমূহ <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          </h3>
          <span className="text-xs text-white/50 font-semibold uppercase tracking-widest">
            ১ ইউএসডি সমান (৳) বাংলাদেশি টাকা
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {currencies.map((currency, index) => (
            <motion.div
              key={currency.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group ios-glass p-3.5 sm:p-5 rounded-2xl sm:rounded-[24px] border border-white/5 hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between relative overflow-hidden"
            >
              {/* Refractive overlay accent */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              
              <div>
                <div className="flex items-center justify-between mb-2.5 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-center group-hover:bg-emerald-500/10 transition p-1.5 overflow-hidden">
                    {renderCurrencyVisual(currency)}
                  </div>
                  <span className="text-[8px] sm:text-[10px] font-black px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-emerald-500/10 text-emerald-400 uppercase tracking-wider">
                    {currency.symbol}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[9px] sm:text-[11px] font-bold text-white/40 uppercase tracking-wider mb-0.5 sm:mb-1">
                  <span>{currency.type}</span>
                  {currency.reserve && (
                    <span className="text-emerald-400/80 font-mono lowercase">রিজার্ভ: ${currency.reserve}</span>
                  )}
                </div>
                <h4 className="text-xs sm:text-base font-black text-white tracking-tight line-clamp-1">
                  {currency.name}
                </h4>

                {/* Both Rates Dual Panel */}
                <div className="mt-3 sm:mt-4 grid grid-cols-2 gap-1.5 sm:gap-2 bg-black/35 p-2 sm:p-2.5 rounded-xl border border-white/5 text-center">
                  <div>
                    <span className="text-[7px] sm:text-[9px] text-white/40 font-bold block leading-tight">আমরা কিনবো (Sell)</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-400">{currency.sellRate}৳</span>
                  </div>
                  <div className="border-l border-white/5">
                    <span className="text-[7px] sm:text-[9px] text-white/40 font-bold block leading-tight">আমরা বিক্রি করবো (Buy)</span>
                    <span className="text-xs sm:text-sm font-black text-cyan-400">{currency.buyRate}৳</span>
                  </div>
                </div>

                {/* Min / Max Limit Display */}
                {(currency.minSell || currency.minBuy) && (
                  <div className="mt-2 text-[8px] sm:text-[10px] text-white/40 font-medium text-center">
                    লিমিট: ${currency.minSell || currency.minBuy || 5} - ${currency.maxSell || currency.maxBuy || 1000}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-white/5 grid grid-cols-2 gap-1.5 sm:gap-2.5">
                <button
                  onClick={() => onStartExchange(currency.id, 'sell')}
                  className="py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 font-black text-[10px] sm:text-xs transition active:scale-95 flex items-center justify-center gap-0.5 cursor-pointer"
                >
                  বেচুন <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </button>
                <button
                  onClick={() => onStartExchange(currency.id, 'buy')}
                  className="py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white border border-cyan-500/20 font-black text-[10px] sm:text-xs transition active:scale-95 flex items-center justify-center gap-0.5 cursor-pointer"
                >
                  কিনুন <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

