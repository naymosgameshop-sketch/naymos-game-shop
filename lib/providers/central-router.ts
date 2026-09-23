import { createClient } from '@/lib/supabase/server';
import type {
  CentralProvider,
  ProviderRoute,
  ApiTransactionStatus,
} from '@/types/central-provider';

/**
 * Server-side Provider Router
 * Resolves Primary / Backup providers without exposing any internal credentials to clients.
 */
export async function getProviderRouteForProduct(
  targetType: 'GAME_PRODUCT' | 'DIGITAL_PRODUCT_PACKAGE',
  targetId: string
): Promise<{ primary: ProviderRoute | null; backups: ProviderRoute[] }> {
  try {
    const supabase = await createClient();
    const { data: routes, error } = await supabase
      .from('provider_routes')
      .select('*')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (error || !routes || routes.length === 0) {
      return { primary: null, backups: [] };
    }

    const [primary, ...backups] = routes as ProviderRoute[];
    return { primary: primary || null, backups };
  } catch {
    return { primary: null, backups: [] };
  }
}

export async function recordApiTransaction(params: {
  orderId?: string;
  orderNumber?: string;
  providerId: string;
  targetType: string;
  targetId: string;
  providerProductId?: string;
  requestPayload: Record<string, unknown>;
  status: ApiTransactionStatus;
  providerOrderId?: string;
  cost?: number;
}): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('api_transactions')
      .insert({
        order_id: params.orderId,
        order_number: params.orderNumber,
        provider_id: params.providerId,
        target_type: params.targetType,
        target_id: params.targetId,
        provider_product_id: params.providerProductId,
        request_payload: params.requestPayload,
        status: params.status,
        provider_order_id: params.providerOrderId,
        cost: params.cost,
      })
      .select('id')
      .single();

    if (error || !data) return null;
    return data.id;
  } catch {
    return null;
  }
}

export async function updateApiTransactionStatus(
  transactionId: string,
  status: ApiTransactionStatus,
  responsePayload?: Record<string, unknown>,
  errorMessage?: string
) {
  try {
    const supabase = await createClient();
    await supabase
      .from('api_transactions')
      .update({
        status,
        response_payload: responsePayload ?? null,
        error_message: errorMessage ?? null,
        completed_at: ['SUCCESS', 'FAILED', 'CANCELLED'].includes(status) ? new Date().toISOString() : null,
      })
      .eq('id', transactionId);
  } catch {}
}
