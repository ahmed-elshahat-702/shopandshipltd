export interface Category {
  id: string;
  name: string;
  slug: string;
  icon_url?: string | null;
}

export interface Merchant {
  id: string;
  name: string;
  logo_url: string | null;
}

export interface MerchantVariant {
  id: string;
  product_id: string;
  merchant_id: string;
  price: number;
  stock?: number;
  merchants: Merchant;
}

export interface ProductVariant {
  id: string;
  color?: string;
  size?: string;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  image_urls: string[];
  average_rating: number;
  total_reviews: number;
  stock: number;
  reviews_locked?: boolean;
  categories?: Category | Category[];
  lowestPrice?: number;
  originalPrice?: number;
  merchant_variants?: MerchantVariant[];
  merchant_count?: number;
  merchantId?: string;
  merchantName?: string;
  has_variants?: boolean;
  variants?: ProductVariant[];
  colors?: string[];
  sizes?: string[];
}

export interface ProductFilters {
  search?: string;
  category?: string | string[] | null;
  priceMin?: number;
  priceMax?: number;
  rating?: number | number[] | null;
  sortBy?: "newest" | "price-asc" | "price-desc" | "popular" | "selling" | "discount";
  page?: number;
  limit?: number;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'customer' | 'merchant' | 'admin' | 'superadmin' | string | null;
  is_active: boolean | null;
  wallet_locked?: boolean | null;
  created_at: string;
}

export interface MerchantProfile {
  id: string;
  user_id: string;
  business_name: string;
  business_description: string | null;
  business_category: string | null;
  logo_url: string | null;
  banner_url: string | null;
  store_slug: string;
  rating: number;
  total_sales: number;
  total_profit: number;
  level_id: number;
  is_verified: boolean;
  kyc_status: 'pending' | 'approved' | 'rejected';
  kyc_document_url?: string | null;
  wallet_address?: string | null;
  country?: string | null;
  city?: string | null;
  merchant_visits?: number;
  followers?: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  merchant_level_upgrades?: UpgradeRequest[];
}

export interface UpgradeRequest {
  id: string;
  user_id: string;
  merchant_id: string;
  current_level_id: number | null;
  requested_level_id: number;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpgradeRequestWithMerchant extends UpgradeRequest {
  merchant: {
    name: string;
    store_name: string;
    level: number;
  };
  requested_level: number; // For UI compatibility
}

export interface UsersResponse {
  users: Profile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  error?: string;
}

export interface AdminMerchantsResponse {
  merchants: MerchantProfile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  error?: string;
}

export interface MerchantLevel {
  id: number;
  name: string;
  description: string | null;
  min_sales_amount: number;
  commission_percentage: number;
  max_products: number;
  features: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  title_en: string;
  title_ar: string;
  subtitle_en: string | null;
  subtitle_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  link_url: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlatformSettings {
  platformName: string;
  platformCommission: number;
  maxFileUploadSize: number;
  emailVerificationRequired: boolean;
  kycRequiredForMerchant: boolean;
  minWithdrawalAmount: number;
  allowCustomerWithdrawal: boolean;
  allowMerchantWithdrawal: boolean;
  autoApproveKYC: boolean;
  emailNotifications: boolean;
  maintenanceMode: boolean;
  adminWalletAddress: string;
}

export interface KycRequest {
  id: string;
  user_id: string;
  merchant_id: string;
  id_card_url: string;
  business_license_url: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export type MerchantInventoryProduct = {
  id: string;
  merchant_id: string;
  product_id: string;
  selling_price: number;
  created_at: string;
  updated_at: string;
  products: {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    image_urls?: string[];
    stock: number;
    price: number;
    has_variants?: boolean;
    variants?: ProductVariant[];
    colors?: string[];
    sizes?: string[];
    categories?: { id?: number; name?: string | null } | null;
  } | null;
};

export type MerchantWallet = {
  id: string;
  user_id: string;
  balance: number;
  outstanding_balance: number;
  currency: string;
  total_earnings: number;
  is_locked?: boolean;
  earnings_change?: number;
  created_at?: string;
  updated_at?: string;
};

export type MerchantWalletTransaction = {
  id: string;
  wallet_id: string;
  type: "recharge" | "withdrawal" | "order_payment" | "refund" | "commission";
  amount: number;
  status: "pending" | "completed" | "failed" | "cancelled";
  description: string | null;
  proof_image_url?: string | null;
  created_at: string;
  updated_at?: string;
};

export type MerchantSummary = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  location: string | null;
  rating: number;
  isVerified: boolean;
  productCount: number;
  levelId: number | null;
  totalSales: number;
  followers: number;
};

export type MerchantPublicDetails = MerchantSummary & {
  followers: number;
  totalReviews: number;
  business_category: string | null;
  store_slug: string;
  isFollowing: boolean;
};

export type MerchantDetail = MerchantProfile & {
  product_count: number;
  order_count: number;
  merchant_level_upgrades: UpgradeRequest[];
};

export type MerchantDashboardData = {
  stats: MerchantDetail & {
    wallet_balance: number;
    total_sales: number;
    revenue_change: number;
    orders_change: number;
    products_change: number;
    wallet_change: number;
  };
  recentOrders: {
    id: string;
    created_at: string;
    total_amount: number;
    status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  }[];
  topProducts: {
    id: string;
    product_id: string;
    name: string;
    price: number;
    stock: number;
  }[];
  monthlyRevenue: {
    total_amount: number;
    created_at: string;
  }[];
};

export type MerchantOrderDetails = {
  id: string;
  order_number: string | null;
  created_at: string;
  updated_at: string;
  delivered_at: string | null;
  total_amount: number;
  tax_amount: number;
  shipping_cost: number;
  cod_fee: number;
  commission_amount: number;
  profit_amount: number;
  tracking_number: string | null;
  notes: string | null;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  shipping_address: {
    fullName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    zipCode?: string;
  } | null;
  items: {
    id: string;
    product_id: string;
    quantity: number;
    price_per_unit: number;
    subtotal: number;
    product_name?: string;
    product_sku?: string;
    product_image_url?: string;
    variant_id?: string | null;
    variant_details?: Record<string, string> | null;
    products: {
      id: string;
      name: string;
      image_url: string | null;
      sku?: string | null;
    } | null;
  }[];
};

export interface AdminOrder {
  id: string;
  order_number: string | null;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  total_amount: number;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  };
  merchant_profiles: {
    business_name: string;
  };
}

export interface AdminOrderResponse {
  orders: AdminOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  error?: string;
}

export type AnalyticsPeriod = "weekly" | "monthly" | "yearly";

export type AnalyticsData = {
  period: AnalyticsPeriod;
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  averageOrderValue: number;
  averageOrderValueChange: number;
  revenueChange: number;
  ordersChange: number;
  customerRetention: number;
  chartData: { date: string; revenue: number; orders: number }[];
  ordersByStatus: {
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  revenueByCategory: { name: string; value: number }[];
};

export interface SearchSuggestion {
  id: string;
  name: string;
  type: "product" | "category" | "merchant";
  slug?: string;
  image_url?: string | null;
}

export interface CartItem {
  id: string;
  product_id: string;
  merchant_id: string;
  quantity: number;
  variant_price: number;
  variant_id?: string | null;
  variant_details?: Record<string, string> | null;
  product?: Product;
  merchant?: Merchant;
}

export interface MerchantApplication {
  id: string;
  user_id: string;
  store_type: string;
  store_name: string;
  store_description: string;
  store_category: string;
  store_logo: string | null;
  nationality: string;
  id_type: string;
  id_number: string;
  id_expiry: string;
  issuing_country: string;
  id_front_url: string;
  id_back_url: string;
  selfie_url: string;
  status: string;
  created_at: string;
  user: {
    full_name: string;
    email: string;
  };
}

export interface Review {
  id: string;
  rating: number;
  title?: string;
  comment: string;
  created_at: string;
  users?: { first_name: string; last_name: string; full_name?: string };
  profiles?: { full_name: string; profile_image_url: string | null };
  images?: string[];
  helpful_count?: number;
}

export interface Address {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  type?: "shipping" | "wallet";
}
