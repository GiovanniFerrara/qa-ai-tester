import { Controller, Get, Param, Res, NotFoundException, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import type { AppEnvironment } from '../config/environment';

@Controller('artifacts')
export class ArtifactsController {
  private readonly artifactsDir: string;

  constructor(private readonly configService: ConfigService<AppEnvironment, true>) {
    const configuredPath = this.configService.get('ARTIFACT_DIR', { infer: true });
    this.artifactsDir = resolve(configuredPath ?? 'artifacts');
  }

  @Get('*')
  async serveArtifact(@Param('0') filePath: string, @Res({ passthrough: true }) res: Record<string, unknown>): Promise<StreamableFile> {
    if (!filePath) {
      throw new NotFoundException('Artifact not specified');
    }

    const normalizedPath = filePath.replace(/^\/+/, '');
    const fullPath = resolve(this.artifactsDir, normalizedPath);

    if (!fullPath.startsWith(this.artifactsDir) || !existsSync(fullPath)) {
      throw new NotFoundException('Artifact not found');
    }

    const file = createReadStream(fullPath);
    return new StreamableFile(file);
  }
}
