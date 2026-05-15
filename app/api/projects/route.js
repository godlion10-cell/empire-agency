import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

/**
 * GET  /api/projects — 프로젝트 목록
 * POST /api/projects — 새 프로젝트 생성
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('Project')
      .select('id, title, status, createdAt, updatedAt')
      .order('updatedAt', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, projects: data || [] });
  } catch (error) {
    console.error('[PROJECTS] List error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { title } = await req.json();
    const defaultPayload = {
      isAuto: false,
      autoStages: { GEN_SCRIPT: false, REVIEW_SCRIPT: false, GEN_VISUALS: false, REVIEW_VISUALS: false },
      input: { type: 'URL', url: '', keyword: '', region: 'US', videoTitle: '', channelName: '' },
      stageData: {
        script: { raw: null, edited: null, committed: false },
        visuals: { prompt: '', editedPrompt: '', imageUrl: '', generationId: '', source_engine: '', committed: false },
      },
      history: [],
    };

    const { data, error } = await supabase
      .from('Project')
      .insert({ title: title || 'New Campaign', status: 'IDLE', payload: defaultPayload })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, project: data });
  } catch (error) {
    console.error('[PROJECTS] Create error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
