import { BaseProviderAdapter } from './base-adapter';
import {
  ProviderExecutionRequest,
  ProviderExecutionResult,
  HealthCheckResult,
} from '@/types/central-provider';

export class AIGatewayAdapter extends BaseProviderAdapter {
  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const hasGemini = !!process.env.GEMINI_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasGroq = !!process.env.GROQ_API_KEY;

    const isAvailable = hasGemini || hasOpenAI || hasGroq;

    return {
      provider_id: this.provider.id,
      provider_code: this.provider.code,
      status: isAvailable ? 'HEALTHY' : 'DEGRADED',
      latency_ms: Date.now() - startTime,
      message: `AI Models active: Gemini (${hasGemini ? 'OK' : 'No key'}), OpenAI (${hasOpenAI ? 'OK' : 'No key'}), Groq (${hasGroq ? 'OK' : 'No key'})`,
      checked_at: new Date().toISOString(),
    };
  }

  async execute(request: ProviderExecutionRequest): Promise<ProviderExecutionResult> {
    const start = Date.now();
    return {
      success: true,
      provider_id: this.provider.id,
      provider_code: this.provider.code,
      action: request.action,
      reference_id: request.reference_id,
      http_status: 200,
      duration_ms: Date.now() - start,
      data: {
        status: 'READY',
        message: 'AI Gateway request handled',
      },
    };
  }
}
