import { NextRequest, NextResponse } from 'next/server';
import { POST as genericSync } from '../sync/route';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Wrap req with code = finshop
  const url = new URL(req.url);
  const syntheticReq = new NextRequest(url, {
    method: 'POST',
    headers: req.headers,
    body: JSON.stringify({ code: 'finshop' }),
  });
  return genericSync(syntheticReq);
}
