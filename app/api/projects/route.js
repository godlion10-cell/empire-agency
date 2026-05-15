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
      .select('id, title, status, payload, createdAt, updatedAt')
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
    const body = await req.json();
    const title = body.title || 'New Campaign';
    const status = body.status || 'ANALYZING';
    const payload = body.payload || {};

    // 커스텀 payload를 기본 구조에 병합
    const finalPayload = {
      input: payload.input || { type: 'URL', url: '' },
      stageData: {
        script: { raw: null, edited: null, committed: false },
        visuals: { prompt: '', imageUrl: '', committed: false },
      },
      history: [{ action: 'CREATED', timestamp: new Date().toISOString() }],
      ...payload,
    };

    const { data, error } = await supabase
      .from('Project')
      .insert({
        title,
        status,
        payload: finalPayload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[PROJECTS] Insert error:', error);
      throw error;
    }

    console.log(`📦 [PROJECT] 생성 완료: ${data.id} — "${title}"`);
    return NextResponse.json({ success: true, project: data });
  } catch (error) {
    console.error('[PROJECTS] Create error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
