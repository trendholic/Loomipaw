'use strict';
/** Minimal, correct CSV serializer (RFC-4180 quoting). */
function cell(v) {
  if (v == null) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/**
 * @param {string[]} headers  column headers
 * @param {Array<Array>} rows array of row arrays (same order as headers)
 * @returns {string} CSV text with a UTF-8 BOM (opens cleanly in Excel)
 */
function toCsv(headers, rows) {
  const lines = [headers.map(cell).join(',')];
  for (const r of rows) lines.push(r.map(cell).join(','));
  return '﻿' + lines.join('\r\n');
}

module.exports = { toCsv };
