import process from 'node:process';

export function startLineServer(handler) {
  let buffer = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    buffer += chunk;

    while (true) {
      const newlineIndex = buffer.indexOf('\n');

      if (newlineIndex === -1) {
        return;
      }

      const line = buffer.slice(0, newlineIndex).replace(/\r$/, '');
      buffer = buffer.slice(newlineIndex + 1);

      if (line.trim() === '') {
        continue;
      }

      handler(JSON.parse(line));
    }
  });
}

export function sendResult(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

export function sendError(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

export function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}
