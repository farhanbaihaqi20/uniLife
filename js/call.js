// UniLife — Peer-to-Peer Call Manager (PeerJS)
// Supports: Voice, Video, Screen Share
// Manual connect: share Peer ID or scan QR code

const callManager = {
    peer: null,
    myPeerId: null,
    currentCall: null,
    localStream: null,
    remoteStream: null,
    callMode: null,      // 'voice' | 'video' | 'screen'
    isMuted: false,
    isCamOff: false,
    isOpen: false,

    // ─── Init ─────────────────────────────────────────────────────────────────
    init: function () {
        this._injectUI();
        this._bindPanelEvents();
    },

    // ─── Connect to PeerJS ────────────────────────────────────────────────────
    _connectPeer: function (onReady) {
        if (this.peer && !this.peer.destroyed) {
            onReady(this.myPeerId);
            return;
        }
        this._setStatus('connecting');

        const id = this._getSavedId();
        this.peer = id ? new Peer(id) : new Peer();

        this.peer.on('open', (id) => {
            this.myPeerId = id;
            this._savePeerId(id);
            this._setStatus('ready');
            this._renderMyId(id);
            onReady(id);
        });

        this.peer.on('error', (err) => {
            // If ID is taken/unavailable, reconnect with a fresh ID
            if (err.type === 'unavailable-id' || err.type === 'invalid-id') {
                this._clearSavedId();
                this.peer.destroy();
                this.peer = null;
                this._connectPeer(onReady);
                return;
            }
            this._setStatus('error');
            this._showToast('Koneksi gagal: ' + err.message, 'error');
        });

        this.peer.on('call', (call) => {
            this._handleIncomingCall(call);
        });

        this.peer.on('disconnected', () => {
            this._setStatus('disconnected');
        });

        this.peer.on('close', () => {
            this.peer = null;
            this.myPeerId = null;
        });
    },

    // ─── Start a call ─────────────────────────────────────────────────────────
    startCall: async function (mode) {
        const remotePeerId = document.getElementById('call-remote-id')?.value?.trim();
        if (!remotePeerId) {
            this._showToast('Masukkan Peer ID teman terlebih dahulu', 'warning');
            return;
        }
        if (remotePeerId === this.myPeerId) {
            this._showToast('Tidak bisa menghubungi diri sendiri', 'warning');
            return;
        }

        this.callMode = mode;
        this._setStatus('calling');

        try {
            const stream = await this._getStream(mode);
            this.localStream = stream;
            this._attachLocalStream(stream, mode);

            const call = this.peer.call(remotePeerId, stream, {
                metadata: { mode }
            });
            this.currentCall = call;
            this._bindCallEvents(call);
        } catch (err) {
            this._setStatus('ready');
            this._showToast('Gagal mendapatkan media: ' + err.message, 'error');
        }
    },

    // ─── Incoming call ────────────────────────────────────────────────────────
    _handleIncomingCall: function (call) {
        const mode = call.metadata?.mode || 'voice';

        // Show incoming call UI
        this._showIncomingCall(call.peer, mode, async () => {
            // Accept
            try {
                const stream = await this._getStream(mode);
                this.localStream = stream;
                this.callMode = mode;
                this.currentCall = call;
                this._attachLocalStream(stream, mode);
                call.answer(stream);
                this._bindCallEvents(call);
                this._openCallScreen(mode);
            } catch (err) {
                this._showToast('Gagal mengakses media: ' + err.message, 'error');
                call.close();
            }
        }, () => {
            // Reject — answer with empty then immediately close
            call.close();
        });
    },

    // ─── Bind call events ─────────────────────────────────────────────────────
    _bindCallEvents: function (call) {
        call.on('stream', (remoteStream) => {
            this.remoteStream = remoteStream;
            this._attachRemoteStream(remoteStream, this.callMode);
            this._setStatus('in-call');
            this._openCallScreen(this.callMode);
        });

        call.on('close', () => {
            this._endCall(false);
        });

        call.on('error', (err) => {
            this._showToast('Error saat panggilan: ' + err.message, 'error');
            this._endCall(false);
        });
    },

    // ─── Get media stream ─────────────────────────────────────────────────────
    _getStream: async function (mode) {
        if (mode === 'screen') {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            return screenStream;
        }
        if (mode === 'video') {
            return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        }
        // voice only
        return await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    },

    // ─── End call ─────────────────────────────────────────────────────────────
    endCall: function () {
        this._endCall(true);
    },

    _endCall: function (local) {
        if (this.currentCall) {
            this.currentCall.close();
            this.currentCall = null;
        }
        if (this.localStream) {
            this.localStream.getTracks().forEach(t => t.stop());
            this.localStream = null;
        }
        this.remoteStream = null;

        const localVideo = document.getElementById('call-local-video');
        const remoteVideo = document.getElementById('call-remote-video');
        const remoteAudio = document.getElementById('call-remote-audio');
        if (localVideo) localVideo.srcObject = null;
        if (remoteVideo) remoteVideo.srcObject = null;
        if (remoteAudio) remoteAudio.srcObject = null;

        this.isMuted = false;
        this.isCamOff = false;
        this._setStatus('ready');
        this._closeCallScreen();
        if (local) this._showToast('Panggilan diakhiri', 'info');
    },

    // ─── Toggle mute ──────────────────────────────────────────────────────────
    toggleMute: function () {
        if (!this.localStream) return;
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (!audioTrack) return;
        this.isMuted = !this.isMuted;
        audioTrack.enabled = !this.isMuted;
        const btn = document.getElementById('call-btn-mute');
        if (btn) {
            btn.innerHTML = this.isMuted
                ? '<i class="ph ph-microphone-slash"></i>'
                : '<i class="ph ph-microphone"></i>';
            btn.classList.toggle('active', this.isMuted);
        }
    },

    // ─── Toggle camera ────────────────────────────────────────────────────────
    toggleCamera: function () {
        if (!this.localStream) return;
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (!videoTrack) return;
        this.isCamOff = !this.isCamOff;
        videoTrack.enabled = !this.isCamOff;
        const btn = document.getElementById('call-btn-cam');
        if (btn) {
            btn.innerHTML = this.isCamOff
                ? '<i class="ph ph-video-camera-slash"></i>'
                : '<i class="ph ph-video-camera"></i>';
            btn.classList.toggle('active', this.isCamOff);
        }
    },

    // ─── Attach streams ───────────────────────────────────────────────────────
    _attachLocalStream: function (stream, mode) {
        const video = document.getElementById('call-local-video');
        if (video && (mode === 'video' || mode === 'screen')) {
            video.srcObject = stream;
        }
    },

    _attachRemoteStream: function (stream, mode) {
        if (mode === 'voice') {
            const audio = document.getElementById('call-remote-audio');
            if (audio) { audio.srcObject = stream; audio.play().catch(() => {}); }
        } else {
            const video = document.getElementById('call-remote-video');
            if (video) { video.srcObject = stream; video.play().catch(() => {}); }
        }
    },

    // ─── UI helpers ───────────────────────────────────────────────────────────
    open: function () {
        this.isOpen = true;
        const modal = document.getElementById('call-modal');
        if (modal) modal.classList.add('active');
        this._connectPeer(() => {});
    },

    close: function () {
        if (this.currentCall) {
            this._showToast('Akhiri panggilan terlebih dahulu', 'warning');
            return;
        }
        this.isOpen = false;
        const modal = document.getElementById('call-modal');
        if (modal) modal.classList.remove('active');
    },

    _openCallScreen: function (mode) {
        const lobby = document.getElementById('call-lobby');
        const screen = document.getElementById('call-screen');
        const localVideo = document.getElementById('call-local-video');
        const remoteVideo = document.getElementById('call-remote-video');
        const btnCam = document.getElementById('call-btn-cam');

        if (lobby) lobby.style.display = 'none';
        if (screen) screen.style.display = 'flex';

        const isVideo = mode === 'video' || mode === 'screen';
        if (localVideo) localVideo.style.display = isVideo ? 'block' : 'none';
        if (remoteVideo) remoteVideo.style.display = isVideo ? 'block' : 'none';
        if (btnCam) btnCam.style.display = isVideo ? 'flex' : 'none';

        // Update screen title
        const title = document.getElementById('call-screen-title');
        if (title) {
            const labels = { voice: 'Panggilan Suara', video: 'Panggilan Video', screen: 'Berbagi Layar' };
            title.textContent = labels[mode] || 'Panggilan';
        }
    },

    _closeCallScreen: function () {
        const lobby = document.getElementById('call-lobby');
        const screen = document.getElementById('call-screen');
        if (lobby) lobby.style.display = 'flex';
        if (screen) screen.style.display = 'none';
    },

    _renderMyId: function (id) {
        const idEl = document.getElementById('call-my-id');
        if (idEl) idEl.textContent = id;

        // QR code
        const qrEl = document.getElementById('call-qr');
        if (qrEl && typeof QRCode !== 'undefined') {
            qrEl.innerHTML = '';
            try {
                QRCode.toCanvas(id, { width: 120, margin: 1, color: { dark: '#000', light: '#fff' } }, (err, canvas) => {
                    if (!err && canvas) qrEl.appendChild(canvas);
                });
            } catch (e) { /* QRCode not available */ }
        }
    },

    _setStatus: function (status) {
        const el = document.getElementById('call-status-dot');
        const txt = document.getElementById('call-status-text');
        const labels = {
            connecting: ['yellow', 'Menghubungkan...'],
            ready: ['green', 'Siap'],
            calling: ['yellow', 'Memanggil...'],
            'in-call': ['green', 'Dalam Panggilan'],
            error: ['red', 'Error'],
            disconnected: ['red', 'Terputus'],
        };
        const [color, text] = labels[status] || ['gray', ''];
        if (el) el.style.background = { yellow: '#FBBF24', green: '#10B981', red: '#EF4444', gray: '#9CA3AF' }[color];
        if (txt) txt.textContent = text;

        // Disable call buttons when not ready/disconnected
        ['call-btn-voice', 'call-btn-video', 'call-btn-screen'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = !['ready', 'in-call'].includes(status);
        });
    },

    _showIncomingCall: function (peerId, mode, onAccept, onReject) {
        const modeLabel = { voice: 'Suara', video: 'Video', screen: 'Berbagi Layar' }[mode] || mode;
        const overlay = document.getElementById('call-incoming-overlay');
        const peerEl = document.getElementById('call-incoming-peer');
        const modeEl = document.getElementById('call-incoming-mode');
        if (!overlay) return;

        if (peerEl) peerEl.textContent = peerId;
        if (modeEl) modeEl.textContent = modeLabel;
        overlay.classList.add('active');

        const acceptBtn = document.getElementById('call-incoming-accept');
        const rejectBtn = document.getElementById('call-incoming-reject');

        const cleanup = () => { overlay.classList.remove('active'); };

        if (acceptBtn) {
            acceptBtn.onclick = () => { cleanup(); onAccept(); };
        }
        if (rejectBtn) {
            rejectBtn.onclick = () => { cleanup(); onReject(); };
        }

        // Auto-reject after 30s
        setTimeout(() => {
            if (overlay.classList.contains('active')) {
                cleanup();
                onReject();
            }
        }, 30000);
    },

    // ─── Copy peer ID ─────────────────────────────────────────────────────────
    copyMyId: function () {
        if (!this.myPeerId) return;
        navigator.clipboard.writeText(this.myPeerId).then(() => {
            this._showToast('Peer ID disalin!', 'success');
        }).catch(() => {
            this._showToast('Gagal menyalin', 'error');
        });
    },

    // ─── Paste from clipboard ─────────────────────────────────────────────────
    pasteRemoteId: function () {
        navigator.clipboard.readText().then((text) => {
            const input = document.getElementById('call-remote-id');
            if (input) {
                input.value = text.trim();
                this._showToast('ID ditempel', 'success');
            }
        }).catch(() => {
            this._showToast('Izinkan akses clipboard di browser', 'warning');
        });
    },

    // ─── Persistent Peer ID ───────────────────────────────────────────────────
    _getSavedId: function () {
        try { return localStorage.getItem('unilife_peer_id') || null; } catch { return null; }
    },
    _savePeerId: function (id) {
        try { localStorage.setItem('unilife_peer_id', id); } catch {}
    },
    _clearSavedId: function () {
        try { localStorage.removeItem('unilife_peer_id'); } catch {}
    },

    // ─── Toast ────────────────────────────────────────────────────────────────
    _showToast: function (msg, type) {
        const colors = { success: '#10B981', error: '#EF4444', warning: '#F59E0B', info: '#3B82F6' };
        const toast = document.createElement('div');
        toast.className = 'call-toast';
        toast.style.cssText = `background:${colors[type] || colors.info};`;
        toast.textContent = msg;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('visible'));
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 2800);
    },

    // ─── Bind panel button events ─────────────────────────────────────────────
    _bindPanelEvents: function () {
        // Close modal on backdrop click
        const modal = document.getElementById('call-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.close();
            });
        }
    },

    // ─── Inject UI ────────────────────────────────────────────────────────────
    _injectUI: function () {
        if (document.getElementById('call-modal')) return;

        const html = `
        <!-- Call Modal -->
        <div id="call-modal" class="call-modal-overlay">
            <div class="call-modal-box">
                <div class="call-modal-header">
                    <div class="call-header-left">
                        <i class="ph ph-phone-call" style="font-size:1.25rem;color:var(--primary)"></i>
                        <span style="font-weight:700;font-size:1rem;">Panggilan Kelas</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:0.75rem;">
                        <span id="call-status-dot" style="width:8px;height:8px;border-radius:50%;background:#9CA3AF;display:inline-block;"></span>
                        <span id="call-status-text" style="font-size:0.8rem;color:var(--text-muted)">–</span>
                        <button class="icon-btn" onclick="callManager.close()" style="border:none;background:transparent;font-size:1.1rem;color:var(--text-muted)"><i class="ph ph-x"></i></button>
                    </div>
                </div>

                <!-- LOBBY -->
                <div id="call-lobby" class="call-lobby">
                    <!-- My ID -->
                    <div class="call-id-card">
                        <div class="call-id-label"><i class="ph ph-identification-card"></i> Peer ID Kamu</div>
                        <div style="display:flex;align-items:center;gap:0.5rem;">
                            <span id="call-my-id" class="call-id-value">–</span>
                            <button class="call-icon-pill" onclick="callManager.copyMyId()" title="Salin ID">
                                <i class="ph ph-copy"></i>
                            </button>
                        </div>
                        <div id="call-qr" style="margin-top:0.5rem;display:flex;justify-content:center;"></div>
                    </div>

                    <!-- Remote ID input -->
                    <div class="call-section-label">Hubungi Teman</div>
                    <div class="call-input-row">
                        <input id="call-remote-id" class="call-input" type="text" placeholder="Tempel Peer ID teman..." autocomplete="off" autocorrect="off" spellcheck="false" />
                        <button class="call-icon-pill" onclick="callManager.pasteRemoteId()" title="Tempel dari clipboard">
                            <i class="ph ph-clipboard-text"></i>
                        </button>
                    </div>

                    <!-- Call type buttons -->
                    <div class="call-type-row">
                        <button id="call-btn-voice" class="call-type-btn voice" onclick="callManager.startCall('voice')" disabled>
                            <i class="ph ph-microphone"></i>
                            <span>Suara</span>
                        </button>
                        <button id="call-btn-video" class="call-type-btn video" onclick="callManager.startCall('video')" disabled>
                            <i class="ph ph-video-camera"></i>
                            <span>Video</span>
                        </button>
                        <button id="call-btn-screen" class="call-type-btn screen" onclick="callManager.startCall('screen')" disabled>
                            <i class="ph ph-monitor"></i>
                            <span>Layar</span>
                        </button>
                    </div>

                    <p class="call-hint"><i class="ph ph-info"></i> Bagikan <strong>Peer ID</strong> ke teman sekelas. Teman perlu buka panel ini lalu tempel ID kamu untuk menghubungi.</p>
                </div>

                <!-- IN-CALL SCREEN -->
                <div id="call-screen" class="call-screen" style="display:none;">
                    <div id="call-screen-title" class="call-screen-title">Panggilan</div>
                    <div class="call-videos">
                        <video id="call-remote-video" class="call-video remote" autoplay playsinline muted="false"></video>
                        <video id="call-local-video" class="call-video local" autoplay playsinline muted></video>
                    </div>
                    <audio id="call-remote-audio" autoplay style="display:none;"></audio>
                    <div class="call-controls">
                        <button id="call-btn-mute" class="call-ctrl-btn" onclick="callManager.toggleMute()" title="Mute">
                            <i class="ph ph-microphone"></i>
                        </button>
                        <button id="call-btn-cam" class="call-ctrl-btn" onclick="callManager.toggleCamera()" title="Kamera" style="display:none;">
                            <i class="ph ph-video-camera"></i>
                        </button>
                        <button class="call-ctrl-btn end" onclick="callManager.endCall()" title="Tutup">
                            <i class="ph ph-phone-x"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Incoming call overlay -->
        <div id="call-incoming-overlay" class="call-incoming-overlay">
            <div class="call-incoming-box">
                <div class="call-incoming-ring"><i class="ph ph-phone-call"></i></div>
                <div class="call-incoming-info">
                    <div class="call-incoming-mode-label" id="call-incoming-mode">Panggilan Suara</div>
                    <div class="call-incoming-peer-label">dari <strong id="call-incoming-peer">–</strong></div>
                </div>
                <div class="call-incoming-actions">
                    <button id="call-incoming-accept" class="call-incoming-btn accept"><i class="ph ph-phone"></i></button>
                    <button id="call-incoming-reject" class="call-incoming-btn reject"><i class="ph ph-phone-x"></i></button>
                </div>
            </div>
        </div>
        `;

        const div = document.createElement('div');
        div.innerHTML = html;
        document.body.appendChild(div);

        this._bindPanelEvents();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    callManager.init();
});
