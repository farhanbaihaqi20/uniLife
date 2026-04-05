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
    let currentViewId = 'view-home';
    const viewHistory = ['view-home'];
    const maxViewHistory = 40;

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

    const pushViewHistory = function (targetId) {
        if (!targetId) return;
        const last = viewHistory[viewHistory.length - 1];
        if (last === targetId) return;
        viewHistory.push(targetId);
        if (viewHistory.length > maxViewHistory) viewHistory.shift();
    };

    const goBackView = function () {
        if (viewHistory.length <= 1) return false;
        viewHistory.pop();
        const previousView = viewHistory[viewHistory.length - 1] || 'view-home';
        window.openView(previousView, previousView, { fromHistory: true, trackHistory: false });
        return true;
    };

    const getPreviousViewId = function () {
        if (viewHistory.length <= 1) return null;
        return viewHistory[viewHistory.length - 2] || null;
    };

    const getViewDisplayName = function (viewId) {
        if (!viewId) return '';

        const navLabel = document.querySelector(`.nav-item[data-target="${viewId}"] span`);
        const navText = navLabel ? String(navLabel.textContent || '').trim() : '';
        if (navText) return navText;

        const section = document.getElementById(viewId);
        if (!section) return '';

        const heading = section.querySelector('.section-header h2, h2, h3');
        return heading ? String(heading.textContent || '').trim() : '';
    };

    window.goBackView = goBackView;

    // Global helper so any module/home quick action can navigate safely.
    window.openView = function (targetId, activeNavTarget = null, options = {}) {
        const navTarget = activeNavTarget || targetId;
        const shouldTrackHistory = options.trackHistory !== false;
        const shouldPushHistory = shouldTrackHistory && options.fromHistory !== true && targetId && targetId !== currentViewId;

        if (shouldPushHistory) {
            pushViewHistory(targetId);
        }

        if (typeof budgetManager !== 'undefined' && typeof budgetManager.closeMoreActions === 'function') {
            budgetManager.closeMoreActions();
        }

        navItems.forEach(nav => nav.classList.remove('active'));

        const navToActivate = document.querySelector(`.nav-item[data-target="${navTarget}"]`);
        if (navToActivate) navToActivate.classList.add('active');

        sections.forEach(section => {
            if (section.id === targetId) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }

            // Clear any inline transform from gesture interactions.
            section.style.transform = '';
            section.style.opacity = '';
        });

        currentViewId = targetId || currentViewId;

        if (targetId === 'view-calendar' && typeof calendarManager !== 'undefined' && typeof calendarManager.focusToday === 'function') {
            calendarManager.focusToday(true);
        }

        animateViewSection(targetId);
    };

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');
            window.openView(targetId, targetId, { fromHistory: false, trackHistory: true });
        });
    });

    const setupEdgeBackGesture = function () {
        const EDGE_START_MAX_X = 26;
        const SWIPE_COMMIT_PX = 84;
        const SWIPE_HINT_MAX_X = 72;
        const BACK_TARGETS_BLOCK = 'input, textarea, select, [contenteditable="true"], .allow-select';

        let tracking = false;
        let horizontalIntent = false;
        let startX = 0;
        let startY = 0;
        let currentDx = 0;
        let activeSection = null;
        let previousSection = null;
        let backHintEl = null;

        const ensureBackHint = function () {
            if (backHintEl) return backHintEl;
            const hint = document.createElement('div');
            hint.className = 'edge-back-hint';
            hint.setAttribute('aria-hidden', 'true');
            hint.innerHTML = '<i class="ph ph-caret-left"></i><span class="edge-back-hint-label"></span>';
            document.body.appendChild(hint);
            backHintEl = hint;
            return backHintEl;
        };

        const updateBackHint = function (dx = 0) {
            if (!backHintEl) return;

            const previousView = viewHistory.length > 1 ? viewHistory[viewHistory.length - 2] : '';
            const label = getViewDisplayName(previousView) || 'Kembali';
            const labelEl = backHintEl.querySelector('.edge-back-hint-label');
            if (labelEl) labelEl.textContent = label;

            const clamped = Math.max(0, Math.min(SWIPE_HINT_MAX_X, dx));
            const progress = clamped / SWIPE_HINT_MAX_X;

            backHintEl.classList.add('active');
            backHintEl.style.opacity = String(Math.max(0, progress));
            backHintEl.style.transform = `translate3d(${Math.max(-28, -28 + clamped * 0.9)}px, -50%, 0)`;
        };

        const hideBackHint = function () {
            if (!backHintEl) return;
            backHintEl.classList.remove('active');
            backHintEl.style.opacity = '';
            backHintEl.style.transform = '';
        };

        const resetActiveSection = (withSpring = false) => {
            if (!activeSection) return;
            if (withSpring) {
                activeSection.style.transition = 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease, box-shadow 240ms ease';
            }
            activeSection.style.transform = '';
            activeSection.style.opacity = '';
            activeSection.style.boxShadow = '';
            if (withSpring) {
                setTimeout(() => {
                    if (!activeSection) return;
                    activeSection.style.transition = '';
                }, 250);
            }
        };

        const resetPreviousPeek = (withSpring = false) => {
            if (!previousSection) return;
            if (withSpring) {
                previousSection.style.transition = 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease';
            }
            previousSection.style.transform = '';
            previousSection.style.opacity = '';
            previousSection.classList.remove('edge-back-peek');
            if (withSpring) {
                setTimeout(() => {
                    if (!previousSection) return;
                    previousSection.style.transition = '';
                }, 240);
            }
        };

        document.addEventListener('touchstart', (event) => {
            if (event.touches.length !== 1) return;
            if (document.querySelector('.modal-overlay.active, .welcome-modal.active')) return;
            if (currentViewId === 'view-home') return;

            const touch = event.touches[0];
            if (touch.clientX > EDGE_START_MAX_X) return;
            if (event.target && event.target.closest(BACK_TARGETS_BLOCK)) return;

            activeSection = document.getElementById(currentViewId);
            if (!activeSection || !activeSection.classList.contains('active')) return;

            const previousViewId = getPreviousViewId();
            previousSection = previousViewId ? document.getElementById(previousViewId) : null;
            if (previousSection) {
                previousSection.classList.add('edge-back-peek');
                previousSection.style.transition = 'none';
                previousSection.style.transform = 'translateX(-26px) scale(0.995)';
                previousSection.style.opacity = '0.72';
            }

            ensureBackHint();
            updateBackHint(0);

            tracking = true;
            horizontalIntent = false;
            startX = touch.clientX;
            startY = touch.clientY;
            currentDx = 0;
            activeSection.style.transition = 'none';
            activeSection.style.boxShadow = '0 0 0 rgba(15, 23, 42, 0)';
        }, { passive: true });

        document.addEventListener('touchmove', (event) => {
            if (!tracking || !activeSection) return;

            const touch = event.touches[0];
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;

            if (!horizontalIntent) {
                if (Math.abs(dy) > Math.abs(dx)) {
                    tracking = false;
                    activeSection.style.transition = '';
                    resetPreviousPeek(true);
                    hideBackHint();
                    return;
                }
                if (Math.abs(dx) < 8) return;
                horizontalIntent = true;
            }

            currentDx = Math.max(0, Math.min(160, dx));
            const progress = Math.min(1, currentDx / Math.max(window.innerWidth, 1));

            if (currentDx > 0) {
                event.preventDefault();
                activeSection.style.transform = `translateX(${currentDx}px)`;
                activeSection.style.opacity = String(Math.max(0.78, 1 - progress * 0.24));
                const shadowX = Math.min(26, 8 + (currentDx * 0.22));
                const shadowBlur = Math.min(34, 12 + (currentDx * 0.28));
                const shadowAlpha = Math.min(0.2, 0.08 + (progress * 0.14));
                activeSection.style.boxShadow = `-${shadowX.toFixed(1)}px 0 ${shadowBlur.toFixed(1)}px rgba(15, 23, 42, ${shadowAlpha.toFixed(3)})`;
                if (previousSection) {
                    const peekProgress = Math.min(1, currentDx / SWIPE_COMMIT_PX);
                    const prevX = -26 + (26 * peekProgress);
                    const prevScale = 0.995 + (0.005 * peekProgress);
                    const prevOpacity = 0.72 + (0.28 * peekProgress);
                    previousSection.style.transform = `translateX(${prevX}px) scale(${prevScale})`;
                    previousSection.style.opacity = String(Math.min(1, prevOpacity));
                }
                updateBackHint(currentDx);
            }
        }, { passive: false });

        document.addEventListener('touchend', () => {
            if (!tracking) {
                activeSection = null;
                return;
            }

            const shouldGoBack = horizontalIntent && currentDx >= SWIPE_COMMIT_PX;

            if (shouldGoBack && activeSection) {
                activeSection.style.transition = 'transform 160ms ease-out, opacity 160ms ease-out, box-shadow 160ms ease-out';
                activeSection.style.transform = 'translateX(120%)';
                activeSection.style.opacity = '0.82';
                activeSection.style.boxShadow = '0 0 0 rgba(15, 23, 42, 0)';
                nativeHaptics.pulse('medium');

                setTimeout(() => {
                    goBackView();
                    resetPreviousPeek(false);
                    hideBackHint();
                    if (activeSection) {
                        activeSection.style.transition = '';
                    }
                }, 140);
            } else {
                resetActiveSection(true);
                resetPreviousPeek(true);
                hideBackHint();
            }

            tracking = false;
            horizontalIntent = false;
            currentDx = 0;
            activeSection = null;
            previousSection = null;
        }, { passive: true });

        document.addEventListener('touchcancel', () => {
            if (!tracking) return;
            resetActiveSection(true);
            resetPreviousPeek(true);
            hideBackHint();
            tracking = false;
            horizontalIntent = false;
            currentDx = 0;
            activeSection = null;
            previousSection = null;
        }, { passive: true });
    };

    setupEdgeBackGesture();

    animateViewSection('view-home');

    // 4. Universal Drag-to-Scroll for Horizontal Containers (e.g. .day-tabs, #home-schedule-list)
    const scrollableContainers = document.querySelectorAll('.day-tabs, #home-schedule-list');

    // Keep background stable on mobile by locking scroll when any modal is active.
    const syncBodyModalState = function () {
        const hasActiveModal = !!document.querySelector('.modal-overlay.active, .welcome-modal.active');
        document.body.classList.toggle('modal-open', hasActiveModal);
    };

    const updateModalBackdropVisual = function () {
        const root = document.documentElement;
        const mainContent = document.querySelector('.main-content');
        const hasActiveModal = !!document.querySelector('.modal-overlay.active, .welcome-modal.active');
        if (!root || !mainContent) return;

        if (!hasActiveModal) {
            root.style.removeProperty('--modal-backdrop-blur');
            root.style.removeProperty('--modal-backdrop-opacity');
            return;
        }

        const scrollTop = mainContent.scrollTop || 0;
        const blurPx = Math.min(12, 4 + (scrollTop / 110));
        const opacity = Math.min(0.66, 0.46 + (scrollTop / 1200));

        root.style.setProperty('--modal-backdrop-blur', `${blurPx.toFixed(2)}px`);
        root.style.setProperty('--modal-backdrop-opacity', opacity.toFixed(3));
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
            updateModalBackdropVisual();
        }
    });

    modalStateObserver.observe(document.body, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ['class']
    });
    syncBodyModalState();
    updateModalBackdropVisual();

    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.addEventListener('scroll', () => {
            updateModalBackdropVisual();
        }, { passive: true });
    }

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
    if (typeof calendarManager !== 'undefined') calendarManager.init();
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
            if (typeof calendarManager !== 'undefined') calendarManager.render();
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
            if (typeof calendarManager !== 'undefined') calendarManager.render();
            if (typeof deadlineRadar !== 'undefined') deadlineRadar.renderRadar();
            if (typeof profileManager !== 'undefined') {
                profileManager.updateDashboardStats();
            }
        }

        // Schedule agendas changed
        if (!key || key === 'unilife_schedule_agendas') {
            if (typeof scheduleManager !== 'undefined') {
                scheduleManager.agendas = Storage.getScheduleAgendas ? Storage.getScheduleAgendas() : [];
                const detailCourseId = document.getElementById('detail-course-id')?.value;
                if (detailCourseId && document.getElementById('modal-course-detail')?.classList.contains('active')) {
                    scheduleManager.renderCourseAgendas(detailCourseId);
                }
            }
            if (typeof calendarManager !== 'undefined') calendarManager.render();
            if (typeof notificationManager !== 'undefined' && typeof notificationManager.checkUpcomingScheduleAgendas === 'function') {
                notificationManager.checkUpcomingScheduleAgendas();
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
            if (typeof calendarManager !== 'undefined') calendarManager.render();
            if (typeof notificationManager !== 'undefined') {
                if (typeof notificationManager.checkUpcomingTasks === 'function') notificationManager.checkUpcomingTasks();
                if (typeof notificationManager.checkUpcomingScheduleAgendas === 'function') notificationManager.checkUpcomingScheduleAgendas();
            }
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
            if (typeof calendarManager !== 'undefined') calendarManager.render();
            if (typeof homeManager !== 'undefined') homeManager.renderTodaySchedule();
            // Update profile dashboard
            if (typeof profileManager !== 'undefined') {
                profileManager.updateDashboardStats();
            }
        }

        // Budget changed
        if (!key || key === 'unilife_budget_tx' || key === 'unilife_budget_limit' || key === 'unilife_budget_base_balance' || key === 'unilife_budget_accounts') {
            if (typeof budgetManager !== 'undefined') {
                budgetManager.transactions = Storage.getBudgetTransactions();
                budgetManager.accounts = Storage.getBudgetAccounts ? Storage.getBudgetAccounts() : [];
                budgetManager.monthlyLimit = Storage.getBudgetLimit();
                budgetManager.baseBalance = typeof budgetManager.getTotalInitialBalance === 'function'
                    ? budgetManager.getTotalInitialBalance()
                    : Storage.getBudgetBaseBalance();
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
