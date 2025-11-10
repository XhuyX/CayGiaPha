// Global variables - chỉ khai báo nếu chưa tồn tại (để tránh conflict với inline scripts)
if (typeof pages === 'undefined') {
    var pages = ['loginPage', 'registerPage', 'treeSelectionPage', 'appPage', 'adminPage'];
}
if (typeof familyTreeInstance === 'undefined') {
    var familyTreeInstance = null;
}
if (typeof currentUser === 'undefined') {
    var currentUser = null;
}
if (typeof currentTreeId === 'undefined') {
    var currentTreeId = null;
}
if (typeof familyTrees === 'undefined') {
    var familyTrees = [];
}
if (typeof mockUsers === 'undefined') {
    var mockUsers = [];
}
if (typeof currentDetailMemberId === 'undefined') {
    var currentDetailMemberId = null;
}
// API_BASE sẽ được override trong view nếu cần
if (typeof API_BASE === 'undefined') {
    var API_BASE = '/api'; // Sử dụng relative path để proxy qua Express
}

// ===== TOAST HELPER =====
function showToast(message, type = 'info') {
    if (typeof toast !== 'undefined' && toast) {
        if (type === 'success') {
            toast.success(message);
        } else if (type === 'error') {
            toast.error(message);
        } else if (type === 'warning') {
            toast.warning(message);
        } else {
            toast.info(message);
        }
    } else {
        // Fallback to alert if toast not available
        alert(message);
    }
}

// ===== API CALLS =====
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Có lỗi xảy ra');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        showToast(`Lỗi: ${error.message}`, 'error');
        throw error;
    }
}

// ===== CHỨC NĂNG HIỂN THỊ TRANG =====
function showPage(pageId) {
    pages.forEach(id => { 
        const page = document.getElementById(id);
        if (page) page.style.display = 'none'; 
    });
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.style.display = 'block';

    if (pageId === 'treeSelectionPage') {
        renderTreeList();
    } else if (pageId === 'appPage' && currentTreeId) {
        loadFamilyTree(currentTreeId);
    } else if (pageId === 'adminPage') {
        renderUserTable();
    }
}

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
        await loadUserFamilyTrees();
        
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

// ===== CHỨC NĂNG QUẢN LÝ CÂY GIA PHẢ =====
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
    // Nếu không có currentUser, thử lấy từ API hoặc dùng treeId để tìm tree
    let userId = null;
    
    if (currentUser && currentUser.id) {
        userId = currentUser.id;
    } else {
        // Thử lấy userId từ tree hiện tại
        const currentTree = familyTrees.find(t => t.id === treeId);
        if (currentTree && currentTree.userId) {
            userId = currentTree.userId;
        } else {
            // Fallback: lấy từ API endpoint khác
            try {
                // Thử lấy tree detail trực tiếp
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
                console.error('❌ Failed to reload via detail endpoint:', e);
            }
            console.error('❌ Cannot reload tree: no userId available');
            return null;
        }
    }
    
    try {
        // Load tất cả trees để có đầy đủ dữ liệu
        const result = await apiCall(`/family-trees/${userId}`);
        const trees = result.trees || [];
        
        // Tìm và cập nhật tree trong array
        const treeIndex = familyTrees.findIndex(t => t.id === treeId);
        const updatedTree = trees.find(t => t.id === treeId);
        
        if (updatedTree) {
            if (treeIndex >= 0) {
                // Cập nhật tree trong array
                familyTrees[treeIndex] = updatedTree;
            } else {
                // Thêm tree mới vào array
                familyTrees.push(updatedTree);
            }
            return updatedTree;
        } else {
        }
        
        return null;
    } catch (error) {
        console.error('❌ Failed to reload tree:', error);
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
    
    // Render với format giống như trong EJS template
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
    // Chuyển đến trang view cây gia phả - routing sẽ xử lý việc load data
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

// Event listener cho form tạo cây - chỉ thêm nếu element tồn tại
// Sử dụng flag để tránh duplicate event listener
if (typeof createTreeFormListenerAdded === 'undefined') {
    var createTreeFormListenerAdded = false;
}

const createTreeFormEl = document.getElementById('createTreeForm');
if (createTreeFormEl && !createTreeFormListenerAdded) {
    createTreeFormListenerAdded = true;
    createTreeFormEl.addEventListener('submit', async function(e) {
        e.preventDefault();
        e.stopPropagation(); // Ngăn event bubble lên
        
        const name = document.getElementById('newTreeName').value.trim();
        const origin = document.getElementById('newTreeOrigin').value.trim();
        const branch = document.getElementById('newTreeBranch').value.trim();
        const description = document.getElementById('newTreeDescription').value.trim();
        
        if (!name) {
            showToast('Tên gia phả là bắt buộc!', 'warning');
            return;
        }
        
        // Lấy userId từ currentUser
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
            
            // Reload trees from server
            await loadUserFamilyTrees();
            
            closeCreateTreeModal();
            showToast('Đã tạo cây gia phả mới thành công!', 'success');
            
            // Cập nhật UI động nếu đang ở trang trees hoặc admin
            if (window.location.pathname === '/trees' || window.location.pathname === '/admin') {
                if (typeof renderTreeList === 'function') {
                    await renderTreeList();
                } else if (typeof renderTreeListLocal === 'function') {
                    await renderTreeListLocal();
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

// ===== CHỨC NĂNG QUẢN LÝ THÀNH VIÊN =====
function loadFamilyTree(treeId) {
    const tree = familyTrees.find(t => t.id === treeId);
    if (!tree) {
        console.error('❌ Tree not found:', treeId);
        return;
    }
    
    const treeElement = document.getElementById('tree');
    if (!treeElement) {
        console.error('❌ Tree element not found in DOM');
        return;
    }
    
    if (!tree.members || tree.members.length === 0) {
        treeElement.innerHTML = `
            <div class="tree-empty">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                </svg>
                <h3 class="text-xl font-semibold mb-2">Chưa có thành viên nào</h3>
                <p class="mb-4">Hãy thêm thành viên đầu tiên vào cây gia phả của bạn</p>
                <button onclick="openAddMemberModal()" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold">
                    ➕ Thêm Thành Viên Đầu Tiên
                </button>
            </div>
        `;
        return;
    }

    // Clear previous instance và DOM
    if (familyTreeInstance) {
        try {
            familyTreeInstance.destroy();
        } catch (e) {
        }
        familyTreeInstance = null;
    }
    
    // Clear DOM để đảm bảo không có element cũ
    treeElement.innerHTML = '';

    // Khởi tạo SimpleFamilyTree (thư viện tự tạo)
    try {
        familyTreeInstance = new SimpleFamilyTree('tree', {
            nodeWidth: 180,
            nodeHeight: 80,
            levelHeight: 150,
            siblingGap: 20
        });
        
        // Load data
        familyTreeInstance.load(tree.members);
    } catch (error) {
        console.error('❌ Error creating/loading tree:', error);
        treeElement.innerHTML = `
            <div class="tree-empty">
                <p class="text-red-600">Lỗi khi tải cây gia phả: ${error.message}</p>
                <button onclick="location.reload()" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold mt-4">
                    🔄 Tải lại trang
                </button>
            </div>
        `;
        return;
    }
    
    // Event: Click vào node
    familyTreeInstance.on('click', function(sender, node) {
        showMemberDetailById(node.id);
    });
    
    // Event: Update node (từ edit form)
    familyTreeInstance.on('update', function(sender, updateInfo) {
        // Update event triggered from edit form
        if (!updateInfo || !updateInfo.updateNodesData || updateInfo.updateNodesData.length === 0) {
            return;
        }
        
        const updatedNode = updateInfo.updateNodesData[0];
        
        if (!updatedNode || !updatedNode.id) {
            return;
        }
        
        // Gọi API update
        const updateData = {
            name: updatedNode.name || '',
            gender: updatedNode.gender || 'male',
            dob: updatedNode.dob || '',
            dod: updatedNode.dod || '',
            img: updatedNode.img || '',
            tieuSu: updatedNode.tieuSu || ''
        };
        
        // Thêm parent relationships nếu có
        if (updatedNode.hasOwnProperty('fid')) {
            updateData.fid = updatedNode.fid || null;
            updateData.relationTypeFather = updatedNode.relationTypeFather || 'Cha ruột';
        }
        if (updatedNode.hasOwnProperty('mid')) {
            updateData.mid = updatedNode.mid || null;
            updateData.relationTypeMother = updatedNode.relationTypeMother || 'Mẹ ruột';
        }
        
        // Thêm tất cả cha mẹ (hỗ trợ nhiều cha mẹ)
        // QUAN TRỌNG: Luôn gửi allFathers và allMothers (có thể là mảng rỗng) để backend có thể xóa quan hệ cũ
        if (updatedNode.hasOwnProperty('allFathers')) {
            updateData.allFathers = Array.isArray(updatedNode.allFathers) ? updatedNode.allFathers : [];
        } else {
            // Nếu không có allFathers nhưng có fid, tạo mảng từ fid
            if (updatedNode.fid) {
                updateData.allFathers = [{
                    id: updatedNode.fid,
                    relationType: updatedNode.relationTypeFather || 'Cha ruột'
                }];
            } else {
                updateData.allFathers = [];
            }
        }
        if (updatedNode.hasOwnProperty('allMothers')) {
            updateData.allMothers = Array.isArray(updatedNode.allMothers) ? updatedNode.allMothers : [];
        } else {
            // Nếu không có allMothers nhưng có mid, tạo mảng từ mid
            if (updatedNode.mid) {
                updateData.allMothers = [{
                    id: updatedNode.mid,
                    relationType: updatedNode.relationTypeMother || 'Mẹ ruột'
                }];
            } else {
                updateData.allMothers = [];
            }
        }
        
        // Thêm marital status và spouse nếu có
        // QUAN TRỌNG: Luôn gửi maritalStatus và pids để backend có thể xóa quan hệ hôn nhân
        if (updatedNode.hasOwnProperty('maritalStatus')) {
            updateData.maritalStatus = updatedNode.maritalStatus;
        }
        // Luôn gửi pids (có thể là mảng rỗng để xóa quan hệ)
        if (updatedNode.hasOwnProperty('pids')) {
            updateData.pids = updatedNode.pids || [];
        } else if (updatedNode.hasOwnProperty('maritalStatus')) {
            // Nếu có maritalStatus nhưng không có pids, gửi pids = []
            updateData.pids = [];
        }
        if (updatedNode.hasOwnProperty('spouseId')) {
            updateData.spouseId = updatedNode.spouseId;
        }
        
        apiCall(`/members/${updatedNode.id}`, {
            method: 'PUT',
            body: JSON.stringify(updateData)
        })
        .then(async () => {
            // Update successful - reload tree từ server với đầy đủ members
            const reloaded = await reloadTreeById(currentTreeId);
            if (!reloaded) {
                console.error('❌ Failed to reload tree data');
                showToast('Thành viên đã được cập nhật nhưng không thể reload tree. Vui lòng refresh trang.', 'warning');
                return;
            }
            
            // Đợi một chút để đảm bảo DOM đã sẵn sàng
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Reload visualization
            loadFamilyTree(currentTreeId);
            showToast('Cập nhật thành công!', 'success');
        })
        .catch(error => {
            console.error('❌ Update failed:', error);
            showToast('Lỗi cập nhật: ' + error.message, 'error');
            location.reload();
        });
    });
    
    // Event: Remove node
    familyTreeInstance.on('remove', async function(sender, nodeId) {
        try {
            await apiCall(`/members/${nodeId}`, {
                method: 'DELETE'
            });
            
            
            // Reload tree từ server với đầy đủ members
            const reloaded = await reloadTreeById(currentTreeId);
            if (!reloaded) {
                console.error('❌ Failed to reload tree data');
                showToast('Thành viên đã được xóa nhưng không thể reload tree. Vui lòng refresh trang.', 'warning');
                return;
            }
            
            // Đợi một chút để đảm bảo DOM đã sẵn sàng
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Reload visualization
            loadFamilyTree(currentTreeId);
            
            showToast('Đã xóa thành viên thành công!', 'success');
        } catch (error) {
            console.error('❌ Delete failed:', error);
            showToast('Lỗi xóa thành viên: ' + error.message, 'error');
        }
    });
}

// Modal thêm thành viên
// Biến đếm để tạo ID unique cho mỗi row cha/mẹ
let fatherRowCount = 0;
let motherRowCount = 0;

function addFatherRow() {
    const tree = familyTrees.find(t => t.id === currentTreeId);
    if (!tree) return;
    
    const fatherList = document.getElementById('fatherList');
    const rowId = `father-row-${fatherRowCount++}`;
    
    const row = document.createElement('div');
    row.id = rowId;
    row.className = 'flex gap-2 items-end';
    row.innerHTML = `
        <div class="flex-1">
            <select class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 father-select" data-row-id="${rowId}">
                <option value="">-- Chọn Bố --</option>
                ${tree.members.filter(m => m.gender === 'male').map(m => 
                    `<option value="${m.id}">${m.name}</option>`
                ).join('')}
            </select>
        </div>
        <div class="flex-1">
            <select class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 father-relation-select" data-row-id="${rowId}">
                <option value="Cha ruột">Cha ruột</option>
                <option value="Cha nuôi">Cha nuôi</option>
            </select>
        </div>
        <button type="button" onclick="removeParentRow('${rowId}')" class="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition">×</button>
    `;
    
    fatherList.appendChild(row);
}

function addMotherRow() {
    const tree = familyTrees.find(t => t.id === currentTreeId);
    if (!tree) return;
    
    const motherList = document.getElementById('motherList');
    const rowId = `mother-row-${motherRowCount++}`;
    
    const row = document.createElement('div');
    row.id = rowId;
    row.className = 'flex gap-2 items-end';
    row.innerHTML = `
        <div class="flex-1">
            <select class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 mother-select" data-row-id="${rowId}">
                <option value="">-- Chọn Mẹ --</option>
                ${tree.members.filter(m => m.gender === 'female').map(m => 
                    `<option value="${m.id}">${m.name}</option>`
                ).join('')}
            </select>
        </div>
        <div class="flex-1">
            <select class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 mother-relation-select" data-row-id="${rowId}">
                <option value="Mẹ ruột">Mẹ ruột</option>
                <option value="Mẹ nuôi">Mẹ nuôi</option>
            </select>
        </div>
        <button type="button" onclick="removeParentRow('${rowId}')" class="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition">×</button>
    `;
    
    motherList.appendChild(row);
}

function removeParentRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
    }
}

function openAddMemberModal() {
    const tree = familyTrees.find(t => t.id === currentTreeId);
    if (!tree) {
        showToast('Vui lòng chọn một cây gia phả trước!', 'warning');
        return;
    }
    
    document.getElementById('addMemberModal').classList.add('active');
    document.body.classList.add('modal-active');
    document.getElementById('addMemberForm').reset();
    updateParentSelect();
    
    // Clear và reset parent lists
    document.getElementById('fatherList').innerHTML = '';
    document.getElementById('motherList').innerHTML = '';
    fatherRowCount = 0;
    motherRowCount = 0;
}

function closeAddMemberModal() {
    document.getElementById('addMemberModal').classList.remove('active');
    document.body.classList.remove('modal-active');
}

function updateParentSelect() {
    const tree = familyTrees.find(t => t.id === currentTreeId);
    if (!tree) return;
    
    // Update parent select
    const parentSelect = document.getElementById('memberParent');
    if (parentSelect) {
    parentSelect.innerHTML = '<option value="">-- Chọn --</option>';
    tree.members.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = `${member.name} (ID: ${member.id})`;
        parentSelect.appendChild(option);
    });
}

    // Update spouse select
    const spouseSelect = document.getElementById('memberSpouse');
    if (spouseSelect) {
        spouseSelect.innerHTML = '<option value="">-- Chọn --</option>';
        tree.members.forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = `${member.name} (${member.gender === 'male' ? 'Nam' : 'Nữ'})`;
            spouseSelect.appendChild(option);
        });
    }
}

// Event listener cho tình trạng hôn nhân - chỉ thêm nếu element tồn tại
const memberMaritalStatusEl = document.getElementById('memberMaritalStatus');
if (memberMaritalStatusEl) {
    memberMaritalStatusEl.addEventListener('change', function() {
        const spouseDiv = document.getElementById('spouseSelectDiv');
        
        if (spouseDiv) {
            if (this.value === 'married') {
                spouseDiv.classList.remove('hidden');
                updateParentSelect(); // Update spouse list
            } else {
                spouseDiv.classList.add('hidden');
            }
        }
    });
}

const addMemberFormEl = document.getElementById('addMemberForm');
if (addMemberFormEl) {
    addMemberFormEl.addEventListener('submit', async function(e) {
        e.preventDefault();
    
    const tree = familyTrees.find(t => t.id === currentTreeId);
    if (!tree) {
        showToast('Không tìm thấy cây gia phả!', 'error');
        return;
    }
    
    const name = document.getElementById('memberName').value.trim();
    const gender = document.getElementById('memberGender').value;
    const dob = document.getElementById('memberDob').value.trim();
    const dod = document.getElementById('memberDod').value.trim();
    const maritalStatus = document.getElementById('memberMaritalStatus').value;
    const spouseId = document.getElementById('memberSpouse').value;
    const imgUrl = document.getElementById('memberImg').value.trim();
    const bio = document.getElementById('memberBio').value.trim();
    
    // Thu thập tất cả các bố
    const fatherSelects = document.querySelectorAll('.father-select');
    const fatherRelationSelects = document.querySelectorAll('.father-relation-select');
    const fathers = [];
    fatherSelects.forEach((select, index) => {
        if (select.value) {
            fathers.push({
                id: parseInt(select.value),
                relationType: fatherRelationSelects[index].value
            });
        }
    });
    
    // Thu thập tất cả các mẹ
    const motherSelects = document.querySelectorAll('.mother-select');
    const motherRelationSelects = document.querySelectorAll('.mother-relation-select');
    const mothers = [];
    motherSelects.forEach((select, index) => {
        if (select.value) {
            mothers.push({
                id: parseInt(select.value),
                relationType: motherRelationSelects[index].value
            });
        }
    });
    
    const defaultImg = '';
    
    const memberData = { 
        name, 
        gender, 
        img: imgUrl || defaultImg,
        tieuSu: bio
    };
    
    if (dob) memberData.dob = dob;
    if (dod) memberData.dod = dod;
    
    // Xử lý vợ/chồng
    if (maritalStatus === 'married' && spouseId) {
        memberData.pids = [parseInt(spouseId)];
    }
    
    // Xử lý nhiều bố và mẹ
    // Ưu tiên bố/mẹ ruột cho cây gia phả (để hiển thị)
    const biologicalFather = fathers.find(f => f.relationType === 'Cha ruột');
    const biologicalMother = mothers.find(m => m.relationType === 'Mẹ ruột');
    
    if (biologicalFather) {
        memberData.fid = biologicalFather.id;
        memberData.relationTypeFather = 'Cha ruột';
    } else if (fathers.length > 0) {
        // Nếu không có cha ruột, lấy cha đầu tiên
        memberData.fid = fathers[0].id;
        memberData.relationTypeFather = fathers[0].relationType;
    }
    
    if (biologicalMother) {
        memberData.mid = biologicalMother.id;
        memberData.relationTypeMother = 'Mẹ ruột';
    } else if (mothers.length > 0) {
        // Nếu không có mẹ ruột, lấy mẹ đầu tiên
        memberData.mid = mothers[0].id;
        memberData.relationTypeMother = mothers[0].relationType;
    }
    
    // Lưu tất cả cha mẹ để gửi lên backend
    memberData.allFathers = fathers;
    memberData.allMothers = mothers;
    
    try {
        const result = await apiCall(`/family-trees/${currentTreeId}/members`, {
            method: 'POST',
            body: JSON.stringify(memberData)
        });
        
        
        // Reload tree từ server với đầy đủ members
        const reloaded = await reloadTreeById(currentTreeId);
        if (!reloaded) {
            console.error('❌ Failed to reload tree data');
            showToast('Thành viên đã được thêm nhưng không thể reload tree. Vui lòng refresh trang.', 'warning');
            return;
        }
        
        // Đợi một chút để đảm bảo DOM đã sẵn sàng
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Reload cây hiển thị
        loadFamilyTree(currentTreeId);
        
        closeAddMemberModal();
        showToast('Đã thêm thành viên mới thành công!', 'success');
    } catch (error) {
        console.error('Failed to add member:', error);
    }
    });
}

// Hàm hiển thị chi tiết thành viên
async function showMemberDetailById(nodeId) {
    try {
        const result = await apiCall(`/members/${nodeId}`);
        const member = result.member;
    
    const detailContent = document.getElementById('memberDetailContent');
    
    let html = `
        <div class="flex items-start space-x-4">
            <img src="${member.img}" alt="${member.name}" class="w-24 h-24 rounded-full object-cover border-2 border-gray-300">
            <div>
                <h3 class="text-xl font-bold">${member.name}</h3>
                <p class="text-gray-600">${member.gender === 'male' ? 'Nam' : 'Nữ'}</p>
                <p class="text-sm text-gray-500">
                    ${member.dob ? `Sinh: ${member.dob}` : ''} 
                    ${member.dod ? ` - Mất: ${member.dod}` : member.dob ? ' (Còn sống)' : ''}
                </p>
            </div>
        </div>
    `;
    
    // Tình trạng hôn nhân
    if (!member.dod && member.family.partners.length > 0) {
        html += `
            <div class="bg-pink-50 p-3 rounded">
                <strong>Vợ/Chồng:</strong>
                <ul class="list-disc list-inside mt-1">
                    ${member.family.partners.map(p => `<li>${p.PartnerName}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    // Tiểu sử
    if (member.tieuSu) {
        html += `
            <div class="bg-blue-50 p-3 rounded">
                <strong>Tiểu sử:</strong>
                <p class="mt-1 text-gray-700 whitespace-pre-wrap">${member.tieuSu}</p>
            </div>
        `;
    }
    
        // Cha mẹ
        if (member.family.parents.length > 0) {
            const fathers = member.family.parents.filter(p => p.LoaiQuanHe.includes('Cha'));
            const mothers = member.family.parents.filter(p => p.LoaiQuanHe.includes('Mẹ'));
            
            html += `<div class="bg-green-50 p-3 rounded"><strong>Gia đình:</strong><ul class="list-disc list-inside mt-1">`;
            
            if (fathers.length > 0) {
                fathers.forEach(f => {
                    const type = f.LoaiQuanHe === 'Cha ruột' ? ' (ruột)' : ' (nuôi)';
                    html += `<li>Cha: ${f.ParentName}${type}</li>`;
                });
            }
            
            if (mothers.length > 0) {
                mothers.forEach(m => {
                    const type = m.LoaiQuanHe === 'Mẹ ruột' ? ' (ruột)' : ' (nuôi)';
                    html += `<li>Mẹ: ${m.ParentName}${type}</li>`;
                });
            }
            
        html += `</ul></div>`;
    }
    
    // Con cái
    if (member.family.children.length > 0) {
        html += `
            <div class="bg-yellow-50 p-3 rounded">
                <strong>Con cái (${member.family.children.length}):</strong>
                <ul class="list-disc list-inside mt-1">
                    ${member.family.children.map(c => {
                        const type = c.LoaiQuanHe.includes('ruột') ? ' (ruột)' : ' (nuôi)';
                        return `<li>${c.ChildName}${type}</li>`;
                    }).join('')}
                </ul>
            </div>
        `;
    }
    
    detailContent.innerHTML = html;
        currentDetailMemberId = nodeId;
    document.getElementById('memberDetailModal').classList.add('active');
    document.body.classList.add('modal-active');
    } catch (error) {
        console.error('Failed to load member details:', error);
    }
}

function closeMemberDetailModal() {
    document.getElementById('memberDetailModal').classList.remove('active');
    document.body.classList.remove('modal-active');
    currentDetailMemberId = null;
}

function editCurrentMember() {
    // Lưu memberId vào biến local TRƯỚC KHI đóng modal (vì closeMemberDetailModal sẽ set currentDetailMemberId = null)
    const memberId = currentDetailMemberId;
    
    if (!memberId) {
        console.error('❌ editCurrentMember: currentDetailMemberId is null');
        return;
    }
    
    closeMemberDetailModal();
    
    // Đợi một chút để modal đóng xong
    setTimeout(() => {
        // Open edit form
        if (familyTreeInstance) {
            const node = familyTreeInstance.nodes.find(n => n.id === memberId);
            if (node) {
                familyTreeInstance.showEditForm(node);
            } else {
                console.error('Node not found with id:', memberId);
                showToast('Không tìm thấy thành viên trong cây gia phả. Vui lòng thử lại.', 'warning');
            }
        } else {
            console.error('familyTreeInstance is null');
        }
    }, 100);
}

function deleteCurrentMember() {
    if (!currentDetailMemberId) return;
    
    // Tìm node trong family tree
    if (familyTreeInstance) {
        const node = familyTreeInstance.nodes.find(n => n.id === currentDetailMemberId);
        if (node) {
            // Gọi removeNode - nó sẽ hiển thị confirm và trigger event 'remove'
            familyTreeInstance.removeNode(node);
            // Đóng modal sau khi confirm
            closeMemberDetailModal();
        }
    }
}

// ===== UC-08: TÌM KIẾM THÀNH VIÊN =====
async function performSearch() {
    const searchQuery = document.getElementById('searchMemberInput').value.trim();
    
    console.log('🔍 Frontend search - query:', searchQuery, 'treeId:', currentTreeId);
    
    if (!searchQuery) {
        if (typeof showToast !== 'undefined') {
            showToast('Vui lòng nhập từ khóa tìm kiếm!', 'warning');
        }
        return;
    }

    if (!currentTreeId) {
        if (typeof showToast !== 'undefined') {
            showToast('Vui lòng chọn cây gia phả trước!', 'warning');
        }
        return;
    }
    
    try {
        const searchUrl = `/family-trees/${currentTreeId}/search?q=${encodeURIComponent(searchQuery)}`;
        console.log('🔍 Calling API:', searchUrl);
        
        const result = await apiCall(searchUrl);
        
        console.log('📊 Search result:', result);
        
        // Kiểm tra nhiều format có thể có của kết quả
        const members = result.members || result.data || result.results || [];
        
        console.log('📋 Members found:', members.length);
        
        
        if (!members || members.length === 0) {
            document.getElementById('searchResultContent').innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <p class="text-lg">Không tìm thấy thành viên nào.</p>
                    <p class="text-sm mt-2">Thử tìm kiếm với từ khóa khác.</p>
                </div>
            `;
        } else {
            let html = '<ul class="space-y-2">';
            members.forEach(member => {
                // Hỗ trợ cả hai format dữ liệu từ backend
                let dob, dod, yearInfo;
                if (member.NgaySinh || member.NgayMat) {
                    // Format cũ: NgaySinh, NgayMat
                    dob = member.NgaySinh ? new Date(member.NgaySinh).getUTCFullYear() : (member.dob || '?');
                    dod = member.NgayMat ? new Date(member.NgayMat).getUTCFullYear() : (member.dod || '');
                } else {
                    // Format mới: dob, dod (string)
                    dob = member.dob || '?';
                    dod = member.dod || '';
                }
                yearInfo = dod ? `${dob} - ${dod}` : dob;
                
                // Sử dụng member.id hoặc member.MaThanhVien tùy vào cấu trúc dữ liệu backend trả về
                const memberId = member.id || member.MaThanhVien || member.memberId;
                html += `
                    <li class="border border-gray-200 rounded p-3 hover:bg-blue-50 cursor-pointer transition" 
                        onclick="highlightAndShowMember(${memberId})">
                        <div class="flex items-center gap-3">
                            <img src="${member.img || member.AnhDaiDienURL || ''}" 
                                alt="${member.name || member.HoVaTen}" class="w-12 h-12 rounded-full object-cover">
                            <div>
                                <div class="font-semibold text-gray-900">${member.name || member.HoVaTen}</div>
                                <div class="text-sm text-gray-600">${(member.gender || member.GioiTinh) === 'male' ? 'Nam' : 'Nữ'} • ${yearInfo}</div>
                            </div>
                        </div>
                    </li>
                `;
            });
            html += '</ul>';
            document.getElementById('searchResultContent').innerHTML = html;
        }
        
        document.getElementById('searchResultModal').classList.add('active');
        document.body.classList.add('modal-active');
    } catch (error) {
        console.error('Search failed:', error);
        showToast('Lỗi tìm kiếm: ' + error.message, 'error');
    }
}

function closeSearchResultModal() {
    document.getElementById('searchResultModal').classList.remove('active');
    document.body.classList.remove('modal-active');
}

function highlightAndShowMember(memberId) {
    closeSearchResultModal();
    
    // Highlight node trên cây
    if (familyTreeInstance) {
        // Tìm và highlight node
        const nodeElement = document.querySelector(`[data-node-id="${memberId}"]`);
        if (nodeElement) {
            // Scroll to node (scroll container instead)
            const treeContainer = document.getElementById('tree');
            if (treeContainer) {
                const svg = treeContainer.querySelector('svg');
                if (svg) {
                    const nodeTransform = nodeElement.getAttribute('transform');
                    const match = nodeTransform.match(/translate\(([^,]+),([^)]+)\)/);
                    if (match) {
                        const x = parseFloat(match[1]);
                        const y = parseFloat(match[2]);
                        
                        // Scroll to center the node
                        const containerRect = treeContainer.getBoundingClientRect();
                        const scrollX = x - containerRect.width / 2 + 100;
                        const scrollY = y - containerRect.height / 2 + 100;
                        
                        treeContainer.scrollTo({
                            left: scrollX,
                            top: scrollY,
                            behavior: 'smooth'
                        });
                    }
                }
            }
            
            // Highlight effect - thêm class highlight
            nodeElement.classList.add('highlighted-node');
            
            // Tìm rect element trong node để đổi màu stroke
            const rect = nodeElement.querySelector('rect[stroke]');
            if (rect) {
                const originalStroke = rect.getAttribute('stroke');
                rect.setAttribute('stroke', '#ffff00');
                rect.setAttribute('stroke-width', '5');

    setTimeout(() => {
                    rect.setAttribute('stroke', originalStroke);
                    rect.setAttribute('stroke-width', '3');
                    nodeElement.classList.remove('highlighted-node');
                }, 2000);
            }
        }
    }
    
    // Hiển thị chi tiết
    showMemberDetailById(memberId);
}

// Cho phép Enter để tìm kiếm
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchMemberInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
});

// ===== CHỨC NĂNG QUẢN TRỊ =====
async function toggleUserStatus(userId) {
    try {
        const user = mockUsers.find(u => u.id === userId);
        if (!user) return;
        
        await apiCall(`/admin/users/${userId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ active: !user.active })
        });
        
        user.active = !user.active;
        renderUserTable();
    } catch (error) {
        console.error('Failed to toggle user status:', error);
    }
}

async function renderUserTable() {
    try {
        const result = await apiCall('/admin/users');
        mockUsers = result.users.map(user => ({
            id: user.MaNguoiDung,
            username: user.TenDangNhap,
            email: user.Email,
            created: new Date(user.NgayTao).toISOString().split('T')[0],
            active: user.TrangThaiHoatDong
        }));
        
        const tableBody = document.getElementById('user-table-body');
        tableBody.innerHTML = '';
        
        mockUsers.forEach(user => {
            const statusClass = user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
            const statusText = user.active ? 'Hoạt động' : 'Bị khóa';
            const buttonClass = user.active ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600';
            const buttonText = user.active ? 'Khóa' : 'Mở khóa';
            
            const row = `
                <tr class="border-b hover:bg-gray-50">
                    <td class="py-3 px-4">${user.username}</td>
                    <td class="py-3 px-4">${user.email}</td>
                    <td class="py-3 px-4">${user.created}</td>
                    <td class="py-3 px-4 text-center"><span class="px-2 py-1 font-semibold leading-tight text-xs rounded-full ${statusClass}">${statusText}</span></td>
                    <td class="py-3 px-4 text-center"><button onclick="toggleUserStatus(${user.id})" class="px-3 py-1 text-white text-sm font-bold rounded-md ${buttonClass}">${buttonText}</button></td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

// ===== KHỞI ĐỘNG ỨNG DỤNG =====
showPage('loginPage');

// Thêm event listener cho nút đăng ký
const registerButton = document.querySelector('#registerPage button[onclick*="treeSelectionPage"]');
if (registerButton) {
    registerButton.onclick = handleRegister;
}

