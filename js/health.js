const healthManager = {
    sleepLogs: [],
    hydrationLogs: [],
    hydrationSettings: { targetMl: 2000, cupMl: 250 },
    initialized: false,
    moreActionsBound: false,
    targetMinutes: 8 * 60,
    idealThresholdMinutes: 7 * 60 + 30,

    init: function () {
        if (this.initialized) return;

        this.sleepLogs = this.normalizeSleepLogs(
            Storage.getHealthSleepLogs ? Storage.getHealthSleepLogs() : []
        );
        this.hydrationLogs = this.normalizeHydrationLogs(
            Storage.getHealthHydrationLogs ? Storage.getHealthHydrationLogs() : []
        );
        this.hydrationSettings = this.normalizeHydrationSettings(
            Storage.getHealthHydrationSettings ? Storage.getHealthHydrationSettings() : {}
        );

        this.saveSleepLogs(true);
        this.saveHydrationLogs(true);
        this.saveHydrationSettings(true);
        this.bindModalPreview();
        this.bindMoreActionsEvents();
        this.render();
        this.initialized = true;
    },

    bindModalPreview: function () {
        ['health-sleep-time', 'health-wake-time'].forEach((id) => {
            const input = document.getElementById(id);
            if (!input || input.dataset.healthBound === '1') return;
            input.addEventListener('input', () => this.updateLivePreview());
            input.dataset.healthBound = '1';
        });
    },

    bindMoreActionsEvents: function () {
        if (this.moreActionsBound) return;

        document.addEventListener('click', (event) => {
            const wrapper = document.getElementById('health-more-wrapper');
            if (!wrapper || !wrapper.contains(event.target)) {
                this.closeMoreActions();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') this.closeMoreActions();
        });

        document.addEventListener('scroll', () => {
            const menu = document.getElementById('health-more-menu');
            if (!menu || !menu.classList.contains('is-open')) return;
            this.closeMoreActions();
        }, true);

        this.moreActionsBound = true;
    },

    toggleMoreActions: function (event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const menu = document.getElementById('health-more-menu');
        const toggle = document.getElementById('health-more-toggle');
        const wrapper = document.getElementById('health-more-wrapper');
        if (!menu || !toggle || !wrapper) return;

        const isOpen = menu.classList.contains('is-open');
        if (isOpen) {
            this.closeMoreActions();
            return;
        }

        wrapper.classList.add('is-open');
        menu.classList.add('is-open');
        menu.setAttribute('aria-hidden', 'false');
        toggle.setAttribute('aria-expanded', 'true');
    },

    closeMoreActions: function () {
        const menu = document.getElementById('health-more-menu');
        const toggle = document.getElementById('health-more-toggle');
        const wrapper = document.getElementById('health-more-wrapper');
        if (!menu || !toggle || !wrapper) return;

        wrapper.classList.remove('is-open');
        menu.classList.remove('is-open');
        menu.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-expanded', 'false');
    },

    render: function () {
        this.renderHero();
        this.renderStats();
        this.renderHydration();
        this.renderWeekStrip();
        this.renderInsights();
        this.renderHistory();
    },

    normalizeSleepLogs: function (logs) {
        return (Array.isArray(logs) ? logs : [])
            .map((entry) => this.normalizeSleepEntry(entry))
            .filter(Boolean)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    normalizeSleepEntry: function (entry) {
        if (!entry || !entry.date || !entry.sleepTime || !entry.wakeTime) return null;

        return {
            id: entry.id || ((typeof uuidv4 === 'function') ? uuidv4() : Date.now().toString()),
            date: entry.date,
            sleepTime: entry.sleepTime,
            wakeTime: entry.wakeTime,
            quality: Math.max(1, Math.min(5, Number(entry.quality) || 3)),
            note: String(entry.note || '').trim(),
            durationMinutes: this.calculateSleepDuration(entry.sleepTime, entry.wakeTime),
            createdAt: entry.createdAt || new Date().toISOString(),
            updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString()
        };
    },

    saveSleepLogs: function (silent = false) {
        this.sleepLogs = this.normalizeSleepLogs(this.sleepLogs);
        if (Storage.setHealthSleepLogs) Storage.setHealthSleepLogs(this.sleepLogs);
        if (!silent) this.render();
    },

    normalizeHydrationLogs: function (logs) {
        return (Array.isArray(logs) ? logs : [])
            .map((entry) => this.normalizeHydrationEntry(entry))
            .filter(Boolean)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    normalizeHydrationEntry: function (entry) {
        if (!entry || !entry.date) return null;

        return {
            date: entry.date,
            totalMl: Math.max(0, Number(entry.totalMl) || 0),
            updatedAt: entry.updatedAt || new Date().toISOString()
        };
    },

    normalizeHydrationSettings: function (settings) {
        const targetMl = Math.max(250, Math.min(6000, Number(settings?.targetMl) || 2000));
        const cupMl = Math.max(100, Math.min(1500, Number(settings?.cupMl) || 250));
        return { targetMl, cupMl };
    },

    saveHydrationLogs: function (silent = false) {
        this.hydrationLogs = this.normalizeHydrationLogs(this.hydrationLogs);
        if (Storage.setHealthHydrationLogs) Storage.setHealthHydrationLogs(this.hydrationLogs);
        if (!silent) this.render();
    },

    saveHydrationSettings: function (eventOrSilent) {
        const isSilent = eventOrSilent === true;
        if (eventOrSilent && typeof eventOrSilent.preventDefault === 'function') {
            eventOrSilent.preventDefault();
        }

        if (!isSilent) {
            const targetInput = document.getElementById('health-hydration-target-input');
            const cupInput = document.getElementById('health-hydration-cup-input');
            this.hydrationSettings = this.normalizeHydrationSettings({
                targetMl: targetInput?.value,
                cupMl: cupInput?.value
            });
        } else {
            this.hydrationSettings = this.normalizeHydrationSettings(this.hydrationSettings);
        }

        if (Storage.setHealthHydrationSettings) {
            Storage.setHealthHydrationSettings(this.hydrationSettings);
        }

        if (!isSilent) {
            this.closeHydrationModal();
            this.render();
            if (typeof inboxManager !== 'undefined') inboxManager.showToast('Setting hydration disimpan');
        }
    },

    renderHero: function () {
        const latest = this.sleepLogs[0];
        const durationEl = document.getElementById('health-latest-duration');
        const metaEl = document.getElementById('health-latest-meta');
        const statusEl = document.getElementById('health-latest-status');
        const windowEl = document.getElementById('health-latest-window');
        const qualityEl = document.getElementById('health-latest-quality');

        if (!durationEl || !metaEl || !statusEl || !windowEl || !qualityEl) return;

        if (!latest) {
            durationEl.textContent = 'Belum ada log';
            metaEl.textContent = 'Mulai catat tidur supaya ritmenya kebaca.';
            statusEl.textContent = 'Belum ada data';
            statusEl.className = 'health-status-pill is-empty';
            windowEl.textContent = '-';
            qualityEl.textContent = '-';
            return;
        }

        const status = this.getSleepStatus(latest.durationMinutes);
        durationEl.textContent = this.formatDuration(latest.durationMinutes);
        metaEl.textContent = `${this.formatDateLabel(latest.date)} - ${status.copy}`;
        statusEl.textContent = status.label;
        statusEl.className = `health-status-pill ${status.className}`;
        windowEl.textContent = `${latest.sleepTime} - ${latest.wakeTime}`;
        qualityEl.textContent = this.getQualityLabel(latest.quality);
    },

    renderStats: function () {
        const weeklyEntries = this.getRecentSleepEntries(7);
        const avgEl = document.getElementById('health-avg-seven');
        const avgNoteEl = document.getElementById('health-avg-note');
        const streakEl = document.getElementById('health-streak-value');
        const debtEl = document.getElementById('health-debt-value');
        const debtNoteEl = document.getElementById('health-debt-note');

        if (!avgEl || !avgNoteEl || !streakEl || !debtEl || !debtNoteEl) return;

        if (!weeklyEntries.length) {
            avgEl.textContent = '-';
            avgNoteEl.textContent = 'Belum ada data mingguan.';
        } else {
            const avg = Math.round(
                weeklyEntries.reduce((sum, entry) => sum + entry.durationMinutes, 0) / weeklyEntries.length
            );
            avgEl.textContent = this.formatDuration(avg);
            avgNoteEl.textContent = avg >= this.idealThresholdMinutes
                ? 'Rata-rata kamu sudah masuk zona ideal.'
                : `Masih kurang ${this.formatDuration(this.idealThresholdMinutes - avg)} dari zona ideal.`;
        }

        streakEl.textContent = `${this.getIdealStreak()} hari`;

        const debt = this.getWeeklySleepDebt();
        debtEl.textContent = debt > 0 ? this.formatDuration(debt) : '0 menit';
        debtNoteEl.textContent = debt > 0
            ? `Perlu balikin sekitar ${this.formatDuration(debt)} untuk menutup target minggu ini.`
            : 'Minggu ini masih aman dan stabil.';
    },

    renderHydration: function () {
        const todayEntry = this.getTodayHydrationEntry();
        const percent = this.getHydrationProgressPercent(todayEntry.totalMl);
        const percentEl = document.getElementById('health-hydration-percent');
        const totalEl = document.getElementById('health-hydration-total');
        const targetEl = document.getElementById('health-hydration-target');
        const streakEl = document.getElementById('health-hydration-streak');
        const averageEl = document.getElementById('health-hydration-average');
        const statusEl = document.getElementById('health-hydration-status');
        const progressRing = document.querySelector('.health-hydration-progress-ring');

        if (percentEl) percentEl.textContent = `${percent}%`;
        if (totalEl) totalEl.textContent = `${this.formatMilliliters(todayEntry.totalMl)} / ${this.formatMilliliters(this.hydrationSettings.targetMl)}`;
        if (targetEl) targetEl.textContent = this.formatMilliliters(this.hydrationSettings.targetMl);
        if (streakEl) streakEl.textContent = `${this.getHydrationStreak()} hari`;
        if (averageEl) averageEl.textContent = this.formatMilliliters(this.getHydrationAverage(7));
        if (statusEl) statusEl.textContent = this.getHydrationStatusCopy(todayEntry.totalMl);
        if (progressRing) progressRing.style.setProperty('--hydration-progress', `${percent}%`);

        this.renderHydrationQuickButtons();
    },

    renderHydrationQuickButtons: function () {
        const cupMl = this.hydrationSettings.cupMl;
        const configs = {
            sip: {
                amount: Math.max(100, Math.round(cupMl * 0.6 / 50) * 50),
                title: 'Sip cepat'
            },
            cup: {
                amount: cupMl,
                title: '1 gelas'
            },
            bottle: {
                amount: Math.max(350, Math.round(cupMl * 2 / 50) * 50),
                title: 'Botol kecil'
            }
        };

        const elements = {
            sip: document.getElementById('health-hydration-quick-sip'),
            cup: document.getElementById('health-hydration-quick-cup'),
            bottle: document.getElementById('health-hydration-quick-bottle')
        };

        Object.keys(elements).forEach((key) => {
            const button = elements[key];
            const config = configs[key];
            if (!button || !config) return;

            button.dataset.amount = String(config.amount);
            const strong = button.querySelector('strong');
            const span = button.querySelector('span');
            if (strong) strong.textContent = `+${config.amount} ml`;
            if (span) span.textContent = config.title;
        });

        const undoLabel = document.getElementById('health-hydration-undo-label');
        if (undoLabel) undoLabel.textContent = `Undo ${cupMl}`;
    },

    addHydrationQuick: function (type) {
        const cupMl = this.hydrationSettings.cupMl;
        const amounts = {
            sip: Math.max(100, Math.round(cupMl * 0.6 / 50) * 50),
            cup: cupMl,
            bottle: Math.max(350, Math.round(cupMl * 2 / 50) * 50)
        };

        this.addHydrationIntake(amounts[type] || cupMl);
    },

    undoHydrationQuick: function () {
        this.addHydrationIntake(-this.hydrationSettings.cupMl);
    },

    addHydrationIntake: function (deltaMl) {
        const todayKey = this.getTodayKey();
        const current = this.getHydrationEntryByDate(todayKey);
        const nextTotal = Math.max(0, (current?.totalMl || 0) + (Number(deltaMl) || 0));

        if (current) {
            current.totalMl = nextTotal;
            current.updatedAt = new Date().toISOString();
        } else {
            this.hydrationLogs.push({
                date: todayKey,
                totalMl: nextTotal,
                updatedAt: new Date().toISOString()
            });
        }

        this.saveHydrationLogs();
        if (typeof inboxManager !== 'undefined') {
            const copy = deltaMl >= 0 ? `+${deltaMl} ml tercatat` : `-${Math.abs(deltaMl)} ml dibatalkan`;
            inboxManager.showToast(copy);
        }
    },

    resetTodayHydration: function () {
        if (!confirm('Reset hidrasi hari ini?')) return;
        const todayKey = this.getTodayKey();
        this.hydrationLogs = this.hydrationLogs.filter((entry) => entry.date !== todayKey);
        this.saveHydrationLogs();
        if (typeof inboxManager !== 'undefined') inboxManager.showToast('Hydration hari ini di-reset');
    },

    resetSleepData: function () {
        if (!confirm('Reset semua data sleep?')) return;

        this.sleepLogs = [];
        if (Storage.setHealthSleepLogs) Storage.setHealthSleepLogs([]);
        this.closeMoreActions();
        this.closeSleepModal();
        this.render();

        if (typeof inboxManager !== 'undefined') {
            inboxManager.showToast('Data sleep berhasil di-reset');
        }
    },

    resetHydrationData: function () {
        if (!confirm('Reset semua data hydration?')) return;

        this.hydrationLogs = [];
        this.hydrationSettings = this.normalizeHydrationSettings({});
        if (Storage.setHealthHydrationLogs) Storage.setHealthHydrationLogs([]);
        if (Storage.setHealthHydrationSettings) Storage.setHealthHydrationSettings(this.hydrationSettings);
        this.closeMoreActions();
        this.closeHydrationModal();
        this.render();

        if (typeof inboxManager !== 'undefined') {
            inboxManager.showToast('Data hydration berhasil di-reset');
        }
    },

    resetAllHealthData: function () {
        const confirmed = confirm('Reset semua data Health? Semua catatan tidur, hidrasi, dan setting hydration akan dihapus.');
        if (!confirmed) return;

        this.sleepLogs = [];
        this.hydrationLogs = [];
        this.hydrationSettings = this.normalizeHydrationSettings({});

        if (Storage.setHealthSleepLogs) Storage.setHealthSleepLogs([]);
        if (Storage.setHealthHydrationLogs) Storage.setHealthHydrationLogs([]);
        if (Storage.setHealthHydrationSettings) Storage.setHealthHydrationSettings(this.hydrationSettings);

        this.closeMoreActions();
        this.closeSleepModal();
        this.closeHydrationModal();
        this.render();

        if (typeof inboxManager !== 'undefined') {
            inboxManager.showToast('Semua data Health berhasil di-reset');
        }
    },

    openHydrationModal: function () {
        const modal = document.getElementById('modal-health-hydration');
        const targetInput = document.getElementById('health-hydration-target-input');
        const cupInput = document.getElementById('health-hydration-cup-input');
        if (!modal || !targetInput || !cupInput) return;

        targetInput.value = String(this.hydrationSettings.targetMl);
        cupInput.value = String(this.hydrationSettings.cupMl);
        modal.classList.add('active');
    },

    closeHydrationModal: function () {
        const modal = document.getElementById('modal-health-hydration');
        if (modal) modal.classList.remove('active');
    },

    applyHydrationPreset: function (targetMl, cupMl) {
        const targetInput = document.getElementById('health-hydration-target-input');
        const cupInput = document.getElementById('health-hydration-cup-input');
        if (targetInput) targetInput.value = String(targetMl);
        if (cupInput) cupInput.value = String(cupMl);
    },

    getHydrationEntryByDate: function (dateKey) {
        return this.hydrationLogs.find((entry) => entry.date === dateKey) || null;
    },

    getTodayHydrationEntry: function () {
        return this.getHydrationEntryByDate(this.getTodayKey()) || {
            date: this.getTodayKey(),
            totalMl: 0,
            updatedAt: null
        };
    },

    getHydrationProgressPercent: function (totalMl) {
        const target = Math.max(1, this.hydrationSettings.targetMl);
        return Math.max(0, Math.min(100, Math.round((Number(totalMl) || 0) / target * 100)));
    },

    getHydrationAverage: function (days) {
        const entries = this.getRecentHydrationEntries(days);
        if (!entries.length) return 0;
        return Math.round(entries.reduce((sum, entry) => sum + entry.totalMl, 0) / entries.length);
    },

    getHydrationStreak: function () {
        let streak = 0;
        const sorted = this.normalizeHydrationLogs(this.hydrationLogs);
        for (const entry of sorted) {
            if (entry.totalMl >= this.hydrationSettings.targetMl) streak += 1;
            else break;
        }
        return streak;
    },

    getRecentHydrationEntries: function (days) {
        const today = new Date();
        const floorToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const startDate = new Date(floorToday);
        startDate.setDate(startDate.getDate() - (days - 1));

        const entries = [];
        for (let index = 0; index < days; index += 1) {
            const current = new Date(startDate);
            current.setDate(startDate.getDate() + index);
            const key = this.toDateKey(current);
            const existing = this.getHydrationEntryByDate(key);
            entries.push(existing || { date: key, totalMl: 0, updatedAt: null });
        }
        return entries;
    },

    getHydrationStatusCopy: function (totalMl) {
        const target = this.hydrationSettings.targetMl;
        if (totalMl >= target) return 'Target hidrasi hari ini sudah terpenuhi. Nice.';
        if (totalMl >= target * 0.7) return `Tinggal ${this.formatMilliliters(target - totalMl)} lagi menuju target.`;
        if (totalMl > 0) return `Baru ${this.formatMilliliters(totalMl)} hari ini, masih bisa dikejar pelan-pelan.`;
        return 'Mulai log air minum hari ini.';
    },

    renderWeekStrip: function () {
        const container = document.getElementById('health-week-strip');
        if (!container) return;

        const entries = this.getRecentSleepEntries(7).reverse();
        if (!entries.length) {
            container.innerHTML = `
                <div class="health-empty-state">
                    <i class="ph ph-moon-stars"></i>
                    <p>Belum ada trend tidur.</p>
                </div>
            `;
            return;
        }

        const maxMinutes = Math.max(this.targetMinutes, ...entries.map((entry) => entry.durationMinutes));
        container.innerHTML = entries.map((entry) => {
            const ratio = Math.max(20, Math.min(100, Math.round((entry.durationMinutes / maxMinutes) * 100)));
            const status = this.getSleepStatus(entry.durationMinutes);
            const weekday = new Date(`${entry.date}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'short' });
            return `
                <div class="health-week-bar-card ${status.className}">
                    <div class="health-week-bar-top">
                        <span>${weekday}</span>
                        <strong>${this.formatDurationShort(entry.durationMinutes)}</strong>
                    </div>
                    <div class="health-week-bar-track">
                        <div class="health-week-bar-fill" style="--health-bar-ratio:${ratio}%"></div>
                    </div>
                    <small>${entry.sleepTime}</small>
                </div>
            `;
        }).join('');
    },

    renderInsights: function () {
        const container = document.getElementById('health-insight-list');
        if (!container) return;

        const insights = this.buildInsights();
        container.innerHTML = insights.map((item) => `
            <div class="health-insight-item">
                <div class="health-insight-icon"><i class="${item.icon}"></i></div>
                <div>
                    <strong>${item.title}</strong>
                    <p>${item.copy}</p>
                </div>
            </div>
        `).join('');
    },

    renderHistory: function () {
        const container = document.getElementById('health-history-list');
        if (!container) return;

        if (!this.sleepLogs.length) {
            container.innerHTML = `
                <div class="health-empty-state health-empty-history">
                    <i class="ph ph-bed"></i>
                    <p>Belum ada riwayat tidur.</p>
                    <small>Mulai dari catatan sederhana: jam tidur, bangun, lalu biarkan sistem hitung sisanya.</small>
                </div>
            `;
            return;
        }

        container.innerHTML = this.sleepLogs.map((entry) => {
            const status = this.getSleepStatus(entry.durationMinutes);
            return `
                <button type="button" class="health-history-item" onclick="healthManager.openSleepModal('${entry.id}')">
                    <div class="health-history-main">
                        <div class="health-history-top">
                            <div>
                                <strong>${this.formatDateLabel(entry.date)}</strong>
                                <span>${entry.sleepTime} - ${entry.wakeTime}</span>
                            </div>
                            <div class="health-history-badge ${status.className}">${status.label}</div>
                        </div>
                        <div class="health-history-meta">
                            <span><i class="ph ph-timer"></i> ${this.formatDuration(entry.durationMinutes)}</span>
                            <span><i class="ph ph-sparkle"></i> ${this.getQualityLabel(entry.quality)}</span>
                        </div>
                        ${entry.note ? `<p class="health-history-note">${this.escapeHtml(entry.note)}</p>` : ''}
                    </div>
                    <div class="health-history-chevron">
                        <i class="ph ph-caret-right"></i>
                    </div>
                </button>
            `;
        }).join('');
    },

    buildInsights: function () {
        const insights = [];

        if (this.sleepLogs.length) {
            const latest = this.sleepLogs[0];
            const latestStatus = this.getSleepStatus(latest.durationMinutes);
            insights.push({
                icon: latestStatus.icon,
                title: `Tidur terakhir: ${latestStatus.label}`,
                copy: `${this.formatDuration(latest.durationMinutes)} pada ${this.formatDateLabel(latest.date)}. ${latestStatus.copy}`
            });
        }

        const hydrationToday = this.getTodayHydrationEntry();
        const hydrationPercent = this.getHydrationProgressPercent(hydrationToday.totalMl);
        insights.push({
            icon: hydrationPercent >= 100 ? 'ph ph-drop' : 'ph ph-cup',
            title: hydrationPercent >= 100 ? 'Hydration hari ini aman' : 'Hydration masih bisa dikejar',
            copy: hydrationPercent >= 100
                ? `Kamu sudah mencapai ${this.formatMilliliters(hydrationToday.totalMl)} hari ini.`
                : `Sekarang baru ${this.formatMilliliters(hydrationToday.totalMl)} dari target ${this.formatMilliliters(this.hydrationSettings.targetMl)}.`
        });

        if (this.sleepLogs.length) {
            const avg = this.getAverageSleep(7);
            if (avg > 0) {
                insights.push({
                    icon: avg >= this.idealThresholdMinutes ? 'ph ph-trend-up' : 'ph ph-trend-down',
                    title: 'Rata-rata mingguan',
                    copy: avg >= this.idealThresholdMinutes
                        ? `Kamu stabil di ${this.formatDuration(avg)}. Ini ritme yang bagus buat dipertahankan.`
                        : `Rata-ratamu ${this.formatDuration(avg)}. Coba majukan jam tidur 20-30 menit.`
                });
            }
        } else {
            insights.push({
                icon: 'ph ph-moon-stars',
                title: 'Mulai dari 1 minggu dulu',
                copy: 'Begitu ada beberapa log, modul ini akan kasih gambaran ritme tidur dan hidrasi otomatis.'
            });
        }

        return insights.slice(0, 3);
    },

    openSleepModal: function (id) {
        const modal = document.getElementById('modal-health-sleep');
        const form = document.getElementById('form-health-sleep');
        const deleteBtn = document.getElementById('health-delete-btn');
        const title = document.getElementById('health-modal-title');

        if (!modal || !form || !deleteBtn || !title) return;

        form.reset();
        document.getElementById('health-sleep-id').value = '';
        document.getElementById('health-sleep-quality').value = '4';

        const entry = id ? this.sleepLogs.find((item) => item.id === id) : null;
        if (entry) {
            title.textContent = 'Edit Catatan Tidur';
            document.getElementById('health-sleep-id').value = entry.id;
            document.getElementById('health-sleep-date').value = entry.date;
            document.getElementById('health-sleep-time').value = entry.sleepTime;
            document.getElementById('health-wake-time').value = entry.wakeTime;
            document.getElementById('health-sleep-quality').value = String(entry.quality);
            document.getElementById('health-sleep-note').value = entry.note || '';
            deleteBtn.style.display = 'inline-flex';
        } else {
            title.textContent = 'Catat Tidur';
            document.getElementById('health-sleep-date').value = this.getDefaultSleepDate();
            document.getElementById('health-sleep-time').value = '23:30';
            document.getElementById('health-wake-time').value = '06:30';
            deleteBtn.style.display = 'none';
        }

        this.updateLivePreview();
        modal.classList.add('active');
        setTimeout(() => {
            const targetInput = document.getElementById('health-sleep-time');
            if (targetInput) targetInput.focus();
        }, 90);
    },

    closeSleepModal: function () {
        const modal = document.getElementById('modal-health-sleep');
        if (modal) modal.classList.remove('active');
    },

    updateLivePreview: function () {
        const sleepTime = document.getElementById('health-sleep-time')?.value || '';
        const wakeTime = document.getElementById('health-wake-time')?.value || '';
        const durationEl = document.getElementById('health-live-duration');
        const statusEl = document.getElementById('health-live-status');
        if (!durationEl || !statusEl) return;

        if (!sleepTime || !wakeTime) {
            durationEl.textContent = '-';
            statusEl.textContent = 'Isi jam dulu';
            statusEl.className = 'health-live-status';
            return;
        }

        const minutes = this.calculateSleepDuration(sleepTime, wakeTime);
        if (!this.isReasonableDuration(minutes)) {
            durationEl.textContent = this.formatDuration(minutes);
            statusEl.textContent = 'Cek lagi jamnya';
            statusEl.className = 'health-live-status is-low';
            return;
        }

        const status = this.getSleepStatus(minutes);
        durationEl.textContent = this.formatDuration(minutes);
        statusEl.textContent = status.label;
        statusEl.className = `health-live-status ${status.className}`;
    },

    saveSleepEntry: function (event) {
        event.preventDefault();

        const id = document.getElementById('health-sleep-id').value;
        const date = document.getElementById('health-sleep-date').value;
        const sleepTime = document.getElementById('health-sleep-time').value;
        const wakeTime = document.getElementById('health-wake-time').value;
        const quality = Number(document.getElementById('health-sleep-quality').value || 3);
        const note = document.getElementById('health-sleep-note').value.trim();

        if (!date || !sleepTime || !wakeTime) {
            if (typeof inboxManager !== 'undefined') inboxManager.showToast('Tanggal dan jam tidur wajib diisi');
            return;
        }

        const existingEntry = id ? this.sleepLogs.find((item) => item.id === id) : null;
        const normalizedEntry = this.normalizeSleepEntry({
            id: id || ((typeof uuidv4 === 'function') ? uuidv4() : Date.now().toString()),
            date,
            sleepTime,
            wakeTime,
            quality,
            note,
            createdAt: existingEntry?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        if (!normalizedEntry) return;
        if (!this.isReasonableDuration(normalizedEntry.durationMinutes)) {
            if (typeof inboxManager !== 'undefined') {
                inboxManager.showToast('Durasi tidur terasa tidak wajar, cek lagi jamnya');
            }
            return;
        }

        const existingIndex = this.sleepLogs.findIndex((item) => item.id === normalizedEntry.id);
        if (existingIndex > -1) this.sleepLogs[existingIndex] = normalizedEntry;
        else this.sleepLogs.push(normalizedEntry);

        this.saveSleepLogs();
        this.closeSleepModal();
        if (typeof inboxManager !== 'undefined') {
            inboxManager.showToast(existingIndex > -1 ? 'Catatan tidur diperbarui' : 'Catatan tidur disimpan');
        }
    },

    deleteSleepEntry: function () {
        const id = document.getElementById('health-sleep-id')?.value;
        if (!id) return;
        if (!confirm('Hapus catatan tidur ini?')) return;

        this.sleepLogs = this.sleepLogs.filter((item) => item.id !== id);
        this.saveSleepLogs();
        this.closeSleepModal();
        if (typeof inboxManager !== 'undefined') inboxManager.showToast('Catatan tidur dihapus');
    },

    calculateSleepDuration: function (sleepTime, wakeTime) {
        const [sleepHour, sleepMinute] = String(sleepTime || '00:00').split(':').map(Number);
        const [wakeHour, wakeMinute] = String(wakeTime || '00:00').split(':').map(Number);
        let sleepTotal = (sleepHour * 60) + sleepMinute;
        let wakeTotal = (wakeHour * 60) + wakeMinute;

        if (wakeTotal <= sleepTotal) wakeTotal += 24 * 60;
        return Math.max(0, wakeTotal - sleepTotal);
    },

    isReasonableDuration: function (minutes) {
        return minutes >= 30 && minutes <= 16 * 60;
    },

    getAverageSleep: function (days) {
        const entries = this.getRecentSleepEntries(days);
        if (!entries.length) return 0;
        return Math.round(entries.reduce((sum, entry) => sum + entry.durationMinutes, 0) / entries.length);
    },

    getRecentSleepEntries: function (days) {
        const today = new Date();
        const floorToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const startDate = new Date(floorToday);
        startDate.setDate(startDate.getDate() - (days - 1));

        return this.sleepLogs.filter((entry) => {
            const entryDate = new Date(`${entry.date}T00:00:00`);
            return entryDate >= startDate && entryDate <= floorToday;
        });
    },

    getIdealStreak: function () {
        let streak = 0;
        for (const entry of this.sleepLogs) {
            if (entry.durationMinutes >= this.idealThresholdMinutes) streak += 1;
            else break;
        }
        return streak;
    },

    getWeeklySleepDebt: function () {
        const entries = this.getRecentSleepEntries(7);
        if (!entries.length) return 0;

        return entries.reduce((sum, entry) => {
            return sum + Math.max(0, this.targetMinutes - entry.durationMinutes);
        }, 0);
    },

    getSleepStatus: function (minutes) {
        if (minutes >= this.idealThresholdMinutes) {
            return {
                label: 'Ideal',
                className: 'is-ideal',
                icon: 'ph ph-moon-stars',
                copy: 'Durasi tidurmu sudah masuk ritme yang sehat.'
            };
        }

        if (minutes >= 6 * 60) {
            return {
                label: 'Lumayan',
                className: 'is-okay',
                icon: 'ph ph-moon',
                copy: 'Sudah lumayan, tapi masih ada ruang buat tidur lebih stabil.'
            };
        }

        return {
            label: 'Kurang',
            className: 'is-low',
            icon: 'ph ph-warning-circle',
            copy: 'Tidurmu masih terlalu pendek untuk recovery yang optimal.'
        };
    },

    getQualityLabel: function (quality) {
        const labels = {
            5: '5/5 - Nyenyak banget',
            4: '4/5 - Enak dan cukup',
            3: '3/5 - Lumayan',
            2: '2/5 - Kurang nyaman',
            1: '1/5 - Berat'
        };
        return labels[quality] || '3/5 - Lumayan';
    },

    formatDuration: function (minutes) {
        const safeMinutes = Math.max(0, Number(minutes) || 0);
        const hours = Math.floor(safeMinutes / 60);
        const remainder = safeMinutes % 60;

        if (!hours) return `${remainder} menit`;
        if (!remainder) return `${hours} jam`;
        return `${hours} jam ${remainder} menit`;
    },

    formatDurationShort: function (minutes) {
        const safeMinutes = Math.max(0, Number(minutes) || 0);
        const hours = Math.floor(safeMinutes / 60);
        const remainder = safeMinutes % 60;
        return `${hours}j ${String(remainder).padStart(2, '0')}m`;
    },

    formatDateLabel: function (dateString) {
        const date = new Date(`${dateString}T00:00:00`);
        return date.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'short'
        });
    },

    formatMilliliters: function (value) {
        return `${Math.max(0, Number(value) || 0).toLocaleString('id-ID')} ml`;
    },

    getDefaultSleepDate: function () {
        const now = new Date();
        if (now.getHours() < 12) now.setDate(now.getDate() - 1);
        return this.toDateKey(now);
    },

    getTodayKey: function () {
        return this.toDateKey(new Date());
    },

    toDateKey: function (date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    },

    escapeHtml: function (text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
};

window.healthManager = healthManager;
