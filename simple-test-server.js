const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5173;
const HOST = '0.0.0.0';

// 简单的静态文件服务器
const server = http.createServer((req, res) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    let filePath = req.url === '/' ? '/index.html' : req.url;
    
    // 检查是否存在dist目录
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
        filePath = path.join(distPath, filePath);
    } else {
        // 如果没有dist目录，返回简单的测试页面
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
<!DOCTYPE html>
<html>
<head>
    <title>Nano-Bananary Test Server</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .status { color: green; font-weight: bold; }
        .info { background: #f0f0f0; padding: 10px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>🍌 Nano-Bananary Test Server</h1>
    <p class="status">✓ Server is running successfully!</p>
    <div class="info">
        <p><strong>Server IP:</strong> 39.101.165.84</p>
        <p><strong>Port:</strong> ${PORT}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Status:</strong> If you can see this page, the server network configuration is working!</p>
    </div>
    <p>This means the issue is likely with the frontend build or PM2 configuration, not network connectivity.</p>
    <p>Next steps:</p>
    <ul>
        <li>Check if the project was built correctly: <code>npm run build</code></li>
        <li>Check PM2 status: <code>pm2 status</code></li>
        <li>Check PM2 logs: <code>pm2 logs</code></li>
    </ul>
</body>
</html>
        `);
        return;
    }
    
    // 尝试提供静态文件
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // 文件不存在，尝试返回index.html（SPA路由）
                const indexPath = path.join(distPath, 'index.html');
                fs.readFile(indexPath, (indexErr, indexData) => {
                    if (indexErr) {
                        res.writeHead(404);
                        res.end('File not found');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(indexData);
                    }
                });
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
        } else {
            // 根据文件扩展名设置Content-Type
            const ext = path.extname(filePath);
            const contentTypes = {
                '.html': 'text/html',
                '.js': 'application/javascript',
                '.css': 'text/css',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.ico': 'image/x-icon'
            };
            
            const contentType = contentTypes[ext] || 'text/plain';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        }
    });
});

server.listen(PORT, HOST, () => {
    console.log(`🍌 Simple test server running at http://${HOST}:${PORT}/`);
    console.log(`🌐 External access: http://39.101.165.84:${PORT}/`);
    console.log(`📁 Serving from: ${__dirname}`);
    console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
    
    // 检查dist目录
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
        console.log(`✓ Found dist directory`);
        console.log(`📦 Files in dist:`, fs.readdirSync(distPath));
    } else {
        console.log(`⚠️  No dist directory found, serving test page`);
    }
});

server.on('error', (err) => {
    console.error('Server error:', err);
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please stop other services or use a different port.`);
    }
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});