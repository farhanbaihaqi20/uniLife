const deadlineRadar = {
    init: function () {
        this.renderRadar();
    },

    calculateRiskScore: function (task) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        
        // Calculate base risk score
        let riskScore = 0;
        
        // Days factor (most important)
        if (daysUntilDue < 0) {
            riskScore += 100; // Overdue - critical
        } else if (daysUntilDue === 0) {
            riskScore += 80; // Due today
        } else if (daysUntilDue <= 2) {
            riskScore += 60; // Due within 2 days
        } else if (daysUntilDue <= 5) {
            riskScore += 40; // Due within a week
        } else if (daysUntilDue <= 7) {
            riskScore += 20;
        } else {
            riskScore += Math.max(0, 10 - daysUntilDue); // Decrease as further away
        }

        // Course weight factor (if linked to schedule with SKS)
        if (task.courseId) {
            const schedules = Storage.getSchedules ? Storage.getSchedules() : [];
            const course = schedules.find(s => s.id === task.courseId);
            if (course && course.sks) {
                riskScore += course.sks * 3; // Higher SKS = higher priority
            }
        }

        // Focus sessions factor (tasks with no focus sessions are higher risk)
        const focusSessions = Storage.getFocusSessions ? Storage.getFocusSessions() : [];
        const taskSessions = focusSessions.filter(s => s.taskId === task.id);
        if (taskSessions.length === 0 && daysUntilDue <= 7) {
            riskScore += 15; // No progress yet and due soon
        }

        return Math.min(100, riskScore); // Cap at 100
    },

    getRiskLevel: function (score) {
        if (score >= 60) return 'high';
        if (score >= 30) return 'medium';
        return 'low';
    },

    renderRadar: function () {
        const container = document.getElementById('deadline-radar');
        if (!container) return;

        container.innerHTML = '';

        // Get active tasks for current semester
        const allTasks = Storage.getTasks ? Storage.getTasks() : [];
        const activeSemester = typeof profileManager !== 'undefined' ? String(profileManager.profile.semester || 1) : '1';
        const activeTasks = allTasks.filter(t => {
            const tSem = String(t.semester || 1);
            return tSem === activeSemester && !t.completed;
        });

        if (activeTasks.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:1.5rem; color:var(--text-muted); background:var(--bg-card); border-radius:var(--radius-md); border:1px solid var(--border-color);">
                    <i class="ph ph-check-circle" style="font-size:2rem; color:var(--success); margin-bottom:0.5rem;"></i>
                    <p>${i18n.t('radar_empty') || 'No urgent deadlines'}</p>
                </div>
            `;
            return;
        }

        // Calculate risk scores and sort
        const tasksWithRisk = activeTasks.map(task => ({
            ...task,
            riskScore: this.calculateRiskScore(task),
            riskLevel: this.getRiskLevel(this.calculateRiskScore(task))
        }));

        tasksWithRisk.sort((a, b) => b.riskScore - a.riskScore);

        // Show top 3 high-risk tasks
        const topRisks = tasksWithRisk.slice(0, 3);

        topRisks.forEach(task => {
            const riskColors = {
                high: { bg: '#fef2f2', border: '#ef4444', text: '#dc2626' },
                medium: { bg: '#fef3c7', border: '#f59e0b', text: '#d97706' },
                low: { bg: '#f0fdf4', border: '#22c55e', text: '#16a34a' }
            };

            const colors = riskColors[task.riskLevel];
            const riskLabel = task.riskLevel === 'high' ? (i18n.t('radar_risk_high') || 'High Risk') :
                              task.riskLevel === 'medium' ? (i18n.t('radar_risk_medium') || 'Warning') :
                              (i18n.t('radar_risk_low') || 'Safe');

            const el = document.createElement('div');
            el.className = 'radar-item';
            el.style.background = colors.bg;
            el.style.border = `2px solid ${colors.border}`;
            el.style.borderRadius = 'var(--radius-md)';
            el.style.padding = '1rem';
            el.style.marginBottom = '0.75rem';
            el.style.cursor = 'pointer';
            el.onclick = () => {
                document.querySelector('.nav-item[data-target="view-tasks"]').click();
            };

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = new Date(task.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

            let dueDateText = task.dueDate;
            if (daysUntilDue < 0) {
                dueDateText = `${i18n.t('common_overdue_prefix') || 'Overdue:'} ${Math.abs(daysUntilDue)} ${i18n.currentLang === 'en' ? 'days' : 'hari'}`;
            } else if (daysUntilDue === 0) {
                dueDateText = i18n.t('common_day_today') || 'Today!';
            } else if (daysUntilDue <= 7) {
                dueDateText = `${daysUntilDue} ${i18n.currentLang === 'en' ? 'days left' : 'hari lagi'}`;
            }

            el.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                    <span style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: ${colors.text}; background: white; padding: 0.2rem 0.6rem; border-radius: 12px;">${riskLabel}</span>
                    <span style="font-size: 0.75rem; color: ${colors.text}; font-weight: 600;"><i class="ph ph-calendar"></i> ${dueDateText}</span>
                </div>
                <div style="font-weight: 600; font-size: 1rem; color: var(--text-main); margin-bottom: 0.25rem;">${task.title}</div>
                <div style="font-size: 0.85rem; color: var(--text-muted);">${task.courseName || (i18n.t('tasks_general_course') || 'General')}</div>
            `;

            container.appendChild(el);
        });

        // Add "View All" link if more tasks exist
        if (tasksWithRisk.length > 3) {
            const viewAll = document.createElement('button');
            viewAll.className = 'btn btn-outline';
            viewAll.style.width = '100%';
            viewAll.style.marginTop = '0.5rem';
            viewAll.innerHTML = `<i class="ph ph-arrow-right"></i> ${i18n.t('home_see_all') || 'See All'} (${tasksWithRisk.length - 3} ${i18n.currentLang === 'en' ? 'more' : 'lagi'})`;
            viewAll.onclick = () => {
                document.querySelector('.nav-item[data-target="view-tasks"]').click();
            };
            container.appendChild(viewAll);
        }
    }
};
