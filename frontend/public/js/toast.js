// Toast Notification System
if (typeof Toast === 'undefined') {
class Toast {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Tạo container nếu chưa có
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'fixed top-4 right-4 z-[9999] space-y-3 flex flex-col items-end';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        toast.id = id;
        
        // Styles based on type
        const styles = {
            success: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-green-600',
            error: 'bg-gradient-to-r from-red-500 to-rose-600 text-white border-red-600',
            warning: 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white border-yellow-600',
            info: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-600'
        };

        const icons = {
            success: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>',
            error: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>',
            warning: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
            info: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
        };

        toast.className = `${styles[type] || styles.info} px-5 py-4 rounded-xl shadow-2xl border-2 flex items-center space-x-3 min-w-[320px] max-w-md transform transition-all duration-300 translate-x-full opacity-0 backdrop-blur-sm`;
        
        toast.innerHTML = `
            <div class="flex-shrink-0">
                ${icons[type] || icons.info}
            </div>
            <div class="flex-1 text-sm font-semibold leading-relaxed">${this.escapeHtml(message)}</div>
            <button onclick="toast.remove('${id}')" class="flex-shrink-0 text-white hover:text-gray-200 transition-opacity opacity-80 hover:opacity-100">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        `;

        this.container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.classList.remove('translate-x-full', 'opacity-0');
                toast.classList.add('translate-x-0', 'opacity-100');
            });
        });

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                this.remove(id);
            }, duration);
        }

        return id;
    }

    remove(id) {
        const toast = document.getElementById(id);
        if (toast) {
            toast.classList.remove('translate-x-0', 'opacity-100');
            toast.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    success(message, duration = 3000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 4000) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = 3500) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 3000) {
        return this.show(message, 'info', duration);
    }
}

// Global instance - khởi tạo khi DOM ready
let toast;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        toast = new Toast();
        window.toast = toast;
    });
} else {
    toast = new Toast();
    window.toast = toast;
}

} // End if (typeof Toast === 'undefined')

