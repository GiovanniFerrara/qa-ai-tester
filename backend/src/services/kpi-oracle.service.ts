import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetch } from 'undici';

import type { AppEnvironment } from '../config/environment';
import type { KpiOracleResponse, KpiSpec } from '../models/contracts';

@Injectable()
export class KpiOracleService {
  private readonly logger = new Logger(KpiOracleService.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService<AppEnvironment, true>) {
    this.baseUrl = this.configService.get('BASE_URL', { infer: true });
  }

  async resolve(spec: KpiSpec, context: Record<string, unknown> = {}): Promise<KpiOracleResponse> {
    if (spec.type === 'staticValues') {
      return { data: spec.values };
    }

    const url = new URL(spec.url, this.baseUrl);
    if (spec.method === 'GET') {
      const params = new URLSearchParams();
      const queryPayload = {
        ...(spec.params ?? {}),
        ...(context ?? {}),
      } as Record<string, unknown>;

      for (const [key, value] of Object.entries(queryPayload)) {
        if (value === undefined || value === null) continue;
        params.append(key, String(value));
      }
      url.search = params.toString();
    }

    const response = await fetch(url.toString(), {
      method: spec.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: spec.method === 'POST' ? JSON.stringify({ ...(spec.params ?? {}), ...(context ?? {}) }) : undefined,
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Failed to fetch KPI oracle data: ${response.status} - ${body}`);
      throw new Error(`KPI oracle request failed with status ${response.status}`);
    }

    const json = (await response.json()) as Record<string, string | number>;
    return { data: json };
  }
}
