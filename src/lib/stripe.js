import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

export default stripePromise

export const createCheckoutSession = async (priceId) => {
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ priceId }),
  })

  if (!response.ok) {
    throw new Error('Failed to create checkout session')
  }

  return response.json()
}