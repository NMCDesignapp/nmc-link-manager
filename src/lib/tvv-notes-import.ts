/**
 * Apply a two-column TVV notes update without modifying personnel records.
 * Only codes present both in the Excel payload and the current TVV roster change.
 * An explicit blank note clears the corresponding existing note.
 */
export type TVVNoteEntry = { code: string; note: string };
export type TVVNotesImportSummary = {
  inputCount: number;
  matched: number;
  changed: number;
  cleared: number;
  unchanged: number;
  unmatched: number;
  unmatchedCodes: string[];
};
export function prepareTVVNotesImport(
  input: unknown,
  currentCodes: string[],
  currentNotes: Record<string, string>,
): { notes: Record<string, string>; summary: TVVNotesImportSummary } {
  if (!Array.isArray(input) || input.length === 0 || input.length > 10000) {
    throw new Error('File ghi chú phải có từ 1 đến 10.000 mã TVV.');
  }
  const normalize = (value: unknown) => String(value ?? '').trim().toUpperCase();
  const codes = new Map(currentCodes.map((code) => [normalize(code), code]));
  const next = { ...currentNotes };
  const seen = new Set<string>();
  let matched = 0, changed = 0, cleared = 0, unchanged = 0, unmatched = 0;
  const unmatchedCodes: string[] = [];

  for (let i = 0; i < input.length; i++) {
    const row = input[i];
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error(`Dòng ${i + 2} không hợp lệ.`);
    }
    const record = row as Record<string, unknown>;
    if (typeof record.code !== 'string' || typeof record.note !== 'string') {
      throw new Error(`Dòng ${i + 2} thiếu Mã TVV hoặc Ghi chú.`);
    }
    const code = normalize(record.code);
    const note = record.note.trim();
    if (!code || code.length > 80 || /[\r\n\t]/.test(code)) {
      throw new Error(`Dòng ${i + 2} có Mã TVV không hợp lệ.`);
    }
    if (note.length > 1000) {
      throw new Error(`Dòng ${i + 2}: Ghi chú không được quá 1.000 ký tự.`);
    }
    if (seen.has(code)) throw new Error(`Mã TVV bị trùng trong file: ${code}.`);
    seen.add(code);
    const actualCode = codes.get(code);
    if (!actualCode) {
      unmatched++;
      if (unmatchedCodes.length < 10) unmatchedCodes.push(code);
      continue;
    }
    matched++;
    const previous = String(next[actualCode] ?? '').trim();
    if (previous === note) {
      unchanged++;
      continue;
    }
    changed++;
    if (!note) {
      delete next[actualCode];
      cleared++;
    } else {
      next[actualCode] = note;
    }
  }

  return {
    notes: next,
    summary: {
      inputCount: input.length, matched, changed, cleared, unchanged,
      unmatched, unmatchedCodes,
    },
  };
}
