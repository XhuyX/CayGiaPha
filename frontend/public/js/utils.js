// Utility functions

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

// ===== PAGE NAVIGATION =====
function showPage(pageId) {
    if (typeof pages === 'undefined') {
        console.error('pages array not defined. Make sure config.js is loaded first.');
        return;
    }
    
    pages.forEach(id => { 
        const page = document.getElementById(id);
        if (page) page.style.display = 'none'; 
    });
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.style.display = 'block';

    // Auto-load data when switching pages
    if (pageId === 'treeSelectionPage') {
        if (typeof renderTreeList === 'function') {
            renderTreeList();
        }
    } else if (pageId === 'appPage' && currentTreeId) {
        if (typeof loadFamilyTree === 'function') {
            loadFamilyTree(currentTreeId);
        }
    } else if (pageId === 'adminPage') {
        if (typeof renderUserTable === 'function') {
            renderUserTable();
        }
    } else if (pageId === 'userProfilePage') {
        if (typeof loadUserProfile === 'function') {
            loadUserProfile();
        }
    }
}

