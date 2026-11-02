export const CONTEST_APPROVAL_PREFIX = 'contest-sao-viet-approval:';
export const approvalPrefix = (id: string, scope: string) => `${CONTEST_APPROVAL_PREFIX}${encodeURIComponent(id)}:${scope}:`;
export const approvalKey = (id: string, scope: string, code: string) => `${approvalPrefix(id, scope)}${encodeURIComponent(code.trim().toUpperCase())}`;
