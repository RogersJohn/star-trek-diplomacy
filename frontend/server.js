const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DIST = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

const server = http.createServer((req, res) => {
  // API and socket.io requests should not reach here in production
  // (handled by separate backend service)

  let filePath = path.join(DIST, req.url === '/' ? 'index.html' : req.url);

  // Remove query string
  filePath = filePath.split('?')[0];

  const ext = path.extname(filePath);

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err || !ext) {
      // SPA fallback: serve index.html for any non-file route
      filePath = path.join(DIST, 'index.html');
    }

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(500);
        res.end('Internal Server Error');
        return;
      }

      const mimeType = MIME_TYPES[path.extname(filePath)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mimeType });
      res.end(data);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend static server running on port ${PORT}`);
});
