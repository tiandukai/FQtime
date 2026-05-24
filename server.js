var http = require('http');
var fs = require('fs');
var path = require('path');
var port = 3456;
var root = __dirname;

var mime = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.json': 'application/json',
  '.webp': 'image/webp'
};

http.createServer(function(req, res) {
  var urlPath = decodeURIComponent(req.url === '/' ? '/dev.html' : req.url.split('?')[0]);
  var filePath = root + urlPath;
  var ext = path.extname(filePath);

  fs.readFile(filePath, function(err, data) {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
    res.end(data);
  });
}).listen(port, function() {
  console.log('http://localhost:' + port);
});
