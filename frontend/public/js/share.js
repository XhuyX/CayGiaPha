// Share tree functions

let currentShareInfo = null;

async function openShareModal() {
    if (!currentTreeId || !currentUser) {
        showToast('Vui lòng đăng nhập và chọn cây gia phả!', 'warning');
        return;
    }
    
    const modal = document.getElementById('shareModal');
    if (!modal) return;
    
    modal.classList.add('active');
    document.body.classList.add('modal-active');
    
    // Load share info
    await loadShareInfo();
    
    // Đóng modal khi click ra ngoài
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeShareModal();
        }
    });
    
    // Đóng modal khi nhấn ESC
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            closeShareModal();
            document.removeEventListener('keydown', escHandler);
        }
    });
}

function closeShareModal() {
    const modal = document.getElementById('shareModal');
    if (!modal) return;
    
    modal.classList.remove('active');
    document.body.classList.remove('modal-active');
}

async function loadShareInfo() {
    if (!currentTreeId || !currentUser) return;
    
    const content = document.getElementById('shareModalContent');
    if (!content) return;
    
    try {
        const result = await apiCall(`/family-trees/${currentTreeId}/share?userId=${currentUser.id}`);
        currentShareInfo = result;
        renderShareModal();
    } catch (error) {
        console.error('Failed to load share info:', error);
        content.innerHTML = `
            <div class="text-center py-4 text-red-600">
                <i class="fas fa-exclamation-circle text-2xl mb-2"></i>
                <p>Không thể tải thông tin chia sẻ</p>
            </div>
        `;
    }
}

function renderShareModal() {
    const content = document.getElementById('shareModalContent');
    if (!content || !currentShareInfo) return;
    
    if (currentShareInfo.isPublic && currentShareInfo.shareUrl) {
        // Đã có share link
        content.innerHTML = `
            <div class="space-y-4">
                <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div class="flex items-center mb-2">
                        <i class="fas fa-check-circle text-green-600 mr-2"></i>
                        <span class="font-semibold text-green-800">Cây gia phả đang được chia sẻ công khai</span>
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                        <i class="fas fa-link text-gray-500 mr-2"></i>Link chia sẻ
                    </label>
                    <div class="flex gap-2">
                        <input type="text" id="shareUrlInput" 
                            value="${currentShareInfo.shareUrl}" 
                            readonly
                            class="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500">
                        <button onclick="copyShareLink()" 
                            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                            <i class="fas fa-copy mr-2"></i>Sao chép
                        </button>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">Gửi link này cho người khác để họ xem cây gia phả mà không cần đăng nhập</p>
                </div>
                
                <div class="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button onclick="disableShare()" 
                        class="px-6 py-2 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition font-medium">
                        <i class="fas fa-ban mr-2"></i>Tắt chia sẻ
                    </button>
                    <button onclick="closeShareModal()" 
                        class="px-6 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-gray-700">
                        Đóng
                    </button>
                </div>
            </div>
        `;
    } else {
        // Chưa có share link
        content.innerHTML = `
            <div class="space-y-4">
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div class="flex items-start">
                        <i class="fas fa-info-circle text-blue-600 mr-2 mt-1"></i>
                        <div>
                            <p class="font-semibold text-blue-800 mb-1">Chia sẻ cây gia phả</p>
                            <p class="text-sm text-blue-700">Tạo link công khai để người khác có thể xem cây gia phả của bạn mà không cần đăng nhập.</p>
                        </div>
                    </div>
                </div>
                
                <div class="flex justify-end space-x-3 pt-4">
                    <button onclick="closeShareModal()" 
                        class="px-6 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium text-gray-700">
                        Hủy
                    </button>
                    <button onclick="enableShare()" 
                        class="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium shadow-md hover:shadow-lg">
                        <i class="fas fa-share-alt mr-2"></i>Tạo link chia sẻ
                    </button>
                </div>
            </div>
        `;
    }
}

async function enableShare() {
    if (!currentTreeId || !currentUser) return;
    
    try {
        const result = await apiCall(`/family-trees/${currentTreeId}/share`, {
            method: 'POST',
            body: JSON.stringify({ userId: currentUser.id })
        });
        
        currentShareInfo = result;
        // Tự động render lại modal với thông tin mới
        renderShareModal();
        showToast('Đã tạo link chia sẻ thành công!', 'success');
    } catch (error) {
        console.error('Failed to enable share:', error);
        showToast('Không thể tạo link chia sẻ: ' + error.message, 'error');
    }
}

async function disableShare() {
    if (!currentTreeId || !currentUser) return;
    
    const confirmed = await showConfirm('Bạn có chắc chắn muốn tắt tính năng chia sẻ? Link hiện tại sẽ không còn hoạt động.');
    if (!confirmed) return;
    
    try {
        await apiCall(`/family-trees/${currentTreeId}/share`, {
            method: 'DELETE',
            body: JSON.stringify({ userId: currentUser.id })
        });
        
        currentShareInfo = { isPublic: false, shareUrl: null };
        renderShareModal();
        showToast('Đã tắt tính năng chia sẻ!', 'success');
    } catch (error) {
        console.error('Failed to disable share:', error);
        showToast('Không thể tắt chia sẻ: ' + error.message, 'error');
    }
}

function copyShareLink() {
    const input = document.getElementById('shareUrlInput');
    if (!input) return;
    
    input.select();
    input.setSelectionRange(0, 99999); // For mobile devices
    
    try {
        document.execCommand('copy');
        showToast('Đã sao chép link vào clipboard!', 'success');
    } catch (err) {
        // Fallback: sử dụng Clipboard API
        if (navigator.clipboard) {
            navigator.clipboard.writeText(input.value).then(() => {
                showToast('Đã sao chép link vào clipboard!', 'success');
            }).catch(() => {
                showToast('Không thể sao chép link', 'error');
            });
        } else {
            showToast('Trình duyệt không hỗ trợ sao chép', 'error');
        }
    }
}

