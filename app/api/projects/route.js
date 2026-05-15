import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET  /api/projects — 프로젝트 목록
 * POST /api/projects — 새 프로젝트 생성
 */
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, status: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json({ success: true, projects });
  } catch (error) {
    console.error('[PROJECTS] List error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { title, payload } = await req.json();
    const project = await prisma.project.create({
      data: {
        title: title || 'New Campaign',
        status: 'IDLE',
        payload: payload || {
          isAuto: false,
          autoStages: { GEN_SCRIPT: false, REVIEW_SCRIPT: false, GEN_VISUALS: false, REVIEW_VISUALS: false },
          input: { type: 'URL', url: '', keyword: '', region: 'US', videoTitle: '', channelName: '' },
          stageData: {
            script: { raw: null, edited: null, committed: false },
            visuals: { prompt: '', editedPrompt: '', imageUrl: '', generationId: '', committed: false },
          },
          history: [],
        },
      },
    });
    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error('[PROJECTS] Create error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
