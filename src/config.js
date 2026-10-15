// Mismo libro publicado en la web. Cada pestaña se lee con su gid.
const SHEET =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSnjPYCbFixOEwUtxbxUSrnHuNULtXbV4e3neavWcelCrT8fNfocI9zA5m-xrtUR9UXugzoHLevDQUA/pub'

const csv = (gid) => `${SHEET}?gid=${gid}&single=true&output=csv`

export const CURSOS_URL = csv('241043351')
export const RANKING_URL = csv('1538804685')
export const PROMPTS_URL = csv('1051526008')

export const PROPOSE_EMAIL = 'jpirra@correoargentino.com.ar'
