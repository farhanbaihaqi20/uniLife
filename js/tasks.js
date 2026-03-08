const tasksManager = {
    tasks: [],
    filter: 'pending', // 'pending' or 'completed'

    init: function () {
        this.tasks = Storage.getTasks();
        this.renderTasks();
        this.setupFilters();
        this.injectTaskModal();
    },

    setupFilters: function () {
        const buttons = document.querySelectorAll('.task-filters .filter-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                buttons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                this.filter = e.target.getAttribute('data-filter');
                this.renderTasks();
            });
        });
    },

    renderTasks: function () {
        const container = document.getElementById('tasks-list');
        if (!container) return;

        container.innerHTML = '';

        const isCompletedFilter = this.filter === 'completed';
        const activeSemester = typeof profileManager !== 'undefined' ? String(profileManager.profile.semester || 1) : '1';

        // Filter by semester first, then by completed status. Treat legacy as '1'.
        const contextTasks = this.tasks.filter(t => {
            const tSem = String(t.semester || 1);
            return tSem === activeSemester;
        });
        let filteredTasks = contextTasks.filter(t => t.completed === isCompletedFilter);

        // Sort by due date (closest first) for pending, or timestamp for completed
        if (!isCompletedFilter) {
            filteredTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        }

        if (filteredTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="ph ph-check-circle"></i>
                    <p>${isCompletedFilter ? i18n.tf('tasks_empty_done', { semester: activeSemester }) : i18n.tf('tasks_empty_active', { semester: activeSemester })}</p>
                </div>
            `;
            return;
        }

        const today = new Date().toISOString().split('T')[0];

        filteredTasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'card';
            if (task.completed) card.style.opacity = '0.7';

            let dueClass = '';
            let dueText = `${i18n.t('tasks_due_prefix')} ${task.dueDate}`;

            if (!task.completed && task.dueDate < today) {
                dueClass = 'color: var(--danger); font-weight: 600;';
                dueText = `${i18n.t('common_overdue_prefix')} ${task.dueDate}`;
            } else if (!task.completed && task.dueDate === today) {
                dueClass = 'color: var(--warning); font-weight: 600;';
                dueText = i18n.t('common_day_today');
            }

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div style="display:flex; gap: 1rem; align-items:flex-start; flex:1">
                        <input type="checkbox" ${task.completed ? 'checked' : ''} 
                            onchange="tasksManager.toggleTask('${task.id}')"
                            style="margin-top:0.3rem; width:1.2rem; height:1.2rem; cursor:pointer;">
                        <div>
                            <h4 style="font-size: 1rem; ${task.completed ? 'text-decoration: line-through;' : ''}">${task.title}</h4>
                            <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">${task.courseName || i18n.t('tasks_general_course')}</p>
                            ${task.notes ? `<p style="font-size: 0.875rem; margin-bottom: 0.5rem;">${task.notes}</p>` : ''}
                            <div style="font-size: 0.75rem; ${dueClass}">
                                <i class="ph ph-calendar"></i> ${dueText}
                            </div>
                        </div>
                    </div>
                    <button class="icon-btn" onclick="tasksManager.deleteTask('${task.id}')" style="width:28px;height:28px;border:none;box-shadow:none;background:transparent;color:var(--danger)">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    },

    toggleTask: function (id) {
        const index = this.tasks.findIndex(t => t.id === id);
        if (index > -1) {
            this.tasks[index].completed = !this.tasks[index].completed;
            Storage.setTasks(this.tasks);
            // Render after slight delay for visual effect
            setTimeout(() => this.renderTasks(), 300);
        }
    },

    deleteTask: function (id) {
        if (confirm(i18n.t('tasks_delete_confirm'))) {
            this.tasks = this.tasks.filter(t => t.id !== id);
            Storage.setTasks(this.tasks);
            this.renderTasks();
        }
    },

    saveTask: function (e) {
        e.preventDefault();

        let courseId = document.getElementById('task-course-id').value;
        let courseName = document.getElementById('task-course').value;

        // If there's an ID, find the real name just in case
        if (courseId) {
            const schedules = Storage.getSchedules();
            const sch = schedules.find(s => s.id === courseId);
            if (sch) courseName = sch.name;
        }

        const newTask = {
            id: uuidv4(),
            semester: typeof profileManager !== 'undefined' ? (profileManager.profile.semester || 1) : 1,
            title: document.getElementById('task-title').value,
            courseId: courseId || null,
            courseName: courseName,
            dueDate: document.getElementById('task-date').value,
            notes: document.getElementById('task-notes').value,
            completed: false
        };

        this.tasks.push(newTask);
        Storage.setTasks(this.tasks);

        // Always show pending tab after adding
        this.filter = 'pending';
        document.querySelectorAll('.task-filters .filter-btn')[0].click();

        this.closeModal();

        // Also update course details if open
        if (typeof scheduleManager !== 'undefined' && courseId) {
            scheduleManager.renderCourseTasks(courseId);
            scheduleManager.renderScheduleList();
        }

        // Update home dashboard
        if (typeof homeManager !== 'undefined') {
            homeManager.renderUpcomingTasks();
        }
    },

    openAddModal: function (courseId = null) {
        document.getElementById('modal-task').classList.add('active');
        document.getElementById('task-date').value = new Date().toISOString().split('T')[0];

        const courseIdInput = document.getElementById('task-course-id');
        const courseNameInput = document.getElementById('task-course');

        if (courseId) {
            const schedules = Storage.getSchedules();
            const sch = schedules.find(s => s.id === courseId);
            if (sch) {
                courseIdInput.value = courseId;
                courseNameInput.value = sch.name;
                courseNameInput.readOnly = true;
                courseNameInput.style.opacity = '0.7';
            }
        } else {
            courseIdInput.value = '';
            courseNameInput.value = '';
            courseNameInput.readOnly = false;
            courseNameInput.style.opacity = '1';
        }
    },

    closeModal: function () {
        document.getElementById('modal-task').classList.remove('active');
        document.getElementById('form-task').reset();
    },

    injectTaskModal: function () {
        const modalHtml = `
            <div class="modal-overlay" id="modal-task">
                <div class="modal-content">
                    <button class="modal-close" onclick="tasksManager.closeModal()"><i class="ph ph-x"></i></button>
                    <h3>${i18n.t('tasks_add_modal_title')}</h3>
                    <form id="form-task" onsubmit="tasksManager.saveTask(event)">
                        <input type="hidden" id="task-course-id">
                        <div class="form-group mt-4">
                            <label>${i18n.t('tasks_what_label')}</label>
                            <input type="text" id="task-title" required placeholder="${i18n.t('tasks_what_placeholder')}">
                        </div>
                        <div class="form-group">
                            <label>${i18n.t('tasks_course_optional')}</label>
                            <input type="text" id="task-course" placeholder="${i18n.t('tasks_course_placeholder')}">
                        </div>
                        <div class="form-group">
                            <label>${i18n.t('tasks_due_date')}</label>
                            <input type="date" id="task-date" required>
                        </div>
                        <div class="form-group">
                            <label>${i18n.t('tasks_notes_optional')}</label>
                            <textarea id="task-notes" style="width:100%; padding:0.75rem; border:1px solid var(--border-color); border-radius:var(--radius-sm); font-family:inherit; resize:vertical; background:var(--bg-card); color:var(--text-main);" rows="3"></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary full-width mt-4">${i18n.t('tasks_save')}</button>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
};
