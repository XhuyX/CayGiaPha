# Frontend - Hệ Thống Quản Lý Gia Phả

## Cấu trúc MVC

```
frontend/
├── controllers/      # Controllers xử lý logic
├── views/          # EJS templates
│   ├── auth/       # Trang đăng nhập/đăng ký
│   ├── tree/       # Trang quản lý cây gia phả
│   └── admin/      # Trang quản trị
├── routes/         # Route definitions
├── public/         # Static files (CSS, JS, images)
│   ├── css/
│   ├── js/
│   └── images/
└── server.js       # Express server

```

## Cài đặt

```bash
npm install
```

## Chạy ứng dụng

```bash
npm start
```

Hoặc chạy với nodemon (tự động reload):

```bash
npm run dev
```

## Cấu hình

Mặc định frontend chạy tại `http://localhost:3001`

Backend URL có thể cấu hình qua biến môi trường:
```bash
BACKEND_URL=http://localhost:3000 npm start
```

## Routes

- `/` - Redirect đến `/login` hoặc `/trees`
- `/login` - Trang đăng nhập
- `/register` - Trang đăng ký
- `/trees` - Danh sách cây gia phả
- `/tree/create` - Tạo cây gia phả mới
- `/tree/:id` - Xem cây gia phả
- `/admin` - Trang quản trị (chỉ admin)

## URLs không có extension

Tất cả routes đều không có extension (`.html`), sử dụng Express routing.

