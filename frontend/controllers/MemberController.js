const fetch = require('node-fetch');

class MemberController {
    static async create(req, res) {
        try {
            const { treeId } = req.params;
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            
            const response = await fetch(`${backendUrl}/api/family-trees/${treeId}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req.body)
            });
            
            const data = await response.json();
            res.json(data);
        } catch (error) {
            res.json({ success: false, message: 'Thêm thành viên thất bại' });
        }
    }

    static async view(req, res) {
        try {
            const { id } = req.params;
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            
            const response = await fetch(`${backendUrl}/api/members/${id}`, {
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            res.json(data);
        } catch (error) {
            res.json({ success: false, message: 'Không thể tải thông tin thành viên' });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            
            const response = await fetch(`${backendUrl}/api/members/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req.body)
            });
            
            const data = await response.json();
            res.json(data);
        } catch (error) {
            res.json({ success: false, message: 'Cập nhật thất bại' });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            
            const response = await fetch(`${backendUrl}/api/members/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            res.json(data);
        } catch (error) {
            res.json({ success: false, message: 'Xóa thất bại' });
        }
    }

    static async search(req, res) {
        try {
            const { treeId } = req.params;
            const { q } = req.query;
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            
            if (!q || q.trim() === '') {
                return res.json({ success: true, members: [] });
            }
            
            const searchUrl = `${backendUrl}/api/family-trees/${treeId}/search?q=${encodeURIComponent(q.trim())}`;
            const response = await fetch(searchUrl, {
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            
            res.json(data);
        } catch (error) {
            console.error('Search error:', error);
            res.json({ success: false, members: [], error: error.message });
        }
    }
}

module.exports = MemberController;

