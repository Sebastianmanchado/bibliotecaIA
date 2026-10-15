import './style.css'
import { CURSOS_URL, PROMPTS_URL, PROPOSE_EMAIL, RANKING_URL } from './config.js'
import { loadCsv } from './csv.js'

const base = import.meta.env.BASE_URL
const logoSrc = `${base}brand/correo-argentino.png`
const badgeSrc = `${base}brand/ai-champions.png`

const TIPO_ORDER = ['Texto', 'Imagen', 'Voz', 'Datos', 'Código']
const USO_ORDER = [
  'Resumen',
  'Ideas',
  'Redacción',
  'Análisis',
  'Clasificación',
  'Traducción',
  'Generación de imagen',
  'Guion y locución',
  'Código y fórmulas',
]
const AREA_ORDER = ['Data + IA', 'Operaciones', 'Abastecimiento']
const DIFFICULTY_ORDER = ['Principiante', 'Intermedio', 'Avanzado', 'N/A']

const HERO = {
  prompts: {
    eyebrow: 'Biblioteca de prompts',
    title: 'Prompts listos para usar.',
    text: 'Textos para Data + IA, Operaciones y Abastecimiento. Copiá uno, completá lo que está entre corchetes y adaptalo a tu tarea.',
  },
  cursos: {
    eyebrow: 'Central de cursos',
    title: 'Cursos para los Champions de IA.',
    text: 'El catálogo curado de Central de Cursos, para avanzar por categoría y dificultad.',
  },
  ranking: {
    eyebrow: 'Ranking de uso',
    title: 'Próximamente: ranking de uso',
    text: 'Cuando la hoja tenga datos, esta vista ordena el uso por persona y área.',
  },
}

const state = {
  view: 'prompts',
  prompts: {
    status: 'loading',
    error: '',
    items: [],
    source: 'seed',
    area: '',
    tipo: '',
    uso: '',
    query: '',
    copiedId: '',
  },
  courses: {
    status: 'loading',
    error: '',
    items: [],
    category: '',
    difficulty: '',
  },
  ranking: {
    status: configured(RANKING_URL) ? 'loading' : 'soon',
    error: '',
    items: [],
    area: '',
    query: '',
  },
}

const app = document.querySelector('#app')
let copyTimer = 0

const mailto = `mailto:${PROPOSE_EMAIL}?subject=${encodeURIComponent('Propuesta de prompt — Biblioteca IA')}&body=${encodeURIComponent(
  [
    'Hola,',
    '',
    'Quiero proponer un prompt para la Biblioteca IA.',
    '',
    'Área:',
    'Tipo (Texto, Imagen, Voz, Datos, Código):',
    'Uso:',
    'Título:',
    'Objetivo:',
    'Texto del prompt:',
    '',
    'Gracias.',
  ].join('\n'),
)}`

boot()

function boot() {
  if (!location.hash) {
    history.replaceState(null, '', '#prompts')
  }

  app.innerHTML = `
    <header class="topbar">
      <a class="brand-chip" href="#prompts">
        <img src="${logoSrc}" alt="Correo Argentino" />
      </a>
      <nav class="nav" aria-label="Secciones">
        <a href="#ranking" data-nav="ranking">Ranking</a>
        <a href="#cursos" data-nav="cursos">Cursos</a>
        <a href="#prompts" data-nav="prompts">Prompts</a>
      </nav>
    </header>
    <main class="shell">
      <section class="hero" id="hero"></section>
      <section id="panel"></section>
      <footer class="site-footer">Gerencia de Inteligencia Artificial · Correo Argentino</footer>
    </main>
  `

  app.addEventListener('input', onInput)
  app.addEventListener('change', onChange)
  app.addEventListener('click', onClick)
  window.addEventListener('hashchange', () => {
    syncView()
    paint()
  })

  syncView()
  paint()
  loadAll()
}

function syncView() {
  const name = location.hash.replace(/^#/, '').split('?')[0]
  state.view = name === 'cursos' || name === 'ranking' ? name : 'prompts'
  document.title =
    state.view === 'cursos'
      ? 'Cursos · Biblioteca IA'
      : state.view === 'ranking'
        ? 'Ranking · Biblioteca IA'
        : 'Biblioteca IA · Correo Argentino'
}

function onInput(event) {
  if (event.target.id === 'prompt-query') {
    state.prompts.query = event.target.value
    paintResults()
  }

  if (event.target.id === 'rank-query') {
    state.ranking.query = event.target.value
    paintResults()
  }
}

function onChange(event) {
  const { id, value } = event.target

  if (id === 'filter-area') state.prompts.area = value
  if (id === 'filter-tipo') state.prompts.tipo = value
  if (id === 'filter-uso') state.prompts.uso = value
  if (id === 'course-category') state.courses.category = value
  if (id === 'course-difficulty') state.courses.difficulty = value
  if (id === 'rank-area') state.ranking.area = value

  paintResults()
}

function onClick(event) {
  const copyButton = event.target.closest('[data-copy]')

  if (copyButton) {
    const item = state.prompts.items.find((prompt) => prompt.id === copyButton.dataset.copy)
    if (!item) return
    copyText(item.texto).then(() => {
      state.prompts.copiedId = item.id
      paintResults()
      clearTimeout(copyTimer)
      copyTimer = setTimeout(() => {
        state.prompts.copiedId = ''
        paintResults()
      }, 1800)
    })
  }

  if (event.target.closest('[data-clear="prompts"]')) {
    state.prompts.area = ''
    state.prompts.tipo = ''
    state.prompts.uso = ''
    state.prompts.query = ''
    paint()
  }

  if (event.target.closest('[data-clear="ranking"]')) {
    state.ranking.area = ''
    state.ranking.query = ''
    paint()
  }

  if (event.target.closest('[data-clear="courses"]')) {
    state.courses.category = ''
    state.courses.difficulty = ''
    paint()
  }
}

async function loadAll() {
  await Promise.all([loadPrompts(), loadCourses(), loadRanking()])
}

async function loadPrompts() {
  state.prompts.status = 'loading'
  const remote = configured(PROMPTS_URL)
  state.prompts.source = remote ? 'sheet' : 'seed'

  try {
    const rows = remote ? await loadCsv(remote) : []
    let items = rows
      .map(normalizePrompt)
      .filter((prompt) => prompt.titulo && prompt.texto)

    if (!remote || items.length === 0) {
      const seedRows = await loadCsv(`${base}data/prompts.csv`)
      items = seedRows
        .map(normalizePrompt)
        .filter((prompt) => prompt.titulo && prompt.texto)
      state.prompts.source = 'seed'
    }

    state.prompts.items = items.sort(sortByOrder)
    state.prompts.status = 'ready'
  } catch (error) {
    state.prompts.status = 'error'
    state.prompts.error = error.message
  }

  if (state.view === 'prompts') paint()
}

async function loadCourses() {
  state.courses.status = 'loading'

  try {
    const rows = await loadCsv(CURSOS_URL)
    state.courses.items = rows
      .map(normalizeCourse)
      .filter((course) => course.title && course.url)
      .sort(sortCourses)
    state.courses.status = 'ready'
  } catch (error) {
    state.courses.status = 'error'
    state.courses.error = error.message
  }

  if (state.view === 'cursos') paint()
}

async function loadRanking() {
  const remote = configured(RANKING_URL)

  if (!remote) {
    state.ranking.status = 'soon'
    state.ranking.items = []
    if (state.view === 'ranking') paint()
    return
  }

  state.ranking.status = 'loading'

  try {
    const rows = await loadCsv(remote)
    state.ranking.items = rows
      .map(normalizeRank)
      .filter(Boolean)
      .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, 'es'))
    state.ranking.status = state.ranking.items.length > 0 ? 'ready' : 'soon'
  } catch (error) {
    state.ranking.status = 'error'
    state.ranking.error = error.message
  }

  if (state.view === 'ranking') paint()
}

function paint() {
  paintChrome()
  paintPanel()
}

function paintChrome() {
  document.querySelectorAll('[data-nav]').forEach((link) => {
    if (link.dataset.nav === state.view) link.setAttribute('aria-current', 'page')
    else link.removeAttribute('aria-current')
  })

  const copy = heroCopy()
  const cta =
    state.view === 'prompts'
      ? `<a class="cta" href="${escapeAttribute(mailto)}">Proponer un prompt</a>`
      : ''

  document.querySelector('#hero').innerHTML = `
    <div>
      <p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>
      <h1>${escapeHtml(copy.title)}</h1>
      <p class="hero-description">${escapeHtml(copy.text)}</p>
      ${cta}
    </div>
    <div class="champions-badge">
      <img src="${badgeSrc}" alt="AI + BI Champions - Correo Argentino" />
    </div>
  `
}

function heroCopy() {
  if (state.view === 'ranking' && state.ranking.status === 'ready') {
    return {
      eyebrow: 'Ranking de uso',
      title: 'Uso ordenado por persona.',
      text: 'Interacciones de mayor a menor. La variación compara el total con la columna anterior de la hoja.',
    }
  }

  return HERO[state.view]
}

function paintPanel() {
  const active = document.activeElement
  const activeId = active && active.id
  const caret = active && typeof active.selectionStart === 'number' ? active.selectionStart : null
  document.querySelector('#panel').innerHTML = panelHtml()
  paintResults()

  if (!activeId) return
  const next = document.getElementById(activeId)
  if (!next) return
  next.focus()
  if (caret != null && next.setSelectionRange) next.setSelectionRange(caret, caret)
}

function panelHtml() {
  if (state.view === 'prompts') return promptsPanel()
  if (state.view === 'cursos') return coursesPanel()
  return rankingPanel()
}

function promptsPanel() {
  const ready = state.prompts.status === 'ready'
  return `
    <section class="filters-card" aria-label="Filtros de prompts">
      <div class="filters-heading">
        <span>Explorar prompts</span>
        <strong id="result-count">Cargando...</strong>
      </div>
      <div class="filters-grid filters-grid-4">
        <label>
          Buscar
          <input id="prompt-query" type="search" placeholder="Título, objetivo o texto" value="${escapeAttribute(state.prompts.query)}" ${ready ? '' : 'disabled'} />
        </label>
        <label>
          Área
          <select id="filter-area" ${ready ? '' : 'disabled'}>
            ${optionsHtml(orderedValues(state.prompts.items, 'area', AREA_ORDER), 'Todas las áreas', state.prompts.area)}
          </select>
        </label>
        <label>
          Tipo
          <select id="filter-tipo" ${ready ? '' : 'disabled'}>
            ${optionsHtml(orderedValues(state.prompts.items, 'tipo', TIPO_ORDER), 'Todos los tipos', state.prompts.tipo)}
          </select>
        </label>
        <label>
          Uso
          <select id="filter-uso" ${ready ? '' : 'disabled'}>
            ${optionsHtml(orderedValues(state.prompts.items, 'uso', USO_ORDER), 'Todos los usos', state.prompts.uso)}
          </select>
        </label>
      </div>
      <button type="button" class="text-button" data-clear="prompts">Limpiar filtros</button>
    </section>
    <p id="seed-note" class="seed-note" hidden></p>
    <section id="status-region" class="status-panel" role="status"></section>
    <section id="results" class="cards prompt-grid" aria-label="Listado de prompts"></section>
  `
}

function coursesPanel() {
  const ready = state.courses.status === 'ready'
  return `
    <section class="filters-card" aria-label="Filtros de cursos">
      <div class="filters-heading">
        <span>Explorar cursos</span>
        <strong id="result-count">Cargando...</strong>
      </div>
      <div class="filters-grid">
        <label>
          Categoría
          <select id="course-category" ${ready ? '' : 'disabled'}>
            ${optionsHtml(uniqueSorted(state.courses.items, 'category'), 'Todas', state.courses.category)}
          </select>
        </label>
        <label>
          Dificultad
          <select id="course-difficulty" ${ready ? '' : 'disabled'}>
            ${optionsHtml(orderedValues(state.courses.items, 'difficulty', DIFFICULTY_ORDER), 'Todas las dificultades', state.courses.difficulty)}
          </select>
        </label>
      </div>
      <button type="button" class="text-button" data-clear="courses">Limpiar filtros</button>
    </section>
    <section id="status-region" class="status-panel" role="status"></section>
    <section id="results" class="cards course-grid" aria-label="Listado de cursos"></section>
  `
}

function rankingPanel() {
  if (state.ranking.status === 'soon') {
    return `
      <section class="soon-card" role="status">
        <p class="eyebrow">En preparación</p>
        <h2>Próximamente: ranking de uso</h2>
        <p>Esta vista va a ordenar el uso por persona y área. La hoja ya está prevista: cuando tenga filas, el ranking aparece acá.</p>
      </section>
    `
  }

  const ready = state.ranking.status === 'ready'
  return `
    <section class="filters-card" aria-label="Filtros del ranking">
      <div class="filters-heading">
        <span>Explorar ranking</span>
        <strong id="result-count">Cargando...</strong>
      </div>
      <div class="filters-grid">
        <label>
          Buscar
          <input id="rank-query" type="search" placeholder="Nombre o área" value="${escapeAttribute(state.ranking.query)}" ${ready ? '' : 'disabled'} />
        </label>
        <label>
          Área
          <select id="rank-area" ${ready ? '' : 'disabled'}>
            ${optionsHtml(orderedValues(state.ranking.items, 'area', AREA_ORDER), 'Todas las áreas', state.ranking.area)}
          </select>
        </label>
      </div>
      <button type="button" class="text-button" data-clear="ranking">Limpiar filtros</button>
    </section>
    <section id="status-region" class="status-panel" role="status"></section>
    <div id="results"></div>
  `
}

function paintResults() {
  const status = document.querySelector('#status-region')
  const results = document.querySelector('#results')
  const count = document.querySelector('#result-count')
  if (!status || !results || !count) return

  if (state.view === 'prompts') paintPromptResults(status, results, count)
  if (state.view === 'cursos') paintCourseResults(status, results, count)
  if (state.view === 'ranking') paintRankingResults(status, results, count)
}

function paintPromptResults(status, results, count) {
  const note = document.querySelector('#seed-note')

  if (state.prompts.status === 'loading') {
    count.textContent = 'Cargando...'
    showStatus(status, 'Cargando prompts...')
    results.innerHTML = ''
    if (note) note.hidden = true
    return
  }

  if (state.prompts.status === 'error') {
    count.textContent = 'Error'
    showStatus(status, 'No pudimos cargar los prompts.', state.prompts.error)
    results.innerHTML = ''
    if (note) note.hidden = true
    return
  }

  if (note) {
    note.hidden = state.prompts.source !== 'seed'
    note.textContent =
      'Biblioteca inicial. Pasa a leer la hoja Prompts cuando esa pestaña esté publicada.'
  }

  const items = filteredPrompts()
  count.textContent = `${items.length} prompt${items.length === 1 ? '' : 's'}`

  if (items.length === 0) {
    showStatus(status, 'No hay prompts con esa combinación de filtros.')
    results.innerHTML = ''
    return
  }

  status.hidden = true
  results.innerHTML = items.map(renderPromptCard).join('')
}

function paintCourseResults(status, results, count) {
  if (state.courses.status === 'loading') {
    count.textContent = 'Cargando...'
    showStatus(status, 'Cargando cursos...')
    results.innerHTML = ''
    return
  }

  if (state.courses.status === 'error') {
    count.textContent = 'Error'
    showStatus(status, 'No pudimos cargar los cursos.', state.courses.error)
    results.innerHTML = ''
    return
  }

  const items = filteredCourses()
  count.textContent = `${items.length} curso${items.length === 1 ? '' : 's'}`

  if (items.length === 0) {
    showStatus(status, 'No se encontraron cursos.')
    results.innerHTML = ''
    return
  }

  status.hidden = true
  results.innerHTML = items.map(renderCourseCard).join('')
}

function paintRankingResults(status, results, count) {
  if (state.ranking.status === 'loading') {
    count.textContent = 'Cargando...'
    showStatus(status, 'Cargando ranking...')
    results.innerHTML = ''
    return
  }

  if (state.ranking.status === 'error') {
    count.textContent = 'Error'
    showStatus(status, 'No pudimos cargar el ranking.', state.ranking.error)
    results.innerHTML = ''
    return
  }

  const items = filteredRanking()
  count.textContent = `${items.length} persona${items.length === 1 ? '' : 's'}`

  if (items.length === 0) {
    showStatus(status, 'Ninguna persona coincide con la búsqueda.')
    results.innerHTML = ''
    return
  }

  status.hidden = true
  results.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Usuario</th>
            <th>Área</th>
            <th class="num">Interacciones</th>
            <th class="num">vs. anterior</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((row) => renderRankRow(row)).join('')}
        </tbody>
      </table>
    </div>
  `
}

function renderPromptCard(prompt) {
  const copied = state.prompts.copiedId === prompt.id
  return `
    <article class="prompt-card">
      <div class="card-topline">
        <span class="chip chip-area">${escapeHtml(prompt.area)}</span>
        <span class="chip ${tipoClass(prompt.tipo)}">${escapeHtml(prompt.tipo)}</span>
        <span class="chip chip-uso">${escapeHtml(prompt.uso)}</span>
      </div>
      <h2>${escapeHtml(prompt.titulo)}</h2>
      <p class="objetivo"><span>Objetivo</span>${escapeHtml(prompt.objetivo)}</p>
      <pre class="prompt-text">${escapeHtml(prompt.texto)}</pre>
      <div class="card-actions">
        <span class="autor">${escapeHtml(prompt.autor)}</span>
        <button type="button" class="copy-button${copied ? ' is-copied' : ''}" data-copy="${escapeAttribute(prompt.id)}">
          ${copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </article>
  `
}

function renderCourseCard(course) {
  return `
    <article class="course-card">
      <div>
        <div class="card-topline">
          <span class="chip chip-category">${escapeHtml(course.category)}</span>
          <span class="chip ${difficultyClass(course.difficulty)}">${escapeHtml(course.difficulty)}</span>
        </div>
        <h2>${escapeHtml(course.title)}</h2>
      </div>
      <a href="${escapeAttribute(course.url)}" target="_blank" rel="noreferrer">Ver curso</a>
    </article>
  `
}

function renderRankRow(row) {
  const position = state.ranking.items.indexOf(row) + 1
  const delta = row.anterior == null ? null : row.total - row.anterior
  const trend =
    delta == null
      ? '<span class="trend-flat">—</span>'
      : delta > 0
        ? `<span class="trend-up">▲ ${delta}</span>`
        : delta < 0
          ? `<span class="trend-down">▼ ${Math.abs(delta)}</span>`
          : '<span class="trend-flat">=</span>'

  return `
    <tr>
      <td><span class="rank-no${position === 1 ? ' is-first' : ''}">${position}</span></td>
      <td>${escapeHtml(row.nombre)}</td>
      <td>${escapeHtml(row.area)}</td>
      <td class="num">${row.total}</td>
      <td class="num">${trend}</td>
    </tr>
  `
}

function filteredPrompts() {
  const query = fold(state.prompts.query)
  return state.prompts.items.filter((prompt) => {
    const blob = fold(`${prompt.titulo} ${prompt.objetivo} ${prompt.texto} ${prompt.area} ${prompt.autor}`)
    if (query && !blob.includes(query)) return false
    if (state.prompts.area && prompt.area !== state.prompts.area) return false
    if (state.prompts.tipo && prompt.tipo !== state.prompts.tipo) return false
    if (state.prompts.uso && prompt.uso !== state.prompts.uso) return false
    return true
  })
}

function filteredCourses() {
  return state.courses.items.filter((course) => {
    if (state.courses.category && course.category !== state.courses.category) return false
    if (state.courses.difficulty && course.difficulty !== state.courses.difficulty) return false
    return true
  })
}

function filteredRanking() {
  const query = fold(state.ranking.query)
  return state.ranking.items.filter((row) => {
    if (query && !fold(`${row.nombre} ${row.area}`).includes(query)) return false
    if (state.ranking.area && row.area !== state.ranking.area) return false
    return true
  })
}

function showStatus(status, title, detail = '') {
  status.hidden = false
  status.innerHTML = detail
    ? `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span>`
    : escapeHtml(title)
}

function optionsHtml(values, placeholder, selected) {
  const options = [`<option value="">${escapeHtml(placeholder)}</option>`]
  for (const value of values) {
    const current = value === selected ? ' selected' : ''
    options.push(`<option value="${escapeAttribute(value)}"${current}>${escapeHtml(value)}</option>`)
  }
  return options.join('')
}

function orderedValues(items, key, preferred) {
  const present = new Set(items.map((item) => item[key]).filter(Boolean))
  const known = preferred.filter((value) => present.has(value))
  const extra = [...present].filter((value) => !preferred.includes(value)).sort((a, b) => a.localeCompare(b, 'es'))
  return [...known, ...extra]
}

function uniqueSorted(items, key) {
  return [...new Set(items.map((item) => item[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))
}

function tipoClass(tipo) {
  const key = fold(tipo)
  if (key === 'texto') return 'tipo-texto'
  if (key === 'imagen') return 'tipo-imagen'
  if (key === 'voz') return 'tipo-voz'
  if (key === 'datos') return 'tipo-datos'
  if (key === 'codigo') return 'tipo-codigo'
  return 'tipo-texto'
}

function difficultyClass(difficulty) {
  const key = fold(difficulty)
  if (key === 'principiante') return 'diff-principiante'
  if (key === 'intermedio') return 'diff-intermedio'
  if (key === 'avanzado') return 'diff-avanzado'
  return 'diff-na'
}

function normalizePrompt(row, index) {
  return {
    id: `p-${index + 1}`,
    titulo: clean(row.titulo),
    area: clean(row.area),
    tipo: clean(row.tipo),
    uso: clean(row.uso),
    objetivo: clean(row.objetivo),
    texto: clean(row.texto),
    autor: clean(row.autor),
    orden: numberOr(row.orden, index + 1),
  }
}

function normalizeCourse(row, index) {
  return {
    title: clean(row.nombrecurso),
    category: clean(row.categoria),
    difficulty: clean(row.dificultad) || 'N/A',
    url: safeUrl(clean(row.link)),
    order: numberOr(row.order || row.orden, index + 1),
  }
}

function normalizeRank(row) {
  const nombre = clean(row.nombre)
  const total = toNumber(row.total)
  if (!nombre || total == null) return null

  return {
    nombre,
    area: clean(row.area),
    total,
    anterior: toNumber(row.anterior),
  }
}

function sortByOrder(a, b) {
  if (a.orden !== b.orden) return a.orden - b.orden
  return a.titulo.localeCompare(b.titulo, 'es')
}

function sortCourses(a, b) {
  if (a.order !== b.order) return a.order - b.order
  const categoryCompare = a.category.localeCompare(b.category, 'es')
  if (categoryCompare !== 0) return categoryCompare
  return a.title.localeCompare(b.title, 'es')
}

function configured(url) {
  return String(url || '').trim()
}

function clean(value) {
  return String(value ?? '').trim()
}

function numberOr(value, fallback) {
  const parsed = Number(String(value ?? '').trim())
  return Number.isFinite(parsed) ? parsed : fallback
}

function toNumber(value) {
  const raw = clean(value)
  if (!raw) return null
  const parsed = Number(raw.replace(/[^\d-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function safeUrl(value) {
  try {
    const url = new URL(value)
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href
  } catch {
    return ''
  }
  return ''
}

function fold(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#096;')
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.left = '-9999px'
    document.body.appendChild(area)
    area.select()
    document.execCommand('copy')
    area.remove()
  }
}
