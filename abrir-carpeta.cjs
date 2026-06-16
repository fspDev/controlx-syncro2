/**
 * Control X Syncro — Manejador de protocolo "controlx-open://"
 *
 * Windows invoca este programa cuando el navegador navega a un link
 * controlx-open://servidor/carpeta%20con%20espacios/sub
 * pasando esa URI completa como argumento (%1 en el registro).
 *
 * Este programa la convierte de vuelta a una ruta UNC (\\servidor\carpeta...)
 * y abre el Explorador de Windows con esa ruta, en la PC local.
 */

const { exec } = require('child_process')

const uri = process.argv[2] || ''

// controlx-open://servidor/carpeta%20con%20espacios/sub -> \\servidor\carpeta con espacios\sub
const withoutScheme = uri.replace(/^controlx-open:\/\//i, '')
const decoded = withoutScheme.split('/').map(decodeURIComponent).join('\\')
const uncPath = '\\\\' + decoded

if (!decoded) {
  console.error('No se recibió una ruta válida:', uri)
  process.exit(1)
}

exec(`start "" explorer "${uncPath}"`, (err) => {
  if (err) {
    console.error('Error al abrir la carpeta:', err.message)
    process.exit(1)
  }
})
