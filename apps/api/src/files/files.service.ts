import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FilesService {
  private baseDir: string;

  constructor() {
    // Browse the full VPS filesystem from root
    this.baseDir = '/';
  }

  private resolvePath(reqPath: string) {
    // Normalize and ensure path stays within baseDir (/)
    const normalized = path.normalize(reqPath || '/');
    // On Linux with baseDir='/', join will just return the normalized path
    const absolutePath = normalized.startsWith('/') ? normalized : path.join('/', normalized);
    return absolutePath;
  }

  async listFiles(dirPath: string) {
    const target = this.resolvePath(dirPath || '/');
    if (!fs.existsSync(target)) {
      throw new BadRequestException('Directory not found');
    }

    let items: fs.Dirent[];
    try {
      items = fs.readdirSync(target, { withFileTypes: true });
    } catch (e) {
      // Some system dirs may not be readable, return empty
      return [];
    }

    const result = items.map(item => {
      const itemPath = path.join(target === '/' ? '' : target, item.name).replace(/\\/g, '/') || '/';
      return {
        name: item.name,
        isDirectory: item.isDirectory(),
        path: itemPath.startsWith('/') ? itemPath : '/' + itemPath,
      };
    });

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
    try {
      return fs.readFileSync(target, 'utf-8');
    } catch (e) {
      throw new BadRequestException('Cannot read file: permission denied');
    }
  }

  async writeFile(filePath: string, content: string) {
    const target = this.resolvePath(filePath);
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
      throw new BadRequestException('Cannot overwrite a directory');
    }
    try {
      fs.writeFileSync(target, content, 'utf-8');
    } catch (e) {
      throw new BadRequestException('Cannot write file: permission denied');
    }
    return { success: true };
  }
}
