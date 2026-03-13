const notificationManager = {
    notifications: [],
    maxNotifications: 50,
    lastUnreadCount: 0,
    badgeInitialized: false,

    init: function () {
        this.notifications = Storage.getNotifications ? Storage.getNotifications() : [];
        this.renderNotificationBadge();
        this.renderNotificationPanel();
        this.syncWithData();
    },

    // Storage & Retrieval
    getNotifications: function () {
        return Storage.getNotifications ? Storage.getNotifications() : [];
    },

    saveNotifications: function () {
        if (Storage.setNotifications) {
            Storage.setNotifications(this.notifications);
        }
    },

    // Add different types of notifications
    addReminder: function (reminderObj) {
        const notification = {
            id: 'reminder_' + Date.now() + '_' + Math.random(),
            type: 'reminder',
            title: '<i class="ph ph-alarm"></i> ' + i18n.t('notification_reminder'),
            message: reminderObj.text || reminderObj.content,
            timestamp: Date.now(),
            isRead: false,
            sourceId: reminderObj.id,
            action: () => {
                // Optionally navigate to reminders or show in home
                const homeView = document.getElementById('view-home');
                if (homeView) homeView.classList.add('active');
                this.markAsRead(notification.id);
            }
        };
        
        this.notifications.unshift(notification);
        this.trimNotifications();
        this.saveNotifications();
        this.renderNotificationBadge();
        return notification;
    },

    addTaskDeadline: function (taskObj) {
        const notification = {
            id: 'task_' + Date.now() + '_' + Math.random(),
            type: 'task',
            title: '<i class="ph ph-check-square"></i> ' + i18n.t('notification_task_deadline'),
            message: taskObj.title + (taskObj.courseName ? ` (${taskObj.courseName})` : ''),
            timestamp: Date.now(),
            isRead: false,
            sourceId: taskObj.id,
            dueDate: taskObj.dueDate,
            action: () => {
                // Navigate to tasks view
                document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                const tasksView = document.getElementById('view-tasks');
                if (tasksView) tasksView.classList.add('active');
                const tasksNav = document.querySelector('.nav-item[data-target="view-tasks"]');
                if (tasksNav) tasksNav.classList.add('active');
                this.markAsRead(notification.id);
            }
        };
        
        this.notifications.unshift(notification);
        this.trimNotifications();
        this.saveNotifications();
        this.renderNotificationBadge();
        return notification;
    },

    addInboxCapture: function (inboxObj) {
        const notification = {
            id: 'inbox_' + Date.now() + '_' + Math.random(),
            type: 'inbox',
            title: '<i class="ph ph-lightning"></i> ' + i18n.t('notification_inbox_new'),
            message: inboxObj.text || inboxObj.content,
            timestamp: Date.now(),
            isRead: false,
            sourceId: inboxObj.id,
            action: () => {
                // Could open a quick inbox view later
                this.markAsRead(notification.id);
            }
        };
        
        this.notifications.unshift(notification);
        this.trimNotifications();
        this.saveNotifications();
        this.renderNotificationBadge();
        return notification;
    },

    // Notification actions
    markAsRead: function (notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.isRead = true;
            this.saveNotifications();
            this.renderNotificationBadge();
            this.renderNotificationPanel();
        }
    },

    markAllAsRead: function () {
        this.notifications.forEach(n => n.isRead = true);
        this.saveNotifications();
        this.renderNotificationBadge();
        this.renderNotificationPanel();
    },

    deleteNotification: function (notificationId) {
        const index = this.notifications.findIndex(n => n.id === notificationId);
        if (index > -1) {
            this.notifications.splice(index, 1);
            this.saveNotifications();
            this.renderNotificationBadge();
            this.renderNotificationPanel();
        }
    },

    deleteAll: function () {
        this.notifications = [];
        this.saveNotifications();
        this.renderNotificationBadge();
        this.renderNotificationPanel();
    },

    // Trim old notifications
    trimNotifications: function () {
        if (this.notifications.length > this.maxNotifications) {
            this.notifications = this.notifications.slice(0, this.maxNotifications);
        }
    },

    // UI Rendering
    renderNotificationBadge: function () {
        const badge = document.getElementById('notification-badge');
        const unreadCount = this.notifications.filter(n => !n.isRead).length;
        
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                badge.style.display = 'flex';

                if (this.badgeInitialized && unreadCount > this.lastUnreadCount) {
                    badge.classList.remove('pulse');
                    void badge.offsetWidth;
                    badge.classList.add('pulse');
                }
            } else {
                badge.style.display = 'none';
            }
        }

        this.lastUnreadCount = unreadCount;
        this.badgeInitialized = true;
    },

    setupNotificationPanel: function () {
        const container = document.getElementById('notification-container');
        if (!container) return;

        // Remove old listener if exists
        if (this._containerClickListener) {
            container.removeEventListener('click', this._containerClickListener);
        }

        // Handler untuk button click
        const handleButtonClick = (e) => {
            const btn = e.target.closest('#notification-btn');
            if (!btn) return;
            
            e.stopPropagation();
            const panel = document.getElementById('notification-panel');
            if (panel) {
                panel.classList.toggle('active');
                if (panel.classList.contains('active')) {
                    this.renderNotificationPanel();
                }
            }
        };

        container.addEventListener('click', handleButtonClick);
        this._containerClickListener = handleButtonClick;

        // Close panel when clicking outside
        if (this._outsideClickListener) {
            document.removeEventListener('click', this._outsideClickListener);
        }

        const handleOutsideClick = (e) => {
            const panel = document.getElementById('notification-panel');
            const btn = document.getElementById('notification-btn');
            if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
                panel.classList.remove('active');
            }
        };
        
        document.addEventListener('click', handleOutsideClick);
        this._outsideClickListener = handleOutsideClick;

        this.setupPanelGestures();
    },

    setupPanelGestures: function () {
        const panel = document.getElementById('notification-panel');
        const handle = document.getElementById('notification-drag-handle');
        if (!panel || !handle || panel.dataset.gestureBound === '1') return;

        panel.dataset.gestureBound = '1';

        let startY = 0;
        let dragY = 0;
        let isDragging = false;

        const resetPanel = (withSpring = false) => {
            panel.classList.remove('sheet-dragging');
            if (withSpring) {
                panel.style.transition = 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1), opacity 0.24s ease';
                requestAnimationFrame(() => {
                    panel.style.transform = '';
                });
                setTimeout(() => {
                    panel.style.transition = '';
                }, 260);
                return;
            }
            panel.style.transform = '';
            panel.style.transition = '';
        };

        const closePanel = () => {
            panel.classList.remove('active');
            resetPanel(false);
        };

        handle.addEventListener('touchstart', (e) => {
            if (!panel.classList.contains('active')) return;
            if (e.touches.length !== 1) return;
            startY = e.touches[0].clientY;
            dragY = 0;
            isDragging = true;
            panel.classList.add('sheet-dragging');
            panel.style.transition = 'none';
        }, { passive: true });

        handle.addEventListener('touchmove', (e) => {
            if (!isDragging || !panel.classList.contains('active')) return;
            const currentY = e.touches[0].clientY;
            dragY = Math.max(0, currentY - startY);

            if (dragY > 0) {
                e.preventDefault();
                panel.style.transform = `translateY(${dragY}px)`;
            }
        }, { passive: false });

        handle.addEventListener('touchend', () => {
            if (!isDragging) return;

            const shouldClose = dragY > 90;
            if (shouldClose) {
                panel.style.transition = 'transform 160ms ease-out, opacity 160ms ease-out';
                panel.style.transform = 'translateY(100%)';
                setTimeout(() => closePanel(), 150);
            } else {
                resetPanel(true);
            }

            isDragging = false;
            dragY = 0;
        }, { passive: true });

        handle.addEventListener('touchcancel', () => {
            if (!isDragging) return;
            resetPanel(true);
            isDragging = false;
            dragY = 0;
        }, { passive: true });
    },

    renderNotificationPanel: function () {
        const panel = document.getElementById('notification-panel');
        if (!panel) return;

        const listContainer = panel.querySelector('.notification-list');
        if (!listContainer) return;

        if (this.notifications.length === 0) {
            listContainer.innerHTML = `
                <div class="notification-empty">
                    <i class="ph ph-bell-slash" style="font-size: 2.5rem; color: var(--text-muted);"></i>
                    <p style="color: var(--text-muted); margin-top: 0.5rem;">${i18n.t('notification_no_notifications')}</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = this.notifications.map(notif => `
            <div class="notification-item ${notif.isRead ? 'read' : 'unread'}" data-notif-id="${notif.id}" data-swipe-left="${i18n.t('common_delete')}" data-swipe-right="${i18n.t('notification_mark_read')}">
                <div class="notification-content" style="flex: 1; cursor: pointer;" onclick="notificationManager.handleNotificationClick('${notif.id}')">
                    <div class="notification-title">${notif.title}</div>
                    <div class="notification-message">${notif.message}</div>
                    <div class="notification-time">${this.formatTime(notif.timestamp)}</div>
                </div>
                <div class="notification-actions">
                    ${!notif.isRead ? `<button class="notif-action-btn" onclick="notificationManager.markAsRead('${notif.id}')" title="Mark as read"><i class="ph ph-check"></i></button>` : ''}
                    <button class="notif-action-btn danger" onclick="notificationManager.deleteNotification('${notif.id}')" title="Delete"><i class="ph ph-trash"></i></button>
                </div>
            </div>
        `).join('');

        this.setupNotificationItemGestures();
    },

    setupNotificationItemGestures: function () {
        const items = document.querySelectorAll('.notification-item');
        items.forEach((item) => {
            if (item.dataset.swipeBound === '1') return;
            item.dataset.swipeBound = '1';

            const notifId = item.dataset.notifId;
            let startX = 0;
            let startY = 0;
            let currentX = 0;
            let isTracking = false;
            let hasHorizontalIntent = false;

            const interactiveSelector = 'button, a, input, textarea, select';

            const resetItem = (withSpring = true) => {
                item.classList.remove('swiping-right', 'swiping-left');
                item.style.transition = withSpring ? 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)' : '';
                item.style.transform = 'translateX(0)';
                if (withSpring) {
                    setTimeout(() => {
                        item.style.transition = '';
                    }, 240);
                }
            };

            const pulse = (pattern = 10) => {
                if ('vibrate' in navigator) navigator.vibrate(pattern);
            };

            item.addEventListener('touchstart', (event) => {
                if (event.touches.length !== 1) return;
                if (event.target.closest(interactiveSelector)) return;

                const touch = event.touches[0];
                startX = touch.clientX;
                startY = touch.clientY;
                currentX = 0;
                isTracking = true;
                hasHorizontalIntent = false;
                item.style.transition = '';
            }, { passive: true });

            item.addEventListener('touchmove', (event) => {
                if (!isTracking) return;

                const touch = event.touches[0];
                const dx = touch.clientX - startX;
                const dy = touch.clientY - startY;

                if (!hasHorizontalIntent) {
                    if (Math.abs(dy) > Math.abs(dx)) {
                        isTracking = false;
                        return;
                    }
                    if (Math.abs(dx) < 8) return;
                    hasHorizontalIntent = true;
                }

                event.preventDefault();
                currentX = Math.max(-112, Math.min(112, dx));
                item.style.transform = `translateX(${currentX}px)`;
                item.classList.toggle('swiping-right', currentX > 18);
                item.classList.toggle('swiping-left', currentX < -18);
            }, { passive: false });

            item.addEventListener('touchend', () => {
                if (!isTracking) {
                    resetItem(false);
                    return;
                }

                const threshold = 82;
                if (currentX >= threshold) {
                    item.style.transition = 'transform 160ms ease-out';
                    item.style.transform = 'translateX(120px)';
                    pulse([8, 20, 10]);
                    setTimeout(() => this.markAsRead(notifId), 120);
                } else if (currentX <= -threshold) {
                    item.style.transition = 'transform 160ms ease-out';
                    item.style.transform = 'translateX(-120px)';
                    pulse([12]);
                    setTimeout(() => this.deleteNotification(notifId), 120);
                } else {
                    resetItem(true);
                }

                isTracking = false;
                currentX = 0;
            }, { passive: true });

            item.addEventListener('touchcancel', () => {
                isTracking = false;
                currentX = 0;
                resetItem(true);
            }, { passive: true });
        });
    },

    handleNotificationClick: function (notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            if (notification.action && typeof notification.action === 'function') {
                notification.action();
            }
            this.markAsRead(notificationId);
        }
    },

    formatTime: function (timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return i18n.t('notification_just_now');
        if (minutes < 60) return i18n.tf('notification_minutes_ago', { count: minutes });
        if (hours < 24) return i18n.tf('notification_hours_ago', { count: hours });
        if (days < 7) return i18n.tf('notification_days_ago', { count: days });
        
        const date = new Date(timestamp);
        return date.toLocaleDateString(i18n.locale());
    },

    // Sync with data changes
    syncWithData: function () {
        // Listen for data changes
        window.addEventListener('unilifeDataChanged', (e) => {
            const key = e.detail?.key;

            // Check for new tasks with approaching deadlines
            if (key === 'unilife_tasks') {
                this.checkUpcomingTasks();
            }

            // Check for new reminders
            if (key === 'unilife_reminders') {
                this.checkNewReminders();
            }

            // Check for new inbox items
            if (key === 'unilife_inbox') {
                this.checkNewInbox();
            }
        });
    },

    checkUpcomingTasks: function () {
        const tasks = Storage.getTasks ? Storage.getTasks() : [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        tasks.forEach(task => {
            if (task.dueDate && !task.completed) {
                const dueDate = new Date(task.dueDate);
                dueDate.setHours(0, 0, 0, 0);

                // Check if task due date is within next 7 days
                if (dueDate <= sevenDaysFromNow && dueDate >= today) {
                    // Check if notification already exists for this task
                    const exists = this.notifications.some(n => n.sourceId === task.id && n.type === 'task');
                    if (!exists) {
                        this.addTaskDeadline(task);
                    }
                }
            }
        });
    },

    checkNewReminders: function () {
        const reminders = Storage.getReminders ? Storage.getReminders() : [];
        reminders.forEach(reminder => {
            // Check if notification already exists
            const exists = this.notifications.some(n => n.sourceId === reminder.id && n.type === 'reminder');
            if (!exists && !reminder.isRead) {
                this.addReminder(reminder);
            }
        });
    },

    checkNewInbox: function () {
        const inbox = Storage.getInbox ? Storage.getInbox() : [];
        inbox.forEach(item => {
            // Check if notification already exists
            const exists = this.notifications.some(n => n.sourceId === item.id && n.type === 'inbox');
            if (!exists) {
                this.addInboxCapture(item);
            }
        });
    },

    // Inject notification UI into DOM if not exists
    injectNotificationUI: function () {
        const container = document.getElementById('notification-container');
        if (!container || document.getElementById('notification-btn')) return; // Already injected

        // Inject button into header container
        container.innerHTML = `
            <button class="icon-btn" id="notification-btn" type="button" style="width: 38px; height: 38px; border:none; background:var(--bg-main); position: relative;">
                <i class="ph ph-bell"></i>
                <span id="notification-badge" class="notification-badge" style="display: none;"></span>
            </button>
        `;

        // Inject panel into body to escape header's backdrop-filter stacking context,
        // which otherwise breaks position:fixed and causes the panel to be clipped on mobile.
        const panel = document.createElement('div');
        panel.id = 'notification-panel';
        panel.className = 'notification-panel';
        panel.innerHTML = `
            <div id="notification-drag-handle" class="notification-drag-handle" aria-hidden="true"></div>
            <div class="notification-panel-header">
                <h3>${i18n.t('notification_title')}</h3>
                <div class="notification-header-actions">
                    <button type="button" class="notif-header-btn" onclick="notificationManager.markAllAsRead()">
                        <i class="ph ph-check-circle"></i>
                        <span>${i18n.t('notification_mark_all_read')}</span>
                    </button>
                    <button type="button" class="notif-header-btn danger" onclick="notificationManager.deleteAll()">
                        <i class="ph ph-trash"></i>
                        <span>${i18n.t('notification_delete_all')}</span>
                    </button>
                </div>
            </div>
            <div class="notification-list">
                <!-- Notifications rendered here -->
            </div>
        `;
        document.body.appendChild(panel);

        // Setup panel after injection (only once)
        this.setupNotificationPanel();
    }
};
