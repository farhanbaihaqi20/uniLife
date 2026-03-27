const profileManager = {
    profile: {},
    currentSharePreset: 'aurora',
    currentShareSize: 'story',

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

    openShareProfileModal: function () {
        const modal = document.getElementById('modal-profile-share');
        if (!modal) return;

        const fullNameToggle = document.getElementById('share-profile-show-fullname');
        const balanceToggle = document.getElementById('share-profile-show-balance');
        if (fullNameToggle) fullNameToggle.checked = false;
        if (balanceToggle) balanceToggle.checked = false;

        this.currentSharePreset = 'aurora';
        this.setSharePreset(this.currentSharePreset, true);
        this.currentShareSize = 'story';
        this.setShareSize(this.currentShareSize, true);

        this.updateDashboardStats();
        this.updateShareProfilePreview();
        modal.classList.add('active');
    },

    closeShareProfileModal: function () {
        const modal = document.getElementById('modal-profile-share');
        if (modal) modal.classList.remove('active');
    },

    setSharePreset: function (preset, silentUpdate = false) {
        const validPreset = ['aurora', 'light', 'midnight'].includes(preset) ? preset : 'aurora';
        this.currentSharePreset = validPreset;

        const buttons = ['aurora', 'light', 'midnight'];
        buttons.forEach((name) => {
            const btn = document.getElementById(`share-preset-${name}`);
            if (!btn) return;
            const isActive = name === validPreset;
            if (isActive) {
                btn.style.borderColor = 'rgba(59,130,246,0.45)';
                btn.style.background = 'linear-gradient(135deg, rgba(59,130,246,0.18), rgba(14,165,233,0.12))';
                btn.style.color = '#2563eb';
            } else {
                btn.style.borderColor = 'var(--border-color)';
                btn.style.background = 'var(--bg-main)';
                btn.style.color = 'var(--text-main)';
            }
        });

        if (!silentUpdate) this.updateShareProfilePreview();
    },

    setShareSize: function (size, silentUpdate = false) {
        const validSize = ['story', 'portrait', 'square'].includes(size) ? size : 'story';
        this.currentShareSize = validSize;

        const buttons = ['story', 'portrait', 'square'];
        buttons.forEach((name) => {
            const btn = document.getElementById(`share-size-${name}`);
            if (!btn) return;
            const isActive = name === validSize;
            if (isActive) {
                btn.style.borderColor = 'rgba(59,130,246,0.45)';
                btn.style.background = 'linear-gradient(135deg, rgba(59,130,246,0.18), rgba(14,165,233,0.12))';
                btn.style.color = '#2563eb';
            } else {
                btn.style.borderColor = 'var(--border-color)';
                btn.style.background = 'var(--bg-main)';
                btn.style.color = 'var(--text-main)';
            }
        });

        if (!silentUpdate) this.updateShareProfilePreview();
    },

    getShareSizeConfig: function (size = this.currentShareSize) {
        const map = {
            story: { key: 'story', width: 1080, height: 1920, aspectRatio: '9 / 16', previewMinHeight: '520px', fileSuffix: 'story' },
            portrait: { key: 'portrait', width: 1080, height: 1350, aspectRatio: '4 / 5', previewMinHeight: '460px', fileSuffix: 'portrait' },
            square: { key: 'square', width: 1080, height: 1080, aspectRatio: '1 / 1', previewMinHeight: '420px', fileSuffix: 'square' }
        };
        return map[size] || map.story;
    },

    getShareTheme: function (preset) {
        const map = {
            aurora: {
                cardBackground: 'linear-gradient(160deg, rgba(15, 23, 42, 0.84), rgba(20, 36, 66, 0.78))',
                outerBackground: 'radial-gradient(circle at 82% 14%, rgba(56, 189, 248, 0.24), transparent 38%), radial-gradient(circle at 18% 86%, rgba(59, 130, 246, 0.28), transparent 44%), linear-gradient(160deg, #0b1020, #101a33 60%, #0f172a)',
                badgeBackground: 'rgba(37,99,235,0.2)',
                badgeBorder: 'rgba(59,130,246,0.5)',
                badgeText: '#bfdbfe'
            },
            light: {
                cardBackground: 'linear-gradient(160deg, rgba(255, 255, 255, 0.97), rgba(248, 250, 252, 0.94))',
                outerBackground: 'radial-gradient(circle at 84% 14%, rgba(59, 130, 246, 0.18), transparent 38%), radial-gradient(circle at 14% 86%, rgba(14, 165, 233, 0.12), transparent 40%), linear-gradient(160deg, #f8fbff, #eef6ff 58%, #f5f8ff)',
                badgeBackground: 'rgba(37, 99, 235, 0.08)',
                badgeBorder: 'rgba(37, 99, 235, 0.35)',
                badgeText: '#1d4ed8'
            },
            midnight: {
                cardBackground: 'linear-gradient(165deg, rgba(3, 7, 18, 0.88), rgba(17, 24, 39, 0.84))',
                outerBackground: 'radial-gradient(circle at 88% 12%, rgba(99, 102, 241, 0.2), transparent 40%), radial-gradient(circle at 10% 84%, rgba(34, 197, 94, 0.15), transparent 40%), linear-gradient(170deg, #050814, #0b1324 62%, #121827)',
                badgeBackground: 'rgba(15, 23, 42, 0.45)',
                badgeBorder: 'rgba(148, 163, 184, 0.45)',
                badgeText: '#e2e8f0'
            }
        };
        return map[preset] || map.aurora;
    },

    getShareLevel: function (ipkText) {
        const ipk = parseFloat(String(ipkText || '0').replace(',', '.'));
        if (ipk >= 3.8) return i18n.t('profile_share_level_elite');
        if (ipk >= 3.5) return i18n.t('profile_share_level_rising');
        return i18n.t('profile_share_level_grind');
    },

    getShareProfileSnapshot: function (options = {}) {
        const readText = (id, fallback = '-') => {
            const el = document.getElementById(id);
            return el && el.innerText ? el.innerText.trim() : fallback;
        };

        const showFullName = !!options.showFullName;
        const showBalance = !!options.showBalance;
        const displayName = showFullName
            ? (this.profile.fullName || this.profile.nickname || 'Mahasiswa')
            : (this.profile.nickname || this.profile.fullName || 'Mahasiswa');

        return {
            name: displayName,
            semester: this.profile.semester ? `Semester ${this.profile.semester}` : '-',
            photoBase64: this.profile.photoBase64 || '',
            initial: (this.profile.nickname || this.profile.fullName || 'U').charAt(0).toUpperCase(),
            preset: this.currentSharePreset,
            ipk: readText('profile-ipk-display', '0.00'),
            tasksDone: readText('profile-completed-tasks', '0'),
            tasksRatio: readText('profile-completed-ratio', '0 dari 0 tugas'),
            attendancePercent: readText('profile-attendance-percent', '0%'),
            attendanceRatio: readText('profile-attendance-ratio', '0 dari 16 pertemuan'),
            focus: readText('profile-total-focus-time', '0h'),
            streak: readText('profile-streak-count', '0'),
            balance: readText('profile-total-balance', 'Rp 0'),
            level: this.getShareLevel(readText('profile-ipk-display', '0.00')),
            website: 'unilife.my.id',
            size: this.currentShareSize,
            generatedAt: new Date().toLocaleDateString(i18n.locale(), { day: 'numeric', month: 'long', year: 'numeric' }),
            showBalance
        };
    },

    updateShareProfilePreview: function () {
        const preview = document.getElementById('share-profile-preview');
        if (!preview) return;

        const showFullName = !!document.getElementById('share-profile-show-fullname')?.checked;
        const showBalance = !!document.getElementById('share-profile-show-balance')?.checked;
        const data = this.getShareProfileSnapshot({ showFullName, showBalance });
        const theme = this.getShareTheme(data.preset);
        const sizeConfig = this.getShareSizeConfig(data.size);
        const isLight = data.preset === 'light';

        const colorMain = isLight ? '#0f172a' : '#f8fafc';
        const colorMuted = isLight ? '#475569' : '#cbd5e1';
        const colorLabel = isLight ? '#1d4ed8' : '#93c5fd';
        const levelBg = isLight ? 'rgba(37, 99, 235, 0.08)' : 'rgba(59, 130, 246, 0.12)';
        const levelBorder = isLight ? 'rgba(37, 99, 235, 0.22)' : 'rgba(96, 165, 250, 0.3)';
        const levelLabelColor = isLight ? '#1e40af' : '#bfdbfe';
        const footerColor = isLight ? '#64748b' : '#94a3b8';
        const footerBorder = isLight ? 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.25)';
        const shadow = isLight ? '0 14px 26px rgba(37, 99, 235, 0.16)' : '0 16px 32px rgba(2, 6, 23, 0.45)';

        preview.style.aspectRatio = sizeConfig.aspectRatio;
        preview.style.minHeight = sizeConfig.previewMinHeight;

        const esc = (value) => String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');

        const balanceHtml = data.showBalance
            ? `<div style="padding:0.75rem; border-radius: 12px; background: ${isLight ? 'rgba(16, 185, 129, 0.07)' : 'rgba(45, 212, 191, 0.08)'}; border:1px solid ${isLight ? 'rgba(16, 185, 129, 0.24)' : 'rgba(45, 212, 191, 0.3)'}; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.76rem; color:${isLight ? '#0f766e' : '#7dd3fc'};">Total Saldo</span>
                <strong style="font-size:0.96rem; color:${isLight ? '#064e3b' : '#ecfeff'};">${esc(data.balance)}</strong>
               </div>`
            : '';

        const avatarHtml = data.photoBase64
            ? `<div style="width:56px; height:56px; border-radius:50%; border:2px solid rgba(147, 197, 253, 0.55); background-image:url('${esc(data.photoBase64)}'); background-size:cover; background-position:center;"></div>`
            : `<div style="width:56px; height:56px; border-radius:50%; border:2px solid rgba(147, 197, 253, 0.55); background: linear-gradient(135deg, rgba(59,130,246,0.35), rgba(14,165,233,0.3)); display:flex; align-items:center; justify-content:center; color:#f8fafc; font-weight:700; font-size:1rem;">${esc(data.initial)}</div>`;

        preview.innerHTML = `
            <div style="height: 100%; min-height: 520px; padding: 1rem; background:${theme.outerBackground};">
                <div style="height:100%; border-radius: 18px; padding: 1rem; border: 1px solid ${isLight ? 'rgba(37, 99, 235, 0.2)' : 'rgba(125, 211, 252, 0.25)'}; background: ${theme.cardBackground}; box-shadow: ${shadow}; display:flex; flex-direction:column; gap:0.9rem;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.75rem;">
                        <div style="display:flex; align-items:center; gap:0.7rem;">
                            ${avatarHtml}
                            <div>
                            <p style="font-size:0.7rem; letter-spacing:1px; text-transform:uppercase; color:${colorLabel};">Unilife Snapshot</p>
                            <h4 style="font-size:1.2rem; color:${colorMain}; margin-top:0.2rem;">${esc(data.name)}</h4>
                            <p style="font-size:0.8rem; color:${colorMuted}; margin-top:0.2rem;">${esc(data.semester)}</p>
                            </div>
                        </div>
                        <span style="font-size:0.7rem; padding:0.35rem 0.55rem; border-radius:999px; border:1px solid ${theme.badgeBorder}; color:${theme.badgeText}; background: ${theme.badgeBackground};">${esc(i18n.t('profile_share_badge'))}</span>
                    </div>

                    <div style="padding:0.6rem 0.75rem; border-radius: 12px; background: ${levelBg}; border:1px solid ${levelBorder}; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.74rem; color:${levelLabelColor};">${esc(i18n.t('profile_share_level_title'))}</span>
                        <strong style="font-size:0.88rem; color:${colorMain};">${esc(data.level)}</strong>
                    </div>

                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.55rem;">
                        <div style="padding:0.75rem; border-radius:12px; background: ${isLight ? 'rgba(37, 99, 235, 0.08)' : 'rgba(59, 130, 246, 0.1)'}; border:1px solid ${isLight ? 'rgba(37, 99, 235, 0.25)' : 'rgba(96, 165, 250, 0.35)'};">
                            <small style="font-size:0.72rem; color:${isLight ? '#1d4ed8' : '#bfdbfe'};">IPK</small>
                            <p style="font-size:1.1rem; color:${colorMain}; font-weight:700; margin-top:0.25rem;">${esc(data.ipk)}</p>
                        </div>
                        <div style="padding:0.75rem; border-radius:12px; background: ${isLight ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.1)'}; border:1px solid ${isLight ? 'rgba(16, 185, 129, 0.24)' : 'rgba(52, 211, 153, 0.35)'};">
                            <small style="font-size:0.72rem; color:${isLight ? '#047857' : '#a7f3d0'};">Tugas</small>
                            <p style="font-size:1.1rem; color:${colorMain}; font-weight:700; margin-top:0.25rem;">${esc(data.tasksDone)}</p>
                            <p style="font-size:0.68rem; color:${isLight ? '#065f46' : '#d1fae5'}; margin-top:0.15rem;">${esc(data.tasksRatio)}</p>
                        </div>
                        <div style="padding:0.75rem; border-radius:12px; background: ${isLight ? 'rgba(14, 165, 233, 0.08)' : 'rgba(14, 165, 233, 0.1)'}; border:1px solid ${isLight ? 'rgba(14, 165, 233, 0.24)' : 'rgba(56, 189, 248, 0.35)'};">
                            <small style="font-size:0.72rem; color:${isLight ? '#0369a1' : '#bae6fd'};">Kehadiran</small>
                            <p style="font-size:1.1rem; color:${colorMain}; font-weight:700; margin-top:0.25rem;">${esc(data.attendancePercent)}</p>
                            <p style="font-size:0.68rem; color:${isLight ? '#075985' : '#e0f2fe'}; margin-top:0.15rem;">${esc(data.attendanceRatio)}</p>
                        </div>
                        <div style="padding:0.75rem; border-radius:12px; background: ${isLight ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.1)'}; border:1px solid ${isLight ? 'rgba(245, 158, 11, 0.24)' : 'rgba(251, 191, 36, 0.35)'};">
                            <small style="font-size:0.72rem; color:${isLight ? '#b45309' : '#fde68a'};">Total Fokus</small>
                            <p style="font-size:1.1rem; color:${colorMain}; font-weight:700; margin-top:0.25rem;">${esc(data.focus)}</p>
                        </div>
                    </div>

                    <div style="padding:0.75rem; border-radius: 12px; background: ${isLight ? 'rgba(251, 191, 36, 0.08)' : 'rgba(251, 191, 36, 0.08)'}; border:1px solid ${isLight ? 'rgba(245, 158, 11, 0.24)' : 'rgba(251, 191, 36, 0.28)'}; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.76rem; color:${isLight ? '#92400e' : '#fef3c7'};">Streak Hari</span>
                        <strong style="font-size:1rem; color:${isLight ? '#78350f' : '#fff7ed'};">${esc(data.streak)} hari</strong>
                    </div>

                    ${balanceHtml}

                    <div style="margin-top:0.35rem; display:flex; justify-content:space-between; align-items:center; gap:0.5rem; font-size:0.68rem; color:${footerColor}; border-top:1px solid ${footerBorder}; padding-top:0.75rem;">
                        <span>Generated ${esc(data.generatedAt)}</span>
                        <span>#UNILIFE • ${esc(data.website)}</span>
                    </div>
                </div>
            </div>
        `;
    },

    downloadShareProfileCard: async function () {
        try {
            const showFullName = !!document.getElementById('share-profile-show-fullname')?.checked;
            const showBalance = !!document.getElementById('share-profile-show-balance')?.checked;
            const data = this.getShareProfileSnapshot({ showFullName, showBalance });
            const theme = this.getShareTheme(data.preset);
            const sizeConfig = this.getShareSizeConfig(data.size);
            const isLight = data.preset === 'light';

            const exportMainText = isLight ? '#0f172a' : '#f8fafc';
            const exportMutedText = isLight ? '#475569' : '#cbd5e1';
            const exportLabelText = isLight ? '#1d4ed8' : '#93c5fd';
            const exportPanelFill = isLight ? 'rgba(255, 255, 255, 0.92)' : 'rgba(15, 23, 42, 0.82)';
            const exportPanelStroke = isLight ? 'rgba(37, 99, 235, 0.28)' : 'rgba(125, 211, 252, 0.32)';
            const exportFooterText = isLight ? '#64748b' : '#94a3b8';
            const exportFooterLine = isLight ? 'rgba(148, 163, 184, 0.34)' : 'rgba(148, 163, 184, 0.24)';

            const canvas = document.createElement('canvas');
            canvas.width = 1080;
            canvas.height = 1920;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

        const roundRect = (x, y, w, h, r) => {
            const rr = Math.min(r, w / 2, h / 2);
            ctx.beginPath();
            ctx.moveTo(x + rr, y);
            ctx.arcTo(x + w, y, x + w, y + h, rr);
            ctx.arcTo(x + w, y + h, x, y + h, rr);
            ctx.arcTo(x, y + h, x, y, rr);
            ctx.arcTo(x, y, x + w, y, rr);
            ctx.closePath();
        };

        const truncate = (text, maxLen) => {
            const value = String(text || '');
            return value.length > maxLen ? `${value.slice(0, maxLen - 1)}...` : value;
        };

        const loadImage = (src) => new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });

        const presetGradients = {
            aurora: ['#090f1e', '#0f1c37', '#0b1224'],
            light: ['#fff7ed', '#ffedd5', '#ffe4e6'],
            midnight: ['#030712', '#0b1324', '#121827']
        };
        const presetGlowA = {
            aurora: 'rgba(56, 189, 248, 0.35)',
            light: 'rgba(251, 191, 36, 0.34)',
            midnight: 'rgba(99, 102, 241, 0.3)'
        };
        const presetGlowB = {
            aurora: 'rgba(59, 130, 246, 0.28)',
            light: 'rgba(248, 113, 113, 0.22)',
            midnight: 'rgba(34, 197, 94, 0.2)'
        };
        const gradStops = presetGradients[data.preset] || presetGradients.aurora;

        const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        bgGrad.addColorStop(0, gradStops[0]);
        bgGrad.addColorStop(0.55, gradStops[1]);
        bgGrad.addColorStop(1, gradStops[2]);
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const glow1 = ctx.createRadialGradient(870, 260, 20, 870, 260, 360);
        glow1.addColorStop(0, presetGlowA[data.preset] || presetGlowA.aurora);
        glow1.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = glow1;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const glow2 = ctx.createRadialGradient(220, 1560, 20, 220, 1560, 420);
        glow2.addColorStop(0, presetGlowB[data.preset] || presetGlowB.aurora);
        glow2.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.fillStyle = glow2;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const panelX = 72;
        const panelY = 92;
        const panelW = canvas.width - (panelX * 2);
        const contentBottom = data.showBalance ? 1130 : 978;
        const panelH = Math.min(canvas.height - (panelY * 2), Math.max(contentBottom + 170, 1240));
        roundRect(panelX, panelY, panelW, panelH, 44);
        ctx.fillStyle = exportPanelFill;
        ctx.fill();
        ctx.strokeStyle = exportPanelStroke;
        ctx.lineWidth = 2;
        ctx.stroke();

        roundRect(panelX + panelW - 236, panelY + 42, 170, 46, 22);
        ctx.fillStyle = theme.badgeBackground;
        ctx.fill();
        ctx.strokeStyle = theme.badgeBorder;
        ctx.stroke();
        ctx.fillStyle = theme.badgeText;
        ctx.font = '600 22px Inter, sans-serif';
        ctx.fillText(i18n.t('profile_share_badge').toUpperCase(), panelX + panelW - 220, panelY + 72);

        const avatarX = panelX + 108;
        const avatarY = panelY + 106;
        const avatarR = 44;
        const nameX = avatarX + avatarR + 24;
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        if (data.photoBase64) {
            try {
                const img = await loadImage(data.photoBase64);
                // Keep avatar centered by cropping source image to a centered square first.
                const sourceSize = Math.min(img.width, img.height);
                const sourceX = (img.width - sourceSize) / 2;
                const sourceY = (img.height - sourceSize) / 2;
                ctx.drawImage(
                    img,
                    sourceX,
                    sourceY,
                    sourceSize,
                    sourceSize,
                    avatarX - avatarR,
                    avatarY - avatarR,
                    avatarR * 2,
                    avatarR * 2
                );
            } catch (error) {
                ctx.fillStyle = 'rgba(37, 99, 235, 0.4)';
                ctx.fillRect(avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
            }
        } else {
            const avatarGrad = ctx.createLinearGradient(avatarX - avatarR, avatarY - avatarR, avatarX + avatarR, avatarY + avatarR);
            avatarGrad.addColorStop(0, 'rgba(59,130,246,0.45)');
            avatarGrad.addColorStop(1, 'rgba(14,165,233,0.45)');
            ctx.fillStyle = avatarGrad;
            ctx.fillRect(avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
        }
        ctx.restore();
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
        ctx.closePath();
        ctx.strokeStyle = 'rgba(147, 197, 253, 0.7)';
        ctx.lineWidth = 3;
        ctx.stroke();

        if (!data.photoBase64) {
            ctx.fillStyle = exportMainText;
            ctx.font = '700 36px Inter, sans-serif';
            ctx.fillText((data.initial || 'U').charAt(0), avatarX - 12, avatarY + 12);
        }

        ctx.fillStyle = exportLabelText;
        ctx.font = '600 30px Inter, sans-serif';
        ctx.fillText('UNILIFE SNAPSHOT', nameX, panelY + 82);

        ctx.fillStyle = exportMainText;
        ctx.font = '700 62px Inter, sans-serif';
        ctx.fillText(truncate(data.name, 20), nameX, panelY + 168);

        ctx.fillStyle = exportMutedText;
        ctx.font = '500 34px Inter, sans-serif';
        ctx.fillText(data.semester, nameX, panelY + 216);

        roundRect(panelX + 52, panelY + 232, panelW - 104, 76, 18);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.12)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(96, 165, 250, 0.3)';
        ctx.stroke();
        ctx.fillStyle = isLight ? '#1e40af' : '#bfdbfe';
        ctx.font = '600 24px Inter, sans-serif';
        ctx.fillText(i18n.t('profile_share_level_title'), panelX + 80, panelY + 278);
        ctx.fillStyle = exportMainText;
        ctx.font = '700 30px Inter, sans-serif';
        ctx.fillText(data.level, panelX + panelW - 330, panelY + 278);

        const drawStat = (x, y, title, value, sub, tone) => {
            roundRect(x, y, 430, 220, 28);
            ctx.fillStyle = tone.bg;
            ctx.fill();
            ctx.strokeStyle = tone.border;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = tone.title;
            ctx.font = '600 28px Inter, sans-serif';
            ctx.fillText(title, x + 28, y + 52);

            ctx.fillStyle = exportMainText;
            ctx.font = '700 56px Inter, sans-serif';
            ctx.fillText(truncate(value, 13), x + 28, y + 126);

            if (sub) {
                ctx.fillStyle = tone.sub;
                ctx.font = '500 24px Inter, sans-serif';
                ctx.fillText(truncate(sub, 26), x + 28, y + 172);
            }
        };

        drawStat(panelX + 52, panelY + 334, 'IPK', data.ipk, '', {
            bg: isLight ? 'rgba(37, 99, 235, 0.08)' : 'rgba(59, 130, 246, 0.14)',
            border: isLight ? 'rgba(37, 99, 235, 0.25)' : 'rgba(96, 165, 250, 0.38)',
            title: isLight ? '#1d4ed8' : '#bfdbfe',
            sub: isLight ? '#1e3a8a' : '#dbeafe'
        });
        drawStat(panelX + 502, panelY + 334, 'Tugas', data.tasksDone, data.tasksRatio, {
            bg: isLight ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.14)',
            border: isLight ? 'rgba(16, 185, 129, 0.24)' : 'rgba(52, 211, 153, 0.4)',
            title: isLight ? '#047857' : '#a7f3d0',
            sub: isLight ? '#065f46' : '#d1fae5'
        });
        drawStat(panelX + 52, panelY + 584, 'Kehadiran', data.attendancePercent, data.attendanceRatio, {
            bg: isLight ? 'rgba(14, 165, 233, 0.08)' : 'rgba(14, 165, 233, 0.14)',
            border: isLight ? 'rgba(14, 165, 233, 0.24)' : 'rgba(56, 189, 248, 0.38)',
            title: isLight ? '#0369a1' : '#bae6fd',
            sub: isLight ? '#075985' : '#e0f2fe'
        });
        drawStat(panelX + 502, panelY + 584, 'Total Fokus', data.focus, '', {
            bg: isLight ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.14)',
            border: isLight ? 'rgba(245, 158, 11, 0.24)' : 'rgba(251, 191, 36, 0.35)',
            title: isLight ? '#b45309' : '#fde68a',
            sub: isLight ? '#92400e' : '#fef3c7'
        });

        roundRect(panelX + 52, panelY + 846, panelW - 104, 132, 24);
        ctx.fillStyle = 'rgba(251, 191, 36, 0.1)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.32)';
        ctx.stroke();
        ctx.fillStyle = isLight ? '#92400e' : '#fef3c7';
        ctx.font = '600 28px Inter, sans-serif';
        ctx.fillText('Streak Hari', panelX + 84, panelY + 900);
        ctx.fillStyle = isLight ? '#78350f' : '#fff7ed';
        ctx.font = '700 46px Inter, sans-serif';
        ctx.fillText(`${data.streak} hari`, panelX + panelW - 320, panelY + 910);

        if (data.showBalance) {
            roundRect(panelX + 52, panelY + 998, panelW - 104, 132, 24);
            ctx.fillStyle = 'rgba(45, 212, 191, 0.1)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(45, 212, 191, 0.35)';
            ctx.stroke();
            ctx.fillStyle = '#99f6e4';
            ctx.font = '600 28px Inter, sans-serif';
            ctx.fillText('Total Saldo', panelX + 84, panelY + 1052);
            ctx.fillStyle = '#ecfeff';
            ctx.font = '700 42px Inter, sans-serif';
            ctx.fillText(truncate(data.balance, 19), panelX + 84, panelY + 1102);
        }

        ctx.strokeStyle = exportFooterLine;
        ctx.beginPath();
        ctx.moveTo(panelX + 52, panelY + panelH - 116);
        ctx.lineTo(panelX + panelW - 52, panelY + panelH - 116);
        ctx.stroke();

        ctx.fillStyle = exportFooterText;
        ctx.font = '500 24px Inter, sans-serif';
        ctx.fillText(`Generated ${data.generatedAt}`, panelX + 52, panelY + panelH - 68);
        ctx.fillText(`#UNILIFE  |  ${data.website}`, panelX + panelW - 370, panelY + panelH - 68);

        let outputCanvas = canvas;
        if (!(sizeConfig.width === 1080 && sizeConfig.height === 1920)) {
            outputCanvas = document.createElement('canvas');
            outputCanvas.width = sizeConfig.width;
            outputCanvas.height = sizeConfig.height;
            const outCtx = outputCanvas.getContext('2d');
            if (outCtx) {
                outCtx.fillStyle = isLight ? '#f8fafc' : '#0b1224';
                outCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
                const fitScale = Math.min(outputCanvas.width / canvas.width, outputCanvas.height / canvas.height);
                const drawW = canvas.width * fitScale;
                const drawH = canvas.height * fitScale;
                const drawX = (outputCanvas.width - drawW) / 2;
                const drawY = (outputCanvas.height - drawH) / 2;
                outCtx.drawImage(canvas, drawX, drawY, drawW, drawH);
            }
        }

            const link = document.createElement('a');
            const stamp = new Date().toISOString().slice(0, 10);
            link.download = `unilife-profile-${sizeConfig.fileSuffix}-${stamp}.png`;
            link.href = outputCanvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            if (typeof inboxManager !== 'undefined') {
                inboxManager.showToast(i18n.t('profile_share_saved'));
            }
        } catch (error) {
            console.error('downloadShareProfileCard error:', error);
            if (typeof inboxManager !== 'undefined') {
                inboxManager.showToast('Gagal menyimpan gambar. Coba lagi.');
            } else {
                alert('Gagal menyimpan gambar. Coba lagi.');
            }
        }
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

    getActiveSemester: function () {
        return String(this.profile.semester || 1);
    },

    getActiveSemesterSchedules: function () {
        const activeSemester = this.getActiveSemester();
        const schedules = Storage.getSchedules ? Storage.getSchedules() : [];
        return schedules.filter(s => String(s.semester || 1) === activeSemester);
    },

    getIpkFromStorage: function () {
        const semesters = Storage.getGrades ? Storage.getGrades() : [];

        if (typeof gradesManager === 'undefined' || !gradesManager.gradeScale) {
            return '0.00';
        }

        let totalSks = 0;
        let totalPoints = 0;

        semesters.forEach(sem => {
            (sem.courses || []).forEach(course => {
                const isGraded = typeof gradesManager.isCourseGraded === 'function'
                    ? gradesManager.isCourseGraded(course)
                    : (course.grade && course.finalScore !== undefined && course.finalScore !== null && course.finalScore !== '');

                if (!isGraded) return;

                const sks = Number(course.sks) || 0;
                const point = gradesManager.gradeScale[course.grade];
                if (!Number.isFinite(point)) return;

                totalSks += sks;
                totalPoints += (sks * point);
            });
        });

        const ipk = totalSks === 0 ? 0 : (totalPoints / totalSks);
        return ipk.toFixed(2);
    },

    updateDashboardStats: function () {
        const activeSemesterSchedules = this.getActiveSemesterSchedules();
        const formatRupiah = (amount) => `Rp ${Number(amount || 0).toLocaleString('id-ID')}`;

        // Get IPK directly from latest storage data so profile stat always stays in sync.
        const ipkEl = document.getElementById('profile-ipk-display');
        if (ipkEl) ipkEl.innerText = this.getIpkFromStorage();

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
            const completedRatioEl = document.getElementById('profile-completed-ratio');
            const totalSemesterTasks = pendingTasks.length + completedTasks.length;
            if (pendingEl) pendingEl.innerText = pendingTasks.length;
            if (completedEl) completedEl.innerText = completedTasks.length;
            if (completedRatioEl) {
                completedRatioEl.innerText = i18n.tf('profile_stats_completed_ratio', {
                    done: completedTasks.length,
                    total: totalSemesterTasks
                });
            }
        }

        // Get focus stats
        if (typeof focusManager !== 'undefined') {
            const sessions = focusManager.focusSessions || [];

            // Calculate total focus time in hours
            const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
            const totalHours = (totalMinutes / 60).toFixed(1);
            const timeEl = document.getElementById('profile-total-focus-time');
            if (timeEl) timeEl.innerText = `${totalHours}h`;

        }

        // Budget total balance (transactions + saldo awal)
        const budgetTransactions = Storage.getBudgetTransactions ? Storage.getBudgetTransactions() : [];
        const baseBalance = Storage.getBudgetBaseBalance ? Number(Storage.getBudgetBaseBalance()) || 0 : 0;
        const txBalance = budgetTransactions.reduce((sum, tx) => {
            const amount = Number(tx.amount) || 0;
            return sum + (tx.type === 'income' ? amount : -amount);
        }, 0);
        const totalBalanceEl = document.getElementById('profile-total-balance');
        if (totalBalanceEl) totalBalanceEl.innerText = formatRupiah(baseBalance + txBalance);

        // Calculate streak from attendance activity (max once per day).
        this.calculateStreak();

        // Get attendance percentage
        this.getAttendancePercentage();

        // Get course count from active semester schedules so it stays aligned with attendance.
        const courseEl = document.getElementById('profile-course-count');
        if (courseEl) courseEl.innerText = activeSemesterSchedules.length;
    },

    calculateStreak: function () {
        const attendanceRecords = Storage.getAttendanceRecords ? Storage.getAttendanceRecords() : [];
        if (!attendanceRecords.length) {
            const streakEl = document.getElementById('profile-streak-count');
            if (streakEl) streakEl.innerText = '0';
            return;
        }

        // One activity per day maximum: collect unique local day keys from attendance records.
        const uniqueDateKeys = [...new Set(attendanceRecords.map(record => {
            if (record.dateFor) return String(record.dateFor);
            if (record.timestamp) {
                const d = new Date(record.timestamp);
                const month = `${d.getMonth() + 1}`.padStart(2, '0');
                const day = `${d.getDate()}`.padStart(2, '0');
                return `${d.getFullYear()}-${month}-${day}`;
            }
            return null;
        }).filter(Boolean))];

        if (!uniqueDateKeys.length) {
            const streakEl = document.getElementById('profile-streak-count');
            if (streakEl) streakEl.innerText = '0';
            return;
        }

        uniqueDateKeys.sort((a, b) => new Date(b) - new Date(a));
        const dateSet = new Set(uniqueDateKeys);

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const toKey = (dateObj) => {
            const month = `${dateObj.getMonth() + 1}`.padStart(2, '0');
            const day = `${dateObj.getDate()}`.padStart(2, '0');
            return `${dateObj.getFullYear()}-${month}-${day}`;
        };

        // Grace 1 day: if no activity today, allow streak to continue from yesterday.
        const todayKey = toKey(today);
        const yesterdayKey = toKey(yesterday);
        let cursor = dateSet.has(todayKey) ? new Date(today) : (dateSet.has(yesterdayKey) ? new Date(yesterday) : null);

        if (!cursor) {
            const streakEl = document.getElementById('profile-streak-count');
            if (streakEl) streakEl.innerText = '0';
            return;
        }

        for (let i = 0; i < 365; i++) {
            const key = toKey(cursor);

            if (dateSet.has(key)) {
                streak++;
            } else {
                break;
            }

            cursor.setDate(cursor.getDate() - 1);
        }

        const streakEl = document.getElementById('profile-streak-count');
        if (streakEl) streakEl.innerText = streak;
    },

    getAttendancePercentage: function () {
        if (typeof presensiManager === 'undefined') {
            const attendanceEl = document.getElementById('profile-attendance-percent');
            const attendanceRatioEl = document.getElementById('profile-attendance-ratio');
            if (attendanceEl) attendanceEl.innerText = '-';
            if (attendanceRatioEl) attendanceRatioEl.innerText = i18n.tf('profile_stats_attendance_ratio', { present: 0 });
            return;
        }

        const attendanceEl = document.getElementById('profile-attendance-percent');
        const attendanceRatioEl = document.getElementById('profile-attendance-ratio');
        const activeSemester = this.getActiveSemester();
        const schedules = this.getActiveSemesterSchedules();
        const allRecords = Storage.getAttendanceRecords ? Storage.getAttendanceRecords() : [];

        if (schedules.length === 0) {
            if (attendanceEl) {
                attendanceEl.innerText = '0%';
                attendanceEl.title = 'Rata-rata hadir: 0.0 dari 16 pertemuan per mata kuliah';
            }
            if (attendanceRatioEl) attendanceRatioEl.innerText = i18n.tf('profile_stats_attendance_ratio', { present: 0 });
            return;
        }

        let totalPresentMeetings = 0;

        schedules.forEach(schedule => {
            const presentCount = allRecords.filter(rec => {
                const recSemester = String(rec.semester || schedule.semester || 1);
                return rec.scheduleId === schedule.id && recSemester === activeSemester && rec.status === 'hadir';
            }).length;

            totalPresentMeetings += Math.min(16, presentCount);
        });

        const averagePresent = totalPresentMeetings / schedules.length;
        const percentage = Math.round((averagePresent / 16) * 100);
        const compactPresent = Number(averagePresent.toFixed(1)).toString();

        if (attendanceEl) {
            attendanceEl.innerText = `${percentage}%`;
            attendanceEl.title = `Rata-rata hadir: ${averagePresent.toFixed(1)} dari 16 pertemuan per mata kuliah`;
        }
        if (attendanceRatioEl) {
            attendanceRatioEl.innerText = i18n.tf('profile_stats_attendance_ratio', { present: compactPresent });
        }
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
