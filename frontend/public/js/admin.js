// Admin functions

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

