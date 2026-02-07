#!/usr/bin/env node
// Wrapper to call vite CLI directly, bypassing any corrupted shims
// (e.g., Console Ninja's build hook injection)
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

const args = process.argv.slice(2);
const command = args[0] || 'dev';

const vite = await import('vite');

switch (command) {
  case 'dev':
  case 'serve': {
    const server = await vite.createServer();
    await server.listen();
    server.printUrls();
    break;
  }
  case 'build': {
    await vite.build();
    break;
  }
  case 'preview': {
    const server = await vite.preview();
    server.printUrls();
    break;
  }
  default:
    console.error(`Unknown command: ${command}`);
    process.exit(1);
}
