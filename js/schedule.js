const scheduleManager = {
    schedules: [],
    days: [],
    currentActiveTab: new Date().getDay() || 1, // 0 is Sunday, map to 1 if Sunday (Senin)

    init: function () {
        this.schedules = Storage.getSchedules();

        // Map JS Sunday(0) to our tab array (if Sunday, default to Senin=1)
        let dayOfWeek = new Date().getDay();
        this.currentActiveTab = dayOfWeek === 0 ? 1 : dayOfWeek;

        this.renderTabs();
        this.renderScheduleList();
        this.setupForm();
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

        container.innerHTML = '';

        // Get active semester from profile, default to 1 (coerce to string so comparison is robust)
        const activeSemester = typeof profileManager !== 'undefined' ? String(profileManager.profile.semester || 1) : '1';

        // Filter by active semester first, then by selected day.
        // If a schedule lacks a semester (legacy), treat it as '1'.
        const contextSchedules = this.schedules.filter(s => {
            const schSem = String(s.semester || 1);
            return schSem === activeSemester;
        });
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
        const currentDayStr = now.getDay() || 1; // Map Sunday to 1

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
            card.style.cursor = 'pointer';
            card.onclick = () => this.openCourseDetailModal(sch.id);

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

            const newSchedule = {
                id: uuidv4(),
                semester: typeof profileManager !== 'undefined' ? (profileManager.profile.semester || 1) : 1,
                name: document.getElementById('sch-name').value,
                day: parseInt(document.getElementById('sch-day').value),
                sks: parseInt(document.getElementById('sch-sks').value),
                start: document.getElementById('sch-start').value,
                end: document.getElementById('sch-end').value,
                room: document.getElementById('sch-room').value,
                lecturer: document.getElementById('sch-lecturer').value,
            };

            this.schedules.push(newSchedule);
            Storage.setSchedules(this.schedules);

            // Auto-create course in grades with placeholder grade
            if (typeof gradesManager !== 'undefined') {
                const currentSemester = newSchedule.semester;
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
                const courseExists = semester.courses.some(c => c.linkedScheduleId === newSchedule.id);
                if (!courseExists) {
                    // Add course with placeholder values
                    semester.courses.push({
                        id: uuidv4(),
                        name: newSchedule.name,
                        sks: newSchedule.sks,
                        finalScore: 0,
                        grade: 'E',
                        linkedScheduleId: newSchedule.id
                    });
                }

                Storage.setGrades(gradesManager.semesters);
                gradesManager.renderStats();
                gradesManager.renderSemesters();
            }

            this.closeModal();
            this.currentActiveTab = newSchedule.day; // Switch to the day just added
            this.renderTabs();
            this.renderScheduleList();
            form.reset();
        });
    },

    openAddModal: function () {
        document.getElementById('modal-schedule').classList.add('active');
        // Preset day to current active tab
        document.getElementById('sch-day').value = this.currentActiveTab;
    },

    closeModal: function () {
        document.getElementById('modal-schedule').classList.remove('active');
    },

    deleteSchedule: function (id) {
        if (confirm(i18n.t('schedule_delete_confirm'))) {
            this.schedules = this.schedules.filter(s => s.id !== id);
            Storage.setSchedules(this.schedules);
            this.renderScheduleList();

            // Update home if active
            if (typeof homeManager !== 'undefined') homeManager.renderTodaySchedule();
        }
    },

    // --- V2: Course Details Modal ---
    openCourseDetailModal: function (courseId) {
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
                    <div style="background:var(--bg-main); padding:0.75rem; border-radius:var(--radius-sm); border:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <div style="font-weight:600; font-size:0.9rem;">${task.title}</div>
                            <div style="font-size:0.75rem; color:var(--danger);"><i class="ph ph-calendar"></i> ${task.dueDate}</div>
                        </div>
                    </div>
                `;
            });
        }

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
            gradeInfo.innerHTML = `
                <div style="font-weight:600; font-size:1.1rem; color:var(--primary); margin-bottom:0.25rem;">${linkedCourse.grade} (Skor: ${linkedCourse.finalScore})</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">UH: ${linkedCourse.uh} | UTS: ${linkedCourse.uts} | UAS: ${linkedCourse.uas}</div>
            `;
        } else {
            gradeInfo.innerHTML = `<span style="font-size:0.85rem; color:var(--text-muted)">${i18n.t('schedule_detail_no_grades')}</span>`;
        }

        document.getElementById('modal-course-detail').classList.add('active');
    },

    closeCourseDetailModal: function () {
        document.getElementById('modal-course-detail').classList.remove('active');
        // Re-render schedule list to update task badges
        this.renderScheduleList();
        // Trigger Home update if necessary
        if (typeof homeManager !== 'undefined') {
            homeManager.renderTodaySchedule();
            homeManager.renderUpcomingTasks();
        }
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

        let linkedSemId = null;
        if (typeof gradesManager !== 'undefined') {
            if (gradesManager.semesters.length === 0) {
                alert(i18n.t('schedule_need_semester_for_grade'));
                return;
            }
            // Ask which semester or pick latest
            linkedSemId = gradesManager.semesters[gradesManager.semesters.length - 1].id;
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
