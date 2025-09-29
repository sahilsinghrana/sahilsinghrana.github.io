/**
 * Clipboard utility functions
 */

/**
 * Copy text to clipboard with fallback for older browsers
 * @param text - Text to copy
 * @returns Success status
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Modern clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for older browsers
    return fallbackCopyToClipboard(text);
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return fallbackCopyToClipboard(text);
  }
}

/**
 * Fallback copy method for older browsers
 * @param text - Text to copy
 * @returns Success status
 */
function fallbackCopyToClipboard(text: string): boolean {
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);

    return successful;
  } catch (error) {
    console.error("Fallback copy failed:", error);
    return false;
  }
}

/**
 * Show visual feedback for copy action
 * @param button - Button element to show feedback on
 * @param originalText - Original button text
 * @param duration - Duration to show feedback (ms)
 */
export function showCopyFeedback(
  button: HTMLElement,
  originalText: string = "Copy",
  duration: number = 2000,
): void {
  const wasSuccessful =
    button.classList.contains("copied") ||
    button.textContent?.includes("Copied");

  button.textContent = wasSuccessful ? "✅ Copied!" : "📋 Copy";
  button.classList.add("copied");

  setTimeout(() => {
    button.textContent = originalText;
    button.classList.remove("copied");
  }, duration);
}
