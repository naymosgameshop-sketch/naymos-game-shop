import { BaseProviderAdapter } from './base-adapter';
import {
  ProviderExecutionRequest,
  ProviderExecutionResult,
  HealthCheckResult,
} from '@/types/central-provider';
import { createClient } from '@/lib/supabase/server';

export class FinShopAdapter extends BaseProviderAdapter {
  private get baseUrl(): string {
    return this.provider.api_base_url?.replace(/\/$/, '') || 'https://finshop.me/api/v1';
  }

  private get apiKey(): string | null {
    return this.provider.api_key || process.env.FINSHOP_API_KEY || null;
  }

  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const apiKey = this.apiKey;
    if (!apiKey) {
      return {
        provider_id: this.provider.id,
        provider_code: this.provider.code,
        status: 'DOWN',
        latency_ms: 0,
        message: 'FinShop API Key ยังไม่ได้ตั้งค่า (ไม่ได้กำหนดใน Provider หรือ Environment)',
        checked_at: new Date().toISOString(),
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.provider.timeout_ms || 10000);

      const res = await fetch(`${this.baseUrl}/balance`, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const latency = Date.now() - startTime;
      if (!res.ok) {
        return {
          provider_id: this.provider.id,
          provider_code: this.provider.code,
          status: 'DOWN',
          latency_ms: latency,
          message: `FinShop API ตอบกลับ HTTP ${res.status}`,
          checked_at: new Date().toISOString(),
        };
      }

      const body = await res.json().catch(() => null);
      if (body && body.status === 'success') {
        const balance = body.data?.balance;
        return {
          provider_id: this.provider.id,
          provider_code: this.provider.code,
          status: latency > 3000 ? 'DEGRADED' : 'HEALTHY',
          latency_ms: latency,
          message: `FinShop Online: ยอดเงินคงเหลือ ฿${Number(balance || 0).toLocaleString()}`,
          checked_at: new Date().toISOString(),
        };
      }

      return {
        provider_id: this.provider.id,
        provider_code: this.provider.code,
        status: 'DEGRADED',
        latency_ms: latency,
        message: body?.message || 'FinShop ตอบกลับรูปแบบผิดปกติ',
        checked_at: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        provider_id: this.provider.id,
        provider_code: this.provider.code,
        status: 'DOWN',
        latency_ms: Date.now() - startTime,
        message: err.name === 'AbortError' ? 'FinShop API Timeout' : (err.message || 'Network error'),
        checked_at: new Date().toISOString(),
      };
    }
  }

  async execute(request: ProviderExecutionRequest): Promise<ProviderExecutionResult> {
    const start = Date.now();
    const { action, payload, reference_id } = request;
    const apiKey = this.apiKey;

    if (!apiKey) {
      return {
        success: false,
        provider_id: this.provider.id,
        provider_code: this.provider.code,
        action,
        reference_id,
        http_status: 401,
        duration_ms: Date.now() - start,
        error: 'FinShop API Key ยังไม่ได้ตั้งค่า',
      };
    }

    const headers = {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    try {
      if (action === 'check_balance') {
        const res = await this.callApi('/balance', { method: 'GET', headers });
        return {
          success: res.ok && res.data?.status === 'success',
          provider_id: this.provider.id,
          provider_code: this.provider.code,
          action,
          reference_id,
          http_status: res.status,
          duration_ms: Date.now() - start,
          data: res.data?.data || null,
          error: res.data?.status !== 'success' ? res.data?.message : undefined,
        };
      }

      if (action === 'get_products') {
        const res = await this.callApi('/products', { method: 'GET', headers });
        return {
          success: res.ok && res.data?.status === 'success',
          provider_id: this.provider.id,
          provider_code: this.provider.code,
          action,
          reference_id,
          http_status: res.status,
          duration_ms: Date.now() - start,
          data: res.data?.data || [],
          error: res.data?.status !== 'success' ? res.data?.message : undefined,
        };
      }

      if (action === 'purchase' || action === 'deliver_package') {
        if (reference_id) {
          try {
            const supabase = await createClient();
            const { data: existingTx } = await supabase
              .from('api_transactions')
              .select('id, status, response_payload_sanitized')
              .eq('reference_id', reference_id)
              .in('status', ['SUCCESS', 'PENDING'])
              .maybeSingle();

            if (existingTx) {
              if (existingTx.status === 'SUCCESS') {
                return {
                  success: true,
                  provider_id: this.provider.id,
                  provider_code: this.provider.code,
                  action,
                  reference_id,
                  http_status: 200,
                  duration_ms: Date.now() - start,
                  data: existingTx.response_payload_sanitized,
                  error: 'DUPLICATE_PURCHASE_PREVENTED: รายการนี้ได้รับการจัดส่งสำเร็จไปแล้ว',
                };
              }
              if (existingTx.status === 'PENDING') {
                return {
                  success: false,
                  provider_id: this.provider.id,
                  provider_code: this.provider.code,
                  action,
                  reference_id,
                  http_status: 409,
                  duration_ms: Date.now() - start,
                  error: 'TRANSACTION_IN_PROGRESS: คำสั่งซื้อนี้กำลังดำเนินการอยู่ ห้ามส่งซ้ำ',
                };
              }
            }
          } catch (dbErr) {
            console.error('Failed to check duplicate transaction:', dbErr);
          }
        }

        const productId = payload.product_id || payload.provider_product_id;
        const customer = payload.customer || payload.customer_username || 'customer';

        if (!productId) {
          return {
            success: false,
            provider_id: this.provider.id,
            provider_code: this.provider.code,
            action,
            reference_id,
            http_status: 400,
            duration_ms: Date.now() - start,
            error: 'Missing product_id for FinShop purchase',
          };
        }

        const res = await this.callApi('/purchase', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            product_id: Number(productId),
            customer: String(customer),
          }),
        });

        const isSuccess = res.ok && res.data?.status === 'success';
        const purchaseData = res.data?.data;

        return {
          success: isSuccess,
          provider_id: this.provider.id,
          provider_code: this.provider.code,
          action,
          reference_id,
          http_status: res.status,
          duration_ms: Date.now() - start,
          data: isSuccess
            ? {
                transaction_id: purchaseData?.transaction_id,
                product_id: purchaseData?.product_id,
                product_name: purchaseData?.product_name,
                amount: purchaseData?.amount,
                stock_received: purchaseData?.stock_received,
                remaining_balance: purchaseData?.remaining_balance,
                customer: purchaseData?.customer,
                delivery_type: 'STOCK_CREDENTIALS',
              }
            : null,
          error: !isSuccess ? (res.data?.message || `Purchase failed with HTTP ${res.status}`) : undefined,
        };
      }

      if (action === 'get_history') {
        const limit = payload.limit || 50;
        const offset = payload.offset || 0;
        let url = `/history?limit=${limit}&offset=${offset}`;
        if (payload.customer) {
          url += `&customer=${encodeURIComponent(payload.customer)}`;
        }

        const res = await this.callApi(url, { method: 'GET', headers });
        return {
          success: res.ok && res.data?.status === 'success',
          provider_id: this.provider.id,
          provider_code: this.provider.code,
          action,
          reference_id,
          http_status: res.status,
          duration_ms: Date.now() - start,
          data: res.data?.data || [],
          error: res.data?.status !== 'success' ? res.data?.message : undefined,
        };
      }

      if (action === 'report') {
        const transactionId = payload.transaction_id;
        const reportText = payload.report_text || 'เข้าไม่ได้';

        if (!transactionId) {
          return {
            success: false,
            provider_id: this.provider.id,
            provider_code: this.provider.code,
            action,
            reference_id,
            http_status: 400,
            duration_ms: Date.now() - start,
            error: 'Missing transaction_id for report',
          };
        }

        const res = await this.callApi('/report', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            transaction_id: String(transactionId),
            report_text: String(reportText),
          }),
        });

        return {
          success: res.ok && res.data?.status === 'success',
          provider_id: this.provider.id,
          provider_code: this.provider.code,
          action,
          reference_id,
          http_status: res.status,
          duration_ms: Date.now() - start,
          data: res.data?.data || res.data,
          error: res.data?.status !== 'success' ? res.data?.message : undefined,
        };
      }

      if (action === 'ping') {
        const health = await this.checkHealth();
        return {
          success: health.status === 'HEALTHY',
          provider_id: this.provider.id,
          provider_code: this.provider.code,
          action,
          reference_id,
          http_status: health.status === 'HEALTHY' ? 200 : 503,
          duration_ms: health.latency_ms,
          data: health,
          error: health.status !== 'HEALTHY' ? health.message : undefined,
        };
      }

      return {
        success: false,
        provider_id: this.provider.id,
        provider_code: this.provider.code,
        action,
        reference_id,
        http_status: 400,
        duration_ms: Date.now() - start,
        error: `Unsupported action: ${action}`,
      };
    } catch (err: any) {
      return {
        success: false,
        provider_id: this.provider.id,
        provider_code: this.provider.code,
        action,
        reference_id,
        http_status: 500,
        duration_ms: Date.now() - start,
        error: err.name === 'AbortError' ? 'FinShop Request Timeout' : (err.message || 'Execution error'),
      };
    }
  }

  private async callApi(endpoint: string, options: RequestInit): Promise<{ ok: boolean; status: number; data: any }> {
    const controller = new AbortController();
    const timeoutMs = this.provider.timeout_ms || 10000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      return {
        ok: res.ok,
        status: res.status,
        data,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }
  }
}
