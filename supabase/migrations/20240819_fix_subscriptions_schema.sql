-- Fix the subscriptions table schema to match what the application expects
-- and add proper constraints

-- First, add missing columns to the subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS price_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT,
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS plan_name TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add unique constraint on user_id to prevent multiple subscription rows per user
-- First, clean up any duplicate entries (keep the most recent)
WITH duplicates AS (
  SELECT id, user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
  FROM subscriptions
)
DELETE FROM subscriptions
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Now add the unique constraint
ALTER TABLE subscriptions 
ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

-- Update the subscriptions table to ensure status is never null
UPDATE subscriptions SET status = 'inactive' WHERE status IS NULL;
ALTER TABLE subscriptions ALTER COLUMN status SET NOT NULL;
ALTER TABLE subscriptions ALTER COLUMN status SET DEFAULT 'inactive';

-- Create or replace a view that provides all subscription data for the authenticated user
-- This view will be used by getUserSubscription
CREATE OR REPLACE VIEW user_subscription_view WITH (security_invoker = true) AS
SELECT 
  s.id,
  s.user_id,
  s.stripe_customer_id,
  s.stripe_subscription_id,
  s.status,
  s.price_id,
  s.subscription_status,
  s.current_period_start,
  s.current_period_end,
  s.cancel_at_period_end,
  s.quantity,
  s.plan_name,
  s.created_at,
  s.updated_at,
  -- Add computed fields for convenience
  CASE 
    WHEN s.status IN ('active', 'trialing') THEN true
    ELSE false
  END as is_active,
  CASE
    WHEN s.current_period_end IS NOT NULL THEN
      s.current_period_end > NOW()
    ELSE false
  END as is_current
FROM subscriptions s
WHERE s.user_id = auth.uid();

-- Grant access to authenticated users
GRANT SELECT ON user_subscription_view TO authenticated;

-- Create a function to sync subscription data from Stripe
-- This will be called by the webhook and confirm-payment functions
CREATE OR REPLACE FUNCTION sync_subscription_from_stripe(
  p_user_id UUID,
  p_stripe_customer_id TEXT,
  p_stripe_subscription_id TEXT,
  p_status TEXT,
  p_price_id TEXT DEFAULT NULL,
  p_current_period_start TIMESTAMPTZ DEFAULT NULL,
  p_current_period_end TIMESTAMPTZ DEFAULT NULL,
  p_cancel_at_period_end BOOLEAN DEFAULT FALSE,
  p_quantity INTEGER DEFAULT 1,
  p_plan_name TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO subscriptions (
    user_id,
    stripe_customer_id,
    stripe_subscription_id,
    status,
    subscription_status,
    price_id,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    quantity,
    plan_name,
    updated_at
  ) VALUES (
    p_user_id,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_status,
    p_status, -- subscription_status mirrors status
    p_price_id,
    p_current_period_start,
    p_current_period_end,
    p_cancel_at_period_end,
    p_quantity,
    p_plan_name,
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    status = EXCLUDED.status,
    subscription_status = EXCLUDED.subscription_status,
    price_id = EXCLUDED.price_id,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    cancel_at_period_end = EXCLUDED.cancel_at_period_end,
    quantity = EXCLUDED.quantity,
    plan_name = EXCLUDED.plan_name,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role (for edge functions)
GRANT EXECUTE ON FUNCTION sync_subscription_from_stripe TO service_role;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE subscriptions IS 'Stores user subscription data synced from Stripe';
COMMENT ON COLUMN subscriptions.user_id IS 'Unique user ID - only one subscription per user';
COMMENT ON COLUMN subscriptions.subscription_status IS 'Mirrors status field for compatibility';
COMMENT ON COLUMN subscriptions.is_active IS 'Computed field: true if status is active or trialing';
COMMENT ON COLUMN subscriptions.is_current IS 'Computed field: true if current_period_end is in the future';
COMMENT ON VIEW user_subscription_view IS 'Secure view for users to access their own subscription data';