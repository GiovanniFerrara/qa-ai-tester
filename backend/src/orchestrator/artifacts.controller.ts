import { Controller, Get, Param, Res, NotFoundException, StreamableFile } from '@nestjs/common';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';

@Controller('artifacts')
export class ArtifactsController {
  @Get('*')
  async serveArtifact(@Param('0') filePath: string, @Res({ passthrough: true }) res: Record<string, unknown>): Promise<StreamableFile> {
    const artifactsDir = join(process.cwd(), 'backend', 'artifacts');
    const fullPath = join(artifactsDir, filePath);

    if (!existsSync(fullPath) || !fullPath.startsWith(artifactsDir)) {
      throw new NotFoundException('Artifact not found');
    }

    const file = createReadStream(fullPath);
    return new StreamableFile(file);
  }
}