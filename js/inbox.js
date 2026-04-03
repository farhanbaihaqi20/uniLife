const inboxManager = {
    inbox: [],

    init: function () {
        this.inbox = Storage.getInbox();
        this.renderInboxItems();
        this.setupQuickCaptureButton();
    },

    setupQuickCaptureButton: function () {
        // Create floating action button menu
        const fabHtml = `
            <div class="fab-backdrop" id="fab-backdrop" onclick="inboxManager.toggleFabMenu()"></div>
            <div class="fab-container" id="fab-container">
                <div class="fab-menu" id="fab-menu">
                    <div class="fab-menu-item">
                        <span class="fab-menu-label">Tangkap Cepat</span>
                        <button class="fab-menu-btn inbox" onclick="inboxManager.openQuickCapture()">
                            <i class="ph-bold ph-lightning"></i>
                        </button>
                    </div>
                    <div class="fab-menu-item">
                        <span class="fab-menu-label">Jadwal Kuliah</span>
                        <button class="fab-menu-btn schedule" onclick="inboxManager.openScheduleAdd()">
                            <i class="ph-bold ph-calendar-plus"></i>
                        </button>
                    </div>
                    <div class="fab-menu-item">
                        <span class="fab-menu-label">Tambah Tugas</span>
                        <button class="fab-menu-btn task" onclick="inboxManager.openTaskAdd()">
                            <i class="ph-bold ph-check-square"></i>
                        </button>
                    </div>
                    <div class="fab-menu-item">
                        <span class="fab-menu-label">Catatan Materi</span>
                        <button class="fab-menu-btn note" onclick="inboxManager.openNoteAdd()">
                            <i class="ph-bold ph-note-pencil"></i>
                        </button>
                    </div>
                    <div class="fab-menu-item">
                        <span class="fab-menu-label">Catat Keuangan</span>
                        <button class="fab-menu-btn" style="background:#ec4899; color:white;" onclick="inboxManager.openBudgetAdd()">
                            <i class="ph-bold ph-wallet"></i>
                        </button>
                    </div>
                    <div class="fab-menu-item">
                        <span class="fab-menu-label">Quick Add BBM</span>
                        <button class="fab-menu-btn" style="background:#2563eb; color:white;" onclick="inboxManager.openBbmQuickAdd()">
                            <i class="ph-bold ph-gas-pump"></i>
                        </button>
                    </div>
                </div>
                <button class="fab-main" id="fab-main" onclick="inboxManager.toggleFabMenu()">
                    <i class="ph-bold ph-plus"></i>
                </button>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', fabHtml);
    },

    toggleFabMenu: function () {
        const fabMenu = document.getElementById('fab-menu');
        const fabMain = document.getElementById('fab-main');
        const fabBackdrop = document.getElementById('fab-backdrop');

        if (fabMenu && fabMain && fabBackdrop) {
            fabMenu.classList.toggle('active');
            fabMain.classList.toggle('active');
            fabBackdrop.classList.toggle('active');
        }
    },

    closeFabMenu: function () {
        const fabMenu = document.getElementById('fab-menu');
        const fabMain = document.getElementById('fab-main');
        const fabBackdrop = document.getElementById('fab-backdrop');

        if (fabMenu && fabMain && fabBackdrop) {
            fabMenu.classList.remove('active');
            fabMain.classList.remove('active');
            fabBackdrop.classList.remove('active');
        }
    },

    openScheduleAdd: function () {
        this.closeFabMenu();
        if (typeof scheduleManager !== 'undefined') {
            scheduleManager.openAddModal();
        }
    },

    openTaskAdd: function () {
        this.closeFabMenu();
        if (typeof tasksManager !== 'undefined') {
            tasksManager.openAddModal();
        }
    },

    openNoteAdd: function () {
        this.closeFabMenu();
        if (typeof notesManager !== 'undefined') {
            notesManager.openAddModal();
        }
    },

    openQuickCapture: function () {
        this.closeFabMenu();
        const modal = document.getElementById('modal-quick-capture');
        if (modal) {
            modal.classList.add('active');
            document.getElementById('quick-input').focus();
        }
    },

    openBudgetAdd: function () {
        this.closeFabMenu();
        if (typeof budgetManager !== 'undefined') {
            budgetManager.openAddModal();
        }
    },

    openBbmQuickAdd: function () {
        this.closeFabMenu();
        if (typeof bbmManager !== 'undefined') {
            bbmManager.openFormModal();
            return;
        }
        this.showToast('Modul BBM belum siap.');
    },

    closeQuickCapture: function () {
        const modal = document.getElementById('modal-quick-capture');
        if (modal) modal.classList.remove('active');
        document.getElementById('quick-input').value = '';
    },

    captureQuick: function (e) {
        e.preventDefault();
        const text = document.getElementById('quick-input').value.trim();
        if (!text) return;

        // Auto-detect type (simple heuristics)
        let type = 'note';
        if (text.toLowerCase().includes('tugas') || text.toLowerCase().includes('deadline') || text.toLowerCase().includes('task')) {
            type = 'task';
        } else if (text.toLowerCase().includes('ingat') || text.toLowerCase().includes('reminder') || text.toLowerCase().includes('jangan lupa')) {
            type = 'reminder';
        }

        const item = {
            id: uuidv4(),
            text: text,
            type: type, // 'task', 'reminder', 'note'
            timestamp: new Date().toISOString()
        };

        this.inbox.push(item);
        Storage.setInbox(this.inbox);
        this.renderInboxItems();
        this.closeQuickCapture();

        // Show toast notification
        this.showToast(i18n.t('inbox_captured') || 'Captured!');
    },

    renderInboxItems: function () {
        const container = document.getElementById('inbox-list');
        const emptyState = document.getElementById('inbox-empty-state');
        if (!container) return;

        container.innerHTML = '';

        if (this.inbox.length === 0) {
            container.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';

        this.inbox.forEach(item => {
            const el = document.createElement('div');
            el.className = 'inbox-item card';
            el.style.padding = '0.75rem 1rem';
            el.style.marginBottom = '0.5rem';
            el.style.display = 'flex';
            el.style.justifyContent = 'space-between';
            el.style.alignItems = 'flex-start';
            el.style.background = 'var(--bg-card)';
            el.style.borderLeft = `3px solid ${item.type === 'task' ? 'var(--primary)' : item.type === 'reminder' ? 'var(--warning)' : 'var(--text-muted)'}`;

            const typeIcon = item.type === 'task' ? 'check-square' : item.type === 'reminder' ? 'bell' : 'note';

            el.innerHTML = `
                <div style="flex: 1;">
                    <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.25rem;">
                        <i class="ph ph-${typeIcon}" style="color: var(--text-muted); font-size: 0.9rem;"></i>
                        <span style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">${item.type}</span>
                    </div>
                    <div style="font-weight: 500; font-size: 0.95rem;">${item.text}</div>
                </div>
                <div style="display: flex; gap: 0.25rem;">
                    <button class="icon-btn" onclick="inboxManager.processItem('${item.id}')" style="width: 28px; height: 28px; background: var(--primary-light); color: var(--primary); border: none;">
                        <i class="ph ph-arrow-right"></i>
                    </button>
                    <button class="icon-btn" onclick="inboxManager.deleteItem('${item.id}')" style="width: 28px; height: 28px; background: transparent; color: var(--danger); border: none;">
                        <i class="ph ph-x"></i>
                    </button>
                </div>
            `;
            container.appendChild(el);
        });
    },

    processItem: function (id) {
        const item = this.inbox.find(i => i.id === id);
        if (!item) return;

        if (item.type === 'task') {
            // Convert to task
            if (typeof tasksManager !== 'undefined') {
                tasksManager.openAddModal();
                setTimeout(() => {
                    document.getElementById('task-title').value = item.text;
                }, 100);
            }
        } else if (item.type === 'reminder') {
            // Convert to reminder
            if (typeof homeManager !== 'undefined') {
                homeManager.reminders.push({
                    id: uuidv4(),
                    text: item.text,
                    createdAt: new Date().toISOString()
                });
                Storage.setReminders(homeManager.reminders);
                homeManager.renderReminders();
            }
        }

        // Remove from inbox
        this.deleteItem(id);
    },

    deleteItem: function (id) {
        this.inbox = this.inbox.filter(i => i.id !== id);
        Storage.setInbox(this.inbox);
        this.renderInboxItems();
    },

    showToast: function (message) {
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.top = 'auto';
        toast.style.bottom = 'calc(86px + env(safe-area-inset-bottom))';
        toast.style.left = 'max(12px, env(safe-area-inset-left))';
        toast.style.right = 'max(12px, env(safe-area-inset-right))';
        toast.style.margin = '0 auto';
        toast.style.background = 'var(--text-main)';
        toast.style.color = 'var(--bg-main)';
        toast.style.padding = '0.75rem 1.25rem';
        toast.style.borderRadius = 'var(--radius-md)';
        toast.style.boxShadow = 'var(--shadow-lg)';
        toast.style.zIndex = '1000';
        toast.style.fontSize = '0.9rem';
        toast.style.fontWeight = '500';
        toast.style.maxWidth = 'calc(100vw - 40px)';
        toast.style.wordWrap = 'break-word';
        toast.innerText = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    },

    injectModal: function () {
        const modalHtml = `
            <div class="modal-overlay" id="modal-quick-capture">
                <div class="modal-content" style="max-width: 500px;">
                    <button class="modal-close" onclick="inboxManager.closeQuickCapture()"><i class="ph ph-x"></i></button>
                    <h3 data-i18n="inbox_title">Quick Capture</h3>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem;" data-i18n="inbox_subtitle">Type anything, we'll organize it later</p>
                    <form onsubmit="inboxManager.captureQuick(event)">
                        <div class="form-group">
                            <input type="text" id="quick-input" required placeholder="Tugas, reminder, atau catatan..." style="width: 100%; padding: 1rem; font-size: 1rem; border: 2px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-card); color: var(--text-main);">
                        </div>
                        <button type="submit" class="btn btn-primary full-width" style="padding: 0.875rem;" data-i18n="inbox_capture">Capture</button>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
};
