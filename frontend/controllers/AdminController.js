const fetch = require('node-fetch');

class AdminController {
    static async dashboard(req, res) {
        try {
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            
            let users = [];
            let trees = [];
            
            // Load users và trees của admin
            try {
                const [usersResponse, treesResponse] = await Promise.all([
                    fetch(`${backendUrl}/api/admin/users`, {
                        headers: { 'Content-Type': 'application/json' }
                    }),
                    fetch(`${backendUrl}/api/family-trees/${req.session.user.id}`, {
                        headers: { 'Content-Type': 'application/json' }
                    })
                ]);
                
                const usersData = await usersResponse.json();
                const treesData = await treesResponse.json();
                
                users = usersData.success ? usersData.users : [];
                trees = treesData.success ? treesData.trees : [];
            } catch (fetchError) {
                console.error('Error fetching data:', fetchError);
            }
            
            res.render('admin/dashboard', { 
                title: 'Trang Quản Trị',
                user: req.session.user,
                users: users.map(u => ({
                    id: u.MaNguoiDung,
                    username: u.TenDangNhap,
                    email: u.Email,
                    created: new Date(u.NgayTao).toISOString().split('T')[0],
                    active: u.TrangThaiHoatDong
                })),
                trees: trees || []
            });
        } catch (error) {
            console.error('Admin dashboard error:', error);
            res.render('admin/dashboard', { 
                title: 'Trang Quản Trị',
                user: req.session.user,
                users: [],
                trees: [],
                error: 'Không thể tải dữ liệu' 
            });
        }
    }
}

module.exports = AdminController;

