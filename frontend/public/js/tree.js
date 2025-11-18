// Tree management functions

async function loadUserFamilyTrees() {
    if (!currentUser) return;
    
    try {
        const result = await apiCall(`/family-trees/${currentUser.id}`);
        familyTrees = result.trees || [];
    } catch (error) {
        console.error('Failed to load family trees:', error);
        familyTrees = [];
    }
}

// Reload một tree cụ thể với đầy đủ members từ server
async function reloadTreeById(treeId) {
    let userId = null;
    
    if (currentUser && currentUser.id) {
        userId = currentUser.id;
    } else {
        const currentTree = familyTrees.find(t => t.id === treeId);
        if (currentTree && currentTree.userId) {
            userId = currentTree.userId;
        } else {
            try {
                const detailResult = await apiCall(`/family-trees/detail/${treeId}`);
                if (detailResult.tree) {
                    const updatedTree = detailResult.tree;
                    const treeIndex = familyTrees.findIndex(t => t.id === treeId);
                    if (treeIndex >= 0) {
                        familyTrees[treeIndex] = updatedTree;
                    } else {
                        familyTrees.push(updatedTree);
                    }
                    return updatedTree;
                }
            } catch (e) {
                console.error('Failed to reload via detail endpoint:', e);
            }
            console.error('Cannot reload tree: no userId available');
            return null;
        }
    }
    
    try {
        const result = await apiCall(`/family-trees/${userId}`);
        const trees = result.trees || [];
        
        const treeIndex = familyTrees.findIndex(t => t.id === treeId);
        const updatedTree = trees.find(t => t.id === treeId);
        
        if (updatedTree) {
            if (treeIndex >= 0) {
                familyTrees[treeIndex] = updatedTree;
            } else {
                familyTrees.push(updatedTree);
            }
            return updatedTree;
        }
        
        return null;
    } catch (error) {
        console.error('Failed to reload tree:', error);
        return null;
    }
}

async function renderTreeList() {
    await loadUserFamilyTrees();
    
    const container = document.getElementById('treeListContainer');
    const noTreesMsg = document.getElementById('noTreesMessage');
    
    if (!container) {
        return;
    }
    
    if (!familyTrees || familyTrees.length === 0) {
        container.innerHTML = '';
        if (noTreesMsg) {
            noTreesMsg.classList.remove('hidden');
        }
        return;
    }
    
    if (noTreesMsg) {
        noTreesMsg.classList.add('hidden');
    }
    
    container.innerHTML = familyTrees.map(tree => `
        <div onclick="selectTree(${tree.id})" 
            class="tree-card bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md p-6 border-2 border-gray-200 hover:border-blue-400 transition-all cursor-pointer hover-lift">
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <h3 class="text-xl font-bold text-gray-800 mb-2">
                        <i class="fas fa-tree text-blue-600 mr-2"></i>${tree.name || 'Chưa có tên'}
                    </h3>
                    <div class="space-y-2 text-sm text-gray-600">
                        ${tree.origin ? `
                            <p class="flex items-center">
                                <i class="fas fa-map-marker-alt text-blue-500 mr-2 w-4"></i>
                                <span>${tree.origin}</span>
                            </p>
                        ` : ''}
                        ${tree.branch ? `
                            <p class="flex items-center">
                                <i class="fas fa-code-branch text-indigo-500 mr-2 w-4"></i>
                                <span>${tree.branch}</span>
                            </p>
                        ` : ''}
                    </div>
                </div>
                <button onclick="event.stopPropagation(); deleteTree(${tree.id})" 
                    class="text-red-500 hover:text-red-700 transition p-2 hover:bg-red-50 rounded-lg">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="mt-4 pt-4 border-t border-gray-200">
                <p class="text-sm text-gray-500 flex items-center">
                    <i class="fas fa-users text-gray-400 mr-2"></i>
                    <strong class="text-gray-700">${tree.members ? tree.members.length : 0}</strong> thành viên
                </p>
            </div>
        </div>
    `).join('');
}

function selectTree(treeId) {
    window.location.href = `/tree/${treeId}`;
}

async function deleteTree(treeId) {
    const confirmed = await showConfirm('Bạn có chắc chắn muốn xóa cây gia phả này không? Hành động này không thể hoàn tác!');
    if (!confirmed) {
        return;
    }
    
    try {
        await apiCall(`/family-trees/${treeId}`, {
            method: 'DELETE'
        });
        
        familyTrees = familyTrees.filter(t => t.id !== treeId);
        
        if (currentTreeId === treeId) {
            currentTreeId = null;
            familyTreeInstance = null;
        }
        
        renderTreeList();
        showToast('Đã xóa cây gia phả thành công!', 'success');
    } catch (error) {
        console.error('Failed to delete tree:', error);
    }
}

function openCreateTreeModal() {
    document.getElementById('createTreeModal').classList.add('active');
    document.body.classList.add('modal-active');
    document.getElementById('createTreeForm').reset();
}

function closeCreateTreeModal() {
    document.getElementById('createTreeModal').classList.remove('active');
    document.body.classList.remove('modal-active');
}

// Event listener cho form tạo cây
if (typeof createTreeFormListenerAdded === 'undefined') {
    var createTreeFormListenerAdded = false;
}

const createTreeFormEl = document.getElementById('createTreeForm');
if (createTreeFormEl && !createTreeFormListenerAdded) {
    createTreeFormListenerAdded = true;
    createTreeFormEl.addEventListener('submit', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const name = document.getElementById('newTreeName').value.trim();
        const origin = document.getElementById('newTreeOrigin').value.trim();
        const branch = document.getElementById('newTreeBranch').value.trim();
        const description = document.getElementById('newTreeDescription').value.trim();
        
        if (!name) {
            showToast('Tên gia phả là bắt buộc!', 'warning');
            return;
        }
        
        let userId = null;
        if (currentUser && currentUser.id) {
            userId = currentUser.id;
        }
        
        if (!userId) {
            showToast('Lỗi: Không xác định được người dùng. Vui lòng đăng nhập lại!', 'error');
            return;
        }
        
        try {
            const result = await apiCall('/family-trees', {
                method: 'POST',
                body: JSON.stringify({
                    userId: userId,
                    name: name,
                    origin: origin || null,
                    branch: branch || null,
                    description: description || null
                })
            });
            
            await loadUserFamilyTrees();
            
            closeCreateTreeModal();
            showToast('Đã tạo cây gia phả mới thành công!', 'success');
            
            if (window.location.pathname === '/trees' || window.location.pathname === '/admin') {
                if (typeof renderTreeList === 'function') {
                    await renderTreeList();
                } else {
                    window.location.reload();
                }
            } else {
                window.location.href = '/trees';
            }
        } catch (error) {
            console.error('Failed to create tree:', error);
        }
    });
}

