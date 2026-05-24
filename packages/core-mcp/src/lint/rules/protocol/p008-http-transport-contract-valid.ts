import type { LintRule, LintRuleViolationInput } from '../../types.js';
import { createViolation, normalizeContentType } from '../helpers.js';

export const P008_HTTP_TRANSPORT_CONTRACT_VALID_RULE_ID = 'P008';

export const p008HttpTransportContractValidRule: LintRule = {
  id: P008_HTTP_TRANSPORT_CONTRACT_VALID_RULE_ID,
  category: 'protocol',
  severity: 'error',
  title: 'HTTP transport contract is valid',
  description: 'Flags invalid streamable HTTP method, content-type, and protocol-version behavior.',
  check(context) {
    if (context.transport !== 'sse' && context.transport !== 'streamable-http') {
      return [];
    }

    const http = context.metadata.http;
    if (http === undefined) {
      return [
        createViolation({
          message: 'HTTP transport metadata was not captured.',
          location: 'metadata.http',
          fixHint:
            'Capture HTTP request and response contract observations for HTTP MCP transports.',
        }),
      ];
    }

    const violations: LintRuleViolationInput[] = [];
    const accept = http.postAcceptHeader?.toLowerCase() ?? '';

    if (!accept.includes('application/json') || !accept.includes('text/event-stream')) {
      violations.push(
        createViolation({
          message:
            'HTTP POST Accept header does not include application/json and text/event-stream.',
          location: 'metadata.http.postAcceptHeader',
          fixHint: 'Send Accept: application/json, text/event-stream on MCP HTTP POST requests.',
          ...(http.postAcceptHeader !== undefined ? { evidence: http.postAcceptHeader } : {}),
        }),
      );
    }

    if (
      http.postContentType !== undefined &&
      normalizeContentType(http.postContentType) !== 'application/json'
    ) {
      violations.push(
        createViolation({
          message: 'HTTP POST Content-Type is not application/json.',
          location: 'metadata.http.postContentType',
          evidence: http.postContentType,
          fixHint: 'Use application/json for client-to-server JSON-RPC POST bodies.',
        }),
      );
    }

    const responseContentTypes = http.postResponseContentTypes ?? [];
    if (responseContentTypes.length === 0) {
      violations.push(
        createViolation({
          message: 'HTTP POST response content type was not captured.',
          location: 'metadata.http.postResponseContentTypes',
          fixHint:
            'Capture whether request POST responses are application/json or text/event-stream.',
        }),
      );
    }

    responseContentTypes.forEach((contentType, index) => {
      const normalized = normalizeContentType(contentType);
      if (normalized !== 'application/json' && normalized !== 'text/event-stream') {
        violations.push(
          createViolation({
            message: `HTTP POST response content type ${contentType} is not valid for MCP.`,
            location: `metadata.http.postResponseContentTypes[${index}]`,
            fixHint: 'Return application/json or text/event-stream for MCP request POST responses.',
          }),
        );
      }
    });

    if (http.notificationStatus !== undefined && http.notificationStatus !== 202) {
      violations.push(
        createViolation({
          message: `HTTP notification POST returned ${http.notificationStatus} instead of 202.`,
          location: 'metadata.http.notificationStatus',
          fixHint: 'Return 202 Accepted with an empty body for accepted client notifications.',
        }),
      );
    }

    if ((http.notificationBodyBytes ?? 0) > 0) {
      violations.push(
        createViolation({
          message: 'HTTP notification POST returned a response body.',
          location: 'metadata.http.notificationBodyBytes',
          fixHint: 'Return an empty body for accepted notification POSTs.',
        }),
      );
    }

    if (context.transport === 'streamable-http') {
      validateStreamableHttpVersionHeader(
        context.protocolVersion,
        http.protocolVersionHeader,
        violations,
      );
    }

    if (
      http.invalidProtocolVersionStatus !== undefined &&
      http.invalidProtocolVersionStatus !== 400
    ) {
      violations.push(
        createViolation({
          message: `Invalid MCP-Protocol-Version returned ${http.invalidProtocolVersionStatus} instead of 400.`,
          location: 'metadata.http.invalidProtocolVersionStatus',
          fixHint: 'Reject invalid MCP-Protocol-Version headers with HTTP 400.',
        }),
      );
    }

    if (
      http.sessionId !== undefined &&
      http.missingSessionStatus !== undefined &&
      http.missingSessionStatus !== 400
    ) {
      violations.push(
        createViolation({
          message: `Missing MCP-Session-Id returned ${http.missingSessionStatus} instead of 400.`,
          location: 'metadata.http.missingSessionStatus',
          fixHint: 'Reject requests missing a required MCP-Session-Id with HTTP 400.',
        }),
      );
    }

    return violations;
  },
};

function validateStreamableHttpVersionHeader(
  protocolVersion: string | undefined,
  protocolVersionHeader: string | undefined,
  violations: LintRuleViolationInput[],
): void {
  if (protocolVersion === undefined) {
    return;
  }

  if (protocolVersionHeader === undefined) {
    violations.push(
      createViolation({
        message:
          'Streamable HTTP request did not include MCP-Protocol-Version after initialization.',
        location: 'metadata.http.protocolVersionHeader',
        fixHint: 'Include MCP-Protocol-Version on every post-initialization HTTP request.',
      }),
    );
    return;
  }

  if (protocolVersionHeader !== protocolVersion) {
    violations.push(
      createViolation({
        message: `HTTP MCP-Protocol-Version ${protocolVersionHeader} does not match negotiated ${protocolVersion}.`,
        location: 'metadata.http.protocolVersionHeader',
        fixHint: 'Send the negotiated protocol version on all post-initialization HTTP requests.',
      }),
    );
  }
}
