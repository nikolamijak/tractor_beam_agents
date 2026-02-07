/**
 * Utility functions for data validation
 */

/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate message role
 */
export function isValidMessageRole(role: string): boolean {
  return ['user', 'assistant', 'system'].includes(role);
}

/**
 * Validate workflow status
 */
export function isValidWorkflowStatus(status: string): boolean {
  return ['pending', 'running', 'completed', 'failed', 'cancelled'].includes(
    status
  );
}

/**
 * Validate workflow type
 */
export function isValidWorkflowType(type: string): boolean {
  return [
    'code_generation',
    'refactoring',
    'documentation',
    'testing',
    'code_review',
    'custom',
  ].includes(type);
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate that a string is not empty after trimming
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate email format (basic)
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
