import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { promises as fs } from 'fs';
import path from 'path';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2026-01-28.clover',
  });
}

const PAID_SESSIONS_PATH = path.join('/tmp', 'paid-sessions.json');

interface PaidSession {
  sessionId: string;
  email: string;
  analysisId: string;
  paidAt: string;
}

async function loadPaidSessions(): Promise<PaidSession[]> {
  try {
    const data = await fs.readFile(PAID_SESSIONS_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function savePaidSession(session: PaidSession): Promise<void> {
  const sessions = await loadPaidSessions();
  const existingIds = new Set(sessions.map(s => s.sessionId));
  if (!existingIds.has(session.sessionId)) {
    sessions.push(session);
    await fs.writeFile(PAID_SESSIONS_PATH, JSON.stringify(sessions, null, 2));
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    await savePaidSession({
      sessionId: session.id,
      email: session.metadata?.email || session.customer_email || '',
      analysisId: session.metadata?.analysisId || '',
      paidAt: new Date().toISOString(),
    });

    console.log('Payment recorded:', session.id);
  }

  return NextResponse.json({ received: true });
}
