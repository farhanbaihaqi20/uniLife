const inboxManager = {
    inbox: [],

    init: function () {
        this.inbox = Storage.getInbox();
        this.renderInboxItems();
        this.setupQuickCaptureButton();
    },

    setupQuickCaptureButton: function () {
        // Create floating action button
        const fabHtml = `
            <button id="quick-capture-fab" class="fab" onclick="inboxManager.openQuickCapture()" style="position: fixed; bottom: 80px; right: 20px; width: 56px; height: 56px; border-radius: 50%; background: var(--primary-gradient); color: white; border: none; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4); cursor: pointer; z-index: 100; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; transition: transform 0.2s;">
                <i class="ph-bold ph-plus"></i>
            </button>
        `;
        document.body.insertAdjacentHTML('beforeend', fabHtml);

        // Hover effect
        const fab = document.getElementById('quick-capture-fab');
        fab.addEventListener('mouseenter', () => fab.style.transform = 'scale(1.1)');
        fab.addEventListener('mouseleave', () => fab.style.transform = 'scale(1)');
    },

    openQuickCapture: function () {
        const modal = document.getElementById('modal-quick-capture');
        if (modal) {
            modal.classList.add('active');
            document.getElementById('quick-input').focus();
        }
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
        if (!container) return;

        container.innerHTML = '';

        if (this.inbox.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';

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
        toast.style.bottom = '100px';
        toast.style.right = '20px';
        toast.style.background = 'var(--text-main)';
        toast.style.color = 'var(--bg-main)';
        toast.style.padding = '0.75rem 1.25rem';
        toast.style.borderRadius = 'var(--radius-md)';
        toast.style.boxShadow = 'var(--shadow-lg)';
        toast.style.zIndex = '1000';
        toast.style.fontSize = '0.9rem';
        toast.style.fontWeight = '500';
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
