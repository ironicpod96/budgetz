-- Budget Tracker Tables for Envelope System

-- User profiles with salary and deduction info
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gross_income DECIMAL(12,2),
  epf_rate DECIMAL(5,2) DEFAULT 11.00,
  socso_amount DECIMAL(10,2) DEFAULT 0,
  eis_amount DECIMAL(10,2) DEFAULT 0,
  pcb_amount DECIMAL(10,2) DEFAULT 0,
  take_home_salary DECIMAL(12,2),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget categories (envelopes)
CREATE TABLE IF NOT EXISTS budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  budget_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  icon TEXT,
  color TEXT,
  is_fixed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fixed expenses (rent, loans, etc)
CREATE TABLE IF NOT EXISTS fixed_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_day INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions/Expenses
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES budget_categories(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  name TEXT,
  transaction_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE USING (auth.uid() = id);

-- RLS Policies for budget_categories
CREATE POLICY "categories_select_own" ON budget_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "categories_insert_own" ON budget_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_update_own" ON budget_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "categories_delete_own" ON budget_categories FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for fixed_expenses
CREATE POLICY "fixed_select_own" ON fixed_expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fixed_insert_own" ON fixed_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fixed_update_own" ON fixed_expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "fixed_delete_own" ON fixed_expenses FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for transactions
CREATE POLICY "transactions_select_own" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert_own" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update_own" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "transactions_delete_own" ON transactions FOR DELETE USING (auth.uid() = user_id);

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
