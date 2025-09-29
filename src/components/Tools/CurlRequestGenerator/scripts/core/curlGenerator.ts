/**
 * Core curl command generator
 */

import { sanitizeForShell } from "../utils/validation.ts";

export interface CurlOptions {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  authType?: string;
  username?: string;
  password?: string;
  token?: string;
  bodyType?: string;
  body?: string;
  file?: File;
  followRedirects?: boolean;
  insecure?: boolean;
  compressed?: boolean;
  timeout?: string | number;
  maxRedirs?: string | number;
  userAgent?: string;
  referer?: string;
  includeHeaders?: boolean;
  headersOnly?: boolean;
  verbose?: boolean;
  silent?: boolean;
  showError?: boolean;
  outputFile?: string;
  writeOut?: string;
  proxy?: string;
  interface?: string;
  httpVersion?: string;
  maxTime?: string | number;
  ipv4?: boolean;
  ipv6?: boolean;
  failOnError?: boolean;
}

export class CurlGenerator {
  private writeOutFormats: Record<string, string>;

  constructor() {
    this.writeOutFormats = {
      status: "%{http_code}",
      time: "%{time_total}",
      size: "%{size_download}",
      all: "Status: %{http_code}\\nTime: %{time_total}s\\nSize: %{size_download} bytes\\nSpeed: %{speed_download} bytes/s",
    };
  }

  /**
   * Generate curl command from form data
   * @param options - Form data options
   * @returns Generated curl command
   */
  generate(options: CurlOptions): string {
    let command = "curl";
    const parts: string[] = [];

    // Add method if not GET
    if (options.method && options.method !== "GET") {
      parts.push(`-X ${options.method}`);
    }

    // Add headers
    this.addHeaders(parts, options);

    // Add authentication
    this.addAuthentication(parts, options);

    // Add body data
    this.addBodyData(parts, options);

    // Add connection options
    this.addConnectionOptions(parts, options);

    // Add output options
    this.addOutputOptions(parts, options);

    // Add advanced options
    this.addAdvancedOptions(parts, options);

    // Add URL (always last)
    if (options.url) {
      parts.push(`"${sanitizeForShell(options.url)}"`);
    }

    // Combine all parts
    if (parts.length > 0) {
      command += " " + parts.join(" ");
    }

    return command;
  }

  private addHeaders(parts: string[], options: CurlOptions): void {
    if (!options.headers) return;

    Object.entries(options.headers).forEach(([key, value]) => {
      if (key && value) {
        parts.push(`-H "${sanitizeForShell(key)}: ${sanitizeForShell(value)}"`);
      }
    });

    // Add Content-Type for JSON if not already present
    if (options.bodyType === "json" && options.body) {
      const hasContentType = Object.keys(options.headers).some(
        (key) => key.toLowerCase() === "content-type",
      );
      if (!hasContentType) {
        parts.push('-H "Content-Type: application/json"');
      }
    }

    // Add Content-Type for form data
    if (options.bodyType === "form" && options.body) {
      const hasContentType = Object.keys(options.headers).some(
        (key) => key.toLowerCase() === "content-type",
      );
      if (!hasContentType) {
        parts.push('-H "Content-Type: application/x-www-form-urlencoded"');
      }
    }
  }

  private addAuthentication(parts: string[], options: CurlOptions): void {
    if (!options.authType || options.authType === "none") return;

    switch (options.authType) {
      case "basic":
        if (options.username && options.password) {
          parts.push(
            `-u "${sanitizeForShell(options.username)}:${sanitizeForShell(options.password)}"`,
          );
        }
        break;
      case "bearer":
        if (options.token) {
          parts.push(
            `-H "Authorization: Bearer ${sanitizeForShell(options.token)}"`,
          );
        }
        break;
      case "digest":
        if (options.username && options.password) {
          parts.push("--digest");
          parts.push(
            `-u "${sanitizeForShell(options.username)}:${sanitizeForShell(options.password)}"`,
          );
        }
        break;
      case "ntlm":
        if (options.username && options.password) {
          parts.push("--ntlm");
          parts.push(
            `-u "${sanitizeForShell(options.username)}:${sanitizeForShell(options.password)}"`,
          );
        }
        break;
      case "negotiate":
        if (options.username && options.password) {
          parts.push("--negotiate");
          parts.push(
            `-u "${sanitizeForShell(options.username)}:${sanitizeForShell(options.password)}"`,
          );
        }
        break;
    }
  }

  private addBodyData(parts: string[], options: CurlOptions): void {
    if (!options.bodyType || options.bodyType === "none") return;

    switch (options.bodyType) {
      case "json":
      case "raw":
        if (options.body) {
          parts.push(`-d '${sanitizeForShell(options.body)}'`);
        }
        break;
      case "form":
        if (options.body) {
          parts.push(`-d "${sanitizeForShell(options.body)}"`);
        }
        break;
      case "multipart":
        if (options.body) {
          // Parse multipart data
          const lines = options.body.split("\n").filter((line) => line.trim());
          lines.forEach((line) => {
            if (line.includes("=")) {
              const [key, value] = line.split("=", 2);
              if (value.startsWith("@")) {
                // File upload
                parts.push(`-F "${sanitizeForShell(key.trim())}=${value}"`);
              } else {
                // Regular form field
                parts.push(
                  `-F "${sanitizeForShell(key.trim())}=${sanitizeForShell(value)}"`,
                );
              }
            }
          });
        }
        break;
    }
  }

  private addConnectionOptions(parts: string[], options: CurlOptions): void {
    if (options.followRedirects) {
      parts.push("-L");
    }

    if (options.insecure) {
      parts.push("-k");
    }

    if (options.compressed) {
      parts.push("--compressed");
    }

    if (options.timeout) {
      parts.push(`--connect-timeout ${options.timeout}`);
    }

    if (options.maxRedirs) {
      parts.push(`--max-redirs ${options.maxRedirs}`);
    }

    if (options.userAgent) {
      parts.push(`-A "${sanitizeForShell(options.userAgent)}"`);
    }

    if (options.referer) {
      parts.push(`-e "${sanitizeForShell(options.referer)}"`);
    }
  }

  private addOutputOptions(parts: string[], options: CurlOptions): void {
    if (options.includeHeaders) {
      parts.push("-i");
    }

    if (options.headersOnly) {
      parts.push("-I");
    }

    if (options.verbose) {
      parts.push("-v");
    }

    if (options.silent) {
      parts.push("-s");
    }

    if (options.showError) {
      parts.push("-S");
    }

    if (options.outputFile) {
      parts.push(`-o "${sanitizeForShell(options.outputFile)}"`);
    }

    if (options.writeOut && this.writeOutFormats[options.writeOut]) {
      parts.push(`-w "${this.writeOutFormats[options.writeOut]}"`);
    }
  }

  private addAdvancedOptions(parts: string[], options: CurlOptions): void {
    if (options.proxy) {
      parts.push(`--proxy "${sanitizeForShell(options.proxy)}"`);
    }

    if (options.interface) {
      parts.push(`--interface "${sanitizeForShell(options.interface)}"`);
    }

    if (options.httpVersion) {
      const versionMap: Record<string, string> = {
        "1.0": "--http1.0",
        "1.1": "--http1.1",
        "2": "--http2",
        "3": "--http3",
      };
      if (versionMap[options.httpVersion]) {
        parts.push(versionMap[options.httpVersion]);
      }
    }

    if (options.maxTime) {
      parts.push(`--max-time ${options.maxTime}`);
    }

    if (options.ipv4) {
      parts.push("-4");
    }

    if (options.ipv6) {
      parts.push("-6");
    }

    if (options.failOnError) {
      parts.push("-f");
    }
  }

  /**
   * Format command for better readability
   * @param command - Raw curl command
   * @returns Formatted command
   */
  formatCommand(command: string): string {
    // Add proper indentation and line breaks
    return command.replace(/\\\n/g, " \\\n  ").replace(/^curl/, "curl").trim();
  }
}
