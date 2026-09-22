export interface User {
  id?: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

export interface Currency {
  id: string;
  name: string;
  sellRate: number; // Rate user gets BDT when selling USD
  buyRate: number;  // Rate user pays BDT when buying USD
  address: string;  // Merchant deposit address (for Sell orders)
  type: string;     // 'crypto' | 'wallet' | 'giftcard'
  symbol: string;   // e.g. 'USDT', 'USD'
  placeholder: string; // Placeholder for user's receipt wallet (for Buy orders)
  icon?: string;    // 'wallet' | 'bank' | 'coins' | 'credit-card' | 'globe' | 'dollar' | 'shield'
  imageUrl?: string; // Custom uploaded image URL
  minBuy?: number;   // Minimum USD for Buy
  maxBuy?: number;   // Maximum USD for Buy
  minSell?: number;  // Minimum USD for Sell
  maxSell?: number;  // Maximum USD for Sell
  reserve?: number;  // Available reserve in USD
}

export interface Order {
  id: string;
  user: string;
  email: string;
  orderType: 'buy' | 'sell';
  amountUSD: number;
  amountBDT: number;
  rate: number;
  method: string; // e.g. "Binance USDT (TRC20)"
  payoutMethod: 'bKash' | 'Nagad';
  phone: string; // User's payment/payout bKash/Nagad number
  txid: string;  // TxID of payment
  userReceiveAddress?: string; // Where user receives USD (for Buy orders)
  status: 'Pending' | 'Success' | 'Cancelled';
  time: string; // ISO string
}

export interface AdminSettings {
  online: boolean;
  notice: string;
  whatsapp: string;
  adminBkashNumber: string; // Where users send money when Buying USD
  adminNagadNumber: string; // Where users send money when Buying USD
  bkashLogo?: string;       // Custom bKash logo URL
  nagadLogo?: string;       // Custom Nagad logo URL
  totalExchangedUSD: number;
  activeUsersCount: number;
  adminPin?: string;        // Security PIN for admin panel (e.g. 1234)
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'admin';
  senderName: string;
  userEmail: string;
  text: string;
  time: string;
  read?: boolean;
}
