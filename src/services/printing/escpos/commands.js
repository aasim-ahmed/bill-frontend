/**
 * ESC/POS command byte constants.
 * Reference: ESC/POS Command Reference (EPSON, Star Micronics).
 */

export const ESC = 0x1B;
export const GS  = 0x1D;
export const LF  = 0x0A; // Line feed / newline

// ── Initialization ────────────────────────────────────────────────
/** ESC @ — Initialize printer (reset all settings) */
export const INIT = [ESC, 0x40];

// ── Alignment ─────────────────────────────────────────────────────
/** ESC a 0 — Left align */
export const ALIGN_LEFT   = [ESC, 0x61, 0x00];
/** ESC a 1 — Center align */
export const ALIGN_CENTER = [ESC, 0x61, 0x01];
/** ESC a 2 — Right align */
export const ALIGN_RIGHT  = [ESC, 0x61, 0x02];

// ── Text style ────────────────────────────────────────────────────
/** ESC E 1 — Bold ON */
export const BOLD_ON  = [ESC, 0x45, 0x01];
/** ESC E 0 — Bold OFF */
export const BOLD_OFF = [ESC, 0x45, 0x00];

/** GS ! n — Character size. n=0x00 normal, 0x11 double w+h */
export const SIZE_NORMAL = [GS, 0x21, 0x00];
export const SIZE_DOUBLE = [GS, 0x21, 0x11]; // double width + height

// ── Feed ──────────────────────────────────────────────────────────
/**
 * ESC d n — Feed n lines.
 * @param {number} lines
 * @returns {number[]}
 */
export const feedLines = (lines) => [ESC, 0x64, lines & 0xFF];

// ── Cut ───────────────────────────────────────────────────────────
/** GS V 0 — Full cut */
export const CUT_FULL  = [GS, 0x56, 0x00];
/** GS V 1 — Partial cut */
export const CUT_PARTIAL = [GS, 0x56, 0x01];

// ── Line spacing ──────────────────────────────────────────────────
/** ESC 2 — Default line spacing */
export const LINE_SPACING_DEFAULT = [ESC, 0x32];
/** ESC 3 n — Set line spacing to n dots */
export const lineSpacing = (dots) => [ESC, 0x33, dots & 0xFF];
