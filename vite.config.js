import { defineConfig } from 'vite';
import { qrcode } from 'vite-plugin-qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Pour obtenir __dirname dans un module ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware personnalisé pour la mini-API
const apiMiddleware = () => ({
  name: 'api-middleware',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      // Nettoyer l'URL de requête (enlever les paramètres de requête éventuels)
      const parsedUrl = new URL(req.url, 'http://localhost');
      
      if (parsedUrl.pathname === '/api/guests') {
        const dataDir = path.resolve(__dirname, 'data');
        const filePath = path.resolve(dataDir, 'guests.json');

        // S'assurer que le dossier data/ existe
        if (!fs.existsSync(dataDir)) {
          try {
            fs.mkdirSync(dataDir, { recursive: true });
          } catch (e) {
            console.error('Erreur lors de la création du dossier data:', e);
          }
        }

        // GET /api/guests : Lire le fichier JSON
        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          if (fs.existsSync(filePath)) {
            try {
              const data = fs.readFileSync(filePath, 'utf-8');
              res.end(data);
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Erreur lors de la lecture des invités' }));
            }
          } else {
            res.end(JSON.stringify([]));
          }
          return;
        }

        // POST /api/guests : Écrire dans le fichier JSON
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const guests = JSON.parse(body);
              fs.writeFileSync(filePath, JSON.stringify(guests, null, 2), 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (e) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'JSON invalide' }));
            }
          });
          return;
        }
      }
      next();
    });
  }
});

export default defineConfig({
  server: {
    host: true, // Écouter sur tout le réseau local
    port: 5173,
    allowedHosts: true // Autoriser tous les hôtes pour le déploiement sur domaine Coolify
  },
  plugins: [
    qrcode(),
    apiMiddleware()
  ]
});
