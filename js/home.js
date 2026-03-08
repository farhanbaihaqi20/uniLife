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

        const todayIndex = new Date().getDay() || 1; // map 0 (sunday) to 1
        const schedules = Storage.getSchedules();

        // Strict filtering by semester then by day
        const todaySchedules = schedules.filter(s => {
            const schSem = String(s.semester || 1);
            return schSem === activeSemester && parseInt(s.day) === todayIndex;
        });

        todaySchedules.sort((a, b) => a.start.localeCompare(b.start));

        if (todaySchedules.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:1rem; color:var(--text-muted); background:var(--bg-card); border-radius:var(--radius-sm); border:1px solid var(--border-color);">${i18n.t('home_empty_today_schedule')}</div>`;
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
            card.className = `schedule-card fade-in ${isNow ? 'is-now' : ''}`;
            card.style.animationDelay = `${index * 0.05}s`;
            card.style.background = 'var(--bg-card)';
            card.style.padding = '1rem';
            card.style.borderRadius = 'var(--radius-sm)';
            card.style.border = '1px solid var(--border-color)';
            card.style.minWidth = '220px';
            card.style.flexShrink = '0';
            card.style.cursor = 'pointer';
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
                <div style="display:flex; justify-content:space-between; gap:0.5rem; align-items:flex-start; margin-bottom:0.45rem;">
                    <div style="font-weight:600; font-size:1.05rem; text-overflow:ellipsis; overflow:hidden; white-space:nowrap; max-width:145px;">${sch.name}</div>
                    <span class="home-schedule-status ${statusClass}">${statusText}</span>
                </div>
                <div style="font-size:0.85rem; color:var(--text-muted); display:flex; flex-direction:column; gap:0.25rem;">
                    <span><i class="ph ph-clock"></i> ${sch.start} - ${sch.end}</span>
                    <span><i class="ph ph-map-pin"></i> ${sch.room}</span>
                </div>
                ${isNow ? `
                    ${hasAttendedToday ? `
                        <div style="margin-top:0.65rem; padding:0.5rem; background:rgba(16, 185, 129, 0.1); border-radius:var(--radius-sm); font-size:0.8rem; color:var(--success); font-weight:600; display:flex; align-items:center; gap:0.35rem;">
                            <i class="ph ph-check-circle" style="font-size:1rem;"></i> Sudah presensi hari ini
                        </div>
                    ` : `
                        <div style="margin-top:0.65rem; font-size:0.78rem; color:var(--warning); font-weight:600; display:flex; align-items:center; gap:0.25rem;">
                            <i class="ph ph-hand-tap"></i> Tap kartu ini untuk isi presensi
                        </div>
                    `}
                ` : (hasAttendedToday ? `
                    <div style="margin-top:0.65rem; font-size:0.75rem; color:var(--success); display:flex; align-items:center; gap:0.35rem; font-weight:600;">
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
            container.innerHTML = `<div style="text-align:center; padding:1rem; color:var(--text-muted); background:var(--bg-card); border-radius:var(--radius-sm); border:1px solid var(--border-color);">${i18n.t('home_empty_urgent_tasks')}</div>`;
            return;
        }

        const today = new Date().toISOString().split('T')[0];

        topTasks.forEach((task, index) => {
            let dueColor = 'var(--text-muted)';
            if (task.dueDate < today) dueColor = 'var(--danger)';
            else if (task.dueDate === today) dueColor = 'var(--warning)';

            const card = document.createElement('div');
            card.className = 'fade-in';
            card.style.animationDelay = `${index * 0.05}s`;
            card.style.background = 'var(--bg-card)';
            card.style.padding = '1rem';
            card.style.borderRadius = 'var(--radius-sm)';
            card.style.border = '1px solid var(--border-color)';
            card.style.marginBottom = '0.5rem';
            card.style.display = 'flex';
            card.style.justifyContent = 'space-between';
            card.style.alignItems = 'center';

            card.innerHTML = `
                <div>
                    <div style="font-weight: 500;">${task.title}</div>
                    <div style="font-size: 0.8rem; color: ${dueColor}; margin-top:0.25rem;"><i class="ph ph-calendar"></i> ${i18n.t('home_due_prefix')} ${task.dueDate}</div>
                </div>
                <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;" onclick="document.querySelector('.nav-item[data-target=\\'view-tasks\\']').click()">${i18n.t('home_view')}</button>
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
            el.style.background = 'var(--primary-light)';
            el.style.padding = '0.75rem 1rem';
            el.style.borderRadius = 'var(--radius-sm)';
            el.style.display = 'flex';
            el.style.justifyContent = 'space-between';
            el.style.alignItems = 'center';
            el.style.borderLeft = '3px solid var(--primary)';

            el.innerHTML = `
                <div style="font-size: 0.9rem; font-weight:500;">${rem.text}</div>
                <button class="icon-btn" onclick="homeManager.deleteReminder('${rem.id}')" style="width:24px; height:24px; background:transparent; border:none; box-shadow:none; color:var(--text-muted);">
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
