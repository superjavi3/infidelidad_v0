import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { supabaseAdmin } from '@/lib/supabase';

// POST: create a new shared analysis
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { alias, score, stats, aiInsight, participantNames, dateRange, totalMessages, premiumSections, chartImages } = body;

    if (score == null || !stats || !participantNames || !totalMessages) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Sanitize: only keep computed stats, never raw messages
    const isGroup = stats.type === 'group';
    const safeStats: Record<string, unknown> = isGroup
      ? {
          type: 'group',
          groupName: String(stats.groupName || '').substring(0, 100),
          totalMessages: Number(stats.totalMessages) || 0,
          totalDays: Number(stats.totalDays) || 0,
          uniqueDays: Number(stats.uniqueDays) || 0,
          score: Number(stats.score) || 0,
          verdict: String(stats.verdict || ''),
          nightPct: Number(stats.nightPct) || 0,
          totalMedia: Number(stats.totalMedia) || 0,
          avgReplyFormatted: String(stats.avgReplyFormatted || ''),
          activeCount: Number(stats.activeCount) || 0,
          ghostCount: Number(stats.ghostCount) || 0,
          memberCount: Number(stats.memberCount) || 0,
          topMembers: Array.isArray(stats.topMembers)
            ? stats.topMembers.slice(0, 15).map((m: Record<string, unknown>) => ({
                name: String(m.name || '').substring(0, 50),
                msgCount: Number(m.msgCount) || 0,
                pct: Number(m.pct) || 0,
                category: String(m.category || ''),
              }))
            : [],
        }
      : {
          personA: stats.personA,
          personB: stats.personB,
          msgsA: stats.msgsA,
          msgsB: stats.msgsB,
          total: stats.total,
          score: stats.score,
          verdict: stats.verdict,
          loveCount: stats.loveCount,
          nightPct: stats.nightPct,
          uniqueDays: stats.uniqueDays,
          avgReplyFormatted: stats.avgReplyFormatted,
          leader: stats.leader,
          leaderPct: stats.leaderPct,
          ratio: stats.ratio,
          silencesCount: stats.silencesCount,
          totalDouble: stats.totalDouble,
        };

    // Include premium section HTML content
    if (premiumSections && typeof premiumSections === 'object') {
      const truncate = (val: unknown) => typeof val === 'string' ? val.substring(0, 15000) : null;
      if (isGroup) {
        safeStats.premium = {
          powerRanking: truncate(premiumSections.powerRanking),
          timeline: truncate(premiumSections.timeline),
          ghosts: truncate(premiumSections.ghosts),
          ignore: truncate(premiumSections.ignore),
          schedule: truncate(premiumSections.schedule),
          deleted: truncate(premiumSections.deleted),
          autopsy: truncate(premiumSections.autopsy),
          eras: truncate(premiumSections.eras),
          archetypes: truncate(premiumSections.archetypes),
          subgroups: truncate(premiumSections.subgroups),
          death: truncate(premiumSections.death),
        };
      } else {
        safeStats.premium = {
          timeline: truncate(premiumSections.timeline),
          silences: truncate(premiumSections.silences),
          doubleText: truncate(premiumSections.doubleText),
          multimedia: truncate(premiumSections.multimedia),
          deleted: truncate(premiumSections.deleted),
          forensic: truncate(premiumSections.forensic),
          beforeNow: truncate(premiumSections.beforeNow),
          ghosting: truncate(premiumSections.ghosting),
          language: truncate(premiumSections.language),
        };
      }
    }

    // Include chart images (base64 PNG, max ~500KB each)
    if (chartImages && typeof chartImages === 'object') {
      const safeCharts: Record<string, string> = {};
      for (const [key, val] of Object.entries(chartImages)) {
        if (typeof val === 'string' && val.startsWith('data:image/') && val.length < 500000) {
          safeCharts[key] = val;
        }
      }
      if (Object.keys(safeCharts).length > 0) {
        safeStats.chartImages = safeCharts;
      }
    }

    const id = nanoid(10);

    const { error } = await supabaseAdmin
      .from('shared_analyses')
      .insert({
        id,
        alias: alias?.trim()?.substring(0, 50) || null,
        score,
        stats: safeStats,
        ai_insight: aiInsight?.substring(0, 500) || null,
        participant_names: participantNames.map((n: string) => n.substring(0, 50)),
        date_range: dateRange?.substring(0, 100) || null,
        total_messages: totalMessages,
        views: 0,
      });

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: 'Error saving analysis', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    console.error('Share API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Error creating shared link', details: message },
      { status: 500 }
    );
  }
}

// GET: fetch a shared analysis by id
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id parameter is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('shared_analyses')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // Increment views (fire and forget)
    supabaseAdmin.rpc('increment_views', { analysis_id: id }).then();

    return NextResponse.json({ success: true, analysis: data });
  } catch (error: unknown) {
    console.error('Share GET error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Error fetching analysis', details: message },
      { status: 500 }
    );
  }
}
