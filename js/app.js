// Main App Orchestrator

document.addEventListener('DOMContentLoaded', () => {
    // 1. Set Date
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const initialSettings = Storage.getSettings ? Storage.getSettings() : { language: 'id' };
    const dateLocale = (initialSettings.language === 'en') ? 'en-US' : 'id-ID';
    const today = new Date().toLocaleDateString(dateLocale, dateOptions);
    document.getElementById('current-date').innerText = today;

    // 2. Theme Management
    const themeBtn = document.querySelector('.theme-toggle');
    const settings = Storage.getSettings();
    document.documentElement.setAttribute('data-theme', settings.theme);

    updateThemeIconContainer(settings.theme);

    themeBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        document.documentElement.setAttribute('data-theme', newTheme);
        settings.theme = newTheme;
        Storage.setSettings(settings);

        updateThemeIconContainer(newTheme);
    });

    function updateThemeIconContainer(theme) {
        themeBtn.innerHTML = theme === 'light' ? '<i class="ph ph-moon"></i>' : '<i class="ph ph-sun"></i>';
    }

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
    if (typeof notesManager !== 'undefined') {
        notesManager.init();
        notesManager.injectModal();
    }
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
            if (typeof scheduleManager !== 'undefined' && document.getElementById('modal-course-detail')?.classList.contains('active')) {
                const courseId = document.getElementById('course-detail-id')?.value;
                if (courseId) scheduleManager.renderCourseTasks(courseId);
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
