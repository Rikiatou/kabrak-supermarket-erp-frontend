/**
 * useBarcodeScanner — global keyboard-wedge barcode scanner hook
 *
 * Detects physical barcode scanner input (very fast keystrokes) anywhere on the
 * page WITHOUT intercepting normal user typing in inputs/textareas/selects.
 *
 * How barcode scanners (keyboard wedge) work:
 *   - Send keystrokes extremely fast (< 30ms between chars)
 *   - Always end with Enter
 *   - Human typing is much slower (> 80ms between chars)
 *
 * Safety rule: if the user is actively typing in a text/search/number input,
 * textarea, or select → the hook stays silent and lets the keystrokes through normally.
 * Only activates when no editable element is focused.
 */

import { useEffect, useRef, useCallback } from "react";

const INTER_KEY_MAX_MS = 60;   // keystrokes faster than this = scanner
const MIN_BARCODE_LENGTH = 3;  // ignore very short codes (single chars, accidents)

/** Tags considered "editable" — we ignore scan input when these are focused */
const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isEditableFocused(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  if (EDITABLE_TAGS.has(el.tagName)) return true;
  if (el.isContentEditable) return true;
  return false;
}

export function useBarcodeScanner(
  onScan: (barcode: string) => void,
  /** Explicitly disable (e.g. a form modal is open and has its own barcode field) */
  disabled = false
) {
  const buffer    = useRef("");
  const lastTime  = useRef(0);
  const timer     = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onScanRef = useRef(onScan);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (disabled) return;

    // ── Never intercept when user is typing in a real input ──
    if (isEditableFocused()) return;

    const now = Date.now();
    const gap = now - lastTime.current;
    lastTime.current = now;

    // Gap too large → this is human key-press, not scanner burst → reset
    if (gap > 100 && buffer.current.length > 0) {
      buffer.current = "";
    }

    if (e.key === "Enter") {
      if (timer.current) clearTimeout(timer.current);
      const code = buffer.current;
      buffer.current = "";
      if (code.length >= MIN_BARCODE_LENGTH) {
        // Only fire if chars came in fast (scanner, not someone pressing letters slowly)
        onScanRef.current(code);
      }
      return;
    }

    // Accept printable single characters only
    if (e.key.length !== 1) return;

    buffer.current += e.key;

    // Auto-reset if Enter never arrives (defensive)
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { buffer.current = ""; }, 300);
  }, [disabled]);

  useEffect(() => {
    // bubble phase (false) so we don't fight with focused-input handlers
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [handleKeyDown]);
}
