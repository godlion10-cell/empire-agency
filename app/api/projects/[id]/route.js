import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

/**
 * GET    /api/projects/[id] — 프로젝트 전체 조회
 * PATCH  /api/projects/[id] — payload/status 업데이트
 * DELETE /api/projects/[id] — 삭제
 */
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from('Project')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, project: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updates = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.status !== undefined) updates.status = body.status;
    if (body.payload !== undefined) updates.payload = body.payload;

    const { data, error } = await supabase
      .from('Project')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, project: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const { error } = await supabase
      .from('Project')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
