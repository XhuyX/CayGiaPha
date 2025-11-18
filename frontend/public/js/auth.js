// Authentication functions

async function handleLogin() {
    const username = document.getElementById('usernameInput').value.trim();
    const passwordInput = document.querySelector('#loginPage input[type="password"]');
    const password = passwordInput ? passwordInput.value : '';
    
    if (!username || !password) {
        showToast('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!', 'warning');
        return;
    }
    
    try {
        const result = await apiCall('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        currentUser = result.user;
        
        const usernameDisplays = document.querySelectorAll('#currentUsername, #currentUsername2');
        usernameDisplays.forEach(el => el.textContent = currentUser.username);
        
        // Load family trees for this user
        if (typeof loadUserFamilyTrees === 'function') {
            await loadUserFamilyTrees();
        }
        
        if (currentUser.isAdmin) {
            showPage('adminPage');
        } else {
            showPage('treeSelectionPage');
        }
    } catch (error) {
        console.error('Login failed:', error);
    }
}

async function handleRegister() {
    const username = document.querySelector('#registerPage input[placeholder="Tên đăng nhập"]').value.trim();
    const email = document.querySelector('#registerPage input[placeholder="Email"]').value.trim();
    const passwordInputs = document.querySelectorAll('#registerPage input[type="password"]');
    const password = passwordInputs[0] ? passwordInputs[0].value : '';
    const confirmPassword = passwordInputs[1] ? passwordInputs[1].value : '';
    
    if (!username || !email || !password || !confirmPassword) {
        showToast('Vui lòng điền đầy đủ thông tin!', 'warning');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Mật khẩu xác nhận không khớp!', 'error');
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('Email không hợp lệ!', 'error');
        return;
    }
    
    try {
        const result = await apiCall('/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password, confirmPassword })
        });
        
        currentUser = result.user;
        const usernameDisplays = document.querySelectorAll('#currentUsername, #currentUsername2');
        usernameDisplays.forEach(el => el.textContent = currentUser.username);
        
        showToast('Đăng ký thành công!', 'success');
        showPage('treeSelectionPage');
    } catch (error) {
        console.error('Register failed:', error);
    }
}

