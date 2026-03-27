// Main App Orchestrator

document.addEventListener('DOMContentLoaded', () => {
    // 1. Set Date
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const initialSettings = Storage.getSettings ? Storage.getSettings() : { language: 'id' };
    const dateLocale = (initialSettings.language === 'en') ? 'en-US' : 'id-ID';
    const today = new Date().toLocaleDateString(dateLocale, dateOptions);
    document.getElementById('current-date').innerText = today;

    // 2. Theme Management
    const settings = Storage.getSettings();

    // Helper function to apply theme based on setting
    window.applyTheme = function (themeSetting) {
        let effectiveTheme = themeSetting;
        if (themeSetting === 'system') {
            effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-theme', effectiveTheme);
    };

    // Apply initial theme
    window.applyTheme(settings.theme);

    // Listen for system theme changes if using system theme
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        const currentSettings = Storage.getSettings();
        if (currentSettings.theme === 'system') {
            window.applyTheme('system');
        }
    });

    // 3. Navigation
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.view-section');
    let viewAnimIndex = 0;
    const viewAnimClasses = ['view-anim-rise', 'view-anim-slide', 'view-anim-zoom'];

    const animateViewSection = function (targetId) {
        const section = document.getElementById(targetId);
        if (!section) return;

        viewAnimClasses.forEach(cls => section.classList.remove(cls));
        const activeAnimClass = viewAnimClasses[viewAnimIndex % viewAnimClasses.length];
        viewAnimIndex += 1;
        section.classList.add(activeAnimClass);

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reducedMotion) return;

        const revealItems = section.querySelectorAll('.card, .schedule-card, .task-swipe-card, .notification-item, .note-card, .stat-card, .attendance-card, .inbox-item, .home-schedule-card');
        revealItems.forEach((item, index) => {
            item.classList.remove('reveal-in');
            const stagger = Math.min(index, 10) * 32;
            item.style.setProperty('--reveal-delay', `${stagger}ms`);
            requestAnimationFrame(() => item.classList.add('reveal-in'));
        });
    };

    // Global helper so any module/home quick action can navigate safely.
    window.openView = function (targetId, activeNavTarget = null) {
        navItems.forEach(nav => nav.classList.remove('active'));

        const navTarget = activeNavTarget || targetId;
        const navToActivate = document.querySelector(`.nav-item[data-target="${navTarget}"]`);
        if (navToActivate) navToActivate.classList.add('active');

        sections.forEach(section => {
            if (section.id === targetId) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });

        animateViewSection(targetId);
    };

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');
            window.openView(targetId, targetId);
        });
    });

    animateViewSection('view-home');

    // 4. Universal Drag-to-Scroll for Horizontal Containers (e.g. .day-tabs, #home-schedule-list)
    const scrollableContainers = document.querySelectorAll('.day-tabs, #home-schedule-list');

    // Keep background stable on mobile by locking scroll when any modal is active.
    const syncBodyModalState = function () {
        const hasActiveModal = !!document.querySelector('.modal-overlay.active, .welcome-modal.active');
        document.body.classList.toggle('modal-open', hasActiveModal);
    };

    // Make interaction feel more native by preventing copy/select on non-editable surfaces.
    const editableSelector = 'input, textarea, select, [contenteditable="true"], .allow-select';
    const isEditableTarget = (target) => !!(target && target.closest(editableSelector));

    document.addEventListener('contextmenu', (event) => {
        if (!isEditableTarget(event.target)) event.preventDefault();
    });

    document.addEventListener('selectstart', (event) => {
        if (!isEditableTarget(event.target)) event.preventDefault();
    });

    document.addEventListener('copy', (event) => {
        const activeEl = document.activeElement;
        if (!isEditableTarget(activeEl) && !isEditableTarget(event.target)) {
            event.preventDefault();
        }
    });

    document.addEventListener('cut', (event) => {
        const activeEl = document.activeElement;
        if (!isEditableTarget(activeEl) && !isEditableTarget(event.target)) {
            event.preventDefault();
        }
    });

    // Native-like haptic feedback on touch interactions.
    const nativeHaptics = {
        lastPulseAt: 0,
        patterns: {
            light: [8],
            medium: [14],
            success: [10, 28, 12]
        },
        pulse(type = 'light') {
            if (!('vibrate' in navigator)) return;
            const now = Date.now();
            if (now - this.lastPulseAt < 45) return;
            navigator.vibrate(this.patterns[type] || this.patterns.light);
            this.lastPulseAt = now;
        }
    };

    const hapticTapSelector = 'button, .btn, .icon-btn, .nav-item, .fab-main, .fab-menu-btn, .day-tab, .filter-btn, .modal-close';
    document.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'mouse') return;
        if (event.target.closest(hapticTapSelector)) {
            nativeHaptics.pulse('light');
        }
    }, { passive: true });

    document.addEventListener('submit', () => nativeHaptics.pulse('medium'), true);

    const setupModalSheetGestures = function () {
        const overlays = document.querySelectorAll('.modal-overlay');
        overlays.forEach((overlay) => {
            if (overlay.dataset.sheetBound === '1') return;
            const sheet = overlay.querySelector('.modal-content');
            if (!sheet) return;

            overlay.dataset.sheetBound = '1';

            let startY = 0;
            let dragY = 0;
            let isDragging = false;

            const resetSheet = (springBack = false) => {
                sheet.classList.remove('sheet-dragging');
                if (springBack) {
                    sheet.style.transition = 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)';
                    requestAnimationFrame(() => {
                        sheet.style.transform = 'translateY(0)';
                    });
                    setTimeout(() => {
                        sheet.style.transition = '';
                        sheet.style.transform = '';
                    }, 280);
                    return;
                }
                sheet.style.transform = '';
            };

            const closeOverlay = () => {
                const closeBtn = overlay.querySelector('.modal-close');
                if (closeBtn) {
                    closeBtn.click();
                } else {
                    overlay.classList.remove('active');
                }
            };

            sheet.addEventListener('touchstart', (event) => {
                if (!overlay.classList.contains('active')) return;
                if (event.touches.length !== 1) return;

                const touch = event.touches[0];
                const rect = sheet.getBoundingClientRect();
                const offsetFromTop = touch.clientY - rect.top;

                // Start drag only near the top area to avoid conflicts with input scrolling.
                if (offsetFromTop > 84) return;

                startY = touch.clientY;
                dragY = 0;
                isDragging = true;
                sheet.classList.add('sheet-dragging');
            }, { passive: true });

            sheet.addEventListener('touchmove', (event) => {
                if (!isDragging || !overlay.classList.contains('active')) return;

                const touch = event.touches[0];
                const rawDelta = touch.clientY - startY;
                dragY = Math.max(0, rawDelta);

                if (dragY > 0) {
                    event.preventDefault();
                    sheet.style.transform = `translateY(${dragY}px)`;
                }
            }, { passive: false });

            sheet.addEventListener('touchend', () => {
                if (!isDragging) return;

                const shouldClose = dragY > 120;

                if (shouldClose) {
                    sheet.classList.remove('sheet-dragging');
                    sheet.style.transition = 'transform 180ms ease-out';
                    sheet.style.transform = 'translateY(100%)';
                    nativeHaptics.pulse('medium');
                    setTimeout(() => {
                        sheet.style.transition = '';
                        sheet.style.transform = '';
                        closeOverlay();
                    }, 170);
                } else {
                    resetSheet(true);
                }

                isDragging = false;
                dragY = 0;
            }, { passive: true });

            sheet.addEventListener('touchcancel', () => {
                if (!isDragging) return;
                resetSheet(true);
                isDragging = false;
                dragY = 0;
            }, { passive: true });
        });
    };

    setupModalSheetGestures();

    const modalStateObserver = new MutationObserver((mutations) => {
        let shouldSync = false;
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                shouldSync = true;
                break;
            }
            if (mutation.type === 'childList') {
                shouldSync = true;
                break;
            }
        }
        if (shouldSync) {
            syncBodyModalState();
            setupModalSheetGestures();
        }
    });

    modalStateObserver.observe(document.body, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ['class']
    });
    syncBodyModalState();

    // Function to re-bind dynamically (since tabs might get re-rendered)
    window.setupDragToScroll = function (containerSelector = '.day-tabs, #home-schedule-list') {
        const containers = document.querySelectorAll(containerSelector);
        containers.forEach(slider => {
            // Unbind old events if they exist to prevent duplicates
            slider.onmousedown = null;
            slider.onmouseleave = null;
            slider.onmouseup = null;
            slider.onmousemove = null;

            let isDown = false;
            let startX;
            let scrollLeft;

            slider.addEventListener('mousedown', (e) => {
                isDown = true;
                slider.style.cursor = 'grabbing';
                startX = e.pageX - slider.offsetLeft;
                scrollLeft = slider.scrollLeft;
            });
            slider.addEventListener('mouseleave', () => {
                isDown = false;
                slider.style.cursor = 'grab';
            });
            slider.addEventListener('mouseup', () => {
                isDown = false;
                slider.style.cursor = 'grab';
            });
            slider.addEventListener('mousemove', (e) => {
                if (!isDown) return;
                e.preventDefault();
                const x = e.pageX - slider.offsetLeft;
                const walk = (x - startX) * 2; // Scroll speed multiplier
                slider.scrollLeft = scrollLeft - walk;
            });

            // Initial cursor state
            slider.style.cursor = 'grab';
        });
    };

    // Run initial setup
    window.setupDragToScroll();

    // 5. Initialize Sub-modules
    if (typeof i18n !== 'undefined') i18n.init();
    if (typeof profileManager !== 'undefined') profileManager.init();
    if (typeof gradeGoals !== 'undefined') gradeGoals.init();
    if (typeof notificationManager !== 'undefined') {
        notificationManager.injectNotificationUI();
        notificationManager.init();
    }
    if (typeof notesManager !== 'undefined') {
        notesManager.init();
        notesManager.injectModal();
    }
    if (typeof presensiManager !== 'undefined') presensiManager.init();
    if (typeof inboxManager !== 'undefined') {
        inboxManager.init();
        inboxManager.injectModal();
    }
    if (typeof deadlineRadar !== 'undefined') deadlineRadar.init();
    if (typeof homeManager !== 'undefined') homeManager.init();
    if (typeof scheduleManager !== 'undefined') scheduleManager.init();
    if (typeof gradesManager !== 'undefined') gradesManager.init();
    if (typeof tasksManager !== 'undefined') tasksManager.init();
    if (typeof focusManager !== 'undefined') focusManager.init();
    if (typeof budgetManager !== 'undefined') budgetManager.init();

    // 5. Add calendar export buttons after views are loaded
    if (typeof calendarExport !== 'undefined') {
        setTimeout(() => calendarExport.addExportButtons(), 200);
    }

    // 6. Listen for data changes to sync UI automatically
    window.addEventListener('unilifeDataChanged', (e) => {
        const key = e.detail?.key;

        // Tasks changed
        if (!key || key === 'unilife_tasks') {
            if (typeof deadlineRadar !== 'undefined') deadlineRadar.renderRadar();
            if (typeof homeManager !== 'undefined') homeManager.renderUpcomingTasks();
            if (typeof tasksManager !== 'undefined') {
                tasksManager.tasks = Storage.getTasks();
                tasksManager.renderTasks();
            }
            // Check for upcoming task notifications
            if (typeof notificationManager !== 'undefined') {
                notificationManager.checkUpcomingTasks();
            }
            // Update profile dashboard
            if (typeof profileManager !== 'undefined') {
                profileManager.updateDashboardStats();
                profileManager.renderUrgentTasks();
            }
            if (typeof scheduleManager !== 'undefined' && document.getElementById('modal-course-detail')?.classList.contains('active')) {
                const courseId = document.getElementById('course-detail-id')?.value;
                if (courseId) scheduleManager.renderCourseTasks(courseId);
            }
        }

        // Reminders changed
        if (!key || key === 'unilife_reminders') {
            if (typeof homeManager !== 'undefined') homeManager.renderReminders();
            // Check for new reminders
            if (typeof notificationManager !== 'undefined') {
                notificationManager.checkNewReminders();
            }
        }

        // Inbox (Quick Capture) changed
        if (!key || key === 'unilife_inbox') {
            if (typeof inboxManager !== 'undefined') inboxManager.renderInboxItems();
            // Check for new inbox items
            if (typeof notificationManager !== 'undefined') {
                notificationManager.checkNewInbox();
            }
        }

        // Schedules changed
        if (!key || key === 'unilife_schedules') {
            if (typeof homeManager !== 'undefined') homeManager.renderTodaySchedule();
            if (typeof scheduleManager !== 'undefined') {
                scheduleManager.schedules = Storage.getSchedules();
                scheduleManager.renderScheduleList();
            }
            if (typeof deadlineRadar !== 'undefined') deadlineRadar.renderRadar();
            if (typeof profileManager !== 'undefined') {
                profileManager.updateDashboardStats();
            }
        }

        // Grades / Goals changed
        if (!key || key === 'unilife_grades' || key === 'unilife_grade_goals') {
            if (typeof gradesManager !== 'undefined') {
                gradesManager.semesters = Storage.getGrades();
                gradesManager.renderStats();
                gradesManager.renderSemesters();
            }
            // Update profile dashboard
            if (typeof profileManager !== 'undefined') {
                profileManager.updateDashboardStats();
            }
        }

        // Focus sessions changed
        if (!key || key === 'unilife_focus_sessions' || key === 'unilife_focus') {
            if (typeof focusManager !== 'undefined') focusManager.updateStats();
            if (typeof deadlineRadar !== 'undefined') deadlineRadar.renderRadar();
            // Update profile dashboard
            if (typeof profileManager !== 'undefined') {
                profileManager.updateDashboardStats();
            }
        }

        // Profile changed
        if (!key || key === 'unilife_profile') {
            if (typeof profileManager !== 'undefined') profileManager.renderProfileSummary();
            if (typeof deadlineRadar !== 'undefined') deadlineRadar.renderRadar();
            if (typeof homeManager !== 'undefined') {
                homeManager.renderUpcomingTasks();
                homeManager.renderTodaySchedule();
            }
            if (typeof tasksManager !== 'undefined') {
                tasksManager.tasks = Storage.getTasks();
                tasksManager.renderTasks();
            }
            if (typeof scheduleManager !== 'undefined') {
                scheduleManager.schedules = Storage.getSchedules();
                scheduleManager.renderScheduleList();
            }
        }

        // Notes changed
        if (!key || key === 'unilife_notes') {
            if (typeof notesManager !== 'undefined') {
                notesManager.notes = Storage.getNotes() || [];
                notesManager.renderNotesDashboard();
                notesManager.renderCategoryTabs();
            }
        }

        // Attendance changed
        if (!key || key === 'unilife_attendance_records') {
            if (typeof presensiManager !== 'undefined') {
                presensiManager.records = Storage.getAttendanceRecords() || [];
                presensiManager.renderRecap();
            }
            if (typeof homeManager !== 'undefined') homeManager.renderTodaySchedule();
            // Update profile dashboard
            if (typeof profileManager !== 'undefined') {
                profileManager.updateDashboardStats();
            }
        }

        // Budget changed
        if (!key || key === 'unilife_budget_tx' || key === 'unilife_budget_limit' || key === 'unilife_budget_base_balance') {
            if (typeof budgetManager !== 'undefined') {
                budgetManager.transactions = Storage.getBudgetTransactions();
                budgetManager.monthlyLimit = Storage.getBudgetLimit();
                budgetManager.baseBalance = Storage.getBudgetBaseBalance();
                budgetManager.updateDashboard();
            }
            if (typeof profileManager !== 'undefined') {
                profileManager.updateDashboardStats();
            }
        }
    });

    // 7. Register Service Worker for PWA dengan auto-update
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);

                    // Cek update service worker setiap 30 detik
                    setInterval(() => {
                        registration.update();
                    }, 30000);

                    // Auto-reload saat ada update
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // Ada update! Tanyakan user untuk reload
                                if (confirm('Update tersedia! Reload untuk lihat versi terbaru?')) {
                                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                                    window.location.reload();
                                }
                            }
                        });
                    });
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });

        // Reload halaman saat service worker mengambil control
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });
    }
});

// Utility: UUID Generator for IDs
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
