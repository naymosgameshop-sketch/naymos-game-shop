import { BaseProviderAdapter } from './base-adapter';
import {
  ProviderExecutionRequest,
  ProviderExecutionResult,
  HealthCheckResult,
} from '@/types/central-provider';

export class MockDigitalAdapter extends BaseProviderAdapter {
  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    await new Promise((r) => setTimeout(r, 60));
    return {
      provider_id: this.provider.id,
      provider_code: this.provider.code,
      status: 'HEALTHY',
      latency_ms: Date.now() - startTime,
      message: 'Mock Digital Goods Sandbox online',
      checked_at: new Date().toISOString(),
    };
  }

  async execute(request: ProviderExecutionRequest): Promise<ProviderExecutionResult> {
    const start = Date.now();
    const { action, payload, reference_id } = request;

    await new Promise((r) => setTimeout(r, 100));

    if (action === 'deliver_package') {
      const packageCode = payload.package_code || 'PREMIUM-ACC';
      return {
        success: true,
        provider_id: this.provider.id,
        provider_code: this.provider.code,
        action,
        reference_id,
        http_status: 200,
        duration_ms: Date.now() - start,
        data: {
          delivery_type: 'CREDENTIALS',
          credentials: {
            username: `naymos_${Math.floor(Math.random() * 8999 + 1000)}@premium.store`,
            password: `NayMos!${Math.floor(Math.random() * 899999 + 100000)}`,
            invite_link: `https://invite.premium-apps.store/join/${Date.now()}`,
            note: 'จัดส่งอัตโนมัติจากระบบส่วนกลาง NayMos Sandbox',
          },
          status: 'DELIVERED',
          package_code: packageCode,
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
