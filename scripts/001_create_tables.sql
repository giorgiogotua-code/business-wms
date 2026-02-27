-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  description TEXT,
  purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  sale_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'ცალი',
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Transactions table (purchases and sales)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'sale')),
  quantity INTEGER NOT NULL,
  price_per_unit NUMERIC(12,2) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles table for role management
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'cashier')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow all authenticated users to read
CREATE POLICY "auth_read_categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_transactions" ON public.transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

-- Allow all authenticated users to insert/update/delete (app handles role logic)
CREATE POLICY "auth_insert_categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_categories" ON public.categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_categories" ON public.categories FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_insert_products" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_products" ON public.products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_products" ON public.products FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_insert_transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_transactions" ON public.transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_transactions" ON public.transactions FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_insert_expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_expenses" ON public.expenses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_expenses" ON public.expenses FOR DELETE TO authenticated USING (true);

CREATE POLICY "auth_insert_profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_profiles" ON public.profiles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_profiles" ON public.profiles FOR DELETE TO authenticated USING (true);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.email),
    COALESCE(new.raw_user_meta_data ->> 'role', 'cashier')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
