export const EXIT_SUCCESS = 0;
export const EXIT_LINT_FAILED = 1;
export const EXIT_RUNTIME_ERROR = 2;

export type ExitCode = typeof EXIT_SUCCESS | typeof EXIT_LINT_FAILED | typeof EXIT_RUNTIME_ERROR;
