/**
 * Control X Syncro — Agente central de red
 * Corre en UN solo servidor y permite que todos los usuarios accedan
 * a las carpetas de red desde la app web.
 *
 * Uso: node agente-local.cjs
 * O como ejecutable: agente-controlx.exe
 */

const http = require('http')
const { exec } = require('child_process')
const { parse } = require('url')
const fs = require('fs')
const path = require('path')

const PORT = 3001

// Orígenes permitidos (agrega tu dominio si cambia)
const ALLOWED_ORIGINS = [
  'https://fspdev.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
]

const server = http.createServer((req, res) => {
  const origin = req.headers.origin || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  const { pathname, query } = parse(req.url, true)

  // GET /ping — verificar que el agente está corriendo
  if (pathname === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, version: '2.0', mode: 'central' }))
    return
  }

  // GET /open?path=\\servidor\proyectos\nombre — abrir carpeta en el explorador
  if (pathname === '/open' && query.path) {
    const folderPath = String(query.path)
    console.log(`[${new Date().toLocaleTimeString()}] Abriendo: ${folderPath}`)
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
        .map(e => ({ name: e.name, path: path.join(dirPath, e.name) }))
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

// Escuchar en todas las interfaces de red (no solo localhost)
server.listen(PORT, '0.0.0.0', () => {
  const os = require('os')
  const interfaces = os.networkInterfaces()
  const ips = []
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) ips.push(addr.address)
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Control X Syncro — Agente Central activo')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  Puerto: ${PORT}`)
  console.log('  Accesible desde la red en:')
  ips.forEach(ip => console.log(`    → http://${ip}:${PORT}`))
  console.log('')
  console.log('  Configurá esa URL en la app (Admin → URL del Agente)')
  console.log('  Dejá esta ventana abierta.')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
})
