const gradesManager = {
    semesters: [],
    ipkChartInstance: null,
    courseChartInstance: null,
    gradeScale: {
        'A': 4.0, 'AB': 3.5, 'B': 3.0, 'BC': 2.5,
        'C': 2.0, 'D': 1.0, 'E': 0.0
    },

    init: function () {
        this.semesters = Storage.getGrades();
        this.renderStats(); // Also renders charts
        this.renderSemesters();
        this.injectGradeModals();
    },

    calculateOverallStats: function () {
        let totalSks = 0;
        let totalPoints = 0;

        this.semesters.forEach(sem => {
            sem.courses.forEach(course => {
                totalSks += course.sks;
                totalPoints += (course.sks * this.gradeScale[course.grade]);
            });
        });

        const ipk = totalSks === 0 ? 0.00 : (totalPoints / totalSks);
        return {
            totalSks,
            ipk: ipk.toFixed(2)
        };
    },

    calculateSemesterStats: function (semester) {
        let totalSks = 0;
        let totalPoints = 0;

        semester.courses.forEach(course => {
            totalSks += course.sks;
            totalPoints += (course.sks * this.gradeScale[course.grade]);
        });

        const ips = totalSks === 0 ? 0.00 : (totalPoints / totalSks);
        return {
            totalSks,
            ips: ips.toFixed(2)
        };
    },

    renderStats: function () {
        const stats = this.calculateOverallStats();
        const display = document.getElementById('ipk-display');
        if (display) display.innerText = stats.ipk;
        this.renderCharts();
    },

    renderCharts: function () {
        const ctxIpk = document.getElementById('ipkChart');
        const ctxCourse = document.getElementById('courseChart');
        if (!ctxIpk || !ctxCourse) return;

        // 1. Line Chart for IPS
        if (this.ipkChartInstance) this.ipkChartInstance.destroy();

        const labels = [];
        const ipsData = [];
        this.semesters.forEach(sem => {
            labels.push(sem.name.length > 10 ? sem.name.substring(0, 8) + '...' : sem.name);
            ipsData.push(this.calculateSemesterStats(sem).ips);
        });

        this.ipkChartInstance = new Chart(ctxIpk, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: i18n.t('grades_chart_ips_label'),
                    data: ipsData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#3b82f6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { min: 0, max: 4, ticks: { stepSize: 1 } }
                }
            }
        });

        // 2. Simple Bar Chart for Final Course Grades
        if (this.courseChartInstance) this.courseChartInstance.destroy();

        // Find latest semester that has courses with final scores
        const latestSemWithCourses = [...this.semesters].reverse().find(s => s.courses && s.courses.some(c => c.finalScore !== undefined));

        const courseLabels = [];
        const finalScores = [];

        if (latestSemWithCourses) {
            latestSemWithCourses.courses.forEach(c => {
                if (c.finalScore !== undefined) {
                    courseLabels.push(c.name.length > 15 ? c.name.substring(0, 15) + '...' : c.name);
                    finalScores.push(parseFloat(c.finalScore));
                }
            });
        }

        // General Bar Chart
        this.courseChartInstance = new Chart(ctxCourse, {
            type: 'bar',
            data: {
                labels: courseLabels,
                datasets: [
                    {
                        label: i18n.t('grades_chart_final_label'),
                        data: finalScores,
                        backgroundColor: '#3b82f6',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { min: 0, max: 100 }
                }
            }
        });
    },

    renderSemesters: function () {
        const container = document.getElementById('semesters-container');
        if (!container) return;

        container.innerHTML = '';

        if (this.semesters.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="ph ph-folder-open"></i>
                    <p>${i18n.t('grades_empty_semesters')}</p>
                </div>
            `;
            return;
        }

        // Reverse order - newest first
        const reversedSemesters = [...this.semesters].reverse();

        reversedSemesters.forEach((sem, index) => {
            const semStats = this.calculateSemesterStats(sem);

            const semDiv = document.createElement('div');
            semDiv.className = 'card semester-card';
            semDiv.style.padding = '0';

            semDiv.innerHTML = `
                <div class="semester-header" style="padding: 1rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center;" onclick="gradesManager.toggleSemester('${sem.id}')">
                    <div>
                        <h4 style="font-size: 1.1rem; margin-bottom: 0.25rem;">${sem.name}</h4>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">
                            <span>IPS: <strong style="color:var(--text-main)">${semStats.ips}</strong></span> &bull; 
                            <span>SKS: ${semStats.totalSks}</span>
                        </div>
                    </div>
                    <div style="display:flex; gap:0.5rem; align-items:center;">
                        <button class="icon-btn" onclick="event.stopPropagation(); gradesManager.deleteSemester('${sem.id}')" style="width:30px;height:30px;color:var(--danger); border:none; box-shadow:none; background:transparent">
                            <i class="ph ph-trash"></i>
                        </button>
                        <i class="ph ph-caret-down" id="caret-${sem.id}" style="transition: transform 0.2s"></i>
                    </div>
                </div>
                <div class="semester-body" id="body-${sem.id}" style="display: none; padding: 0 1rem 1rem; border-top: 1px solid var(--border-color);">
                    <div class="course-list mt-4" style="display:flex; flex-direction:column; gap:0.75rem;">
                        ${sem.courses.length === 0 ? `<p style="font-size:0.875rem; color:var(--text-muted); text-align:center;">${i18n.t('grades_empty_courses')}</p>` : ''}
                        ${sem.courses.map(course => {
                // Determine color theme based on grade
                let themeColor = 'var(--text-muted)';
                let bgLight = 'var(--bg-main)';
                if (['A', 'AB'].includes(course.grade)) {
                    themeColor = '#22c55e'; // Green
                    bgLight = '#f0fdf4';
                } else if (['B', 'BC'].includes(course.grade)) {
                    themeColor = '#3b82f6'; // Blue
                    bgLight = '#eff6ff';
                } else if (['C'].includes(course.grade)) {
                    themeColor = '#eab308'; // Yellow
                    bgLight = '#fefce8';
                } else if (['D', 'E'].includes(course.grade)) {
                    themeColor = '#ef4444'; // Red
                    bgLight = '#fef2f2';
                }

                // Generate a mock ID based on course ID for the visual ID pill
                const mockId = '25' + course.id.substring(0, 6).toUpperCase();

                // Get goal badge if exists
                const goalBadge = (typeof gradeGoals !== 'undefined') ? gradeGoals.renderGoalBadge(course, sem.id) : '';

                return `
                            <div style="background:var(--bg-card); border-radius:var(--radius-md); border-left: 6px solid ${themeColor}; box-shadow: 0 2px 8px rgba(0,0,0,0.03); border-right: 1px solid var(--border-color); border-top: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); overflow: hidden;">
                                <div style="display:flex; justify-content:space-between; align-items:center; padding: 1rem;">
                                    <div style="flex:1;">
                                        <div style="display:flex; gap:0.5rem; align-items:center; margin-bottom: 0.5rem; flex-wrap: wrap;">
                                            <span style="font-size:0.65rem; font-family:monospace; color:${themeColor}; background:${bgLight}; padding:0.2rem 0.5rem; border-radius:4px; border:1px solid ${themeColor}33;">${mockId}</span>
                                            <span style="font-size:0.65rem; color:#22c55e; background:#f0fdf4; padding:0.2rem 0.5rem; border-radius:4px; font-weight:600; border:1px solid #22c55e33;">${course.sks} SKS</span>
                                            ${goalBadge ? '<button class="icon-btn" onclick="gradeGoals.openGoalModal(\'' + sem.id + '\', \'' + course.id + '\')" style="width:28px;height:28px;font-size:0.9rem;background:#667eea;color:white;margin-left:0.25rem;border:none;box-shadow:0 2px 4px rgba(102,126,234,0.3);" title="' + (i18n.t('goal_set') || 'Set Target') + '"><i class="ph-bold ph-target"></i></button>' : '<button class="icon-btn" onclick="gradeGoals.openGoalModal(\'' + sem.id + '\', \'' + course.id + '\')" style="width:28px;height:28px;font-size:0.9rem;background:var(--primary-light);color:var(--primary);margin-left:0.25rem;border:1px solid var(--primary);box-shadow:0 2px 4px rgba(59,130,246,0.2);" title="' + (i18n.t('goal_set') || 'Set Target') + '"><i class="ph-bold ph-plus"></i></button>'}
                                        </div>
                                        <div style="font-weight:700; font-size:1rem; color:var(--text-main); line-height:1.2; margin-bottom: 0.2rem;">${course.name}</div>
                                        <div style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">${i18n.t('grades_course_module_label')}</div>
                                    </div>
                                    
                                    <div style="display:flex; align-items:center; gap: 1rem;">
                                        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; width: 60px;">
                                            <div style="width: 45px; height: 45px; border-radius: 50%; background-color: ${themeColor}; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.2rem; box-shadow: 0 2px 6px ${themeColor}40; margin-bottom:0.25rem;">
                                                ${course.grade}
                                            </div>
                                            <div style="font-size:0.85rem; font-weight:600; color:var(--text-main);">${course.finalScore ? parseFloat(course.finalScore).toFixed(2).replace('.', ',') : '-'}</div>
                                        </div>
                                        <div style="display:flex; flex-direction:column; gap:0.25rem;">
                                            <button class="icon-btn" onclick="gradesManager.openEditCourseModal('${sem.id}', '${course.id}')" style="width:28px;height:28px;border:none;box-shadow:none;background:var(--bg-main);color:var(--text-main); border-radius:4px;">
                                                <i class="ph ph-pencil-simple"></i>
                                            </button>
                                            <button class="icon-btn" onclick="gradesManager.deleteCourse('${sem.id}', '${course.id}')" style="width:28px;height:28px;border:none;box-shadow:none;background:var(--bg-main);color:var(--danger); border-radius:4px;">
                                                <i class="ph ph-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                ${goalBadge ? '<div style="padding: 0 1rem 1rem;">' + goalBadge + '</div>' : ''}
                            </div>
                            `;
            }).join('')}
                    </div>
                    <button class="btn-premium-grade mt-4" onclick="gradesManager.openAddCourseModal('${sem.id}')">
                        <i class="ph ph-plus-circle"></i> ${i18n.t('grades_add_course')}
                    </button>
                </div>
            `;
            container.appendChild(semDiv);
        });
    },

    toggleSemester: function (id) {
        const body = document.getElementById(`body-${id}`);
        const caret = document.getElementById(`caret-${id}`);
        if (body.style.display === 'none') {
            body.style.display = 'block';
            caret.style.transform = 'rotate(180deg)';
        } else {
            body.style.display = 'none';
            caret.style.transform = 'rotate(0deg)';
        }
    },

    addSemester: function () {
        const name = prompt(i18n.t('grades_semester_prompt'), `Semester ${this.semesters.length + 1}`);
        if (name) {
            this.semesters.push({
                id: uuidv4(),
                name: name,
                courses: []
            });
            Storage.setGrades(this.semesters);
            this.renderStats(); // Ensure charts update
            this.renderSemesters(); // Re-render the accordion
        }
    },

    deleteSemester: function (id) {
        if (confirm(i18n.t('grades_delete_semester_confirm'))) {
            this.semesters = this.semesters.filter(s => s.id !== id);
            Storage.setGrades(this.semesters);
            this.renderStats();
            this.renderSemesters();
        }
    },

    deleteCourse: function (semId, courseId) {
        const semIndex = this.semesters.findIndex(s => s.id === semId);
        if (semIndex > -1) {
            this.semesters[semIndex].courses = this.semesters[semIndex].courses.filter(c => c.id !== courseId);
            Storage.setGrades(this.semesters);
            this.renderStats();
            this.renderSemesters();

            // Re-open the accordion
            setTimeout(() => {
                document.getElementById(`body-${semId}`).style.display = 'block';
                document.getElementById(`caret-${semId}`).style.transform = 'rotate(180deg)';
            }, 50);
        }
    },

    saveCourseGrade: function (e) {
        e.preventDefault();
        const semId = document.getElementById('active-semester-id').value;
        const editCourseId = document.getElementById('edit-course-id') ? document.getElementById('edit-course-id').value : null;

        const name = document.getElementById('grade-name').value;
        const sks = parseInt(document.getElementById('grade-sks').value);

        const finalScore = parseFloat(document.getElementById('grade-final').value) || 0;

        let gradeStr = 'E';
        if (finalScore >= 85) gradeStr = 'A';
        else if (finalScore >= 80) gradeStr = 'AB';
        else if (finalScore >= 70) gradeStr = 'B';
        else if (finalScore >= 65) gradeStr = 'BC';
        else if (finalScore >= 55) gradeStr = 'C';
        else if (finalScore >= 40) gradeStr = 'D';

        const semIndex = this.semesters.findIndex(s => s.id === semId);
        if (semIndex > -1) {
            // See if this is an update to an existing course (for schedule integration or explicit edit)
            const extId = document.getElementById('grade-ext-id') ? document.getElementById('grade-ext-id').value : null;
            let courseIndex = -1;

            if (editCourseId) {
                // Explicit edit mode
                courseIndex = this.semesters[semIndex].courses.findIndex(c => c.id === editCourseId);
            } else if (extId) {
                // Schedule link edit mode
                courseIndex = this.semesters[semIndex].courses.findIndex(c => c.linkedScheduleId === extId);
            }

            const newCourseData = {
                id: editCourseId || uuidv4(),
                name,
                sks,
                finalScore: finalScore.toFixed(1),
                grade: gradeStr,
                linkedScheduleId: extId || null // Keep extId if it exists
            };

            if (courseIndex > -1) {
                // Retain old Schedule link ID if editing via explicit Edit button
                if (editCourseId && !extId) {
                    newCourseData.linkedScheduleId = this.semesters[semIndex].courses[courseIndex].linkedScheduleId;
                }
                this.semesters[semIndex].courses[courseIndex] = { ...this.semesters[semIndex].courses[courseIndex], ...newCourseData };
            } else {
                this.semesters[semIndex].courses.push(newCourseData);
            }

            Storage.setGrades(this.semesters);

            this.renderStats();
            this.renderSemesters();
            this.closeModal();

            setTimeout(() => {
                const body = document.getElementById(`body-${semId}`);
                if (body) {
                    body.style.display = 'block';
                    document.getElementById(`caret-${semId}`).style.transform = 'rotate(180deg)';
                }
            }, 50);

            // Update course detail modal if it was open
            if (typeof scheduleManager !== 'undefined' && extId) {
                scheduleManager.openCourseDetailModal(extId);
            }
        }
    },

    openAddCourseModal: function (semId, prefillName = '', prefillSks = 3, linkedScheduleId = '') {
        // Reset form completely first
        const form = document.getElementById('form-grade');
        if (form) form.reset();

        document.getElementById('modal-grade-title').innerText = i18n.t('grades_modal_add_title');

        document.getElementById('active-semester-id').value = semId;
        document.getElementById('grade-name').value = prefillName;
        document.getElementById('grade-sks').value = prefillSks;

        // Custom linked tag for schedule integration
        let extInput = document.getElementById('grade-ext-id');
        if (!extInput) {
            extInput = document.createElement('input');
            extInput.type = 'hidden';
            extInput.id = 'grade-ext-id';
            document.getElementById('form-grade').appendChild(extInput);
        }
        extInput.value = linkedScheduleId;

        // Clear edit ID just in case
        let editInput = document.getElementById('edit-course-id');
        if (editInput) editInput.value = '';

        document.getElementById('modal-grade').classList.add('active');
    },

    openEditCourseModal: function (semId, courseId) {
        event.stopPropagation();
        const sem = this.semesters.find(s => s.id === semId);
        if (!sem) return;
        const course = sem.courses.find(c => c.id === courseId);
        if (!course) return;

        // Reset form first
        const form = document.getElementById('form-grade');
        if (form) form.reset();

        document.getElementById('modal-grade-title').innerText = i18n.t('grades_modal_edit_title');

        document.getElementById('active-semester-id').value = semId;
        document.getElementById('grade-name').value = course.name;
        document.getElementById('grade-sks').value = course.sks;
        if (course.finalScore) {
            document.getElementById('grade-final').value = course.finalScore;
        }

        // Set edit ID
        let editInput = document.getElementById('edit-course-id');
        if (!editInput) {
            editInput = document.createElement('input');
            editInput.type = 'hidden';
            editInput.id = 'edit-course-id';
            document.getElementById('form-grade').appendChild(editInput);
        }
        editInput.value = course.id;

        // Clear ext tag
        let extInput = document.getElementById('grade-ext-id');
        if (extInput) extInput.value = '';

        document.getElementById('modal-grade').classList.add('active');
    },

    closeModal: function () {
        const modal = document.getElementById('modal-grade');
        if (modal) modal.classList.remove('active');

        const form = document.getElementById('form-grade');
        if (form) form.reset();
    },

    injectGradeModals: function () {
        const modalHtml = `
            <div class="modal-overlay" id="modal-grade">
                <div class="modal-content">
                    <button class="modal-close" onclick="gradesManager.closeModal()"><i class="ph ph-x"></i></button>
                    <h3 id="modal-grade-title">${i18n.t('grades_modal_add_title')}</h3>
                    <form id="form-grade" onsubmit="gradesManager.saveCourseGrade(event)">
                        <input type="hidden" id="active-semester-id">
                        <div class="form-group mt-4">
                            <label>${i18n.t('grades_course_name')}</label>
                            <input type="text" id="grade-name" required placeholder="${i18n.t('grades_course_placeholder')}">
                        </div>
                        <div class="form-group row">
                            <div class="col">
                                <label>SKS</label>
                                <input type="number" id="grade-sks" required min="1" max="6" value="3">
                            </div>
                        </div>
                        
                        <h4 style="font-size: 0.9rem; margin-top: 1rem; margin-bottom: 0.5rem; color: var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">${i18n.t('grades_final_title')}</h4>
                        
                        <div class="form-group row">
                            <div class="col" style="flex: 1;">
                                <label>${i18n.t('grades_final_number')}</label>
                                <input type="number" id="grade-final" required min="0" max="100" placeholder="0-100">
                            </div>
                        </div>
                        
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 1.5rem; display: flex; align-items:flex-start; gap:0.5rem;">
                            <i class="ph ph-info" style="font-size: 1rem; color: var(--primary)"></i>
                            <span>${i18n.t('grades_auto_grade_note')}</span>
                        </div>
                        
                        <button type="submit" class="btn btn-primary full-width mt-4">${i18n.t('grades_save_capture')}</button>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
};
