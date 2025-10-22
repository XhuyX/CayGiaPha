    
    
    const pages = ['loginPage', 'registerPage', 'treeSelectionPage', 'appPage', 'adminPage'];
    let familyTreeInstance = null;
    let currentUser = null;
    let currentTreeId = null;
    
    // Dữ liệu mẫu cho cây gia phả
    let familyTrees = [
        {
            id: 1,
            name: "Gia phả dòng họ Trần Lê",
            origin: "Làng Mẹo, Thái Bình",
            branch: "Chi thứ nhất",
            description: "Dòng họ Trần Lê có nguồn gốc từ Thái Bình, được truyền qua nhiều thế hệ",
            members: [
                {id: 1, pids: [2], name: "Trần Văn A", gender: "male", dob: "1940", dod: "2010", img: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" },
                {id: 2, pids: [1], name: "Lê Thị B", gender: "female", dob: "1945", dod: "2015", img: "https://cdn-icons-png.flaticon.com/512/3135/3135789.png" },
                {id: 3, mid: 2, fid: 1, name: "Trần Văn C", gender: "male", dob: "1965", img: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" },
                {id: 4, mid: 2, pids: [5], fid: 1, name: "Trần Thị D", gender: "female", dob: "1968", img: "https://cdn-icons-png.flaticon.com/512/3135/3135789.png" },
                {id: 5, pids: [4], name: "Nguyễn Văn E", gender: "male", dob: "1966", img: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" },
                {id: 6, mid: 4, fid: 5, name: "Nguyễn Trần F", gender: "male", dob: "1995", img: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" },
                {id: 7, mid: 2, fid: 1, name: "Trần Văn G", gender: "male", dob: "1972", img: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" },
                {id: 8, mid: 2, fid: 1, name: "Trần Thị H", gender: "female", dob: "1975", img: "https://cdn-icons-png.flaticon.com/512/3135/3135789.png" }
            ]
        },
        {
            id: 2,
            name: "Gia phả dòng họ Nguyễn",
            origin: "Huế, Thừa Thiên Huế",
            branch: "Chi thứ hai",
            description: "Dòng họ Nguyễn có truyền thống lâu đời tại Huế",
            members: [
                {id: 1, pids: [2], name: "Nguyễn Văn X", gender: "male", dob: "1950", img: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" },
                {id: 2, pids: [1], name: "Trần Thị Y", gender: "female", dob: "1952", img: "https://cdn-icons-png.flaticon.com/512/3135/3135789.png" },
                {id: 3, mid: 2, fid: 1, name: "Nguyễn Văn Z", gender: "male", dob: "1975", img: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png" }
            ]
        }
    ];

    let mockUsers = [
        { id: 1, username: 'nguoidung1', email: 'nguoidung1@email.com', created: '2023-10-26', active: true },
        { id: 2, username: 'thanhvien2', email: 'tv2@email.com', created: '2023-10-25', active: true },
        { id: 3, username: 'user_tam_khoa', email: 'user3@email.com', created: '2023-10-24', active: false },
    ];

    // ===== CHỨC NĂNG TẢI XUỐNG VÀ TẢI LÊN JSON =====
    
    function downloadJSON() {
        const data = {
            familyTrees: familyTrees,
            mockUsers: mockUsers,
            exportDate: new Date().toISOString()
        };
        
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `gia-pha-data-${new Date().getTime()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('Đã tải xuống file JSON thành công!');
    }
    
    function uploadJSON(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.familyTrees) {
                    familyTrees = data.familyTrees;
                }
                if (data.mockUsers) {
                    mockUsers = data.mockUsers;
                }
                
                alert('Đã tải lên và nhập dữ liệu thành công!');
                
                // Reset current state
                currentTreeId = null;
                familyTreeInstance = null;
                
                // Reload current page
                if (document.getElementById('treeSelectionPage').style.display !== 'none') {
                    renderTreeList();
                } else if (document.getElementById('adminPage').style.display !== 'none') {
                    renderUserTable();
                }
                
            } catch (error) {
                alert('Lỗi: File JSON không hợp lệ! ' + error.message);
            }
        };
        reader.readAsText(file);
        
        // Reset input
        event.target.value = '';
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

    function handleLogin() {
        const username = document.getElementById('usernameInput').value.trim();
        currentUser = username || 'Người Dùng';
        
        const usernameDisplays = document.querySelectorAll('#currentUsername, #currentUsername2');
        usernameDisplays.forEach(el => el.textContent = currentUser);
        
        if (username.toLowerCase() === 'admin') {
            showPage('adminPage');
        } else {
            showPage('treeSelectionPage');
        }
    }

    // ===== CHỨC NĂNG QUẢN LÝ CÂY GIA PHẢ =====

    function renderTreeList() {
        const container = document.getElementById('treeListContainer');
        const noTreesMsg = document.getElementById('noTreesMessage');
        
        if (familyTrees.length === 0) {
            container.innerHTML = '';
            noTreesMsg.classList.remove('hidden');
            return;
        }
        
        noTreesMsg.classList.add('hidden');
        container.innerHTML = familyTrees.map(tree => `
            <div class="tree-card bg-white rounded-lg shadow-md p-6 border-2 border-gray-200" onclick="selectTree(${tree.id})">
                <div class="flex justify-between items-start mb-3">
                    <h3 class="text-xl font-bold text-gray-800">${tree.name}</h3>
                    <button onclick="event.stopPropagation(); deleteTree(${tree.id})" class="text-red-500 hover:text-red-700" title="Xóa cây gia phả">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
                <div class="space-y-2 text-sm text-gray-600">
                    <p><strong>Nơi bắt nguồn:</strong> ${tree.origin || 'Chưa có thông tin'}</p>
                    <p><strong>Tên chi:</strong> ${tree.branch || 'Chưa có thông tin'}</p>
                    <p class="text-xs text-gray-500 mt-2">${tree.description || ''}</p>
                </div>
                <div class="mt-4 pt-4 border-t border-gray-200">
                    <p class="text-sm text-gray-500">Số thành viên: <strong>${tree.members.length}</strong></p>
                </div>
            </div>
        `).join('');
    }

    function selectTree(treeId) {
        currentTreeId = treeId;
        const tree = familyTrees.find(t => t.id === treeId);
        if (tree) {
            document.getElementById('currentTreeName').textContent = tree.name;
            document.getElementById('treeTitle').textContent = tree.name;
            document.getElementById('treeDescription').textContent = tree.origin ? `Nơi bắt nguồn: ${tree.origin}` : '';
            showPage('appPage');
        }
    }

    function deleteTree(treeId) {
        if (!confirm('Bạn có chắc chắn muốn xóa cây gia phả này không? Hành động này không thể hoàn tác!')) {
            return;
        }
        
        familyTrees = familyTrees.filter(t => t.id !== treeId);
        
        if (currentTreeId === treeId) {
            currentTreeId = null;
            familyTreeInstance = null;
        }
        
        renderTreeList();
        alert('Đã xóa cây gia phả thành công!');
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

    document.getElementById('createTreeForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('newTreeName').value.trim();
        const origin = document.getElementById('newTreeOrigin').value.trim();
        const branch = document.getElementById('newTreeBranch').value.trim();
        const description = document.getElementById('newTreeDescription').value.trim();
        
        if (!name) {
            alert('Tên gia phả là bắt buộc!');
            return;
        }
        
        const newId = familyTrees.length > 0 ? Math.max(...familyTrees.map(t => t.id)) + 1 : 1;
        
        const newTree = {
            id: newId,
            name: name,
            origin: origin,
            branch: branch,
            description: description,
            members: []
        };
        
        familyTrees.push(newTree);
        
        closeCreateTreeModal();
        alert('Đã tạo cây gia phả mới thành công!');
        renderTreeList();
    });

    // ===== CHỨC NĂNG QUẢN LÝ THÀNH VIÊN =====

    function loadFamilyTree(treeId) {
        const tree = familyTrees.find(t => t.id === treeId);
        if (!tree) return;
        
        if (familyTreeInstance) {
            familyTreeInstance.load(tree.members);
            return;
        }

        const treeElement = document.getElementById('tree');
        FamilyTree.SEARCH_PLACEHOLDER = "Tìm kiếm...";

        familyTreeInstance = new FamilyTree(treeElement, {
            nodes: tree.members,
            template: 'hugo',
            nodeMenu: {
                details: { text: "Chi tiết" },
                edit: { text: "Sửa" },
                remove: { text: "Xóa" }
            },
            nodeBinding: {
                field_0: "name",
                field_1: (sender, node) => (node.data.dob || '') + (node.data.dod ? ` - ${node.data.dod}` : ''),
                img_0: "img"
            },
            editForm: {
                titleBinding: "name",
                photoBinding: "img",
                generateElementsFromFields: false,
                elements: [
                    { type: 'textbox', label: 'Họ và Tên', binding: 'name' },
                    { type: 'textbox', label: 'Hình ảnh (URL)', binding: 'img' },
                    { type: 'select', label: 'Giới tính', binding: 'gender', options: [
                        { value: 'male', text: 'Nam' },
                        { value: 'female', text: 'Nữ' }
                    ]},
                    { type: 'textbox', label: 'Năm sinh', binding: 'dob' },
                    { type: 'textbox', label: 'Năm mất', binding: 'dod' }
                ],
                buttons: {
                    edit: { 
                        text: 'Cập nhật', 
                        icon: FamilyTree.icon.edit(24, 24, '#FFFF')
                    },
                    share: null,
                    pdf: null,
                    remove: { 
                        text: 'Xóa', 
                        icon: FamilyTree.icon.remove(24, 24, '#F57C00')
                    }
                }
            },
            enableDragDrop: true,
            searchFields: ["name"]
        });

        // XỬ LÝ SỰ KIỆN XÓA THÀNH VIÊN
        familyTreeInstance.on('remove', function(sender, nodeId) {
            const tree = familyTrees.find(t => t.id === currentTreeId);
            if (!tree) return false;
            
            const indexToRemove = tree.members.findIndex(member => member.id == nodeId);
            
            if (indexToRemove !== -1) {
                tree.members.splice(indexToRemove, 1);
                
                // Dọn dẹp các mối quan hệ
                tree.members.forEach(member => {
                    if (member.pids && member.pids.includes(nodeId)) {
                        member.pids = member.pids.filter(pid => pid !== nodeId);
                        if (member.pids.length === 0) {
                            delete member.pids;
                        }
                    }
                    if (member.fid == nodeId) {
                        delete member.fid;
                    }
                    if (member.mid == nodeId) {
                        delete member.mid;
                    }
                });
                
                console.log('Đã xóa thành viên ID:', nodeId);
                console.log('Dữ liệu còn lại:', tree.members);
            }
            
            return true; // Cho phép FamilyTree xóa node trên UI
        });

        // XỬ LÝ SỰ KIỆN CẬP NHẬT THÀNH VIÊN
        familyTreeInstance.on('updated', function(sender, nodeId, args) {
            const tree = familyTrees.find(t => t.id === currentTreeId);
            if (!tree) return;
            
            const memberIndex = tree.members.findIndex(m => m.id == nodeId);
            if (memberIndex !== -1) {
                // Cập nhật thông tin từ form edit
                Object.assign(tree.members[memberIndex], args.node);
                console.log('Đã cập nhật thành viên:', tree.members[memberIndex]);
            }
        });
    }

    function openAddMemberModal() {
        const tree = familyTrees.find(t => t.id === currentTreeId);
        if (!tree) {
            alert('Vui lòng chọn một cây gia phả trước!');
            return;
        }
        
        document.getElementById('addMemberModal').classList.add('active');
        document.body.classList.add('modal-active');
        document.getElementById('addMemberForm').reset();
        document.getElementById('parentSelectDiv').classList.add('hidden');
        updateParentSelect();
    }

    function closeAddMemberModal() {
        document.getElementById('addMemberModal').classList.remove('active');
        document.body.classList.remove('modal-active');
    }

    function updateParentSelect() {
        const tree = familyTrees.find(t => t.id === currentTreeId);
        if (!tree) return;
        
        const parentSelect = document.getElementById('memberParent');
        parentSelect.innerHTML = '<option value="">-- Chọn --</option>';
        tree.members.forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = `${member.name} (ID: ${member.id})`;
            parentSelect.appendChild(option);
        });
    }
    
    document.getElementById('memberRelation').addEventListener('change', function() {
        const parentDiv = document.getElementById('parentSelectDiv');
        const parentLabel = document.getElementById('parentSelectLabel');
        if (this.value === 'child') {
            parentLabel.textContent = 'Chọn Cha hoặc Mẹ';
            parentDiv.classList.remove('hidden');
        } else if (this.value === 'spouse') {
            parentLabel.textContent = 'Chọn Vợ hoặc Chồng';
            parentDiv.classList.remove('hidden');
        } else {
            parentDiv.classList.add('hidden');
        }
    });

    document.getElementById('addMemberForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const tree = familyTrees.find(t => t.id === currentTreeId);
        if (!tree) {
            alert('Không tìm thấy cây gia phả!');
            return;
        }
        
        const name = document.getElementById('memberName').value.trim();
        const gender = document.getElementById('memberGender').value;
        const dob = document.getElementById('memberDob').value.trim();
        const dod = document.getElementById('memberDod').value.trim();
        const relation = document.getElementById('memberRelation').value;
        const parentId = document.getElementById('memberParent').value;
        const imgUrl = document.getElementById('memberImg').value.trim();
        
        const newId = tree.members.length > 0 ? Math.max(...tree.members.map(m => m.id)) + 1 : 1;
        const defaultImg = gender === 'male' ? 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' : 'https://cdn-icons-png.flaticon.com/512/3135/3135789.png';
        
        const newMember = { id: newId, name, gender, img: imgUrl || defaultImg };
        if (dob) newMember.dob = dob;
        if (dod) newMember.dod = dod;
        
        if (relation === 'child' && parentId) {
            const parent = tree.members.find(m => m.id == parentId);
            if (parent) {
                if (parent.gender === 'male') {
                    newMember.fid = parseInt(parentId);
                    if (parent.pids && parent.pids.length > 0) newMember.mid = parent.pids[0];
                } else {
                    newMember.mid = parseInt(parentId);
                    if (parent.pids && parent.pids.length > 0) newMember.fid = parent.pids[0];
                }
            }
        } else if (relation === 'spouse' && parentId) {
            newMember.pids = [parseInt(parentId)];
            const spouse = tree.members.find(m => m.id == parentId);
            if (spouse) {
                if (!spouse.pids) spouse.pids = [];
                spouse.pids.push(newId);
            }
        }
        
        tree.members.push(newMember);
        console.log('Added new member:', newMember);
        
        if (familyTreeInstance) {
            familyTreeInstance.load(tree.members);
        }
        
        closeAddMemberModal();
        alert('Đã thêm thành viên mới thành công!');
    });

    // ===== CHỨC NĂNG QUẢN TRỊ =====

    function toggleUserStatus(userId) {
        const user = mockUsers.find(u => u.id === userId);
        if (user) {
            user.active = !user.active;
            renderUserTable();
        }
    }

    function renderUserTable() {
        const tableBody = document.getElementById('user-table-body');
        tableBody.innerHTML = '';
        mockUsers.forEach(user => {
            const statusClass = user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
            const statusText = user.active ? 'Hoạt động' : 'Bị khóa';
            const buttonClass = user.active ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600';
            const buttonText = user.active ? 'Khóa' : 'Mở khóa';
            
            const row = `
                <tr class="border-b">
                    <td class="py-3 px-4">${user.username}</td>
                    <td class="py-3 px-4">${user.email}</td>
                    <td class="py-3 px-4">${user.created}</td>
                    <td class="py-3 px-4 text-center"><span class="px-2 py-1 font-semibold leading-tight text-xs rounded-full ${statusClass}">${statusText}</span></td>
                    <td class="py-3 px-4 text-center"><button onclick="toggleUserStatus(${user.id})" class="px-3 py-1 text-white text-sm font-bold rounded-md ${buttonClass}">${buttonText}</button></td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    }

    // Khởi động ứng dụng
    showPage('loginPage');

