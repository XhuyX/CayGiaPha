const fetch = require('node-fetch');

class ShareController {
    static async viewPublicTree(req, res) {
        try {
            const { token } = req.params;
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            
            // Lấy thông tin cây gia phả công khai từ backend
            const response = await fetch(`${backendUrl}/api/share/${token}`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (!data.success || !data.tree) {
                return res.status(404).send(`
                    <!DOCTYPE html>
                    <html lang="vi">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Link không hợp lệ</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                    </head>
                    <body class="font-sans bg-gray-100">
                        <div class="min-h-screen flex items-center justify-center px-4">
                            <div class="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
                                <i class="fas fa-exclamation-triangle text-red-500 text-5xl mb-4"></i>
                                <h1 class="text-2xl font-bold text-gray-800 mb-2">Link không hợp lệ</h1>
                                <p class="text-gray-600 mb-6">${data.message || 'Link chia sẻ không hợp lệ hoặc đã hết hạn'}</p>
                                <a href="/login" class="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                                    <i class="fas fa-home mr-2"></i>Về trang chủ
                                </a>
                            </div>
                        </div>
                    </body>
                    </html>
                `);
            }
            
            // Đảm bảo tree có đầy đủ thông tin
            if (!data.tree || !data.tree.id) {
                console.error('Tree data không hợp lệ:', data.tree);
                return res.status(500).send(`
                    <!DOCTYPE html>
                    <html lang="vi">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Lỗi dữ liệu</title>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                    </head>
                    <body class="font-sans bg-gray-100">
                        <div class="min-h-screen flex items-center justify-center px-4">
                            <div class="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
                                <i class="fas fa-exclamation-circle text-red-500 text-5xl mb-4"></i>
                                <h1 class="text-2xl font-bold text-gray-800 mb-2">Lỗi dữ liệu</h1>
                                <p class="text-gray-600 mb-6">Dữ liệu cây gia phả không hợp lệ</p>
                                <a href="/login" class="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                                    <i class="fas fa-home mr-2"></i>Về trang chủ
                                </a>
                            </div>
                        </div>
                    </body>
                    </html>
                `);
            }
            
            console.log('Rendering public tree view with tree:', data.tree);
            
            // Kiểm tra nếu user đã đăng nhập và là chủ sở hữu, redirect về view bình thường
            if (req.session.user && req.session.user.id === data.ownerId) {
                return res.redirect(`/tree/${data.tree.id}`);
            }
            
            res.render('tree/public', {
                title: data.tree.name || 'Cây Gia Phả Công Khai',
                tree: data.tree,
                shareToken: token,
                isPublic: true,
                user: req.session.user || null, // Truyền user nếu đã đăng nhập
                ownerId: data.ownerId,
                isOwner: req.session.user && req.session.user.id === data.ownerId
            });
        } catch (error) {
            console.error('Error loading public tree:', error);
            res.status(500).send(`
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Lỗi</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                </head>
                <body class="font-sans bg-gray-100">
                    <div class="min-h-screen flex items-center justify-center px-4">
                        <div class="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
                            <i class="fas fa-exclamation-circle text-red-500 text-5xl mb-4"></i>
                            <h1 class="text-2xl font-bold text-gray-800 mb-2">Lỗi</h1>
                            <p class="text-gray-600 mb-6">Có lỗi xảy ra khi tải cây gia phả công khai</p>
                            <a href="/login" class="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                                <i class="fas fa-home mr-2"></i>Về trang chủ
                            </a>
                        </div>
                    </div>
                </body>
                </html>
            `);
        }
    }
}

module.exports = ShareController;

