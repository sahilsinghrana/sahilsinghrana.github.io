/**
 * Main application entry point
 */

import { CollapsibleManager } from "./components/collapsible.ts";
import { FormManager } from "./components/formManager.ts";
import { CurlGenerator } from "./core/curlGenerator.ts";
import { copyToClipboard, showCopyFeedback } from "./utils/clipboard.ts";

import type { FormDataResult } from "./components/formManager.ts";

import { validateFormData, showValidationErrors } from "./utils/validation.ts";

class CurlGeneratorApp {
  private collapsibleManager: CollapsibleManager;
  private formManager: FormManager;
  private curlGenerator: CurlGenerator;
  private form: HTMLFormElement;
  private output: HTMLElement;
  private curlOutput: HTMLElement;
  private copyBtn: HTMLButtonElement;
  private currentCommand: string = "";
  private debounceTimer?: number;

  constructor() {
    try {
      this.collapsibleManager = new CollapsibleManager();
      this.formManager = new FormManager();
      this.curlGenerator = new CurlGenerator();

      // Validate required DOM elements
      this.form = this.getRequiredElement("curlForm") as HTMLFormElement;
      this.output = this.getRequiredElement("output") as HTMLElement;
      this.curlOutput = this.getRequiredElement("curlOutput") as HTMLElement;
      this.copyBtn = this.getRequiredElement("copyBtn") as HTMLButtonElement;

      this.init();
    } catch (error) {
      console.error("Error initializing CurlGeneratorApp:", error);
      throw error; // Re-throw to be caught by the DOMContentLoaded handler
    }
  }

  private getRequiredElement(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Required element with id '${id}' not found in DOM`);
    }
    return element;
  }

  private init(): void {
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.loadSavedState();
  }

  private setupEventListeners(): void {
    // Form submission
    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.generateCurlCommand();
    });

    // Copy button
    this.copyBtn.addEventListener("click", () => {
      this.copyCommand();
    });

    // Auto-save form state
    this.form.addEventListener("input", () => {
      this.debounce(() => this.saveFormState(), 1000);
    });

    // URL input validation
    const urlInput = document.getElementById("url") as HTMLInputElement;
    urlInput.addEventListener("blur", () => {
      this.validateUrl(urlInput);
    });
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener("keydown", (e) => {
      // Ctrl/Cmd + Enter to generate
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        this.generateCurlCommand();
      }

      // Ctrl/Cmd + C when output is visible to copy
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "c" &&
        !this.output.classList.contains("hidden")
      ) {
        if (!window.getSelection()?.toString()) {
          e.preventDefault();
          this.copyCommand();
        }
      }

      // Escape to collapse all sections
      if (e.key === "Escape") {
        this.collapsibleManager.collapseAll();
      }
    });
  }

  private generateCurlCommand(): void {
    try {
      // Clear previous errors
      this.clearValidationErrors();

      // Get form data
      const formData = this.formManager.getFormData();

      // Validate form data
      const validation = validateFormData(formData);
      if (!validation.isValid) {
        showValidationErrors(validation.errors);
        return;
      }

      // Generate curl command
      this.currentCommand = this.curlGenerator.generate(formData);

      // Display output
      this.displayOutput(this.currentCommand);

      // Save successful generation
      this.saveFormState();
    } catch (error) {
      console.error("Error generating curl command:", error);
      this.showError(
        "An error occurred while generating the curl command. Please check your input and try again.",
      );
    }
  }

  private displayOutput(command: string): void {
    this.curlOutput.textContent = command;
    this.output.classList.remove("hidden");

    // Smooth scroll to output
    setTimeout(() => {
      this.output.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);

    // Add syntax highlighting
    this.addSyntaxHighlighting();
  }

  private addSyntaxHighlighting(): void {
    const content = this.curlOutput.textContent || "";

    // SECURE syntax highlighting - escape HTML first to prevent XSS
    const escapedContent = this.escapeHtml(content);

    // Apply syntax highlighting to escaped content
    const highlighted = escapedContent.replace(
      /(curl)|(--[a-zA-Z-]+|-{1}[a-zA-Z]+)|((https?:\/\/[^\s"'<>]+))|(&quot;.*?&quot;)/g,
      (match, cmd, flag, url, str) => {
        if (cmd) return `<span class="curl-command">${cmd}</span>`;
        if (flag) return `<span class="curl-flag">${flag}</span>`;
        if (url) return `<span class="curl-url">${url}</span>`;
        if (str) return `<span class="curl-string">${str}</span>`;
        return match;
      },
    );
    this.curlOutput.innerHTML = highlighted;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  private async copyCommand(): Promise<void> {
    if (!this.currentCommand) return;

    const success = await copyToClipboard(this.currentCommand);

    if (success) {
      showCopyFeedback(this.copyBtn, "📋 Copy");
    } else {
      this.showError("Failed to copy to clipboard");
    }
  }

  private validateUrl(input: HTMLInputElement): void {
    const url = input.value.trim();
    if (!url) return;

    try {
      new URL(url);
      input.classList.remove("error");
    } catch {
      input.classList.add("error");
    }
  }

  private saveFormState(): void {
    try {
      const formData = this.formManager.getFormData();
      localStorage.setItem("curlGeneratorState", JSON.stringify(formData));
    } catch (error) {
      console.warn("Failed to save form state:", error);
    }
  }

  private loadSavedState(): void {
    try {
      const savedState = localStorage.getItem("curlGeneratorState");
      if (!savedState) return;

      const formData = JSON.parse(savedState);
      this.restoreFormState(formData);
    } catch (error) {
      console.warn("Failed to load saved state:", error);
    }
  }

  private restoreFormState(formData: FormDataResult): void {
    // Restore basic form fields
    Object.entries(formData).forEach(([key, value]) => {
      const element = document.getElementById(key) as
        | HTMLInputElement
        | HTMLSelectElement;
      if (element && typeof value === "string") {
        element.value = value;
      } else if (element && typeof value === "boolean") {
        (element as HTMLInputElement).checked = value;
      }
    });

    // Restore headers
    if (formData.headers && Object.keys(formData.headers).length > 0) {
      this.restoreHeaders(formData.headers);
    }

    // Restore body data
    if (formData.body) {
      const bodyData = document.getElementById(
        "bodyData",
      ) as HTMLTextAreaElement;
      if (bodyData) bodyData.value = formData.body;
    }

    // Trigger change events to update UI
    this.formManager.handleBodyTypeChange();
    this.formManager.handleAuthTypeChange();
  }

  private restoreHeaders(headers: Record<string, string>): void {
    const container = this.formManager["headersContainer"];
    container.innerHTML = "";

    const headerEntries = Object.entries(headers);
    if (headerEntries.length === 0) {
      // Add default empty row
      this.formManager.addHeaderRow();
      return;
    }

    headerEntries.forEach(([key, value]) => {
      // SECURE: Create elements programmatically to prevent XSS
      const headerRow = document.createElement("div");
      headerRow.className = "header-row";

      const keyInput = document.createElement("input");
      keyInput.type = "text";
      keyInput.placeholder = "Header name";
      keyInput.className = "header-key";
      keyInput.setAttribute("list", "commonHeaders");
      keyInput.value = key; // Safe assignment

      const valueInput = document.createElement("input");
      valueInput.type = "text";
      valueInput.placeholder = "Header value";
      valueInput.className = "header-value";
      valueInput.value = value; // Safe assignment

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "remove-header";
      removeButton.textContent = "×";

      headerRow.appendChild(keyInput);
      headerRow.appendChild(valueInput);
      headerRow.appendChild(removeButton);
      container.appendChild(headerRow);
    });

    this.formManager["setupHeaderRowEvents"]();
  }

  private clearValidationErrors(): void {
    const errors = document.querySelectorAll(".validation-errors");
    errors.forEach((error) => error.remove());

    const errorInputs = document.querySelectorAll(".error");
    errorInputs.forEach((input) => input.classList.remove("error"));
  }

  private showError(message: string): void {
    // Create error notification
    const notification = document.createElement("div");
    notification.className = "error-notification";
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  private debounce(func: () => void, wait: number): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(func, wait);
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  try {
    new CurlGeneratorApp();
  } catch (error) {
    console.error("Failed to initialize Curl Generator App:", error);

    // Show user-friendly error message
    const errorDiv = document.createElement("div");
    errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #e74c3c;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            max-width: 90%;
            text-align: center;
        `;
    errorDiv.textContent =
      "Failed to load the application. Please refresh the page and try again.";
    document.body.appendChild(errorDiv);

    // Auto-remove error after 10 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 10000);
  }
});

// Add some additional CSS for syntax highlighting and error states
const additionalStyles = `
    .curl-command { color: #e74c3c; font-weight: bold; }
    .curl-flag { color: #3498db; }
    .curl-url { color: #27ae60; }
    .curl-string { color: #f39c12; }
    
    .error { border-color: #e74c3c !important; }
    
    .validation-errors {
        background: #fee;
        border: 1px solid #e74c3c;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 16px;
        color: #c0392b;
        font-size: var(--font-size-xs);
    }
    
    .validation-errors .error-header {
        font-weight: 600;
        margin-bottom: 6px;
    }
    
    .validation-errors ul {
        margin: 0;
        padding-left: 16px;
    }
    
    .validation-errors li {
        margin-bottom: 3px;
    }
    
    .error-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #e74c3c;
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
        font-size: var(--font-size-xs);
    }
    
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;

// Inject additional styles
const styleSheet = document.createElement("style");
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);
