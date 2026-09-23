import { CentralProvider } from '@/types/central-provider';
import { BaseProviderAdapter } from './adapters/base-adapter';
import { MockGameAdapter } from './adapters/mock-game-adapter';
import { MockDigitalAdapter } from './adapters/mock-digital-adapter';
import { AIGatewayAdapter } from './adapters/ai-gateway-adapter';
import { createClient } from '@/lib/supabase/server';

export class CentralProviderRegistry {
  private static instance: CentralProviderRegistry;
  private adapterCache: Map<string, BaseProviderAdapter> = new Map();

  public static getInstance(): CentralProviderRegistry {
    if (!CentralProviderRegistry.instance) {
      CentralProviderRegistry.instance = new CentralProviderRegistry();
    }
    return CentralProviderRegistry.instance;
  }

  public getAdapter(provider: CentralProvider): BaseProviderAdapter {
    if (this.adapterCache.has(provider.code)) {
      return this.adapterCache.get(provider.code)!;
    }

    let adapter: BaseProviderAdapter;

    if (provider.code === 'ai-gateway' || provider.category === 'AI') {
      adapter = new AIGatewayAdapter(provider);
    } else if (
      provider.code.includes('digital') ||
      provider.category === 'PREMIUM_APP' ||
      provider.category === 'DIGITAL_PRODUCT'
    ) {
      adapter = new MockDigitalAdapter(provider);
    } else {
      adapter = new MockGameAdapter(provider);
    }

    this.adapterCache.set(provider.code, adapter);
    return adapter;
  }

  public clearCache(): void {
    this.adapterCache.clear();
  }
}

export const providerRegistry = CentralProviderRegistry.getInstance();
