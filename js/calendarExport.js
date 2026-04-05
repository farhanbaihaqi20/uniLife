const calendarExport = {
    dayMap: {
        1: 'MO', // Monday
        2: 'TU', // Tuesday
        3: 'WE', // Wednesday
        4: 'TH', // Thursday
        5: 'FR', // Friday
        6: 'SA'  // Saturday
    },

    formatDate: function (date) {
        // Format: YYYYMMDDTHHMMSSZ
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    },

    formatDateOnly: function (date) {
        // Format: YYYYMMDD
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    },

    escapeICS: function (value) {
        return String(value || '')
            .replace(/\\/g, '\\\\')
            .replace(/\n/g, '\\n')
            .replace(/,/g, '\\,')
            .replace(/;/g, '\\;');
    },

    getExportMonthScope: function () {
        const baseDate = (typeof calendarManager !== 'undefined' && calendarManager.currentMonth)
            ? new Date(calendarManager.currentMonth)
            : new Date();
        return {
            year: baseDate.getFullYear(),
            month: baseDate.getMonth()
        };
    },

    isSameMonth: function (dateInput, monthScope) {
        if (!monthScope) return true;
        const d = new Date(dateInput);
        if (Number.isNaN(d.getTime())) return false;
        return d.getFullYear() === monthScope.year && d.getMonth() === monthScope.month;
    },

    generateScheduleEvents: function (monthScope = null) {
        const schedules = Storage.getSchedules ? Storage.getSchedules() : [];
        const activeSemester = typeof profileManager !== 'undefined' ? String(profileManager.profile.semester || 1) : '1';

        // Filter by active semester
        const activeSchedules = schedules.filter(s => String(s.semester || 1) === activeSemester);

        let events = [];

        activeSchedules.forEach(schedule => {
            if (monthScope) {
                const targetWeekDay = Number(schedule.day || 1);
                const jsDay = targetWeekDay === 7 ? 0 : targetWeekDay;
                const firstOfMonth = new Date(monthScope.year, monthScope.month, 1);
                const lastOfMonth = new Date(monthScope.year, monthScope.month + 1, 0);
                const firstDow = firstOfMonth.getDay();
                let delta = (jsDay - firstDow + 7) % 7;

                for (let dayNum = 1 + delta; dayNum <= lastOfMonth.getDate(); dayNum += 7) {
                    const occDate = new Date(monthScope.year, monthScope.month, dayNum);
                    const [startHour, startMin] = String(schedule.start || '08:00').split(':');
                    const [endHour, endMin] = String(schedule.end || '09:00').split(':');
                    const startDate = new Date(occDate);
                    const endDate = new Date(occDate);
                    startDate.setHours(parseInt(startHour, 10), parseInt(startMin, 10), 0, 0);
                    endDate.setHours(parseInt(endHour, 10), parseInt(endMin, 10), 0, 0);

                    const event = [
                        'BEGIN:VEVENT',
                        `UID:${schedule.id}-${this.formatDateOnly(occDate)}@unilife`,
                        `DTSTAMP:${this.formatDate(new Date())}`,
                        `DTSTART:${this.formatDate(startDate)}`,
                        `DTEND:${this.formatDate(endDate)}`,
                        `SUMMARY:${this.escapeICS(schedule.name)}`,
                        `DESCRIPTION:${this.escapeICS(`Lecturer: ${schedule.lecturer || '-'}\nCredits: ${schedule.sks} SKS`)}`,
                        `LOCATION:${this.escapeICS(schedule.room || 'TBA')}`,
                        'END:VEVENT'
                    ].join('\r\n');

                    events.push(event);
                }
                return;
            }

            // Find next occurrence of this day
            const today = new Date();
            const targetDay = schedule.day;
            const currentDay = today.getDay() || 7; // Sunday = 7
            let daysUntilNext = (targetDay - currentDay + 7) % 7;
            if (daysUntilNext === 0) daysUntilNext = 7; // If today, schedule for next week

            const nextOccurrence = new Date(today);
            nextOccurrence.setDate(today.getDate() + daysUntilNext);

            // Set time
            const [startHour, startMin] = schedule.start.split(':');
            const [endHour, endMin] = schedule.end.split(':');

            const startDate = new Date(nextOccurrence);
            startDate.setHours(parseInt(startHour), parseInt(startMin), 0, 0);

            const endDate = new Date(nextOccurrence);
            endDate.setHours(parseInt(endHour), parseInt(endMin), 0, 0);

            // Generate event with weekly recurrence for next 4 months (~16 weeks)
            const untilDate = new Date(startDate);
            untilDate.setMonth(untilDate.getMonth() + 4);

            const event = [
                'BEGIN:VEVENT',
                `UID:${schedule.id}@unilife`,
                `DTSTAMP:${this.formatDate(new Date())}`,
                `DTSTART:${this.formatDate(startDate)}`,
                `DTEND:${this.formatDate(endDate)}`,
                `RRULE:FREQ=WEEKLY;BYDAY=${this.dayMap[schedule.day]};UNTIL=${this.formatDate(untilDate)}`,
                `SUMMARY:${this.escapeICS(schedule.name)}`,
                `DESCRIPTION:${this.escapeICS(`Lecturer: ${schedule.lecturer || '-'}\nCredits: ${schedule.sks} SKS`)}`,
                `LOCATION:${this.escapeICS(schedule.room || 'TBA')}`,
                'END:VEVENT'
            ].join('\r\n');

            events.push(event);
        });

        return events;
    },

    generateTaskEvents: function (monthScope = null) {
        const tasks = Storage.getTasks ? Storage.getTasks() : [];
        const activeSemester = typeof profileManager !== 'undefined' ? String(profileManager.profile.semester || 1) : '1';

        // Filter by active semester and not completed
        const activeTasks = tasks.filter(t => {
            const tSem = String(t.semester || 1);
            const sameMonth = monthScope ? this.isSameMonth(t.dueDate, monthScope) : true;
            return tSem === activeSemester && !t.completed && sameMonth;
        });

        let events = [];

        activeTasks.forEach(task => {
            const event = [
                'BEGIN:VEVENT',
                `UID:${task.id}@unilife`,
                `DTSTAMP:${this.formatDate(new Date())}`,
                `DTSTART;VALUE=DATE:${this.formatDateOnly(task.dueDate)}`,
                `SUMMARY:${this.escapeICS(`📝 ${task.title}`)}`,
                `DESCRIPTION:${this.escapeICS(`Course: ${task.courseName || 'General'}${task.notes ? '\n\nNotes: ' + task.notes : ''}`)}`,
                'STATUS:CONFIRMED',
                'BEGIN:VALARM',
                'TRIGGER:-PT1H',
                'DESCRIPTION:Task due in 1 hour',
                'ACTION:DISPLAY',
                'END:VALARM',
                'END:VEVENT'
            ].join('\r\n');

            events.push(event);
        });

        return events;
    },

    generateAgendaEvents: function (monthScope = null) {
        const agendas = Storage.getScheduleAgendas ? Storage.getScheduleAgendas() : [];
        const schedules = Storage.getSchedules ? Storage.getSchedules() : [];
        const activeSemester = typeof profileManager !== 'undefined' ? String(profileManager.profile.semester || 1) : '1';

        const activeAgendas = agendas.filter(a => {
            const semOk = String(a.semester || 1) === activeSemester;
            const monthOk = monthScope ? this.isSameMonth(a.date, monthScope) : true;
            return semOk && monthOk;
        });
        const events = [];

        activeAgendas.forEach(agenda => {
            const linkedSchedule = schedules.find(s => s.id === agenda.scheduleId);
            const hasTime = !!agenda.time;

            let eventLines = [
                'BEGIN:VEVENT',
                `UID:${agenda.id}@unilife-agenda`,
                `DTSTAMP:${this.formatDate(new Date())}`
            ];

            if (hasTime) {
                const startDate = new Date(`${agenda.date}T${agenda.time}:00`);
                const endDate = new Date(startDate);
                endDate.setHours(endDate.getHours() + 1);
                eventLines.push(`DTSTART:${this.formatDate(startDate)}`);
                eventLines.push(`DTEND:${this.formatDate(endDate)}`);
            } else {
                eventLines.push(`DTSTART;VALUE=DATE:${this.formatDateOnly(agenda.date)}`);
            }

            eventLines.push(`SUMMARY:${this.escapeICS(`📌 ${agenda.title}`)}`);

            const description = [
                `Type: Agenda`,
                `Course: ${linkedSchedule ? linkedSchedule.name : 'Non-course Agenda'}`,
                agenda.notes ? `Notes: ${agenda.notes}` : ''
            ].filter(Boolean).join('\n');

            eventLines.push(`DESCRIPTION:${this.escapeICS(description)}`);

            if (linkedSchedule && linkedSchedule.room) {
                eventLines.push(`LOCATION:${this.escapeICS(linkedSchedule.room)}`);
            }

            if (agenda.reminderType && agenda.reminderType !== 'none') {
                eventLines.push('BEGIN:VALARM');
                if (agenda.reminderType === 'h-7') eventLines.push('TRIGGER:-P7D');
                else if (agenda.reminderType === 'h-3') eventLines.push('TRIGGER:-P3D');
                else if (agenda.reminderType === 'h-1') eventLines.push('TRIGGER:-P1D');
                else if (agenda.reminderType === 'custom' && agenda.customReminderAt) eventLines.push(`TRIGGER;VALUE=DATE-TIME:${this.formatDate(new Date(agenda.customReminderAt))}`);
                else eventLines.push('TRIGGER:-P1D');

                eventLines.push(`DESCRIPTION:${this.escapeICS(agenda.title || 'Agenda Reminder')}`);
                eventLines.push('ACTION:DISPLAY');
                eventLines.push('END:VALARM');
            }

            eventLines.push('END:VEVENT');
            events.push(eventLines.join('\r\n'));
        });

        return events;
    },

    generateAttendanceEvents: function (monthScope = null) {
        const records = Storage.getAttendanceRecords ? Storage.getAttendanceRecords() : [];
        const schedules = Storage.getSchedules ? Storage.getSchedules() : [];
        const activeSemester = typeof profileManager !== 'undefined' ? String(profileManager.profile.semester || 1) : '1';

        const activeRecords = records.filter(r => {
            const semOk = String(r.semester || 1) === activeSemester && !!r.timestamp;
            const monthOk = monthScope ? this.isSameMonth(r.timestamp, monthScope) : true;
            return semOk && monthOk;
        });
        const statusMap = {
            hadir: 'Hadir',
            izin: 'Izin',
            tidak_hadir: 'Tidak Hadir',
            tidak_terlaksana: 'Kelas Tidak Terlaksana'
        };

        return activeRecords.map(record => {
            const schedule = schedules.find(s => s.id === record.scheduleId);
            const startDate = new Date(record.timestamp);
            const endDate = new Date(startDate);
            endDate.setMinutes(endDate.getMinutes() + 30);
            const statusLabel = statusMap[record.status] || record.status || '-';

            return [
                'BEGIN:VEVENT',
                `UID:${record.id || `${record.scheduleId}-${record.meetingNumber || ''}-${startDate.getTime()}`}@unilife-attendance`,
                `DTSTAMP:${this.formatDate(new Date())}`,
                `DTSTART:${this.formatDate(startDate)}`,
                `DTEND:${this.formatDate(endDate)}`,
                `SUMMARY:${this.escapeICS(`✅ Presensi: ${schedule ? schedule.name : 'Kelas'}`)}`,
                `DESCRIPTION:${this.escapeICS(`Status: ${statusLabel}${record.reason ? `\nAlasan: ${record.reason}` : ''}`)}`,
                'END:VEVENT'
            ].join('\r\n');
        });
    },

    generateICS: function () {
        const scheduleEvents = this.generateScheduleEvents();
        const taskEvents = this.generateTaskEvents();
        const agendaEvents = this.generateAgendaEvents();
        const attendanceEvents = this.generateAttendanceEvents();

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//UniLife Tracker//Academic Calendar//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:UniLife Full Academic Calendar',
            'X-WR-TIMEZONE:Asia/Jakarta',
            ...scheduleEvents,
            ...taskEvents,
            ...agendaEvents,
            ...attendanceEvents,
            'END:VCALENDAR'
        ].join('\r\n');

        return icsContent;
    },

    generateICSForMonth: function (monthScope) {
        const scheduleEvents = this.generateScheduleEvents(monthScope);
        const taskEvents = this.generateTaskEvents(monthScope);
        const agendaEvents = this.generateAgendaEvents(monthScope);
        const attendanceEvents = this.generateAttendanceEvents(monthScope);

        return [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//UniLife Tracker//Academic Calendar//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:UniLife Monthly Calendar',
            'X-WR-TIMEZONE:Asia/Jakarta',
            ...scheduleEvents,
            ...taskEvents,
            ...agendaEvents,
            ...attendanceEvents,
            'END:VCALENDAR'
        ].join('\r\n');
    },

    downloadICS: function () {
        const icsContent = this.generateICS();
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = 'unilife-full-calendar.ics';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        // Show toast
        this.showToast(i18n.t('calendar_exported_full') || i18n.t('calendar_exported') || 'Full calendar exported!');
    },

    downloadICSMonth: function () {
        const monthScope = this.getExportMonthScope();
        const icsContent = this.generateICSForMonth(monthScope);
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        const monthPart = String(monthScope.month + 1).padStart(2, '0');
        link.href = url;
        link.download = `unilife-calendar-${monthScope.year}-${monthPart}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
        this.showToast(i18n.t('calendar_exported_month') || 'Monthly calendar exported!');
    },

    showToast: function (message) {
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.top = 'auto';
        toast.style.bottom = 'calc(86px + env(safe-area-inset-bottom))';
        toast.style.left = 'max(12px, env(safe-area-inset-left))';
        toast.style.right = 'max(12px, env(safe-area-inset-right))';
        toast.style.margin = '0 auto';
        toast.style.background = 'var(--success)';
        toast.style.color = 'white';
        toast.style.padding = '0.75rem 1.25rem';
        toast.style.borderRadius = 'var(--radius-md)';
        toast.style.boxShadow = 'var(--shadow-lg)';
        toast.style.zIndex = '1000';
        toast.style.fontSize = '0.9rem';
        toast.style.fontWeight = '500';
        toast.style.maxWidth = 'calc(100vw - 40px)';
        toast.style.wordWrap = 'break-word';
        toast.innerHTML = `<i class="ph ph-check-circle" style="margin-right: 0.5rem;"></i>${message}`;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    addExportButtons: function () {
        // Add export button to schedule view
        const scheduleHeader = document.querySelector('#view-schedule .section-header');
        if (scheduleHeader && !document.getElementById('export-schedule-btn')) {
            const exportBtn = document.createElement('button');
            exportBtn.id = 'export-schedule-btn';
            exportBtn.className = 'btn-premium-export';
            exportBtn.style.marginLeft = '0.5rem';
            exportBtn.innerHTML = '<i class="ph ph-calendar-plus"></i> <span data-i18n="calendar_export">Ekspor</span>';
            exportBtn.onclick = () => this.downloadICS();
            scheduleHeader.appendChild(exportBtn);
        }

        // Add export button to tasks view
        const tasksHeader = document.querySelector('#view-tasks .section-header');
        if (tasksHeader && !document.getElementById('export-tasks-btn')) {
            const exportBtn = document.createElement('button');
            exportBtn.id = 'export-tasks-btn';
            exportBtn.className = 'btn-premium-export';
            exportBtn.style.marginLeft = '0.5rem';
            exportBtn.innerHTML = '<i class="ph ph-calendar-plus"></i> <span data-i18n="calendar_export">Ekspor</span>';
            exportBtn.onclick = () => this.downloadICS();
            tasksHeader.appendChild(exportBtn);
        }

        // Add export button to calendar view (full export)
        const calendarHeader = document.querySelector('#view-calendar .section-header');
        if (calendarHeader && !document.getElementById('export-calendar-more-wrap')) {
            const oldMonthBtn = document.getElementById('export-calendar-month-btn');
            const oldFullBtn = document.getElementById('export-calendar-full-btn');
            if (oldMonthBtn) oldMonthBtn.remove();
            if (oldFullBtn) oldFullBtn.remove();

            const wrapper = document.createElement('div');
            wrapper.id = 'export-calendar-more-wrap';
            wrapper.className = 'calendar-export-more-wrapper';
            wrapper.innerHTML = `
                <button type="button" id="export-calendar-more-btn" class="icon-btn" aria-haspopup="true" aria-expanded="false" aria-label="Opsi ekspor kalender">
                    <i class="ph ph-dots-three-outline-vertical"></i>
                </button>
                <div id="export-calendar-more-menu" class="calendar-export-more-menu" hidden>
                    <button type="button" class="calendar-export-more-item" id="export-calendar-month-action">
                        <i class="ph ph-calendar-check"></i>
                        <span data-i18n="calendar_export_month">Ekspor Bulan Ini</span>
                    </button>
                    <button type="button" class="calendar-export-more-item" id="export-calendar-full-action">
                        <i class="ph ph-file-arrow-down"></i>
                        <span data-i18n="calendar_export_full">Ekspor Full ICS</span>
                    </button>
                </div>
            `;
            calendarHeader.appendChild(wrapper);

            const toggleBtn = wrapper.querySelector('#export-calendar-more-btn');
            const menu = wrapper.querySelector('#export-calendar-more-menu');
            const monthAction = wrapper.querySelector('#export-calendar-month-action');
            const fullAction = wrapper.querySelector('#export-calendar-full-action');

            const closeMenu = () => {
                if (!menu || !toggleBtn) return;
                menu.hidden = true;
                menu.classList.remove('active');
                toggleBtn.setAttribute('aria-expanded', 'false');
            };

            const openMenu = () => {
                if (!menu || !toggleBtn) return;
                menu.hidden = false;
                menu.classList.add('active');
                toggleBtn.setAttribute('aria-expanded', 'true');
            };

            if (toggleBtn) {
                toggleBtn.addEventListener('click', (event) => {
                    event.stopPropagation();
                    if (menu && menu.classList.contains('active')) closeMenu();
                    else openMenu();
                });
            }

            if (monthAction) {
                monthAction.addEventListener('click', () => {
                    closeMenu();
                    this.downloadICSMonth();
                });
            }

            if (fullAction) {
                fullAction.addEventListener('click', () => {
                    closeMenu();
                    this.downloadICS();
                });
            }

            document.addEventListener('click', (event) => {
                if (!wrapper.contains(event.target)) {
                    closeMenu();
                }
            });
        }

        // Translate buttons if i18n is already initialized
        if (typeof i18n !== 'undefined') {
            i18n.translateDOM();
        }
    }
};
