// Main entry point - Load all modules
// Load order is important: config -> utils -> api -> others

// Load config first (global variables)
// config.js should be loaded via script tag before this file

// Load utils (showToast, showPage)
// utils.js should be loaded via script tag before this file

// Load API utilities
// api.js should be loaded via script tag before this file

// Load business logic modules
// auth.js, tree.js, member.js, admin.js, user.js should be loaded via script tag

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    // Set default page
    if (typeof showPage === 'function') {
        showPage('loginPage');
    }
    
    // Thêm event listener cho nút đăng ký nếu có
    const registerButton = document.querySelector('#registerPage button[onclick*="treeSelectionPage"]');
    if (registerButton && typeof handleRegister === 'function') {
        registerButton.onclick = handleRegister;
    }
});
