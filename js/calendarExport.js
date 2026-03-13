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

    generateScheduleEvents: function () {
        const schedules = Storage.getSchedules ? Storage.getSchedules() : [];
        const activeSemester = typeof profileManager !== 'undefined' ? String(profileManager.profile.semester || 1) : '1';

        // Filter by active semester
        const activeSchedules = schedules.filter(s => String(s.semester || 1) === activeSemester);

        let events = [];

        activeSchedules.forEach(schedule => {
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
                `SUMMARY:${schedule.name}`,
                `DESCRIPTION:Lecturer: ${schedule.lecturer || '-'}\\nCredits: ${schedule.sks} SKS`,
                `LOCATION:${schedule.room || 'TBA'}`,
                'END:VEVENT'
            ].join('\r\n');

            events.push(event);
        });

        return events;
    },

    generateTaskEvents: function () {
        const tasks = Storage.getTasks ? Storage.getTasks() : [];
        const activeSemester = typeof profileManager !== 'undefined' ? String(profileManager.profile.semester || 1) : '1';

        // Filter by active semester and not completed
        const activeTasks = tasks.filter(t => {
            const tSem = String(t.semester || 1);
            return tSem === activeSemester && !t.completed;
        });

        let events = [];

        activeTasks.forEach(task => {
            const dueDate = new Date(task.dueDate + 'T23:59:00');

            const event = [
                'BEGIN:VEVENT',
                `UID:${task.id}@unilife`,
                `DTSTAMP:${this.formatDate(new Date())}`,
                `DTSTART;VALUE=DATE:${this.formatDateOnly(task.dueDate)}`,
                `SUMMARY:📝 ${task.title}`,
                `DESCRIPTION:Course: ${task.courseName || 'General'}${task.notes ? '\\n\\nNotes: ' + task.notes : ''}`,
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

    generateICS: function () {
        const scheduleEvents = this.generateScheduleEvents();
        const taskEvents = this.generateTaskEvents();

        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//UniLife Tracker//Academic Calendar//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:UniLife Academic Calendar',
            'X-WR-TIMEZONE:Asia/Jakarta',
            ...scheduleEvents,
            ...taskEvents,
            'END:VCALENDAR'
        ].join('\r\n');

        return icsContent;
    },

    downloadICS: function () {
        const icsContent = this.generateICS();
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = 'unilife-academic-calendar.ics';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        // Show toast
        this.showToast(i18n.t('calendar_exported') || 'Calendar exported!');
    },

    showToast: function (message) {
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.bottom = '100px';
        toast.style.right = '20px';
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

        // Translate buttons if i18n is already initialized
        if (typeof i18n !== 'undefined') {
            i18n.translateDOM();
        }
    }
};
