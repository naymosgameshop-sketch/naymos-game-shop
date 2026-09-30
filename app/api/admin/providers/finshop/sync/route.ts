import { requireAdmin } from '@/lib/auth/get-user';
import { NextRequest, NextResponse } from 'next/server';
import { POST as genericSync } from '../sync/route';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ success: false, message: 'ไม่มีสิทธิ์ Admin' }, { status: 403 });
  }

  // Wrap req with code = finshop
  const url = new URL(req.url);
  const syntheticReq = new NextRequest(url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify({ code: 'finshop' }),
  });
  return genericSync(syntheticReq);
}
