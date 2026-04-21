const homeManager = {
    reminders: [],

    init: function () {
        this.reminders = Storage.getReminders();

        // Ensure profile greeting is up to date initially
        if (typeof profileManager !== 'undefined') {
            profileManager.renderProfileSummary();
        }

        this.renderTodaySchedule();
        this.renderUpcomingTasks();
        this.renderReminders();
    },

    renderTodaySchedule: function () {
        const container = document.getElementById('home-schedule-list');
        if (!container) return;
        container.innerHTML = '';

        const activeSemester = typeof profileManager !== 'undefined' ? String(profileManager.profile.semester || 1) : '1';

        const todayIndex = new Date().getDay(); // JS day index: Sunday=0, Monday=1
        const schedules = Storage.getSchedules();

        // Strict filtering by semester then by day
        const todaySchedules = schedules.filter(s => {
            const schSem = String(s.semester || 1);
            // Schedule uses 1-6 (Mon-Sat), so Sunday (0) will correctly return no classes.
            return schSem === activeSemester && parseInt(s.day) === todayIndex;
        });

        todaySchedules.sort((a, b) => a.start.localeCompare(b.start));

        if (todaySchedules.length === 0) {
            container.innerHTML = `<div class="home-empty-state">${i18n.t('home_empty_today_schedule')}</div>`;
            return;
        }

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        todaySchedules.forEach((sch, index) => {
            const [startH, startM] = sch.start.split(':').map(Number);
            const [endH, endM] = sch.end.split(':').map(Number);
            const startMins = startH * 60 + startM;
            const endMins = endH * 60 + endM;
            const isNow = (currentTime >= startMins && currentTime <= endMins);

            // Check if already attended today
            let hasAttendedToday = false;
            if (typeof presensiManager !== 'undefined') {
                const todayRecord = presensiManager.getTodayRecordForSchedule(sch.id);
                hasAttendedToday = !!todayRecord;
            }

            let statusClass = 'home-schedule-status-upcoming';
            let statusText = 'Akan datang';
            if (isNow) {
                statusClass = 'home-schedule-status-now pulse';
                statusText = 'Sedang berlangsung';
            } else if (currentTime > endMins) {
                statusClass = 'home-schedule-status-done';
                statusText = 'Selesai';
            }

            const card = document.createElement('div');
            card.className = `schedule-card home-schedule-card fade-in ${isNow ? 'is-now' : ''}`;
            card.style.animationDelay = `${index * 0.05}s`;
            card.onclick = () => {
                if (isNow && typeof presensiManager !== 'undefined') {
                    presensiManager.openAttendanceModal(sch.id, true); // true = from today's class
                    return;
                }

                document.querySelector('.nav-item[data-target=\'view-schedule\']').click();
                setTimeout(() => {
                    if (typeof scheduleManager !== 'undefined') scheduleManager.openCourseDetailModal(sch.id);
                }, 100);
            };

            card.innerHTML = `
                <div class="home-schedule-card-head">
                    <div class="home-schedule-course-name">${sch.name}</div>
                    <span class="home-schedule-status ${statusClass}">${statusText}</span>
                </div>
                <div class="home-schedule-meta">
                    <span><i class="ph ph-clock"></i> ${sch.start} - ${sch.end}</span>
                    <span><i class="ph ph-map-pin"></i> ${sch.room}</span>
                </div>
                ${isNow ? `
                    ${hasAttendedToday ? `
                        <div class="home-schedule-attendance-chip done-today">
                            <i class="ph ph-check-circle"></i> Sudah presensi hari ini
                        </div>
                    ` : `
                        <div class="home-schedule-attendance-chip tap-hint">
                            <i class="ph ph-hand-tap"></i> Tap kartu ini untuk isi presensi
                        </div>
                    `}
                ` : (hasAttendedToday ? `
                    <div class="home-schedule-attendance-chip done">
                        <i class="ph ph-check-circle"></i> Sudah presensi
                    </div>
                ` : ``)}
            `;
            container.appendChild(card);
        });
    },

    renderUpcomingTasks: function () {
        const container = document.getElementById('home-tasks-list');
        if (!container) return;
        container.innerHTML = '';

        const allTasks = Storage.getTasks();
        const activeSemester = typeof profileManager !== 'undefined' ? String(profileManager.profile.semester || 1) : '1';

        // Strict filter: must match semester AND be incomplete
        const pendingTasks = allTasks.filter(t => {
            const tSem = String(t.semester || 1);
            return tSem === activeSemester && !t.completed;
        });

        pendingTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        // Show max 3 tasks
        const topTasks = pendingTasks.slice(0, 3);

        if (topTasks.length === 0) {
            container.innerHTML = `<div class="home-empty-state">${i18n.t('home_empty_urgent_tasks')}</div>`;
            return;
        }

        const today = new Date().toISOString().split('T')[0];

        topTasks.forEach((task, index) => {
            let dueColor = 'var(--text-muted)';
            if (task.dueDate < today) dueColor = 'var(--danger)';
            else if (task.dueDate === today) dueColor = 'var(--warning)';

            const dueState = task.dueDate < today ? 'overdue' : (task.dueDate === today ? 'today' : 'upcoming');

            const card = document.createElement('div');
            card.className = `home-task-card fade-in is-${dueState}`;
            card.style.animationDelay = `${index * 0.05}s`;
            card.style.setProperty('--home-task-due-color', dueColor);

            card.innerHTML = `
                <div class="home-task-main">
                    <div class="home-task-title">${task.title}</div>
                    <div class="home-task-due"><i class="ph ph-calendar"></i> ${i18n.t('home_due_prefix')} ${task.dueDate}</div>
                </div>
                <button class="btn btn-outline home-task-open-btn" onclick="document.querySelector('.nav-item[data-target=\\'view-tasks\\']').click()">${i18n.t('home_view')}</button>
            `;
            container.appendChild(card);
        });
    },

    renderReminders: function () {
        const container = document.getElementById('home-reminders-list');
        if (!container) return;
        container.innerHTML = '';

        if (this.reminders.length === 0) {
            container.innerHTML = ``; // Keep empty if no reminders
            return;
        }

        this.reminders.forEach(rem => {
            const el = document.createElement('div');
            el.className = 'home-reminder-item';

            el.innerHTML = `
                <div class="home-reminder-text">${rem.text}</div>
                <button class="icon-btn home-reminder-done-btn" onclick="homeManager.deleteReminder('${rem.id}')">
                    <i class="ph ph-check"></i>
                </button>
            `;
            container.appendChild(el);
        });
    },

    addReminder: function () {
        const text = prompt(i18n.t('home_prompt_add_reminder'));
        if (text && text.trim() !== '') {
            this.reminders.push({
                id: uuidv4(),
                text: text.trim(),
                createdAt: new Date().toISOString()
            });
            Storage.setReminders(this.reminders);
            this.renderReminders();
        }
    },

    deleteReminder: function (id) {
        this.reminders = this.reminders.filter(r => r.id !== id);
        this.renderReminders();
    }
};
