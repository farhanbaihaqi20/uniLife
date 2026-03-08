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
    window.applyTheme = function(themeSetting) {
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

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Update active state in nav
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Switch view
            const targetId = item.getAttribute('data-target');
            sections.forEach(section => {
                if (section.id === targetId) {
                    section.classList.add('active');
                } else {
                    section.classList.remove('active');
                }
            });
        });
    });

    // 4. Universal Drag-to-Scroll for Horizontal Containers (e.g. .day-tabs, #home-schedule-list)
    const scrollableContainers = document.querySelectorAll('.day-tabs, #home-schedule-list');

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
        }

        // Grades / Goals changed
        if (!key || key === 'unilife_grades' || key === 'unilife_grade_goals') {
            if (typeof gradesManager !== 'undefined') {
                gradesManager.grades = Storage.getGrades();
                gradesManager.renderGradesList();
            }
        }

        // Focus sessions changed
        if (!key || key === 'unilife_focus_sessions' || key === 'unilife_focus') {
            if (typeof focusManager !== 'undefined') focusManager.updateStats();
            if (typeof deadlineRadar !== 'undefined') deadlineRadar.renderRadar();
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
        }
    });

    // 7. Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
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
