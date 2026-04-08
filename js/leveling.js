const levelingManager = {
    state: {
        version: 1,
        totalXp: 0,
        grantedActionIds: [],
        history: []
    },

    previousLevel: 1,
    historyFilter: 'all',
    modalDismissTimer: null,
    currentThemeClass: '',
    tierTransitionTimer: null,

    init: function () {
        this.state = this.sanitizeState(Storage.getLeveling ? Storage.getLeveling() : null);
        this.previousLevel = this.getProgress().level;
        this.ensureLevelUpModal();
        this.bindHistoryFilterEvents();
        this.grantDailyLoginBonus();
        this.refreshUI({ initial: true });
    },

    sanitizeState: function (raw) {
        const safe = raw && typeof raw === 'object' ? raw : {};
        const totalXp = Number(safe.totalXp);
        const granted = Array.isArray(safe.grantedActionIds) ? safe.grantedActionIds.filter(Boolean).map(String) : [];
        const history = Array.isArray(safe.history)
            ? safe.history
                .filter(item => item && typeof item === 'object')
                .map(item => ({
                    id: String(item.id || ''),
                    label: String(item.label || ''),
                    category: String(item.category || 'other'),
                    xp: Math.max(0, Number(item.xp) || 0),
                    timestamp: String(item.timestamp || '')
                }))
                .filter(item => item.id && item.label && item.xp > 0 && item.timestamp && item.category)
            : [];

        return {
            version: 1,
            totalXp: Number.isFinite(totalXp) && totalXp > 0 ? Math.floor(totalXp) : 0,
            grantedActionIds: granted.slice(-800),
            history: history.slice(0, 120)
        };
    },

    persistState: function () {
        if (Storage.setLeveling) Storage.setLeveling(this.state);
    },

    getXpRequiredForLevel: function (level) {
        if (level <= 1) return 0;
        const base = 90;
        const growth = 1.2;
        let total = 0;
        for (let lv = 1; lv < level; lv++) {
            total += Math.floor(base * Math.pow(growth, lv - 1));
        }
        return total;
    },

    getProgress: function () {
        const xp = Math.max(0, Number(this.state.totalXp) || 0);
        let level = 1;

        for (let lv = 2; lv <= 200; lv++) {
            if (xp >= this.getXpRequiredForLevel(lv)) {
                level = lv;
            } else {
                break;
            }
        }

        const currentLevelXp = this.getXpRequiredForLevel(level);
        const nextLevelXp = this.getXpRequiredForLevel(level + 1);
        const xpIntoLevel = xp - currentLevelXp;
        const xpRange = Math.max(1, nextLevelXp - currentLevelXp);
        const progress = Math.max(0, Math.min(1, xpIntoLevel / xpRange));

        return {
            level,
            totalXp: xp,
            currentLevelXp,
            nextLevelXp,
            xpIntoLevel,
            xpNeeded: Math.max(0, nextLevelXp - xp),
            progress
        };
    },

    getLevelMeta: function (level) {
        if (level >= 16) return { name: 'Dekan Muda', badge: 'Dekan', borderClass: 'level-border--legendary', themeClass: 'level-theme--dekan' };
        if (level >= 12) return { name: 'Asisten Riset', badge: 'Asris', borderClass: 'level-border--diamond', themeClass: 'level-theme--asisten' };
        if (level >= 8) return { name: 'Ketua Angkatan', badge: 'Ketua', borderClass: 'level-border--platinum', themeClass: 'level-theme--ketua' };
        if (level >= 5) return { name: 'Aktivis Kampus', badge: 'Aktif', borderClass: 'level-border--gold', themeClass: 'level-theme--aktivis' };
        return { name: 'Mahasiswa Baru', badge: 'Maba', borderClass: 'level-border--silver', themeClass: 'level-theme--maba' };
    },

    getPerkDefinitions: function () {
        return [
            {
                id: 'avatar-frame',
                title: 'Avatar Frame Premium',
                unlockLevel: 1,
                icon: 'ph-user-circle',
                desc: 'Bingkai avatar naik kualitas tiap tier level.'
            },
            {
                id: 'name-badge',
                title: 'Badge Gelar Kampus',
                unlockLevel: 5,
                icon: 'ph-seal-check',
                desc: 'Nama profil menampilkan badge gelar sesuai level.'
            },
            {
                id: 'profile-theme',
                title: 'Tema Dashboard Eksklusif',
                unlockLevel: 8,
                icon: 'ph-palette',
                desc: 'Kartu progres level berubah warna sesuai tier.'
            },
            {
                id: 'elite-aura',
                title: 'Aura Elite Dekanat',
                unlockLevel: 12,
                icon: 'ph-sparkle',
                desc: 'Efek visual level-up dan highlight jadi lebih mewah.'
            }
        ];
    },

    toDateKey: function (dateObj = new Date()) {
        const month = `${dateObj.getMonth() + 1}`.padStart(2, '0');
        const day = `${dateObj.getDate()}`.padStart(2, '0');
        return `${dateObj.getFullYear()}-${month}-${day}`;
    },

    getCategoryBySourceId: function (sourceId) {
        const key = String(sourceId || '');
        if (key.startsWith('task.completed:')) return 'task';
        if (key.startsWith('attendance.hadir:')) return 'attendance';
        if (key.startsWith('focus.session:')) return 'focus';
        if (key.startsWith('grade.final:')) return 'grade';
        if (key.startsWith('daily.login:') || key.startsWith('daily.first_activity:')) return 'daily';
        return 'other';
    },

    getHistoryLabelBySourceId: function (sourceId) {
        const key = String(sourceId || '');
        if (key.startsWith('task.completed:')) return 'Menyelesaikan tugas';
        if (key.startsWith('attendance.hadir:')) return 'Hadir kuliah';
        if (key.startsWith('focus.session:')) return 'Sesi fokus selesai';
        if (key.startsWith('grade.final:')) return 'Input nilai akhir';
        if (key.startsWith('daily.login:')) return 'Bonus login harian';
        if (key.startsWith('daily.first_activity:')) return 'Bonus aktivitas pertama';
        return 'Aktivitas akademik';
    },

    addHistoryEntry: function (entry) {
        if (!entry || !entry.id) return;
        this.state.history.unshift(entry);
        if (this.state.history.length > 120) {
            this.state.history = this.state.history.slice(0, 120);
        }
    },

    hasGranted: function (sourceId) {
        return this.state.grantedActionIds.includes(String(sourceId));
    },

    getLevelXpBoost: function (level, category = 'other') {
        const lv = Math.max(1, Number(level) || 1);
        if (lv <= 5) return 1;

        const afterThreshold = lv - 5;
        const perLevelGain = category === 'daily' ? 0.018 : 0.03;
        const maxBoost = category === 'daily' ? 0.45 : 0.9;
        return 1 + Math.min(maxBoost, afterThreshold * perLevelGain);
    },

    normalizeAwardXp: function (baseXp, level, category = 'other') {
        const safeBase = Math.max(1, Number(baseXp) || 1);
        const boost = this.getLevelXpBoost(level, category);
        const levelFlatBonus = level >= 10 ? Math.floor((level - 8) / 4) : 0;
        return Math.max(1, Math.round(safeBase * boost) + levelFlatBonus);
    },

    awardXp: function ({ amount, sourceId, label, category } = {}) {
        try {
            const sourceKey = sourceId ? String(sourceId) : '';
            const xpAmount = Number(amount);

            if (!sourceKey || !Number.isFinite(xpAmount) || xpAmount <= 0) {
                return { awarded: false, reason: 'invalid_payload' };
            }
            if (this.hasGranted(sourceKey)) {
                return { awarded: false, reason: 'duplicate' };
            }

            const entryCategory = category || this.getCategoryBySourceId(sourceKey);
            const currentLevel = this.getProgress().level;
            const scaledAmount = this.normalizeAwardXp(xpAmount, currentLevel, entryCategory);
            const safeAmount = Math.min(320, Math.floor(scaledAmount));
            this.state.totalXp += safeAmount;
            this.state.grantedActionIds.push(sourceKey);
            if (this.state.grantedActionIds.length > 800) {
                this.state.grantedActionIds = this.state.grantedActionIds.slice(-800);
            }

            this.addHistoryEntry({
                id: sourceKey,
                label: label || this.getHistoryLabelBySourceId(sourceKey),
                category: entryCategory,
                xp: safeAmount,
                timestamp: new Date().toISOString()
            });

            this.persistState();

            const progress = this.getProgress();
            if (progress.level > this.previousLevel) {
                this.showLevelUpToast(progress.level, this.getLevelMeta(progress.level));
            }

            if (entryCategory !== 'daily') {
                this.tryGrantFirstActivityBonus(progress.level);
            }

            this.previousLevel = progress.level;
            this.refreshUI();

            return { awarded: true, xp: safeAmount, progress };
        } catch (error) {
            console.warn('leveling awardXp failed', error);
            return { awarded: false, reason: 'exception' };
        }
    },

    grantDirectXp: function ({ amount, sourceId, label, category }) {
        const sourceKey = String(sourceId || '');
        if (!sourceKey || this.hasGranted(sourceKey)) return false;

        const xpAmount = Number(amount);
        if (!Number.isFinite(xpAmount) || xpAmount <= 0) return false;

        const entryCategory = category || this.getCategoryBySourceId(sourceKey);
        const currentLevel = this.getProgress().level;
        const scaledAmount = this.normalizeAwardXp(xpAmount, currentLevel, entryCategory);
        const safeAmount = Math.min(320, Math.floor(scaledAmount));
        this.state.totalXp += safeAmount;
        this.state.grantedActionIds.push(sourceKey);
        if (this.state.grantedActionIds.length > 800) {
            this.state.grantedActionIds = this.state.grantedActionIds.slice(-800);
        }

        this.addHistoryEntry({
            id: sourceKey,
            label: label || this.getHistoryLabelBySourceId(sourceKey),
            category: entryCategory,
            xp: safeAmount,
            timestamp: new Date().toISOString()
        });

        return true;
    },

    grantDailyLoginBonus: function () {
        try {
            const dateKey = this.toDateKey();
            const sourceId = `daily.login:${dateKey}`;
            if (this.hasGranted(sourceId)) return;

            const level = this.getProgress().level;
            const xp = Math.min(12, 4 + Math.floor(level / 4));
            const granted = this.grantDirectXp({
                amount: xp,
                sourceId,
                label: 'Bonus login harian',
                category: 'daily'
            });

            if (!granted) return;
            this.persistState();
            const progress = this.getProgress();
            if (progress.level > this.previousLevel) {
                this.showLevelUpToast(progress.level, this.getLevelMeta(progress.level));
            }
            this.previousLevel = progress.level;
        } catch (error) {
            console.warn('grantDailyLoginBonus failed', error);
        }
    },

    tryGrantFirstActivityBonus: function (levelAtAward = 1) {
        const dateKey = this.toDateKey();
        const sourceId = `daily.first_activity:${dateKey}`;
        if (this.hasGranted(sourceId)) return;

        const xp = Math.min(16, 6 + Math.floor(levelAtAward / 3));
        const granted = this.grantDirectXp({
            amount: xp,
            sourceId,
            label: 'Bonus aktivitas pertama hari ini',
            category: 'daily'
        });

        if (!granted) return;
        this.persistState();

        const progress = this.getProgress();
        if (progress.level > this.previousLevel) {
            this.showLevelUpToast(progress.level, this.getLevelMeta(progress.level));
        }
        this.previousLevel = progress.level;
    },

    ensureLevelUpModal: function () {
        if (document.getElementById('level-up-mini-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'level-up-mini-modal';
        modal.className = 'level-up-mini-modal';
        modal.innerHTML = `
            <div class="level-up-card">
                <div class="level-up-spark level-up-spark-a"></div>
                <div class="level-up-spark level-up-spark-b"></div>
                <div class="level-up-top">
                    <span class="level-up-label">LEVEL UP</span>
                    <strong id="level-up-lv">Lv.2</strong>
                </div>
                <p id="level-up-rank">Aktivis Kampus</p>
            </div>
        `;
        document.body.appendChild(modal);
    },

    showLevelUpToast: function (level, meta) {
        const modal = document.getElementById('level-up-mini-modal');
        if (!modal) return;

        const lvEl = document.getElementById('level-up-lv');
        const rankEl = document.getElementById('level-up-rank');
        if (lvEl) lvEl.innerText = `Lv.${level}`;
        if (rankEl) rankEl.innerText = meta.name;

        modal.classList.remove('show');
        void modal.offsetWidth;
        modal.classList.add('show');

        if (this.modalDismissTimer) clearTimeout(this.modalDismissTimer);
        this.modalDismissTimer = setTimeout(() => {
            modal.classList.remove('show');
        }, 2600);
    },

    bindHistoryFilterEvents: function () {
        const filterWrap = document.getElementById('level-history-filters');
        if (!filterWrap || filterWrap.dataset.bound === '1') return;

        filterWrap.addEventListener('click', (event) => {
            const button = event.target.closest('.level-filter-btn');
            if (!button) return;

            this.historyFilter = String(button.dataset.filter || 'all');
            this.refreshHistoryFilterState();
            this.renderHistoryPanel(this.getProgress(), this.getLevelMeta(this.getProgress().level));
        });

        filterWrap.dataset.bound = '1';
    },

    refreshHistoryFilterState: function () {
        const buttons = document.querySelectorAll('#level-history-filters .level-filter-btn');
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === this.historyFilter);
        });
    },

    refreshUI: function (options = {}) {
        try {
            const progress = this.getProgress();
            const meta = this.getLevelMeta(progress.level);
            this.applyLevelTheme(meta, options);
            this.applyAvatarLevelBorder(meta.borderClass);
            this.applyHeaderRankChip(progress, meta);
            this.applyNameBadges(progress, meta);
            this.applyProfileLevelChips(progress, meta);
            this.renderHistoryPanel(progress, meta);
            this.renderPerkShowcase(progress.level);
        } catch (error) {
            console.warn('leveling refreshUI failed', error);
        }
    },

    applyLevelTheme: function (meta, options = {}) {
        const body = document.body;
        if (!body) return;

        const classes = ['level-theme--maba', 'level-theme--aktivis', 'level-theme--ketua', 'level-theme--asisten', 'level-theme--dekan'];
        const incomingTheme = (meta && meta.themeClass) ? meta.themeClass : 'level-theme--maba';
        const hasPreviousTheme = !!this.currentThemeClass;
        const isThemeChanged = hasPreviousTheme && this.currentThemeClass !== incomingTheme;

        classes.forEach(cls => body.classList.remove(cls));
        body.classList.add(incomingTheme);
        this.currentThemeClass = incomingTheme;

        const welcomePanel = document.querySelector('#view-home .welcome-box > div');
        if (welcomePanel) welcomePanel.classList.add('level-welcome-shell');

        if (!options.initial && isThemeChanged) {
            this.triggerTierTransitionFx(meta);
        }
    },

    triggerTierTransitionFx: function (meta) {
        const body = document.body;
        if (!body) return;

        let burst = document.getElementById('level-tier-burst');
        if (!burst) {
            burst = document.createElement('div');
            burst.id = 'level-tier-burst';
            burst.className = 'level-tier-burst';
            burst.innerHTML = '<span></span><span></span>';
            document.body.appendChild(burst);
        }

        body.classList.remove('level-tier-transition');
        burst.classList.remove('show');
        void body.offsetWidth;
        body.classList.add('level-tier-transition');
        burst.classList.add('show');

        const popTargets = document.querySelectorAll('.level-history-card, #profile-dashboard-photo, #profile-trigger, #profile-dashboard-level-chip');
        popTargets.forEach(el => {
            el.classList.remove('level-tier-pop');
            void el.offsetWidth;
            el.classList.add('level-tier-pop');
        });

        if (this.tierTransitionTimer) clearTimeout(this.tierTransitionTimer);
        this.tierTransitionTimer = setTimeout(() => {
            body.classList.remove('level-tier-transition');
            burst.classList.remove('show');
            popTargets.forEach(el => el.classList.remove('level-tier-pop'));
        }, 1150);
    },

    applyAvatarLevelBorder: function (borderClass) {
        const avatarSelectors = ['#profile-trigger', '#prof-dash-photo', '#profile-dashboard-photo'];
        const allBorderClasses = ['level-border--silver', 'level-border--gold', 'level-border--platinum', 'level-border--diamond', 'level-border--legendary'];

        avatarSelectors.forEach(selector => {
            const el = document.querySelector(selector);
            if (!el) return;
            allBorderClasses.forEach(cls => el.classList.remove(cls));
            el.classList.add(borderClass);
        });
    },

    ensureInlineBadge: function (targetId, badgeText) {
        const target = document.getElementById(targetId);
        if (!target) return;

        let badge = target.parentElement ? target.parentElement.querySelector(`.level-name-badge[data-for="${targetId}"]`) : null;
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'level-name-badge';
            badge.dataset.for = targetId;
            badge.style.marginLeft = '0.5rem';
            target.insertAdjacentElement('afterend', badge);
        }
        badge.innerText = badgeText;
    },

    applyNameBadges: function (progress, meta) {
        const badgeText = `Lv.${progress.level} ${meta.badge}`;
        this.ensureInlineBadge('prof-dash-name', badgeText);
        this.ensureInlineBadge('profile-dashboard-name', badgeText);
    },

    applyHeaderRankChip: function (progress, meta) {
        const appTitle = document.querySelector('.app-title');
        if (!appTitle || !appTitle.parentElement) return;

        let chip = document.getElementById('level-header-chip');
        if (!chip) {
            chip = document.createElement('span');
            chip.id = 'level-header-chip';
            chip.className = 'level-header-chip';
            appTitle.insertAdjacentElement('afterend', chip);
        }

        chip.innerText = `Lv.${progress.level} • ${meta.badge}`;
    },

    upsertChipAfter: function (anchorId, chipId, text) {
        const anchor = document.getElementById(anchorId);
        if (!anchor || !anchor.parentElement) return;

        let chip = document.getElementById(chipId);
        if (!chip) {
            chip = document.createElement('div');
            chip.id = chipId;
            chip.className = 'level-progress-chip';
            anchor.insertAdjacentElement('afterend', chip);
        }
        chip.innerText = text;
    },

    applyProfileLevelChips: function (progress, meta) {
        const percentage = Math.round(progress.progress * 100);
        const text = `Lv.${progress.level} • ${meta.name} • ${percentage}% menuju level berikutnya`;
        this.upsertChipAfter('profile-dashboard-univ', 'profile-dashboard-level-chip', text);
        this.upsertChipAfter('prof-dash-univ', 'profile-basic-level-chip', `Lv.${progress.level} • ${meta.name}`);
    },

    renderPerkShowcase: function (level) {
        const host = document.getElementById('level-benefits-list');
        if (!host) return;

        const perks = this.getPerkDefinitions();
        host.innerHTML = perks.map(perk => {
            const unlocked = level >= perk.unlockLevel;
            return `
                <div class="level-benefit-item ${unlocked ? 'is-unlocked' : ''}">
                    <div class="level-benefit-icon"><i class="ph ${perk.icon}"></i></div>
                    <div class="level-benefit-main">
                        <p class="level-benefit-title">${perk.title}</p>
                        <p class="level-benefit-desc">${perk.desc}</p>
                    </div>
                    <span class="level-benefit-tag">${unlocked ? 'Terbuka' : `Lv.${perk.unlockLevel}`}</span>
                </div>
            `;
        }).join('');
    },

    formatHistoryTime: function (iso) {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '-';

        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'Baru saja';
        if (diffMin < 60) return `${diffMin} menit lalu`;
        const diffHour = Math.floor(diffMin / 60);
        if (diffHour < 24) return `${diffHour} jam lalu`;
        const diffDay = Math.floor(diffHour / 24);
        if (diffDay < 7) return `${diffDay} hari lalu`;
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    },

    renderHistoryPanel: function (progress, meta) {
        this.refreshHistoryFilterState();

        const levelEl = document.getElementById('level-overview-level');
        const rankEl = document.getElementById('level-overview-rank');
        const xpEl = document.getElementById('level-overview-xp');
        const progTextEl = document.getElementById('level-overview-progress');
        const progBarEl = document.getElementById('level-overview-progress-bar');

        if (levelEl) levelEl.innerText = `Lv.${progress.level}`;
        if (rankEl) rankEl.innerText = meta.name;
        if (xpEl) xpEl.innerText = `${progress.totalXp} XP`;
        if (progTextEl) progTextEl.innerText = `${progress.xpNeeded} XP lagi ke Lv.${progress.level + 1}`;
        if (progBarEl) progBarEl.style.width = `${Math.round(progress.progress * 100)}%`;

        const benefitsHost = document.getElementById('level-benefits-list');
        if (!benefitsHost) {
            const card = document.querySelector('.level-history-card');
            const progressWrap = document.querySelector('.level-progress-wrap');
            if (card && progressWrap) {
                const block = document.createElement('div');
                block.className = 'level-benefits-block';
                block.innerHTML = `
                    <p class="level-benefits-title">Benefit yang Terbuka</p>
                    <div id="level-benefits-list" class="level-benefits-list"></div>
                `;
                progressWrap.insertAdjacentElement('afterend', block);
            }
        }

        const historyList = document.getElementById('level-history-list');
        const emptyState = document.getElementById('level-history-empty');
        if (!historyList) return;

        const rows = this.state.history
            .filter(item => this.historyFilter === 'all' || item.category === this.historyFilter)
            .slice(0, 8);
        if (!rows.length) {
            historyList.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        historyList.innerHTML = rows.map(item => `
            <div class="level-history-item">
                <div class="level-history-main">
                    <p class="level-history-label">${item.label}</p>
                    <p class="level-history-time">${this.formatHistoryTime(item.timestamp)}</p>
                </div>
                <span class="level-history-xp">+${item.xp} XP</span>
            </div>
        `).join('');
    }
};