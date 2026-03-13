const presensiManager = {
    totalMeetings: 16,
    minimumPercent: 75,
    recapFilter: 'all',
    records: [],

    init: function () {
        this.records = Storage.getAttendanceRecords() || [];
        this.bindModalEvents();
        this.renderRecap();
    },

    getActiveSchedules: function () {
        const activeSemester = this.getActiveSemester();
        return (Storage.getSchedules() || [])
            .filter(s => String(s.semester || 1) === activeSemester)
            .sort((a, b) => {
                if (Number(a.day) !== Number(b.day)) return Number(a.day) - Number(b.day);
                return String(a.start).localeCompare(String(b.start));
            });
    },

    getActiveSemester: function () {
        return typeof profileManager !== 'undefined' ? String(profileManager.profile.semester || 1) : '1';
    },

    openDashboard: function () {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelectorAll('.view-section').forEach(section => section.classList.remove('active'));
        const target = document.getElementById('view-attendance');
        if (target) target.classList.add('active');
        this.renderRecap();
    },

    setRecapFilter: function (filterKey) {
        this.recapFilter = filterKey;
        document.querySelectorAll('.attendance-filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filterKey);
        });
        this.renderRecap();
    },

    getCourseRecords: function (scheduleId) {
        if (!scheduleId || scheduleId === 'undefined') return [];
        const activeSemester = this.getActiveSemester();
        return this.records
            .filter(r => r.scheduleId === scheduleId && String(r.semester || 1) === activeSemester)
            .sort((a, b) => a.meetingNumber - b.meetingNumber);
    },

    getSummaryBySchedule: function (scheduleId) {
        const records = this.getCourseRecords(scheduleId);
        const hadir = records.filter(r => r.status === 'hadir').length;
        const izin = records.filter(r => r.status === 'izin').length;
        const tidakHadir = records.filter(r => r.status === 'tidak_hadir').length;
        const countedPresent = hadir + izin;
        const percent = Math.round((countedPresent / this.totalMeetings) * 100);
        const minimumMeetings = Math.ceil((this.minimumPercent / 100) * this.totalMeetings);

        return {
            records,
            hadir,
            izin,
            tidakHadir,
            countedPresent,
            percent,
            minimumMeetings,
            remaining: Math.max(0, this.totalMeetings - records.length)
        };
    },

    getNextMeetingNumber: function (scheduleId) {
        const records = this.getCourseRecords(scheduleId);
        if (records.length === 0) return 1;
        const maxMeeting = Math.max(...records.map(r => Number(r.meetingNumber) || 0));
        return Math.min(this.totalMeetings, maxMeeting + 1);
    },

    getNextUnfilledMeeting: function (scheduleId) {
        const records = this.getCourseRecords(scheduleId);
        const filledMeetings = records.map(r => Number(r.meetingNumber));
        for (let i = 1; i <= this.totalMeetings; i++) {
            if (!filledMeetings.includes(i)) return i;
        }
        return this.totalMeetings; // All filled, return last one
    },

    getTodayRecordForSchedule: function (scheduleId) {
        const today = new Date().toISOString().split('T')[0];
        const records = this.getCourseRecords(scheduleId);
        return records.find(rec => {
            if (rec.dateFor !== undefined) {
                return rec.dateFor === today;
            }
            // Fallback for legacy records
            const recDate = new Date(rec.timestamp).toISOString().split('T')[0];
            return recDate === today;
        });
    },

    openAttendanceModal: function (scheduleId, isFromTodayClass = false) {
        const modal = document.getElementById('modal-attendance-input');
        if (!modal) return;

        const schedule = Storage.getSchedules().find(s => s.id === scheduleId);
        if (!schedule) {
            alert('Mata kuliah tidak ditemukan.');
            return;
        }

        const summary = this.getSummaryBySchedule(scheduleId);
        let targetMeeting = this.getNextUnfilledMeeting(scheduleId);
        let existingRecord = null;
        let isEditMode = false;

        // Check if this is from today's ongoing class
        if (isFromTodayClass) {
            existingRecord = this.getTodayRecordForSchedule(scheduleId);
            if (existingRecord) {
                // Already has attendance today - open for edit
                targetMeeting = existingRecord.meetingNumber;
                isEditMode = true;
            }
        }

        document.getElementById('attendance-course-id').value = scheduleId;
        document.getElementById('attendance-course-name').innerText = schedule.name;
        document.getElementById('attendance-course-meta').innerText = `${schedule.start} - ${schedule.end} • ${schedule.room || '-'}`;
        document.getElementById('attendance-recap-mini').innerText = `Rekap: ${summary.countedPresent}/${this.totalMeetings} (${summary.percent}%) • Minimal ${summary.minimumMeetings} pertemuan`;

        // Store edit mode flag
        modal.dataset.editMode = isEditMode ? '1' : '0';
        modal.dataset.isFromToday = isFromTodayClass ? '1' : '0';
        // Remember the intent if it is an edit
        if (isEditMode && existingRecord && existingRecord.dateFor) {
            modal.dataset.intendedDate = existingRecord.dateFor;
        } else if (isFromTodayClass) {
            modal.dataset.intendedDate = new Date().toISOString().split('T')[0];
        } else {
            modal.dataset.intendedDate = '';
        }

        const meetingSelect = document.getElementById('attendance-meeting-number');
        if (meetingSelect) {
            meetingSelect.innerHTML = '';
            for (let i = 1; i <= this.totalMeetings; i++) {
                const option = document.createElement('option');
                option.value = String(i);
                option.innerText = `Pertemuan ke-${i}`;
                meetingSelect.appendChild(option);
            }
            meetingSelect.value = String(targetMeeting);

            // Disable meeting selector if from today class (can only input/edit today's meeting)
            meetingSelect.disabled = isFromTodayClass;
            if (isFromTodayClass) {
                meetingSelect.style.opacity = '0.6';
                meetingSelect.style.cursor = 'not-allowed';
                document.getElementById('attendance-meeting-hint').style.display = 'block';
            } else {
                meetingSelect.style.opacity = '1';
                meetingSelect.style.cursor = 'pointer';
                document.getElementById('attendance-meeting-hint').style.display = 'none';
            }
        }

        // Show/hide edit mode indicator
        const editIndicator = document.getElementById('attendance-edit-indicator');
        if (editIndicator) {
            editIndicator.style.display = isEditMode ? 'block' : 'none';
        }

        // Show/hide delete button in edit mode
        const deleteBtn = document.getElementById('attendance-delete-btn');
        if (deleteBtn) {
            deleteBtn.style.display = isEditMode ? 'block' : 'none';
        }

        // Change submit button text
        const submitBtn = document.getElementById('attendance-submit-btn');
        if (submitBtn) {
            submitBtn.innerHTML = isEditMode ? '<i class="ph ph-floppy-disk"></i> Update Presensi' : 'Simpan Presensi';
        }

        // Load existing data if editing
        if (existingRecord) {
            document.querySelectorAll('input[name="attendance-status"]').forEach(radio => {
                radio.checked = radio.value === existingRecord.status;
            });

            if (existingRecord.status === 'izin' && existingRecord.reason) {
                document.getElementById('attendance-reason').value = existingRecord.reason;
                document.getElementById('attendance-reason-wrap').style.display = 'block';
                document.getElementById('attendance-material-wrap').style.display = 'none';
            } else if (existingRecord.status === 'hadir' && existingRecord.materialTitle) {
                document.getElementById('attendance-material-title').value = existingRecord.materialTitle;
                document.getElementById('attendance-reason-wrap').style.display = 'none';
                document.getElementById('attendance-material-wrap').style.display = 'block';
            } else {
                this.toggleReasonInput();
            }
        } else {
            // New entry - default to hadir
            document.querySelectorAll('input[name="attendance-status"]').forEach((radio, index) => {
                radio.checked = index === 0;
            });
            document.getElementById('attendance-reason-wrap').style.display = 'none';
            document.getElementById('attendance-material-wrap').style.display = 'block';
            document.getElementById('attendance-reason').value = '';
            document.getElementById('attendance-material-title').value = '';
        }

        modal.classList.add('active');

        // Premium: Blur course detail modal if it's open
        const courseDetailModal = document.getElementById('modal-course-detail');
        if (courseDetailModal && courseDetailModal.classList.contains('active')) {
            courseDetailModal.classList.add('blurred');
        }
    },

    closeAttendanceModal: function () {
        const modal = document.getElementById('modal-attendance-input');
        if (modal) {
            modal.classList.remove('active');
            // Clear dataset flags
            modal.dataset.editMode = '0';
            modal.dataset.isFromToday = '0';
            modal.dataset.intendedDate = '';
        }
        const form = document.getElementById('form-attendance-input');
        if (form) form.reset();
        document.getElementById('attendance-reason-wrap').style.display = 'none';
        document.getElementById('attendance-material-wrap').style.display = 'block';

        // Hide indicators
        const editIndicator = document.getElementById('attendance-edit-indicator');
        if (editIndicator) editIndicator.style.display = 'none';
        const meetingHint = document.getElementById('attendance-meeting-hint');
        if (meetingHint) meetingHint.style.display = 'none';
        const deleteBtn = document.getElementById('attendance-delete-btn');
        if (deleteBtn) deleteBtn.style.display = 'none';
        const submitBtn = document.getElementById('attendance-submit-btn');
        if (submitBtn) submitBtn.innerHTML = 'Simpan Presensi';

        // Re-enable meeting selector
        const meetingSelect = document.getElementById('attendance-meeting-number');
        if (meetingSelect) {
            meetingSelect.disabled = false;
            meetingSelect.style.opacity = '1';
            meetingSelect.style.cursor = 'pointer';
        }

        // Premium: Remove blur from course detail modal
        const courseDetailModal = document.getElementById('modal-course-detail');
        if (courseDetailModal) {
            courseDetailModal.classList.remove('blurred');
        }
    },

    bindModalEvents: function () {
        const form = document.getElementById('form-attendance-input');
        if (form && !form.dataset.bound) {
            form.addEventListener('submit', (e) => this.saveAttendance(e));
            form.dataset.bound = '1';
        }

        document.querySelectorAll('input[name="attendance-status"]').forEach(radio => {
            if (!radio.dataset.bound) {
                radio.addEventListener('change', () => this.toggleReasonInput());
                radio.dataset.bound = '1';
            }
        });
    },

    toggleReasonInput: function () {
        const selected = document.querySelector('input[name="attendance-status"]:checked');
        const wrap = document.getElementById('attendance-reason-wrap');
        if (!selected || !wrap) return;

        const isIzin = selected.value === 'izin';
        const isHadir = selected.value === 'hadir';
        wrap.style.display = isIzin ? 'block' : 'none';
        document.getElementById('attendance-material-wrap').style.display = isHadir ? 'block' : 'none';
        if (!isIzin) document.getElementById('attendance-reason').value = '';
        if (!isHadir) document.getElementById('attendance-material-title').value = '';
    },

    saveAttendance: function (e) {
        e.preventDefault();

        const modal = document.getElementById('modal-attendance-input');
        const scheduleId = document.getElementById('attendance-course-id').value;
        const meetingNumber = parseInt(document.getElementById('attendance-meeting-number').value, 10);
        const selected = document.querySelector('input[name="attendance-status"]:checked');
        const status = selected ? selected.value : 'hadir';
        const reason = document.getElementById('attendance-reason').value.trim();
        const materialTitle = document.getElementById('attendance-material-title').value.trim();
        const isFromToday = modal.dataset.isFromToday === '1';
        const isEditMode = modal.dataset.editMode === '1';

        if (status === 'izin' && !reason) {
            alert('Alasan izin wajib diisi.');
            return;
        }

        const schedule = Storage.getSchedules().find(s => s.id === scheduleId);
        if (!schedule) {
            alert('Mata kuliah tidak ditemukan.');
            return;
        }

        const activeSemester = this.getActiveSemester();

        // If from today's class, find today's record (not by meeting number)
        let existingIndex = -1;
        if (isFromToday && isEditMode) {
            const today = new Date().toISOString().split('T')[0];
            existingIndex = this.records.findIndex(rec => {
                if (rec.dateFor !== undefined) {
                    return rec.scheduleId === scheduleId &&
                        String(rec.semester || 1) === activeSemester &&
                        rec.dateFor === today;
                }
                const recDate = new Date(rec.timestamp).toISOString().split('T')[0];
                return rec.scheduleId === scheduleId &&
                    String(rec.semester || 1) === activeSemester &&
                    recDate === today;
            });
        } else {
            // Normal mode - check by meeting number
            existingIndex = this.records.findIndex(r =>
                r.scheduleId === scheduleId &&
                String(r.semester || 1) === activeSemester &&
                Number(r.meetingNumber) === meetingNumber
            );

            if (existingIndex > -1) {
                const ok = confirm(`Presensi pertemuan ke-${meetingNumber} sudah ada. Timpa data lama?`);
                if (!ok) return;
            }
        }

        const record = {
            id: existingIndex > -1 ? this.records[existingIndex].id : uuidv4(),
            scheduleId,
            courseName: schedule.name,
            semester: activeSemester,
            meetingNumber,
            status,
            reason: status === 'izin' ? reason : null,
            materialTitle: status === 'hadir' ? materialTitle || null : null,
            timestamp: new Date().toISOString(),
            dateFor: isFromToday ? (modal.dataset.intendedDate || new Date().toISOString().split('T')[0]) : null
        };

        if (existingIndex > -1) this.records[existingIndex] = record;
        else this.records.push(record);

        Storage.setAttendanceRecords(this.records);
        this.closeAttendanceModal();
        this.renderRecap();

        if (typeof homeManager !== 'undefined') homeManager.renderTodaySchedule();
        this.showToast('Presensi tersimpan.');
    },

    deleteCurrentAttendance: function () {
        const modal = document.getElementById('modal-attendance-input');
        const scheduleId = document.getElementById('attendance-course-id').value;
        const isEditMode = modal.dataset.editMode === '1';
        const isFromToday = modal.dataset.isFromToday === '1';

        if (!isEditMode) {
            alert('Tidak ada data untuk dihapus.');
            return;
        }

        const schedule = Storage.getSchedules().find(s => s.id === scheduleId);
        const courseName = schedule ? schedule.name : 'mata kuliah ini';

        if (!confirm(`Hapus presensi hari ini untuk ${courseName}?`)) {
            return;
        }

        // Find today's record
        const today = new Date().toISOString().split('T')[0];
        const activeSemester = this.getActiveSemester();
        const recordIndex = this.records.findIndex(rec => {
            if (rec.dateFor !== undefined) {
                return rec.scheduleId === scheduleId &&
                    String(rec.semester || 1) === activeSemester &&
                    rec.dateFor === today;
            }
            const recDate = new Date(rec.timestamp).toISOString().split('T')[0];
            return rec.scheduleId === scheduleId &&
                String(rec.semester || 1) === activeSemester &&
                recDate === today;
        });

        if (recordIndex > -1) {
            this.records.splice(recordIndex, 1);
            Storage.setAttendanceRecords(this.records);
            this.closeAttendanceModal();
            this.renderRecap();
            if (typeof homeManager !== 'undefined') homeManager.renderTodaySchedule();
            this.showToast('Presensi dihapus.');
        } else {
            alert('Data presensi tidak ditemukan.');
        }
    },

    renderRecap: function () {
        const container = document.getElementById('attendance-recap-list');
        if (!container) return;

        const schedules = this.getActiveSchedules();

        container.innerHTML = '';
        this.renderGlobalSummary(schedules);
        this.renderUnderTargetCourses(schedules);

        if (schedules.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="ph ph-calendar-blank"></i>
                    <p>Belum ada jadwal di semester aktif.</p>
                </div>
            `;
            return;
        }

        const displaySchedules = schedules.filter(sch => {
            const percent = this.getSummaryBySchedule(sch.id).percent;
            if (this.recapFilter === 'under') return percent < this.minimumPercent;
            if (this.recapFilter === 'met') return percent >= this.minimumPercent;
            return true;
        });

        if (displaySchedules.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="ph ph-funnel"></i>
                    <p>Tidak ada mata kuliah untuk filter ini.</p>
                </div>
            `;
            return;
        }

        displaySchedules.forEach((sch, index) => {
            const summary = this.getSummaryBySchedule(sch.id);
            const progressClass = summary.percent >= this.minimumPercent ? 'attendance-good' : 'attendance-warning';

            const card = document.createElement('div');
            card.className = 'card fade-in';
            card.style.animationDelay = `${index * 0.05}s`;
            card.style.padding = '1rem';
            card.style.marginBottom = '0.75rem';
            card.style.cursor = 'pointer';
            card.onclick = () => this.openCourseRecapModal(sch.id);

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; gap:0.75rem; align-items:flex-start; margin-bottom:0.75rem;">
                    <div>
                        <div style="font-weight:700; font-size:1rem;">${sch.name}</div>
                        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.2rem;">${this.getDayLabel(sch.day)} • ${sch.start} - ${sch.end}</div>
                    </div>
                    <button class="btn btn-outline" style="padding:0.35rem 0.75rem; font-size:0.75rem;" onclick="event.stopPropagation(); presensiManager.openAttendanceModal('${sch.id}')">
                        <i class="ph ph-check-circle"></i> Isi
                    </button>
                </div>

                <div style="display:flex; justify-content:space-between; margin-bottom:0.35rem; font-size:0.8rem; color:var(--text-muted);">
                    <span>Progress Kehadiran</span>
                    <span style="font-weight:700; color:var(--text-main);">${summary.countedPresent}/${this.totalMeetings} (${summary.percent}%)</span>
                </div>
                <div class="attendance-progress-track">
                    <div class="attendance-progress-fill ${progressClass}" style="width:${Math.min(100, summary.percent)}%"></div>
                </div>

                <div style="display:flex; gap:0.75rem; flex-wrap:wrap; margin-top:0.75rem; font-size:0.78rem; color:var(--text-muted);">
                    <span><i class="ph ph-check" style="color:var(--success)"></i> Hadir: ${summary.hadir}</span>
                    <span><i class="ph ph-hand-coins" style="color:var(--warning)"></i> Izin: ${summary.izin}</span>
                    <span><i class="ph ph-x" style="color:var(--danger)"></i> Tidak hadir: ${summary.tidakHadir}</span>
                    <span><i class="ph ph-flag"></i> Minimal: ${summary.minimumMeetings}</span>
                </div>
            `;

            container.appendChild(card);
        });
    },

    renderGlobalSummary: function (schedules) {
        const container = document.getElementById('attendance-global-summary');
        if (!container) return;

        const totals = schedules.reduce((acc, sch) => {
            const summary = this.getSummaryBySchedule(sch.id);
            acc.hadir += summary.hadir;
            acc.izin += summary.izin;
            acc.tidakHadir += summary.tidakHadir;
            return acc;
        }, { hadir: 0, izin: 0, tidakHadir: 0 });

        container.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(16,185,129,0.12); color: var(--success);"><i class="ph ph-check"></i></div>
                <div class="stat-info">
                    <h3>Total Hadir</h3>
                    <p class="stat-value">${totals.hadir}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(245,158,11,0.14); color: var(--warning);"><i class="ph ph-hand-coins"></i></div>
                <div class="stat-info">
                    <h3>Total Izin</h3>
                    <p class="stat-value">${totals.izin}</p>
                </div>
            </div>
            <div class="stat-card" style="grid-column: 1 / -1;">
                <div class="stat-icon" style="background: rgba(239,68,68,0.12); color: var(--danger);"><i class="ph ph-x"></i></div>
                <div class="stat-info">
                    <h3>Total Tidak Hadir</h3>
                    <p class="stat-value">${totals.tidakHadir}</p>
                </div>
            </div>
        `;
    },

    renderUnderTargetCourses: function (schedules) {
        const container = document.getElementById('attendance-under-target-list');
        if (!container) return;

        const underTarget = schedules
            .map(sch => ({ schedule: sch, summary: this.getSummaryBySchedule(sch.id) }))
            .filter(item => item.summary.percent < this.minimumPercent)
            .sort((a, b) => a.summary.percent - b.summary.percent);

        if (underTarget.length === 0) {
            container.innerHTML = `<div style="font-size:0.85rem; color:var(--success); font-weight:600;">Semua mata kuliah sudah memenuhi target minimal 75%.</div>`;
            return;
        }

        container.innerHTML = '';
        underTarget.forEach(item => {
            const row = document.createElement('button');
            row.type = 'button';
            row.style.width = '100%';
            row.style.textAlign = 'left';
            row.style.border = '1px solid var(--border-color)';
            row.style.borderRadius = 'var(--radius-sm)';
            row.style.background = 'var(--bg-main)';
            row.style.padding = '0.65rem 0.75rem';
            row.style.marginBottom = '0.5rem';
            row.style.cursor = 'pointer';
            row.onclick = () => this.openCourseRecapModal(item.schedule.id);

            row.innerHTML = `
                <div style="display:flex; justify-content:space-between; gap:0.75rem; align-items:center;">
                    <span style="font-size:0.85rem; color:var(--text-main); font-weight:600;">${item.schedule.name}</span>
                    <span style="font-size:0.78rem; color:var(--danger); font-weight:700;">${item.summary.percent}%</span>
                </div>
            `;
            container.appendChild(row);
        });
    },

    openCourseRecapModal: function (scheduleId) {
        const modal = document.getElementById('modal-attendance-course-recap');
        if (!modal) return;

        const schedule = this.getActiveSchedules().find(s => s.id === scheduleId);
        if (!schedule) return;

        const summary = this.getSummaryBySchedule(scheduleId);
        const list = document.getElementById('attendance-course-recap-list');

        document.getElementById('attendance-course-recap-title').innerText = schedule.name;
        document.getElementById('attendance-course-recap-subtitle').innerText = `${this.getDayLabel(schedule.day)} • ${schedule.start} - ${schedule.end}`;
        document.getElementById('attendance-course-recap-summary').innerText = `Hadir: ${summary.hadir} • Izin: ${summary.izin} • Tidak hadir: ${summary.tidakHadir} • ${summary.percent}%`;

        list.innerHTML = '';
        if (summary.records.length === 0) {
            list.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:1rem; border:1px dashed var(--border-color); border-radius:var(--radius-sm);">Belum ada data presensi untuk mata kuliah ini.</div>`;
        } else {
            summary.records.forEach(record => {
                const item = document.createElement('div');
                item.style.background = 'var(--bg-main)';
                item.style.padding = '0.75rem';
                item.style.border = '1px solid var(--border-color)';
                item.style.borderRadius = 'var(--radius-sm)';

                const extraInfo = record.status === 'izin' && record.reason
                    ? `<div style="font-size:0.75rem; color:var(--warning); margin-top:0.3rem;"><i class="ph ph-note"></i> Alasan: ${record.reason}</div>`
                    : (record.status === 'hadir' && record.materialTitle
                        ? `<div style="font-size:0.75rem; color:var(--primary); margin-top:0.3rem;"><i class="ph ph-book-open"></i> Materi: ${record.materialTitle}</div>`
                        : '');

                item.innerHTML = `
                    <div style="display:flex; justify-content:space-between; gap:0.75rem; align-items:center;">
                        <div style="font-weight:600; font-size:0.87rem;">Pertemuan ke-${record.meetingNumber}</div>
                        <div style="font-size:0.78rem; font-weight:700; color:${this.getStatusColor(record.status)};">${this.getStatusLabel(record.status)}</div>
                    </div>
                    ${extraInfo}
                `;

                list.appendChild(item);
            });
        }

        modal.classList.add('active');

        // Premium: Blur course detail modal if it's open
        const courseDetailModal = document.getElementById('modal-course-detail');
        if (courseDetailModal && courseDetailModal.classList.contains('active')) {
            courseDetailModal.classList.add('blurred');
        }
    },

    closeCourseRecapModal: function () {
        const modal = document.getElementById('modal-attendance-course-recap');
        if (modal) modal.classList.remove('active');

        // Premium: Remove blur from course detail modal
        const courseDetailModal = document.getElementById('modal-course-detail');
        if (courseDetailModal) {
            courseDetailModal.classList.remove('blurred');
        }
    },

    getStatusLabel: function (status) {
        if (status === 'hadir') return 'Hadir';
        if (status === 'izin') return 'Izin';
        return 'Tidak Hadir';
    },

    getStatusColor: function (status) {
        if (status === 'hadir') return 'var(--success)';
        if (status === 'izin') return 'var(--warning)';
        return 'var(--danger)';
    },

    getDayLabel: function (dayNum) {
        const map = {
            1: 'Senin',
            2: 'Selasa',
            3: 'Rabu',
            4: 'Kamis',
            5: 'Jumat',
            6: 'Sabtu'
        };
        return map[Number(dayNum)] || '-';
    },

    showToast: function (message) {
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.top = 'auto';
        toast.style.bottom = 'calc(86px + env(safe-area-inset-bottom))';
        toast.style.left = 'max(12px, env(safe-area-inset-left))';
        toast.style.right = 'max(12px, env(safe-area-inset-right))';
        toast.style.margin = '0 auto';
        toast.style.background = 'var(--text-main)';
        toast.style.color = 'var(--bg-main)';
        toast.style.padding = '0.75rem 1.25rem';
        toast.style.borderRadius = 'var(--radius-md)';
        toast.style.boxShadow = 'var(--shadow-lg)';
        toast.style.zIndex = '1000';
        toast.style.fontSize = '0.9rem';
        toast.style.fontWeight = '500';
        toast.style.maxWidth = 'calc(100vw - 40px)';
        toast.style.wordWrap = 'break-word';
        toast.innerText = message;

        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 1800);
    }
};
