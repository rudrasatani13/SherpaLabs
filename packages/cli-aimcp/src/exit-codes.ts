export const EXIT_SUCCESS = 0;
export const EXIT_LINT_FAILED = 1;
export const EXIT_CONFIG_ERROR = 2;
export const EXIT_SERVER_ERROR = 3;

export type ExitCode =
  | typeof EXIT_SUCCESS
  | typeof EXIT_LINT_FAILED
  | typeof EXIT_CONFIG_ERROR
  | typeof EXIT_SERVER_ERROR;
