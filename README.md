# 🌳 Hệ Thống Quản Lý Gia Phả Online

Ứng dụng web quản lý cây gia phả trực tuyến với giao diện đẹp và tính năng đầy đủ.

## 📋 Tổng quan

Hệ thống cho phép người dùng:
- ✅ Tạo và quản lý nhiều cây gia phả
- ✅ Thêm/sửa/xóa thành viên
- ✅ Quản lý quan hệ (hôn nhân, cha mẹ-con, ruột/nuôi)
- ✅ Xem sơ đồ cây gia phả trực quan
- ✅ Tìm kiếm thành viên (hỗ trợ tiếng Việt, case-insensitive)
- ✅ Quản lý người dùng (Admin)
- ✅ Admin có đầy đủ chức năng như người dùng thường

## 🛠️ Công nghệ

### Frontend
- **Framework:** Node.js + Express.js (EJS templates)
- **Styling:** Tailwind CSS + Custom CSS (Dreamy Sky Pink Glow theme)
- **JavaScript:** Vanilla JS (ES6+)
- **Library:** [Balkan FamilyTree.js](https://balkan.app/FamilyTreeJS) - Thư viện vẽ cây gia phả
- **UI Components:** Custom modals, toast notifications, confirm dialogs

### Backend
- **Runtime:** Node.js + Express.js
- **Database:** Microsoft SQL Server (MSSQL)
- **Security:** bcrypt (mã hóa mật khẩu), session management
- **Architecture:** MVC pattern với Database layer

## 📁 Cấu trúc thư mục

```
CayGiaPha/
├── frontend/                    # Frontend application
│   ├── controllers/             # Controllers (MVC)
│   │   ├── AdminController.js
│   │   ├── AuthController.js
│   │   ├── MemberController.js
│   │   └── TreeController.js
│   ├── views/                   # EJS templates
│   │   ├── auth/                # Đăng nhập/đăng ký
│   │   │   ├── login.ejs
│   │   │   └── register.ejs
│   │   ├── tree/                # Quản lý cây gia phả
│   │   │   ├── list.ejs         # Danh sách cây
│   │   │   ├── view.ejs         # Xem cây gia phả
│   │   │   └── create.ejs       # Tạo cây mới
│   │   └── admin/               # Admin panel
│   │       └── dashboard.ejs
│   ├── routes/                  # Route definitions
│   │   └── index.js
│   ├── public/                  # Static files
│   │   ├── css/
│   │   │   └── style.css        # Custom styles
│   │   ├── js/
│   │   │   ├── main.js          # Main frontend logic
│   │   │   ├── familytree-simple.js  # Family tree visualization
│   │   │   ├── toast.js         # Toast notifications
│   │   │   └── confirm-modal.js  # Custom confirm dialogs
│   │   └── images/
│   ├── server.js                # Express server (port 3001)
│   ├── package.json
│   └── README.md
│
├── backend/                     # Backend API server
│   ├── database/
│   │   ├── database.js          # Database layer (MSSQL)
│   │   └── api.js               # API routes
│   ├── middleware/              # Authentication, authorization
│   ├── models/                  # Data models
│   ├── routes/                  # Route handlers
│   ├── controllers/             # Business logic
│   ├── services/                # Service layer
│   ├── utils/                   # Utility functions
│   ├── server.js                # Express server (port 3000)
│   ├── package.json
│   └── node_modules/
│
├── database/
│   └── CreateDatabase.sql      # SQL script tạo database
│
├── .gitignore                   # Git ignore rules
├── README.md                    # Tài liệu này
└── PHAN_TICH_TUAN_THU_TAI_LIEU.md  # Phân tích tuân thủ tài liệu
```

## 🚀 Cài đặt và Chạy

### Yêu cầu hệ thống
- Node.js >= 14.x
- Microsoft SQL Server (2019 hoặc mới hơn)
- npm hoặc yarn

### 1. Clone repository

```bash
git clone https://github.com/XhuyX/CayGiaPha.git
cd CayGiaPha
```

### 2. Cài đặt SQL Server Database

Chạy script SQL trong SQL Server Management Studio (SSMS) hoặc dùng sqlcmd:

```bash
sqlcmd -S localhost -U sa -P <password> -i database/CreateDatabase.sql
```

### 3. Cấu hình Database

Mở file `backend/database/database.js` và cấu hình kết nối:

```javascript
const config = {
    server: 'localhost',
    database: 'FamilyTreeDB',
    user: 'sa',
    password: 'your_password',  // Đổi password của bạn
    options: {
        enableArithAbort: true,
        trustServerCertificate: true
    }
};
```

### 4. Cài đặt Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 5. Chạy ứng dụng

**Chạy Backend (Terminal 1):**
```bash
cd backend
npm start
# Hoặc với nodemon (auto-reload)
npm run dev
```

Backend sẽ chạy tại: `http://localhost:3000`

**Chạy Frontend (Terminal 2):**
```bash
cd frontend
npm start
# Hoặc với nodemon (auto-reload)
npm run dev
```

Frontend sẽ chạy tại: `http://localhost:3001`

### 6. Truy cập ứng dụng

Mở trình duyệt và truy cập: `http://localhost:3001`

## 👤 Tài khoản mặc định

Database đã có sẵn tài khoản test:

### Admin
- Username: `admin`
- Password: (xem trong database, mật khẩu đã được hash)

### User thường
- Username: `nguoidung1`
- Password: (xem trong database)

**Lưu ý:** Nếu mật khẩu chưa được hash, bạn cần đăng ký tài khoản mới hoặc update password bằng bcrypt.

## 📚 API Documentation

### Các endpoint chính:

**Authentication:**
- `POST /api/register` - Đăng ký tài khoản
- `POST /api/login` - Đăng nhập

**Family Trees:**
- `GET /api/family-trees/:userId` - Lấy danh sách cây gia phả
- `POST /api/family-trees` - Tạo cây mới
- `GET /api/family-trees/:treeId` - Lấy thông tin cây
- `PUT /api/family-trees/:treeId` - Cập nhật cây
- `DELETE /api/family-trees/:treeId` - Xóa cây

**Members:**
- `GET /api/members/:memberId` - Chi tiết thành viên
- `POST /api/family-trees/:treeId/members` - Thêm thành viên
- `PUT /api/members/:memberId` - Cập nhật thành viên
- `DELETE /api/members/:memberId` - Xóa thành viên
- `GET /api/family-trees/:treeId/search?q=name` - Tìm kiếm thành viên

**Admin:**
- `GET /api/admin/users` - Quản lý người dùng
- `PUT /api/admin/users/:userId/status` - Vô hiệu hóa/kích hoạt tài khoản

## 🗄️ Database Schema

### Bảng chính:

1. **NguoiDung** - Quản lý tài khoản người dùng
2. **DongHo** - Cây gia phả
3. **ThanhVien** - Thành viên trong cây
4. **HonNhan** - Quan hệ vợ chồng
5. **QuanHeChaMeCon** - Quan hệ cha mẹ - con (ruột/nuôi)

Xem chi tiết: [`database/CreateDatabase.sql`](database/CreateDatabase.sql)

## 🎯 Use Cases

Hệ thống được thiết kế theo 10 Use Cases:

1. **UC-01:** Đăng ký tài khoản
2. **UC-02:** Đăng nhập
3. **UC-03:** Xem cây gia phả
4. **UC-04:** Xem chi tiết thành viên
5. **UC-05:** Thêm thành viên
6. **UC-06:** Sửa thông tin thành viên
7. **UC-07:** Xóa thành viên
8. **UC-08:** Tìm kiếm thành viên
9. **UC-09:** Tạo cây gia phả mới
10. **UC-10:** Quản lý người dùng (Admin)

## 🎨 Tính năng nổi bật

### Giao diện
- ✨ Modern UI với Tailwind CSS
- 🌈 Dreamy Sky Pink Glow theme (background gradient đẹp mắt)
- 📱 Responsive design
- 🎯 Trực quan, dễ sử dụng
- 🖱️ Tương tác bằng click phải (context menu)
- 🎭 Custom modals với animations
- 🔔 Toast notifications
- ✅ Custom confirm dialogs (thay thế browser confirm/alert)

### Quản lý thành viên
- 👤 Thông tin chi tiết (họ tên, ngày sinh/mất, tiểu sử)
- 🖼️ Hỗ trợ ảnh đại diện
- 👨‍👩‍👧‍👦 Quản lý nhiều loại quan hệ
- ➕ **Thêm thành viên:** Click phải → Add father/mother/wife/son/daughter
- ✏️ **Sửa thông tin:** Click phải → Edit (modal scrollable với tabs)
- 🗑️ **Xóa thành viên:** Click phải → Remove (với confirm dialog)
- 📋 **Xem chi tiết:** Click phải → Details

### Quan hệ gia đình
- 💑 Hôn nhân (có thể nhiều vợ/chồng)
- 👶 Cha mẹ - con (phân biệt ruột/nuôi)
- 🌲 Hiển thị cây đồ họa tự động
- 🔄 Sync tự động với server

### Tìm kiếm
- 🔍 Tìm kiếm thành viên theo tên
- 🌐 Hỗ trợ tiếng Việt (case-insensitive, accent-insensitive)
- 📊 Hiển thị kết quả real-time
- 🎯 Tìm kiếm substring trong tên

### Bảo mật
- 🔒 Mật khẩu được hash (bcrypt)
- 🚫 Kiểm tra quyền truy cập (requireAuth, requireAdmin)
- ✅ Validation đầy đủ
- 🔐 Session management

### Admin Panel
- 👥 Quản lý người dùng (xem danh sách, khóa/mở khóa)
- 🌳 Quản lý cây gia phả (CRUD)
- ➕ Đầy đủ chức năng như người dùng thường
- 📊 Tabbed interface

## 🧪 Testing

### Test API với cURL:

```bash
# Health check
curl http://localhost:3000/api/health

# Đăng ký
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"123456","confirmPassword":"123456"}'

# Đăng nhập
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"123456"}'

# Lấy cây gia phả
curl http://localhost:3000/api/family-trees/1

# Tìm kiếm thành viên
curl "http://localhost:3000/api/family-trees/1/search?q=trần"
```

## 📝 Changelog

### Version Latest (2025-01-XX)

**UI/UX Improvements:**
- ✅ Thêm Dreamy Sky Pink Glow background theme
- ✅ Custom modals với animations
- ✅ Custom confirm dialogs (thay thế browser confirm/alert)
- ✅ Toast notifications cho user feedback
- ✅ Edit member modal với scrollable content và tabs
- ✅ Improved responsive design

**Backend:**
- ✅ Tái cấu trúc toàn bộ Backend API
- ✅ Loại bỏ duplicate code
- ✅ Bổ sung 8+ API endpoints mới
- ✅ Cải thiện error handling và validation
- ✅ Improved search với hỗ trợ tiếng Việt tốt hơn
- ✅ Console logs cho debugging

**Frontend:**
- ✅ Tối ưu hóa để tận dụng 100% thư viện FamilyTree.js
- ✅ Loại bỏ modal thêm thành viên thừa thãi
- ✅ Sửa lỗi button sửa/xóa không hoạt động
- ✅ Xử lý events đúng cách (add, update, remove)
- ✅ Sync tự động với server sau mỗi thao tác
- ✅ Dynamic UI updates (không cần reload)
- ✅ Improved search functionality
- ✅ Admin có đầy đủ chức năng như user thường

**Code Quality:**
- ✅ Removed console.debug logs
- ✅ Restructured frontend và backend
- ✅ Removed unnecessary files
- ✅ Improved code organization

## 🤝 Đóng góp

Dự án mã nguồn mở, mọi đóng góp đều được hoan nghênh!

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 📖 Hướng Dẫn Sử Dụng

### Cách sử dụng nhanh:

1. **Thêm thành viên:** Click phải vào node → Chọn "Add father/mother/wife/son/daughter"
2. **Sửa thông tin:** Click phải → "✏️ Sửa" (modal sẽ mở với scrollable content)
3. **Xóa thành viên:** Click phải → "🗑️ Xóa" (confirm dialog sẽ hiện)
4. **Xem chi tiết:** Click phải → "📋 Chi tiết"
5. **Tìm kiếm:** Nhập tên vào search box → Kết quả hiển thị real-time
6. **Admin:** Vào `/admin` để quản lý người dùng và cây gia phả

## 🐛 Troubleshooting

### Backend không kết nối được database
- Kiểm tra SQL Server đã chạy chưa
- Kiểm tra connection string trong `backend/database/database.js`
- Kiểm tra firewall và port 1433

### Frontend không kết nối được Backend
- Kiểm tra Backend đã chạy tại `http://localhost:3000`
- Kiểm tra `BACKEND_URL` trong `frontend/server.js`

### Search không tìm được thành viên
- Kiểm tra database collation (Vietnamese_CI_AS)
- Xem console logs để debug

## 📄 License

MIT License - Tự do sử dụng và chỉnh sửa

## 📧 Liên hệ

- **Repository:** https://github.com/XhuyX/CayGiaPha
- Nếu có câu hỏi hoặc góp ý, vui lòng tạo issue trên GitHub.

---

**Phát triển với ❤️ cho cộng đồng Việt Nam**
