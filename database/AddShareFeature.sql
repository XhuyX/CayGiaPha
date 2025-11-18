-- Thêm tính năng Share cây gia phả
USE FamilyTreeDB;
GO

-- Thêm cột ShareToken (cho phép NULL, không unique vì có thể có nhiều NULL)
ALTER TABLE DongHo
ADD ShareToken NVARCHAR(64) NULL;
GO

-- Thêm cột IsPublic (mặc định là 0 - không công khai)
ALTER TABLE DongHo
ADD IsPublic BIT NOT NULL DEFAULT 0;
GO

-- Tạo unique index cho ShareToken (chỉ áp dụng cho giá trị không NULL)
-- SQL Server không cho phép unique index với NULL, nên dùng filtered index
CREATE UNIQUE NONCLUSTERED INDEX IX_DongHo_ShareToken 
ON DongHo(ShareToken)
WHERE ShareToken IS NOT NULL;
GO

-- Tạo index cho IsPublic để tối ưu query
CREATE INDEX IX_DongHo_IsPublic ON DongHo(IsPublic);
GO

PRINT N'Đã thêm tính năng Share cây gia phả thành công!';
PRINT N'- Trường ShareToken: Token duy nhất để share cây gia phả (NULL nếu chưa share)';
PRINT N'- Trường IsPublic: Đánh dấu cây gia phả có công khai hay không (0 = riêng tư, 1 = công khai)';
PRINT N'- Index IX_DongHo_ShareToken: Đảm bảo ShareToken là duy nhất (chỉ áp dụng cho giá trị không NULL)';

