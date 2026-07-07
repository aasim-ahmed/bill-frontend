/**
 * Browser Printer Provider
 * Triggers the browser's native print dialog.
 * The caller is responsible for mounting the Receipt DOM before calling this.
 */

/**
 * Open the browser print dialog.
 * Resolves when the dialog closes (or after a 500ms fallback timeout).
 * @returns {Promise<void>}
 */
export function printBrowser() {
  return new Promise((resolve) => {
    const finish = () => {
      window.removeEventListener('afterprint', finish);
      resolve();
    };

    window.addEventListener('afterprint', finish, { once: true });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
        // Fallback: resolve after 500ms even if afterprint doesn't fire
        setTimeout(finish, 500);
      });
    });
  });
}
