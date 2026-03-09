const profileManager = {
    profile: {},

    init: function () {
        this.profile = Storage.getProfile();
        this.renderProfileSummary();
        this.setupTrigger();
        this.checkFirstTimeUser();
    },

    checkFirstTimeUser: function () {
        // Check if this is the first time user (no custom profile set)
        const isFirstTime = Storage.get('unilife_first_time', true);
        if (isFirstTime) {
            // Show welcome modal after a short delay
            setTimeout(() => {
                const welcomeModal = document.getElementById('welcome-modal');
                if (welcomeModal) {
                    welcomeModal.classList.add('active');
                }
            }, 500);
        }
    },

    startProfileSetup: function () {
        // Hide welcome modal
        const welcomeModal = document.getElementById('welcome-modal');
        if (welcomeModal) {
            welcomeModal.classList.remove('active');
        }

        // Mark as not first time anymore
        Storage.set('unilife_first_time', false);

        // Open profile edit modal
        setTimeout(() => {
            this.openModal();
        }, 300);
    },

    skipWelcome: function () {
        // Hide welcome modal
        const welcomeModal = document.getElementById('welcome-modal');
        if (welcomeModal) {
            welcomeModal.classList.remove('active');
        }

        // Mark as not first time anymore
        Storage.set('unilife_first_time', false);
    },

    renderProfileSummary: function () {
        const triggers = document.querySelectorAll('#profile-trigger');
        const photoUrl = this.profile.photoBase64 || '';
        const initial = this.profile.nickname ? this.profile.nickname.charAt(0).toUpperCase() : 'U';

        // Update Top Header Trigger
        triggers.forEach(t => {
            if (photoUrl) {
                t.innerHTML = '';
                t.style.backgroundImage = `url(${photoUrl})`;
                t.classList.remove('profile-avatar-initial');
            } else {
                t.innerHTML = initial;
                t.style.backgroundImage = 'none';
                t.classList.add('profile-avatar-initial');
            }
        });

        // Update Profile Dashboard View
        const dashPhoto = document.getElementById('prof-dash-photo');
        if (dashPhoto) {
            if (photoUrl) {
                dashPhoto.innerHTML = '';
                dashPhoto.style.backgroundImage = `url(${photoUrl})`;
                dashPhoto.classList.remove('profile-avatar-initial');
            } else {
                dashPhoto.innerHTML = initial;
                dashPhoto.style.backgroundImage = 'none';
                dashPhoto.classList.add('profile-avatar-initial');
            }
        }

        const eName = document.getElementById('prof-dash-name');
        const eUniv = document.getElementById('prof-dash-univ');
        const eSem = document.getElementById('prof-dash-sem');
        const eMajor = document.getElementById('prof-dash-major');

        if (eName) eName.innerText = this.profile.fullName || i18n.t('profile_default_name');
        if (eUniv) eUniv.innerText = this.profile.university || i18n.t('profile_default_university');
        if (eSem) eSem.innerText = this.profile.semester ? i18n.tf('profile_label_semester', { semester: this.profile.semester }) : '-';
        if (eMajor) eMajor.innerText = this.profile.major || '-';

        // Update Complex Dashboard
        this.renderComplexDashboard();

        // Also update greeting in Home if homeManager is loaded
        if (typeof homeManager !== 'undefined' && document.getElementById('home-greeting')) {
            const hour = new Date().getHours();
            let greeting = i18n.t('home_welcome');
            let isEn = i18n.currentLang === 'en';

            // Random dynamic greetings
            const morningGreetingsID = ["Semangat Pagi", "Pagi yang Cerah", "Halo, Selamat Pagi", "Waktunya Produktif"];
            const afternoonGreetingsID = ["Selamat Siang", "Siang, Tetap Fokus", "Fokus Yuk Siang Ini", "Semangat Siang"];
            const eveningGreetingsID = ["Selamat Sore", "Sore yang Tenang", "Tetap Semangat Sore Ini", "Halo, Selamat Sore"];
            const nightGreetingsID = ["Selamat Malam", "Malam, Jangan Lupa Istirahat", "Evaluasi Harimu", "Selamat Beristirahat"];

            const morningGreetingsEN = ["Good Morning", "Bright Morning", "Hello, Good Morning", "Time to be Productive"];
            const afternoonGreetingsEN = ["Good Afternoon", "Afternoon, Stay Focused", "Let's Focus", "Good Afternoon"];
            const eveningGreetingsEN = ["Good Evening", "Calm Evening", "Keep the Spirit", "Hello, Good Evening"];
            const nightGreetingsEN = ["Good Night", "Night, Don't Forget to Rest", "Reflect on Your Day", "Have a Good Rest"];

            const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

            if (isEn) {
                if (hour < 11) greeting = getRandom(morningGreetingsEN);
                else if (hour < 15) greeting = getRandom(afternoonGreetingsEN);
                else if (hour < 19) greeting = getRandom(eveningGreetingsEN);
                else greeting = getRandom(nightGreetingsEN);
            } else {
                if (hour < 11) greeting = getRandom(morningGreetingsID);
                else if (hour < 15) greeting = getRandom(afternoonGreetingsID);
                else if (hour < 19) greeting = getRandom(eveningGreetingsID);
                else greeting = getRandom(nightGreetingsID);
            }

            document.getElementById('home-greeting').innerText = `${greeting}, ${this.profile.nickname || (isEn ? 'Student' : 'Mahasiswa')}! 👋`;

            // Handle optional university/faculty display
            const defaultUniv = i18n.t('profile_default_university');
            const univText = this.profile.university ? this.profile.university : defaultUniv;
            const univDisplay = univText ? ` • ${univText}` : '';

            document.getElementById('home-subgreeting').innerHTML = `<i class="ph ph-student"></i> ${i18n.tf('common_semester', { semester: this.profile.semester || '-' })}${univDisplay}`;
        }
    },

    renderComplexDashboard: function () {
        const photoUrl = this.profile.photoBase64 || '';
        const initial = this.profile.nickname ? this.profile.nickname.charAt(0).toUpperCase() : 'U';

        // Update photo in dashboard
        const dashboardPhoto = document.getElementById('profile-dashboard-photo');
        if (dashboardPhoto) {
            if (photoUrl) {
                dashboardPhoto.innerHTML = '';
                dashboardPhoto.style.backgroundImage = `url(${photoUrl})`;
                dashboardPhoto.classList.remove('profile-avatar-initial');
            } else {
                dashboardPhoto.innerHTML = initial;
                dashboardPhoto.style.backgroundImage = 'none';
                dashboardPhoto.classList.add('profile-avatar-initial');
            }
        }

        // Update profile info
        const dashName = document.getElementById('profile-dashboard-name');
        const dashUniv = document.getElementById('profile-dashboard-univ');
        const dashSem = document.getElementById('profile-dashboard-sem');
        const dashMajor = document.getElementById('profile-dashboard-major');

        if (dashName) dashName.innerText = this.profile.fullName || i18n.t('profile_default_name');
        if (dashUniv) dashUniv.innerText = this.profile.university || i18n.t('profile_default_university');
        if (dashSem) dashSem.innerText = this.profile.semester ? `Semester ${this.profile.semester}` : '-';
        if (dashMajor) dashMajor.innerText = this.profile.major || '-';

        // Calculate and display stats
        this.updateDashboardStats();
        this.renderUrgentTasks();
    },

    updateDashboardStats: function () {
        // Get IPK
        if (typeof gradesManager !== 'undefined') {
            const stats = gradesManager.calculateOverallStats();
            const ipkEl = document.getElementById('profile-ipk-display');
            if (ipkEl) ipkEl.innerText = stats.ipk;
        }

        // Get pending tasks
        if (typeof tasksManager !== 'undefined') {
            const allTasks = Storage.getTasks ? Storage.getTasks() : [];
            const activeSemester = String(this.profile.semester || 1);
            const pendingTasks = allTasks.filter(t => {
                const tSem = String(t.semester || 1);
                return tSem === activeSemester && !t.completed;
            });
            const completedTasks = allTasks.filter(t => {
                const tSem = String(t.semester || 1);
                return tSem === activeSemester && t.completed;
            });

            const pendingEl = document.getElementById('profile-pending-tasks');
            const completedEl = document.getElementById('profile-completed-tasks');
            if (pendingEl) pendingEl.innerText = pendingTasks.length;
            if (completedEl) completedEl.innerText = completedTasks.length;
        }

        // Get focus stats
        if (typeof focusManager !== 'undefined') {
            const sessions = focusManager.focusSessions || [];
            const today = new Date().toDateString();

            // Count today's sessions
            const todaySessions = sessions.filter(s => new Date(s.date).toDateString() === today);
            const sessionsEl = document.getElementById('profile-focus-sessions');
            if (sessionsEl) sessionsEl.innerText = todaySessions.length;

            // Calculate total focus time in hours
            const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
            const totalHours = (totalMinutes / 60).toFixed(1);
            const timeEl = document.getElementById('profile-total-focus-time');
            if (timeEl) timeEl.innerText = `${totalHours}h`;

            // Calculate streak
            this.calculateStreak();
        }

        // Get attendance percentage
        this.getAttendancePercentage();

        // Get course count
        if (typeof gradesManager !== 'undefined') {
            const activeSemester = String(this.profile.semester || 1);
            const currentSem = gradesManager.semesters.find(s => s.name.includes(activeSemester));
            const courseCount = currentSem ? currentSem.courses.length : 0;
            const courseEl = document.getElementById('profile-course-count');
            if (courseEl) courseEl.innerText = courseCount;
        }
    },

    calculateStreak: function () {
        if (typeof focusManager === 'undefined') return;

        const sessions = focusManager.focusSessions || [];
        if (sessions.length === 0) {
            const streakEl = document.getElementById('profile-streak-count');
            if (streakEl) streakEl.innerText = '0';
            return;
        }

        // Sort sessions by date (newest first)
        const sortedDates = [...new Set(sessions.map(s => new Date(s.date).toDateString()))].sort((a, b) => new Date(b) - new Date(a));

        let streak = 0;
        let today = new Date();

        for (let i = 0; i < sortedDates.length; i++) {
            const sessionDate = new Date(sortedDates[i]);
            const expectedDate = new Date(today);
            expectedDate.setDate(expectedDate.getDate() - i);

            if (sessionDate.toDateString() === expectedDate.toDateString()) {
                streak++;
            } else {
                break;
            }
        }

        const streakEl = document.getElementById('profile-streak-count');
        if (streakEl) streakEl.innerText = streak;
    },

    getAttendancePercentage: function () {
        if (typeof presensiManager === 'undefined') {
            const attendanceEl = document.getElementById('profile-attendance-percent');
            if (attendanceEl) attendanceEl.innerText = '-';
            return;
        }

        const allAttendance = Storage.getAttendanceRecords ? Storage.getAttendanceRecords() : [];
        const activeSemester = String(this.profile.semester || 1);

        if (allAttendance.length === 0) {
            const attendanceEl = document.getElementById('profile-attendance-percent');
            if (attendanceEl) attendanceEl.innerText = '0%';
            return;
        }

        let totalMeetings = 0;
        let attended = 0;

        allAttendance.forEach(course => {
            if (String(course.semester || 1) === activeSemester) {
                if (course.records && Array.isArray(course.records)) {
                    totalMeetings += course.records.length;
                    attended += course.records.filter(r => r.status === 'hadir').length;
                }
            }
        });

        const percentage = totalMeetings === 0 ? 0 : Math.round((attended / totalMeetings) * 100);
        const attendanceEl = document.getElementById('profile-attendance-percent');
        if (attendanceEl) attendanceEl.innerText = `${percentage}%`;
    },

    renderUrgentTasks: function () {
        if (typeof tasksManager === 'undefined') return;

        const allTasks = Storage.getTasks ? Storage.getTasks() : [];
        const activeSemester = String(this.profile.semester || 1);

        // Filter pending tasks from active semester
        const pendingTasks = allTasks.filter(t => {
            const tSem = String(t.semester || 1);
            return tSem === activeSemester && !t.completed;
        });

        // Get tasks due in next 3 days
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const threeDaysLater = new Date(today);
        threeDaysLater.setDate(threeDaysLater.getDate() + 3);

        const urgentTasks = pendingTasks.filter(t => {
            const dueDate = new Date(t.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate <= threeDaysLater && dueDate >= today;
        }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        const container = document.getElementById('profile-urgent-tasks');
        const emptyState = document.getElementById('profile-urgent-empty');

        if (!container) return;

        if (urgentTasks.length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'flex';
        emptyState.style.display = 'none';
        container.innerHTML = '';

        urgentTasks.forEach(task => {
            const dueDate = new Date(task.dueDate);
            const today = new Date();
            const diff = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

            let urgencyColor = 'var(--success)'; // green
            let urgencyLabel = 'Tersisa';

            if (diff === 0) {
                urgencyColor = 'var(--danger)';
                urgencyLabel = 'HARI INI!';
            } else if (diff === 1) {
                urgencyColor = 'var(--warning)';
                urgencyLabel = 'Besok';
            }

            const taskCard = document.createElement('div');
            // Extract the variable name to use for background alpha calculation (crude fallback if variable can't be resolved in inline style directly with opacity, but fine for inline)
            // Using a simple 10% opacity background of the text color. In CSS this is tricky with vars without new syntax, so we fall back to generic card bg
            taskCard.style.cssText = `
                padding: 1rem;
                background: ${diff === 0 ? 'var(--danger-light)' : 'var(--bg-card)'};
                border-radius: var(--radius-sm);
                border-left: 4px solid ${urgencyColor};
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            `;
            taskCard.onmouseenter = () => { taskCard.style.transform = 'translateY(-2px)'; taskCard.style.boxShadow = 'var(--shadow-sm)'; };
            taskCard.onmouseleave = () => { taskCard.style.transform = 'translateY(0)'; taskCard.style.boxShadow = 'none'; };

            taskCard.innerHTML = `
                <div style="flex: 1;">
                    <h4 style="font-weight: 600; color: var(--text-main); margin-bottom: 0.25rem; font-size: 0.95rem;">${task.title}</h4>
                    <p style="font-size: 0.8rem; color: var(--text-muted);">
                        ${task.courseName || 'Course'} • 
                        <span style="color: ${urgencyColor}; font-weight: 600;">${urgencyLabel} ${diff > 0 ? `(${diff} hari)` : ''}</span>
                    </p>
                </div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <div style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: ${diff === 0 ? 'var(--danger-light)' : 'rgba(100,116,139,0.1)'}; color: ${urgencyColor}; font-weight: 600;">
                        ${diff}d
                    </div>
                </div>
            `;

            container.appendChild(taskCard);
        });
    },

    setupTrigger: function () {
        const trigger = document.getElementById('profile-trigger');
        if (trigger) {
            trigger.addEventListener('click', () => {
                // Manually switch view to #view-profile
                document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                const viewObj = document.getElementById('view-profile');
                if (viewObj) viewObj.classList.add('active');
            });
        }
    },

    openSettingsModal: function () {
        // Load language and theme preferences
        const settings = Storage.getSettings ? Storage.getSettings() : { language: 'id', theme: 'system' };

        const langSelect = document.getElementById('setting-lang-select');
        if (langSelect) langSelect.value = settings.language || 'id';

        const themeSelect = document.getElementById('setting-theme-select');
        if (themeSelect) themeSelect.value = settings.theme || 'system';

        document.getElementById('modal-settings').classList.add('active');
    },

    closeSettingsModal: function () {
        document.getElementById('modal-settings').classList.remove('active');
    },

    saveSettings: function () {
        const langSelect = document.getElementById('setting-lang-select');
        const selectedLang = langSelect ? langSelect.value : 'id';

        const themeSelect = document.getElementById('setting-theme-select');
        const selectedTheme = themeSelect ? themeSelect.value : 'system';

        let settings = Storage.getSettings ? Storage.getSettings() : {};
        const oldLang = settings.language || 'id';
        const oldTheme = settings.theme || 'system';

        settings.language = selectedLang;
        settings.theme = selectedTheme;
        if (Storage.setSettings) Storage.setSettings(settings);

        this.closeSettingsModal();

        let needsReload = false;
        if (oldLang !== selectedLang) {
            needsReload = true;
        }
        if (oldTheme !== selectedTheme) {
            // Apply theme immediately without reload
            if (typeof window.applyTheme !== 'undefined') {
                window.applyTheme(selectedTheme);
            }
        }

        if (needsReload) {
            // Trigger loader and reload
            const loader = document.getElementById('semester-loader');
            const loaderText = document.getElementById('semester-loader-text');
            if (loader && loaderText) {
                i18n.currentLang = selectedLang;
                loaderText.innerText = i18n.t('settings_changing_language');
                loader.style.display = 'flex';
                setTimeout(() => {
                    loader.style.opacity = '1';
                }, 10);

                setTimeout(() => {
                    window.location.reload();
                }, 800);
            } else {
                window.location.reload();
            }
        }
    },

    openModal: function () {
        document.getElementById('prof-full').value = this.profile.fullName || '';
        document.getElementById('prof-nick').value = this.profile.nickname || '';
        document.getElementById('prof-univ').value = this.profile.university || '';
        document.getElementById('prof-sem').value = this.profile.semester || '';
        document.getElementById('prof-major').value = this.profile.major || '';

        const preview = document.getElementById('prof-photo-preview');
        const removeBtn = document.getElementById('prof-photo-remove');

        if (this.profile.photoBase64) {
            preview.innerHTML = '';
            preview.style.backgroundImage = `url(${this.profile.photoBase64})`;
            preview.classList.remove('profile-avatar-initial');
            if (removeBtn) removeBtn.style.display = 'block';
        } else {
            preview.innerHTML = '<i class="ph ph-user"></i>';
            preview.style.backgroundImage = 'none';
            preview.classList.add('profile-avatar-initial');
            if (removeBtn) removeBtn.style.display = 'none';
        }

        document.getElementById('modal-profile').classList.add('active');
    },

    closeModal: function () {
        document.getElementById('modal-profile').classList.remove('active');
    },

    handlePhotoUpload: function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64String = event.target.result;
            this.profile.photoBase64 = base64String;

            // Preview instantly
            const preview = document.getElementById('prof-photo-preview');
            preview.innerHTML = '';
            preview.style.backgroundImage = `url(${base64String})`;
            preview.classList.remove('profile-avatar-initial');

            const removeBtn = document.getElementById('prof-photo-remove');
            if (removeBtn) removeBtn.style.display = 'block';
        };
        reader.readAsDataURL(file);
    },

    removePhoto: function () {
        this.profile.photoBase64 = null;

        const preview = document.getElementById('prof-photo-preview');
        preview.innerHTML = '<i class="ph ph-user"></i>';
        preview.style.backgroundImage = 'none';
        preview.classList.add('profile-avatar-initial');

        const removeBtn = document.getElementById('prof-photo-remove');
        if (removeBtn) removeBtn.style.display = 'none';

        // Clear input to allow re-uploading the same file
        const input = document.getElementById('prof-photo-input');
        if (input) input.value = '';
    },

    saveProfile: function (e) {
        e.preventDefault();

        const oldSemester = this.profile.semester || '';
        let rawSemester = parseInt(document.getElementById('prof-sem').value);
        if (isNaN(rawSemester) || rawSemester < 1) rawSemester = 1;
        if (rawSemester > 14) rawSemester = 14;
        const newSemester = rawSemester.toString();
        document.getElementById('prof-sem').value = newSemester;

        // Only consider it a "change" if old wasn't empty and it's actually different
        const isSemesterChanged = (oldSemester !== newSemester && oldSemester !== '');

        // photoBase64 is already saved in this.profile via handlePhotoUpload
        this.profile.fullName = document.getElementById('prof-full').value;
        this.profile.nickname = document.getElementById('prof-nick').value;
        this.profile.university = document.getElementById('prof-univ').value;
        this.profile.semester = newSemester;
        this.profile.major = document.getElementById('prof-major').value;

        Storage.setProfile(this.profile);
        this.renderProfileSummary();

        // 2. Auto-create Semester if not exists
        if (typeof gradesManager !== 'undefined' && this.profile.semester) {
            const semName = `Semester ${this.profile.semester}`;
            const exists = gradesManager.semesters.some(s => s.name.toLowerCase() === semName.toLowerCase());

            if (!exists) {
                // Auto create the new semester
                gradesManager.semesters.push({
                    id: uuidv4(),
                    name: semName,
                    courses: []
                });
                Storage.setGrades(gradesManager.semesters);
                gradesManager.renderStats();
                gradesManager.renderSemesters();
            }
        }

        if (isSemesterChanged) {
            this.closeModal();
            const loader = document.getElementById('semester-loader');
            const loaderText = document.getElementById('semester-loader-text');

            if (loader && loaderText) {
                loaderText.innerText = i18n.tf('loader_switching_semester_to', { semester: newSemester });
                loader.style.display = 'flex';
                // Trigger reflow to ensure transition runs
                void loader.offsetWidth;
                loader.style.opacity = '1';

                setTimeout(() => {
                    window.location.reload();
                }, 1200);
            } else {
                window.location.reload();
            }
        } else {
            this.closeModal();

            // 1. Force re-render of contextual UI (in-place)
            if (typeof scheduleManager !== 'undefined') {
                scheduleManager.renderScheduleList();
            }
            if (typeof tasksManager !== 'undefined') {
                tasksManager.renderTasks();
            }
        }
    },

    resetApp: function () {
        if (confirm(i18n.t('profile_reset_confirm_1'))) {
            if (confirm(i18n.t('profile_reset_confirm_2'))) {
                localStorage.clear();
                window.location.reload();
            }
        }
    },

    exportData: function () {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            data[key] = localStorage.getItem(key);
        }

        const timestamp = new Date().toISOString().split('T')[0];
        const fileName = `unilife-backup-${timestamp}.json`;

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", fileName);
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    },

    importData: function (event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                // Very basic validation: Check if it looks like our app's data
                if (!data || typeof data !== 'object') {
                    throw new Error('Invalid format');
                }

                if (confirm(i18n.t('profile_import_confirm'))) {
                    // Clear existing data to ensure a clean state
                    localStorage.clear();

                    // Import all keys
                    for (const key in data) {
                        if (Object.prototype.hasOwnProperty.call(data, key)) {
                            localStorage.setItem(key, data[key]);
                        }
                    }

                    alert(i18n.t('profile_import_success') || 'Data berhasil dipulihkan!');
                    window.location.reload();
                }
            } catch (error) {
                console.error("Import error:", error);
                alert(i18n.t('profile_import_error') || 'File backup tidak valid atau rusak.');
            }

            // Reset input so the exact same file can be triggered again if needed
            event.target.value = '';
        };
        reader.readAsText(file);
    }
};
