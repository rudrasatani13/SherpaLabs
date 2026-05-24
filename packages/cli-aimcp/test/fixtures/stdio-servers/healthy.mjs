import process from 'node:process';

startLineServer((message) => {
  if (message.method === 'initialize') {
    sendResult(message.id, {
      protocolVersion: message.params?.protocolVersion ?? '2025-11-25',
      capabilities: { tools: {}, resources: {}, prompts: {} },
      serverInfo: { name: 'cli-healthy-fixture', version: '1.0.0' },
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
          name: 'read_file',
          description: 'Read project files under configured roots.',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                pattern: '^(?:docs|src|README\\.md)[A-Za-z0-9._/-]*$',
              },
            },
            required: ['path'],
            additionalProperties: false,
          },
        },
        {
          name: 'fetch_doc',
          description: 'Fetch documentation from approved endpoints.',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', pattern: '^https://docs\\.example\\.com/' },
            },
            required: ['url'],
            additionalProperties: false,
          },
        },
      ],
    });
    return;
  }

  if (message.method === 'resources/list') {
    sendResult(message.id, {
      resources: [{ uri: 'https://docs.example.com/readme', name: 'README' }],
    });
    return;
  }

  if (message.method === 'prompts/list') {
    sendResult(message.id, {
      prompts: [
        {
          name: 'review_patch',
          description: 'Review a patch.',
          arguments: [{ name: 'diff', required: true }],
        },
      ],
    });
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
