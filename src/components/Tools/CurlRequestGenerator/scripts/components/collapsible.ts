/**
 * Collapsible sections component
 */

export class CollapsibleManager {
  constructor() {
    this.init();
  }

  init(): void {
    this.setupCollapsibleSections();
    this.setupInitialStates();
  }

  setupCollapsibleSections(): void {
    const collapsibleHeaders = document.querySelectorAll(
      ".section-header.collapsible",
    );

    collapsibleHeaders.forEach((header) => {
      header.addEventListener("click", (e) => {
        e.preventDefault();
        this.toggleSection(header as HTMLElement);
      });
    });
  }

  setupInitialStates(): void {
    // Set initial collapsed state for sections that should start collapsed
    const sectionsToCollapse = [
      "authSection",
      "connectionSection",
      "outputSection",
      "advancedSection",
      "bodySection",
    ];

    sectionsToCollapse.forEach((sectionId) => {
      const section = document.getElementById(sectionId);
      const header = document.querySelector(
        `[data-target="${sectionId}"]`,
      ) as HTMLElement;

      if (section && header) {
        this.collapseSection(section, header);
      }
    });
  }

  toggleSection(header: HTMLElement): void {
    const targetId = header.getAttribute("data-target");
    if (!targetId) return;

    const section = document.getElementById(targetId);
    if (!section) return;

    const isCollapsed = section.classList.contains("collapsed");

    if (isCollapsed) {
      this.expandSection(section, header);
    } else {
      this.collapseSection(section, header);
    }
  }

  expandSection(section: HTMLElement, header: HTMLElement): void {
    // Remove collapsed class and update header
    header.classList.remove("collapsed");
    section.classList.remove("collapsed");

    // Set max-height for smooth animation
    section.style.maxHeight = section.scrollHeight + "px";
    section.style.opacity = "1";

    // Clean up inline styles after animation
    setTimeout(() => {
      if (!section.classList.contains("collapsed")) {
        section.style.maxHeight = "";
      }
    }, 300);
  }

  collapseSection(section: HTMLElement, header: HTMLElement): void {
    // Set current height first for smooth animation
    section.style.maxHeight = section.scrollHeight + "px";

    header.classList.add("collapsed");
    section.classList.add("collapsed");
  }

  expandAll(): void {
    const collapsibleSections = document.querySelectorAll(
      ".section-content.collapsed",
    );
    const collapsibleHeaders = document.querySelectorAll(
      ".section-header.collapsed",
    );

    collapsibleSections.forEach((section, index) => {
      const header = collapsibleHeaders[index] as HTMLElement;
      if (header) {
        this.expandSection(section as HTMLElement, header);
      }
    });
  }

  collapseAll(): void {
    const collapsibleSections = document.querySelectorAll(
      ".section-content:not(.collapsed)",
    );
    const collapsibleHeaders = document.querySelectorAll(
      ".section-header:not(.collapsed)",
    );

    // Skip the first section (Basic Request) - keep it always expanded
    for (let i = 1; i < collapsibleSections.length; i++) {
      const section = collapsibleSections[i] as HTMLElement;
      const header = collapsibleHeaders[i] as HTMLElement;
      if (header && section) {
        this.collapseSection(section, header);
      }
    }
  }

  getSectionState(sectionId: string): boolean {
    const section = document.getElementById(sectionId);
    return section ? !section.classList.contains("collapsed") : false;
  }

  setSectionState(sectionId: string, expanded: boolean): void {
    const section = document.getElementById(sectionId);
    const header = document.querySelector(
      `[data-target="${sectionId}"]`,
    ) as HTMLElement;

    if (!section || !header) return;

    if (expanded) {
      this.expandSection(section, header);
    } else {
      this.collapseSection(section, header);
    }
  }
}
