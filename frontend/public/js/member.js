// Member management functions

// Biến đếm để tạo ID unique cho mỗi row cha/mẹ
let fatherRowCount = 0;
let motherRowCount = 0;

function loadFamilyTree(treeId) {
    const tree = familyTrees.find(t => t.id === treeId);
    if (!tree) {
        console.error('Tree not found:', treeId);
        return;
    }
    
    const treeElement = document.getElementById('tree');
    if (!treeElement) {
        console.error('Tree element not found in DOM');
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
    
    treeElement.innerHTML = '';

    try {
        familyTreeInstance = new SimpleFamilyTree('tree', {
            nodeWidth: 180,
            nodeHeight: 80,
            levelHeight: 150,
            siblingGap: 20
        });
        
        familyTreeInstance.load(tree.members);
    } catch (error) {
        console.error('Error creating/loading tree:', error);
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
    
    // Event: Update node (chỉ cho phép nếu có user đăng nhập)
    familyTreeInstance.on('update', function(sender, updateInfo) {
        if (!currentUser) {
            showToast('Bạn không có quyền chỉnh sửa. Vui lòng đăng nhập.', 'warning');
            return;
        }
        
        if (!updateInfo || !updateInfo.updateNodesData || updateInfo.updateNodesData.length === 0) {
            return;
        }
        
        const updatedNode = updateInfo.updateNodesData[0];
        if (!updatedNode || !updatedNode.id) {
            return;
        }
        
        const updateData = {
            name: updatedNode.name || '',
            gender: updatedNode.gender || 'male',
            dob: updatedNode.dob || '',
            dod: updatedNode.dod || '',
            img: updatedNode.img || '',
            tieuSu: updatedNode.tieuSu || ''
        };
        
        if (updatedNode.hasOwnProperty('fid')) {
            updateData.fid = updatedNode.fid || null;
            updateData.relationTypeFather = updatedNode.relationTypeFather || 'Cha ruột';
        }
        if (updatedNode.hasOwnProperty('mid')) {
            updateData.mid = updatedNode.mid || null;
            updateData.relationTypeMother = updatedNode.relationTypeMother || 'Mẹ ruột';
        }
        
        if (updatedNode.hasOwnProperty('allFathers')) {
            updateData.allFathers = Array.isArray(updatedNode.allFathers) ? updatedNode.allFathers : [];
        } else if (updatedNode.fid) {
            updateData.allFathers = [{
                id: updatedNode.fid,
                relationType: updatedNode.relationTypeFather || 'Cha ruột'
            }];
        } else {
            updateData.allFathers = [];
        }
        
        if (updatedNode.hasOwnProperty('allMothers')) {
            updateData.allMothers = Array.isArray(updatedNode.allMothers) ? updatedNode.allMothers : [];
        } else if (updatedNode.mid) {
            updateData.allMothers = [{
                id: updatedNode.mid,
                relationType: updatedNode.relationTypeMother || 'Mẹ ruột'
            }];
        } else {
            updateData.allMothers = [];
        }
        
        if (updatedNode.hasOwnProperty('maritalStatus')) {
            updateData.maritalStatus = updatedNode.maritalStatus;
        }
        if (updatedNode.hasOwnProperty('pids')) {
            updateData.pids = updatedNode.pids || [];
        } else if (updatedNode.hasOwnProperty('maritalStatus')) {
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
            const reloaded = await reloadTreeById(currentTreeId);
            if (!reloaded) {
                showToast('Thành viên đã được cập nhật nhưng không thể reload tree. Vui lòng refresh trang.', 'warning');
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            loadFamilyTree(currentTreeId);
            showToast('Cập nhật thành công!', 'success');
        })
        .catch(error => {
            console.error('Update failed:', error);
            showToast('Lỗi cập nhật: ' + error.message, 'error');
            location.reload();
        });
    });
    
    // Event: Remove node (chỉ cho phép nếu có user đăng nhập)
    familyTreeInstance.on('remove', async function(sender, nodeId) {
        if (!currentUser) {
            showToast('Bạn không có quyền xóa thành viên. Vui lòng đăng nhập.', 'warning');
            return;
        }
        
        try {
            await apiCall(`/members/${nodeId}`, {
                method: 'DELETE'
            });
            
            const reloaded = await reloadTreeById(currentTreeId);
            if (!reloaded) {
                showToast('Thành viên đã được xóa nhưng không thể reload tree. Vui lòng refresh trang.', 'warning');
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            loadFamilyTree(currentTreeId);
            showToast('Đã xóa thành viên thành công!', 'success');
        } catch (error) {
            console.error('Delete failed:', error);
            showToast('Lỗi xóa thành viên: ' + error.message, 'error');
        }
    });
}

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
    if (!currentUser) {
        showToast('Bạn không có quyền thêm thành viên. Vui lòng đăng nhập.', 'warning');
        return;
    }
    
    const tree = familyTrees.find(t => t.id === currentTreeId);
    if (!tree) {
        showToast('Vui lòng chọn một cây gia phả trước!', 'warning');
        return;
    }
    
    document.getElementById('addMemberModal').classList.add('active');
    document.body.classList.add('modal-active');
    document.getElementById('addMemberForm').reset();
    updateParentSelect();
    
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

// Event listener cho tình trạng hôn nhân
const memberMaritalStatusEl = document.getElementById('memberMaritalStatus');
if (memberMaritalStatusEl) {
    memberMaritalStatusEl.addEventListener('change', function() {
        const spouseDiv = document.getElementById('spouseSelectDiv');
        if (spouseDiv) {
            if (this.value === 'married') {
                spouseDiv.classList.remove('hidden');
                updateParentSelect();
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
        
        const defaultMaleImg = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
        const defaultFemaleImg = 'https://cdn-icons-png.flaticon.com/512/3135/3135789.png';
        const memberData = { 
            name, 
            gender, 
            img: imgUrl || (gender === 'male' ? defaultMaleImg : defaultFemaleImg),
            tieuSu: bio
        };
        
        if (dob) memberData.dob = dob;
        if (dod) memberData.dod = dod;
        
        if (maritalStatus === 'married' && spouseId) {
            memberData.pids = [parseInt(spouseId)];
        }
        
        const biologicalFather = fathers.find(f => f.relationType === 'Cha ruột');
        const biologicalMother = mothers.find(m => m.relationType === 'Mẹ ruột');
        
        if (biologicalFather) {
            memberData.fid = biologicalFather.id;
            memberData.relationTypeFather = 'Cha ruột';
        } else if (fathers.length > 0) {
            memberData.fid = fathers[0].id;
            memberData.relationTypeFather = fathers[0].relationType;
        }
        
        if (biologicalMother) {
            memberData.mid = biologicalMother.id;
            memberData.relationTypeMother = 'Mẹ ruột';
        } else if (mothers.length > 0) {
            memberData.mid = mothers[0].id;
            memberData.relationTypeMother = mothers[0].relationType;
        }
        
        memberData.allFathers = fathers;
        memberData.allMothers = mothers;
        
        try {
            const result = await apiCall(`/family-trees/${currentTreeId}/members`, {
                method: 'POST',
                body: JSON.stringify(memberData)
            });
            
            const reloaded = await reloadTreeById(currentTreeId);
            if (!reloaded) {
                showToast('Thành viên đã được thêm nhưng không thể reload tree. Vui lòng refresh trang.', 'warning');
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            loadFamilyTree(currentTreeId);
            closeAddMemberModal();
            showToast('Đã thêm thành viên mới thành công!', 'success');
        } catch (error) {
            console.error('Failed to add member:', error);
        }
    });
}

async function showMemberDetailById(nodeId) {
    // Nếu không có user (public view), không gọi API
    if (!currentUser) {
        // Sử dụng dữ liệu từ tree data thay vì API
        const tree = familyTrees.find(t => t.id === currentTreeId);
        if (!tree || !tree.members) return;
        
        const member = tree.members.find(m => m.id === nodeId);
        if (!member) return;
        
        const detailContent = document.getElementById('memberDetailContent');
        if (!detailContent) return;
        
        let html = `
            <div class="flex items-start space-x-4 mb-4">
                <img src="${member.img || ''}" alt="${member.name}" class="w-24 h-24 rounded-full object-cover border-2 border-gray-300">
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
        
        if (member.tieuSu) {
            html += `
                <div class="bg-blue-50 p-3 rounded mb-3">
                    <strong>Tiểu sử:</strong>
                    <p class="mt-1 text-gray-700 whitespace-pre-wrap">${member.tieuSu}</p>
                </div>
            `;
        }
        
        detailContent.innerHTML = html;
        currentDetailMemberId = nodeId;
        document.getElementById('memberDetailModal').classList.add('active');
        document.body.classList.add('modal-active');
        return;
    }
    
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
        
        if (member.tieuSu) {
            html += `
                <div class="bg-blue-50 p-3 rounded">
                    <strong>Tiểu sử:</strong>
                    <p class="mt-1 text-gray-700 whitespace-pre-wrap">${member.tieuSu}</p>
                </div>
            `;
        }
        
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
    const memberId = currentDetailMemberId;
    
    if (!memberId) {
        console.error('editCurrentMember: currentDetailMemberId is null');
        return;
    }
    
    closeMemberDetailModal();
    
    setTimeout(() => {
        if (familyTreeInstance) {
            const node = familyTreeInstance.nodes.find(n => n.id === memberId);
            if (node) {
                familyTreeInstance.showEditForm(node);
            } else {
                showToast('Không tìm thấy thành viên trong cây gia phả. Vui lòng thử lại.', 'warning');
            }
        }
    }, 100);
}

function deleteCurrentMember() {
    if (!currentDetailMemberId) return;
    
    if (familyTreeInstance) {
        const node = familyTreeInstance.nodes.find(n => n.id === currentDetailMemberId);
        if (node) {
            familyTreeInstance.removeNode(node);
            closeMemberDetailModal();
        }
    }
}

// Search functions
async function performSearch() {
    const searchQuery = document.getElementById('searchMemberInput').value.trim();
    
    if (!searchQuery) {
        showToast('Vui lòng nhập từ khóa tìm kiếm!', 'warning');
        return;
    }

    if (!currentTreeId) {
        showToast('Vui lòng chọn cây gia phả trước!', 'warning');
        return;
    }
    
    try {
        const searchUrl = `/family-trees/${currentTreeId}/search?q=${encodeURIComponent(searchQuery)}`;
        const result = await apiCall(searchUrl);
        const members = result.members || result.data || result.results || [];
        
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
                let dob, dod, yearInfo;
                if (member.NgaySinh || member.NgayMat) {
                    dob = member.NgaySinh ? new Date(member.NgaySinh).getUTCFullYear() : (member.dob || '?');
                    dod = member.NgayMat ? new Date(member.NgayMat).getUTCFullYear() : (member.dod || '');
                } else {
                    dob = member.dob || '?';
                    dod = member.dod || '';
                }
                yearInfo = dod ? `${dob} - ${dod}` : dob;
                
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
    
    if (familyTreeInstance) {
        const nodeElement = document.querySelector(`[data-node-id="${memberId}"]`);
        if (nodeElement) {
            const treeContainer = document.getElementById('tree');
            if (treeContainer) {
                const svg = treeContainer.querySelector('svg');
                if (svg) {
                    const nodeTransform = nodeElement.getAttribute('transform');
                    const match = nodeTransform.match(/translate\(([^,]+),([^)]+)\)/);
                    if (match) {
                        const x = parseFloat(match[1]);
                        const y = parseFloat(match[2]);
                        
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
            
            nodeElement.classList.add('highlighted-node');
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

