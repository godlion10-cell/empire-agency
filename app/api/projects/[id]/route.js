import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET   /api/projects/[id] — 프로젝트 payload 전체 조회
 * PATCH /api/projects/[id] — payload/status 부분 업데이트
 * DELETE /api/projects/[id] — 프로젝트 삭제
 */
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, project });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.status !== undefined) data.status = body.status;
    if (body.payload !== undefined) data.payload = body.payload;

    const updated = await prisma.project.update({ where: { id }, data });
    return NextResponse.json({ success: true, project: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
