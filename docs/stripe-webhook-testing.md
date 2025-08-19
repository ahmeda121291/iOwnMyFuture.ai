# Stripe Webhook Testing Guide

## Overview
This guide explains how to test the Stripe webhook integration, email confirmations, and success page flow.

## Prerequisites

1. **Stripe CLI**: Install the Stripe CLI for local webhook testing
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Windows
   scoop install stripe
   
   # Linux
   curl -s https://packages.stripe.com/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
   echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.com/stripe-cli-apt stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
   sudo apt update
   sudo apt install stripe
   ```

2. **Environment Variables**: Ensure these are set in your Supabase project:
   - `STRIPE_SECRET_KEY`: Your Stripe secret key
   - `STRIPE_WEBHOOK_SECRET`: Webhook endpoint secret from Stripe
   - `RESEND_API_KEY`: Your Resend API key for sending emails
   - `FROM_EMAIL`: Verified sender email address
   - `APP_URL`: Your application URL

## Testing Webhooks Locally

### 1. Forward Webhooks to Local Environment

```bash
# Login to Stripe CLI
stripe login

# Forward webhooks to your local Supabase Edge Function
stripe listen --forward-to http://localhost:54321/functions/v1/stripe-webhook

# The CLI will display your webhook signing secret
# Copy this and set it as STRIPE_WEBHOOK_SECRET in your .env.local
```

### 2. Trigger Test Events

```bash
# Test checkout.session.completed event
stripe trigger checkout.session.completed

# Test with custom data
stripe trigger checkout.session.completed \
  --override checkout_session:customer_details.email=test@example.com \
  --override checkout_session:amount_total=9900 \
  --override checkout_session:currency=usd
```

### 3. Monitor Webhook Logs

```bash
# In a separate terminal, watch the webhook logs
stripe logs tail --filter-event-types checkout.session.completed
```

## Testing in Production

### 1. Set Up Webhook Endpoint in Stripe Dashboard

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your endpoint URL: `https://your-project.supabase.co/functions/v1/stripe-webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the signing secret and add it to your Supabase environment variables

### 2. Test Email Delivery

#### Verify Email Domain (Resend)
1. Log in to [Resend Dashboard](https://resend.com)
2. Go to Domains → Add Domain
3. Follow DNS verification steps
4. Update `FROM_EMAIL` environment variable with verified domain email

#### Test Email Sending
```javascript
// Test email sending directly via Edge Function
const response = await fetch('https://your-project.supabase.co/functions/v1/stripe-webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'stripe-signature': 'test_sig_xxx' // Use actual signature in production
  },
  body: JSON.stringify({
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_xxx',
        customer_details: {
          email: 'test@example.com',
          name: 'Test User'
        },
        amount_total: 9900,
        currency: 'usd',
        payment_status: 'paid',
        mode: 'subscription'
      }
    }
  })
});
```

### 3. Test Success Page

#### Manual Testing
1. Create a test Checkout Session:
```javascript
// In your application
const { data, error } = await supabase.functions.invoke('create-checkout-session', {
  body: { 
    priceId: 'price_xxx',
    successUrl: 'https://your-app.com/success?session_id={CHECKOUT_SESSION_ID}',
    cancelUrl: 'https://your-app.com/pricing'
  }
});

// Redirect to Stripe Checkout
window.location.href = data.url;
```

2. Complete the test payment using Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Requires authentication: `4000 0025 0000 3155`
   - Declined: `4000 0000 0000 9995`

3. Verify the success page:
   - Shows "Processing payment..." initially
   - Fetches session details via Edge Function
   - Displays receipt with correct amount
   - Shows confirmation email notice

## Troubleshooting

### Common Issues

1. **No confirmation email received**
   - Check Resend API key is valid
   - Verify sender domain is verified in Resend
   - Check webhook logs for email sending errors
   - Review spam folder

2. **Success page shows endless spinner**
   - Verify `get-stripe-session` Edge Function is deployed
   - Check browser console for errors
   - Ensure session_id parameter is in URL
   - Verify Stripe API key is correct

3. **Webhook signature verification fails**
   - Ensure you're using the correct webhook secret
   - Don't modify the raw request body
   - Check that Content-Type is preserved

### Debug Commands

```bash
# Check Edge Function logs
supabase functions logs stripe-webhook --tail

# Test Edge Function locally
supabase functions serve stripe-webhook --env-file .env.local

# Verify environment variables
supabase secrets list

# Check database for purchase records
SELECT * FROM purchases WHERE customer_email = 'test@example.com';
```

## Best Practices

1. **Email Deliverability**
   - Use a verified domain for sending
   - Include unsubscribe links in emails
   - Set up SPF, DKIM, and DMARC records
   - Monitor bounce rates

2. **Success Page Caching**
   - Add cache-control headers to prevent caching:
   ```javascript
   // In your service worker or CDN config
   if (url.pathname.includes('/success')) {
     headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
   }
   ```

3. **Idempotency**
   - Store webhook event IDs to prevent duplicate processing
   - Use Stripe's idempotency keys for API calls

4. **Error Handling**
   - Log all webhook errors for debugging
   - Set up alerts for failed email sends
   - Implement retry logic for transient failures

## Security Considerations

1. Always verify webhook signatures
2. Use environment variables for sensitive data
3. Implement rate limiting on Edge Functions
4. Validate session ownership before showing details
5. Use HTTPS for all webhook endpoints

## Monitoring

Set up monitoring for:
- Webhook success/failure rates
- Email delivery rates
- Success page load times
- Database query performance

Use tools like:
- Stripe Dashboard for payment metrics
- Resend Dashboard for email analytics
- Supabase Dashboard for function logs
- Application monitoring (Sentry, LogRocket, etc.)