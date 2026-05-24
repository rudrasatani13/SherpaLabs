# MCP Protocol Notes

Phase 15 research notes for the future `packages/core-mcp` client and lint
rules. This is documentation only; no client or lint implementation is included
in this phase.

## Source List

Access date for all sources: 2026-05-24.

| Source                            | URL                                                                                    | Notes                                                                                   |
| --------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| MCP specification, latest version | https://modelcontextprotocol.io/specification                                          | Redirected to `2025-11-25`, marked latest.                                              |
| MCP base overview                 | https://modelcontextprotocol.io/specification/2025-11-25/basic                         | JSON-RPC message rules, schema dialect, `_meta`, icons.                                 |
| MCP lifecycle                     | https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle               | Initialization, version negotiation, capabilities, shutdown, timeouts.                  |
| MCP transports                    | https://modelcontextprotocol.io/specification/2025-11-25/basic/transports              | stdio and Streamable HTTP, including SSE use inside Streamable HTTP.                    |
| MCP tools                         | https://modelcontextprotocol.io/specification/2025-11-25/server/tools                  | Tool listing, invocation, schemas, errors, tool name guidance.                          |
| MCP resources                     | https://modelcontextprotocol.io/specification/2025-11-25/server/resources              | Resource listing, reading, templates, subscriptions.                                    |
| MCP prompts                       | https://modelcontextprotocol.io/specification/2025-11-25/server/prompts                | Prompt listing, retrieval, messages, list change notifications.                         |
| MCP authorization                 | https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization           | OAuth 2.1 resource-server model for HTTP transports.                                    |
| MCP security best practices       | https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices | Token passthrough, SSRF, scope minimization, local-server security.                     |
| MCP 2024 HTTP+SSE transport       | https://modelcontextprotocol.io/specification/2024-11-05/basic/transports              | Deprecated SSE transport, still relevant for backwards compatibility.                   |
| MCP 2025-11-25 changelog          | https://modelcontextprotocol.io/specification/2025-11-25/changelog                     | Icons, tasks, tool names, JSON Schema 2020-12 default, SSE polling.                     |
| Reference servers repository      | https://github.com/modelcontextprotocol/servers                                        | Current official reference servers, including filesystem, git, everything.              |
| Reference filesystem server       | https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem               | Local filesystem server with roots and path validation.                                 |
| Reference everything server       | https://github.com/modelcontextprotocol/servers/tree/main/src/everything               | Demonstrates tools, resources, prompts, logging, roots, transports.                     |
| Archived GitHub reference server  | https://github.com/modelcontextprotocol/servers-archived/tree/main/src/github          | Old Anthropic GitHub server; README says development moved to GitHub's official server. |
| mcp-lint PyPI package             | https://pypi.org/project/mcp-lint/                                                     | Inspiration only. Studied package shape and rule categories, not copied.                |

Local research commands also cloned:

- `/tmp/sherpa-mcp-servers` at commit `b1e1eb1`.
- `/tmp/sherpa-mcp-servers-archived` sparse checkout for `src/github` at commit `9be4674`.
- `/tmp/sherpa-mcp-lint/mcp_lint-0.1.0.tar.gz`.

## Protocol Overview

MCP is a stateful JSON-RPC 2.0 protocol between a host application, one MCP
client per server connection, and independent MCP servers. The host coordinates
permissions and user consent; each client maintains an isolated connection to
one server; each server exposes focused capabilities.

The current official protocol version is `2025-11-25`. Version identifiers are
date strings in `YYYY-MM-DD` format. The base protocol and lifecycle are
mandatory for all implementations. Tools, resources, prompts, roots, sampling,
elicitation, logging, completion, authorization, and tasks are optional features
advertised through capabilities.

Messages are JSON-RPC requests, responses, errors, or notifications:

- Requests require `jsonrpc: "2.0"`, a non-null string or number `id`, a
  `method`, and optional `params`.
- Request IDs must not be reused by the same requestor within one session.
- Result responses must echo the request `id` and include `result`.
- Error responses must echo the request `id` when the request ID is readable and
  include integer `error.code` plus string `error.message`.
- Notifications must not include `id`; receivers must not respond.
- JSON-RPC batching was removed in the `2025-06-18` revision, so the linter
  should treat batches as protocol violations for modern sessions.

MCP uses JSON Schema for tool input schemas, output schemas, and elicitation
schemas. As of `2025-11-25`, schemas without `$schema` default to JSON Schema
2020-12. Implementations must support 2020-12 and should document any additional
dialects they support.

## Initialization Lifecycle

Initialization is the first protocol interaction.

1. The client sends `initialize`.
   - `params.protocolVersion`: latest protocol version the client supports.
   - `params.capabilities`: client capabilities such as `roots`, `sampling`,
     `elicitation`, `tasks`, and `experimental`.
   - `params.clientInfo`: implementation metadata with at least `name` and
     `version`; the latest schema also permits `title`, `description`, `icons`,
     and `websiteUrl`.
2. The server replies with `InitializeResult`.
   - `result.protocolVersion`: negotiated version.
   - `result.capabilities`: server capabilities.
   - `result.serverInfo`: server metadata.
   - `result.instructions`: optional human-readable guidance for clients.
3. The client sends `notifications/initialized`.
4. Normal operation begins.

Ordering matters:

- Before the server responds to `initialize`, the client should not send
  requests other than `ping`.
- Before the server receives `notifications/initialized`, the server should not
  send requests other than `ping` and logging notifications.
- During operation, both sides must respect the negotiated protocol version and
  only use successfully negotiated capabilities.

Version negotiation:

- If the server supports the client's requested version, it must respond with
  that same version.
- Otherwise the server must respond with another supported version, preferably
  its latest.
- If the client does not support the returned version, it should disconnect.
- For HTTP transports, every subsequent request must include
  `MCP-Protocol-Version: <negotiated-version>`.

Shutdown:

- MCP defines no explicit shutdown method.
- For stdio, the client should close the child's stdin, wait for exit, then
  escalate to `SIGTERM` and `SIGKILL` if needed.
- For HTTP, shutdown is represented by closing relevant HTTP connections and,
  when sessions are in use, optional `DELETE` to the MCP endpoint.

Timeouts:

- Implementations should set timeouts for all requests.
- On timeout, the sender should issue `notifications/cancelled` and stop waiting.
- Progress notifications may reset a local timeout clock, but implementations
  should still enforce a maximum timeout.

## Capabilities Advertising

Capabilities are negotiated during initialization and unlock optional protocol
features.

Server capabilities:

- `tools`: server supports `tools/list` and `tools/call`.
- `resources`: server supports `resources/list`, `resources/read`, and optional
  resource templates or subscriptions.
- `prompts`: server supports `prompts/list` and `prompts/get`.
- `logging`: server can send `notifications/message`.
- `completions`: server supports `completion/complete`.
- `tasks`: experimental durable request tracking in `2025-11-25`.
- `experimental`: extension area for non-standard features.

Client capabilities:

- `roots`: client supports `roots/list` and possibly
  `notifications/roots/list_changed`.
- `sampling`: client supports server-initiated `sampling/createMessage`.
- `elicitation`: client supports server-initiated user input requests.
- `tasks`: experimental support for task-augmented client requests.
- `experimental`: extension area for non-standard features.

Important sub-capabilities:

- `listChanged`: prompts, resources, and tools may advertise list-change
  notifications.
- `subscribe`: resources may advertise per-resource update subscriptions.

Lint implication: capability presence must match behavior. If a server declares
`tools`, `tools/list` should work. If it returns tools without declaring
`tools`, clients have no reliable basis for calling them.

## Tools

Tools are model-controlled functions exposed by servers. They can query APIs,
read data, write files, perform computation, or trigger external side effects.

Discovery:

- Client sends `tools/list`.
- Server returns `result.tools` and optional `nextCursor`.
- Listing supports pagination.

Invocation:

- Client sends `tools/call` with `params.name` and optional
  `params.arguments`.
- Server returns `CallToolResult` with `content`, optional
  `structuredContent`, optional `isError`, and optional metadata.

Tool schema expectations:

- Each tool has a unique `name`.
- `description` is human-readable and used as model guidance.
- `inputSchema` must be a JSON Schema object, not `null`.
- If no `$schema` is present, the schema defaults to 2020-12.
- A no-parameter tool should use an object schema, preferably
  `{ "type": "object", "additionalProperties": false }`.
- `outputSchema` is optional, but if present the server's structured output must
  conform to it.
- Tool names should be 1 to 128 characters and use ASCII letters, digits,
  underscore, hyphen, and dot.

Tool result content:

- `text`: text result.
- `image`: base64 data plus MIME type.
- `audio`: base64 data plus MIME type.
- `resource_link`: link to a resource URI; it does not have to appear in
  `resources/list`.
- `resource`: embedded resource content.
- `structuredContent`: JSON object for machine-readable output.

Error distinction:

- Protocol errors are for malformed requests, unknown tools, and server protocol
  failures.
- Tool execution errors are normal tool results with `isError: true`, useful for
  model self-correction. The latest spec clarifies that input validation errors
  should usually be tool execution errors rather than protocol errors.

Security posture:

- Tool annotations are untrusted unless from a trusted server.
- Hosts should present confirmation prompts for sensitive operations.
- Servers must validate inputs, enforce access controls, rate limit calls, and
  sanitize outputs.

## Resources

Resources are application-controlled context exposed by servers. Each resource is
identified by a URI.

Discovery:

- Client sends `resources/list`.
- Server returns `result.resources` and optional `nextCursor`.
- Resource entries include `uri`, `name`, optional `title`, `description`,
  `mimeType`, `size`, `icons`, and annotations.

Reading:

- Client sends `resources/read` with a resource `uri`.
- Server returns `contents`, each with `uri`, optional `mimeType`, and either
  `text` or base64 `blob`.

Templates:

- `resources/templates/list` exposes parameterized resources through URI
  templates.
- Template arguments can use `completion/complete`.

Subscriptions:

- If `resources.subscribe` is declared, clients can send
  `resources/subscribe`.
- Server sends `notifications/resources/updated` when a subscribed resource
  changes.
- If `resources.listChanged` is declared, server can send
  `notifications/resources/list_changed`.

URI schemes:

- `https://` should mean the client can fetch the resource directly without the
  MCP server.
- `file://` identifies filesystem-like resources, not necessarily a physical
  local file.
- `git://` represents version-control integration.
- Custom schemes must follow RFC 3986.

Lint implication: the future linter should avoid crawling all resources by
default. Sample a bounded number of listed resources and always respect
pagination and configured size limits.

## Prompts

Prompts are user-controlled templates or workflows. They are intended for user
selection, such as slash commands or menu entries.

Discovery:

- Client sends `prompts/list`.
- Server returns `result.prompts` and optional `nextCursor`.
- Prompt entries include `name`, optional `title`, `description`, `arguments`,
  and `icons`.

Retrieval:

- Client sends `prompts/get` with `params.name` and optional string
  `arguments`.
- Server returns a description and `messages`.
- Prompt messages have `role` of `user` or `assistant` and content blocks such
  as text, image, audio, resource links, or embedded resources.

Notifications:

- If `prompts.listChanged` is declared, server should send
  `notifications/prompts/list_changed` when the prompt list changes.

Lint implication: prompt text and descriptions should be treated as untrusted
content. The linter can validate shape and flag obvious prompt-injection
patterns, but should avoid claiming semantic safety from static text alone.

## Transport Details

### stdio Transport

stdio is the preferred local transport when possible.

Rules:

- The client launches the server as a subprocess.
- The server reads JSON-RPC messages from stdin.
- The server writes JSON-RPC messages to stdout.
- Messages are UTF-8 JSON-RPC objects separated by newlines.
- Messages must not contain embedded newlines.
- The server may write any logging, including informational logs, to stderr.
- The client should not treat stderr output as a protocol error by itself.
- The server must not write non-MCP output to stdout.
- The client must not write non-MCP input to stdin.

Implementation notes for Phase 16:

- Parse stdout line by line.
- Treat malformed JSON or non-JSON stdout as transport failure.
- Preserve stderr for diagnostics, but do not parse it as protocol data.
- Correlate responses by `id`.
- Enforce request timeouts and child-process shutdown policy.
- Capture enough raw message history for lint rules without logging secrets by
  default.

### Streamable HTTP Transport

Streamable HTTP is the current HTTP transport. It replaced the old HTTP+SSE
transport from protocol version `2024-11-05`.

Endpoint model:

- Server exposes one MCP endpoint, such as `/mcp`.
- The endpoint supports POST and GET.
- POST sends client JSON-RPC messages.
- GET optionally opens an SSE stream for server-to-client messages.
- Servers may use SSE inside POST responses and GET responses.

POST requirements:

- Client sends each JSON-RPC message as a separate HTTP POST.
- Client includes `Accept: application/json, text/event-stream`.
- POST body is a single JSON-RPC request, notification, or response.
- For client notifications or responses, server returns HTTP `202 Accepted` with
  no body if accepted.
- For client requests, server returns either:
  - `Content-Type: application/json` with one JSON-RPC object.
  - `Content-Type: text/event-stream` with an SSE stream that eventually yields
    the JSON-RPC response.

GET requirements:

- Client may send GET to open an SSE stream.
- Client includes `Accept: text/event-stream`.
- Server returns `text/event-stream` or `405 Method Not Allowed` if it does not
  offer a standalone stream.
- GET streams must not send JSON-RPC responses unless resuming a previous stream.

SSE conventions inside Streamable HTTP:

- SSE event `data` carries JSON-RPC messages.
- Servers may attach SSE event IDs for resumability.
- Event IDs must be globally unique within the session or client.
- Event IDs should encode enough stream identity to support correct replay.
- Resume is always via GET with `Last-Event-ID`.
- Servers must not replay messages from a different stream.
- Servers may close connections without cancelling requests.
- Servers should send `retry` before server-initiated polling disconnects, and
  clients must honor it.
- Clients should explicitly cancel using `notifications/cancelled`; disconnection
  is not cancellation.

Session management:

- Server may return `MCP-Session-Id` during initialization.
- Session IDs should be cryptographically secure and globally unique.
- Session IDs may contain only visible ASCII.
- If returned, clients must include `MCP-Session-Id` on later HTTP requests.
- Server should return HTTP 400 for required missing session IDs and HTTP 404
  for expired session IDs.
- Client receiving HTTP 404 for an existing session should reinitialize without a
  session ID.
- Client should send HTTP DELETE with `MCP-Session-Id` when it no longer needs
  the session, though servers may respond 405.

Security requirements:

- Streamable HTTP servers must validate `Origin` to mitigate DNS rebinding.
- Invalid Origin must receive HTTP 403.
- Local HTTP servers should bind only to `127.0.0.1`, not `0.0.0.0`.
- Servers should implement authentication for all HTTP connections.
- All post-initialization HTTP requests must include
  `MCP-Protocol-Version: <negotiated-version>`.

### Deprecated HTTP+SSE Transport

The project plan names Phase 17 as "SSE Transport". The current spec calls the
old HTTP+SSE transport deprecated, but clients may still support it for older
servers.

Old transport contract from `2024-11-05`:

- Server exposes an SSE endpoint and a separate HTTP POST endpoint.
- Client opens the SSE endpoint.
- Server sends an `endpoint` event first; the event data is the POST URI for
  client messages.
- Client sends subsequent messages by POSTing to that endpoint.
- Server sends JSON-RPC messages as SSE `message` events with JSON in `data`.
- Servers must validate `Origin`, should bind local servers to localhost, and
  should authenticate connections.

Backwards compatibility detection in the latest spec:

1. Try POSTing `InitializeRequest` to the user-provided URL with modern
   Streamable HTTP headers.
2. If that fails with `400`, `404`, or `405`, issue GET to the same URL.
3. If GET opens SSE and the first event is `endpoint`, treat it as the old
   HTTP+SSE transport.

## Error Handling Patterns

Use JSON-RPC errors for protocol-level failures:

- `-32700`: parse error.
- `-32600`: invalid request.
- `-32601`: method not found.
- `-32602`: invalid params.
- `-32603`: internal error.
- `-32000` to `-32099`: implementation-defined server errors.

MCP-specific guidance:

- Unknown methods should return `-32601`.
- Invalid `initialize` versions commonly use `-32602` with supported/requested
  metadata.
- Tool execution failures should usually be `CallToolResult` with
  `isError: true`, not a protocol-level error, when the model can self-correct.
- Receivers of `notifications/cancelled` should stop work if possible, free
  resources, and not send a response for the cancelled request.
- Invalid cancellation notifications should be ignored because notifications are
  fire-and-forget.
- Progress notifications must only reference active progress tokens and must
  stop after completion.

## Common Protocol Mistakes And Edge Cases

These are practical lint targets observed from the spec, reference servers, and
existing ecosystem tooling.

- Writing startup banners or logs to stdout in stdio mode.
- Pretty-printing JSON-RPC over stdio across multiple lines.
- Accepting `initialize` but never receiving or tolerating
  `notifications/initialized`.
- Sending server requests before initialization is complete.
- Reusing JSON-RPC IDs in one session.
- Returning `id: null` in requests or responses.
- Supporting JSON-RPC batches after negotiating a modern protocol version.
- Declaring `tools`, `resources`, or `prompts` but failing the corresponding
  `*/list` method.
- Serving tools, resources, or prompts without declaring the matching capability.
- Missing `serverInfo.name`, `serverInfo.version`, or negotiated
  `protocolVersion`.
- Missing `inputSchema` or returning `inputSchema: null`.
- Treating tool input validation as a protocol error when a tool execution error
  would enable model self-correction.
- Returning `structuredContent` that does not match `outputSchema`.
- Returning content blocks without required fields such as `type`, `text`,
  `data`, `mimeType`, `uri`, or `resource`.
- Omitting pagination while returning very large lists.
- Ignoring `nextCursor` or returning the same cursor repeatedly.
- Returning resource `blob` values that are not base64.
- Advertising `listChanged` or `subscribe` but never handling the related
  notification or request path.
- Streamable HTTP responses with wrong `Content-Type`.
- Missing `Accept` support for both `application/json` and `text/event-stream`.
- Missing or invalid `MCP-Protocol-Version` handling after initialization.
- Predictable or malformed `MCP-Session-Id` values.
- Broadcasting the same JSON-RPC message on multiple concurrent SSE streams.
- Replaying SSE messages across the wrong stream after `Last-Event-ID`.
- Old HTTP+SSE servers that do not send the initial `endpoint` event.
- HTTP servers that accept cross-origin local requests without Origin checks.
- Tools exposing path or URL parameters without constraints.
- Filesystem tools that do not validate symlinks or root boundaries.
- Tool descriptions or resource descriptions containing prompt-injection text.
- Tool results leaking tracebacks, tokens, environment variables, or request
  headers.
- Remote servers accepting bearer tokens without audience validation or passing
  inbound tokens to downstream APIs.

## Notes From Official And Reference Servers

### Current `modelcontextprotocol/servers`

The current repository is explicitly a reference implementation collection, not
a production-ready security baseline. Several older servers, including GitHub,
were moved to `servers-archived`.

Maintained examples inspected:

- `src/filesystem`
- `src/git`
- `src/everything`
- `src/memory`
- `src/fetch`
- `src/time`
- `src/sequentialthinking`

### Filesystem Server

The filesystem server is the most useful Phase 16 fixture.

Observed patterns:

- Uses `StdioServerTransport`.
- Registers tools with Zod-derived schemas.
- Supports allowed directories from command-line arguments and MCP roots.
- If no command-line directories are provided and the client does not support
  roots, initialization/startup can fail.
- Normalizes and resolves paths before file operations.
- Tracks both original and real paths to handle symlinked directories such as
  macOS `/tmp` to `/private/tmp`.
- Validates symlink targets with `realpath` to prevent escaping allowed roots.
- Rejects null-byte paths.
- Uses atomic write patterns to reduce symlink race risk when replacing files.
- Returns both human-readable text content and `structuredContent` for some
  tools.
- Provides tests for path validation, roots behavior, directory trees, startup,
  and structured content.

Lint lessons:

- Filesystem safety needs dynamic checks, not just schema checks.
- Roots support must be negotiated through client capabilities.
- Tool names and descriptions can be compatible while still exposing risky
  operations; security lint should inspect schemas and behavior.

### Everything Server

The everything server is useful as a broad protocol fixture.

Observed patterns:

- Registers tools, resources, prompts, logging, roots, subscriptions, and
  experimental tasks.
- Provides stdio, old SSE, and Streamable HTTP transport wrappers.
- Streamable HTTP wrapper uses a single `/mcp` endpoint with POST, GET, and
  DELETE.
- Maintains a session map keyed by session ID.
- Demonstrates an event store for SSE resumability and `Last-Event-ID`.
- Adds CORS headers for testing, with comments warning that permissive CORS is
  not production safe.
- Runs cleanup on session close to stop simulated logging/resource updates.
- Defers roots sync until after initialization to avoid losing the request.

Lint lessons:

- The linter should distinguish test/demo transports from production safety.
- Session cleanup, reconnect behavior, and event replay are observable lint
  targets for HTTP transports.
- Experimental tasks appear in the latest spec and reference server, but should
  be treated as out of scope unless later phases explicitly include them.

### Git Server

The git reference server is useful for schema and command-safety patterns.

Observed patterns:

- Python server using Pydantic models for tool inputs.
- Exposes tools such as status, diff, commit, add, reset, log, branch, checkout,
  and show.
- Uses `--` separators or input checks to reduce command option injection.
- Rejects revision, branch, and timestamp inputs beginning with `-` in sensitive
  command contexts.
- Uses roots capability to discover repository boundaries when supported.

Lint lessons:

- Dangerous capability names are not automatically violations, but they should
  raise security review warnings unless schemas and descriptions are constrained.
- Option injection is a practical class of MCP tool risk.

### Archived GitHub Server

The archived Anthropic GitHub reference server has moved to GitHub's official
`github/github-mcp-server`, but it remains useful historically because the Phase
15 prompt names GitHub.

Observed patterns:

- stdio-only TypeScript server.
- Declares `tools` capability.
- Implements `tools/list` through explicit tool objects and Zod-to-JSON-Schema
  conversion.
- Reads `GITHUB_PERSONAL_ACCESS_TOKEN` from the environment rather than using
  MCP HTTP authorization.
- Sends GitHub API requests with `Authorization: Bearer <token>` when present.
- Centralizes GitHub API error mapping for 401, 403, 404, 409, 422, and 429.
- Validates owner, repository, and branch names before API use.
- Handles many mutating tools: create repository, update files, push files,
  create issue, create pull request, merge pull request.

Lint lessons:

- Environment-based credentials are normal for stdio servers, but tools and
  errors must not reveal them.
- Mutating API tools need strong metadata, schemas, and user confirmation on the
  host side.
- Large tool catalogs should be paginated or kept compact.

## Notes From `mcp-lint` Inspiration Only

The PyPI package `mcp-lint==0.1.0` was studied for product-shape inspiration,
not for code, rule text, or naming.

Observed product shape:

- Connects to MCP servers over stdio and SSE.
- Builds a context by initializing the server, listing tools, listing resources
  and prompts when capabilities are declared, testing an unknown method, and
  sampling some tool calls.
- Groups deterministic rules into Protocol, Schema, Security, and Performance.
- Produces terminal, JSON, and Markdown output with CI scoring.
- Uses rule filtering and `--fail-under` style exit behavior.

Useful inspiration:

- Keep rules deterministic and fixture-friendly.
- Separate collection from rule evaluation.
- Attach timings to protocol observations.
- Include unknown-method and malformed-request probes.
- Treat security rules that depend on text matching as heuristics.

Reasons not to copy directly:

- Its rule IDs and categories are different from Sherpa's planned P/S/X/F
  taxonomy.
- It targets an older transport framing model and labels SSE directly.
- It validates tool schemas with Draft 7, while the latest MCP spec defaults
  schemas to JSON Schema 2020-12 unless `$schema` says otherwise.
- Its runtime behavior of calling tools with empty arguments is useful for
  testing, but dangerous against arbitrary production servers unless the linter
  has a safe mode and tool allowlist.

## Open Questions And Implementation Risks

- Phase 17 in `SHERPA_LABS_DEVELOPMENT.md` says `SseClient`, but the latest MCP
  spec uses Streamable HTTP and treats old HTTP+SSE as deprecated. Decide whether
  to name the implementation `SseClient`, `HttpClient`, or split
  `StreamableHttpClient` plus `LegacySseClient`.
- The target SDK/spec version must be pinned. Rules should record the negotiated
  protocol version and gate version-specific checks.
- JSON Schema support should include 2020-12 by default and Draft 7 only when
  explicitly declared or intentionally supported.
- Dynamic security checks can accidentally invoke destructive tools. Default
  lint mode should avoid arbitrary `tools/call`; deeper probes should require an
  allowlist, fixture server, or explicit user consent.
- Remote HTTP auth flows may require OAuth and browser/user interaction. The MVP
  linter should support preconfigured headers/tokens rather than implementing a
  full OAuth client unless a later phase expands scope.
- The linter should not fetch arbitrary icons or resource links by default.
  Static validation of icon URI schemes is safer.
- Pagination can create infinite loops if a server repeats cursors. The client
  should cap pages and detect cursor repetition.
- Large resource reads can exhaust memory or leak private data into reports.
  Sampling must use size limits and redact report output.
- Some reference servers are educational and permissive for testing, especially
  CORS behavior. Security rules should distinguish "detected risk" from
  "protocol invalid".
- Experimental `tasks` are present in `2025-11-25` and the everything server.
  They are out of scope for Phase 16-18 unless the later implementation plan
  changes.
