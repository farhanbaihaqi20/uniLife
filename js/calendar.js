const calendarManager = {
    currentMonth: null,
    selectedDate: null,

    focusToday: function (shouldRender = true) {
        const now = new Date();
        this.currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        this.selectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        this.selectedDate.setHours(0, 0, 0, 0);

        if (shouldRender) this.render();
    },

    init: function () {
        this.focusToday(false);

        this.bindControls();
        this.render();
    },

    bindControls: function () {
        const prevBtn = document.getElementById('calendar-prev-month');
        const nextBtn = document.getElementById('calendar-next-month');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
                this.render();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
                this.render();
            });
        }
    },

    renderWeekdays: function () {
        const container = document.getElementById('calendar-weekdays');
        if (!container) return;

        const settings = Storage.getSettings ? Storage.getSettings() : { language: 'id' };
        const labels = settings.language === 'en'
            ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            : ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

        container.innerHTML = labels.map(label => `<span>${label}</span>`).join('');
    },

    getActiveSemester: function () {
        return typeof profileManager !== 'undefined' ? String(profileManager.profile.semester || 1) : '1';
    },

    isExamPriorityTitle: function (title) {
        const normalized = String(title || '').toLowerCase();
        return normalized.includes('uts') || normalized.includes('uas');
    },

    isAgendaPriority: function (agenda) {
        if (!agenda) return false;
        return !!agenda.isPriorityManual || this.isExamPriorityTitle(agenda.title);
    },

    getMonthLabel: function () {
        const settings = Storage.getSettings ? Storage.getSettings() : { language: 'id' };
        const locale = settings.language === 'en' ? 'en-US' : 'id-ID';
        return this.currentMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    },

    padDate: function (date) {
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        return `${date.getFullYear()}-${m}-${d}`;
    },

    parseDateKey: function (dateKey) {
        const parts = String(dateKey || '').split('-').map(Number);
        if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
        return new Date(parts[0], parts[1] - 1, parts[2]);
    },

    getScheduleEventsForDate: function (dateKey) {
        const activeSemester = this.getActiveSemester();
        const parsedDate = this.parseDateKey(dateKey);
        if (!parsedDate) return [];

        const schedules = Storage.getSchedules().filter(s => String(s.semester || 1) === activeSemester);
        const jsDay = parsedDate.getDay();

        return schedules
            .filter(s => Number(s.day) === jsDay)
            .sort((a, b) => String(a.start || '').localeCompare(String(b.start || '')))
            .map(s => ({
                type: 'schedule',
                id: s.id,
                day: Number(s.day),
                title: s.name,
                subtitle: `${s.start || '--:--'} - ${s.end || '--:--'} • ${s.room || '-'}`,
                time: s.start || '00:00'
            }));
    },

    getTaskEventsForDate: function (dateKey) {
        const activeSemester = this.getActiveSemester();
        const tasks = Storage.getTasks().filter(t => {
            const semesterOk = String(t.semester || 1) === activeSemester;
            return semesterOk && !t.completed && t.dueDate === dateKey;
        });

        return tasks
            .sort((a, b) => String(a.dueTime || '23:59').localeCompare(String(b.dueTime || '23:59')))
            .map(t => ({
                type: 'task',
                id: t.id,
                title: t.title,
                subtitle: `${t.courseName || (i18n.t('tasks_general_course') || 'Umum')} • ${i18n.t('tasks_due_prefix') || 'Tenggat:'} ${t.dueDate}${t.dueTime ? ` ${t.dueTime}` : ''}`,
                time: t.dueTime || '23:59'
            }));
    },

    getAgendaEventsForDate: function (dateKey) {
        const activeSemester = this.getActiveSemester();
        const agendas = Storage.getScheduleAgendas ? Storage.getScheduleAgendas() : [];
        const schedules = Storage.getSchedules();

        return agendas
            .filter(a => String(a.semester || 1) === activeSemester && a.date === dateKey)
            .sort((a, b) => String(a.time || '23:55').localeCompare(String(b.time || '23:55')))
            .map(a => {
                const schedule = schedules.find(s => s.id === a.scheduleId);
                const isPriority = this.isAgendaPriority(a);
                return {
                    type: 'agenda',
                    id: a.id,
                    scheduleId: a.scheduleId,
                    title: a.title,
                    subtitle: `${schedule ? schedule.name : (i18n.t('schedule_agenda_non_course') || 'Agenda Non-Matkul')} • ${a.time || '--:--'}${a.notes ? ` • ${a.notes}` : ''}`,
                    time: a.time || '23:55',
                    priority: isPriority
                };
            });
    },

    getAttendanceEventsForDate: function (dateKey) {
        const activeSemester = this.getActiveSemester();
        const records = Storage.getAttendanceRecords().filter(r => String(r.semester || 1) === activeSemester);
        const schedules = Storage.getSchedules();

        return records
            .filter(r => {
                if (!r.timestamp) return false;
                const recDate = new Date(r.timestamp);
                return this.padDate(recDate) === dateKey;
            })
            .map(r => {
                const schedule = schedules.find(s => s.id === r.scheduleId);
                const statusMap = {
                    hadir: i18n.t('attendance_present') || 'Hadir',
                    izin: i18n.t('attendance_excused') || 'Izin',
                    tidak_hadir: i18n.t('attendance_absent') || 'Tidak Hadir',
                    tidak_terlaksana: i18n.t('attendance_class_not_held') || 'Kelas Tidak Terlaksana'
                };

                return {
                    type: 'attendance',
                    id: r.id,
                    title: schedule ? schedule.name : (i18n.t('attendance_title') || 'Presensi'),
                    subtitle: `${i18n.t('attendance_status') || 'Status'}: ${statusMap[r.status] || r.status || '-'}`,
                    time: schedule && schedule.start ? schedule.start : '23:58'
                };
            });
    },

    getDateEvents: function (dateKey) {
        const events = [
            ...this.getScheduleEventsForDate(dateKey),
            ...this.getTaskEventsForDate(dateKey),
            ...this.getAgendaEventsForDate(dateKey),
            ...this.getAttendanceEventsForDate(dateKey)
        ];

        return events.sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
    },

    buildEventMapForMonth: function () {
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        const totalDays = new Date(year, month + 1, 0).getDate();
        const eventMap = {};

        for (let day = 1; day <= totalDays; day += 1) {
            const date = new Date(year, month, day);
            const key = this.padDate(date);
            const events = this.getDateEvents(key);
            if (events.length > 0) eventMap[key] = events;
        }

        return eventMap;
    },

    renderGrid: function (eventMap) {
        const grid = document.getElementById('calendar-grid');
        if (!grid) return;

        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        const firstDayJs = new Date(year, month, 1).getDay();
        const firstWeekday = firstDayJs === 0 ? 7 : firstDayJs;
        const totalDays = new Date(year, month + 1, 0).getDate();

        grid.innerHTML = '';

        for (let i = 1; i < firstWeekday; i += 1) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-day calendar-day-empty';
            grid.appendChild(emptyCell);
        }

        for (let day = 1; day <= totalDays; day += 1) {
            const date = new Date(year, month, day);
            const dateKey = this.padDate(date);
            const isToday = dateKey === this.padDate(new Date());
            const isSelected = this.selectedDate && dateKey === this.padDate(this.selectedDate);
            const events = eventMap[dateKey] || [];

            const cell = document.createElement('button');
            cell.type = 'button';
            const hasPriorityAgenda = events.some(e => e.type === 'agenda' && e.priority);
            cell.className = `calendar-day ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''} ${hasPriorityAgenda ? 'has-priority' : ''}`.trim();
            cell.setAttribute('data-date', dateKey);

            const scheduleCount = events.filter(e => e.type === 'schedule').length;
            const taskCount = events.filter(e => e.type === 'task').length;
            const agendaCount = events.filter(e => e.type === 'agenda').length;
            const indicators = [];
            if (scheduleCount > 0) {
                indicators.push(`<span class="calendar-day-indicator ind-schedule">${i18n.t('calendar_badge_schedule_short') || 'Jad'} ${scheduleCount}</span>`);
            }
            if (taskCount > 0) {
                indicators.push(`<span class="calendar-day-indicator ind-task">${i18n.t('calendar_badge_task_short') || 'Tugas'} ${taskCount}</span>`);
            }
            if (agendaCount > 0) {
                indicators.push(`<span class="calendar-day-indicator ind-agenda ${hasPriorityAgenda ? 'ind-priority' : ''}">${i18n.t('calendar_badge_agenda_short') || 'Agenda'} ${agendaCount}</span>`);
            }
            const badge = indicators.length > 0
                ? `<div class="calendar-day-indicators">${indicators.join('')}</div>`
                : '';
            const todayChip = isToday
                ? `<span class="calendar-today-chip">${i18n.t('common_day_today') || 'Hari ini!'}</span>`
                : '';

            cell.innerHTML = `
                <span class="calendar-day-number">${day}</span>
                ${todayChip}
                ${badge}
            `;

            cell.addEventListener('click', () => {
                this.selectedDate = new Date(date);
                this.selectedDate.setHours(0, 0, 0, 0);
                this.render();
            });

            grid.appendChild(cell);
        }
    },

    renderAgenda: function (eventMap) {
        const agendaEl = document.getElementById('calendar-agenda-list');
        const dateLabelEl = document.getElementById('calendar-selected-date-label');
        if (!agendaEl || !dateLabelEl) return;

        const selectedKey = this.selectedDate ? this.padDate(this.selectedDate) : this.padDate(new Date());
        const selectedDateObj = this.parseDateKey(selectedKey) || new Date();
        const settings = Storage.getSettings ? Storage.getSettings() : { language: 'id' };
        const locale = settings.language === 'en' ? 'en-US' : 'id-ID';
        dateLabelEl.textContent = selectedDateObj.toLocaleDateString(locale, {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });

        const events = eventMap[selectedKey] || this.getDateEvents(selectedKey);
        agendaEl.innerHTML = '';

        if (events.length === 0) {
            agendaEl.innerHTML = `<div class="calendar-empty">${i18n.t('calendar_empty_day') || 'Tidak ada agenda di tanggal ini.'}</div>`;
            return;
        }

        events.forEach(event => {
            const item = document.createElement('div');
            item.className = `calendar-agenda-item type-${event.type} ${event.priority ? 'priority-exam' : ''}`;
            item.style.cursor = 'pointer';

            let icon = 'ph-calendar-blank';
            if (event.type === 'task') icon = 'ph-check-square-offset';
            if (event.type === 'agenda') icon = 'ph-megaphone-simple';
            if (event.type === 'attendance') icon = 'ph-check-circle';

            item.innerHTML = `
                <div class="calendar-agenda-icon"><i class="ph ${icon}"></i></div>
                <div class="calendar-agenda-body">
                    <div class="calendar-agenda-title">${event.title || '-'}</div>
                    <div class="calendar-agenda-subtitle">${event.subtitle || '-'}</div>
                    ${event.priority ? `<div class="calendar-priority-tag">${i18n.t('schedule_agenda_priority_exam') || 'Prioritas UTS/UAS'}</div>` : ''}
                    <div class="calendar-agenda-open-hint">${i18n.t('calendar_open_source_hint') || 'Tap untuk buka sumber'}</div>
                </div>
            `;

            item.addEventListener('click', () => this.openEventSource(event));

            agendaEl.appendChild(item);
        });
    },

    openEventSource: function (event) {
        if (!event) return;

        if (event.type === 'task') {
            if (typeof window.openView === 'function') {
                window.openView('view-tasks', 'view-tasks');
            }
            if (typeof tasksManager !== 'undefined' && typeof tasksManager.openTaskFromCalendar === 'function') {
                tasksManager.openTaskFromCalendar(event.id);
            }
            return;
        }

        if (event.type === 'schedule') {
            if (typeof window.openView === 'function') {
                window.openView('view-schedule', 'view-schedule');
            }
            if (typeof scheduleManager !== 'undefined') {
                scheduleManager.currentActiveTab = Number(event.day || scheduleManager.currentActiveTab || 1);
                scheduleManager.renderTabs();
                scheduleManager.renderScheduleList();
                setTimeout(() => scheduleManager.openCourseDetailModal(event.id), 80);
            }
            return;
        }

        if (event.type === 'agenda') {
            if (typeof scheduleManager !== 'undefined' && typeof scheduleManager.openAgendaFromCalendar === 'function') {
                scheduleManager.openAgendaFromCalendar(event.id);
            } else if (typeof window.openView === 'function' && typeof scheduleManager !== 'undefined') {
                window.openView('view-calendar', 'view-calendar');
                scheduleManager.openAgendaModal('', event.id, { fromCalendar: true });
            }
            return;
        }

        if (event.type === 'attendance') {
            if (typeof presensiManager !== 'undefined' && typeof presensiManager.openDashboard === 'function') {
                presensiManager.openDashboard();
            }
        }
    },

    render: function () {
        const monthLabel = document.getElementById('calendar-month-label');
        if (monthLabel) monthLabel.textContent = this.getMonthLabel();

        this.renderWeekdays();
        const eventMap = this.buildEventMapForMonth();
        this.renderGrid(eventMap);
        this.renderAgenda(eventMap);
    }
};
