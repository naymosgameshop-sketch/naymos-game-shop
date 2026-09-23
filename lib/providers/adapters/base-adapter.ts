import {
  CentralProvider,
  ProviderExecutionRequest,
  ProviderExecutionResult,
  HealthCheckResult,
} from '@/types/central-provider';
import { sanitizePayload } from '../security/masking';

export abstract class BaseProviderAdapter {
  protected provider: CentralProvider;

  constructor(provider: CentralProvider) {
    this.provider = provider;
  }

  public get id(): string {
    return this.provider.id;
  }

  public get code(): string {
    return this.provider.code;
  }

  public get isTestMode(): boolean {
    return this.provider.is_test_mode || this.provider.environment === 'sandbox';
  }

  abstract checkHealth(): Promise<HealthCheckResult>;

  abstract execute(request: ProviderExecutionRequest): Promise<ProviderExecutionResult>;

  protected sanitize(data: any): any {
    return sanitizePayload(data);
  }
}
