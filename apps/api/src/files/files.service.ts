import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FilesService {
  private baseDir: string;

  constructor() {
    // For MVP demonstration, we will let the user browse the NexusPanel source code itself.
    // In production, this would communicate with the agent to read /var/www/...
    this.baseDir = process.cwd();
  }

  private resolvePath(reqPath: string) {
    const safePath = path.normalize(reqPath || '/').replace(/^(\.\.(\/|\\|$))+/, '');
    const absolutePath = path.join(this.baseDir, safePath);
    if (!absolutePath.startsWith(this.baseDir)) {
      throw new BadRequestException('Invalid path');
    }
    return absolutePath;
  }

  async listFiles(dirPath: string) {
    const target = this.resolvePath(dirPath);
    if (!fs.existsSync(target)) {
      throw new BadRequestException('Directory not found');
    }

    const items = fs.readdirSync(target, { withFileTypes: true });
    
    // Sort directories first, then files
    const result = items.map(item => ({
      name: item.name,
      isDirectory: item.isDirectory(),
      path: path.join(dirPath || '/', item.name).replace(/\\/g, '/'),
    }));

    return result.sort((a, b) => {
      if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
      return a.isDirectory ? -1 : 1;
    });
  }

  async readFile(filePath: string) {
    const target = this.resolvePath(filePath);
    if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
      throw new BadRequestException('File not found or is a directory');
    }
    return fs.readFileSync(target, 'utf-8');
  }

  async writeFile(filePath: string, content: string) {
    const target = this.resolvePath(filePath);
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      throw new BadRequestException('Cannot overwrite a directory');
    }
    fs.writeFileSync(target, content, 'utf-8');
    return { success: true };
  }
}
