const fetch = require('node-fetch');

class UserController {
    static async showProfile(req, res) {
        try {
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            const userId = req.session.user.id;
            
            // Get user profile from backend
            const response = await fetch(`${backendUrl}/api/user/profile?userId=${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (!data.success) {
                return res.render('error', {
                    title: 'Lỗi',
                    message: data.message || 'Không thể tải thông tin người dùng'
                });
            }
            
            // Get user's family trees count
            const treesResponse = await fetch(`${backendUrl}/api/family-trees/${userId}`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const treesData = await treesResponse.json();
            const treeCount = treesData.success ? (treesData.trees || []).length : 0;
            
            // Calculate total members - đếm tất cả thành viên trong tất cả cây gia phả
            let totalMembers = 0;
            if (treesData.success && treesData.trees && Array.isArray(treesData.trees)) {
                treesData.trees.forEach(tree => {
                    // Đảm bảo members là mảng và đếm số lượng
                    if (tree.members && Array.isArray(tree.members)) {
                        totalMembers += tree.members.length;
                    }
                });
            }
            
            res.render('user/profile', {
                title: 'Thông tin tài khoản',
                user: req.session.user,
                profile: {
                    ...data.user,
                    treeCount,
                    totalMembers
                }
            });
        } catch (error) {
            console.error('Error loading user profile:', error);
            res.render('error', {
                title: 'Lỗi',
                message: 'Có lỗi xảy ra khi tải thông tin người dùng'
            });
        }
    }
}

module.exports = UserController;

