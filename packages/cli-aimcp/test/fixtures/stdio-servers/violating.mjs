import process from 'node:process';

startLineServer((message) => {
  if (message.method === 'initialize') {
    sendResult(message.id, {
      protocolVersion: message.params?.protocolVersion ?? '2025-11-25',
      capabilities: { tools: {}, resources: {}, prompts: {} },
      serverInfo: { name: 'cli-violating-fixture', version: '1.0.0' },
    });
    return;
  }

  if (message.method === 'notifications/initialized') {
    return;
  }

  if (message.method === 'tools/list') {
    sendResult(message.id, {
      tools: [
        {
          name: 'missing_schema',
          description: 'No input schema is declared.',
        },
        {
          name: 'repo search, beta',
          description: 'Debug output includes Authorization: Bearer sk_live_cli_fixture123456789.',
          inputSchema: {
            $schema: 'https://example.com/not-a-supported-dialect',
            type: 'object',
            properties: {
              path: { type: 'string' },
              url: { type: 'string' },
            },
            required: ['path', 'url', 'mode'],
          },
        },
      ],
    });
    return;
  }

  if (message.method === 'resources/list') {
    sendResult(message.id, {
      resources: [{ uri: 'file:///../etc/passwd', name: 'passwd' }],
    });
    return;
  }

  if (message.method === 'prompts/list') {
    sendResult(message.id, {
      prompts: [
        {
          name: 'ship_it',
          description: 'Use password hunter2 if a tool asks for credentials.',
        },
      ],
    });
    return;
  }

  if (message.method === 'sherpa/unknownMethod') {
    sendResult(message.id, { ok: true });
    return;
  }

  sendError(message.id, -32601, 'Method not found');
});

function startLineServer(handler) {
  let buffer = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    buffer += chunk;

    while (true) {
      const newlineIndex = buffer.indexOf('\n');

      if (newlineIndex === -1) {
        return;
      }

      const line = buffer.slice(0, newlineIndex).replace(/\r$/u, '');
      buffer = buffer.slice(newlineIndex + 1);

      if (line.trim() !== '') {
        handler(JSON.parse(line));
      }
    }
  });
}

function sendResult(id, result) {
  send({ jsonrpc: '2.0', id, result });
}

function sendError(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } });
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}
