const fetch = require('node-fetch');

class TreeController {
    static async list(req, res) {
        try {
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            const response = await fetch(`${backendUrl}/api/family-trees/${req.session.user.id}`, {
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            const trees = data.success ? data.trees : [];
            
            res.render('tree/list', { 
                title: 'Danh sách Cây Gia Phả',
                user: req.session.user,
                trees: trees 
            });
        } catch (error) {
            res.render('tree/list', { 
                title: 'Danh sách Cây Gia Phả',
                user: req.session.user,
                trees: [],
                error: 'Không thể tải danh sách cây gia phả' 
            });
        }
    }

    static showCreate(req, res) {
        res.render('tree/create', { 
            title: 'Tạo Cây Gia Phả Mới',
            user: req.session.user 
        });
    }

    static async create(req, res) {
        try {
            const { name, origin, branch, description } = req.body;
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            
            const response = await fetch(`${backendUrl}/api/family-trees`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: req.session.user.id,
                    name,
                    origin,
                    branch,
                    description
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                res.redirect('/trees');
            } else {
                res.render('tree/create', { 
                    title: 'Tạo Cây Gia Phả Mới',
                    user: req.session.user,
                    error: data.message || 'Tạo cây gia phả thất bại' 
                });
            }
        } catch (error) {
            res.render('tree/create', { 
                title: 'Tạo Cây Gia Phả Mới',
                user: req.session.user,
                error: 'Có lỗi xảy ra. Vui lòng thử lại.' 
            });
        }
    }

    static async view(req, res) {
        try {
            const { id } = req.params;
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            
            const response = await fetch(`${backendUrl}/api/family-trees/${req.session.user.id}`, {
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            const trees = data.success ? data.trees : [];
            const tree = trees.find(t => t.id == id);
            
            if (!tree) {
                return res.redirect('/trees');
            }
            
            res.render('tree/view', { 
                title: tree.name,
                user: req.session.user,
                tree: tree 
            });
        } catch (error) {
            res.redirect('/trees');
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            
            const response = await fetch(`${backendUrl}/api/family-trees/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            res.json(data);
        } catch (error) {
            res.json({ success: false, message: 'Xóa thất bại' });
        }
    }
}

module.exports = TreeController;

