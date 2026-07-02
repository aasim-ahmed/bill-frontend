/**
 * Low-level ESC/POS byte buffer builder.
 *
 * Usage:
 *   const builder = new EscPosBuilder();
 *   builder.init().center().bold('NazMart').newline().left().text('Bill #1');
 *   const bytes = builder.build();
 */

import {
  INIT, LF,
  ALIGN_LEFT, ALIGN_CENTER, ALIGN_RIGHT,
  BOLD_ON, BOLD_OFF,
  SIZE_NORMAL, SIZE_DOUBLE,
  feedLines, CUT_FULL,
  LINE_SPACING_DEFAULT,
} from './commands.js';

/** Width of an 80mm ESC/POS receipt in characters at 42 cpl. */
const LINE_WIDTH = 42;
const DIVIDER_CHAR = '-';

export class EscPosBuilder {
  constructor() {
    this._bytes = [];
  }

  // ── Raw append ─────────────────────────────────────────────────────────────

  /** Push a byte array into the buffer. */
  _push(bytes) {
    for (const b of bytes) this._bytes.push(b & 0xFF);
    return this;
  }

  /** Encode a string as Latin-1 bytes (safe subset of UTF-8 for thermal printers). */
  _encodeText(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      bytes.push(code < 256 ? code : 0x3F); // '?' fallback for unsupported chars
    }
    return bytes;
  }

  // ── Commands ───────────────────────────────────────────────────────────────

  /** ESC @ — Initialize printer. Should be the first command. */
  init() {
    return this._push(INIT);
  }

  /** ESC 2 — Restore default line spacing. */
  defaultLineSpacing() {
    return this._push(LINE_SPACING_DEFAULT);
  }

  // Alignment

  left()   { return this._push(ALIGN_LEFT);   }
  center() { return this._push(ALIGN_CENTER); }
  right()  { return this._push(ALIGN_RIGHT);  }

  // Size & style

  normalSize() { return this._push(SIZE_NORMAL); }
  doubleSize() { return this._push(SIZE_DOUBLE); }

  boldOn()  { return this._push(BOLD_ON);  }
  boldOff() { return this._push(BOLD_OFF); }

  // Text

  /** Append raw text (no newline). */
  text(str) {
    return this._push(this._encodeText(str));
  }

  /** Append a newline. */
  newline() {
    this._bytes.push(LF);
    return this;
  }

  /** Append text followed by a newline. */
  textLine(str) {
    return this.text(str).newline();
  }

  /** Print text centered on a line of LINE_WIDTH chars. */
  centeredLine(str) {
    const pad = Math.max(0, Math.floor((LINE_WIDTH - str.length) / 2));
    return this.center().textLine(str);
  }

  /** Print a full-width divider line using DIVIDER_CHAR. */
  divider() {
    return this.left().textLine(DIVIDER_CHAR.repeat(LINE_WIDTH));
  }

  /**
   * Print a two-column row: left label + right value.
   * Total width = LINE_WIDTH characters.
   */
  row(label, value) {
    const labelStr  = String(label);
    const valueStr  = String(value);
    const space     = Math.max(1, LINE_WIDTH - labelStr.length - valueStr.length);
    return this.left().textLine(labelStr + ' '.repeat(space) + valueStr);
  }

  // Feed & cut

  /** ESC d n — Feed n blank lines. */
  feed(lines = 1) {
    return this._push(feedLines(lines));
  }

  /** GS V 0 — Full paper cut. */
  cut() {
    return this._push(CUT_FULL);
  }

  // ── Output ─────────────────────────────────────────────────────────────────

  /** Return the accumulated bytes as a Uint8Array. */
  build() {
    return new Uint8Array(this._bytes);
  }
}
