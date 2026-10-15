# Biblioteca IA · Correo Argentino

Sitio estático para el programa AI Champions. Tiene tres vistas: biblioteca de prompts, catálogo de cursos y ranking de uso. No tiene backend. Los datos salen de pestañas CSV de un Google Sheet y se pueden actualizar sin volver a programar.

## Stack

- Vite
- JavaScript vanilla
- Papa Parse
- Google Sheets publicada como CSV
- GitHub Pages

## Ejecutar localmente

```bash
npm install
npm run dev
```

Para generar la versión publicable:

```bash
npm run build
npm run preview
```

## Vistas

- `#prompts`: biblioteca con filtros por área, tipo y uso, y botón para copiar el texto.
- `#cursos`: el mismo catálogo que Central de Cursos, con filtros por categoría y dificultad.
- `#ranking`: cartel **Próximamente: ranking de uso** mientras la hoja no tenga filas. Con filas, muestra la tabla ordenada por uso.

Proponer un prompt abre un mail a `jpirra@correoargentino.com.ar`.

## Fuente de datos

Las tres URLs están en `src/config.js`.

```js
const CURSOS_URL = 'https://docs.google.com/spreadsheets/.../pub?gid=...&single=true&output=csv'
const PROMPTS_URL = ''
const RANKING_URL = ''
```

- **Cursos**, **Prompts** y **Ranking** leen pestañas del mismo libro publicado. El enlace de “todo el documento” solo devuelve la primera hoja, así que cada vista usa su `gid`.
- **Prompts** usa la hoja cuando tiene filas. Si esa pestaña está vacía, el sitio sigue mostrando `public/data/prompts.csv`.
- **Ranking** muestra el cartel mientras la hoja no tenga filas. Con filas, aparece la tabla.

## Hojas del mismo spreadsheet

Abrí el libro que ya alimenta Central de Cursos y agregá dos pestañas.

### Prompts

Encabezados:

```csv
titulo,area,tipo,uso,objetivo,texto,autor,orden
```

`autor` y `orden` son opcionales. El texto para pegar está en [docs/prompts.example.csv](docs/prompts.example.csv).

### Ranking

Encabezados, sin filas al principio:

```csv
nombre,area,total,anterior
```

`anterior` es el total del período previo y sirve para la columna de variación. También está en [docs/ranking.example.csv](docs/ranking.example.csv).

Ejemplo de una fila, solo cuando quieras activar el ranking:

```csv
nombre,area,total,anterior
Ana Pérez,Operaciones,120,98
```

### Publicar

1. `Archivo → Compartir → Publicar en la web`.
2. Publicá cada pestaña como `Valores separados por comas (.csv)`.
3. Dejá activa la republicación automática.
4. Copiá cada URL y pegala en `PROMPTS_URL` o `RANKING_URL`.
5. Volvé a publicar el sitio.

La hoja publicada queda legible para quien tenga el enlace. No publiques datos sensibles.

## Deploy en GitHub Pages

`vite.config.js` usa `base: './'`, así el build funciona en una subruta del repositorio.

Con GitHub Actions:

1. Subí este proyecto a un repositorio propio, por ejemplo `bibliotecaIA`.
2. En `Settings → Pages`, elegí `GitHub Actions` como fuente.
3. El workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) publica `dist` en cada push a `main`.
