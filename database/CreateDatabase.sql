-- Tạo database
CREATE DATABASE FamilyTreeDB;
GO

USE FamilyTreeDB;
GO

-- Bảng NguoiDung
CREATE TABLE NguoiDung (
    MaNguoiDung INT IDENTITY(1,1) PRIMARY KEY,
    TenDangNhap NVARCHAR(50) NOT NULL UNIQUE,
    MatKhau NVARCHAR(255) NOT NULL,
    Email NVARCHAR(100) NOT NULL UNIQUE,
    LaQuanTri BIT NOT NULL DEFAULT 0,
    TrangThaiHoatDong BIT NOT NULL DEFAULT 1,
    NgayTao DATETIME NOT NULL DEFAULT GETDATE()
);
GO

-- Bảng DongHo (Cây gia phả)
CREATE TABLE DongHo (
    MaDongHo INT IDENTITY(1,1) PRIMARY KEY,
    MaNguoiQuanLy INT NOT NULL,
    TenDongHo NVARCHAR(100) NOT NULL,
    NoiBatNguon NVARCHAR(255) NULL,
    TenChi NVARCHAR(100) NULL,
    GhiChu NVARCHAR(MAX) NULL,
    FOREIGN KEY (MaNguoiQuanLy) REFERENCES NguoiDung(MaNguoiDung)
);
GO

-- Bảng ThanhVien
CREATE TABLE ThanhVien (
    MaThanhVien INT IDENTITY(1,1) PRIMARY KEY,
    MaDongHo INT NOT NULL,
    HoVaTen NVARCHAR(100) NOT NULL,
    GioiTinh NVARCHAR(10) NULL CHECK (GioiTinh IN (N'male', N'female')),
    NgaySinh DATE NULL,
    NgayMat DATE NULL,
    NoiSinh NVARCHAR(255) NULL,
    AnhDaiDienURL NVARCHAR(255) NULL,
    TieuSu NVARCHAR(MAX) NULL,
    FOREIGN KEY (MaDongHo) REFERENCES DongHo(MaDongHo)
);
GO

-- Bảng HonNhan
CREATE TABLE HonNhan (
    MaHonNhan INT IDENTITY(1,1) PRIMARY KEY,
    MaNguoiChong INT NOT NULL,
    MaNguoiVo INT NOT NULL,
    NgayBatDau DATE NULL,
    NgayKetThuc DATE NULL,
    TrangThai NVARCHAR(20) NOT NULL CHECK (TrangThai IN (N'Đang kết hôn', N'Đã ly hôn', N'Kết thúc')),
    FOREIGN KEY (MaNguoiChong) REFERENCES ThanhVien(MaThanhVien),
    FOREIGN KEY (MaNguoiVo) REFERENCES ThanhVien(MaThanhVien)
);
GO

-- Bảng QuanHeChaMeCon
CREATE TABLE QuanHeChaMeCon (
    MaQuanHe INT IDENTITY(1,1) PRIMARY KEY,
    MaChaMe INT NOT NULL,
    MaCon INT NOT NULL,
    LoaiQuanHe NVARCHAR(20) NOT NULL CHECK (LoaiQuanHe IN (N'Cha ruột', N'Mẹ ruột', N'Cha nuôi', N'Mẹ nuôi')),
    FOREIGN KEY (MaChaMe) REFERENCES ThanhVien(MaThanhVien),
    FOREIGN KEY (MaCon) REFERENCES ThanhVien(MaThanhVien)
);
GO

-- Chèn dữ liệu mẫu với tiền tố N cho chuỗi tiếng Việt
-- Thêm người dùng
INSERT INTO NguoiDung (TenDangNhap, MatKhau, Email, LaQuanTri, TrangThaiHoatDong, NgayTao) VALUES
(N'nguoidung1', N'$2a$10$hashed_password_1', N'nguoidung1@email.com', 0, 1, '2023-10-26'),
(N'thanhvien2', N'$2a$10$hashed_password_2', N'tv2@email.com', 0, 1, '2023-10-25'),
(N'user_tam_khoa', N'$2a$10$hashed_password_3', N'user3@email.com', 0, 0, '2023-10-24'),
(N'admin', N'$2a$10$hashed_admin_password', N'admin@familytree.com', 1, 1, GETDATE());
GO

-- Thêm cây gia phả
INSERT INTO DongHo (MaNguoiQuanLy, TenDongHo, NoiBatNguon, TenChi, GhiChu) VALUES
(1, N'Gia phả dòng họ Trần Lê', N'Làng Mẹo, Thái Bình', N'Chi thứ nhất', N'Dòng họ Trần Lê có nguồn gốc từ Thái Bình, được truyền qua nhiều thế hệ'),
(2, N'Gia phả dòng họ Nguyễn', N'Huế, Thừa Thiên Huế', N'Chi thứ hai', N'Dòng họ Nguyễn có truyền thống lâu đời tại Huế');
GO

-- Thêm thành viên cho cây gia phả 1
INSERT INTO ThanhVien (MaDongHo, HoVaTen, GioiTinh, NgaySinh, NgayMat, AnhDaiDienURL) VALUES
(1, N'Trần Văn A', N'male', '1940-01-01', '2010-12-31', N'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'),
(1, N'Lê Thị B', N'female', '1945-02-01', '2015-06-15', N'https://cdn-icons-png.flaticon.com/512/3135/3135789.png'),
(1, N'Trần Văn C', N'male', '1965-03-01', NULL, N'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'),
(1, N'Trần Thị D', N'female', '1968-04-01', NULL, N'https://cdn-icons-png.flaticon.com/512/3135/3135789.png'),
(1, N'Nguyễn Văn E', N'male', '1966-05-01', NULL, N'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'),
(1, N'Nguyễn Trần F', N'male', '1995-06-01', NULL, N'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'),
(1, N'Trần Văn G', N'male', '1972-07-01', NULL, N'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'),
(1, N'Trần Thị H', N'female', '1975-08-01', NULL, N'https://cdn-icons-png.flaticon.com/512/3135/3135789.png');
GO

-- Thêm thành viên cho cây gia phả 2
INSERT INTO ThanhVien (MaDongHo, HoVaTen, GioiTinh, NgaySinh, AnhDaiDienURL) VALUES
(2, N'Nguyễn Văn X', N'male', '1950-01-01', N'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'),
(2, N'Trần Thị Y', N'female', '1952-02-01', N'https://cdn-icons-png.flaticon.com/512/3135/3135789.png'),
(2, N'Nguyễn Văn Z', N'male', '1975-03-01', N'https://cdn-icons-png.flaticon.com/512/3135/3135715.png');
GO

-- Thêm quan hệ hôn nhân
INSERT INTO HonNhan (MaNguoiChong, MaNguoiVo, NgayBatDau, TrangThai) VALUES
(1, 2, '1960-01-01', N'Đang kết hôn'),  -- Trần Văn A - Lê Thị B
(5, 4, '1990-01-01', N'Đang kết hôn'),  -- Nguyễn Văn E - Trần Thị D
(9, 10, '1970-01-01', N'Đang kết hôn'); -- Nguyễn Văn X - Trần Thị Y
GO

-- Thêm quan hệ cha mẹ - con
INSERT INTO QuanHeChaMeCon (MaChaMe, MaCon, LoaiQuanHe) VALUES
-- Cây 1: Con của Trần Văn A (1) và Lê Thị B (2)
(1, 3, N'Cha ruột'), (2, 3, N'Mẹ ruột'),  -- Trần Văn C
(1, 4, N'Cha ruột'), (2, 4, N'Mẹ ruột'),  -- Trần Thị D
(1, 7, N'Cha ruột'), (2, 7, N'Mẹ ruột'),  -- Trần Văn G
(1, 8, N'Cha ruột'), (2, 8, N'Mẹ ruột'),  -- Trần Thị H

-- Con của Trần Thị D (4) và Nguyễn Văn E (5)
(4, 6, N'Mẹ ruột'), (5, 6, N'Cha ruột'),  -- Nguyễn Trần F

-- Cây 2: Con của Nguyễn Văn X (9) và Trần Thị Y (10)
(9, 11, N'Cha ruột'), (10, 11, N'Mẹ ruột'); -- Nguyễn Văn Z
GO

-- Tạo indexes để tối ưu hiệu suất
CREATE INDEX IX_ThanhVien_MaDongHo ON ThanhVien(MaDongHo);
CREATE INDEX IX_HonNhan_MaNguoiChong ON HonNhan(MaNguoiChong);
CREATE INDEX IX_HonNhan_MaNguoiVo ON HonNhan(MaNguoiVo);
CREATE INDEX IX_QuanHeChaMeCon_MaChaMe ON QuanHeChaMeCon(MaChaMe);
CREATE INDEX IX_QuanHeChaMeCon_MaCon ON QuanHeChaMeCon(MaCon);
GO

-- Tạo view để lấy thông tin cây gia phả đầy đủ
CREATE VIEW vw_FamilyTreeDetails AS
SELECT 
    dh.MaDongHo,
    dh.TenDongHo,
    dh.NoiBatNguon,
    dh.TenChi,
    dh.GhiChu,
    nd.TenDangNhap AS NguoiQuanLy,
    COUNT(tv.MaThanhVien) AS SoThanhVien
FROM DongHo dh
INNER JOIN NguoiDung nd ON dh.MaNguoiQuanLy = nd.MaNguoiDung
LEFT JOIN ThanhVien tv ON dh.MaDongHo = tv.MaDongHo
GROUP BY dh.MaDongHo, dh.TenDongHo, dh.NoiBatNguon, dh.TenChi, dh.GhiChu, nd.TenDangNhap;
GO

-- Kiểm tra dữ liệu
SELECT N'NguoiDung' AS Table_Name, COUNT(*) AS Count FROM NguoiDung
UNION ALL
SELECT N'DongHo', COUNT(*) FROM DongHo
UNION ALL
SELECT N'ThanhVien', COUNT(*) FROM ThanhVien
UNION ALL
SELECT N'HonNhan', COUNT(*) FROM HonNhan
UNION ALL
SELECT N'QuanHeChaMeCon', COUNT(*) FROM QuanHeChaMeCon;
GO

-- Kiểm tra dữ liệu tiếng Việt
SELECT MaThanhVien, HoVaTen, GioiTinh FROM ThanhVien;
SELECT MaHonNhan, TrangThai FROM HonNhan;
SELECT MaQuanHe, LoaiQuanHe FROM QuanHeChaMeCon;
GO

PRINT N'Database FamilyTreeDB đã được tạo thành công!';
PRINT N'Đã thêm dữ liệu mẫu:';
PRINT N'- 4 người dùng (1 admin, 3 user)';
PRINT N'- 2 cây gia phả';
PRINT N'- 11 thành viên';
PRINT N'- 3 quan hệ hôn nhân';
PRINT N'- 12 quan hệ cha mẹ-con';