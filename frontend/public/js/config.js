// Global configuration và variables
// Chỉ khai báo nếu chưa tồn tại (để tránh conflict với inline scripts)
if (typeof pages === 'undefined') {
    var pages = ['loginPage', 'registerPage', 'treeSelectionPage', 'appPage', 'adminPage', 'userProfilePage'];
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

