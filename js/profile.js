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

        // Also update greeting in Home if homeManager is loaded
        if (typeof homeManager !== 'undefined' && document.getElementById('home-greeting')) {
            const hour = new Date().getHours();
            let greeting = i18n.t('home_welcome');
            if (i18n.currentLang === 'en') {
                if (hour < 11) greeting = 'Good Morning';
                else if (hour < 15) greeting = 'Good Afternoon';
                else if (hour < 19) greeting = 'Good Evening';
                else greeting = 'Good Night';
            } else {
                if (hour < 11) greeting = 'Selamat Pagi';
                else if (hour < 15) greeting = 'Selamat Siang';
                else if (hour < 19) greeting = 'Selamat Sore';
                else greeting = 'Selamat Malam';
            }

            document.getElementById('home-greeting').innerText = `${greeting}, ${this.profile.nickname || (i18n.currentLang === 'en' ? 'Student' : 'Mahasiswa')}! 👋`;
            document.getElementById('home-subgreeting').innerText = `${i18n.tf('common_semester', { semester: this.profile.semester || '-' })} • ${this.profile.university || i18n.t('profile_default_university')}`;
        }
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
        const langRadios = document.getElementsByName('lang_setting');
        langRadios.forEach(r => {
            if (r.value === (settings.language || 'id')) r.checked = true;
        });
        
        const themeRadios = document.getElementsByName('theme_setting');
        themeRadios.forEach(r => {
            if (r.value === (settings.theme || 'system')) r.checked = true;
        });
        
        document.getElementById('modal-settings').classList.add('active');
    },

    closeSettingsModal: function () {
        document.getElementById('modal-settings').classList.remove('active');
    },

    saveSettings: function () {
        let selectedLang = 'id';
        const langRadios = document.getElementsByName('lang_setting');
        langRadios.forEach(r => { if (r.checked) selectedLang = r.value; });

        let selectedTheme = 'system';
        const themeRadios = document.getElementsByName('theme_setting');
        themeRadios.forEach(r => { if (r.checked) selectedTheme = r.value; });

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
        const newSemester = document.getElementById('prof-sem').value;
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
    }
};
