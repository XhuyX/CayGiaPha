const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const TreeController = require('../controllers/TreeController');
const MemberController = require('../controllers/MemberController');
const AdminController = require('../controllers/AdminController');
const UserController = require('../controllers/UserController');
const ShareController = require('../controllers/ShareController');

// Middleware để check authentication
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

const requireAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.isAdmin) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Public routes
router.get('/', (req, res) => {
    if (req.session.user) {
        if (req.session.user.isAdmin) {
            res.redirect('/admin');
        } else {
            res.redirect('/trees');
        }
    } else {
        res.redirect('/login');
    }
});

router.get('/login', AuthController.showLogin);
router.post('/login', AuthController.login);
router.get('/register', AuthController.showRegister);
router.post('/register', AuthController.register);
router.post('/logout', AuthController.logout);

// Protected routes
router.get('/trees', requireAuth, TreeController.list);
router.get('/tree/create', requireAuth, TreeController.showCreate);
router.post('/tree/create', requireAuth, TreeController.create);
router.get('/tree/:id', requireAuth, TreeController.view);
router.delete('/tree/:id', requireAuth, TreeController.delete);

// Member routes
router.post('/tree/:treeId/member', requireAuth, MemberController.create);
router.get('/member/:id', requireAuth, MemberController.view);
router.put('/member/:id', requireAuth, MemberController.update);
router.delete('/member/:id', requireAuth, MemberController.delete);
router.get('/tree/:treeId/search', requireAuth, MemberController.search);

// Admin routes
router.get('/admin', requireAdmin, AdminController.dashboard);

// User profile routes
router.get('/user/profile', requireAuth, UserController.showProfile);

// Public share routes (không cần đăng nhập)
router.get('/share/:token', ShareController.viewPublicTree);

module.exports = router;

