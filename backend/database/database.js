const sql = require('mssql');

const config = {
    server: 'localhost',
    database: 'FamilyTreeDB',
    user: 'sa',
    password: '123',
    options: {
        enableArithAbort: true,
        trustServerCertificate: true
    }
};

class Database {
    constructor() {
        this.pool = null;
    }

    async connect() {
        try {
            this.pool = await sql.connect(config);
            return this.pool;
        } catch (err) {
            console.error('Lỗi kết nối database:', err);
            throw err;
        }
    }

    async disconnect() {
        try {
            if (this.pool) {
                await this.pool.close();
            }
        } catch (err) {
            console.error('Lỗi đóng kết nối:', err);
        }
    }

    // ==================== NGƯỜI DÙNG ====================
    
    // UC-02: Đăng nhập - Lấy người dùng theo username
    async getUserByUsername(username) {
        try {
            const result = await this.pool.request()
                .input('username', sql.NVarChar, username)
                .query('SELECT * FROM NguoiDung WHERE TenDangNhap = @username');
            
            return result.recordset[0] || null;
        } catch (err) {
            console.error('Lỗi get user:', err);
            throw err;
        }
    }

    // UC-01: Đăng ký - Kiểm tra email đã tồn tại
    async getUserByEmail(email) {
        try {
            const result = await this.pool.request()
                .input('email', sql.NVarChar, email)
                .query('SELECT * FROM NguoiDung WHERE Email = @email');
            
            return result.recordset[0] || null;
        } catch (err) {
            console.error('Lỗi get user by email:', err);
            throw err;
        }
    }

    // UC-01: Đăng ký - Tạo người dùng mới
    async createUser(userData) {
        try {
            // Kiểm tra email đã tồn tại chưa
            const existingEmail = await this.getUserByEmail(userData.email);
            if (existingEmail) {
                throw new Error('Email đã được sử dụng');
            }

            const result = await this.pool.request()
                .input('username', sql.NVarChar, userData.username)
                .input('email', sql.NVarChar, userData.email)
                .input('password', sql.NVarChar, userData.password)
                .input('isAdmin', sql.Bit, userData.isAdmin || false)
                .query(`
                    INSERT INTO NguoiDung (TenDangNhap, Email, MatKhau, LaQuanTri, TrangThaiHoatDong)
                    OUTPUT INSERTED.MaNguoiDung, INSERTED.TenDangNhap, INSERTED.Email, INSERTED.LaQuanTri
                    VALUES (@username, @email, @password, @isAdmin, 1)
                `);
            
            return result.recordset[0];
        } catch (err) {
            console.error('Lỗi create user:', err);
            throw err;
        }
    }

    // UC-10: Quản lý người dùng (Admin) - Lấy tất cả người dùng
    async getAllUsers() {
        try {
            const result = await this.pool.request()
                .query('SELECT MaNguoiDung, TenDangNhap, Email, NgayTao, TrangThaiHoatDong, LaQuanTri FROM NguoiDung ORDER BY NgayTao DESC');
            
            return result.recordset;
        } catch (err) {
            console.error('Lỗi get all users:', err);
            throw err;
        }
    }

    // UC-10: Quản lý người dùng (Admin) - Cập nhật trạng thái
    async updateUserStatus(userId, status) {
        try {
            await this.pool.request()
                .input('userId', sql.Int, userId)
                .input('status', sql.Bit, status)
                .query('UPDATE NguoiDung SET TrangThaiHoatDong = @status WHERE MaNguoiDung = @userId');
            
            return true;
        } catch (err) {
            console.error('Lỗi update user status:', err);
            throw err;
        }
    }

    // ==================== CÂY GIA PHẢ (DÒNG HỌ) ====================
    
    // UC-03: Xem Cây Gia Phả - Lấy danh sách cây gia phả của user
    async getFamilyTreesByUser(userId) {
        try {
            const result = await this.pool.request()
                .input('userId', sql.Int, userId)
                .query('SELECT * FROM DongHo WHERE MaNguoiQuanLy = @userId ORDER BY MaDongHo DESC');
            
            return result.recordset;
        } catch (err) {
            console.error('Lỗi get family trees:', err);
            throw err;
        }
    }

    // Lấy thông tin chi tiết 1 cây gia phả
    async getFamilyTreeById(treeId) {
        try {
            const result = await this.pool.request()
                .input('treeId', sql.Int, treeId)
                .query('SELECT * FROM DongHo WHERE MaDongHo = @treeId');
            
            return result.recordset[0] || null;
        } catch (err) {
            console.error('Lỗi get family tree by id:', err);
            throw err;
        }
    }

    // UC-09: Tạo Cây Gia Phả Mới
    async createFamilyTree(treeData) {
        try {
            const result = await this.pool.request()
                .input('userId', sql.Int, treeData.userId)
                .input('name', sql.NVarChar, treeData.name)
                .input('origin', sql.NVarChar, treeData.origin || null)
                .input('branch', sql.NVarChar, treeData.branch || null)
                .input('description', sql.NVarChar, treeData.description || null)
                .query(`
                    INSERT INTO DongHo (MaNguoiQuanLy, TenDongHo, NoiBatNguon, TenChi, GhiChu)
                    OUTPUT INSERTED.MaDongHo, INSERTED.TenDongHo, INSERTED.NoiBatNguon, INSERTED.TenChi, INSERTED.GhiChu
                    VALUES (@userId, @name, @origin, @branch, @description)
                `);
            
            return result.recordset[0];
        } catch (err) {
            console.error('Lỗi create family tree:', err);
            throw err;
        }
    }

    // Cập nhật thông tin cây gia phả
    async updateFamilyTree(treeId, treeData) {
        try {
            await this.pool.request()
                .input('treeId', sql.Int, treeId)
                .input('name', sql.NVarChar, treeData.name)
                .input('origin', sql.NVarChar, treeData.origin || null)
                .input('branch', sql.NVarChar, treeData.branch || null)
                .input('description', sql.NVarChar, treeData.description || null)
                .query(`
                    UPDATE DongHo 
                    SET TenDongHo = @name, NoiBatNguon = @origin, TenChi = @branch, GhiChu = @description
                    WHERE MaDongHo = @treeId
                `);
            
            return true;
        } catch (err) {
            console.error('Lỗi update family tree:', err);
            throw err;
        }
    }

    // Xóa cây gia phả
    async deleteFamilyTree(treeId) {
        try {
            // Xóa các quan hệ cha mẹ - con trước
            await this.pool.request()
                .input('treeId', sql.Int, treeId)
                .query(`
                    DELETE FROM QuanHeChaMeCon 
                    WHERE MaCon IN (SELECT MaThanhVien FROM ThanhVien WHERE MaDongHo = @treeId)
                    OR MaChaMe IN (SELECT MaThanhVien FROM ThanhVien WHERE MaDongHo = @treeId)
                `);

            // Xóa quan hệ hôn nhân
            await this.pool.request()
                .input('treeId', sql.Int, treeId)
                .query(`
                    DELETE FROM HonNhan 
                    WHERE MaNguoiChong IN (SELECT MaThanhVien FROM ThanhVien WHERE MaDongHo = @treeId)
                    OR MaNguoiVo IN (SELECT MaThanhVien FROM ThanhVien WHERE MaDongHo = @treeId)
                `);

            // Xóa thành viên
            await this.pool.request()
                .input('treeId', sql.Int, treeId)
                .query('DELETE FROM ThanhVien WHERE MaDongHo = @treeId');

            // Xóa cây gia phả
            await this.pool.request()
                .input('treeId', sql.Int, treeId)
                .query('DELETE FROM DongHo WHERE MaDongHo = @treeId');
            
            return true;
        } catch (err) {
            console.error('Lỗi delete family tree:', err);
            throw err;
        }
    }

    // ==================== THÀNH VIÊN ====================
    
    // UC-03: Xem Cây Gia Phả - Lấy tất cả thành viên của một cây
    async getMembersByTree(treeId) {
        try {
            const result = await this.pool.request()
                .input('treeId', sql.Int, treeId)
                .query('SELECT * FROM ThanhVien WHERE MaDongHo = @treeId ORDER BY MaThanhVien');
            
            return result.recordset;
        } catch (err) {
            console.error('Lỗi get members:', err);
            throw err;
        }
    }

    // UC-04: Xem Chi Tiết Thành Viên - Lấy thông tin 1 thành viên
    async getMemberById(memberId) {
        try {
            const result = await this.pool.request()
                .input('memberId', sql.Int, memberId)
                .query('SELECT * FROM ThanhVien WHERE MaThanhVien = @memberId');
            
            return result.recordset[0] || null;
        } catch (err) {
            console.error('Lỗi get member by id:', err);
            throw err;
        }
    }

    // UC-08: Tìm Kiếm Thành Viên
    async searchMembers(treeId, searchQuery) {
        try {
            console.log('Database search - treeId:', treeId, 'query:', searchQuery);
            
            // Không convert sang lowercase ngay, để SQL Server tự xử lý với COLLATE
            const searchTrimmed = searchQuery.trim();
            const searchPattern = `%${searchTrimmed}%`;
            
            console.log('Search pattern:', searchPattern);
            console.log('Search original:', searchTrimmed);
            
            // Thử nhiều cách để đảm bảo tìm được
            // Cách 1: Dùng LIKE với COLLATE Vietnamese_CI_AS (case-insensitive)
            let result;
            try {
                result = await this.pool.request()
                    .input('treeId', sql.Int, treeId)
                    .input('searchPattern', sql.NVarChar, searchPattern)
                    .query(`
                        SELECT MaThanhVien, HoVaTen, GioiTinh, NgaySinh, NgayMat, AnhDaiDienURL
                        FROM ThanhVien 
                        WHERE MaDongHo = @treeId 
                        AND HoVaTen COLLATE Vietnamese_CI_AS LIKE @searchPattern COLLATE Vietnamese_CI_AS
                        ORDER BY HoVaTen
                    `);
                console.log('COLLATE result:', result.recordset ? result.recordset.length : 0, 'members');
            } catch (collateError) {
                console.log('COLLATE not supported, trying CHARINDEX...');
                // Cách 2: CHARINDEX với cả uppercase và lowercase
                const searchLower = searchTrimmed.toLowerCase();
                const searchUpper = searchTrimmed.toUpperCase();
                result = await this.pool.request()
                    .input('treeId', sql.Int, treeId)
                    .input('searchLower', sql.NVarChar, searchLower)
                    .input('searchUpper', sql.NVarChar, searchUpper)
                    .query(`
                        SELECT MaThanhVien, HoVaTen, GioiTinh, NgaySinh, NgayMat, AnhDaiDienURL
                        FROM ThanhVien 
                        WHERE MaDongHo = @treeId 
                        AND (
                            CHARINDEX(@searchLower, LOWER(HoVaTen)) > 0
                            OR CHARINDEX(@searchUpper, UPPER(HoVaTen)) > 0
                            OR CHARINDEX(@searchLower, HoVaTen) > 0
                            OR CHARINDEX(@searchUpper, HoVaTen) > 0
                        )
                        ORDER BY HoVaTen
                    `);
                console.log('CHARINDEX result:', result.recordset ? result.recordset.length : 0, 'members');
            }
            
            // Nếu không có kết quả, thử với LIKE đơn giản (không COLLATE)
            if (!result.recordset || result.recordset.length === 0) {
                console.log('No results, trying simple LIKE...');
                const likeResult = await this.pool.request()
                    .input('treeId', sql.Int, treeId)
                    .input('searchPattern', sql.NVarChar, searchPattern)
                    .query(`
                        SELECT MaThanhVien, HoVaTen, GioiTinh, NgaySinh, NgayMat, AnhDaiDienURL
                        FROM ThanhVien 
                        WHERE MaDongHo = @treeId 
                        AND HoVaTen LIKE @searchPattern
                        ORDER BY HoVaTen
                    `);
                console.log('Simple LIKE result:', likeResult.recordset ? likeResult.recordset.length : 0, 'members');
                
                if (likeResult.recordset && likeResult.recordset.length > 0) {
                    result = likeResult;
                }
            }
            
            // Nếu vẫn không có, thử với LOWER
            if (!result.recordset || result.recordset.length === 0) {
                console.log('No results, trying LOWER LIKE...');
                const searchLower = searchTrimmed.toLowerCase();
                const searchPatternLower = `%${searchLower}%`;
                const lowerResult = await this.pool.request()
                    .input('treeId', sql.Int, treeId)
                    .input('searchPatternLower', sql.NVarChar, searchPatternLower)
                    .query(`
                        SELECT MaThanhVien, HoVaTen, GioiTinh, NgaySinh, NgayMat, AnhDaiDienURL
                        FROM ThanhVien 
                        WHERE MaDongHo = @treeId 
                        AND LOWER(HoVaTen) LIKE @searchPatternLower
                        ORDER BY HoVaTen
                    `);
                console.log('LOWER LIKE result:', lowerResult.recordset ? lowerResult.recordset.length : 0, 'members');
                
                if (lowerResult.recordset && lowerResult.recordset.length > 0) {
                    result = lowerResult;
                }
            }
            
            console.log('Final result:', result.recordset ? result.recordset.length : 0, 'members');
            if (result.recordset && result.recordset.length > 0) {
                console.log('Found names:', result.recordset.map(r => r.HoVaTen).join(', '));
            }
            
            return result.recordset || [];
        } catch (err) {
            console.error('Database search error:', err);
            console.error('Error details:', err.message);
            throw err;
        }
    }

    // UC-05: Thêm Thành Viên
    async createMember(memberData) {
        try {
            // Xử lý ngày tháng
            let dobDate = null;
            let dodDate = null;
            
            if (memberData.dob) {
                if (memberData.dob.match(/^\d{4}$/)) {
                    // Sử dụng Date.UTC để tránh timezone offset
                    dobDate = new Date(Date.UTC(parseInt(memberData.dob), 0, 1));
                } else {
                    dobDate = new Date(memberData.dob);
        }
    }

            if (memberData.dod) {
                if (memberData.dod.match(/^\d{4}$/)) {
                    // Sử dụng Date.UTC để tránh timezone offset
                    dodDate = new Date(Date.UTC(parseInt(memberData.dod), 0, 1));
                } else {
                    dodDate = new Date(memberData.dod);
                }
            }

        const result = await this.pool.request()
            .input('treeId', sql.Int, memberData.treeId)
            .input('name', sql.NVarChar, memberData.name)
            .input('gender', sql.NVarChar, memberData.gender)
                .input('dob', sql.Date, dobDate)
                .input('dod', sql.Date, dodDate)
                .input('img', sql.NVarChar, memberData.img || null)
            .input('tieuSu', sql.NVarChar, memberData.tieuSu || null)
            .query(`
                INSERT INTO ThanhVien (MaDongHo, HoVaTen, GioiTinh, NgaySinh, NgayMat, AnhDaiDienURL, TieuSu)
                OUTPUT INSERTED.MaThanhVien
                VALUES (@treeId, @name, @gender, @dob, @dod, @img, @tieuSu)
            `);
        
        return result.recordset[0].MaThanhVien;
    } catch (err) {
        console.error('Lỗi create member:', err);
        throw err;
    }
}

    // UC-06: Sửa thông tin thành viên
async updateMember(memberId, memberData) {
    try {
        let dobDate = null;
        let dodDate = null;
        
        if (memberData.dob) {
            if (memberData.dob.match(/^\d{4}$/)) {
                    // Sử dụng Date.UTC để tránh timezone offset
                    dobDate = new Date(Date.UTC(parseInt(memberData.dob), 0, 1));
            } else {
                dobDate = new Date(memberData.dob);
            }
        }
        
        if (memberData.dod) {
            if (memberData.dod.match(/^\d{4}$/)) {
                    // Sử dụng Date.UTC để tránh timezone offset
                    dodDate = new Date(Date.UTC(parseInt(memberData.dod), 0, 1));
            } else {
                dodDate = new Date(memberData.dod);
            }
        }

        await this.pool.request()
            .input('memberId', sql.Int, memberId)
            .input('name', sql.NVarChar, memberData.name)
            .input('gender', sql.NVarChar, memberData.gender)
            .input('dob', sql.Date, dobDate)
            .input('dod', sql.Date, dodDate)
                .input('img', sql.NVarChar, memberData.img || null)
            .input('tieuSu', sql.NVarChar, memberData.tieuSu || null)
            .query(`
                UPDATE ThanhVien 
                SET HoVaTen = @name, GioiTinh = @gender, NgaySinh = @dob, NgayMat = @dod, 
                    AnhDaiDienURL = @img, TieuSu = @tieuSu
                WHERE MaThanhVien = @memberId
            `);
        
        return true;
    } catch (err) {
        console.error('Lỗi update member:', err);
        throw err;
    }
}

    // UC-07: Xóa thành viên
    async deleteMember(memberId) {
        try {
            // Xóa quan hệ cha mẹ - con
            await this.pool.request()
                .input('memberId', sql.Int, memberId)
                .query('DELETE FROM QuanHeChaMeCon WHERE MaCon = @memberId OR MaChaMe = @memberId');

            // Xóa quan hệ hôn nhân
            await this.pool.request()
                .input('memberId', sql.Int, memberId)
                .query('DELETE FROM HonNhan WHERE MaNguoiChong = @memberId OR MaNguoiVo = @memberId');

            // Xóa thành viên
            await this.pool.request()
                .input('memberId', sql.Int, memberId)
                .query('DELETE FROM ThanhVien WHERE MaThanhVien = @memberId');
            
            return true;
        } catch (err) {
            console.error('Lỗi delete member:', err);
            throw err;
        }
    }

    // ==================== QUAN HỆ HÔN NHÂN ====================
    
    async getMarriagesByTree(treeId) {
        try {
            const result = await this.pool.request()
                .input('treeId', sql.Int, treeId)
                .query(`
                    SELECT hn.* 
                    FROM HonNhan hn
                    INNER JOIN ThanhVien tv1 ON hn.MaNguoiChong = tv1.MaThanhVien
                    INNER JOIN ThanhVien tv2 ON hn.MaNguoiVo = tv2.MaThanhVien
                    WHERE tv1.MaDongHo = @treeId AND tv2.MaDongHo = @treeId
                `);
            
            return result.recordset;
        } catch (err) {
            console.error('Lỗi get marriages:', err);
            throw err;
        }
    }

    async createMarriage(marriageData) {
        try {
            // Kiểm tra xem quan hệ hôn nhân đã tồn tại chưa
            const existingMarriage = await this.pool.request()
                .input('husbandId', sql.Int, marriageData.husbandId)
                .input('wifeId', sql.Int, marriageData.wifeId)
                .query(`
                    SELECT * FROM HonNhan 
                    WHERE MaNguoiChong = @husbandId AND MaNguoiVo = @wifeId
                `);

            if (existingMarriage.recordset.length > 0) {
                return true; // Đã tồn tại, không cần tạo nữa
            }

            await this.pool.request()
                .input('husbandId', sql.Int, marriageData.husbandId)
                .input('wifeId', sql.Int, marriageData.wifeId)
                .input('status', sql.NVarChar, marriageData.status || 'Đang kết hôn')
                .query(`
                    INSERT INTO HonNhan (MaNguoiChong, MaNguoiVo, TrangThai)
                    VALUES (@husbandId, @wifeId, @status)
                `);
            
            return true;
        } catch (err) {
            console.error('Lỗi create marriage:', err);
            throw err;
        }
    }

    // ==================== QUAN HỆ CHA MẸ - CON ====================
    
    async getParentChildRelationsByTree(treeId) {
        try {
            const result = await this.pool.request()
                .input('treeId', sql.Int, treeId)
                .query(`
                    SELECT qhcc.* 
                    FROM QuanHeChaMeCon qhcc
                    INNER JOIN ThanhVien tv ON qhcc.MaCon = tv.MaThanhVien
                    WHERE tv.MaDongHo = @treeId
                `);
            
            return result.recordset;
        } catch (err) {
            console.error('Lỗi get parent-child relations:', err);
            throw err;
        }
    }

    async createParentChildRelation(relationData) {
        try {
            // Kiểm tra quan hệ đã tồn tại chưa
            const existingRelation = await this.pool.request()
                .input('parentId', sql.Int, relationData.parentId)
                .input('childId', sql.Int, relationData.childId)
                .input('relationType', sql.NVarChar, relationData.relationType)
                .query(`
                    SELECT * FROM QuanHeChaMeCon 
                    WHERE MaChaMe = @parentId AND MaCon = @childId AND LoaiQuanHe = @relationType
                `);

            if (existingRelation.recordset.length > 0) {
                return true; // Đã tồn tại
            }

            await this.pool.request()
                .input('parentId', sql.Int, relationData.parentId)
                .input('childId', sql.Int, relationData.childId)
                .input('relationType', sql.NVarChar, relationData.relationType)
                .query(`
                    INSERT INTO QuanHeChaMeCon (MaChaMe, MaCon, LoaiQuanHe)
                    VALUES (@parentId, @childId, @relationType)
                `);
            
            return true;
        } catch (err) {
            console.error('Lỗi create parent-child relation:', err);
            throw err;
        }
    }

    async deleteParentChildRelation(parentId, childId) {
        try {
            await this.pool.request()
                .input('parentId', sql.Int, parentId)
                .input('childId', sql.Int, childId)
                .query('DELETE FROM QuanHeChaMeCon WHERE MaChaMe = @parentId AND MaCon = @childId');
            
            return true;
        } catch (err) {
            console.error('Lỗi delete parent-child relation:', err);
            throw err;
        }
    }

    // ==================== HÀM TIỆN ÍCH ====================
    
    // Chuyển đổi dữ liệu từ DB sang format frontend (cho thư viện FamilyTree.js)
    transformToFrontendFormat(treeData, members, marriages, parentChildRelations) {
        const familyTree = {
            id: treeData.MaDongHo,
            name: treeData.TenDongHo,
            origin: treeData.NoiBatNguon,
            branch: treeData.TenChi,
            description: treeData.GhiChu,
            members: []
        };

        // Tạo map cho quan hệ hôn nhân (pids)
        const partnerMap = new Map();
        marriages.forEach(marriage => {
            if (!partnerMap.has(marriage.MaNguoiChong)) {
                partnerMap.set(marriage.MaNguoiChong, []);
            }
            if (!partnerMap.has(marriage.MaNguoiVo)) {
                partnerMap.set(marriage.MaNguoiVo, []);
            }
            partnerMap.get(marriage.MaNguoiChong).push(marriage.MaNguoiVo);
            partnerMap.get(marriage.MaNguoiVo).push(marriage.MaNguoiChong);
        });

        // Tạo map cho quan hệ cha mẹ - con (mid, fid) - chỉ lưu primary parents cho layout
        const parentMap = new Map();
        const relationTypeMap = new Map(); // Lưu loại quan hệ cho primary parents
        const allParentsMap = new Map(); // Lưu TẤT CẢ parents (bao gồm cả nuôi)
        
        parentChildRelations.forEach(relation => {
            if (!parentMap.has(relation.MaCon)) {
                parentMap.set(relation.MaCon, { mid: null, fid: null });
                relationTypeMap.set(relation.MaCon, { motherRelation: null, fatherRelation: null });
                allParentsMap.set(relation.MaCon, []);
            }
            
            // Lưu TẤT CẢ parents vào allParentsMap
            allParentsMap.get(relation.MaCon).push({
                id: relation.MaChaMe,
                relationType: relation.LoaiQuanHe
            });
            
            // Ưu tiên cha mẹ ruột cho cây gia phả (để hiển thị layout) - chỉ lưu vào parentMap
            if (relation.LoaiQuanHe.includes('Mẹ')) {
                // Chỉ set nếu chưa có mẹ, hoặc nếu là mẹ ruột (ưu tiên hơn mẹ nuôi)
                const currentMother = parentMap.get(relation.MaCon).mid;
                const currentMotherRelation = relationTypeMap.get(relation.MaCon).motherRelation;
                if (!currentMother || 
                    (relation.LoaiQuanHe === 'Mẹ ruột' && currentMotherRelation !== 'Mẹ ruột')) {
                    parentMap.get(relation.MaCon).mid = relation.MaChaMe;
                    relationTypeMap.get(relation.MaCon).motherRelation = relation.LoaiQuanHe;
                }
            } else if (relation.LoaiQuanHe.includes('Cha')) {
                // Chỉ set nếu chưa có cha, hoặc nếu là cha ruột (ưu tiên hơn cha nuôi)
                const currentFather = parentMap.get(relation.MaCon).fid;
                const currentFatherRelation = relationTypeMap.get(relation.MaCon).fatherRelation;
                if (!currentFather || 
                    (relation.LoaiQuanHe === 'Cha ruột' && currentFatherRelation !== 'Cha ruột')) {
                    parentMap.get(relation.MaCon).fid = relation.MaChaMe;
                    relationTypeMap.get(relation.MaCon).fatherRelation = relation.LoaiQuanHe;
                }
            }
        });

        // Xây dựng mảng members
        familyTree.members = members.map(member => {
            const formattedMember = {
                id: member.MaThanhVien,
                name: member.HoVaTen,
                gender: member.GioiTinh,
                dob: member.NgaySinh ? new Date(member.NgaySinh).getUTCFullYear().toString() : '',
                dod: member.NgayMat ? new Date(member.NgayMat).getUTCFullYear().toString() : '',
                img: member.AnhDaiDienURL || '',
                tieuSu: member.TieuSu || ''
            };

            // Thêm pids (partner IDs)
            if (partnerMap.has(member.MaThanhVien)) {
                formattedMember.pids = partnerMap.get(member.MaThanhVien);
            }

            // Thêm mid, fid (mother ID, father ID) và loại quan hệ - chỉ primary parents
            if (parentMap.has(member.MaThanhVien)) {
                const parents = parentMap.get(member.MaThanhVien);
                const relations = relationTypeMap.get(member.MaThanhVien);
                
                if (parents.mid) {
                    formattedMember.mid = parents.mid;
                    formattedMember.relationTypeMother = relations.motherRelation;
                }
                if (parents.fid) {
                    formattedMember.fid = parents.fid;
                    formattedMember.relationTypeFather = relations.fatherRelation;
                }
            }
            
            // Thêm TẤT CẢ parents (bao gồm cả nuôi) để render links cho tất cả
            if (allParentsMap.has(member.MaThanhVien)) {
                formattedMember.allParents = allParentsMap.get(member.MaThanhVien);
            }

            return formattedMember;
        });

        return familyTree;
    }
}

module.exports = new Database();
