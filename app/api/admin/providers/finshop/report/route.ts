import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { providerRegistry } from '@/lib/providers/central-registry';
import { CentralProvider } from '@/types/central-provider';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { transaction_id, report_text } = body;

    if (!transaction_id || !report_text) {
      return NextResponse.json({ error: 'transaction_id และ report_text จำเป็นต้องระบุ' }, { status: 400 });
    }

    const { data: provider } = await supabase
      .from('providers')
      .select('*')
      .eq('code', 'finshop')
      .maybeSingle();

    if (!provider) {
      return NextResponse.json({ error: 'ไม่พบ Provider FinShop ในระบบ' }, { status: 404 });
    }

    const adapter = providerRegistry.getAdapter(provider as CentralProvider);
    const result = await adapter.execute({
      action: 'report',
      payload: {
        transaction_id,
        report_text,
      },
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'ส่งรายงานปัญหาไม่สำเร็จ' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: 'ส่งรายงานปัญหาไปยัง FinShop สำเร็จ',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
