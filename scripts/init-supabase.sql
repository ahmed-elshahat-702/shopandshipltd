-- ============================================================================
-- SHOP & SHIP LED - SUPABASE INITIALIZATION SCRIPT (UNIFIED)
-- ============================================================================
-- This file contains the complete database schema for the Shop & Ship LED
-- dropshipping platform, including the integrated Chat System.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE user_role AS ENUM ('customer', 'merchant', 'admin', 'superadmin');
CREATE TYPE kyc_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');
CREATE TYPE wallet_transaction_type AS ENUM ('recharge', 'withdrawal', 'order_payment', 'refund', 'commission');
CREATE TYPE wallet_transaction_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');
CREATE TYPE review_rating AS ENUM ('1', '2', '3', '4', '5');
CREATE TYPE discount_type AS ENUM ('percentage', 'fixed_amount');

-- ============================================================================
-- TABLE: PROFILES (User accounts and roles)
-- ============================================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(50),
  birth_date DATE,
  wallet_address TEXT,
  profile_image_url TEXT,
  role user_role NOT NULL DEFAULT 'customer',
  addresses JSONB DEFAULT '[]'::jsonb,
  saved_wallets JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: MERCHANT_LEVELS (Tiered merchant system)
-- ============================================================================

CREATE TABLE merchant_levels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  min_sales_amount DECIMAL(12, 2) DEFAULT 0,
  commission_percentage DECIMAL(5, 2) DEFAULT 15.00,
  max_products INT DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: MERCHANT_PROFILES (Extended merchant information)
-- ============================================================================

CREATE TABLE merchant_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  business_name VARCHAR(255) NOT NULL,
  business_description TEXT,
  business_category VARCHAR(100),
  logo_url TEXT,
  banner_url TEXT,
  store_slug VARCHAR(255) UNIQUE NOT NULL,
  rating DECIMAL(3, 2) DEFAULT 0,
  total_sales DECIMAL(15, 2) DEFAULT 0,
  total_profit DECIMAL(15, 2) DEFAULT 0,
  level_id INT REFERENCES merchant_levels(id) ON DELETE RESTRICT,
  is_verified BOOLEAN DEFAULT FALSE,
  kyc_status kyc_status DEFAULT 'pending',
  kyc_document_url TEXT,
  wallet_address TEXT,
  country VARCHAR(100),
  city VARCHAR(100),
  store_visits INT DEFAULT 0,
  followers INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: CHATS
-- ============================================================================

CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: CHAT_PARTICIPANTS
-- ============================================================================

CREATE TABLE chat_participants (
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (chat_id, user_id)
);

-- ============================================================================
-- TABLE: MESSAGES
-- ============================================================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT,
  image_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: KYC_REQUESTS (Know Your Customer verification)
-- ============================================================================

CREATE TABLE kyc_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES merchant_profiles(id) ON DELETE CASCADE,
  id_card_url TEXT NOT NULL,
  business_license_url TEXT NOT NULL,
  status kyc_status DEFAULT 'pending',
  rejection_reason TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: CATEGORIES (Product categories)
-- ============================================================================

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon_url TEXT,
  parent_category_id INT REFERENCES categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: PRODUCTS (Product listings)
-- ============================================================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id INT REFERENCES categories(id) ON DELETE RESTRICT,
  price DECIMAL(12, 2) NOT NULL,
  stock INT DEFAULT 0,
  sku VARCHAR(100) UNIQUE NOT NULL,
  image_url TEXT,
  image_urls TEXT[] DEFAULT '{}'::TEXT[],
  tags JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  reviews_locked BOOLEAN DEFAULT FALSE,
  views INT DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0,
  has_variants BOOLEAN DEFAULT false,
  variants JSONB DEFAULT '[]'::jsonb,
  colors TEXT[] DEFAULT '{}'::TEXT[],
  sizes TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: MERCHANT_PRODUCTS (Link between merchants and products they stock)
-- ============================================================================

CREATE TABLE merchant_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchant_profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  selling_price DECIMAL(12, 2) NOT NULL,
  commission_earned DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(merchant_id, product_id)
);

-- ============================================================================
-- TABLE: CART_ITEMS (Shopping cart)
-- ============================================================================

CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES merchant_profiles(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  price_per_unit DECIMAL(12, 2) NOT NULL,
  variant_id TEXT,
  variant_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: ORDERS (Order management)
-- ============================================================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  merchant_id UUID REFERENCES merchant_profiles(id) ON DELETE SET NULL,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  status order_status DEFAULT 'pending',
  payment_method VARCHAR(50) DEFAULT 'cod',
  subtotal_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  shipping_cost DECIMAL(12, 2) DEFAULT 0,
  cod_fee DECIMAL(12, 2) DEFAULT 0,
  commission_amount DECIMAL(12, 2) DEFAULT 0,
  profit_amount DECIMAL(12, 2) DEFAULT 0,
  tracking_number VARCHAR(100),
  shipping_address JSONB,
  notes TEXT,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: ORDER_ITEMS (Individual items in an order)
-- ============================================================================

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255),
  product_sku VARCHAR(100),
  product_image_url TEXT,
  quantity INT NOT NULL,
  price_per_unit DECIMAL(12, 2) NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  variant_id TEXT,
  variant_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: REVIEWS (Product reviews)
-- ============================================================================

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  rating review_rating NOT NULL,
  comment TEXT,
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: WISHLIST (User wishlists)
-- ============================================================================

CREATE TABLE wishlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- ============================================================================
-- TABLE: WALLET (User wallet accounts)
-- ============================================================================

CREATE TABLE wallet (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  balance DECIMAL(15, 2) DEFAULT 0,
  outstanding_balance DECIMAL(15, 2) DEFAULT 0,
  total_earnings DECIMAL(15, 2) DEFAULT 0,
  is_locked BOOLEAN DEFAULT FALSE,
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE wallet ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- TABLE: WALLET_TRANSACTIONS (Wallet transaction history)
-- ============================================================================

CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES wallet(id) ON DELETE CASCADE,
  type wallet_transaction_type NOT NULL,
  amount DECIMAL(15, 2) NOT NULL, -- Positive for credits, negative for debits
  status wallet_transaction_status DEFAULT 'pending',
  description TEXT,
  proof_image_url TEXT,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: PLATFORM_SETTINGS (Global platform configuration)
-- ============================================================================

CREATE TABLE platform_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: COUPONS (Coupon codes)
-- ============================================================================

CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_type discount_type NOT NULL,
  discount_value DECIMAL(12, 2) NOT NULL,
  min_purchase_amount DECIMAL(12, 2) DEFAULT 0,
  max_discount_amount DECIMAL(12, 2), -- Only relevant for percentage type
  expiration_date TIMESTAMP WITH TIME ZONE,
  usage_limit INT, -- NULL means unlimited
  used_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: DEALS (Banner deals)
-- ============================================================================

CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_en VARCHAR(255) NOT NULL,
  title_ar VARCHAR(255) NOT NULL,
  subtitle_en VARCHAR(255),
  subtitle_ar VARCHAR(255),
  description_en TEXT,
  description_ar TEXT,
  link_url VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: MERCHANT_APPLICATIONS (Initial application to become a merchant)
-- ============================================================================

CREATE TABLE merchant_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_type VARCHAR(50) NOT NULL,
  store_name VARCHAR(255) NOT NULL,
  store_description TEXT,
  store_category VARCHAR(100),
  store_logo TEXT,
  nationality VARCHAR(100),
  id_type VARCHAR(50),
  id_number VARCHAR(100),
  id_expiry DATE,
  issuing_country VARCHAR(100),
  id_front_url TEXT,
  id_back_url TEXT,
  selfie_url TEXT,
  status kyc_status DEFAULT 'pending',
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: MERCHANT_FOLLOWERS (Tracks user-merchant following relationships)
-- ============================================================================

CREATE TABLE merchant_followers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES merchant_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, merchant_id)
);

-- ============================================================================
-- TABLE: SEARCH_HISTORY (User search queries)
-- ============================================================================

CREATE TABLE search_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: MERCHANT_LEVEL_UPGRADES (Requests for merchant tier upgrades)
-- ============================================================================

CREATE TABLE merchant_level_upgrades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES merchant_profiles(id) ON DELETE CASCADE,
  current_level_id INT REFERENCES merchant_levels(id),
  requested_level_id INT NOT NULL REFERENCES merchant_levels(id),
  status kyc_status DEFAULT 'pending',
  rejection_reason TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_merchant_profiles_user_id ON merchant_profiles(user_id);
CREATE INDEX idx_merchant_profiles_store_slug ON merchant_profiles(store_slug);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);
CREATE UNIQUE INDEX idx_cart_items_unique_product_merchant_variant
ON cart_items(user_id, product_id, merchant_id, COALESCE(variant_id, ''));
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_merchant_id ON orders(merchant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_wishlist_user_id ON wishlist(user_id);
CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_kyc_requests_user_id ON kyc_requests(user_id);
CREATE INDEX idx_merchant_products_merchant_id ON merchant_products(merchant_id);
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_deals_active_sort ON deals(is_active, sort_order);
CREATE INDEX idx_merchant_applications_user_id ON merchant_applications(user_id);
CREATE INDEX idx_merchant_applications_status ON merchant_applications(status);
CREATE INDEX idx_merchant_followers_user_id ON merchant_followers(user_id);
CREATE INDEX idx_merchant_followers_merchant_id ON merchant_followers(merchant_id);
CREATE INDEX idx_search_history_user_id ON search_history(user_id);
CREATE INDEX idx_merchant_level_upgrades_user_id ON merchant_level_upgrades(user_id);
CREATE INDEX idx_merchant_level_upgrades_merchant_id ON merchant_level_upgrades(merchant_id);
CREATE INDEX idx_merchant_level_upgrades_status ON merchant_level_upgrades(status);

-- Chat Indexes
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC MANAGEMENT
-- ============================================================================

-- Trigger: Create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(CAST(NULLIF(NEW.raw_user_meta_data->>'role', '') AS public.user_role), 'customer'::public.user_role),
    FALSE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger: Update updated_at timestamp for profiles
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at_trigger
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_profiles_updated_at();

-- Trigger for coupons
CREATE TRIGGER coupons_updated_at_trigger
BEFORE UPDATE ON coupons
FOR EACH ROW
EXECUTE FUNCTION update_profiles_updated_at();

-- Trigger: Sync email_verified status from auth.users
CREATE OR REPLACE FUNCTION public.sync_email_verified()
RETURNS trigger AS $$
BEGIN
  IF (NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)) THEN
    UPDATE public.profiles
    SET email_verified = TRUE,
        updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_verified
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.sync_email_verified();

-- Trigger: Create wallet on user creation
CREATE OR REPLACE FUNCTION create_wallet_on_user_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallet (user_id, balance) VALUES (NEW.id, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER create_wallet_trigger
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION create_wallet_on_user_signup();


-- Trigger: Update product rating based on reviews
CREATE OR REPLACE FUNCTION update_product_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET rating = (
    SELECT CAST(AVG(CAST(rating AS NUMERIC)) AS DECIMAL(3, 2))
    FROM reviews
    WHERE product_id = NEW.product_id
  )
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_rating_trigger
AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_rating();

-- Trigger: Update merchant rating based on order reviews
CREATE OR REPLACE FUNCTION update_merchant_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE merchant_profiles
  SET rating = (
    SELECT CAST(AVG(CAST(r.rating AS NUMERIC)) AS DECIMAL(3, 2))
    FROM reviews r
    JOIN order_items oi ON r.product_id = oi.product_id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.merchant_id = NEW.merchant_id
  )
  WHERE id = NEW.merchant_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER merchant_rating_trigger
AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_merchant_rating();

-- Trigger: Update wallet balance on transaction completion
CREATE OR REPLACE FUNCTION update_wallet_balance_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT when status is already 'completed'
  IF (TG_OP = 'INSERT' AND NEW.status = 'completed') OR 
     (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed') THEN
    
    -- Update balance
    UPDATE wallet
    SET balance = balance + NEW.amount,
        updated_at = NOW()
    WHERE id = NEW.wallet_id;

    -- Update total_earnings if it's an income type (commission)
    -- Only add to total_earnings if the amount is positive (income)
    IF NEW.type IN ('commission') AND NEW.amount > 0 THEN
      UPDATE wallet
      SET total_earnings = total_earnings + NEW.amount
      WHERE id = NEW.wallet_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wallet_transaction_trigger_insert
AFTER INSERT ON wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION update_wallet_balance_on_transaction();

CREATE TRIGGER wallet_transaction_trigger
AFTER UPDATE ON wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION update_wallet_balance_on_transaction();

-- Function to update chat updated_at
CREATE OR REPLACE FUNCTION update_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats SET updated_at = NOW() WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER messages_inserted_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trigger: Update merchant followers count
CREATE OR REPLACE FUNCTION update_merchant_followers_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.merchant_profiles
    SET followers = followers + 1
    WHERE id = NEW.merchant_id;
  ELSIF (TG_OP = 'DELETE') THEN
    IF EXISTS (SELECT 1 FROM public.merchant_profiles WHERE id = OLD.merchant_id) THEN
      UPDATE public.merchant_profiles
      SET followers = GREATEST(0, followers - 1)
      WHERE id = OLD.merchant_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_merchant_follower_change
AFTER INSERT OR DELETE ON merchant_followers
FOR EACH ROW EXECUTE PROCEDURE update_merchant_followers_count();

-- Trigger: Update deals updated_at
CREATE OR REPLACE FUNCTION update_deals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER deals_updated_at_trigger
BEFORE UPDATE ON deals
FOR EACH ROW
EXECUTE FUNCTION update_deals_updated_at();

-- ============================================================================
-- SECURE WALLET FUNCTIONS (RPC)
-- ============================================================================

-- Function: Safely hold outstanding balance for an order
CREATE OR REPLACE FUNCTION hold_order_commission(merchant_user_id UUID, order_id UUID, amount DECIMAL)
RETURNS BOOLEAN AS $$
DECLARE
  merchant_wallet_id UUID;
  current_balance DECIMAL;
  wallet_locked BOOLEAN;
BEGIN
  -- Get the merchant's wallet
  SELECT id, balance, is_locked INTO merchant_wallet_id, current_balance, wallet_locked
  FROM wallet WHERE user_id = merchant_user_id;

  IF merchant_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user %', merchant_user_id;
  END IF;

  IF wallet_locked THEN
    RAISE EXCEPTION 'Wallet is locked';
  END IF;

  IF current_balance < amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- 1. Insert completed transaction (trigger updates main balance)
  INSERT INTO wallet_transactions (wallet_id, type, amount, status, description)
  VALUES (merchant_wallet_id, 'order_payment', -amount, 'completed', 'Reserved cost for order ' || order_id);

  -- 2. Update outstanding balance
  UPDATE wallet
  SET outstanding_balance = outstanding_balance + amount,
      updated_at = NOW()
  WHERE id = merchant_wallet_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Safely release outstanding balance and award profit
CREATE OR REPLACE FUNCTION release_order_commission(merchant_user_id UUID, order_id UUID, commission_amount DECIMAL, merchant_earnings DECIMAL, total_sales_amount DECIMAL, total_profit_amount DECIMAL)
RETURNS BOOLEAN AS $$
DECLARE
  merchant_wallet_id UUID;
  current_outstanding DECIMAL;
  merchant_profile_id UUID;
BEGIN
  -- Get the merchant's wallet
  SELECT id, outstanding_balance INTO merchant_wallet_id, current_outstanding
  FROM wallet WHERE user_id = merchant_user_id;

  IF merchant_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user %', merchant_user_id;
  END IF;

  -- 1. Reduce outstanding balance
  UPDATE wallet
  SET outstanding_balance = GREATEST(0, current_outstanding - commission_amount),
      updated_at = NOW()
  WHERE id = merchant_wallet_id;

  -- 2. Insert completed transaction for earnings (trigger updates main balance)
  INSERT INTO wallet_transactions (wallet_id, type, amount, status, description)
  VALUES (merchant_wallet_id, 'commission', merchant_earnings, 'completed', 'Payment received for delivered order ' || order_id);

  -- 3. Update merchant profile stats
  SELECT id INTO merchant_profile_id FROM merchant_profiles WHERE user_id = merchant_user_id;
  IF merchant_profile_id IS NOT NULL THEN
    UPDATE merchant_profiles
    SET total_sales = total_sales + total_sales_amount,
        total_profit = total_profit + total_profit_amount,
        updated_at = NOW()
    WHERE id = merchant_profile_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Safely process customer wallet checkout
CREATE OR REPLACE FUNCTION process_customer_checkout(customer_user_id UUID, total_amount DECIMAL, order_count INT)
RETURNS BOOLEAN AS $$
DECLARE
  customer_wallet_id UUID;
  current_balance DECIMAL;
  wallet_locked BOOLEAN;
BEGIN
  -- Get the customer's wallet
  SELECT id, balance, is_locked INTO customer_wallet_id, current_balance, wallet_locked
  FROM wallet WHERE user_id = customer_user_id;

  IF customer_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user %', customer_user_id;
  END IF;

  IF wallet_locked THEN
    RAISE EXCEPTION 'Wallet is locked';
  END IF;

  IF current_balance < total_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  -- Insert completed transaction (trigger updates main balance safely)
  INSERT INTO wallet_transactions (wallet_id, type, amount, status, description)
  VALUES (customer_wallet_id, 'order_payment', -total_amount, 'completed', 'Order payment for ' || order_count || ' items');

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Safely refund customer wallet
CREATE OR REPLACE FUNCTION refund_customer_order(customer_user_id UUID, order_id UUID, refund_amount DECIMAL)
RETURNS BOOLEAN AS $$
DECLARE
  customer_wallet_id UUID;
BEGIN
  -- Get the customer's wallet
  SELECT id INTO customer_wallet_id
  FROM wallet WHERE user_id = customer_user_id;

  IF customer_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user %', customer_user_id;
  END IF;

  -- Insert completed transaction (trigger updates main balance safely)
  INSERT INTO wallet_transactions (wallet_id, type, amount, status, description)
  VALUES (customer_wallet_id, 'refund', refund_amount, 'completed', 'Refund for cancelled order ' || order_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function: Safely refund merchant reserved cost and outstanding balance
CREATE OR REPLACE FUNCTION refund_merchant_order(merchant_user_id UUID, order_id UUID, admin_cost DECIMAL)
RETURNS BOOLEAN AS $$
DECLARE
  merchant_wallet_id UUID;
  current_outstanding DECIMAL;
BEGIN
  -- Get the merchant's wallet
  SELECT id, outstanding_balance INTO merchant_wallet_id, current_outstanding
  FROM wallet WHERE user_id = merchant_user_id;

  IF merchant_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user %', merchant_user_id;
  END IF;

  -- 1. Reduce outstanding balance
  UPDATE wallet
  SET outstanding_balance = GREATEST(0, current_outstanding - admin_cost),
      updated_at = NOW()
  WHERE id = merchant_wallet_id;

  -- 2. Insert completed transaction (trigger updates main balance safely)
  INSERT INTO wallet_transactions (wallet_id, type, amount, status, description)
  VALUES (merchant_wallet_id, 'refund', admin_cost, 'completed', 'Refund of reserved cost for cancelled order ' || order_id);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to decrement main product stock safely
CREATE OR REPLACE FUNCTION decrement_product_stock(p_id UUID, qty INT, v_id TEXT DEFAULT NULL)
RETURNS void AS $$
DECLARE
  current_variant_stock INT;
BEGIN
  IF v_id IS NOT NULL AND v_id != '' THEN
    SELECT (v->>'stock')::INT
    INTO current_variant_stock
    FROM products p,
      jsonb_array_elements(p.variants) AS v
    WHERE p.id = p_id
      AND v->>'id' = v_id;

    IF current_variant_stock IS NULL THEN
      RAISE EXCEPTION 'Variant % not found for product %', v_id, p_id;
    END IF;

    IF current_variant_stock < qty THEN
      RAISE EXCEPTION 'Insufficient variant stock for product % variant %', p_id, v_id;
    END IF;

    UPDATE products
    SET variants = (
      SELECT COALESCE(
        jsonb_agg(
          CASE
            WHEN v->>'id' = v_id THEN jsonb_set(v, '{stock}', (GREATEST(0, (v->>'stock')::int -
  qty))::text::jsonb)
            ELSE v
          END
        ),
        '[]'::jsonb
      )
      FROM jsonb_array_elements(variants) AS v
    ),
    stock = GREATEST(0, stock - qty),
    updated_at = NOW()
    WHERE id = p_id;
  ELSE
    UPDATE products
    SET stock = GREATEST(0, stock - qty),
        updated_at = NOW()
    WHERE id = p_id
      AND stock >= qty;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient stock for product %', p_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a secure function to check chat participation
CREATE OR REPLACE FUNCTION public.is_chat_participant(c_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE chat_id = c_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Checks if the current user is active.
CREATE OR REPLACE FUNCTION public.is_active()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Checks if the current JWT belongs to a superadmin user.
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'superadmin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Checks if the current JWT belongs to an admin user (includes superadmin).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'superadmin') AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Checks if the current JWT belongs to a merchant (or admin).
CREATE OR REPLACE FUNCTION public.is_merchant()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('merchant', 'admin', 'superadmin') AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Checks if a specific merchant is active (based on their profile's user status).
CREATE OR REPLACE FUNCTION public.is_merchant_active(m_id UUID)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.merchant_profiles mp
    JOIN public.profiles p ON mp.user_id = p.id
    WHERE mp.id = m_id AND p.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_levels         ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_requests            ENABLE ROW LEVEL SECURITY;
ALTER TABLE products                ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist                ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_level_upgrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories              ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_applications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_followers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- ── PROFILES ────────────────────────────────────────────────────────────────

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_select_public_merchants" ON profiles
  FOR SELECT USING (role IN ('merchant', 'admin', 'superadmin') AND is_active = true);

CREATE POLICY "profiles_select_admin" ON profiles
  FOR SELECT USING (is_admin());

CREATE POLICY "profiles_select_merchant_customers" ON profiles
  FOR SELECT USING (
    is_active() AND
    id IN (
      SELECT o.user_id FROM orders o
      JOIN merchant_profiles mp ON o.merchant_id = mp.id
      WHERE mp.user_id = auth.uid()
    )
  );

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id AND is_active());

CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE USING (is_admin());

CREATE POLICY "profiles_insert_admin" ON profiles
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "profiles_delete_admin" ON profiles
  FOR DELETE USING (is_admin());

-- ── MERCHANT_PROFILES ───────────────────────────────────────────────────────

CREATE POLICY "merchant_profiles_select_own" ON merchant_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "merchant_profiles_select_public_verified" ON merchant_profiles
  FOR SELECT USING (is_verified = true AND is_merchant_active(id));

CREATE POLICY "merchant_profiles_select_admin" ON merchant_profiles
  FOR SELECT USING (is_admin());

CREATE POLICY "merchant_profiles_insert_own" ON merchant_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_active());

CREATE POLICY "merchant_profiles_insert_admin" ON merchant_profiles
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "merchant_profiles_update_own" ON merchant_profiles
  FOR UPDATE USING (auth.uid() = user_id AND is_active());

CREATE POLICY "merchant_profiles_update_admin" ON merchant_profiles
  FOR UPDATE USING (is_admin());

CREATE POLICY "merchant_profiles_delete_admin" ON merchant_profiles
  FOR DELETE USING (is_admin());

-- ── CHATS ───────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "chats_participant_select" ON chats
    FOR SELECT USING ( is_chat_participant(id) );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "chats_insert" ON chats
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── CHAT_PARTICIPANTS ────────────────────────

DO $$ BEGIN
  CREATE POLICY "chat_participants_select" ON chat_participants
    FOR SELECT USING ( is_chat_participant(chat_id) );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "chat_participants_insert" ON chat_participants
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "chat_participants_update" ON chat_participants
    FOR UPDATE USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── MESSAGES ─────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "messages_select" ON messages
    FOR SELECT USING ( is_chat_participant(chat_id) );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "messages_insert" ON messages
    FOR INSERT WITH CHECK (
      auth.uid() = sender_id AND
      is_chat_participant(chat_id)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "messages_update" ON messages
    FOR UPDATE USING ( is_chat_participant(chat_id) );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── MERCHANT_LEVELS ─────────────────────────────────────────────────────────

CREATE POLICY "merchant_levels_select_all" ON merchant_levels
  FOR SELECT USING (true);

CREATE POLICY "merchant_levels_insert_admin" ON merchant_levels
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "merchant_levels_update_admin" ON merchant_levels
  FOR UPDATE USING (is_admin());

CREATE POLICY "merchant_levels_delete_admin" ON merchant_levels
  FOR DELETE USING (is_admin());

-- ── CATEGORIES ──────────────────────────────────────────────────────────────

CREATE POLICY "categories_select_active" ON categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "categories_select_admin" ON categories
  FOR SELECT USING (is_admin());

CREATE POLICY "categories_insert_admin" ON categories
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "categories_update_admin" ON categories
  FOR UPDATE USING (is_admin());

CREATE POLICY "categories_delete_admin" ON categories
  FOR DELETE USING (is_admin());

-- ── PRODUCTS ────────────────────────────────────────────────────────────────

CREATE POLICY "products_select_active" ON products
  FOR SELECT USING (is_active = true);

CREATE POLICY "products_select_admin" ON products
  FOR SELECT USING (is_admin());

CREATE POLICY "products_insert_admin" ON products
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "products_update_admin" ON products
  FOR UPDATE USING (is_admin());

CREATE POLICY "products_delete_admin" ON products
  FOR DELETE USING (is_admin());

-- ── MERCHANT_PRODUCTS ───────────────────────────────────────────────────────

CREATE POLICY "merchant_products_select_own" ON merchant_products
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchant_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "merchant_products_select_public" ON merchant_products
  FOR SELECT USING (
    is_merchant_active(merchant_id) AND
    merchant_id IN (SELECT id FROM merchant_profiles WHERE is_verified = true)
  );

CREATE POLICY "merchant_products_select_admin" ON merchant_products
  FOR SELECT USING (is_admin());

CREATE POLICY "merchant_products_insert_own" ON merchant_products
  FOR INSERT WITH CHECK (
    is_active() AND
    merchant_id IN (SELECT id FROM merchant_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "merchant_products_insert_admin" ON merchant_products
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "merchant_products_update_own" ON merchant_products
  FOR UPDATE USING (
    is_active() AND
    merchant_id IN (SELECT id FROM merchant_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "merchant_products_update_admin" ON merchant_products
  FOR UPDATE USING (is_admin());

CREATE POLICY "merchant_products_delete_own" ON merchant_products
  FOR DELETE USING (
    is_active() AND
    merchant_id IN (SELECT id FROM merchant_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "merchant_products_delete_admin" ON merchant_products
  FOR DELETE USING (is_admin());

-- ── CART_ITEMS ──────────────────────────────────────────────────────────────

CREATE POLICY "cart_items_select_own" ON cart_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "cart_items_insert_own" ON cart_items
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_active() AND is_merchant_active(merchant_id));

CREATE POLICY "cart_items_update_own" ON cart_items
  FOR UPDATE USING (auth.uid() = user_id AND is_active());

CREATE POLICY "cart_items_delete_own" ON cart_items
  FOR DELETE USING (auth.uid() = user_id AND is_active());

-- ── ORDERS ──────────────────────────────────────────────────────────────────

CREATE POLICY "orders_select_own_customer" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "orders_select_own_merchant" ON orders
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchant_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "orders_select_admin" ON orders
  FOR SELECT USING (is_admin());

CREATE POLICY "orders_insert_customer" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_active() AND is_merchant_active(merchant_id));

CREATE POLICY "orders_update_own_merchant" ON orders
  FOR UPDATE USING (
    is_active() AND
    merchant_id IN (SELECT id FROM merchant_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "orders_update_admin" ON orders
  FOR UPDATE USING (is_admin());

CREATE POLICY "orders_delete_admin" ON orders
  FOR DELETE USING (is_admin());

-- ── ORDER_ITEMS ─────────────────────────────────────────────────────────────

CREATE POLICY "order_items_select_customer" ON order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );

CREATE POLICY "order_items_select_merchant" ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN merchant_profiles mp ON o.merchant_id = mp.id
      WHERE mp.user_id = auth.uid()
    )
  );

CREATE POLICY "order_items_select_admin" ON order_items
  FOR SELECT USING (is_admin());

CREATE POLICY "order_items_insert_customer" ON order_items
  FOR INSERT WITH CHECK (
    is_active() AND
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );

CREATE POLICY "order_items_insert_admin" ON order_items
  FOR INSERT WITH CHECK (is_admin());

-- ── REVIEWS ─────────────────────────────────────────────────────────────────

CREATE POLICY "reviews_select_all" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "reviews_insert_own" ON reviews
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    is_active() AND
    product_id IN (
      SELECT id FROM products
      WHERE COALESCE(reviews_locked, false) = false
    )
  );

CREATE POLICY "reviews_update_own" ON reviews
  FOR UPDATE USING (
    auth.uid() = user_id AND
    is_active() AND
    product_id IN (
      SELECT id FROM products
      WHERE COALESCE(reviews_locked, false) = false
    )
  )
  WITH CHECK (
    auth.uid() = user_id AND
    is_active() AND
    product_id IN (
      SELECT id FROM products
      WHERE COALESCE(reviews_locked, false) = false
    )
  );

CREATE POLICY "reviews_delete_own" ON reviews
  FOR DELETE USING (auth.uid() = user_id AND is_active());

CREATE POLICY "reviews_delete_admin" ON reviews
  FOR DELETE USING (is_admin());

-- ── WISHLIST ────────────────────────────────────────────────────────────────

CREATE POLICY "wishlist_select_own" ON wishlist
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "wishlist_insert_own" ON wishlist
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_active());

CREATE POLICY "wishlist_delete_own" ON wishlist
  FOR DELETE USING (auth.uid() = user_id AND is_active());

-- ── WALLET ──────────────────────────────────────────────────────────────────

CREATE POLICY "wallet_select_own" ON wallet
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "wallet_select_admin" ON wallet
  FOR SELECT USING (is_admin());

CREATE POLICY "wallet_insert_admin" ON wallet
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "wallet_update_admin" ON wallet
  FOR UPDATE USING (is_admin());

-- ── WALLET_TRANSACTIONS ─────────────────────────────────────────────────────

CREATE POLICY "wallet_transactions_select_own" ON wallet_transactions
  FOR SELECT USING (
    wallet_id IN (SELECT id FROM wallet WHERE user_id = auth.uid())
  );

CREATE POLICY "wallet_transactions_select_admin" ON wallet_transactions
  FOR SELECT USING (is_admin());

CREATE POLICY "wallet_transactions_insert_own" ON wallet_transactions
  FOR INSERT WITH CHECK (
    is_active() AND
    wallet_id IN (
      SELECT id FROM wallet
      WHERE user_id = auth.uid() AND COALESCE(is_locked, false) = false
    )
  );

CREATE POLICY "wallet_transactions_insert_admin" ON wallet_transactions
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "wallet_transactions_update_admin" ON wallet_transactions
  FOR UPDATE USING (is_admin());

-- ── KYC_REQUESTS ────────────────────────────────────────────────────────────

CREATE POLICY "kyc_requests_select_own" ON kyc_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "kyc_requests_select_admin" ON kyc_requests
  FOR SELECT USING (is_admin());

CREATE POLICY "kyc_requests_insert_own" ON kyc_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_active());

CREATE POLICY "kyc_requests_update_admin" ON kyc_requests
  FOR UPDATE USING (is_admin());

CREATE POLICY "kyc_requests_delete_admin" ON kyc_requests
  FOR DELETE USING (is_admin());

-- ── MERCHANT_LEVEL_UPGRADES ─────────────────────────────────────────────────

CREATE POLICY "merchant_level_upgrades_select_own" ON merchant_level_upgrades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "merchant_level_upgrades_select_admin" ON merchant_level_upgrades
  FOR SELECT USING (is_admin());

CREATE POLICY "merchant_level_upgrades_insert_own" ON merchant_level_upgrades
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_active());

CREATE POLICY "merchant_level_upgrades_update_admin" ON merchant_level_upgrades
  FOR UPDATE USING (is_admin());

CREATE POLICY "merchant_level_upgrades_delete_admin" ON merchant_level_upgrades
  FOR DELETE USING (is_admin());

-- ── PLATFORM_SETTINGS ───────────────────────────────────────────────────────

CREATE POLICY "platform_settings_select_admin" ON platform_settings
  FOR SELECT USING (is_admin());

CREATE POLICY "platform_settings_insert_admin" ON platform_settings
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "platform_settings_update_admin" ON platform_settings
  FOR UPDATE USING (is_admin());

CREATE POLICY "platform_settings_delete_admin" ON platform_settings
  FOR DELETE USING (is_admin());

-- ── COUPONS ─────────────────────────────────────────────────────────────────

CREATE POLICY "coupons_admin_all" ON coupons
  FOR ALL USING (public.is_admin());

CREATE POLICY "coupons_customer_select" ON coupons
  FOR SELECT USING (
    is_active = true AND 
    (expiration_date IS NULL OR expiration_date > NOW()) AND
    (usage_limit IS NULL OR used_count < usage_limit)
  );

-- ── DEALS ───────────────────────────────────────────────────────────────────

CREATE POLICY "deals_select_active" ON deals
  FOR SELECT USING (is_active = true);

CREATE POLICY "deals_all_admin" ON deals
  FOR ALL USING (is_admin());

-- ── MERCHANT_APPLICATIONS ───────────────────────────────────────────────────

CREATE POLICY "merchant_applications_select_own" ON merchant_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "merchant_applications_select_admin" ON merchant_applications
  FOR SELECT USING (is_admin());

CREATE POLICY "merchant_applications_insert_own" ON merchant_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_active());

CREATE POLICY "merchant_applications_update_admin" ON merchant_applications
  FOR UPDATE USING (is_admin());

-- ── MERCHANT_FOLLOWERS ──────────────────────────────────────────────────────

CREATE POLICY "merchant_followers_select_all" ON merchant_followers
  FOR SELECT USING (true);

CREATE POLICY "merchant_followers_insert_own" ON merchant_followers
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_active() AND is_merchant_active(merchant_id));

CREATE POLICY "merchant_followers_delete_own" ON merchant_followers
  FOR DELETE USING (auth.uid() = user_id AND is_active());


-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars',        'avatars',        true)  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('profiles',       'profiles',       true)  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true)  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents',  'kyc-documents',  false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('wallet-proofs',  'wallet-proofs',  false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images',    'chat-images',    true)  ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE RLS POLICIES
-- ============================================================================

-- ── avatars bucket ──────────────────────────────────────────────────────────

CREATE POLICY "avatars_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_authenticated" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "avatars_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── profiles bucket ─────────────────────────────────────────────────────────

CREATE POLICY "profiles_storage_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'profiles');

CREATE POLICY "profiles_storage_insert_authenticated" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'profiles' AND auth.role() = 'authenticated'
  );

CREATE POLICY "profiles_storage_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'profiles' AND
    auth.uid()::text = split_part(storage.filename(name), '-', 1)
  );

CREATE POLICY "profiles_storage_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'profiles' AND
    auth.uid()::text = split_part(storage.filename(name), '-', 1)
  );

-- ── product-images bucket ────────────────────────────────────────────────────

CREATE POLICY "product_images_select_public" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "product_images_insert_authenticated" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images' AND auth.role() = 'authenticated'
  );

CREATE POLICY "product_images_update_admin" ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-images' AND is_admin());

CREATE POLICY "product_images_delete_admin" ON storage.objects
  FOR DELETE USING (bucket_id = 'product-images' AND is_admin());

-- ── kyc-documents bucket ────────────────────────────────────────────────────

CREATE POLICY "kyc_documents_select_own_or_admin" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'kyc-documents' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR is_admin())
  );

CREATE POLICY "kyc_documents_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'kyc-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "kyc_documents_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'kyc-documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "kyc_documents_delete_admin" ON storage.objects
  FOR DELETE USING (bucket_id = 'kyc-documents' AND is_admin());

-- ── wallet-proofs bucket ────────────────────────────────────────────────────

CREATE POLICY "wallet_proofs_select_own_or_admin" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'wallet-proofs' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR is_admin())
  );

CREATE POLICY "wallet_proofs_insert_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'wallet-proofs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "wallet_proofs_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'wallet-proofs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "wallet_proofs_delete_admin" ON storage.objects
  FOR DELETE USING (bucket_id = 'wallet-proofs' AND is_admin());

-- ── chat-images bucket ──────────────────────

DO $$ BEGIN
  CREATE POLICY "chat_images_select_public" ON storage.objects
    FOR SELECT USING (bucket_id = 'chat-images');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "chat_images_insert_authenticated" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'chat-images' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- REALTIME
-- ============================================================================

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE kyc_requests;
  ALTER PUBLICATION supabase_realtime ADD TABLE wallet_transactions;
  ALTER PUBLICATION supabase_realtime ADD TABLE merchant_level_upgrades;
  ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  ALTER PUBLICATION supabase_realtime ADD TABLE merchant_applications;
  -- Chat tables
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE chats;
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert merchant levels
INSERT INTO merchant_levels (name, min_sales_amount, commission_percentage, max_products) VALUES
('L0',       0,      15.00, 20),
('L1',     500,   17.00, 35),
('L2',     5000,  20.00, 80),
('L3',      20000, 22.00, 150),
('L4',     50000, 25.00, 300),
('L5',     0, 27.00, 1000);

-- Insert product categories
INSERT INTO categories (name, slug, description, icon_url, parent_category_id, is_active) VALUES
('Electronics',          'electronics',    'Electronic devices and accessories', '/icons/electronics.svg', NULL, true),
('Fashion',              'fashion',        'Clothing, shoes, and accessories',   '/icons/fashion.svg',     NULL, true),
('Home & Garden',        'home-garden',    'Home appliances and garden items',   '/icons/home.svg',        NULL, true),
('Sports & Outdoors',    'sports-outdoors','Sports equipment and outdoor gear',  '/icons/sports.svg',      NULL, true),
('Beauty & Personal Care','beauty-personal','Beauty and personal care products', '/icons/beauty.svg',      NULL, true),
('Books & Media',        'books-media',    'Books, DVDs, and digital media',     '/icons/books.svg',       NULL, true),
('Toys & Games',         'toys-games',     'Toys, games, and hobbies',           '/icons/toys.svg',        NULL, true),
('Automotive',           'automotive',     'Automotive parts and accessories',   '/icons/auto.svg',        NULL, true);

-- Insert platform settings
INSERT INTO platform_settings (setting_key, setting_value, description) VALUES
('platform_name',               'Shop & Ship LED', 'Official platform name'),
('platform_commission_default', '0',              'Default platform commission percentage'),
('max_file_upload_size',        '10485760',        'Max file upload size in bytes (10 MB)'),
('email_verification_required', 'true',            'Whether email verification is required'),
('kyc_required_for_merchant',   'true',            'Whether KYC is required to become a merchant'),
('min_withdrawal_amount',       '10',              'Minimum wallet withdrawal amount in USD'),
('allow_customer_withdrawal',   'true',            'Whether customer withdrawals are enabled'),
('allow_merchant_withdrawal',   'true',            'Whether merchant withdrawals are enabled'),
('auto_approve_kyc',            'false',           'Automatically approve KYC submissions'),
('maintenance_mode',            'false',           'Put platform into read-only maintenance mode');

-- Insert seed deals
INSERT INTO deals (title_en, title_ar, subtitle_en, subtitle_ar, description_en, description_ar, link_url, is_active, sort_order)
VALUES (
  'Flash Sale — Up to 50% Off', 
  'تصفيات سريعة — خصم يصل إلى 50٪', 
  'Limited Time Deals', 
  'عروض لفترة محدودة', 
  'On selected LED products. Today only!', 
  'على منتجات LED محددة. اليوم فقط!', 
  '/products?sort=selling', 
  true, 
  0
);

-- ============================================================================
-- END OF INITIALIZATION SCRIPT
-- ============================================================================
