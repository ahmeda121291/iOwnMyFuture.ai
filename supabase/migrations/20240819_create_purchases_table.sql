-- Create purchases table to track all completed purchases
CREATE TABLE IF NOT EXISTS purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  amount_total INTEGER NOT NULL, -- Amount in cents
  amount_subtotal INTEGER,
  currency TEXT NOT NULL DEFAULT 'usd',
  payment_status TEXT NOT NULL,
  mode TEXT, -- 'payment' or 'subscription'
  subscription_id TEXT,
  payment_intent_id TEXT,
  metadata JSONB DEFAULT '{}',
  confirmation_email_sent BOOLEAN DEFAULT FALSE,
  confirmation_email_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_purchases_stripe_session_id ON purchases(stripe_session_id);
CREATE INDEX idx_purchases_stripe_customer_id ON purchases(stripe_customer_id);
CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_customer_email ON purchases(customer_email);
CREATE INDEX idx_purchases_created_at ON purchases(created_at DESC);

-- Enable Row Level Security
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own purchases
CREATE POLICY "Users can view own purchases" ON purchases
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR 
    customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- RLS Policy: Only service role can insert/update purchases (for webhook)
CREATE POLICY "Service role can manage purchases" ON purchases
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_purchases_updated_at
  BEFORE UPDATE ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE purchases IS 'Stores all completed purchase transactions from Stripe';
COMMENT ON COLUMN purchases.stripe_session_id IS 'Unique Stripe Checkout Session ID';
COMMENT ON COLUMN purchases.stripe_customer_id IS 'Stripe Customer ID for the purchase';
COMMENT ON COLUMN purchases.user_id IS 'Reference to the authenticated user if available';
COMMENT ON COLUMN purchases.customer_email IS 'Customer email from Stripe checkout';
COMMENT ON COLUMN purchases.customer_name IS 'Customer name from Stripe checkout';
COMMENT ON COLUMN purchases.amount_total IS 'Total amount in cents';
COMMENT ON COLUMN purchases.amount_subtotal IS 'Subtotal amount in cents before taxes/fees';
COMMENT ON COLUMN purchases.currency IS 'Three-letter currency code (e.g., usd)';
COMMENT ON COLUMN purchases.payment_status IS 'Stripe payment status';
COMMENT ON COLUMN purchases.mode IS 'Checkout mode: payment or subscription';
COMMENT ON COLUMN purchases.subscription_id IS 'Stripe Subscription ID if mode is subscription';
COMMENT ON COLUMN purchases.payment_intent_id IS 'Stripe Payment Intent ID if mode is payment';
COMMENT ON COLUMN purchases.metadata IS 'Additional metadata from Stripe';
COMMENT ON COLUMN purchases.confirmation_email_sent IS 'Whether confirmation email was sent';
COMMENT ON COLUMN purchases.confirmation_email_id IS 'ID from email service provider';