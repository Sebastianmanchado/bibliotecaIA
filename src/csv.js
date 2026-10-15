import Papa from 'papaparse'

export function normalizeHeader(header) {
  return String(header || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export async function loadCsv(url) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`La fuente respondió con estado ${response.status}`)
  }

  const csv = await response.text()
  const parsed = Papa.parse(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
  })

  const fatal = parsed.errors.filter((error) => error.code !== 'UndetectableDelimiter')

  if (fatal.length > 0) {
    throw new Error('No se pudo interpretar el CSV publicado.')
  }

  return parsed.data
}
