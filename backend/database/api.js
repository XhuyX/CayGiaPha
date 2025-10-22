const express = require('express');
const router = express.Router();
const database = require('./database');

// Middleware xử lý lỗi
const handleError = (res, err, message = 'Lỗi server') => {
    console.error(message, err);
    res.status(500).json({ success: false, message });
};

// ===== API ĐĂNG NHẬP =====
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Trong thực tế, bạn nên hash password và so sánh
        const user = await database.getUserByUsername(username);
        
        if (user && user.MatKhau === password) {
            res.json({
                success: true,
                user: {
                    id: user.MaNguoiDung,
                    username: user.TenDangNhap,
                    email: user.Email,
                    isAdmin: user.LaQuanTri
                }
            });
        } else {
            res.json({ 
                success: false, 
                message: 'Tên đăng nhập hoặc mật khẩu không đúng' 
            });
        }
    } catch (err) {
        handleError(res, err, 'Lỗi đăng nhập');
    }
});

// ===== API ĐĂNG KÝ =====
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Kiểm tra user đã tồn tại chưa
        const existingUser = await database.getUserByUsername(username);
        if (existingUser) {
            return res.json({ 
                success: false, 
                message: 'Tên đăng nhập đã tồn tại' 
            });
        }
        
        const newUser = await database.createUser({
            username,
            email,
            password,
            isAdmin: false
        });
        
        res.json({
            success: true,
            user: {
                id: newUser.MaNguoiDung,
                username: newUser.TenDangNhap,
                email: newUser.Email,
                isAdmin: newUser.LaQuanTri
            }
        });
    } catch (err) {
        handleError(res, err, 'Lỗi đăng ký');
    }
});

// ===== API CÂY GIA PHẢ =====
router.get('/family-trees/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const trees = await database.getFamilyTreesByUser(parseInt(userId));
        
        const treesWithDetails = await Promise.all(
            trees.map(async tree => {
                const members = await database.getMembersByTree(tree.MaDongHo);
                const marriages = await database.getMarriagesByTree(tree.MaDongHo);
                const parentChildRelations = await database.getParentChildRelationsByTree(tree.MaDongHo);
                
                return database.transformToFrontendFormat(tree, members, marriages, parentChildRelations);
            })
        );
        
        res.json({ success: true, trees: treesWithDetails });
    } catch (err) {
        handleError(res, err, 'Lỗi lấy danh sách cây gia phả');
    }
});

router.post('/family-trees', async (req, res) => {
    try {
        const treeData = req.body;
        const newTree = await database.createFamilyTree(treeData);
        res.json({ success: true, tree: newTree });
    } catch (err) {
        handleError(res, err, 'Lỗi tạo cây gia phả');
    }
});

router.delete('/family-trees/:treeId', async (req, res) => {
    try {
        const { treeId } = req.params;
        await database.deleteFamilyTree(parseInt(treeId));
        res.json({ success: true, message: 'Đã xóa cây gia phả' });
    } catch (err) {
        handleError(res, err, 'Lỗi xóa cây gia phả');
    }
});

// ===== API THÀNH VIÊN =====
router.get('/family-trees/:treeId/members', async (req, res) => {
    try {
        const { treeId } = req.params;
        const members = await database.getMembersByTree(parseInt(treeId));
        res.json({ success: true, members });
    } catch (err) {
        handleError(res, err, 'Lỗi lấy danh sách thành viên');
    }
});

router.post('/family-trees/:treeId/members', async (req, res) => {
    try {
        const { treeId } = req.params;
        const memberData = { ...req.body, treeId: parseInt(treeId) };
        
        const newMemberId = await database.createMember(memberData);
        
        // Xử lý quan hệ hôn nhân nếu có
        if (memberData.pids && memberData.pids.length > 0) {
            for (const pid of memberData.pids) {
                await database.createMarriage({
                    husbandId: memberData.gender === 'male' ? newMemberId : pid,
                    wifeId: memberData.gender === 'female' ? newMemberId : pid
                });
            }
        }
        
        // Xử lý quan hệ cha mẹ - con nếu có
        if (memberData.mid) {
            await database.createParentChildRelation({
                parentId: memberData.mid,
                childId: newMemberId,
                relationType: 'Mẹ ruột'
            });
        }
        
        if (memberData.fid) {
            await database.createParentChildRelation({
                parentId: memberData.fid,
                childId: newMemberId,
                relationType: 'Cha ruột'
            });
        }
        
        res.json({ success: true, memberId: newMemberId });
    } catch (err) {
        handleError(res, err, 'Lỗi thêm thành viên');
    }
});

router.put('/family-trees/:treeId/members/:memberId', async (req, res) => {
    try {
        const { memberId } = req.params;
        const memberData = req.body;
        
        await database.updateMember(parseInt(memberId), memberData);
        res.json({ success: true, message: 'Đã cập nhật thành viên' });
    } catch (err) {
        handleError(res, err, 'Lỗi cập nhật thành viên');
    }
});

router.delete('/family-trees/:treeId/members/:memberId', async (req, res) => {
    try {
        const { memberId } = req.params;
        await database.deleteMember(parseInt(memberId));
        res.json({ success: true, message: 'Đã xóa thành viên' });
    } catch (err) {
        handleError(res, err, 'Lỗi xóa thành viên');
    }
});

// ===== API QUẢN TRỊ =====
router.get('/admin/users', async (req, res) => {
    try {
        const users = await database.getAllUsers();
        res.json({ success: true, users });
    } catch (err) {
        handleError(res, err, 'Lỗi lấy danh sách người dùng');
    }
});

router.put('/admin/users/:userId/status', async (req, res) => {
    try {
        const { userId } = req.params;
        const { active } = req.body;
        
        await database.updateUserStatus(parseInt(userId), active);
        res.json({ success: true, message: 'Đã cập nhật trạng thái' });
    } catch (err) {
        handleError(res, err, 'Lỗi cập nhật trạng thái người dùng');
    }
});

module.exports = router;