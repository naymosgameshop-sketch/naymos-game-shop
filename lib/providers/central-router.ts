import { createClient } from '@/lib/supabase/server';
import {
  CentralProvider,
  CentralProviderRoute,
  ProviderExecutionRequest,
  ProviderExecutionResult,
} from '@/types/central-provider';
import { providerRegistry } from './central-registry';
import { sanitizePayload } from './security/masking';

export async function logApiTransaction(
  providerId: string,
  routeKey: string,
  actionName: string,
  referenceId: string | undefined,
  status: 'SUCCESS' | 'FAILED' | 'PENDING',
  reqPayload: any,
  resPayload: any,
  httpStatus: number,
  durationMs: number,
  errorMessage?: string
) {
  try {
    const supabase = await createClient();
    const cleanReq = sanitizePayload(reqPayload || {});
    const cleanRes = sanitizePayload(resPayload || {});

    const { data: tx } = await supabase
      .from('api_transactions')
      .insert({
        provider_id: providerId,
        route_key: routeKey,
        action_name: actionName,
        reference_id: referenceId || null,
        status,
        request_payload_sanitized: cleanReq,
        response_payload_sanitized: cleanRes,
        http_status: httpStatus,
        duration_ms: durationMs,
        error_message: errorMessage || null,
      })
      .select('id')
      .single();

    if (tx?.id) {
      await supabase.from('api_logs').insert({
        provider_id: providerId,
        transaction_id: tx.id,
        level: status === 'SUCCESS' ? 'info' : 'error',
        message: `Action [${actionName}] completed with status ${status} (${durationMs}ms)`,
        metadata: {
          http_status: httpStatus,
          error: errorMessage || null,
        },
      });
    }
  } catch (e) {
    console.error('Failed to record API transaction log:', e);
  }
}

export async function dispatchCentralAction(
  request: ProviderExecutionRequest
): Promise<ProviderExecutionResult> {
  const start = Date.now();
  const supabase = await createClient();

  let targetProvider: CentralProvider | null = null;
  let failoverProvider: CentralProvider | null = null;

  if (request.provider_id) {
    const { data } = await supabase
      .from('providers')
      .select('*')
      .eq('id', request.provider_id)
      .single();
    targetProvider = data;
  }

  if (!targetProvider && request.route_key) {
    const { data: route } = await supabase
      .from('provider_routes')
      .select('*, provider:providers!provider_routes_provider_id_fkey(*)')
      .eq('route_key', request.route_key)
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .single();

    if (route?.provider) {
      targetProvider = route.provider as CentralProvider;
    }
    if (route?.failover_provider_id) {
      const { data: backup } = await supabase
        .from('providers')
        .select('*')
        .eq('id', route.failover_provider_id)
        .single();
      failoverProvider = backup;
    }
  }

  // Fallback to active sandbox provider if not resolved
  if (!targetProvider) {
    const { data } = await supabase
      .from('providers')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .single();

    targetProvider = data || {
      id: '11111111-1111-1111-1111-111111111101',
      code: 'mock-game-topup',
      name: 'Default Mock Provider',
      type: 'ALL',
      category: 'GAME_TOPUP',
      api_base_url: null,
      is_active: true,
      is_test_mode: true,
      environment: 'sandbox',
      priority: 1,
      health_status: 'HEALTHY',
      timeout_ms: 10000,
      max_retries: 2,
    };
  }

  const adapter = providerRegistry.getAdapter(targetProvider!);

  try {
    const result = await adapter.execute(request);
    await logApiTransaction(
      targetProvider!.id,
      request.route_key || targetProvider!.code,
      request.action,
      request.reference_id,
      result.success ? 'SUCCESS' : 'FAILED',
      request.payload,
      result.data || result.error,
      result.http_status,
      result.duration_ms,
      result.error
    );
    return result;
  } catch (err: any) {
    // If failover provider is available, attempt fallback
    if (failoverProvider && failoverProvider.is_active) {
      try {
        const failoverAdapter = providerRegistry.getAdapter(failoverProvider);
        const failoverResult = await failoverAdapter.execute(request);
        failoverResult.is_failover = true;
        failoverResult.original_error = err.message;

        await logApiTransaction(
          failoverProvider.id,
          request.route_key || failoverProvider.code,
          request.action,
          request.reference_id,
          failoverResult.success ? 'SUCCESS' : 'FAILED',
          request.payload,
          failoverResult.data,
          failoverResult.http_status,
          failoverResult.duration_ms,
          `Failover from ${targetProvider!.code}: ${err.message}`
        );
        return failoverResult;
      } catch (fallbackErr: any) {
        // Both primary and failover failed
      }
    }

    const duration = Date.now() - start;
    await logApiTransaction(
      targetProvider!.id,
      request.route_key || targetProvider!.code,
      request.action,
      request.reference_id,
      'FAILED',
      request.payload,
      null,
      500,
      duration,
      err.message || 'Execution error'
    );

    return {
      success: false,
      provider_id: targetProvider!.id,
      provider_code: targetProvider!.code,
      action: request.action,
      reference_id: request.reference_id,
      http_status: 500,
      duration_ms: duration,
      error: err.message || 'Provider execution failed',
    };
  }
}
