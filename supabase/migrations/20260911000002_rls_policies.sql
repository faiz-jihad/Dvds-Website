-- AZ Rayan DVDs Row Level Security (RLS) Policies
-- Migration 02: RLS Policies

-- 1. Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE favourites ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id OR is_admin());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Categories Policies
CREATE POLICY "Public can view active categories" ON categories
  FOR SELECT USING (is_active = TRUE OR is_admin());

CREATE POLICY "Admins can manage categories" ON categories
  FOR ALL USING (is_admin());

-- Products Policies
CREATE POLICY "Public can view active products" ON products
  FOR SELECT USING (status = 'active' OR is_admin());

CREATE POLICY "Admins can manage products" ON products
  FOR ALL USING (is_admin());

-- Product Images Policies
CREATE POLICY "Public can view product images" ON product_images
  FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage product images" ON product_images
  FOR ALL USING (is_admin());

-- Genres Policies
CREATE POLICY "Public can view genres" ON genres
  FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage genres" ON genres
  FOR ALL USING (is_admin());

CREATE POLICY "Public can view product_genres" ON product_genres
  FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage product_genres" ON product_genres
  FOR ALL USING (is_admin());

-- Favourites Policies
CREATE POLICY "Users can manage own favourites" ON favourites
  FOR ALL USING (auth.uid() = user_id);

-- Carts Policies
CREATE POLICY "Users can manage own cart" ON carts
  FOR ALL USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (session_id IS NOT NULL)
  );

CREATE POLICY "Users can manage own cart items" ON cart_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM carts
      WHERE carts.id = cart_items.cart_id
      AND ((auth.uid() IS NOT NULL AND carts.user_id = auth.uid()) OR carts.session_id IS NOT NULL)
    )
  );

-- Addresses Policies
CREATE POLICY "Users can manage own addresses" ON addresses
  FOR ALL USING (auth.uid() = user_id OR is_admin());

-- Orders Policies
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can manage orders" ON orders
  FOR ALL USING (is_admin());

-- Order Items Policies
CREATE POLICY "Users can view order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (orders.user_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "Users can insert order items" ON order_items
  FOR INSERT WITH CHECK (TRUE);

-- Newsletter Subscribers
CREATE POLICY "Public can subscribe to newsletter" ON newsletter_subscribers
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Admins can view newsletter subscribers" ON newsletter_subscribers
  FOR SELECT USING (is_admin());

-- Site Settings
CREATE POLICY "Public can view site settings" ON site_settings
  FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage site settings" ON site_settings
  FOR ALL USING (is_admin());

-- Promotions
CREATE POLICY "Public can view active promotions" ON promotions
  FOR SELECT USING (is_active = TRUE OR is_admin());

CREATE POLICY "Admins can manage promotions" ON promotions
  FOR ALL USING (is_admin());

-- Trigger to auto-create profile on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Customer'),
    'customer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
