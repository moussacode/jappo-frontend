import { strToU8, zipSync } from 'fflate';

export type CsvValue = string | number | boolean | null | undefined;

export interface CsvArchiveFile {
  name: string;
  headers: readonly string[];
  rows: readonly (readonly CsvValue[])[];
}

export function downloadCsv(
  filename: string,
  headers: readonly string[],
  rows: readonly (readonly CsvValue[])[],
): void {
  const content = serializeCsv(headers, rows);
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `${sanitizeFilename(filename)}.csv`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadCsvArchive(filename: string, files: readonly CsvArchiveFile[]): void {
  const archive: Record<string, Uint8Array> = {};
  const usedNames = new Set<string>();

  for (const file of files) {
    const baseName = sanitizeFilename(file.name);
    let name = `${baseName}.csv`;
    let suffix = 2;
    while (usedNames.has(name)) {
      name = `${baseName}-${suffix++}.csv`;
    }
    usedNames.add(name);
    archive[name] = strToU8(`\uFEFF${serializeCsv(file.headers, file.rows)}`);
  }

  const blob = new Blob([zipSync(archive)], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `${sanitizeFilename(filename)}.zip`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function serializeCsv(
  headers: readonly string[],
  rows: readonly (readonly CsvValue[])[],
): string {
  return [headers, ...rows]
    .map((row) => row.map(formatCsvValue).join(';'))
    .join('\r\n');
}

function formatCsvValue(value: CsvValue): string {
  if (value === null || value === undefined) return '';

  let text = String(value);
  if (typeof value === 'string' && /^[\u0000-\u0020]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return /[;"\r\n]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}

function sanitizeFilename(filename: string): string {
  const safeFilename = filename
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return safeFilename || 'export';
}
