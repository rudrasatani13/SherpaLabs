declare const AIMCP_LINT_PACKAGE_VERSION: string | undefined;

export const packageVersion =
  typeof AIMCP_LINT_PACKAGE_VERSION === 'string' ? AIMCP_LINT_PACKAGE_VERSION : '0.0.0';
