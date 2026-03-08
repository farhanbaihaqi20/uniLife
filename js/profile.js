const profileManager = {
    profile: {},

    init: function () {
        this.profile = Storage.getProfile();
        this.renderProfileSummary();
        this.setupTrigger();
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
            } else {
                t.innerHTML = initial;
                t.style.backgroundImage = 'none';
            }
        });

        // Update Profile Dashboard View
        const dashPhoto = document.getElementById('prof-dash-photo');
        if (dashPhoto) {
            if (photoUrl) {
                dashPhoto.innerHTML = '';
                dashPhoto.style.backgroundImage = `url(${photoUrl})`;
            } else {
                dashPhoto.innerHTML = initial;
                dashPhoto.style.backgroundImage = 'none';
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
        // Load language preference if any
        const settings = Storage.getSettings ? Storage.getSettings() : { language: 'id' };
        const radios = document.getElementsByName('lang_setting');
        radios.forEach(r => {
            if (r.value === (settings.language || 'id')) r.checked = true;
        });
        document.getElementById('modal-settings').classList.add('active');
    },

    closeSettingsModal: function () {
        document.getElementById('modal-settings').classList.remove('active');
    },

    saveSettings: function () {
        let selectedLang = 'id';
        const radios = document.getElementsByName('lang_setting');
        radios.forEach(r => { if (r.checked) selectedLang = r.value; });

        let settings = Storage.getSettings ? Storage.getSettings() : {};
        const oldLang = settings.language || 'id';

        settings.language = selectedLang;
        if (Storage.setSettings) Storage.setSettings(settings);

        this.closeSettingsModal();

        if (oldLang !== selectedLang) {
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
        if (this.profile.photoBase64) {
            preview.innerHTML = '';
            preview.style.backgroundImage = `url(${this.profile.photoBase64})`;
        } else {
            preview.innerHTML = '<i class="ph ph-user"></i>';
            preview.style.backgroundImage = 'none';
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
        };
        reader.readAsDataURL(file);
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
