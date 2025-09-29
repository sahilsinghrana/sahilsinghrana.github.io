/**
 * Form management component
 */

export interface FormDataResult {
  method?: string;
  url?: string;
  bodyType?: string;
  authType?: string;
  username?: string;
  password?: string;
  token?: string;
  timeout?: string | number;
  maxRedirs?: string | number;
  userAgent?: string;
  referer?: string;
  outputFile?: string;
  writeOut?: string;
  proxy?: string;
  interface?: string;
  httpVersion?: string;
  maxTime?: string | number;
  followRedirects?: boolean;
  insecure?: boolean;
  compressed?: boolean;
  includeHeaders?: boolean;
  headersOnly?: boolean;
  verbose?: boolean;
  silent?: boolean;
  showError?: boolean;
  ipv4?: boolean;
  ipv6?: boolean;
  failOnError?: boolean;
  headers: Record<string, string>;
  body?: string;
  file?: File | null;
}

export class FormManager {
  private form: HTMLFormElement;
  private headersContainer: HTMLElement;
  private bodyTypeSelect: HTMLSelectElement;
  private bodyContent: HTMLElement;
  private fileUpload: HTMLElement;
  private authTypeSelect: HTMLSelectElement;
  private authFields: HTMLElement;

  constructor() {
    // Validate required elements exist
    this.form = this.getRequiredElement("curlForm") as HTMLFormElement;
    this.headersContainer = this.getRequiredElement(
      "headersContainer",
    ) as HTMLElement;
    this.bodyTypeSelect = this.getRequiredElement(
      "bodyType",
    ) as HTMLSelectElement;
    this.bodyContent = this.getRequiredElement("bodyContent") as HTMLElement;
    this.fileUpload = this.getRequiredElement("fileUpload") as HTMLElement;
    this.authTypeSelect = this.getRequiredElement(
      "authType",
    ) as HTMLSelectElement;
    this.authFields = this.getRequiredElement("authFields") as HTMLElement;

    this.init();
  }

  private getRequiredElement(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Required element with id '${id}' not found in DOM`);
    }
    return element;
  }

  private init(): void {
    this.setupHeaderManagement();
    this.setupBodyTypeHandling();
    this.setupAuthTypeHandling();
    this.setupFormReset();
    this.setupConditionalFields();
  }

  private setupHeaderManagement(): void {
    // Add header button
    const addHeaderBtn = document.getElementById(
      "addHeader",
    ) as HTMLButtonElement;
    if (addHeaderBtn) {
      addHeaderBtn.addEventListener("click", () => this.addHeaderRow());
    } else {
      console.warn("Add header button not found");
    }

    // Setup existing header rows
    this.setupHeaderRowEvents();
  }

  addHeaderRow(): void {
    // SECURE: Create elements programmatically to prevent XSS
    const headerRow = document.createElement("div");
    headerRow.className = "header-row";

    const keyInput = document.createElement("input");
    keyInput.type = "text";
    keyInput.placeholder = "Header name";
    keyInput.className = "header-key";
    keyInput.setAttribute("list", "commonHeaders");

    const valueInput = document.createElement("input");
    valueInput.type = "text";
    valueInput.placeholder = "Header value";
    valueInput.className = "header-value";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-header";
    removeButton.textContent = "×";

    headerRow.appendChild(keyInput);
    headerRow.appendChild(valueInput);
    headerRow.appendChild(removeButton);

    this.headersContainer.appendChild(headerRow);
    this.setupHeaderRowEvents(headerRow);

    // Focus on the new header name input
    keyInput.focus();
  }

  private setupHeaderRowEvents(
    container: HTMLElement = this.headersContainer,
  ): void {
    const removeButtons = container.querySelectorAll(".remove-header");

    removeButtons.forEach((button) => {
      // Remove existing listeners to prevent duplicates
      const newButton = button.cloneNode(true) as HTMLElement;
      button.parentNode?.replaceChild(newButton, button);

      newButton.addEventListener("click", (e) => {
        const row = (e.target as HTMLElement).closest(".header-row");
        if (row && this.headersContainer.children.length > 1) {
          row.remove();
        }
      });
    });
  }

  private setupBodyTypeHandling(): void {
    if (this.bodyTypeSelect) {
      this.bodyTypeSelect.addEventListener("change", () => {
        this.handleBodyTypeChange();
      });

      // Initial setup
      this.handleBodyTypeChange();
    } else {
      console.warn("Body type select not found");
    }
  }

  handleBodyTypeChange(): void {
    if (!this.bodyTypeSelect) return;

    const bodyType = this.bodyTypeSelect.value;
    const bodyData = document.getElementById("bodyData") as HTMLTextAreaElement;

    // Hide/show body content and file upload
    if (bodyType === "none") {
      this.bodyContent?.classList.add("hidden");
      this.fileUpload?.classList.add("hidden");
    } else {
      this.bodyContent?.classList.remove("hidden");
      this.fileUpload?.classList.add("hidden");

      // Update placeholder based on body type
      if (bodyData) {
        this.updateBodyPlaceholder(bodyType, bodyData);
      }
    }
  }

  private updateBodyPlaceholder(
    bodyType: string,
    bodyData: HTMLTextAreaElement | null,
  ): void {
    if (!bodyData) return;

    const placeholders: Record<string, string> = {
      json: '{\n  "key": "value",\n  "number": 123,\n  "array": [1, 2, 3]\n}',
      form: "key1=value1&key2=value2&key3=value3",
      multipart:
        "name=John Doe\nemail=john@example.com\nfile=@/path/to/file.txt",
      raw: "Raw text content or any other format",
    };

    bodyData.placeholder = placeholders[bodyType] || "Enter request body";
  }

  private setupAuthTypeHandling(): void {
    if (this.authTypeSelect) {
      this.authTypeSelect.addEventListener("change", () => {
        this.handleAuthTypeChange();
      });

      // Initial setup
      this.handleAuthTypeChange();
    } else {
      console.warn("Auth type select not found");
    }
  }

  handleAuthTypeChange(): void {
    if (!this.authTypeSelect) return;

    const authType = this.authTypeSelect.value;
    const usernameInput = document.getElementById(
      "username",
    ) as HTMLInputElement;
    const passwordInput = document.getElementById(
      "password",
    ) as HTMLInputElement;
    const usernameField = usernameInput?.parentElement as HTMLElement;
    const passwordField = passwordInput?.parentElement as HTMLElement;
    const tokenField = document.getElementById("tokenField") as HTMLElement;

    if (authType === "none") {
      this.authFields?.classList.add("hidden");
    } else if (authType === "bearer") {
      this.authFields?.classList.remove("hidden");
      usernameField?.classList.add("hidden");
      passwordField?.classList.add("hidden");
      tokenField?.classList.remove("hidden");
    } else {
      this.authFields?.classList.remove("hidden");
      usernameField?.classList.remove("hidden");
      passwordField?.classList.remove("hidden");
      tokenField?.classList.add("hidden");
    }
  }

  private setupFormReset(): void {
    const resetBtn = document.getElementById("resetForm") as HTMLButtonElement;
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        this.resetForm();
      });
    } else {
      console.warn("Reset button not found");
    }
  }

  private setupConditionalFields(): void {
    // IPv4/IPv6 mutual exclusion
    const ipv4Checkbox = document.getElementById("ipv4") as HTMLInputElement;
    const ipv6Checkbox = document.getElementById("ipv6") as HTMLInputElement;

    if (ipv4Checkbox && ipv6Checkbox) {
      ipv4Checkbox.addEventListener("change", () => {
        if (ipv4Checkbox.checked) {
          ipv6Checkbox.checked = false;
        }
      });

      ipv6Checkbox.addEventListener("change", () => {
        if (ipv6Checkbox.checked) {
          ipv4Checkbox.checked = false;
        }
      });
    }

    // Silent mode disables verbose
    const silentCheckbox = document.getElementById(
      "silent",
    ) as HTMLInputElement;
    const verboseCheckbox = document.getElementById(
      "verbose",
    ) as HTMLInputElement;

    if (silentCheckbox && verboseCheckbox) {
      silentCheckbox.addEventListener("change", () => {
        if (silentCheckbox.checked) {
          verboseCheckbox.checked = false;
        }
      });

      verboseCheckbox.addEventListener("change", () => {
        if (verboseCheckbox.checked) {
          silentCheckbox.checked = false;
        }
      });
    }

    // Headers only disables include headers
    const headersOnlyCheckbox = document.getElementById(
      "headersOnly",
    ) as HTMLInputElement;
    const includeHeadersCheckbox = document.getElementById(
      "includeHeaders",
    ) as HTMLInputElement;

    if (headersOnlyCheckbox && includeHeadersCheckbox) {
      headersOnlyCheckbox.addEventListener("change", () => {
        if (headersOnlyCheckbox.checked) {
          includeHeadersCheckbox.checked = false;
        }
      });
    }
  }

  resetForm(): void {
    // Reset form fields
    if (this.form) {
      this.form.reset();
    }

    // SECURE: Reset headers to single row using safe DOM methods
    if (this.headersContainer) {
      this.headersContainer.innerHTML = "";
      this.addHeaderRow();
    }

    // Reset body type
    this.handleBodyTypeChange();

    // Reset auth type
    this.handleAuthTypeChange();

    // Hide output
    const output = document.getElementById("output");
    if (output) {
      output.classList.add("hidden");
    }

    // Remove validation errors
    const errors = document.querySelectorAll(".validation-errors");
    errors.forEach((error) => error.remove());

    // Focus on URL field
    const urlField = document.getElementById("url") as HTMLInputElement;
    if (urlField) {
      urlField.focus();
    }
  }

  getFormData(): FormDataResult {
    if (!this.form) {
      throw new Error("Form not available");
    }

    const formData = new FormData(this.form);
    const data: FormDataResult = {
      headers: {},
    };

    // Basic form data
    formData.forEach((value, key) => {
      data[key] = value;
    });

    // Extract headers
    if (this.headersContainer) {
      const headerRows = this.headersContainer.querySelectorAll(".header-row");
      headerRows.forEach((row) => {
        const keyInput = row.querySelector(".header-key") as HTMLInputElement;
        const valueInput = row.querySelector(
          ".header-value",
        ) as HTMLInputElement;

        if (keyInput?.value.trim() && valueInput?.value.trim()) {
          data.headers[keyInput.value.trim()] = valueInput.value.trim();
        }
      });
    }

    // Extract body data
    if (data.bodyType !== "none") {
      const bodyData = document.getElementById(
        "bodyData",
      ) as HTMLTextAreaElement;
      data.body = bodyData?.value.trim() || null;
    }

    // Convert checkboxes to boolean
    const checkboxFields = [
      "followRedirects",
      "insecure",
      "compressed",
      "includeHeaders",
      "headersOnly",
      "verbose",
      "silent",
      "showError",
      "ipv4",
      "ipv6",
      "failOnError",
    ];

    checkboxFields.forEach((field) => {
      data[field] = formData.has(field);
    });

    return data;
  }
}
