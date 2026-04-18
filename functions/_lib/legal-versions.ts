// legal-versions.ts — single source of truth for TOS + DPA version
// numbers stamped into acceptance audit trails.
//
// Bump these when the legal team revises either document. Customer
// LicenseSetup UI reads `/api/license/status` → config.prompt_reaccept
// and re-prompts the accept-terms checkbox when their stored version
// differs from the current constant. Register endpoint reads these too
// so first-admin registration stamps the version the customer accepted.
//
// DPA Section 7 compliance: every acceptance event records the version
// string it agreed to, so if legal rolls a v1.2 we can prove which
// customers are on v1.1 and need a re-accept prompt.

export const CURRENT_TOS_VERSION = '1.1';
export const CURRENT_DPA_VERSION = '1.1';
