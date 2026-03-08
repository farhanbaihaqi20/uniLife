const gradeGoals = {
    goals: [],
    gradeThresholds: {
        'A': 85,
        'AB': 80,
        'B': 70,
        'BC': 65,
        'C': 55,
        'D': 40,
        'E': 0
    },

    init: function () {
        this.goals = Storage.getGradeGoals();
    },

    setGoal: function (semesterId, courseId, targetGrade, targetScore) {
        const existingIndex = this.goals.findIndex(g => g.semesterId === semesterId && g.courseId === courseId);
        
        const goal = {
            id: existingIndex >= 0 ? this.goals[existingIndex].id : uuidv4(),
            semesterId,
            courseId,
            targetGrade,
            targetScore: parseFloat(targetScore)
        };

        if (existingIndex >= 0) {
            this.goals[existingIndex] = goal;
        } else {
            this.goals.push(goal);
        }

        Storage.setGradeGoals(this.goals);
    },

    getGoal: function (semesterId, courseId) {
        return this.goals.find(g => g.semesterId === semesterId && g.courseId === courseId);
    },

    deleteGoal: function (semesterId, courseId) {
        this.goals = this.goals.filter(g => !(g.semesterId === semesterId && g.courseId === courseId));
        Storage.setGradeGoals(this.goals);
    },

    calculateProgress: function (currentScore, targetScore) {
        if (!currentScore || !targetScore) return 0;
        return Math.min(100, (currentScore / targetScore) * 100);
    },

    renderGoalBadge: function (course, semId) {
        const goal = this.getGoal(semId, course.id);
        if (!goal) return '';

        const currentScore = parseFloat(course.finalScore || 0);
        const progress = this.calculateProgress(currentScore, goal.targetScore);
        const isAchieved = currentScore >= goal.targetScore;

        const color = isAchieved ? '#22c55e' : currentScore >= goal.targetScore * 0.8 ? '#f59e0b' : '#ef4444';
        const icon = isAchieved ? 'check-circle' : 'target';

        return `
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; padding: 0.5rem; background: ${isAchieved ? '#f0fdf4' : '#fef2f2'}; border-radius: var(--radius-sm); border-left: 3px solid ${color};">
                <i class="ph ph-${icon}" style="color: ${color}; font-size: 1.2rem;"></i>
                <div style="flex: 1;">
                    <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">${i18n.t('goal_target') || 'Target'}: ${goal.targetGrade} (${goal.targetScore})</div>
                    <div style="font-size: 0.85rem; font-weight: 600; color: ${color};">
                        ${isAchieved ? (i18n.currentLang === 'en' ? '✓ Achieved!' : '✓ Tercapai!') : `${i18n.currentLang === 'en' ? 'Need' : 'Perlu'}: ${(goal.targetScore - currentScore).toFixed(1)} ${i18n.currentLang === 'en' ? 'more points' : 'poin lagi'}`}
                    </div>
                </div>
                <button class="icon-btn" onclick="gradeGoals.openGoalModal('${semId}', '${course.id}')" style="width: 24px; height: 24px; background: transparent; color: var(--text-muted);">
                    <i class="ph ph-pencil-simple"></i>
                </button>
            </div>
        `;
    },

    openGoalModal: function (semesterId, courseId) {
        const semester = (typeof gradesManager !== 'undefined') ? gradesManager.semesters.find(s => s.id === semesterId) : null;
        if (!semester) return;

        const course = semester.courses.find(c => c.id === courseId);
        if (!course) return;

        const existingGoal = this.getGoal(semesterId, courseId);

        const modalHtml = `
            <div class="modal-overlay active" id="modal-grade-goal">
                <div class="modal-content" style="max-width: 450px;">
                    <button class="modal-close" onclick="gradeGoals.closeGoalModal()"><i class="ph ph-x"></i></button>
                    <h3 data-i18n="goal_set">${i18n.t('goal_set') || 'Set Target'}</h3>
                    <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.5rem;">${course.name}</p>
                    
                    <form onsubmit="gradeGoals.saveGoal(event, '${semesterId}', '${courseId}')">
                        <div class="form-group">
                            <label data-i18n="goal_target">${i18n.t('goal_target') || 'Target'}</label>
                            <select id="goal-target-grade" required style="width: 100%; padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-main);">
                                <option value="">-- ${i18n.currentLang === 'en' ? 'Select Grade' : 'Pilih Nilai'} --</option>
                                <option value="A" ${existingGoal && existingGoal.targetGrade === 'A' ? 'selected' : ''}>A (85-100)</option>
                                <option value="AB" ${existingGoal && existingGoal.targetGrade === 'AB' ? 'selected' : ''}>AB (80-84)</option>
                                <option value="B" ${existingGoal && existingGoal.targetGrade === 'B' ? 'selected' : ''}>B (70-79)</option>
                                <option value="BC" ${existingGoal && existingGoal.targetGrade === 'BC' ? 'selected' : ''}>BC (65-69)</option>
                                <option value="C" ${existingGoal && existingGoal.targetGrade === 'C' ? 'selected' : ''}>C (55-64)</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label data-i18n="goal_needed">${i18n.t('goal_needed') || 'Target Score'}</label>
                            <input type="number" id="goal-target-score" required min="0" max="100" step="0.1" value="${existingGoal ? existingGoal.targetScore : ''}" placeholder="85" style="width: 100%; padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-main);">
                        </div>
                        
                        <div style="background: var(--bg-main); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem; border-left: 3px solid var(--primary);">
                            <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">${i18n.t('goal_current') || 'Current'}:</div>
                            <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">${course.grade || '-'} <span style="font-size: 1rem; font-weight: 500;">(${course.finalScore || '0'})</span></div>
                        </div>
                        
                        <div style="display: flex; gap: 0.5rem;">
                            <button type="submit" class="btn btn-primary" style="flex: 1;">${i18n.t('common_save') || 'Save'}</button>
                            ${existingGoal ? `<button type="button" class="btn btn-outline" style="border-color: var(--danger); color: var(--danger);" onclick="gradeGoals.deleteGoal('${semesterId}', '${courseId}'); gradeGoals.closeGoalModal(); gradesManager.renderSemesters();">${i18n.t('common_delete') || 'Delete'}</button>` : ''}
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existing = document.getElementById('modal-grade-goal');
        if (existing) existing.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Auto-fill score when grade is selected
        const gradeSelect = document.getElementById('goal-target-grade');
        gradeSelect.addEventListener('change', (e) => {
            const scoreInput = document.getElementById('goal-target-score');
            if (e.target.value && this.gradeThresholds[e.target.value]) {
                scoreInput.value = this.gradeThresholds[e.target.value];
            }
        });
    },

    closeGoalModal: function () {
        const modal = document.getElementById('modal-grade-goal');
        if (modal) modal.remove();
    },

    saveGoal: function (e, semesterId, courseId) {
        e.preventDefault();

        const targetGrade = document.getElementById('goal-target-grade').value;
        const targetScore = document.getElementById('goal-target-score').value;

        this.setGoal(semesterId, courseId, targetGrade, targetScore);
        this.closeGoalModal();

        // Refresh grades view to show updated goal
        if (typeof gradesManager !== 'undefined') {
            gradesManager.renderSemesters();
        }
    }
};
