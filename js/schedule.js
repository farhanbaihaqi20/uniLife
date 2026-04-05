const scheduleManager = {
    schedules: [],
    agendas: [],
    days: [],
    currentActiveTab: new Date().getDay() || 1, // 0 is Sunday, map to 1 if Sunday (Senin)

    init: function () {
        this.schedules = Storage.getSchedules();
        this.agendas = Storage.getScheduleAgendas ? Storage.getScheduleAgendas() : [];

        // Map JS Sunday(0) to our tab array (if Sunday, default to Senin=1)
        let dayOfWeek = new Date().getDay();
        this.currentActiveTab = dayOfWeek === 0 ? 1 : dayOfWeek;

        this.renderTabs();
        this.renderScheduleList();
        this.setupForm();
        this.setupAgendaForm();
    },

    setupAgendaForm: function () {
        const form = document.getElementById('form-schedule-agenda');
        if (!form || form.dataset.bound === '1') return;

        form.addEventListener('submit', (e) => this.saveAgenda(e));
        const reminderSelect = document.getElementById('agenda-reminder');
        if (reminderSelect) {
            reminderSelect.addEventListener('change', () => this.toggleAgendaReminderInput());
        }
        form.dataset.bound = '1';
    },

    toggleAgendaReminderInput: function () {
        const reminderSelect = document.getElementById('agenda-reminder');
        const customWrap = document.getElementById('agenda-reminder-custom-wrap');
        if (!reminderSelect || !customWrap) return;

        customWrap.style.display = reminderSelect.value === 'custom' ? 'block' : 'none';
    },

    isExamPriorityTitle: function (title) {
        const normalized = String(title || '').toLowerCase();
        return normalized.includes('uts') || normalized.includes('uas');
    },

    isAgendaPriority: function (agenda) {
        if (!agenda) return false;
        return !!agenda.isPriorityManual || this.isExamPriorityTitle(agenda.title);
    },

    getActiveSemester: function () {
        return typeof profileManager !== 'undefined'
            ? String((profileManager.profile && profileManager.profile.semester) || 1)
            : '1';
    },

    getAgendaCourseOptions: function () {
        const activeSemester = this.getActiveSemester();
        return this.schedules
            .filter(s => String(s.semester || 1) === activeSemester)
            .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    },

    populateAgendaCourseOptions: function (selectedScheduleId = '', lockSelection = false) {
        const select = document.getElementById('agenda-course-select');
        if (!select) return;

        const options = this.getAgendaCourseOptions();
        const noneLabel = i18n.t('schedule_agenda_course_none') || 'Tanpa Integrasi Matkul';
        select.innerHTML = `<option value="">${noneLabel}</option>`;

        options.forEach(schedule => {
            const option = document.createElement('option');
            option.value = schedule.id;
            option.textContent = schedule.name;
            select.appendChild(option);
        });

        select.value = selectedScheduleId || '';
        select.disabled = !!lockSelection;
        select.style.opacity = lockSelection ? '0.65' : '1';
        select.style.cursor = lockSelection ? 'not-allowed' : 'pointer';
    },

    renderTabs: function () {
        const container = document.querySelector('.day-tabs');
        if (!container) return;

        container.innerHTML = '';
        this.days = [1, 2, 3, 4, 5, 6].map((dayNum) => i18n.t(`schedule_day_${dayNum}`));
        this.days.forEach((day, index) => {
            const dayValue = index + 1;
            const btn = document.createElement('button');
            btn.className = `day-tab ${this.currentActiveTab === dayValue ? 'active' : ''}`;
            btn.innerText = day;
            btn.onclick = () => {
                this.currentActiveTab = dayValue;
                this.renderTabs();
                this.renderScheduleList();
            };
            container.appendChild(btn);
        });

    },

    renderScheduleList: function () {
        const container = document.getElementById('schedule-list');
        if (!container) return;

        const activeSemester = typeof profileManager !== 'undefined'
            ? String(profileManager.profile.semester || 1)
            : '1';
        const contextSchedules = this.schedules.filter(s => String(s.semester || 1) === activeSemester);

        container.innerHTML = '';
        const daySchedules = contextSchedules.filter(s => s.day == this.currentActiveTab);

        // Sort by start time
        daySchedules.sort((a, b) => a.start.localeCompare(b.start));

        if (daySchedules.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="ph ph-coffee"></i>
                    <p>${i18n.tf('schedule_empty', { semester: activeSemester })}</p>
                </div>
            `;
            return;
        }

        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const currentDayStr = now.getDay(); // Keep native JS index so Sunday stays 0

        const allTasks = Storage.getTasks();

        daySchedules.forEach(sch => {
            const card = document.createElement('div');

            // Check if it's currently running
            let isNow = false;
            if (currentDayStr === this.currentActiveTab) {
                const [startH, startM] = sch.start.split(':').map(Number);
                const [endH, endM] = sch.end.split(':').map(Number);
                const startMins = startH * 60 + startM;
                const endMins = endH * 60 + endM;
                if (currentTime >= startMins && currentTime <= endMins) {
                    isNow = true;
                }
            }

            const pendingTasksForCourse = allTasks.filter(t => !t.completed && t.courseId === sch.id).length;
            const taskBadge = pendingTasksForCourse > 0 ? `<span style="background:var(--danger-light); color:var(--danger); padding:0.1rem 0.4rem; border-radius:10px; font-size:0.7rem; font-weight:600; margin-left:0.5rem;">${i18n.tf('schedule_task_badge', { count: pendingTasksForCourse })}</span>` : '';
            // Check if course has goal set
            let goalIcon = '';
            if (typeof gradesManager !== 'undefined' && typeof gradeGoals !== 'undefined') {
                const semester = gradesManager.semesters.find(sem => {
                    return sem.courses.some(c => c.linkedScheduleId === sch.id);
                });
                if (semester) {
                    const course = semester.courses.find(c => c.linkedScheduleId === sch.id);
                    if (course) {
                        const hasGoal = gradeGoals.getGoal(semester.id, course.id);
                        goalIcon = `<button class="icon-btn" onclick="event.stopPropagation(); scheduleManager.openTargetForSchedule('${sch.id}')" style="width:28px;height:28px;font-size:0.9rem;background:${hasGoal ? '#667eea' : 'var(--primary-light)'};color:${hasGoal ? 'white' : 'var(--primary)'};margin-left:0.5rem;border:none;box-shadow:0 2px 4px ${hasGoal ? 'rgba(102,126,234,0.3)' : 'rgba(59,130,246,0.2)'}" title="${i18n.t('goal_set') || 'Set Target'}"><i class="ph-bold ${hasGoal ? 'ph-target' : 'ph-plus'}"></i></button>`;
                    }
                }
            }
            card.className = `card schedule-card ${isNow ? 'is-now' : ''}`;
            card.setAttribute('data-schedule-id', sch.id);
            card.style.cursor = 'pointer';
            card.onclick = () => this.openCourseDetailModal(sch.id, card);

            card.innerHTML = `
                <div class="schedule-time">
                    ${sch.start}
                    <span class="end-time">${sch.end}</span>
                </div>
                <div class="schedule-info flex-1">
                    <div class="schedule-title" style="display:flex; align-items:center;">${sch.name} ${taskBadge}${goalIcon}</div>
                    <div class="schedule-meta mb-1">
                        <span><i class="ph ph-chalkboard-teacher"></i> ${sch.lecturer || '-'}</span>
                    </div>
                    <div class="schedule-meta">
                        <span><i class="ph ph-map-pin"></i> ${sch.room || '-'}</span>
                        <span><i class="ph ph-clock"></i> ${sch.sks} SKS</span>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    },

    setupForm: function () {
        const form = document.getElementById('form-schedule');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const scheduleId = document.getElementById('sch-id').value;
            const isEditMode = !!scheduleId;

            const scheduleData = {
                id: isEditMode ? scheduleId : uuidv4(),
                semester: typeof profileManager !== 'undefined' ? (profileManager.profile.semester || 1) : 1,
                name: document.getElementById('sch-name').value,
                code: document.getElementById('sch-code').value,
                day: parseInt(document.getElementById('sch-day').value),
                sks: parseInt(document.getElementById('sch-sks').value),
                start: document.getElementById('sch-start').value,
                end: document.getElementById('sch-end').value,
                room: document.getElementById('sch-room').value,
                lecturer: document.getElementById('sch-lecturer').value,
            };

            if (isEditMode) {
                // Edit existing schedule
                const index = this.schedules.findIndex(s => s.id === scheduleId);
                if (index > -1) {
                    this.schedules[index] = scheduleData;

                    // Update linked grade course name if needed
                    if (typeof gradesManager !== 'undefined') {
                        gradesManager.semesters.forEach(sem => {
                            const linkedCourse = sem.courses.find(c => c.linkedScheduleId === scheduleId);
                            if (linkedCourse) {
                                linkedCourse.name = scheduleData.name;
                                linkedCourse.sks = scheduleData.sks;
                            }
                        });
                        Storage.setGrades(gradesManager.semesters);
                        gradesManager.renderStats();
                        gradesManager.renderSemesters();
                    }

                    // Sync linked task course names when schedule name changes.
                    const allTasks = Storage.getTasks();
                    let tasksUpdated = false;
                    allTasks.forEach(task => {
                        if (task.courseId === scheduleId) {
                            task.courseName = scheduleData.name;
                            tasksUpdated = true;
                        }
                    });
                    if (tasksUpdated) {
                        Storage.setTasks(allTasks);
                        if (typeof tasksManager !== 'undefined') {
                            tasksManager.tasks = allTasks;
                            tasksManager.renderTasks();
                        }
                    }
                }
            } else {
                // Add new schedule
                this.schedules.push(scheduleData);

                // Auto-create course in grades
                if (typeof gradesManager !== 'undefined') {
                    const currentSemester = scheduleData.semester;
                    const semesterName = `Semester ${currentSemester}`;

                    // Find or create semester
                    let semester = gradesManager.semesters.find(s => s.name.toLowerCase() === semesterName.toLowerCase());
                    if (!semester) {
                        semester = {
                            id: uuidv4(),
                            name: semesterName,
                            courses: []
                        };
                        gradesManager.semesters.push(semester);
                    }

                    // Check if course already exists
                    const courseExists = semester.courses.some(c => c.linkedScheduleId === scheduleData.id);
                    if (!courseExists) {
                        semester.courses.push({
                            id: uuidv4(),
                            name: scheduleData.name,
                            sks: scheduleData.sks,
                            finalScore: null,
                            grade: '',
                            isFinalEntered: false,
                            linkedScheduleId: scheduleData.id
                        });
                    }

                    Storage.setGrades(gradesManager.semesters);
                    gradesManager.renderStats();
                    gradesManager.renderSemesters();
                }
            }

            Storage.setSchedules(this.schedules);
            this.closeModal();
            this.currentActiveTab = scheduleData.day;
            this.renderTabs();
            this.renderScheduleList();
            if (typeof tasksManager !== 'undefined' && typeof tasksManager.refreshCourseCategoryField === 'function') {
                tasksManager.refreshCourseCategoryField();
            }
            form.reset();
        });
    },

    openAddModal: function (editId = null) {
        const modal = document.getElementById('modal-schedule');
        const form = document.getElementById('form-schedule');
        const modalTitle = modal.querySelector('h3');

        form.reset();

        if (editId) {
            // Edit mode
            const schedule = this.schedules.find(s => s.id === editId);
            if (!schedule) return;

            modalTitle.removeAttribute('data-i18n'); // Remove earlier data-i18n if any
            modalTitle.innerText = i18n.t('schedule_edit_modal_title') || 'Edit Jadwal Mata Kuliah';
            document.getElementById('sch-id').value = schedule.id;
            document.getElementById('sch-name').value = schedule.name;
            document.getElementById('sch-code').value = schedule.code || '';
            document.getElementById('sch-sks').value = schedule.sks || 3;
            document.getElementById('sch-day').value = schedule.day;
            document.getElementById('sch-start').value = schedule.start;
            document.getElementById('sch-end').value = schedule.end;
            document.getElementById('sch-room').value = schedule.room || '';
            document.getElementById('sch-lecturer').value = schedule.lecturer || '';
        } else {
            // Add mode
            modalTitle.innerText = i18n.t('schedule_add_modal_title') || 'Tambah Jadwal Mata Kuliah';
            document.getElementById('sch-id').value = '';
            // Preset day to current active tab
            document.getElementById('sch-day').value = this.currentActiveTab;
        }

        modal.classList.add('active');
    },

    closeModal: function () {
        document.getElementById('modal-schedule').classList.remove('active');
    },

    openAgendaModal: function (scheduleId, agendaId = null, options = {}) {
        const modal = document.getElementById('modal-schedule-agenda');
        if (!modal) return;

        const titleEl = document.getElementById('schedule-agenda-modal-title');
        const deleteBtn = document.getElementById('agenda-delete-btn');

        document.getElementById('agenda-id').value = '';
        document.getElementById('agenda-schedule-id').value = scheduleId || '';
        document.getElementById('agenda-title').value = '';
        document.getElementById('agenda-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('agenda-time').value = '';
        document.getElementById('agenda-notes').value = '';
        document.getElementById('agenda-reminder').value = 'h-1';
        document.getElementById('agenda-reminder-custom-time').value = '';
        document.getElementById('agenda-priority-manual').checked = false;
        this.toggleAgendaReminderInput();
        deleteBtn.style.display = 'none';

        const lockSelection = !!scheduleId && !options.fromCalendar;
        this.populateAgendaCourseOptions(scheduleId || '', lockSelection);

        if (agendaId) {
            const agenda = this.agendas.find(a => a.id === agendaId);
            if (!agenda) return;

            document.getElementById('agenda-id').value = agenda.id;
            document.getElementById('agenda-schedule-id').value = agenda.scheduleId;
            document.getElementById('agenda-title').value = agenda.title || '';
            document.getElementById('agenda-date').value = agenda.date || new Date().toISOString().split('T')[0];
            document.getElementById('agenda-time').value = agenda.time || '';
            document.getElementById('agenda-notes').value = agenda.notes || '';
            document.getElementById('agenda-reminder').value = agenda.reminderType || 'h-1';
            document.getElementById('agenda-reminder-custom-time').value = agenda.customReminderAt || '';
            document.getElementById('agenda-priority-manual').checked = !!agenda.isPriorityManual;
            this.toggleAgendaReminderInput();
            deleteBtn.style.display = 'inline-flex';

            const editLockSelection = !!agenda.scheduleId && !options.fromCalendar;
            this.populateAgendaCourseOptions(agenda.scheduleId || '', editLockSelection);

            if (titleEl) {
                titleEl.removeAttribute('data-i18n');
                titleEl.innerText = i18n.t('schedule_agenda_edit_title') || 'Edit Acara Matkul';
            }
        } else if (titleEl) {
            if (options.fromCalendar && !scheduleId) {
                titleEl.removeAttribute('data-i18n');
                titleEl.innerText = i18n.t('calendar_add_agenda') || 'Tambah Agenda';
            } else {
                titleEl.setAttribute('data-i18n', 'schedule_agenda_add_title');
                titleEl.innerText = i18n.t('schedule_agenda_add_title') || 'Tambah Acara Matkul';
            }
        }

        modal.classList.add('active');
        if (typeof i18n !== 'undefined' && typeof i18n.translateDOM === 'function') {
            i18n.translateDOM();
        }

        const courseDetailModal = document.getElementById('modal-course-detail');
        if (courseDetailModal && courseDetailModal.classList.contains('active')) {
            courseDetailModal.classList.add('blurred');
        }
    },

    closeAgendaModal: function () {
        const modal = document.getElementById('modal-schedule-agenda');
        if (!modal) return;
        modal.classList.remove('active');

        const courseDetailModal = document.getElementById('modal-course-detail');
        if (courseDetailModal) {
            courseDetailModal.classList.remove('blurred');
        }
    },

    saveAgenda: function (e) {
        e.preventDefault();

        const agendaId = document.getElementById('agenda-id').value;
        const hiddenScheduleId = document.getElementById('agenda-schedule-id').value;
        const selectedScheduleId = document.getElementById('agenda-course-select').value;
        const scheduleId = selectedScheduleId || hiddenScheduleId || '';
        const activeSemester = this.getActiveSemester();

        const payload = {
            id: agendaId || uuidv4(),
            scheduleId,
            semester: activeSemester,
            title: document.getElementById('agenda-title').value.trim(),
            date: document.getElementById('agenda-date').value,
            time: document.getElementById('agenda-time').value || '',
            notes: document.getElementById('agenda-notes').value.trim(),
            reminderType: document.getElementById('agenda-reminder').value || 'h-1',
            customReminderAt: document.getElementById('agenda-reminder').value === 'custom'
                ? (document.getElementById('agenda-reminder-custom-time').value || '')
                : '',
            isPriorityManual: !!document.getElementById('agenda-priority-manual').checked,
            updatedAt: new Date().toISOString()
        };

        if (!payload.title || !payload.date) return;
        if (payload.reminderType === 'custom' && !payload.customReminderAt) {
            alert(i18n.t('schedule_agenda_reminder_custom_required') || 'Isi waktu reminder custom terlebih dahulu.');
            return;
        }

        if (!agendaId) payload.createdAt = new Date().toISOString();

        if (agendaId) {
            const idx = this.agendas.findIndex(a => a.id === agendaId);
            if (idx > -1) {
                this.agendas[idx] = { ...this.agendas[idx], ...payload };
            }
        } else {
            this.agendas.push(payload);
        }

        Storage.setScheduleAgendas(this.agendas);
        this.closeAgendaModal();

        const currentCourseId = document.getElementById('detail-course-id')?.value;
        if (currentCourseId) this.renderCourseAgendas(currentCourseId);
    },

    deleteAgendaFromModal: function () {
        const agendaId = document.getElementById('agenda-id').value;
        if (!agendaId) return;
        if (!confirm(i18n.t('schedule_agenda_delete_confirm') || 'Hapus agenda ini?')) return;

        this.agendas = this.agendas.filter(a => a.id !== agendaId);
        Storage.setScheduleAgendas(this.agendas);
        this.closeAgendaModal();

        const currentCourseId = document.getElementById('detail-course-id')?.value;
        if (currentCourseId) this.renderCourseAgendas(currentCourseId);
    },

    renderCourseAgendas: function (courseId) {
        const container = document.getElementById('detail-course-agendas');
        if (!container) return;

        const activeSemester = this.getActiveSemester();
        const courseAgendas = this.agendas
            .filter(a => a.scheduleId === courseId && String(a.semester || 1) === activeSemester)
            .sort((a, b) => {
                const aDate = `${a.date || ''}T${a.time || '23:59'}`;
                const bDate = `${b.date || ''}T${b.time || '23:59'}`;
                return new Date(aDate) - new Date(bDate);
            });

        container.innerHTML = '';

        if (courseAgendas.length === 0) {
            container.innerHTML = `<div style="font-size:0.85rem; color:var(--text-muted); text-align:center; padding:0.75rem;">${i18n.t('schedule_detail_no_agenda') || 'Belum ada agenda untuk matkul ini.'}</div>`;
            return;
        }

        const todayKey = new Date().toISOString().split('T')[0];
        courseAgendas.forEach(agenda => {
            const isPast = agenda.date < todayKey;
            const isPriority = this.isAgendaPriority(agenda);
            const item = document.createElement('div');
            item.style.background = 'var(--bg-card)';
            item.style.padding = '0.7rem';
            item.style.borderRadius = 'var(--radius-sm)';
            item.style.border = `1px solid ${isPriority ? 'rgba(239, 68, 68, 0.5)' : (isPast ? 'var(--border-color)' : 'rgba(245, 158, 11, 0.4)')}`;
            if (isPriority) {
                item.style.boxShadow = '0 0 0 1px rgba(239, 68, 68, 0.16)';
            }
            item.style.cursor = 'pointer';
            item.onclick = () => this.openAgendaModal(courseId, agenda.id);

            const reminderLabelMap = {
                'h-7': i18n.t('schedule_agenda_reminder_h7') || 'H-7',
                'h-3': i18n.t('schedule_agenda_reminder_h3') || 'H-3',
                'h-1': i18n.t('schedule_agenda_reminder_h1') || 'H-1',
                'custom': i18n.t('schedule_agenda_reminder_custom') || 'Jam tertentu',
                'none': i18n.t('schedule_agenda_reminder_none') || 'Tanpa pengingat'
            };
            const reminderLabel = reminderLabelMap[agenda.reminderType || 'h-1'];

            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; gap:0.5rem; align-items:flex-start;">
                    <div style="font-size:0.9rem; font-weight:600;">${agenda.title}</div>
                    <div style="display:flex; gap:0.28rem; flex-wrap:wrap; justify-content:flex-end;">
                        <span style="font-size:0.72rem; padding:0.12rem 0.4rem; border-radius:999px; background:${isPriority ? 'rgba(239, 68, 68, 0.14)' : 'rgba(245, 158, 11, 0.12)'}; color:${isPriority ? '#B91C1C' : '#B45309'};">${i18n.t('schedule_agenda_badge') || 'Acara'}</span>
                        ${isPriority ? `<span style="font-size:0.72rem; padding:0.12rem 0.4rem; border-radius:999px; background:rgba(239, 68, 68, 0.14); color:#B91C1C;">${i18n.t('schedule_agenda_priority_exam') || 'Prioritas UTS/UAS'}</span>` : ''}
                    </div>
                </div>
                <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.2rem;">
                    <i class="ph ph-calendar"></i> ${agenda.date}${agenda.time ? ` • ${agenda.time}` : ''}
                </div>
                <div style="font-size:0.75rem; color:var(--primary); margin-top:0.25rem; font-weight:600;">
                    <i class="ph ph-bell"></i> ${reminderLabel}
                </div>
                ${agenda.notes ? `<div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.3rem; line-height:1.35;">${agenda.notes}</div>` : ''}
            `;

            container.appendChild(item);
        });
    },

    deleteSchedule: function (id) {
        if (confirm(i18n.t('schedule_delete_confirm'))) {
            this.schedules = this.schedules.filter(s => s.id !== id);
            Storage.setSchedules(this.schedules);

            const allTasks = Storage.getTasks();
            let tasksUpdated = false;
            allTasks.forEach(task => {
                if (task.courseId === id) {
                    task.courseId = null;
                    tasksUpdated = true;
                }
            });
            if (tasksUpdated) {
                Storage.setTasks(allTasks);
                if (typeof tasksManager !== 'undefined') {
                    tasksManager.tasks = allTasks;
                    tasksManager.renderTasks();
                }
            }

            if (typeof tasksManager !== 'undefined' && typeof tasksManager.refreshCourseCategoryField === 'function') {
                tasksManager.refreshCourseCategoryField();
            }
            this.renderScheduleList();

            // Update home if active
            if (typeof homeManager !== 'undefined') homeManager.renderTodaySchedule();
        }
    },

    // --- V2: Course Details Modal ---
    openCourseDetailModal: function (courseId, sourceCard = null) {
        const sch = this.schedules.find(s => s.id === courseId);
        if (!sch) return;

        document.getElementById('detail-course-id').value = sch.id;
        document.getElementById('detail-course-name').innerText = sch.name;
        document.getElementById('detail-course-meta').innerHTML = `<i class="ph ph-clock"></i> ${sch.start} - ${sch.end} &bull; ${sch.room || '-'}`;

        // Render tasks
        const tasksContainer = document.getElementById('detail-course-tasks');
        tasksContainer.innerHTML = '';
        const courseTasks = tasksManager.tasks.filter(t => t.courseId === courseId && t.status !== 'completed');

        if (courseTasks.length === 0) {
            tasksContainer.innerHTML = `<div style="font-size:0.875rem; color:var(--text-muted); text-align:center; padding:1rem;">${i18n.t('schedule_detail_no_active_tasks')}</div>`;
        } else {
            courseTasks.forEach(task => {
                tasksContainer.innerHTML += `
                    <div style="background:var(--bg-card); padding:0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <div style="font-weight:600; font-size:0.9rem;">${task.title}</div>
                            <div style="font-size:0.75rem; color:var(--danger);"><i class="ph ph-calendar"></i> ${task.dueDate}</div>
                        </div>
                    </div>
                `;
            });
        }

        // Render notes for this schedule
        const notesContainer = document.getElementById('detail-course-notes');
        notesContainer.innerHTML = '';
        if (typeof notesManager !== 'undefined') {
            const courseNotes = notesManager.notes.filter(n => n.scheduleId === courseId);
            if (courseNotes.length === 0) {
                notesContainer.innerHTML = `<div style="font-size:0.875rem; color:var(--text-muted); text-align:center; padding:1rem;">Belum ada catatan untuk matkul ini.</div>`;
            } else {
                courseNotes.forEach(note => {
                    const preview = note.content.length > 80 ? note.content.substring(0, 80) + '...' : note.content;
                    notesContainer.innerHTML += `
                        <div style="background:var(--bg-card); padding:0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border-color); cursor:pointer;" onclick="notesManager.editNote('${note.id}')">
                            <div style="font-weight:600; font-size:0.9rem; margin-bottom:0.25rem;">${note.title}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted); line-height:1.4;">${preview}</div>
                        </div>
                    `;
                });
            }
        }

        this.renderCourseAgendas(courseId);

        // Render grade status
        const gradeInfo = document.getElementById('detail-course-grade-info');
        let linkedCourse = null;

        if (typeof gradesManager !== 'undefined') {
            gradesManager.semesters.forEach(sem => {
                const found = sem.courses.find(c => c.linkedScheduleId === courseId);
                if (found) linkedCourse = found;
            });
        }

        if (linkedCourse) {
            // Build grade details, only show if values exist
            const gradeDetails = [];
            if (linkedCourse.uh !== undefined && linkedCourse.uh !== '') gradeDetails.push(`UH: ${linkedCourse.uh}`);
            if (linkedCourse.uts !== undefined && linkedCourse.uts !== '') gradeDetails.push(`UTS: ${linkedCourse.uts}`);
            if (linkedCourse.uas !== undefined && linkedCourse.uas !== '') gradeDetails.push(`UAS: ${linkedCourse.uas}`);

            const gradeDetailsText = gradeDetails.length > 0 ? `<div style="font-size:0.75rem; color:var(--text-muted);">${gradeDetails.join(' | ')}</div>` : '';

            gradeInfo.innerHTML = `
                <div style="font-weight:600; font-size:1.1rem; color:var(--primary); margin-bottom:0.25rem;">${linkedCourse.grade || '-'} ${linkedCourse.finalScore ? '(Skor: ' + linkedCourse.finalScore + ')' : ''}</div>
                ${gradeDetailsText}
            `;
        } else {
            gradeInfo.innerHTML = `<span style="font-size:0.85rem; color:var(--text-muted)">${i18n.t('schedule_detail_no_grades')}</span>`;
        }

        const detailModal = document.getElementById('modal-course-detail');
        detailModal.classList.add('active');

        const modalContent = detailModal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.remove('modal-pop-in');
            requestAnimationFrame(() => modalContent.classList.add('modal-pop-in'));
        }

        if (sourceCard) {
            this.animateSharedCardOpen(sourceCard, detailModal);
        }
    },

    animateSharedCardOpen: function (sourceCard, detailModal) {
        if (!sourceCard || !detailModal) return;

        const modalContent = detailModal.querySelector('.modal-content');
        if (!modalContent) return;

        const sourceRect = sourceCard.getBoundingClientRect();
        const clone = sourceCard.cloneNode(true);
        clone.classList.add('shared-card-clone');
        clone.style.position = 'fixed';
        clone.style.top = `${sourceRect.top}px`;
        clone.style.left = `${sourceRect.left}px`;
        clone.style.width = `${sourceRect.width}px`;
        clone.style.height = `${sourceRect.height}px`;
        clone.style.margin = '0';
        clone.style.zIndex = '1400';
        clone.style.pointerEvents = 'none';
        document.body.appendChild(clone);

        const targetRect = modalContent.getBoundingClientRect();
        const targetTop = targetRect.top + 14;
        const targetLeft = targetRect.left + 12;
        const targetScale = Math.max(0.94, Math.min(1.06, (targetRect.width - 24) / sourceRect.width));

        requestAnimationFrame(() => {
            clone.style.transformOrigin = 'top left';
            clone.style.transition = 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms ease';
            const dx = targetLeft - sourceRect.left;
            const dy = targetTop - sourceRect.top;
            clone.style.transform = `translate(${dx}px, ${dy}px) scale(${targetScale})`;
            clone.style.opacity = '0';
        });

        setTimeout(() => {
            if (clone.parentNode) clone.parentNode.removeChild(clone);
        }, 340);
    },

    closeCourseDetailModal: function () {
        document.getElementById('modal-course-detail').classList.remove('active');
        // Re-render schedule list to update task badges
        this.renderScheduleList();
        // Refresh notes dashboard if visible
        if (typeof notesManager !== 'undefined' && document.getElementById('view-notes').classList.contains('active')) {
            notesManager.renderNotesDashboard();
        }
        // Trigger Home update if necessary
        if (typeof homeManager !== 'undefined') {
            homeManager.renderTodaySchedule();
            homeManager.renderUpcomingTasks();
        }
    },

    editCurrentCourse: function () {
        const id = document.getElementById('detail-course-id').value;
        this.closeCourseDetailModal();
        setTimeout(() => {
            this.openAddModal(id);
        }, 300);
    },

    deleteCurrentCourseDetail: function () {
        const id = document.getElementById('detail-course-id').value;
        this.deleteSchedule(id);
        this.closeCourseDetailModal();
    },

    manageCourseGrade: function () {
        const schId = document.getElementById('detail-course-id').value;
        const schedule = this.schedules.find(s => s.id === schId);

        if (!schedule) return;

            // Check attendance percentage using updated presensiManager logic (excludes "tidak_terlaksana")
            if (typeof presensiManager !== 'undefined' && typeof presensiManager.getSummaryBySchedule === 'function') {
                const summary = presensiManager.getSummaryBySchedule(schId);
                const attendancePercentage = summary.percent;
                const countedPresent = summary.countedPresent;
                const effectiveMeetings = summary.effectiveMeetings;

                if (attendancePercentage < 75) {
                    const shouldProceed = confirm(
                        `⚠️ PERINGATAN\n\n` +
                        `Presensi Anda untuk mata kuliah "${schedule.name}" saat ini ${Math.floor(attendancePercentage)}% (${countedPresent}/${effectiveMeetings} pertemuan).\n\n` +
                        `Minimal 75% diperlukan untuk input nilai. Apakah Anda yakin ingin melanjutkan?`
                    );
                    if (!shouldProceed) return;
                }
            }

        let linkedSemId = null;
        if (typeof gradesManager !== 'undefined') {
            if (gradesManager.semesters.length === 0) {
                alert(i18n.t('schedule_need_semester_for_grade'));
                return;
            }
            // Prefer semester that matches this schedule's semester.
            const scheduleSemester = String(schedule.semester || 1);
            const semesterName = `Semester ${scheduleSemester}`;
            const matchedSemester = gradesManager.semesters.find(s =>
                String(s.name || '').toLowerCase() === semesterName.toLowerCase()
            );
            linkedSemId = (matchedSemester || gradesManager.semesters[gradesManager.semesters.length - 1]).id;
        }

        if (linkedSemId) {
            // Wait for schedule modal to close a bit, then open grades modal
            this.closeCourseDetailModal();
            setTimeout(() => {
                gradesManager.openAddCourseModal(linkedSemId, schedule.name, schedule.sks, schedule.id);
            }, 300);
        }
    },

    openTargetForSchedule: function (scheduleId) {
        // Find the linked course in grades
        if (typeof gradesManager === 'undefined' || typeof gradeGoals === 'undefined') return;

        let targetSemester = null;
        let targetCourse = null;

        gradesManager.semesters.forEach(sem => {
            const course = sem.courses.find(c => c.linkedScheduleId === scheduleId);
            if (course) {
                targetSemester = sem;
                targetCourse = course;
            }
        });

        if (targetSemester && targetCourse) {
            gradeGoals.openGoalModal(targetSemester.id, targetCourse.id);
        } else {
            alert(i18n.t('schedule_need_semester_for_grade') || 'Please create semester first in Grades menu!');
        }
    },

    openAgendaFromCalendar: function (agendaId) {
        this.agendas = Storage.getScheduleAgendas ? Storage.getScheduleAgendas() : this.agendas;
        const agenda = this.agendas.find(a => a.id === agendaId);
        if (!agenda) return;

        const linkedSchedule = this.schedules.find(s => s.id === agenda.scheduleId);
        if (!agenda.scheduleId || !linkedSchedule) {
            if (typeof window.openView === 'function') {
                window.openView('view-calendar', 'view-calendar');
            }
            setTimeout(() => this.openAgendaModal('', agenda.id, { fromCalendar: true }), 60);
            return;
        }

        if (typeof window.openView === 'function') {
            window.openView('view-schedule', 'view-schedule');
        }

        this.currentActiveTab = Number(linkedSchedule.day || this.currentActiveTab || 1);
        this.renderTabs();
        this.renderScheduleList();

        this.openCourseDetailModal(agenda.scheduleId);
        setTimeout(() => this.openAgendaModal(agenda.scheduleId, agenda.id), 120);
    },

    renderCourseTasks: function (courseId) {
        const container = document.getElementById('detail-course-tasks');
        container.innerHTML = '';

        const allTasks = Storage.getTasks();
        const courseTasks = allTasks.filter(t => t.courseId === courseId);
        courseTasks.sort((a, b) => a.completed - b.completed || new Date(a.dueDate) - new Date(b.dueDate));

        if (courseTasks.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:1rem; color:var(--text-muted);">${i18n.t('schedule_detail_no_linked_tasks')}</div>`;
            return;
        }

        courseTasks.forEach(task => {
            const el = document.createElement('div');
            el.style.background = 'var(--bg-card)';
            el.style.padding = '0.75rem';
            el.style.borderRadius = 'var(--radius-sm)';
            el.style.border = '1px solid var(--border-color)';
            el.style.display = 'flex';
            el.style.gap = '0.75rem';
            el.style.alignItems = 'center';

            el.innerHTML = `
                <input type="checkbox" ${task.completed ? 'checked' : ''} 
                    onchange="tasksManager.toggleTask('${task.id}'); setTimeout(()=>scheduleManager.renderCourseTasks('${courseId}'), 100);"
                    style="width:1.2rem; height:1.2rem; cursor:pointer;">
                <div style="flex:1">
                    <div style="font-weight: 500; font-size:0.9rem; ${task.completed ? 'text-decoration: line-through; color:var(--text-muted)' : ''}">${task.title}</div>
                    <div style="font-size: 0.75rem; color:var(--text-muted)"><i class="ph ph-calendar"></i> ${task.dueDate}</div>
                </div>
            `;
            container.appendChild(el);
        });
    }
};
