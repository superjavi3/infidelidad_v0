import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const EVENTS_FILE = path.join(process.cwd(), 'analytics-events.json');

interface TrackEvent {
  event: string;
  score?: number;
  personA?: string;
  personB?: string;
  totalMessages?: number;
  timestamp: string;
  userAgent?: string;
}

async function readEvents(): Promise<TrackEvent[]> {
  try {
    const data = await fs.readFile(EVENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeEvents(events: TrackEvent[]) {
  await fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, score, personA, personB, totalMessages } = body;

    if (!event) {
      return NextResponse.json({ error: 'Missing event name' }, { status: 400 });
    }

    const trackEvent: TrackEvent = {
      event,
      score,
      personA,
      personB,
      totalMessages,
      timestamp: new Date().toISOString(),
      userAgent: req.headers.get('user-agent') || undefined,
    };

    const events = await readEvents();
    events.push(trackEvent);
    await writeEvents(events);

    // Log to console for server monitoring
    console.log(`[ANALYTICS] ${event}`, { score, personA, personB, totalMessages });

    return NextResponse.json({ success: true, totalEvents: events.length });
  } catch (error: any) {
    console.error('[ANALYTICS] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const events = await readEvents();

    const shareCount = events.filter(e => e.event === 'share_story').length;
    const analysisCount = events.filter(e => e.event === 'analysis_complete').length;
    const avgScore = events
      .filter(e => e.event === 'share_story' && e.score)
      .reduce((sum, e, _, arr) => sum + (e.score || 0) / arr.length, 0);

    return NextResponse.json({
      total: events.length,
      shares: shareCount,
      analyses: analysisCount,
      avgShareScore: Math.round(avgScore),
      recentEvents: events.slice(-20).reverse(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
