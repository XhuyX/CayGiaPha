const fetch = require('node-fetch');

class AuthController {
    static async showLogin(req, res) {
        if (req.session.user) {
            return res.redirect('/trees');
        }
        res.render('auth/login', { 
            title: 'Đăng nhập',
            error: null
        });
    }

    static async login(req, res) {
        try {
            const { username, password } = req.body;
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            
            const response = await fetch(`${backendUrl}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                req.session.user = data.user;
                if (data.user.isAdmin) {
                    res.redirect('/admin');
                } else {
                    res.redirect('/trees');
                }
            } else {
                res.render('auth/login', { 
                    title: 'Đăng nhập',
                    error: data.message || 'Tên đăng nhập hoặc mật khẩu không đúng'
                });
            }
        } catch (error) {
            res.render('auth/login', { 
                title: 'Đăng nhập',
                error: 'Có lỗi xảy ra. Vui lòng thử lại.'
            });
        }
    }

    static async showRegister(req, res) {
        if (req.session.user) {
            return res.redirect('/trees');
        }
        res.render('auth/register', { 
            title: 'Đăng ký',
            error: null
        });
    }

    static async register(req, res) {
        try {
            const { username, email, password, confirmPassword } = req.body;
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
            
            const response = await fetch(`${backendUrl}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, confirmPassword })
            });
            
            const data = await response.json();
            
            if (data.success) {
                req.session.user = data.user;
                res.redirect('/trees');
            } else {
                res.render('auth/register', { 
                    title: 'Đăng ký',
                    error: data.message || 'Đăng ký thất bại',
                });
            }
        } catch (error) {
            res.render('auth/register', { 
                title: 'Đăng ký',
                error: 'Có lỗi xảy ra. Vui lòng thử lại.'
            });
        }
    }

    static logout(req, res) {
        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
            }
            res.redirect('/login');
        });
    }
}

module.exports = AuthController;

