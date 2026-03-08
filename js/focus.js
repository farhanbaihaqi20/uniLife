const focusManager = {
    mode: 'work', // 'work' or 'break'
    timeLeft: 25 * 60, // in seconds
    timerInterval: null,
    isRunning: false,
    stats: [],
    currentTaskId: null, // Track which task is being worked on
    focusSessions: [], // Session history

    init: function () {
        this.stats = Storage.getFocusStats();
        this.focusSessions = Storage.getFocusSessions();
        this.renderTaskSelector();
        this.updateStatsUI();
    },

    renderTaskSelector: function () {
        const container = document.getElementById('focus-task-selector');
        if (!container) return;

        container.innerHTML = '';

        // Get active tasks
        const allTasks = Storage.getTasks ? Storage.getTasks() : [];
        const activeSemester = typeof profileManager !== 'undefined' ? String(profileManager.profile.semester || 1) : '1';
        const activeTasks = allTasks.filter(t => {
            const tSem = String(t.semester || 1);
            return tSem === activeSemester && !t.completed;
        });

        if (activeTasks.length === 0) {
            container.innerHTML = '<p style="font-size:0.85rem; color:var(--text-muted); text-align:center;">' + (i18n.t('tasks_empty_active') || 'No active tasks').replace('{semester}', activeSemester) + '</p>';
            return;
        }

        const select = document.createElement('select');
        select.id = 'focus-task-select';
        select.style.width = '100%';
        select.style.padding = '0.75rem';
        select.style.borderRadius = 'var(--radius-md)';
        select.style.border = '1px solid var(--border-color)';
        select.style.background = 'var(--bg-card)';
        select.style.color = 'var(--text-main)';
        select.style.fontSize = '0.9rem';

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.innerText = i18n.t('focus_select_task') || 'Select Task (Optional)';
        select.appendChild(defaultOption);

        activeTasks.forEach(task => {
            const option = document.createElement('option');
            option.value = task.id;
            option.innerText = task.title + (task.courseName ? ` (${task.courseName})` : '');
            select.appendChild(option);
        });

        select.value = this.currentTaskId || '';
        select.addEventListener('change', (e) => {
            this.currentTaskId = e.target.value || null;
        });

        container.appendChild(select);
    },

    setMode: function (mode) {
        if (this.isRunning) {
            if (!confirm(i18n.t('focus_switch_confirm'))) return;
            this.pauseTimer();
        }

        this.mode = mode;
        this.timeLeft = mode === 'work' ? 25 * 60 : 5 * 60;

        document.getElementById('btn-focus-work').style.background = mode === 'work' ? 'var(--primary)' : 'transparent';
        document.getElementById('btn-focus-work').style.color = mode === 'work' ? 'white' : 'var(--primary)';

        document.getElementById('btn-focus-break').style.background = mode === 'break' ? 'var(--success)' : 'transparent';
        document.getElementById('btn-focus-break').style.color = mode === 'break' ? 'white' : 'var(--success)';
        document.getElementById('btn-focus-break').style.borderColor = mode === 'break' ? 'var(--success)' : 'var(--primary)';

        const statusEl = document.getElementById('pomodoro-status');
        statusEl.innerText = mode === 'work' ? i18n.t('focus_status_work') : i18n.t('focus_status_break');
        statusEl.style.color = mode === 'work' ? 'var(--primary)' : 'var(--success)';

        this.updateTimerDisplay();
    },

    toggleTimer: function () {
        if (this.isRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    },

    startTimer: function () {
        if (this.timeLeft <= 0) this.resetTimer();

        this.isRunning = true;
        document.getElementById('btn-focus-toggle').innerHTML = '<i class="ph ph-pause"></i>';

        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();

            if (this.timeLeft <= 0) {
                this.completeSession();
            }
        }, 1000);
    },

    pauseTimer: function () {
        this.isRunning = false;
        clearInterval(this.timerInterval);
        document.getElementById('btn-focus-toggle').innerHTML = '<i class="ph ph-play"></i>';
    },

    resetTimer: function () {
        this.pauseTimer();
        this.timeLeft = this.mode === 'work' ? 25 * 60 : 5 * 60;
        this.updateTimerDisplay();
    },

    updateTimerDisplay: function () {
        const mins = Math.floor(this.timeLeft / 60);
        const secs = this.timeLeft % 60;
        document.getElementById('pomodoro-timer').innerText =
            `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    completeSession: function () {
        this.pauseTimer();

        // Play simple notification sound natively
        if ('Notification' in window && Notification.permission === "granted") {
            new Notification(i18n.t('focus_notification_title'), { body: this.mode === 'work' ? i18n.t('focus_notification_work_done') : i18n.t('focus_notification_break_done') });
        } else if ('Notification' in window && Notification.permission !== "denied") {
            Notification.requestPermission();
        }

        // Only record stats if it was a work session
        if (this.mode === 'work') {
            this.recordSession();
            alert(i18n.t('focus_alert_work_done'));
            this.setMode('break');
        } else {
            alert(i18n.t('focus_alert_break_done'));
            this.setMode('work');
        }
    },

    recordSession: function () {
        const today = new Date().toISOString().split('T')[0];
        let todayStat = this.stats.find(s => s.date === today);

        if (todayStat) {
            todayStat.sessions += 1;
            todayStat.totalMinutes += 25;
        } else {
            this.stats.push({
                date: today,
                sessions: 1,
                totalMinutes: 25
            });
        }

        Storage.setFocusStats(this.stats);

        // Save focus session with task linkage
        if (this.currentTaskId) {
            this.focusSessions.push({
                id: uuidv4(),
                taskId: this.currentTaskId,
                date: new Date().toISOString(),
                duration: 25, // minutes
                completed: true
            });
        } else {
            // Even without task linkage, save the session for streak tracking
            this.focusSessions.push({
                id: uuidv4(),
                taskId: null,
                date: new Date().toISOString(),
                duration: 25, // minutes
                completed: true
            });
        }
        Storage.setFocusSessions(this.focusSessions);

        this.updateStatsUI();
        
        // Update profile dashboard if profileManager is available
        if (typeof profileManager !== 'undefined' && profileManager.updateDashboardStats) {
            profileManager.updateDashboardStats();
        }
        
        this.renderTaskSelector(); // Refresh in case tasks changed
    },

    updateStatsUI: function () {
        const today = new Date().toISOString().split('T')[0];
        const todayStat = this.stats.find(s => s.date === today) || { sessions: 0, totalMinutes: 0 };

        const sessionsEl = document.getElementById('stats-sessions');
        const minutesEl = document.getElementById('stats-minutes');

        if (sessionsEl) sessionsEl.innerText = todayStat.sessions;
        if (minutesEl) minutesEl.innerText = todayStat.totalMinutes;
    }
};
