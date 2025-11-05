const express = require('express');
const cors = require('cors');
const path = require('path');
const database = require('./database/database');  // Đường dẫn tương đối đúng
const apiRoutes = require('./database/api');      // Đường dẫn tương đối đúng

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api', apiRoutes);

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Khởi động server
async function startServer() {
    try {
        await database.connect();
        
        app.listen(PORT, () => {
            console.log('═══════════════════════════════════════════════════════════');
            console.log('🚀 BACKEND SERVER ĐÃ KHỞI ĐỘNG');
            console.log('═══════════════════════════════════════════════════════════');
            console.log(`📍 Server đang chạy tại: http://localhost:${PORT}`);
            console.log(`📊 Kết nối database thành công!`);
            console.log(`🔗 API endpoints: http://localhost:${PORT}/api`);
            console.log('═══════════════════════════════════════════════════════════');
        });
    } catch (err) {
        console.error('❌ Không thể khởi động server:', err);
        process.exit(1);
    }
}

// Xử lý tắt server
process.on('SIGINT', async () => {
    await database.disconnect();
    process.exit(0);
});

startServer();