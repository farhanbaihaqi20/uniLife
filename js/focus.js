const focusManager = {
    workDuration: 25 * 60,
    breakDuration: 5 * 60,
    mode: 'work', // 'work' or 'break'
    timeLeft: 25 * 60, // in seconds
    totalDuration: 25 * 60,
    timerInterval: null,
    isRunning: false,
    stats: [],
    currentTaskId: null, // Track which task is being worked on
    focusSessions: [], // Session history
    ambienceMode: 'off',
    ambienceVolume: 0.35,
    audioCtx: null,
    ambienceGain: null,
    ambienceNodes: [],
    customAudioFile: null,
    customAudioElement: null,
    customAudioSource: null,
    ambienceBeforeMute: null,
    presets: {
        deep: { work: 50, break: 10, ambience: 'deep', volume: 42 },
        light: { work: 25, break: 5, ambience: 'rain', volume: 35 },
        crunch: { work: 45, break: 8, ambience: 'cafe', volume: 30 }
    },

    init: function () {
        this.stats = Storage.getFocusStats();
        this.focusSessions = Storage.getFocusSessions();
        this.timeLeft = this.workDuration;
        this.totalDuration = this.workDuration;
        this.renderTaskSelector();
        this.updateTimerVisualState();
        this.updateTimerDisplay();
        this.updateStatsUI();
        this.syncAmbienceUI();

        // Keyboard shortcuts while in fullscreen focus mode
        document.addEventListener('keydown', (e) => {
            const target = e.target;
            const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
            if (isTyping) return;

            if (e.key === 'Escape') {
                const overlay = document.getElementById('focus-fullscreen-overlay');
                if (overlay?.classList.contains('active')) {
                    this.exitFullscreenMode();
                    return;
                }
                return;
            }

            const fullscreenActive = document.getElementById('focus-fullscreen-overlay')?.classList.contains('active');
            if (!fullscreenActive) return;

            if (e.code === 'Space') {
                e.preventDefault();
                this.toggleTimer();
                return;
            }

            if (e.key === 'm' || e.key === 'M') {
                this.toggleFullscreenMusic();
                return;
            }

            if (e.key === 's' || e.key === 'S') {
                this.stopAndExitFullscreen();
            }
        });
    },
    ensureAudioContext: function () {
        if (!window.AudioContext && !window.webkitAudioContext) return false;

        if (!this.audioCtx) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new Ctx();
            this.ambienceGain = this.audioCtx.createGain();
            this.ambienceGain.gain.value = this.ambienceVolume;
            this.ambienceGain.connect(this.audioCtx.destination);
        }

        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        return true;
    },

    registerAmbienceNode: function (node) {
        this.ambienceNodes.push({ type: 'node', value: node });
    },

    registerAmbienceInterval: function (id) {
        this.ambienceNodes.push({ type: 'interval', value: id });
    },

    getTargetAmbienceGain: function () {
        return Math.max(0.0001, this.ambienceVolume);
    },

    fadeAmbienceTo: function (target, durationMs = 250, onDone) {
        if (!this.ambienceGain || !this.audioCtx) {
            if (onDone) onDone();
            return;
        }

        const now = this.audioCtx.currentTime;
        this.ambienceGain.gain.cancelScheduledValues(now);
        this.ambienceGain.gain.setValueAtTime(this.ambienceGain.gain.value, now);
        this.ambienceGain.gain.linearRampToValueAtTime(Math.max(0.0001, target), now + (durationMs / 1000));

        if (onDone) setTimeout(onDone, durationMs + 24);
    },

    withAmbienceDucking: function (callback) {
        if (!this.ambienceGain || !this.audioCtx || this.ambienceMode === 'off') {
            if (callback) callback();
            return;
        }

        const restore = this.getTargetAmbienceGain();
        this.fadeAmbienceTo(Math.max(0.02, restore * 0.22), 180, () => {
            if (callback) callback();
            this.fadeAmbienceTo(restore, 360);
        });
    },

    cleanupAmbience: function () {
        this.ambienceNodes.forEach(item => {
            if (item.type === 'interval') {
                clearInterval(item.value);
                return;
            }

            const node = item.value;
            if (node && typeof node.stop === 'function') {
                try { node.stop(0); } catch (e) { }
            }
            if (node && typeof node.disconnect === 'function') {
                try { node.disconnect(); } catch (e) { }
            }
        });

        this.ambienceNodes = [];
    },

    setAmbience: function (mode) {
        const prevMode = this.ambienceMode;
        if (mode === prevMode) {
            this.syncAmbienceUI();
            return;
        }

        const applyMode = () => {
            this.ambienceMode = mode;
            this.cleanupAmbience();

            if (mode === 'off') {
                this.syncAmbienceUI();
                return;
            }

            if (!this.ensureAudioContext()) {
                alert('Browser tidak mendukung audio ambience.');
                this.ambienceMode = 'off';
                this.syncAmbienceUI();
                return;
            }

            if (mode === 'rain') this.buildRainAmbience();
            if (mode === 'cafe') this.buildCafeAmbience();
            if (mode === 'deep') this.buildDeepAmbience();
            if (mode === 'custom') this.playCustomAudio();

            this.syncAmbienceUI();
        };

        // Crossfade ambience when switching between active modes.
        const shouldCrossfade = prevMode !== 'off' && mode !== 'off' && this.ambienceGain && this.audioCtx;
        if (!shouldCrossfade) {
            applyMode();
            if (mode !== 'off') this.fadeAmbienceTo(this.getTargetAmbienceGain(), 240);
            return;
        }

        this.fadeAmbienceTo(0.0001, 190, () => {
            applyMode();
            if (this.ambienceMode !== 'off') this.fadeAmbienceTo(this.getTargetAmbienceGain(), 300);
        });
    },

    applyPreset: function (presetKey) {
        const preset = this.presets[presetKey];
        if (!preset) return;

        if (this.isRunning) this.pauseTimer();

        this.workDuration = preset.work * 60;
        this.breakDuration = preset.break * 60;
        this.mode = 'work';
        this.totalDuration = this.workDuration;
        this.timeLeft = this.workDuration;

        this.setAmbienceVolume(preset.volume);
        this.setAmbience(preset.ambience);

        this.setMode('work');
        this.updateTimerDisplay();
    },

    setAmbienceVolume: function (value) {
        const numeric = Math.max(0, Math.min(100, Number(value) || 0));
        this.ambienceVolume = numeric / 100;

        if (this.ambienceGain) {
            this.ambienceGain.gain.setTargetAtTime(this.ambienceVolume, this.audioCtx.currentTime, 0.08);
        }

        if (this.customAudioElement) {
            this.customAudioElement.volume = this.ambienceVolume;
        }

        const display = document.getElementById('focus-volume-display');
        if (display) display.innerText = Math.round(numeric);

        this.syncAmbienceUI();
    },

    getAmbienceLabel: function () {
        if (this.ambienceMode === 'rain') return i18n.t('focus_ambience_status_rain') || 'Rain';
        if (this.ambienceMode === 'cafe') return i18n.t('focus_ambience_status_cafe') || 'Cafe';
        if (this.ambienceMode === 'deep') return i18n.t('focus_ambience_status_deep') || 'Deep Tone';
        return i18n.t('focus_ambience_status_off') || 'Off';
    },

    syncAmbienceUI: function () {
        const buttons = document.querySelectorAll('.focus-ambience-btn');
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === this.ambienceMode);
        });

        const status = document.getElementById('focus-ambience-status');
        if (status) status.innerText = this.getAmbienceLabel();

        const icon = document.getElementById('focus-ambience-icon');
        if (icon) {
            icon.className = this.ambienceMode === 'off' ? 'ph ph-stop-circle' : 'ph ph-play-circle';
        }

        const volume = document.getElementById('focus-ambience-volume');
        if (volume) volume.value = Math.round(this.ambienceVolume * 100);

        const volumeDisplay = document.getElementById('focus-volume-display');
        if (volumeDisplay) volumeDisplay.innerText = Math.round(this.ambienceVolume * 100);

        const customNameWrap = document.getElementById('focus-custom-audio-name');
        if (customNameWrap) {
            customNameWrap.style.display = this.customAudioFile ? 'flex' : 'none';
        }

        const customNameText = document.getElementById('focus-custom-filename-text');
        if (customNameText && this.customAudioFile) {
            customNameText.innerText = this.customAudioFile.name;
        }

        // Update fullscreen display if active
        this.updateFullscreenAmbienceDisplay();
    },

    handleCustomAudio: function (file) {
        if (!file) return;

        if (!file.type.startsWith('audio/')) {
            alert('Pilih file audio yang valid (.mp3, .wav, .ogg, dll)');
            return;
        }

        this.customAudioFile = file;
        this.setAmbience('custom');
    },

    playCustomAudio: function () {
        if (!this.customAudioFile) {
            alert('Belum ada file audio yang dipilih. Klik tombol Upload untuk memilih file.');
            this.ambienceMode = 'off';
            this.syncAmbienceUI();
            return;
        }

        if (!this.ensureAudioContext()) {
            // Fallback to HTML5 audio if Web Audio not supported
            this.playCustomAudioFallback();
            return;
        }

        const url = URL.createObjectURL(this.customAudioFile);

        if (this.customAudioElement) {
            this.customAudioElement.pause();
            this.customAudioElement = null;
        }

        this.customAudioElement = new Audio(url);
        this.customAudioElement.loop = true;
        this.customAudioElement.volume = this.ambienceVolume;

        const playPromise = this.customAudioElement.play();
        if (playPromise !== undefined) {
            playPromise.catch(err => {
                console.error('Custom audio play error:', err);
                alert('Gagal memutar audio. Coba klik tombol play timer terlebih dahulu.');
            });
        }

        // Connect to Web Audio for volume consistency
        if (this.audioCtx && !this.customAudioSource) {
            try {
                this.customAudioSource = this.audioCtx.createMediaElementSource(this.customAudioElement);
                this.customAudioSource.connect(this.ambienceGain);
                this.registerAmbienceNode(this.customAudioSource);
            } catch (e) {
                console.warn('Could not connect custom audio to Web Audio API:', e);
            }
        }

        this.registerAmbienceNode({
            stop: () => {
                if (this.customAudioElement) {
                    this.customAudioElement.pause();
                    this.customAudioElement.currentTime = 0;
                }
            }
        });
    },

    playCustomAudioFallback: function () {
        const url = URL.createObjectURL(this.customAudioFile);

        if (this.customAudioElement) {
            this.customAudioElement.pause();
        }

        this.customAudioElement = new Audio(url);
        this.customAudioElement.loop = true;
        this.customAudioElement.volume = this.ambienceVolume;
        this.customAudioElement.play().catch(err => {
            console.error('Custom audio play error:', err);
        });
    },

    removeCustomAudio: function () {
        this.customAudioFile = null;

        if (this.customAudioElement) {
            this.customAudioElement.pause();
            this.customAudioElement = null;
        }

        if (this.ambienceMode === 'custom') {
            this.setAmbience('off');
        } else {
            this.syncAmbienceUI();
        }

        const input = document.getElementById('focus-custom-audio-input');
        if (input) input.value = '';
    },

    createNoiseSource: function () {
        const bufferSize = 2 * this.audioCtx.sampleRate;
        const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.audioCtx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;
        return noise;
    },

    buildRainAmbience: function () {
        const noise = this.createNoiseSource();
        const hp = this.audioCtx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 850;

        const lp = this.audioCtx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 4200;

        const gain = this.audioCtx.createGain();
        gain.gain.value = 0.18;

        noise.connect(hp);
        hp.connect(lp);
        lp.connect(gain);
        gain.connect(this.ambienceGain);
        noise.start();

        this.registerAmbienceNode(noise);
        this.registerAmbienceNode(hp);
        this.registerAmbienceNode(lp);
        this.registerAmbienceNode(gain);

        const droplets = setInterval(() => {
            if (!this.audioCtx || this.ambienceMode !== 'rain') return;

            const osc = this.audioCtx.createOscillator();
            const og = this.audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = 900 + Math.random() * 800;
            og.gain.value = 0.001;
            og.gain.linearRampToValueAtTime(0.03, this.audioCtx.currentTime + 0.015);
            og.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.22);
            osc.connect(og);
            og.connect(this.ambienceGain);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.22);

            this.registerAmbienceNode(osc);
            this.registerAmbienceNode(og);
        }, 420);

        this.registerAmbienceInterval(droplets);
    },

    buildCafeAmbience: function () {
        const noise = this.createNoiseSource();
        const band = this.audioCtx.createBiquadFilter();
        band.type = 'bandpass';
        band.frequency.value = 420;
        band.Q.value = 0.7;

        const lp = this.audioCtx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1400;

        const noiseGain = this.audioCtx.createGain();
        noiseGain.gain.value = 0.12;

        noise.connect(band);
        band.connect(lp);
        lp.connect(noiseGain);
        noiseGain.connect(this.ambienceGain);
        noise.start();

        this.registerAmbienceNode(noise);
        this.registerAmbienceNode(band);
        this.registerAmbienceNode(lp);
        this.registerAmbienceNode(noiseGain);

        const hum1 = this.audioCtx.createOscillator();
        const hum2 = this.audioCtx.createOscillator();
        const humGain = this.audioCtx.createGain();
        hum1.type = 'sine';
        hum2.type = 'sine';
        hum1.frequency.value = 180;
        hum2.frequency.value = 235;
        humGain.gain.value = 0.013;
        hum1.connect(humGain);
        hum2.connect(humGain);
        humGain.connect(this.ambienceGain);
        hum1.start();
        hum2.start();

        this.registerAmbienceNode(hum1);
        this.registerAmbienceNode(hum2);
        this.registerAmbienceNode(humGain);
    },

    buildDeepAmbience: function () {
        const root = this.audioCtx.createOscillator();
        const harmonic = this.audioCtx.createOscillator();
        const mix = this.audioCtx.createGain();
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 520;

        root.type = 'sine';
        harmonic.type = 'triangle';
        root.frequency.value = 98;
        harmonic.frequency.value = 196;

        mix.gain.value = 0.032;

        root.connect(mix);
        harmonic.connect(mix);
        mix.connect(filter);
        filter.connect(this.ambienceGain);

        root.start();
        harmonic.start();

        this.registerAmbienceNode(root);
        this.registerAmbienceNode(harmonic);
        this.registerAmbienceNode(mix);
        this.registerAmbienceNode(filter);

        const motion = setInterval(() => {
            if (!this.audioCtx || this.ambienceMode !== 'deep') return;
            const now = this.audioCtx.currentTime;
            const drift = (Math.random() * 1.8) - 0.9;
            root.frequency.setTargetAtTime(98 + drift, now, 1.5);
            harmonic.frequency.setTargetAtTime((98 + drift) * 2, now, 1.5);
        }, 1400);

        this.registerAmbienceInterval(motion);
    },


    renderTaskSelector: function () {
        const container = document.getElementById('focus-task-selector');
        if (!container) return;

        container.innerHTML = '';

        // Get active tasks
        const allTasks = Storage.getTasks ? Storage.getTasks() : [];
        const activeSemester = typeof profileManager !== 'undefined' ? String(profileManager.profile.semester || 1) : '1';
        const activeTasks = allTasks.filter(t => {
            const tSem = String(t.semester || 1);
            return tSem === activeSemester && !t.completed;
        });

        if (activeTasks.length === 0) {
            container.innerHTML = '<p style="font-size:0.85rem; color:var(--text-muted); text-align:center;">' + (i18n.t('tasks_empty_active') || 'No active tasks').replace('{semester}', activeSemester) + '</p>';
            return;
        }

        const select = document.createElement('select');
        select.id = 'focus-task-select';
        select.style.width = '100%';
        select.style.padding = '0.75rem';
        select.style.borderRadius = 'var(--radius-md)';
        select.style.border = '1px solid var(--border-color)';
        select.style.background = 'var(--bg-card)';
        select.style.color = 'var(--text-main)';
        select.style.fontSize = '0.9rem';

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.innerText = i18n.t('focus_select_task') || 'Select Task (Optional)';
        select.appendChild(defaultOption);

        activeTasks.forEach(task => {
            const option = document.createElement('option');
            option.value = task.id;
            option.innerText = task.title + (task.courseName ? ` (${task.courseName})` : '');
            select.appendChild(option);
        });

        select.value = this.currentTaskId || '';
        select.addEventListener('change', (e) => {
            this.currentTaskId = e.target.value || null;
        });

        container.appendChild(select);
    },

    setMode: function (mode) {
        if (this.isRunning) {
            if (!confirm(i18n.t('focus_switch_confirm'))) return;
            this.pauseTimer();
        }

        this.mode = mode;
        this.totalDuration = mode === 'work' ? this.workDuration : this.breakDuration;
        this.timeLeft = this.totalDuration;

        document.getElementById('btn-focus-work').style.background = mode === 'work' ? 'var(--primary)' : 'transparent';
        document.getElementById('btn-focus-work').style.color = mode === 'work' ? 'white' : 'var(--primary)';

        document.getElementById('btn-focus-break').style.background = mode === 'break' ? 'var(--success)' : 'transparent';
        document.getElementById('btn-focus-break').style.color = mode === 'break' ? 'white' : 'var(--success)';
        document.getElementById('btn-focus-break').style.borderColor = mode === 'break' ? 'var(--success)' : 'var(--primary)';

        const statusEl = document.getElementById('pomodoro-status');
        statusEl.innerText = mode === 'work' ? i18n.t('focus_status_work') : i18n.t('focus_status_break');
        statusEl.style.color = mode === 'work' ? 'var(--primary)' : 'var(--success)';

        this.updateTimerVisualState();
        this.updateTimerDisplay();
    },

    toggleTimer: function () {
        if (this.isRunning) {
            this.pauseTimer();
        } else {
            this.startTimer();
        }
    },

    startTimer: function () {
        if (this.timeLeft <= 0) this.resetTimer();

        this.isRunning = true;
        document.getElementById('btn-focus-toggle').innerHTML = '<i class="ph ph-pause"></i>';
        this.updateTimerVisualState();
        this.enterFullscreenMode();

        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();

            if (this.timeLeft <= 0) {
                this.completeSession();
            }
        }, 1000);
    },

    pauseTimer: function () {
        this.isRunning = false;
        clearInterval(this.timerInterval);
        document.getElementById('btn-focus-toggle').innerHTML = '<i class="ph ph-play"></i>';
        this.updateTimerVisualState();

        const fsPauseBtn = document.getElementById('focus-fullscreen-btn-pause');
        if (fsPauseBtn) {
            fsPauseBtn.innerHTML = `<i class="ph ph-play"></i><span>${i18n.t('focus_resume')}</span>`;
        }
    },

    resetTimer: function () {
        this.pauseTimer();
        this.totalDuration = this.mode === 'work' ? this.workDuration : this.breakDuration;
        this.timeLeft = this.totalDuration;
        this.updateTimerDisplay();
    },

    updateTimerDisplay: function () {
        const mins = Math.floor(this.timeLeft / 60);
        const secs = this.timeLeft % 60;
        const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        document.getElementById('pomodoro-timer').innerText = timeStr;

        const fullscreenTimer = document.getElementById('focus-fullscreen-timer');
        if (fullscreenTimer) fullscreenTimer.innerText = timeStr;

        this.updateProgressRing();
        this.updateFullscreenProgressRing();
    },

    updateProgressRing: function () {
        const ring = document.getElementById('focus-progress-bar');
        if (!ring) return;

        const radius = 96;
        const circumference = 2 * Math.PI * radius;
        const safeTotal = this.totalDuration > 0 ? this.totalDuration : 1;
        const progress = Math.max(0, Math.min(1, this.timeLeft / safeTotal));
        ring.style.strokeDasharray = `${circumference}`;
        ring.style.strokeDashoffset = `${circumference * (1 - progress)}`;
    },

    updateTimerVisualState: function () {
        const container = document.querySelector('.pomodoro-container');
        if (!container) return;

        container.classList.toggle('is-running', this.isRunning);
        container.classList.toggle('is-break', this.mode === 'break');
    },

    completeSession: function () {
        this.pauseTimer();
        this.exitFullscreenMode();

        // Play simple notification sound natively
        if ('Notification' in window && Notification.permission === "granted") {
            new Notification(i18n.t('focus_notification_title'), { body: this.mode === 'work' ? i18n.t('focus_notification_work_done') : i18n.t('focus_notification_break_done') });
        } else if ('Notification' in window && Notification.permission !== "denied") {
            Notification.requestPermission();
        }

        const sessionWasWork = this.mode === 'work';
        if (sessionWasWork) {
            this.recordSession();
            this.setMode('break');
        } else {
            this.setMode('work');
        }

        // Removed the showSessionSummary modal per user request
        // this.withAmbienceDucking(() => {
        //     this.showSessionSummary(sessionWasWork);
        // });
    },

    recordSession: function () {
        const today = new Date().toISOString().split('T')[0];
        const workMinutes = Math.round(this.workDuration / 60);
        let todayStat = this.stats.find(s => s.date === today);

        if (todayStat) {
            todayStat.sessions += 1;
            todayStat.totalMinutes += workMinutes;
        } else {
            this.stats.push({
                date: today,
                sessions: 1,
                totalMinutes: workMinutes
            });
        }

        Storage.setFocusStats(this.stats);

        // Save focus session with task linkage
        if (this.currentTaskId) {
            this.focusSessions.push({
                id: uuidv4(),
                taskId: this.currentTaskId,
                date: new Date().toISOString(),
                duration: workMinutes, // minutes
                completed: true
            });
        } else {
            // Even without task linkage, save the session for streak tracking
            this.focusSessions.push({
                id: uuidv4(),
                taskId: null,
                date: new Date().toISOString(),
                duration: workMinutes, // minutes
                completed: true
            });
        }
        Storage.setFocusSessions(this.focusSessions);

        this.updateStatsUI();

        // Update profile dashboard if profileManager is available
        if (typeof profileManager !== 'undefined' && profileManager.updateDashboardStats) {
            profileManager.updateDashboardStats();
        }

        this.renderTaskSelector(); // Refresh in case tasks changed
    },

    updateStats: function () {
        this.stats = Storage.getFocusStats();
        this.focusSessions = Storage.getFocusSessions();
        this.updateStatsUI();
    },

    updateStatsUI: function () {
        const today = new Date().toISOString().split('T')[0];
        const todayStat = this.stats.find(s => s.date === today) || { sessions: 0, totalMinutes: 0 };

        const sessionsEl = document.getElementById('stats-sessions');
        const minutesEl = document.getElementById('stats-minutes');

        if (sessionsEl) sessionsEl.innerText = todayStat.sessions;
        if (minutesEl) minutesEl.innerText = todayStat.totalMinutes;
    },

    enterFullscreenMode: function () {
        const overlay = document.getElementById('focus-fullscreen-overlay');
        if (!overlay) return;

        overlay.classList.add('active');

        // Sync mode badge
        const badge = document.getElementById('focus-fullscreen-mode-badge');
        if (badge) {
            badge.classList.toggle('is-break', this.mode === 'break');
            const icon = this.mode === 'work' ? 'ph-brain' : 'ph-coffee';
            const text = this.mode === 'work' ? i18n.t('focus_status_work') : i18n.t('focus_status_break');
            badge.innerHTML = `<i class="ph ${icon}"></i><span>${text}</span>`;
        }

        // Sync ambience info
        this.updateFullscreenAmbienceDisplay();

        // Sync timer and progress
        this.updateTimerDisplay();

        // Sync pause button
        const pauseBtn = document.getElementById('focus-fullscreen-btn-pause');
        if (pauseBtn) {
            const icon = this.isRunning ? 'ph-pause' : 'ph-play';
            const text = this.isRunning ? i18n.t('focus_pause') : i18n.t('focus_resume');
            pauseBtn.innerHTML = `<i class="ph ${icon}"></i><span>${text}</span>`;
        }

        this.syncFullscreenMusicButton();
    },

    exitFullscreenMode: function () {
        const overlay = document.getElementById('focus-fullscreen-overlay');
        if (overlay) overlay.classList.remove('active');
    },

    stopAndExitFullscreen: function () {
        if (confirm(i18n.t('focus_stop_confirm') || 'Stop timer?')) {
            this.resetTimer();
            this.exitFullscreenMode();
        }
    },

    stopAndExit: function () {
        this.stopAndExitFullscreen();
    },

    updateFullscreenProgressRing: function () {
        const ring = document.getElementById('focus-fullscreen-progress-bar');
        if (!ring) return;

        const radius = 145;
        const circumference = 2 * Math.PI * radius;
        const safeTotal = this.totalDuration > 0 ? this.totalDuration : 1;
        const progress = Math.max(0, Math.min(1, this.timeLeft / safeTotal));
        ring.style.strokeDasharray = `${circumference}`;
        ring.style.strokeDashoffset = `${circumference * (1 - progress)}`;
    },

    updateFullscreenAmbienceDisplay: function () {
        const ambiencePanel = document.getElementById('focus-fullscreen-ambience');
        if (!ambiencePanel) return;

        if (this.ambienceMode === 'off') {
            ambiencePanel.classList.add('hidden');
            return;
        }

        ambiencePanel.classList.remove('hidden');

        const nameEl = document.getElementById('focus-fullscreen-ambience-name');
        if (!nameEl) return;

        let displayName = i18n.t('focus_ambience_off');
        if (this.ambienceMode === 'rain') displayName = i18n.t('focus_ambience_rain');
        if (this.ambienceMode === 'cafe') displayName = i18n.t('focus_ambience_cafe');
        if (this.ambienceMode === 'deep') displayName = i18n.t('focus_ambience_deep');
        if (this.ambienceMode === 'custom' && this.customAudioFile) {
            displayName = this.customAudioFile.name;
        }

        nameEl.innerText = displayName;
        this.syncFullscreenMusicButton();
    },

    toggleFullscreenMusic: function () {
        if (this.ambienceMode === 'off') {
            const modeToRestore = this.ambienceBeforeMute || (this.customAudioFile ? 'custom' : 'rain');
            this.setAmbience(modeToRestore);
        } else {
            this.ambienceBeforeMute = this.ambienceMode;
            this.setAmbience('off');
        }
    },

    syncFullscreenMusicButton: function () {
        const btn = document.getElementById('focus-fullscreen-btn-music');
        if (!btn) return;

        const isOff = this.ambienceMode === 'off';
        btn.classList.toggle('is-off', isOff);

        const icon = isOff ? 'ph-speaker-slash' : 'ph-speaker-high';
        const text = isOff ? i18n.t('focus_fullscreen_music_on') : i18n.t('focus_fullscreen_music_off');
        btn.innerHTML = `<i class="ph ${icon}"></i><span>${text}</span>`;
    },


};
