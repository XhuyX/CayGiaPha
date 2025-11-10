/**
 * Custom Confirm Modal
 * Thay thế cho window.confirm() với UI đẹp hơn
 */
class ConfirmModal {
    constructor() {
        this.modal = null;
        this.resolve = null;
        this.init();
    }

    init() {
        // Tạo modal HTML
        const modalHTML = `
            <div id="confirmModal" class="confirm-modal">
                <div class="confirm-modal-overlay"></div>
                <div class="confirm-modal-content">
                    <div class="confirm-modal-header">
                        <h3 class="confirm-modal-title">Xác nhận</h3>
                    </div>
                    <div class="confirm-modal-body">
                        <p class="confirm-modal-message" id="confirmModalMessage"></p>
                    </div>
                    <div class="confirm-modal-footer">
                        <button class="confirm-modal-btn confirm-modal-btn-cancel" id="confirmModalCancel">
                            Hủy
                        </button>
                        <button class="confirm-modal-btn confirm-modal-btn-confirm" id="confirmModalConfirm">
                            Xác nhận
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Thêm vào body nếu chưa có
        if (!document.getElementById('confirmModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        this.modal = document.getElementById('confirmModal');
        this.setupEventListeners();
        this.addStyles();
    }

    setupEventListeners() {
        const cancelBtn = document.getElementById('confirmModalCancel');
        const confirmBtn = document.getElementById('confirmModalConfirm');
        const overlay = this.modal.querySelector('.confirm-modal-overlay');

        cancelBtn.addEventListener('click', () => this.close(false));
        confirmBtn.addEventListener('click', () => this.close(true));
        overlay.addEventListener('click', () => this.close(false));

        // ESC key để đóng
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.close(false);
            }
        });
    }

    addStyles() {
        if (document.getElementById('confirmModalStyles')) return;

        const style = document.createElement('style');
        style.id = 'confirmModalStyles';
        style.textContent = `
            .confirm-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                align-items: center;
                justify-content: center;
            }

            .confirm-modal.active {
                display: flex;
            }

            .confirm-modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
            }

            .confirm-modal-content {
                position: relative;
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                max-width: 450px;
                width: 90%;
                animation: confirmModalSlideIn 0.3s ease-out;
                z-index: 10001;
            }

            @keyframes confirmModalSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(-20px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            .confirm-modal-header {
                padding: 24px 24px 16px;
                text-align: center;
                border-bottom: 1px solid #e5e7eb;
            }

            .confirm-modal-title {
                font-size: 20px;
                font-weight: 600;
                color: #1f2937;
                margin: 0;
            }

            .confirm-modal-body {
                padding: 24px;
            }

            .confirm-modal-message {
                font-size: 16px;
                color: #4b5563;
                line-height: 1.6;
                margin: 0;
                text-align: center;
            }

            .confirm-modal-footer {
                padding: 16px 24px 24px;
                display: flex;
                gap: 12px;
                justify-content: flex-end;
                border-top: 1px solid #e5e7eb;
            }

            .confirm-modal-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
            }

            .confirm-modal-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }

            .confirm-modal-btn:active {
                transform: translateY(0);
            }

            .confirm-modal-btn-cancel {
                background: #f3f4f6;
                color: #374151;
            }

            .confirm-modal-btn-cancel:hover {
                background: #e5e7eb;
            }

            .confirm-modal-btn-confirm {
                background: #ef4444;
                color: white;
            }

            .confirm-modal-btn-confirm:hover {
                background: #dc2626;
            }
        `;
        document.head.appendChild(style);
    }

    show(message) {
        return new Promise((resolve) => {
            this.resolve = resolve;
            const messageEl = document.getElementById('confirmModalMessage');
            messageEl.textContent = message;
            this.modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    close(result) {
        if (this.resolve) {
            this.resolve(result);
            this.resolve = null;
        }
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Global instance
let confirmModalInstance = null;

// Helper function để sử dụng như window.confirm()
function showConfirm(message) {
    if (!confirmModalInstance) {
        confirmModalInstance = new ConfirmModal();
    }
    return confirmModalInstance.show(message);
}

// Export
if (typeof window !== 'undefined') {
    window.showConfirm = showConfirm;
    window.ConfirmModal = ConfirmModal;
}

// Auto init khi DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!confirmModalInstance) {
            confirmModalInstance = new ConfirmModal();
        }
    });
} else {
    if (!confirmModalInstance) {
        confirmModalInstance = new ConfirmModal();
    }
}

