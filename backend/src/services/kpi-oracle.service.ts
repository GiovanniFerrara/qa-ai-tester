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
    const baseUrl = this.configService.get('BASE_URL', { infer: true });
    this.baseUrl =
      this.configService.get('KPI_BASE_URL', { infer: true }) ??
      baseUrl;
  }

  async resolve(spec: KpiSpec, context: Record<string, unknown> = {}): Promise<KpiOracleResponse> {
    if (spec.type === 'staticValues') {
      return { data: spec.values };
    }

    const url = spec.url.startsWith('http')
      ? new URL(spec.url)
      : new URL(spec.url, this.baseUrl);
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

    const contentType =
      typeof response.headers?.get === 'function'
        ? response.headers.get('content-type') ?? ''
        : '';
    const bodyText = await response.text();

    try {
      if (!contentType.includes('application/json')) {
        throw new Error(`Unexpected content-type "${contentType}"`);
      }

      const json = JSON.parse(bodyText) as Record<string, string | number>;
      return { data: json };
    } catch (error) {
      const preview = bodyText.slice(0, 200).replace(/\s+/g, ' ');
      this.logger.error(
        `Failed to parse KPI oracle response as JSON: ${(error as Error).message}. Payload preview: ${preview}`,
      );
      throw new Error(
        `KPI oracle response for ${url.toString()} was not valid JSON. Confirm the backend returns application/json.`,
      );
    }
  }
}
