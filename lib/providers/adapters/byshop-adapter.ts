import { BaseProviderAdapter } from './base-adapter';
import {
  ProviderExecutionRequest,
  ProviderExecutionResult,
  HealthCheckResult,
} from '@/types/central-provider';

export class ByShopAdapter extends BaseProviderAdapter {
  private get baseUrl(): string {
    return this.provider.api_base_url?.replace(/\/$/, '') || 'https://byshop.me/api';
  }

  private get apiKey(): string | null {
    return this.provider.api_key || process.env.BYSHOP_API_KEY || null;
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
        message: 'BYShop API Key ยังไม่ได้ตั้งค่า',
        checked_at: new Date().toISOString(),
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.provider.timeout_ms || 10000);

      const params = new URLSearchParams();
      params.append('keyapi', apiKey);

      const res = await fetch(`${this.baseUrl}/money`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
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
          message: `BYShop API ตอบกลับ HTTP ${res.status}`,
          checked_at: new Date().toISOString(),
        };
      }

      const body = await res.json().catch(() => null);
      if (body && (body.status === 'success' || body.money !== undefined)) {
        const balance = body.money ?? 0;
        return {
          provider_id: this.provider.id,
          provider_code: this.provider.code,
          status: latency > 3000 ? 'DEGRADED' : 'HEALTHY',
          latency_ms: latency,
          message: `BYShop Online: ยอดเงินคงเหลือ ฿${Number(balance || 0).toLocaleString()}`,
          checked_at: new Date().toISOString(),
        };
      }

      return {
        provider_id: this.provider.id,
        provider_code: this.provider.code,
        status: 'DEGRADED',
        latency_ms: latency,
        message: body?.message || 'BYShop ตอบกลับรูปแบบผิดปกติ',
        checked_at: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        provider_id: this.provider.id,
        provider_code: this.provider.code,
        status: 'DOWN',
        latency_ms: Date.now() - startTime,
        message: err.name === 'AbortError' ? 'BYShop API Timeout' : (err.message || 'Network error'),
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
        error: {
          code: 'AUTH_FAILED',
          message: 'BYShop API Key ยังไม่ได้ตั้งค่า',
          retryable: false,
        },
        duration_ms: Date.now() - start,
      };
    }

    try {
      if (action === 'CHECK_BALANCE' || action === 'HEALTH_CHECK' || action === 'PING') {
        const params = new URLSearchParams();
        params.append('keyapi', apiKey);

        const res = await fetch(`${this.baseUrl}/money`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        });
        const data = await res.json().catch(() => null);

        if (data && (data.status === 'success' || data.money !== undefined)) {
          return {
            success: true,
            provider_id: this.provider.id,
            provider_code: this.provider.code,
            action,
            reference_id,
            data: { balance: Number(data.money) || 0 },
            duration_ms: Date.now() - start,
          };
        }

        return {
          success: false,
          provider_id: this.provider.id,
          provider_code: this.provider.code,
          action,
          reference_id,
          error: {
            code: 'PROVIDER_ERROR',
            message: data?.message || 'ไม่สามารถตรวจสอบยอดเงิน BYShop ได้',
            retryable: true,
          },
          duration_ms: Date.now() - start,
        };
      }

      if (action === 'SYNC_PRODUCTS' || action === 'GET_PRODUCTS') {
        const res = await fetch(`${this.baseUrl}/product`, { cache: 'no-store' });
        const data = await res.json().catch(() => null);

        if (Array.isArray(data)) {
          return {
            success: true,
            provider_id: this.provider.id,
            provider_code: this.provider.code,
            action,
            reference_id,
            data: { products: data },
            duration_ms: Date.now() - start,
          };
        }

        return {
          success: false,
          provider_id: this.provider.id,
          provider_code: this.provider.code,
          action,
          reference_id,
          error: {
            code: 'DATA_ERROR',
            message: 'ไม่สามารถดึงข้อมูลสินค้า BYShop ได้',
            retryable: true,
          },
          duration_ms: Date.now() - start,
        };
      }

      if (action === 'PURCHASE' || action === 'BUY') {
        const productId = payload?.product_id || payload?.id;
        const customer = payload?.customer || payload?.username_customer || 'customer';

        const params = new URLSearchParams();
        params.append('id', String(productId));
        params.append('keyapi', apiKey);
        params.append('username_customer', String(customer));

        const res = await fetch(`${this.baseUrl}/buy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        });

        const data = await res.json().catch(() => null);

        if (data && data.status === 'success') {
          return {
            success: true,
            provider_id: this.provider.id,
            provider_code: this.provider.code,
            action,
            reference_id,
            data: {
              order_id: data.orderid,
              name: data.name,
              info: data.info,
              price: Number(data.price) || 0,
              time: data.time,
              image: data.img,
            },
            duration_ms: Date.now() - start,
          };
        }

        return {
          success: false,
          provider_id: this.provider.id,
          provider_code: this.provider.code,
          action,
          reference_id,
          error: {
            code: 'PURCHASE_FAILED',
            message: data?.message || 'การสั่งซื้อผ่าน BYShop ล้มเหลว',
            retryable: false,
          },
          duration_ms: Date.now() - start,
        };
      }

      if (action === 'GET_HISTORY') {
        const params = new URLSearchParams();
        params.append('keyapi', apiKey);
        if (payload?.order_id) params.append('orderid', String(payload.order_id));
        if (payload?.username_customer) params.append('username_customer', String(payload.username_customer));

        const res = await fetch(`${this.baseUrl}/history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        });

        const data = await res.json().catch(() => null);
        return {
          success: true,
          provider_id: this.provider.id,
          provider_code: this.provider.code,
          action,
          reference_id,
          data,
          duration_ms: Date.now() - start,
        };
      }

      return {
        success: false,
        provider_id: this.provider.id,
        provider_code: this.provider.code,
        action,
        reference_id,
        error: {
          code: 'UNSUPPORTED_ACTION',
          message: `BYShop ไม่รองรับ action: ${action}`,
          retryable: false,
        },
        duration_ms: Date.now() - start,
      };
    } catch (err: any) {
      return {
        success: false,
        provider_id: this.provider.id,
        provider_code: this.provider.code,
        action,
        reference_id,
        error: {
          code: 'NETWORK_ERROR',
          message: err.message || 'เกิดข้อผิดพลาดในการติดต่อ BYShop',
          retryable: true,
        },
        duration_ms: Date.now() - start,
      };
    }
  }
}
