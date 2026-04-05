const tasksManager = {
    tasks: [],
    filter: 'pending', // 'pending' or 'completed'

    init: function () {
        this.tasks = Storage.getTasks();
        this.renderTasks();
        this.setupFilters();
        this.injectTaskModal();
        this.bindDataSync();
    },

    bindDataSync: function () {
        window.addEventListener('unilifeDataChanged', (event) => {
            if (event.detail && event.detail.key === 'unilife_schedules') {
                this.refreshCourseCategoryField();
            }
        });
    },

    getActiveSemester: function () {
        return typeof profileManager !== 'undefined' ? String(profileManager.profile.semester || 1) : '1';
    },

    getScheduleCourseOptions: function () {
        const activeSemester = this.getActiveSemester();
        const schedules = Storage.getSchedules().filter(s => String(s.semester || 1) === activeSemester);
        schedules.sort((a, b) => a.name.localeCompare(b.name));
        return schedules;
    },

    populateCourseCategoryOptions: function (selectedValue = '') {
        const courseSelect = document.getElementById('task-course-select');
        if (!courseSelect) return;

        const scheduleOptions = this.getScheduleCourseOptions();
        const generalLabel = i18n.t('tasks_course_select_placeholder') || i18n.t('tasks_general_course');
        const customLabel = i18n.t('tasks_course_custom_option') || 'Kategori Lainnya';

        courseSelect.innerHTML = `<option value="">${generalLabel}</option>`;

        scheduleOptions.forEach(schedule => {
            const option = document.createElement('option');
            option.value = schedule.id;
            option.textContent = schedule.name;
            courseSelect.appendChild(option);
        });

        const customOption = document.createElement('option');
        customOption.value = '__custom__';
        customOption.textContent = customLabel;
        courseSelect.appendChild(customOption);

        if (selectedValue) {
            const hasSelected = Array.from(courseSelect.options).some(opt => opt.value === selectedValue);
            courseSelect.value = hasSelected ? selectedValue : '__custom__';
        }
    },

    onCourseCategoryChange: function () {
        const courseSelect = document.getElementById('task-course-select');
        const customWrap = document.getElementById('task-course-custom-wrap');
        const customInput = document.getElementById('task-course-custom');
        const hiddenCourseId = document.getElementById('task-course-id');
        if (!courseSelect || !customWrap || !customInput || !hiddenCourseId) return;

        const selectedValue = courseSelect.value;
        const isCustom = selectedValue === '__custom__';

        customWrap.style.display = isCustom ? 'block' : 'none';
        if (!isCustom) customInput.value = '';

        hiddenCourseId.value = (!isCustom && selectedValue) ? selectedValue : '';
    },

    refreshCourseCategoryField: function () {
        const courseSelect = document.getElementById('task-course-select');
        if (!courseSelect) return;

        const hiddenCourseId = document.getElementById('task-course-id');
        const currentSelection = courseSelect.value;
        const selectedValue = hiddenCourseId && hiddenCourseId.value ? hiddenCourseId.value : currentSelection;

        this.populateCourseCategoryOptions(selectedValue);
        this.onCourseCategoryChange();
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
            let dueClass = '';
            let dueText = `${i18n.t('tasks_due_prefix')} ${task.dueDate}`;
            let borderColor = 'var(--text-muted)';

            if (!task.completed && task.dueDate < today) {
                dueClass = 'color: var(--danger); font-weight: 600;';
                dueText = `${i18n.t('common_overdue_prefix')} ${task.dueDate}`;
                borderColor = 'var(--danger)';
            } else if (!task.completed && task.dueDate === today) {
                dueClass = 'color: var(--warning); font-weight: 600;';
                dueText = i18n.t('common_day_today');
                borderColor = 'var(--warning)';
            } else if (task.completed) {
                borderColor = 'var(--success)';
            }

            const card = document.createElement('div');
            card.className = 'card fade-in task-swipe-card';
            card.setAttribute('data-task-id', task.id);
            card.setAttribute('data-swipe-left', i18n.t('common_delete'));
            card.setAttribute('data-swipe-right', task.completed ? (i18n.t('tasks_filter_active') || 'Aktif') : (i18n.t('tasks_filter_done') || 'Selesai'));
            card.style.borderLeft = `3px solid ${borderColor}`;
            if (task.completed) card.style.opacity = '0.7';

            let timeText = task.dueTime ? ` • ${task.dueTime}` : '';

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
                                <i class="ph ph-calendar"></i> ${dueText}${timeText}
                            </div>
                        </div>
                    </div>
                    <div style="display:flex; gap:0.5rem;">
                        <button class="icon-btn" onclick="tasksManager.editTask('${task.id}')" style="width:28px;height:28px;border:none;box-shadow:none;background:transparent;color:var(--primary)">
                            <i class="ph ph-pencil-simple"></i>
                        </button>
                        <button class="icon-btn" onclick="tasksManager.deleteTask('${task.id}')" style="width:28px;height:28px;border:none;box-shadow:none;background:transparent;color:var(--danger)">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
            this.attachSwipeGesture(card, task);
        });
    },

    attachSwipeGesture: function (card, task) {
        if (!card || !task) return;

        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let isTracking = false;
        let hasHorizontalIntent = false;

        const interactiveSelector = 'button, input, textarea, select, a, label';

        const resetCard = (useSpring = true) => {
            card.classList.remove('swiping-right', 'swiping-left');
            card.style.transition = useSpring ? 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)' : '';
            card.style.transform = 'translateX(0)';
            if (useSpring) {
                setTimeout(() => {
                    card.style.transition = '';
                }, 240);
            }
        };

        const emitHaptic = (pattern = 10) => {
            if ('vibrate' in navigator) navigator.vibrate(pattern);
        };

        card.addEventListener('touchstart', (event) => {
            if (event.touches.length !== 1) return;
            if (event.target.closest(interactiveSelector)) return;

            const touch = event.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            currentX = 0;
            isTracking = true;
            hasHorizontalIntent = false;
            card.style.transition = '';
        }, { passive: true });

        card.addEventListener('touchmove', (event) => {
            if (!isTracking) return;

            const touch = event.touches[0];
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;

            if (!hasHorizontalIntent) {
                if (Math.abs(dy) > Math.abs(dx)) {
                    isTracking = false;
                    return;
                }
                if (Math.abs(dx) < 8) return;
                hasHorizontalIntent = true;
            }

            event.preventDefault();
            currentX = Math.max(-120, Math.min(120, dx));
            card.style.transform = `translateX(${currentX}px)`;

            card.classList.toggle('swiping-right', currentX > 18);
            card.classList.toggle('swiping-left', currentX < -18);
        }, { passive: false });

        card.addEventListener('touchend', () => {
            if (!isTracking) {
                resetCard(false);
                return;
            }

            const completeThreshold = 86;

            if (currentX >= completeThreshold) {
                card.style.transition = 'transform 160ms ease-out';
                card.style.transform = 'translateX(128px)';
                emitHaptic([8, 24, 12]);
                setTimeout(() => this.toggleTask(task.id), 120);
            } else if (currentX <= -completeThreshold) {
                card.style.transition = 'transform 160ms ease-out';
                card.style.transform = 'translateX(-128px)';
                emitHaptic([12]);
                setTimeout(() => this.deleteTask(task.id), 120);
            } else {
                resetCard(true);
            }

            isTracking = false;
            currentX = 0;
        }, { passive: true });

        card.addEventListener('touchcancel', () => {
            isTracking = false;
            currentX = 0;
            resetCard(true);
        }, { passive: true });
    },

    toggleTask: function (id) {
        const index = this.tasks.findIndex(t => t.id === id);
        if (index > -1) {
            this.animateTaskMutation(id, 'complete', () => {
                this.tasks[index].completed = !this.tasks[index].completed;
                Storage.setTasks(this.tasks);
                // Render after slight delay for visual effect
                setTimeout(() => this.renderTasks(), 140);
            });
        }
    },

    deleteTask: function (id) {
        if (confirm(i18n.t('tasks_delete_confirm'))) {
            this.animateTaskMutation(id, 'delete', () => {
                this.tasks = this.tasks.filter(t => t.id !== id);
                Storage.setTasks(this.tasks);
                this.renderTasks();
            });
        }
    },

    animateTaskMutation: function (id, type, onComplete) {
        const card = document.querySelector(`.task-swipe-card[data-task-id="${id}"]`);
        if (!card) {
            if (typeof onComplete === 'function') onComplete();
            return;
        }

        if (type === 'complete') {
            card.classList.add('task-complete-pop');
            if ('vibrate' in navigator) navigator.vibrate([8, 18, 10]);
            setTimeout(() => {
                if (typeof onComplete === 'function') onComplete();
            }, 150);
            return;
        }

        if (type === 'delete') {
            card.classList.add('task-delete-swipe-out');
            if ('vibrate' in navigator) navigator.vibrate([12]);
            setTimeout(() => {
                if (typeof onComplete === 'function') onComplete();
            }, 170);
            return;
        }

        if (typeof onComplete === 'function') onComplete();
    },

    saveTask: function (e) {
        e.preventDefault();

        const idToEdit = document.getElementById('task-id-input').value;
        const selectedCategory = document.getElementById('task-course-select').value;
        const customCategory = document.getElementById('task-course-custom').value.trim();
        let courseId = '';
        let courseName = '';

        if (selectedCategory === '__custom__') {
            courseName = customCategory;
        } else if (selectedCategory) {
            courseId = selectedCategory;
            const schedules = Storage.getSchedules();
            const sch = schedules.find(s => s.id === courseId);
            if (sch) {
                courseName = sch.name;
            }
        }

        if (idToEdit) {
            // Edit existing
            const index = this.tasks.findIndex(t => t.id === idToEdit);
            if (index > -1) {
                this.tasks[index].title = document.getElementById('task-title').value;
                this.tasks[index].courseId = courseId || null;
                this.tasks[index].courseName = courseName;
                this.tasks[index].dueDate = document.getElementById('task-date').value;
                this.tasks[index].dueTime = document.getElementById('task-time').value;
                this.tasks[index].notes = document.getElementById('task-notes').value;
            }
        } else {
            // Add new
            const newTask = {
                id: uuidv4(),
                semester: typeof profileManager !== 'undefined' ? (profileManager.profile.semester || 1) : 1,
                title: document.getElementById('task-title').value,
                courseId: courseId || null,
                courseName: courseName,
                dueDate: document.getElementById('task-date').value,
                dueTime: document.getElementById('task-time').value,
                notes: document.getElementById('task-notes').value,
                completed: false
            };
            this.tasks.push(newTask);
        }

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
        document.getElementById('modal-task-title').innerText = i18n.t('tasks_add_modal_title') || 'Tambah Tugas Baru';
        document.getElementById('task-id-input').value = '';
        document.getElementById('modal-task').classList.add('active');
        document.getElementById('task-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('task-time').value = '23:59';

        const courseIdInput = document.getElementById('task-course-id');
        const courseSelect = document.getElementById('task-course-select');
        const customInput = document.getElementById('task-course-custom');

        this.populateCourseCategoryOptions(courseId || '');
        courseSelect.disabled = false;
        customInput.value = '';

        if (courseId) {
            const schedules = Storage.getSchedules();
            const sch = schedules.find(s => s.id === courseId);
            if (sch) {
                courseIdInput.value = courseId;
                courseSelect.value = courseId;
                courseSelect.disabled = true;
            }
        } else {
            courseIdInput.value = '';
            courseSelect.value = '';
        }

        this.onCourseCategoryChange();
    },

    editTask: function (id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        document.getElementById('modal-task-title').innerText = 'Edit Tugas';
        document.getElementById('task-id-input').value = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-date').value = task.dueDate || new Date().toISOString().split('T')[0];
        document.getElementById('task-time').value = task.dueTime || '23:59';
        document.getElementById('task-notes').value = task.notes || '';

        const courseIdInput = document.getElementById('task-course-id');
        const courseSelect = document.getElementById('task-course-select');
        const customInput = document.getElementById('task-course-custom');

        courseIdInput.value = task.courseId || '';
        this.populateCourseCategoryOptions(task.courseId || '');
        courseSelect.disabled = false;

        if (task.courseId) {
            courseSelect.value = task.courseId;
            customInput.value = '';
        } else if (task.courseName) {
            courseSelect.value = '__custom__';
            customInput.value = task.courseName;
        } else {
            courseSelect.value = '';
            customInput.value = '';
        }

        this.onCourseCategoryChange();
        document.getElementById('modal-task').classList.add('active');
    },

    closeModal: function () {
        document.getElementById('modal-task').classList.remove('active');
        document.getElementById('form-task').reset();
        document.getElementById('task-id-input').value = '';
        document.getElementById('task-course-select').disabled = false;
        document.getElementById('task-course-custom-wrap').style.display = 'none';
    },

    openTaskFromCalendar: function (taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        this.filter = task.completed ? 'completed' : 'pending';
        const filterBtn = document.querySelector(`.task-filters .filter-btn[data-filter="${this.filter}"]`);
        if (filterBtn) filterBtn.click();
        else this.renderTasks();

        setTimeout(() => {
            this.editTask(taskId);
        }, 80);
    },

    injectTaskModal: function () {
        const modalHtml = `
            <div class="modal-overlay" id="modal-task">
                <div class="modal-content">
                    <button class="modal-close" onclick="tasksManager.closeModal()"><i class="ph ph-x"></i></button>
                    <h3 id="modal-task-title">${i18n.t('tasks_add_modal_title')}</h3>
                    <form id="form-task" onsubmit="tasksManager.saveTask(event)">
                        <input type="hidden" id="task-id-input">
                        <input type="hidden" id="task-course-id">
                        <div class="form-group mt-4">
                            <label>${i18n.t('tasks_what_label')}</label>
                            <input type="text" id="task-title" required placeholder="${i18n.t('tasks_what_placeholder')}">
                        </div>
                        <div class="form-group">
                            <label>${i18n.t('tasks_category_optional') || i18n.t('tasks_course_optional')}</label>
                            <select id="task-course-select"></select>
                        </div>
                        <div class="form-group" id="task-course-custom-wrap" style="display:none;">
                            <label>${i18n.t('tasks_course_custom_label') || 'Nama Kategori'}</label>
                            <input type="text" id="task-course-custom" placeholder="${i18n.t('tasks_course_custom_placeholder') || i18n.t('tasks_course_placeholder')}">
                        </div>
                        <div class="form-group row">
                            <div class="col">
                                <label>${i18n.t('tasks_due_date')}</label>
                                <input type="date" id="task-date" required>
                            </div>
                            <div class="col">
                                <label>Jam (Opsional)</label>
                                <input type="time" id="task-time" value="23:59">
                            </div>
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

        document.getElementById('task-course-select').addEventListener('change', () => this.onCourseCategoryChange());
        this.populateCourseCategoryOptions();
        this.onCourseCategoryChange();
    }
};
