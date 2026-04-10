export type ToastType = 'info' | 'error' | 'success';

/**
 * Frontend utility to trigger a globally floating toast notification (Modal Alert)
 * 
 * @param message The message to display.
 * @param type The type of toast: 'success', 'error', or 'info' (default).
 */
export const showToast = (message: string, type: ToastType = 'info') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('show_toast', {
        detail: { message, type },
      })
    );
  }
};
