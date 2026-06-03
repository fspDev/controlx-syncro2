/**
 * Control X Syncro — Agente local
 * Corre en segundo plano y permite que la app abra carpetas en el explorador de Windows.
 *
 * Uso: node agente-local.js
 */

const http = require('http')
const { exec } = require('child_process')
const { parse } = require('url')
const fs = require('fs')
const path = require('path')

const PORT = 3001

const server = http.createServer((req, res) => {
  // Permitir llamadas desde cualquier origen (necesario para el navegador)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  const { pathname, query } = parse(req.url, true)

  // GET /ping — verificar que el agente está corriendo
  if (pathname === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, version: '1.0' }))
    return
  }

  // GET /open?path=C:\ruta\a\carpeta — abrir carpeta en el explorador
  if (pathname === '/open' && query.path) {
    const folderPath = String(query.path)
    console.log(`[${new Date().toLocaleTimeString()}] Abriendo: ${folderPath}`)

    // Usar 'start' en Windows para abrir el explorador
    exec(`start "" explorer "${folderPath}"`, (err) => {
      if (err) {
        console.error('Error:', err.message)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: err.message }))
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      }
    })
    return
  }

  // GET /browse?path=\\servidor\proyectos — lista subcarpetas de un directorio
  if (pathname === '/browse' && query.path) {
    const dirPath = String(query.path)
    console.log(`[${new Date().toLocaleTimeString()}] Listando: ${dirPath}`)
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true })
      const folders = entries
        .filter(e => e.isDirectory())
        .map(e => ({
          name: e.name,
          path: path.join(dirPath, e.name),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true, folders, current: dirPath }))
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: false, error: err.message, folders: [] }))
    }
    return
  }

  res.writeHead(404)
  res.end()
})

server.listen(PORT, '127.0.0.1', () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Control X Syncro — Agente Local activo')
  console.log(`  Escuchando en http://localhost:${PORT}`)
  console.log('  Dejá esta ventana abierta mientras usás la app.')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
})
