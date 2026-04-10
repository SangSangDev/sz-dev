<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:ui-agent-rules -->
# 🎨 Common UI & Styles Guidelines (CRITICAL)

When building or modifying user interfaces in this repository, you MUST adhere to the following rules regarding common components and styling to maintain consistency:

1. **Alerts & Native Modals (`alert()`, `confirm()`, `prompt()`) are STRICTLY FORBIDDEN**. 
   - Never use the browser's native `alert()` or `confirm()`. 
   - Instead, you MUST use the project's **`ConfirmModal`** (located at `src/components/ui/ConfirmModal.tsx`).
   - If you need a simple alert (without a cancel button), pass ONLY the `onConfirm` prop to `ConfirmModal`. The cancel button is automatically hidden if `onCancel` is omitted.

2. **Toasts vs Modals**
   - Use **`window.dispatchEvent(new CustomEvent('show_toast', { detail: { message: '...', type: 'success' | 'error' | 'info' } }))`** for fleeting notifications (e.g., "Saved successfully", "Copied to clipboard").
   - Use **`ConfirmModal`** for critical interrupts that require user acknowledgment or a decision (e.g., "Concurrent login detected - You will be logged out", "Are you sure you want to delete?").

3. **Buttons & Inputs**
   - Always use the custom **`Button`** component (`src/components/ui/Button.tsx`). Do not use native `<button>` tags unless for microscopic icon wrapper functionality.
   - Always use the custom **`Input`** and **`Textarea`** components (`src/components/ui/Input.tsx`, `Textarea.tsx`) for styling consistency.

4. **Styling Approach**
   - Utilize existing CSS variables defined in `src/app/globals.css` (`var(--primary)`, `var(--text-muted)`, `var(--border-color)` etc.).
   - Rely on Lucide Icons (`lucide-react`) for any iconography.

5. **Bottom Sheets & Rollup Menus**
   - Whenever you need to build a slide-up menu or bottom sheet on mobile/desktop, MUST use **`RollupPopup`** (`src/components/ui/RollupPopup.tsx`).
   - It already has swipe-to-dismiss physics, over-pull resistance, and perfectly handles high z-indexing using React Portal. Pass your menu options as `children`.
<!-- END:ui-agent-rules -->

<!-- BEGIN:turbo-all -->
// turbo-all
# 🚀 Command Execution Guidelines
When executing run_command for safe local environment scripts, use SafeToAutoRun to bypass manual approval windows where applicable, per user requests to avoid freezing.
<!-- END:turbo-all -->
