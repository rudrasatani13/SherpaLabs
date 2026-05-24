import http from 'node:http';
import process from 'node:process';
import { URL } from 'node:url';

const endpointPath = '/message';
const endpointQuery = '?sessionId=fixture-session-secret';

export function startSseFixtureServer(handler) {
  const clients = new Set();
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? '127.0.0.1'}`);

    if (request.method === 'GET' && url.pathname === '/sse') {
      response.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      clients.add(response);
      response.write(`event: endpoint\ndata: ${endpointPath}${endpointQuery}\n\n`);
      request.on('close', () => {
        clients.delete(response);
      });
      return;
    }

    if (request.method === 'POST' && url.pathname === endpointPath) {
      collectBody(request)
        .then((body) => {
          const message = JSON.parse(body);

          return handler(message, {
            request,
            response,
            url,
            clients,
            sendResult: (id, result) => {
              broadcast(clients, { jsonrpc: '2.0', id, result });
            },
            sendError: (id, code, messageText) => {
              broadcast(clients, {
                jsonrpc: '2.0',
                id,
                error: { code, message: messageText },
              });
            },
            broadcastRaw: (frame) => {
              for (const client of clients) {
                client.write(frame);
              }
            },
            closeClients: () => {
              for (const client of [...clients]) {
                client.end();
              }
              clients.clear();
            },
          });
        })
        .then(() => {
          if (!response.writableEnded) {
            response.writeHead(202).end();
          }
        })
        .catch((error) => {
          if (!response.writableEnded) {
            response.writeHead(400).end(error instanceof Error ? error.message : 'bad request');
          }
        });
      return;
    }

    response.writeHead(404).end('not found');
  });

  server.listen(0, '127.0.0.1', () => {
    const address = server.address();

    if (address == null || typeof address === 'string') {
      throw new Error('expected TCP fixture address');
    }

    process.stdout.write(JSON.stringify({ url: `http://127.0.0.1:${address.port}/sse` }) + '\n');
  });

  process.on('SIGTERM', () => {
    for (const client of clients) {
      client.end();
    }

    server.close(() => {
      process.exit(0);
    });
  });
}

export function sendResultToClients(clients, id, result) {
  broadcast(clients, { jsonrpc: '2.0', id, result });
}

function broadcast(clients, message) {
  const frame = `event: message\ndata: ${JSON.stringify(message)}\n\n`;

  for (const client of clients) {
    client.write(frame);
  }
}

async function collectBody(request) {
  let body = '';
  request.setEncoding('utf8');

  for await (const chunk of request) {
    body += chunk;
  }

  return body;
}
