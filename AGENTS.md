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
   - Use **`showToast('Message', 'success' | 'error' | 'info')`** from `src/lib/toast.ts` for fleeting notifications (e.g., "Saved successfully", "Copied to clipboard"). Do NOT use raw window.dispatchEvent.
   - Use **`ConfirmModal`** for critical interrupts that require user acknowledgment or a decision.

3. **Buttons & Inputs**
   - Always use the custom **`Button`** component (`src/components/ui/Button.tsx`). Do not use native `<button>` tags unless for microscopic icon wrapper functionality.
   - Always use the custom **`Input`** and **`Textarea`** components (`src/components/ui/Input.tsx`, `Textarea.tsx`) for styling consistency.

4. **Styling Approach (NO TAILWIND)**
   - **STRICTLY AVOID TAILWIND CSS**. It causes native compiler binding errors in this Windows/Node.js environment. Do not install Tailwind or suggest adding it.
   - Utilize existing CSS variables defined in `src/app/globals.css` (`var(--primary)`, `var(--text-muted)`, `var(--border-color)` etc.).
   - Use our predefined global CSS utility classes (`.text-muted`, `.bg-card`, `.empty-state`, `.sticky-header`) mapped in `globals.css` instead of raw `<div style={{ ... }}>` boilerplate.
   - Rely on Lucide Icons (`lucide-react`) for any iconography.

5. **Bottom Sheets & Rollup Menus**
   - Whenever you need to build a slide-up menu or bottom sheet on mobile/desktop, MUST use **`RollupPopup`** (`src/components/ui/RollupPopup.tsx`).
   - It already has swipe-to-dismiss physics, over-pull resistance, and perfectly handles high z-indexing using React Portal. Pass your menu options as `children`.
<!-- END:ui-agent-rules -->
