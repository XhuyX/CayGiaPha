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
            console.log('✅ Kết nối SQL Server thành công!');
            return this.pool;
        } catch (err) {
            console.error('❌ Lỗi kết nối database:', err);
            throw err;
        }
    }

    async disconnect() {
        try {
            if (this.pool) {
                await this.pool.close();
                console.log('✅ Đã đóng kết nối database');
            }
        } catch (err) {
            console.error('❌ Lỗi đóng kết nối:', err);
        }
    }

    // ===== CRUD NGƯỜI DÙNG =====
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

    async createUser(userData) {
        try {
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

    async getAllUsers() {
        try {
            const result = await this.pool.request()
                .query('SELECT MaNguoiDung, TenDangNhap, Email, NgayTao, TrangThaiHoatDong FROM NguoiDung');
            
            return result.recordset;
        } catch (err) {
            console.error('Lỗi get all users:', err);
            throw err;
        }
    }

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

    // ===== CRUD CÂY GIA PHẢ =====
    async getFamilyTreesByUser(userId) {
        try {
            const result = await this.pool.request()
                .input('userId', sql.Int, userId)
                .query('SELECT * FROM DongHo WHERE MaNguoiQuanLy = @userId');
            
            return result.recordset;
        } catch (err) {
            console.error('Lỗi get family trees:', err);
            throw err;
        }
    }

    async createFamilyTree(treeData) {
        try {
            const result = await this.pool.request()
                .input('userId', sql.Int, treeData.userId)
                .input('name', sql.NVarChar, treeData.name)
                .input('origin', sql.NVarChar, treeData.origin)
                .input('branch', sql.NVarChar, treeData.branch)
                .input('description', sql.NVarChar, treeData.description)
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

    async deleteFamilyTree(treeId) {
        try {
            // Xóa các quan hệ trước
            await this.pool.request()
                .input('treeId', sql.Int, treeId)
                .query(`
                    DELETE FROM QuanHeChaMeCon 
                    WHERE MaCon IN (SELECT MaThanhVien FROM ThanhVien WHERE MaDongHo = @treeId)
                    OR MaChaMe IN (SELECT MaThanhVien FROM ThanhVien WHERE MaDongHo = @treeId)
                `);

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

    // ===== CRUD THÀNH VIÊN =====
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

    async createMember(memberData) {
        try {
            const result = await this.pool.request()
                .input('treeId', sql.Int, memberData.treeId)
                .input('name', sql.NVarChar, memberData.name)
                .input('gender', sql.NVarChar, memberData.gender)
                .input('dob', sql.Date, memberData.dob || null)
                .input('dod', sql.Date, memberData.dod || null)
                .input('img', sql.NVarChar, memberData.img)
                .query(`
                    INSERT INTO ThanhVien (MaDongHo, HoVaTen, GioiTinh, NgaySinh, NgayMat, AnhDaiDienURL)
                    OUTPUT INSERTED.MaThanhVien
                    VALUES (@treeId, @name, @gender, @dob, @dod, @img)
                `);
            
            return result.recordset[0].MaThanhVien;
        } catch (err) {
            console.error('Lỗi create member:', err);
            throw err;
        }
    }

    async createMarriage(marriageData) {
        try {
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

    async createParentChildRelation(relationData) {
        try {
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

    async updateMember(memberId, memberData) {
        try {
            await this.pool.request()
                .input('memberId', sql.Int, memberId)
                .input('name', sql.NVarChar, memberData.name)
                .input('gender', sql.NVarChar, memberData.gender)
                .input('dob', sql.Date, memberData.dob || null)
                .input('dod', sql.Date, memberData.dod || null)
                .input('img', sql.NVarChar, memberData.img)
                .query(`
                    UPDATE ThanhVien 
                    SET HoVaTen = @name, GioiTinh = @gender, NgaySinh = @dob, NgayMat = @dod, AnhDaiDienURL = @img
                    WHERE MaThanhVien = @memberId
                `);
            
            return true;
        } catch (err) {
            console.error('Lỗi update member:', err);
            throw err;
        }
    }

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

    // Hàm tiện ích chuyển đổi dữ liệu từ DB sang format frontend
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

        // Tạo map cho quan hệ cha mẹ - con (mid, fid)
        const parentMap = new Map();
        parentChildRelations.forEach(relation => {
            if (!parentMap.has(relation.MaCon)) {
                parentMap.set(relation.MaCon, { mid: null, fid: null });
            }
            
            if (relation.LoaiQuanHe.includes('Mẹ')) {
                parentMap.get(relation.MaCon).mid = relation.MaChaMe;
            } else if (relation.LoaiQuanHe.includes('Cha')) {
                parentMap.get(relation.MaCon).fid = relation.MaChaMe;
            }
        });

        // Xây dựng mảng members
        familyTree.members = members.map(member => {
            const formattedMember = {
                id: member.MaThanhVien,
                name: member.HoVaTen,
                gender: member.GioiTinh,
                dob: member.NgaySinh ? new Date(member.NgaySinh).getFullYear().toString() : '',
                dod: member.NgayMat ? new Date(member.NgayMat).getFullYear().toString() : '',
                img: member.AnhDaiDienURL
            };

            // Thêm pids (partner IDs)
            if (partnerMap.has(member.MaThanhVien)) {
                formattedMember.pids = partnerMap.get(member.MaThanhVien);
            }

            // Thêm mid, fid (mother ID, father ID)
            if (parentMap.has(member.MaThanhVien)) {
                const parents = parentMap.get(member.MaThanhVien);
                if (parents.mid) formattedMember.mid = parents.mid;
                if (parents.fid) formattedMember.fid = parents.fid;
            }

            return formattedMember;
        });

        return familyTree;
    }
}

module.exports = new Database();