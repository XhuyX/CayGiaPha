// User profile functions

let userProfileData = null;

async function loadUserProfile() {
    if (!currentUser) {
        showToast('Vui lòng đăng nhập!', 'warning');
        return;
    }
    
    try {
        const result = await apiCall(`/user/profile?userId=${currentUser.id}`);
        userProfileData = result.user;
        renderUserProfile();
    } catch (error) {
        console.error('Failed to load user profile:', error);
        showToast('Không thể tải thông tin người dùng', 'error');
    }
}

function renderUserProfile() {
    if (!userProfileData) return;
    
    const profileContainer = document.getElementById('userProfileContent');
    if (!profileContainer) return;
    
    profileContainer.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center space-x-4 mb-6">
                <div class="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    ${userProfileData.username ? userProfileData.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">${userProfileData.username || 'Người dùng'}</h2>
                    <p class="text-gray-600">${userProfileData.email || ''}</p>
                    <p class="text-sm text-gray-500 mt-1">
                        Tham gia: ${userProfileData.createdAt ? new Date(userProfileData.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                    </p>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div class="bg-blue-50 p-4 rounded-lg">
                    <div class="text-sm text-gray-600">Số cây gia phả</div>
                    <div class="text-2xl font-bold text-blue-600" id="userTreeCount">${userProfileData.treeCount || 0}</div>
                </div>
                <div class="bg-green-50 p-4 rounded-lg">
                    <div class="text-sm text-gray-600 mb-1">
                        <i class="fas fa-users text-gray-500 mr-1"></i>Tổng thành viên
                    </div>
                    <div class="text-2xl font-bold text-green-600" id="userMemberCount">${userProfileData.totalMembers || 0}</div>
                    <p class="text-xs text-gray-500 mt-1">Tổng số thành viên trong tất cả cây gia phả</p>
                </div>
            </div>
            
            <div class="border-t pt-4">
                <h3 class="text-lg font-semibold mb-4">Thông tin tài khoản</h3>
                <form id="updateProfileForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label>
                        <input type="text" id="profileUsername" value="${userProfileData.username || ''}" 
                            class="w-full px-3 py-2 border border-gray-300 rounded-md" disabled>
                        <p class="text-xs text-gray-500 mt-1">Tên đăng nhập không thể thay đổi</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" id="profileEmail" value="${userProfileData.email || ''}" 
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                    </div>
                    <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                        <i class="fas fa-save mr-2"></i>Cập nhật thông tin
                    </button>
                </form>
            </div>
        </div>
    `;
    
    // Load tree count và total members
    if (typeof loadUserFamilyTrees === 'function') {
        loadUserFamilyTrees().then(() => {
            const treeCount = familyTrees ? familyTrees.length : 0;
            const treeCountEl = document.getElementById('userTreeCount');
            if (treeCountEl) {
                treeCountEl.textContent = treeCount;
            }
            
            // Tính tổng thành viên từ tất cả các cây gia phả
            let totalMembers = 0;
            if (familyTrees && Array.isArray(familyTrees)) {
                familyTrees.forEach(tree => {
                    if (tree.members && Array.isArray(tree.members)) {
                        totalMembers += tree.members.length;
                    }
                });
            }
            
            const memberCountEl = document.getElementById('userMemberCount');
            if (memberCountEl) {
                memberCountEl.textContent = totalMembers;
            }
        });
    }
    
    // Event listener cho form update profile
    const updateProfileForm = document.getElementById('updateProfileForm');
    if (updateProfileForm) {
        updateProfileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await updateUserProfile();
        });
    }
}

async function updateUserProfile() {
    const email = document.getElementById('profileEmail').value.trim();
    
    if (!email) {
        showToast('Email không được để trống!', 'warning');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('Email không hợp lệ!', 'error');
        return;
    }
    
    try {
        await apiCall(`/user/profile?userId=${currentUser.id}`, {
            method: 'PUT',
            body: JSON.stringify({ email, userId: currentUser.id })
        });
        
        showToast('Cập nhật thông tin thành công!', 'success');
        await loadUserProfile();
    } catch (error) {
        console.error('Failed to update profile:', error);
    }
}

function openChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (!modal) return;
    
    modal.classList.add('active');
    document.body.classList.add('modal-active');
    document.getElementById('changePasswordForm').reset();
    
    // Đóng modal khi click ra ngoài
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeChangePasswordModal();
        }
    });
    
    // Đóng modal khi nhấn ESC
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            closeChangePasswordModal();
            document.removeEventListener('keydown', escHandler);
        }
    });
}

function closeChangePasswordModal() {
    const modal = document.getElementById('changePasswordModal');
    if (!modal) return;
    
    modal.classList.remove('active');
    document.body.classList.remove('modal-active');
    
    // Reset form
    const form = document.getElementById('changePasswordForm');
    if (form) {
        form.reset();
    }
}

// Event listener cho form đổi mật khẩu
document.addEventListener('DOMContentLoaded', function() {
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await changePassword();
        });
    }
});

async function changePassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('Vui lòng điền đầy đủ thông tin!', 'warning');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('Mật khẩu mới phải có ít nhất 6 ký tự!', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showToast('Mật khẩu xác nhận không khớp!', 'error');
        return;
    }
    
    try {
        await apiCall(`/user/change-password?userId=${currentUser.id}`, {
            method: 'POST',
            body: JSON.stringify({
                currentPassword,
                newPassword,
                confirmPassword,
                userId: currentUser.id
            })
        });
        
        showToast('Đổi mật khẩu thành công!', 'success');
        closeChangePasswordModal();
    } catch (error) {
        console.error('Failed to change password:', error);
    }
}

