// Node 22+; run against a Development server. No npm dependencies.
import assert from 'node:assert/strict';
const base = process.env.API_BASE ?? 'http://localhost:5080';
assert.equal((await fetch(`${base}/health/live`)).status, 200);
assert.equal((await fetch(`${base}/health/ready`)).status, 503);
const bootstrap = await fetch(`${base}/api/v1/bootstrap`).then(r => r.json());
assert.equal(bootstrap.gameplayAvailable, false);
const cors = await fetch(`${base}/api/v1/bootstrap`, { headers: { Origin: 'http://localhost:7456' } });
assert.equal(cors.headers.get('access-control-allow-origin'), 'http://localhost:7456');
const denied = await fetch(`${base}/api/v1/bootstrap`, { headers: { Origin: 'http://untrusted.invalid' } });
assert.equal(denied.headers.get('access-control-allow-origin'), null);
const negotiate = await fetch(`${base}/hubs/game/negotiate?negotiateVersion=1`, { method: 'POST' });
assert.equal(negotiate.status, 200);
const { connectionToken } = await negotiate.json();
await new Promise((resolve, reject) => {
  const ws = new WebSocket(`${base.replace(/^http/, 'ws')}/hubs/game?id=${encodeURIComponent(connectionToken)}`);
  const timer = setTimeout(() => finish(new Error('SignalR timeout')), 5000);
  let buffer = '', invoked = false;
  function finish(error) { clearTimeout(timer); ws.close(); error ? reject(error) : resolve(); }
  ws.onopen = () => ws.send(JSON.stringify({ protocol: 'json', version: 1 }) + '\x1e');
  ws.onerror = () => finish(new Error('WebSocket error'));
  ws.onmessage = ({ data }) => {
    buffer += data;
    let index;
    while ((index = buffer.indexOf('\x1e')) >= 0) {
      const message = JSON.parse(buffer.slice(0, index));
      buffer = buffer.slice(index + 1);
      try {
        if (!invoked && !message.type) {
          assert.equal(message.error, undefined);
          invoked = true;
          ws.send(JSON.stringify({ type: 1, invocationId: '1', target: 'Ping', arguments: [] }) + '\x1e');
        } else if (message.type === 3 && message.invocationId === '1') {
          assert.equal(message.error, undefined);
          assert.equal(message.result.contractVersion, '0.1-draft');
          assert.ok(Number.isFinite(Date.parse(message.result.serverTime)));
          finish();
        }
      } catch (error) { finish(error); }
    }
  };
});
console.log('PASS: live, not-ready, bootstrap, CORS allow/deny, SignalR negotiate/handshake/Ping');
