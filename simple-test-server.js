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
    const publicPath = path.join(__dirname, 'public');
    
    if (fs.existsSync(distPath)) {
        // 优先使用dist目录（构建后的文件）
        const fullPath = path.join(distPath, filePath);
        serveFile(fullPath, res, () => {
            // 如果文件不存在，尝试返回index.html（SPA路由）
            const indexPath = path.join(distPath, 'index.html');
            serveFile(indexPath, res, () => {
                res.writeHead(404);
                res.end('File not found');
            });
        });
    } else if (fs.existsSync(publicPath)) {
        // 如果没有dist目录，尝试public目录
        const fullPath = path.join(publicPath, filePath);
        serveFile(fullPath, res, () => {
            res.writeHead(404);
            res.end('File not found in public directory');
        });
    } else {
        // 如果都没有，返回测试页面
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
<!DOCTYPE html>
<html>
<head>
    <title>🍌 Nano-Bananary Test Server</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 40px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }
        .container {
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            text-align: center;
            max-width: 600px;
        }
        .status { color: #4ade80; font-weight: bold; font-size: 1.2em; }
        .info { 
            background: rgba(255,255,255,0.1); 
            padding: 20px; 
            margin: 20px 0; 
            border-radius: 10px;
            text-align: left;
        }
        .command {
            background: rgba(0,0,0,0.3);
            padding: 10px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            margin: 5px 0;
        }
        h1 { font-size: 2.5em; margin-bottom: 20px; }
        ul { text-align: left; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🍌 Nano-Bananary Test Server</h1>
        <p class="status">✓ 服务器运行正常！</p>
        <div class="info">
            <p><strong>服务器IP:</strong> 39.101.165.84</p>
            <p><strong>端口:</strong> ${PORT}</p>
            <p><strong>启动时间:</strong> ${new Date().toLocaleString('zh-CN')}</p>
            <p><strong>状态:</strong> 如果您能看到此页面，说明网络连接正常！</p>
        </div>
        <p>这表明问题可能出在前端构建或配置上，而不是网络连接问题。</p>
        <p><strong>下一步操作：</strong></p>
        <ul>
            <li>检查项目是否正确构建：<div class="command">npm run build</div></li>
            <li>检查PM2状态：<div class="command">pm2 status</div></li>
            <li>查看PM2日志：<div class="command">pm2 logs</div></li>
            <li>验证端口监听：<div class="command">netstat -tuln | grep 5173</div></li>
        </ul>
        <p style="margin-top: 30px; font-size: 0.9em; opacity: 0.8;">
            这是一个临时测试服务器，用于验证网络连接。<br>
            正常的应用服务器应该提供完整的React应用。
        </p>
    </div>
</body>
</html>
        `);
        return;
    }
});

function serveFile(filePath, res, onError) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (onError) onError();
            return;
        }
        
        // 根据文件扩展名设置Content-Type
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
            '.html': 'text/html; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf',
            '.eot': 'application/vnd.ms-fontobject'
        };
        
        const contentType = contentTypes[ext] || 'text/plain';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

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