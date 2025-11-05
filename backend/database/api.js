const express = require('express');
const router = express.Router();
const database = require('./database');
const bcrypt = require('bcrypt');
const sql = require('mssql');

// ==================== MIDDLEWARE ====================

// Middleware xử lý lỗi
const handleError = (res, err, message = 'Lỗi server') => {
    console.error(message, err);
    res.status(500).json({ success: false, message, error: err.message });
};

// Middleware kiểm tra admin (có thể dùng cho các route admin)
const requireAdmin = async (req, res, next) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Không có quyền truy cập' });
        }
        
        const user = await database.pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT LaQuanTri FROM NguoiDung WHERE MaNguoiDung = @userId');
        
        if (!user.recordset[0] || !user.recordset[0].LaQuanTri) {
            return res.status(403).json({ success: false, message: 'Yêu cầu quyền Admin' });
        }
        
        next();
    } catch (err) {
        handleError(res, err, 'Lỗi xác thực');
    }
};

// ==================== UC-01: ĐĂNG KÝ ====================

router.post('/register', async (req, res) => {
    try {
        const { username, email, password, confirmPassword } = req.body;
        
        // Validation
        if (!username || !email || !password || !confirmPassword) {
            return res.json({ 
                success: false, 
                message: 'Vui lòng điền đầy đủ thông tin' 
            });
        }
        
        if (password !== confirmPassword) {
            return res.json({ 
                success: false, 
                message: 'Mật khẩu xác nhận không khớp' 
            });
        }

        // Kiểm tra độ dài mật khẩu
        if (password.length < 6) {
            return res.json({ 
                success: false, 
                message: 'Mật khẩu phải có ít nhất 6 ký tự' 
            });
        }
        
        // Kiểm tra username đã tồn tại
        const existingUser = await database.getUserByUsername(username);
        if (existingUser) {
            return res.json({ 
                success: false, 
                message: 'Tên đăng nhập đã tồn tại' 
            });
        }

        // Kiểm tra email đã tồn tại
        const existingEmail = await database.getUserByEmail(email);
        if (existingEmail) {
            return res.json({ 
                success: false, 
                message: 'Email đã được sử dụng' 
            });
        }
        
        // Hash mật khẩu
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Tạo user mới
        const newUser = await database.createUser({
            username,
            email,
            password: hashedPassword,
            isAdmin: false
        });
        
        res.json({
            success: true,
            message: 'Đăng ký thành công',
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

// ==================== UC-02: ĐĂNG NHẬP ====================

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Validation
        if (!username || !password) {
            return res.json({ 
                success: false, 
                message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu' 
            });
        }
        
        // Kiểm tra user tồn tại
        const user = await database.getUserByUsername(username);
        if (!user) {
            return res.json({ 
                success: false, 
                message: 'Tên đăng nhập không tồn tại' 
            });
        }

        // Kiểm tra trạng thái tài khoản
        if (!user.TrangThaiHoatDong) {
            return res.json({ 
                success: false, 
                message: 'Tài khoản đã bị vô hiệu hóa' 
            });
        }

        // Kiểm tra mật khẩu
        let passwordValid = false;
        
        // Mật khẩu đã được hash (bắt đầu bằng $2a$ hoặc $2b$)
        if (user.MatKhau.startsWith('$2a$') || user.MatKhau.startsWith('$2b$')) {
            passwordValid = await bcrypt.compare(password, user.MatKhau);
        } else {
            // Mật khẩu chưa được hash (dữ liệu cũ - so sánh trực tiếp)
            passwordValid = (password === user.MatKhau);
        }

        if (passwordValid) {
            res.json({
                success: true,
                message: 'Đăng nhập thành công',
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
                message: 'Mật khẩu không đúng' 
            });
        }
    } catch (err) {
        handleError(res, err, 'Lỗi đăng nhập');
    }
});

// ==================== UC-03, UC-09: CÂY GIA PHẢ ====================

// UC-03: Lấy tất cả cây gia phả của user
router.get('/family-trees/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const trees = await database.getFamilyTreesByUser(parseInt(userId));
        
        // Lấy chi tiết từng cây (bao gồm members, marriages, relations)
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

// Lấy thông tin chi tiết 1 cây gia phả
router.get('/family-trees/detail/:treeId', async (req, res) => {
    try {
        const { treeId } = req.params;
        const tree = await database.getFamilyTreeById(parseInt(treeId));
        
        if (!tree) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy cây gia phả' });
        }

        const members = await database.getMembersByTree(parseInt(treeId));
        const marriages = await database.getMarriagesByTree(parseInt(treeId));
        const parentChildRelations = await database.getParentChildRelationsByTree(parseInt(treeId));
        
        const treeWithDetails = database.transformToFrontendFormat(tree, members, marriages, parentChildRelations);
        
        res.json({ success: true, tree: treeWithDetails });
    } catch (err) {
        handleError(res, err, 'Lỗi lấy thông tin cây gia phả');
    }
});

// UC-09: Tạo cây gia phả mới
router.post('/family-trees', async (req, res) => {
    try {
        const { userId, name, origin, branch, description } = req.body;
        
        // Validation
        if (!userId || !name) {
            return res.json({ 
                success: false, 
                message: 'Tên gia phả là bắt buộc' 
            });
        }

        const newTree = await database.createFamilyTree({
            userId: parseInt(userId),
            name,
            origin,
            branch,
            description
        });
        
        res.json({ 
            success: true, 
            message: 'Tạo cây gia phả thành công',
            tree: newTree 
        });
    } catch (err) {
        handleError(res, err, 'Lỗi tạo cây gia phả');
    }
});

// Cập nhật thông tin cây gia phả
router.put('/family-trees/:treeId', async (req, res) => {
    try {
        const { treeId } = req.params;
        const { name, origin, branch, description } = req.body;
        
        if (!name) {
            return res.json({ 
                success: false, 
                message: 'Tên gia phả là bắt buộc' 
            });
        }

        await database.updateFamilyTree(parseInt(treeId), {
            name,
            origin,
            branch,
            description
        });
        
        res.json({ 
            success: true, 
            message: 'Cập nhật cây gia phả thành công' 
        });
    } catch (err) {
        handleError(res, err, 'Lỗi cập nhật cây gia phả');
    }
});

// Xóa cây gia phả
router.delete('/family-trees/:treeId', async (req, res) => {
    try {
        const { treeId } = req.params;
        await database.deleteFamilyTree(parseInt(treeId));
        res.json({ success: true, message: 'Đã xóa cây gia phả thành công' });
    } catch (err) {
        handleError(res, err, 'Lỗi xóa cây gia phả');
    }
});

// ==================== UC-04, UC-05, UC-06, UC-07, UC-08: THÀNH VIÊN ====================

// UC-03: Lấy danh sách thành viên của một cây
router.get('/family-trees/:treeId/members', async (req, res) => {
    try {
        const { treeId } = req.params;
        const members = await database.getMembersByTree(parseInt(treeId));
        res.json({ success: true, members });
    } catch (err) {
        handleError(res, err, 'Lỗi lấy danh sách thành viên');
    }
});

// UC-04: Xem chi tiết thành viên
router.get('/members/:memberId', async (req, res) => {
    try {
        const { memberId } = req.params;
        const member = await database.getMemberById(parseInt(memberId));
        
        if (!member) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy thành viên' });
        }

        // Lấy thông tin quan hệ gia đình
        const sql = require('mssql');
        
        const marriages = await database.pool.request()
            .input('memberId', sql.Int, parseInt(memberId))
            .query(`
                SELECT 
                    CASE 
                        WHEN MaNguoiChong = @memberId THEN MaNguoiVo
                        ELSE MaNguoiChong
                    END AS PartnerId,
                    tv.HoVaTen AS PartnerName
                FROM HonNhan hn
                INNER JOIN ThanhVien tv ON (
                    CASE 
                        WHEN hn.MaNguoiChong = @memberId THEN hn.MaNguoiVo
                        ELSE hn.MaNguoiChong
                    END = tv.MaThanhVien
                )
                WHERE MaNguoiChong = @memberId OR MaNguoiVo = @memberId
            `);

        const parents = await database.pool.request()
            .input('memberId', sql.Int, parseInt(memberId))
            .query(`
                SELECT qh.MaChaMe AS ParentId, qh.LoaiQuanHe, tv.HoVaTen AS ParentName
                FROM QuanHeChaMeCon qh
                INNER JOIN ThanhVien tv ON qh.MaChaMe = tv.MaThanhVien
                WHERE qh.MaCon = @memberId
            `);

        const children = await database.pool.request()
            .input('memberId', sql.Int, parseInt(memberId))
            .query(`
                SELECT qh.MaCon AS ChildId, qh.LoaiQuanHe, tv.HoVaTen AS ChildName, tv.GioiTinh
                FROM QuanHeChaMeCon qh
                INNER JOIN ThanhVien tv ON qh.MaCon = tv.MaThanhVien
                WHERE qh.MaChaMe = @memberId
            `);

        // Format dữ liệu
        const memberDetail = {
            id: member.MaThanhVien,
            name: member.HoVaTen,
            gender: member.GioiTinh,
            dob: member.NgaySinh ? new Date(member.NgaySinh).getUTCFullYear().toString() : '',
            dobFull: member.NgaySinh,
            dod: member.NgayMat ? new Date(member.NgayMat).getUTCFullYear().toString() : '',
            dodFull: member.NgayMat,
            img: member.AnhDaiDienURL,
            tieuSu: member.TieuSu || '',
            family: {
                partners: marriages.recordset,
                parents: parents.recordset,
                children: children.recordset
            }
        };

        res.json({ success: true, member: memberDetail });
    } catch (err) {
        handleError(res, err, 'Lỗi lấy thông tin thành viên');
    }
});

// UC-08: Tìm kiếm thành viên
router.get('/family-trees/:treeId/search', async (req, res) => {
    try {
        const { treeId } = req.params;
        const { q } = req.query;
        
        console.log('🔍 Search request - treeId:', treeId, 'query:', q);
        
        if (!q || q.trim() === '') {
            console.log('⚠️ Empty query, returning empty results');
            return res.json({ success: true, members: [] });
        }

        const searchQuery = q.trim();
        console.log('🔍 Searching with query:', searchQuery);
        
        const members = await database.searchMembers(parseInt(treeId), searchQuery);
        
        console.log('📊 Found members:', members.length);
        
        // Transform dữ liệu từ format database sang format frontend
        const transformedMembers = members.map(m => ({
            id: m.MaThanhVien,
            MaThanhVien: m.MaThanhVien,
            name: m.HoVaTen,
            HoVaTen: m.HoVaTen,
            gender: m.GioiTinh === 'Nam' || m.GioiTinh === 'male' ? 'male' : 'female',
            GioiTinh: m.GioiTinh,
            dob: m.NgaySinh ? new Date(m.NgaySinh).getUTCFullYear().toString() : '',
            NgaySinh: m.NgaySinh,
            dod: m.NgayMat ? new Date(m.NgayMat).getUTCFullYear().toString() : '',
            NgayMat: m.NgayMat,
            img: m.AnhDaiDienURL || '',
            AnhDaiDienURL: m.AnhDaiDienURL || ''
        }));
        
        console.log('✅ Returning', transformedMembers.length, 'members');
        res.json({ success: true, members: transformedMembers });
    } catch (err) {
        console.error('❌ Backend search error:', err);
        handleError(res, err, 'Lỗi tìm kiếm thành viên');
    }
});

// UC-05: Thêm thành viên mới
router.post('/family-trees/:treeId/members', async (req, res) => {
    try {
        const { treeId } = req.params;
        const memberData = { ...req.body, treeId: parseInt(treeId) };
        
        // Validation
        if (!memberData.name || !memberData.gender) {
            return res.json({ 
                success: false, 
                message: 'Họ và tên, giới tính là bắt buộc' 
            });
        }

        // Tạo thành viên mới
        const newMemberId = await database.createMember(memberData);
        
        // Xử lý quan hệ hôn nhân nếu có (pids)
        if (memberData.pids && Array.isArray(memberData.pids) && memberData.pids.length > 0) {
            for (const pid of memberData.pids) {
                await database.createMarriage({
                    husbandId: memberData.gender === 'male' ? newMemberId : pid,
                    wifeId: memberData.gender === 'female' ? newMemberId : pid
                });
            }
        }
        
        // Xử lý quan hệ cha - con (hỗ trợ nhiều cha)
        if (memberData.allFathers && Array.isArray(memberData.allFathers)) {
            // Tạo quan hệ cho tất cả các cha
            for (const father of memberData.allFathers) {
                await database.createParentChildRelation({
                    parentId: father.id,
                    childId: newMemberId,
                    relationType: father.relationType || 'Cha ruột'
                });
            }
        } else if (memberData.fid) {
            // Fallback: nếu không có allFathers, dùng fid (tương thích ngược)
            await database.createParentChildRelation({
                parentId: memberData.fid,
                childId: newMemberId,
                relationType: memberData.relationTypeFather || 'Cha ruột'
            });
        }
        
        // Xử lý quan hệ mẹ - con (hỗ trợ nhiều mẹ)
        if (memberData.allMothers && Array.isArray(memberData.allMothers)) {
            // Tạo quan hệ cho tất cả các mẹ
            for (const mother of memberData.allMothers) {
                await database.createParentChildRelation({
                    parentId: mother.id,
                    childId: newMemberId,
                    relationType: mother.relationType || 'Mẹ ruột'
                });
            }
        } else if (memberData.mid) {
            // Fallback: nếu không có allMothers, dùng mid (tương thích ngược)
            await database.createParentChildRelation({
                parentId: memberData.mid,
                childId: newMemberId,
                relationType: memberData.relationTypeMother || 'Mẹ ruột'
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Thêm thành viên thành công',
            memberId: newMemberId 
        });
    } catch (err) {
        handleError(res, err, 'Lỗi thêm thành viên');
    }
});

// UC-06: Sửa thông tin thành viên
router.put('/members/:memberId', async (req, res) => {
    try {
        const { memberId } = req.params;
        const memberData = req.body;
        
        // Validation
        if (!memberData.name || !memberData.gender) {
            return res.json({ 
                success: false, 
                message: 'Họ và tên, giới tính là bắt buộc' 
            });
        }

        // Cập nhật thông tin cơ bản
        await database.updateMember(parseInt(memberId), memberData);

        // CẬP NHẬT quan hệ cha mẹ nếu request body có fid, mid, allFathers hoặc allMothers
        // QUAN TRỌNG: Nếu có allFathers hoặc allMothers (kể cả mảng rỗng), sẽ xóa tất cả quan hệ cũ và tạo lại
        const shouldUpdateParents = memberData.hasOwnProperty('fid') || memberData.hasOwnProperty('mid') || 
            memberData.hasOwnProperty('allFathers') || memberData.hasOwnProperty('allMothers');
            
        if (shouldUpdateParents) {
            // Xóa quan hệ cũ trước
            await database.pool.request()
                .input('memberId', sql.Int, parseInt(memberId))
                .query('DELETE FROM QuanHeChaMeCon WHERE MaCon = @memberId');
                
            // Thêm quan hệ mới (hỗ trợ nhiều cha mẹ)
            // Ưu tiên sử dụng allFathers/allMothers nếu có
            if (memberData.hasOwnProperty('allFathers')) {
                // Có allFathers trong request (có thể là mảng rỗng)
                if (Array.isArray(memberData.allFathers) && memberData.allFathers.length > 0) {
                    // Tạo quan hệ cho tất cả các cha
                    for (const father of memberData.allFathers) {
                        if (father && father.id) {
                            await database.createParentChildRelation({
                                parentId: father.id,
                                childId: parseInt(memberId),
                                relationType: father.relationType || 'Cha ruột'
                            });
                        }
                    }
                }
                // Nếu allFathers là mảng rỗng, không tạo quan hệ nào (đã xóa ở trên)
            } else if (memberData.fid) {
                // Fallback: nếu không có allFathers, dùng fid (tương thích ngược)
                await database.createParentChildRelation({
                    parentId: memberData.fid,
                    childId: parseInt(memberId),
                    relationType: memberData.relationTypeFather || 'Cha ruột'
                });
            }
            
            if (memberData.hasOwnProperty('allMothers')) {
                // Có allMothers trong request (có thể là mảng rỗng)
                if (Array.isArray(memberData.allMothers) && memberData.allMothers.length > 0) {
                    // Tạo quan hệ cho tất cả các mẹ
                    for (const mother of memberData.allMothers) {
                        if (mother && mother.id) {
                            await database.createParentChildRelation({
                                parentId: mother.id,
                                childId: parseInt(memberId),
                                relationType: mother.relationType || 'Mẹ ruột'
                            });
                        }
                    }
                }
                // Nếu allMothers là mảng rỗng, không tạo quan hệ nào (đã xóa ở trên)
            } else if (memberData.mid) {
                // Fallback: nếu không có allMothers, dùng mid (tương thích ngược)
                await database.createParentChildRelation({
                    parentId: memberData.mid,
                    childId: parseInt(memberId),
                    relationType: memberData.relationTypeMother || 'Mẹ ruột'
                });
            }
        }

        // Xử lý quan hệ hôn nhân nếu có
        if (memberData.hasOwnProperty('maritalStatus') || memberData.hasOwnProperty('pids') || memberData.hasOwnProperty('spouseId')) {
            // Lấy spouse hiện tại TRƯỚC KHI xóa để xóa quan hệ ở phía spouse
            let oldSpouseId = null;
            try {
                // Lấy quan hệ hôn nhân hiện tại từ bảng HonNhan
                const currentMarriage = await database.pool.request()
                    .input('memberId', sql.Int, parseInt(memberId))
                    .query(`
                        SELECT 
                            CASE 
                                WHEN MaNguoiChong = @memberId THEN MaNguoiVo
                                ELSE MaNguoiChong
                            END AS PartnerId
                        FROM HonNhan
                        WHERE MaNguoiChong = @memberId OR MaNguoiVo = @memberId
                    `);
                
                if (currentMarriage.recordset && currentMarriage.recordset.length > 0) {
                    oldSpouseId = currentMarriage.recordset[0].PartnerId;
                }
            } catch (err) {
                console.error('Error getting current spouse:', err);
            }
            
            // Xóa quan hệ hôn nhân cũ (cả 2 phía - xóa tất cả quan hệ liên quan đến member này)
            await database.pool.request()
                .input('memberId', sql.Int, parseInt(memberId))
                .query('DELETE FROM HonNhan WHERE MaNguoiChong = @memberId OR MaNguoiVo = @memberId');
            
            // Xóa quan hệ ở phía spouse (nếu có) - vì một quan hệ hôn nhân có 2 bản ghi nếu cùng một cặp
            // Nhưng thực tế một cặp chỉ có 1 bản ghi trong HonNhan, nên query trên đã xóa rồi
            
            // Thêm quan hệ hôn nhân mới nếu là "Đã kết hôn"
            if (memberData.maritalStatus === 'married' && (memberData.spouseId || (memberData.pids && memberData.pids.length > 0))) {
                const spouseId = memberData.spouseId || (memberData.pids && memberData.pids[0]);
                if (spouseId) {
                    const husbandId = memberData.gender === 'male' ? parseInt(memberId) : parseInt(spouseId);
                    const wifeId = memberData.gender === 'female' ? parseInt(memberId) : parseInt(spouseId);
                    
                    await database.createMarriage({
                        husbandId: husbandId,
                        wifeId: wifeId,
                        status: 'Đang kết hôn'
                    });
                }
            } else {
                // Nếu không còn quan hệ hôn nhân (single hoặc pids rỗng)
                // Đã xóa ở trên, không cần làm gì thêm
                // Nhưng cần xóa ở phía spouse nếu spouse vẫn còn quan hệ trong HonNhan
                if (oldSpouseId) {
                    // Xóa quan hệ ở phía spouse (trường hợp spouse chưa được update)
                    await database.pool.request()
                        .input('spouseId', sql.Int, oldSpouseId)
                        .input('memberId', sql.Int, parseInt(memberId))
                        .query(`
                            DELETE FROM HonNhan 
                            WHERE (MaNguoiChong = @spouseId AND MaNguoiVo = @memberId)
                               OR (MaNguoiVo = @spouseId AND MaNguoiChong = @memberId)
                        `);
                }
            }
        }

        res.json({ 
            success: true, 
            message: 'Cập nhật thành viên thành công' 
        });
    } catch (err) {
        handleError(res, err, 'Lỗi cập nhật thành viên');
    }
});
                
// UC-07: Xóa thành viên
router.delete('/members/:memberId', async (req, res) => {
    try {
        const { memberId } = req.params;
        
        // Kiểm tra xem thành viên có tồn tại không
        const member = await database.getMemberById(parseInt(memberId));
        if (!member) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy thành viên' });
        }

        await database.deleteMember(parseInt(memberId));
        res.json({ 
            success: true, 
            message: 'Đã xóa thành viên thành công' 
        });
    } catch (err) {
        handleError(res, err, 'Lỗi xóa thành viên');
    }
});

// ==================== UC-10: QUẢN TRỊ (ADMIN) ====================

// Lấy danh sách tất cả người dùng
router.get('/admin/users', async (req, res) => {
    try {
        const users = await database.getAllUsers();
        res.json({ success: true, users });
    } catch (err) {
        handleError(res, err, 'Lỗi lấy danh sách người dùng');
    }
});

// Cập nhật trạng thái người dùng (Vô hiệu hóa/Kích hoạt)
router.put('/admin/users/:userId/status', async (req, res) => {
    try {
        const { userId } = req.params;
        const { active } = req.body;
        
        if (active === undefined) {
            return res.json({ 
                success: false, 
                message: 'Trạng thái là bắt buộc' 
            });
        }
        
        await database.updateUserStatus(parseInt(userId), active);
        res.json({ 
            success: true, 
            message: `Đã ${active ? 'kích hoạt' : 'vô hiệu hóa'} tài khoản thành công` 
        });
    } catch (err) {
        handleError(res, err, 'Lỗi cập nhật trạng thái người dùng');
    }
});

// ==================== API TIỆN ÍCH ====================

// Health check
router.get('/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'API đang hoạt động',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
