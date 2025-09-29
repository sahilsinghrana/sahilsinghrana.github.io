/**
 * Form validation utilities
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FormData {
  url?: string;
  bodyType?: string;
  body?: string;
  headers?: Record<string, string>;
  timeout?: string | number;
  maxRedirs?: string | number;
  maxTime?: string | number;
}

/**
 * Validate URL format
 * @param url - URL to validate
 * @returns Is valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate JSON format
 * @param jsonString - JSON string to validate
 * @returns Is valid JSON
 */
export function isValidJson(jsonString: string): boolean {
  if (!jsonString.trim()) return true; // Empty is valid

  try {
    JSON.parse(jsonString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate header name (permissive validation for curl generator)
 * @param headerName - Header name to validate
 * @returns Is valid header name
 */
export function isValidHeaderName(headerName: string): boolean {
  if (typeof headerName !== "string") return false;

  // Length limits for reasonable UX
  if (headerName.length === 0 || headerName.length > 200) return false;

  // Allow most characters that could be valid in curl commands
  // Only block control characters and characters that could break shell commands
  const invalidChars = /[\x00-\x1F\x7F\r\n]/;

  return !invalidChars.test(headerName);
}

/**
 * Validate header value (permissive validation for curl generator)
 * @param headerValue - Header value to validate
 * @returns Is valid header value
 */
export function isValidHeaderValue(headerValue: string): boolean {
  if (typeof headerValue !== "string") return false;

  // Reasonable length limits
  if (headerValue.length > 16384) return false; // 16KB limit

  // Only block control characters that could break shell commands
  const invalidChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

  return !invalidChars.test(headerValue);
}

/**
 * Sanitize input for shell command - ENHANCED SECURITY
 * @param input - Input to sanitize
 * @returns Sanitized input
 */
export function sanitizeForShell(input: string): string {
  if (typeof input !== "string") return "";

  // Remove null bytes and control characters
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, "");

  // Escape ALL shell metacharacters for maximum security
  sanitized = sanitized.replace(/([\\$`"'|&;<>(){}[\]*?~!#%^])/g, "\\$1");

  // Additional protection against command substitution
  sanitized = sanitized.replace(/\$\(/g, "\\$(");
  sanitized = sanitized.replace(/`/g, "\\`");

  // Limit length to prevent buffer overflow attacks
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }

  return sanitized;
}

/**
 * Sanitize HTML content to prevent XSS
 * @param input - Input to sanitize
 * @returns Sanitized HTML
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== "string") return "";

  const div = document.createElement("div");
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Validate URL for curl generator (permissive validation)
 * @param url - URL to validate
 * @returns Sanitized URL or null if invalid
 */
export function sanitizeUrl(url: string): string | null {
  if (typeof url !== "string") return null;

  // For curl generator, we allow more protocols and destinations
  // since users might want to test various endpoints
  try {
    const urlObj = new URL(url);

    // Allow common protocols that curl supports
    const allowedProtocols = [
      "http:",
      "https:",
      "ftp:",
      "ftps:",
      "sftp:",
      "scp:",
      "file:",
      "ldap:",
      "ldaps:",
      "smtp:",
      "smtps:",
      "pop3:",
      "pop3s:",
      "imap:",
      "imaps:",
    ];

    if (!allowedProtocols.includes(urlObj.protocol)) {
      return null;
    }

    // Allow all hostnames including localhost and private IPs
    // since this is just generating curl commands, not making requests
    return urlObj.toString();
  } catch {
    return null;
  }
}

/**
 * Validate form data before generating curl command (permissive for curl generator)
 * @param formData - Form data object
 * @returns Validation result with errors array
 */
export function validateFormData(formData: FormData): ValidationResult {
  const errors: string[] = [];

  // Basic URL validation - allow most URLs since we're just generating commands
  if (!formData.url) {
    errors.push("URL is required");
  } else {
    const sanitizedUrl = sanitizeUrl(formData.url);
    if (!sanitizedUrl) {
      errors.push("Please enter a valid URL");
    }
  }

  // Validate JSON body if present with reasonable size limits
  if (formData.bodyType === "json" && formData.body) {
    if (formData.body.length > 5242880) {
      // 5MB limit - more generous for curl
      errors.push("Request body too large (max 5MB)");
    } else if (!isValidJson(formData.body)) {
      errors.push("Invalid JSON format in request body");
    }
  }

  // Basic header validation - allow most headers for curl flexibility
  if (formData.headers) {
    const headerCount = Object.keys(formData.headers).length;
    if (headerCount > 100) {
      // More generous limit
      errors.push("Too many headers (max 100 allowed)");
    }

    Object.entries(formData.headers).forEach(([headerName, headerValue]) => {
      if (!isValidHeaderName(headerName)) {
        errors.push(
          `Invalid header name: ${sanitizeHtml(headerName)} (contains control characters)`,
        );
      }
      if (!isValidHeaderValue(headerValue)) {
        errors.push(
          `Invalid header value for ${sanitizeHtml(headerName)} (contains control characters)`,
        );
      }
    });
  }

  // Validate numeric fields with generous limits for curl testing
  if (formData.timeout) {
    const timeout = Number(formData.timeout);
    if (isNaN(timeout) || timeout < 1 || timeout > 86400) {
      // Up to 24 hours
      errors.push("Timeout must be between 1 and 86400 seconds");
    }
  }

  if (formData.maxRedirs) {
    const maxRedirs = Number(formData.maxRedirs);
    if (isNaN(maxRedirs) || maxRedirs < 0 || maxRedirs > 1000) {
      // Very generous
      errors.push("Max redirects must be between 0 and 1000");
    }
  }

  if (formData.maxTime) {
    const maxTime = Number(formData.maxTime);
    if (isNaN(maxTime) || maxTime < 1 || maxTime > 86400) {
      // Up to 24 hours
      errors.push("Max time must be between 1 and 86400 seconds");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Show validation errors to user
 * @param errors - Array of error messages
 */
export function showValidationErrors(errors: string[]): void {
  // Remove existing error messages
  const existingErrors = document.querySelectorAll(".validation-error");
  existingErrors.forEach((error) => error.remove());

  if (errors.length === 0) return;

  // Create error container
  const errorContainer = document.createElement("div");
  errorContainer.className = "validation-errors";
  errorContainer.innerHTML = `
        <div class="error-header">Please fix the following errors:</div>
        <ul>
            ${errors.map((error) => `<li>${error}</li>`).join("")}
        </ul>
    `;

  // Insert at top of form
  const form = document.getElementById("curlForm");
  if (form) {
    form.insertBefore(errorContainer, form.firstChild);

    // Scroll to errors
    errorContainer.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}
