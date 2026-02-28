import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

/***** TYPE DEFINITIONS *****/
export type ShaderWatchEvent = {
  event: "create" | "update" | "delete";
};

export class ShaderPlugin {
  private static readonly SHADER_EXTENSIONS = new Set([".frag", ".vert"]);

  constructor(
    private readonly sourceRoot: string,
    private readonly distRoot: string,
  ) {}

  public transform(source: string, id: string) {
    if (!this.isShaderFile(id)) {
      return null;
    }

    return {
      code: this.toModuleString(source),
      map: null,
    };
  }

  public async buildStart() {
    await this.syncAllShaders();
  }

  public async watchChange(id: string, change: ShaderWatchEvent) {
    if (!this.isShaderFile(id)) {
      return;
    }

    if (change.event === "delete") {
      await rm(this.toDistPath(id), { force: true });
      return;
    }

    try {
      const sourceStats = await stat(id);
      if (!sourceStats.isFile()) {
        return;
      }

      await this.copyShaderFile(id);
    } catch {
      await rm(this.toDistPath(id), { force: true });
    }
  }

  private isShaderFile(path: string): boolean {
    for (const extension of ShaderPlugin.SHADER_EXTENSIONS) {
      if (path.endsWith(extension)) {
        return true;
      }
    }

    return false;
  }

  private async findShaderFiles(directoryPath: string): Promise<string[]> {
    const entries = await readdir(directoryPath, { withFileTypes: true });
    const shaderFiles: string[] = [];
  
    for (const entry of entries) {
      const absolutePath = resolve(directoryPath, entry.name);
  
      if (entry.isDirectory()) {
        const nestedShaderFiles = await this.findShaderFiles(absolutePath);
        shaderFiles.push(...nestedShaderFiles);
        continue;
      }
  
      if (entry.isFile() && this.isShaderFile(absolutePath)) {
        shaderFiles.push(absolutePath);
      }
    }
  
    return shaderFiles;
  }

  private toModuleString(source: string): string {
    return `export default ${JSON.stringify(source)};`;
  }

  private async copyShaderFile(sourcePath: string) {
    const distPath = this.toDistPath(sourcePath);
    await mkdir(dirname(distPath), { recursive: true });
    await cp(sourcePath, distPath);
  }

  private async syncAllShaders() {
    await mkdir(this.distRoot, { recursive: true });
    const shaderFiles = await this.findShaderFiles(this.sourceRoot);
    await Promise.all(shaderFiles.map((filePath) => this.copyShaderFile(filePath)));
  }

  private toDistPath(sourcePath: string): string {
    return resolve(this.distRoot, relative(this.sourceRoot, sourcePath));
  }
}