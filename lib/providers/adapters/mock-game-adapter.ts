import { BaseProviderAdapter } from './base-adapter';
import {
  ProviderExecutionRequest,
  ProviderExecutionResult,
  HealthCheckResult,
} from '@/types/central-provider';

export class MockGameAdapter extends BaseProviderAdapter {
  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    await new Promise((r) => setTimeout(r, 80));
    return {
      provider_id: this.provider.id,
      provider_code: this.provider.code,
      status: 'HEALTHY',
      latency_ms: Date.now() - startTime,
      message: 'Mock Game Sandbox connection operational',
      checked_at: new Date().toISOString(),
    };
  }

  async execute(request: ProviderExecutionRequest): Promise<ProviderExecutionResult> {
    const start = Date.now();
    const { action, payload, reference_id } = request;

    await new Promise((r) => setTimeout(r, 120));

    if (action === 'validate_player') {
      const playerId = payload.player_id || payload.playerId || '12345678';
      return {
        success: true,
        provider_id: this.provider.id,
        provider_code: this.provider.code,
        action,
        reference_id,
        http_status: 200,
        duration_ms: Date.now() - start,
        data: {
          valid: true,
          player_name: `NayMos_${String(playerId).slice(-4)}`,
          server_id: payload.server_id || 'SEA',
          sandbox: true,
        },
      };
    }

    if (action === 'topup') {
      return {
        success: true,
        provider_id: this.provider.id,
        provider_code: this.provider.code,
        action,
        reference_id,
        http_status: 200,
        duration_ms: Date.now() - start,
        data: {
          transaction_id: `MOCK-TX-${Date.now()}`,
          status: 'SUCCESS',
          amount: payload.amount || 1,
          delivered_at: new Date().toISOString(),
          sandbox: true,
        },
      };
    }

    return {
      success: true,
      provider_id: this.provider.id,
      provider_code: this.provider.code,
      action,
      reference_id,
      http_status: 200,
      duration_ms: Date.now() - start,
      data: { status: 'OK', sandbox: true },
    };
  }
}
