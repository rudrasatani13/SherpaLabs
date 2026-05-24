export {
  X001_UNSAFE_FILESYSTEM_ACCESS_RULE_ID,
  x001UnsafeFilesystemAccessRule,
} from './x001-unsafe-filesystem-access.js';
export {
  X002_UNRESTRICTED_PATH_PARAMETER_RULE_ID,
  x002UnrestrictedPathParameterRule,
} from './x002-unrestricted-path-parameter.js';
export {
  X003_UNRESTRICTED_URL_PARAMETER_RULE_ID,
  x003UnrestrictedUrlParameterRule,
} from './x003-unrestricted-url-parameter.js';
export { X004_SECRET_EXPOSURE_RULE_ID, x004SecretExposureRule } from './x004-secret-exposure.js';

import { x001UnsafeFilesystemAccessRule } from './x001-unsafe-filesystem-access.js';
import { x002UnrestrictedPathParameterRule } from './x002-unrestricted-path-parameter.js';
import { x003UnrestrictedUrlParameterRule } from './x003-unrestricted-url-parameter.js';
import { x004SecretExposureRule } from './x004-secret-exposure.js';

export const securityLintRules = [
  x001UnsafeFilesystemAccessRule,
  x002UnrestrictedPathParameterRule,
  x003UnrestrictedUrlParameterRule,
  x004SecretExposureRule,
] as const;
