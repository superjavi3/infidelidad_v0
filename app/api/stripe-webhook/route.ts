import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { forgetSession } from '@/lib/payments';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '');
}

// El acceso se comprueba siempre contra Stripe (lib/payments.ts). El webhook solo
// sirve para olvidar al momento la caché de una sesión reembolsada o disputada.
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('Payment completed:', session.id);
    }

    if (event.type === 'charge.refunded' || event.type === 'charge.dispute.created') {
      const obj = event.data.object as Stripe.Charge | Stripe.Dispute;
      const paymentIntent = typeof obj.payment_intent === 'string' ? obj.payment_intent : obj.payment_intent?.id;
      if (paymentIntent) {
        const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntent, limit: 1 });
        sessions.data.forEach(s => forgetSession(s.id));
        console.log(`Access revoked (${event.type}) for payment_intent`, paymentIntent);
      }
    }
  } catch (err: unknown) {
    console.error('Webhook handling error:', err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ received: true });
}
