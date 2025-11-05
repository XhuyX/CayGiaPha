const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: 'family-tree-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// API Proxy - Forward API calls to backend
app.use('/api', async (req, res) => {
    try {
        const fetch = require('node-fetch');
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
        
        // Build URL with query string
        let url = `${backendUrl}/api${req.path}`;
        if (req.query && Object.keys(req.query).length > 0) {
            const queryString = new URLSearchParams(req.query).toString();
            url += `?${queryString}`;
        }
        
        
        const options = {
            method: req.method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            options.body = JSON.stringify(req.body);
        }
        
        const response = await fetch(url, options);
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error('API Proxy Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Routes
const routes = require('./routes');
app.use('/', routes);

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', { 
        title: 'Không tìm thấy trang',
        message: 'Trang bạn tìm kiếm không tồn tại.' 
    });
});

// Start server
app.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🚀 FRONTEND SERVER ĐÃ KHỞI ĐỘNG');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📍 Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`🎨 View engine: EJS`);
    console.log(`📁 Views directory: ${path.join(__dirname, 'views')}`);
    console.log(`📂 Static files: ${path.join(__dirname, 'public')}`);
    console.log(`🔗 Backend proxy: ${process.env.BACKEND_URL || 'http://localhost:3000'}`);
    console.log('═══════════════════════════════════════════════════════════');
});

