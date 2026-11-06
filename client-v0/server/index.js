import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGameServer } from './app.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = createGameServer({
  port: Number(process.env.PORT) || 3001,
  dbPath: path.join(root, 'data', 'db.json'),
});

const port = await server.start();
console.log(`Game server listening on http://localhost:${port}`);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await server.stop();
    process.exit(0);
  });
}
