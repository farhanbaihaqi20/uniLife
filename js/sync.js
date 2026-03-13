const syncManager = {
    peer: null,
    connection: null,
    pin: '',
    prefix: 'unilife-sync-',

    init: function () {
        // Check if there is a receive parameter in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const receivePin = urlParams.get('receive');
        
        if (receivePin && receivePin.length === 6) {
            // Remove parameter from URL without reloading
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Wait a bit for UI to load, then open modal with the PIN
            setTimeout(() => {
                const input = document.getElementById('transfer-pin-input');
                if (input) input.value = receivePin;
                
                const modal = document.getElementById('modal-transfer');
                if (modal) modal.classList.add('active');
                
                this.receiveData(receivePin);
            }, 1000);
        }
    },

    generatePIN: function () {
        return Math.floor(100000 + Math.random() * 900000).toString();
    },

    hasQRCodeSupport: function () {
        return typeof window.QRCode === 'function' ||
            (window.QRCode && typeof window.QRCode.toCanvas === 'function');
    },

    loadScriptOnce: function (src) {
        return new Promise((resolve, reject) => {
            const alreadyLoaded = Array.from(document.scripts).some((s) => s.src === src);
            if (alreadyLoaded) {
                resolve(true);
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = () => resolve(true);
            script.onerror = () => reject(new Error('Failed to load script: ' + src));
            document.head.appendChild(script);
        });
    },

    ensureQRCodeLibrary: async function () {
        if (this.hasQRCodeSupport()) return true;

        const candidates = [
            'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js',
            'https://unpkg.com/qrcodejs@1.0.0/qrcode.min.js'
        ];

        for (const src of candidates) {
            try {
                await this.loadScriptOnce(src);
                if (this.hasQRCodeSupport()) return true;
            } catch (error) {
                console.warn(error.message);
            }
        }

        return this.hasQRCodeSupport();
    },

    renderQRCode: function (qrContainer, text, size = 200) {
        if (!qrContainer) return false;

        qrContainer.innerHTML = '';

        if (typeof window.QRCode === 'function') {
            new window.QRCode(qrContainer, {
                text,
                width: size,
                height: size,
                colorDark: '#0F172A',
                colorLight: '#ffffff',
                correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.H : undefined
            });
            return true;
        }

        if (window.QRCode && typeof window.QRCode.toCanvas === 'function') {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            qrContainer.appendChild(canvas);
            window.QRCode.toCanvas(canvas, text, {
                width: size,
                errorCorrectionLevel: 'H',
                color: {
                    dark: '#0F172A',
                    light: '#ffffff'
                }
            }, (err) => {
                if (err) {
                    console.error('Failed to render QR canvas:', err);
                }
            });
            return true;
        }

        return false;
    },

    openTransferModal: async function () {
        this.pin = this.generatePIN();
        const modal = document.getElementById('modal-transfer');
        const pinDisplay = document.getElementById('transfer-pin-display');
        const qrContainer = document.getElementById('transfer-qr-container');
        const statusContainer = document.getElementById('transfer-status-container');
        const statusText = document.getElementById('transfer-status-text');
        const statusIcon = document.getElementById('transfer-status-icon');
        
        if (pinDisplay) pinDisplay.innerText = this.pin;
        if (statusContainer) statusContainer.style.display = 'block';
        if (statusText) statusText.innerText = i18n.t('transfer_status_waiting') || 'Menunggu koneksi dari penerima...';
        if (statusIcon) statusIcon.className = 'ph ph-spinner ph-spin';
        
        // Generate QR Code
        if (qrContainer) {
            const receiveUrl = window.location.origin + window.location.pathname + '?receive=' + this.pin;
            const libraryReady = await this.ensureQRCodeLibrary();
            const rendered = libraryReady && this.renderQRCode(qrContainer, receiveUrl, 200);

            if (!rendered) {
                qrContainer.innerHTML = '<p style="margin:0 0 0.5rem 0;color:var(--danger);font-size:0.85rem;">QR gagal dimuat. Gunakan PIN di bawah ini.</p>';
            }
        }

        // Initialize Peer (Sender)
        this.initSender();

        if (modal) modal.classList.add('active');
    },

    closeTransferModal: function () {
        const modal = document.getElementById('modal-transfer');
        if (modal) modal.classList.remove('active');
        
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        if (this.connection) {
            this.connection.close();
            this.connection = null;
        }
        
        const statusContainer = document.getElementById('transfer-status-container');
        if (statusContainer) statusContainer.style.display = 'none';
        
        const input = document.getElementById('transfer-pin-input');
        if (input) input.value = '';
    },

    initSender: function () {
        try {
            if (typeof Peer !== 'function') {
                const statusText = document.getElementById('transfer-status-text');
                const statusIcon = document.getElementById('transfer-status-icon');
                if (statusText) statusText.innerText = 'PeerJS tidak tersedia. Cek koneksi internet atau muat ulang halaman.';
                if (statusIcon) statusIcon.className = 'ph ph-warning-circle';
                if (statusIcon) statusIcon.style.color = 'var(--danger)';
                return;
            }

            if (this.peer) this.peer.destroy();
            
            this.peer = new Peer(this.prefix + this.pin);
            
            this.peer.on('open', (id) => {
                console.log('Sender Peer ID is: ' + id);
            });
            
            this.peer.on('connection', (conn) => {
                this.connection = conn;
                
                const statusText = document.getElementById('transfer-status-text');
                const statusIcon = document.getElementById('transfer-status-icon');
                
                if (statusText) statusText.innerText = i18n.t('transfer_status_connected') || 'Perangkat terhubung! Mengirim data...';
                if (statusIcon) statusIcon.className = 'ph ph-check-circle';
                
                this.connection.on('open', () => {
                    // Send all localStorage data
                    const data = {};
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        data[key] = localStorage.getItem(key);
                    }
                    
                    this.connection.send({ type: 'sync-data', payload: data });
                    
                    setTimeout(() => {
                        if (statusText) statusText.innerText = i18n.t('transfer_status_sent') || 'Transfer selesai!';
                        if (statusIcon) statusIcon.className = 'ph ph-check-circle';
                        if (statusIcon) statusIcon.style.color = 'var(--success)';
                        setTimeout(() => this.closeTransferModal(), 3000);
                    }, 1000);
                });
            });
            
            this.peer.on('error', (err) => {
                console.error('PeerJS error:', err);
                const statusText = document.getElementById('transfer-status-text');
                const statusIcon = document.getElementById('transfer-status-icon');
                if (statusText) statusText.innerText = 'Error: ' + err.type;
                if (statusIcon) statusIcon.className = 'ph ph-warning-circle';
                if (statusIcon) statusIcon.style.color = 'var(--danger)';
            });
        } catch (error) {
            console.error('Failed to init PeerJS:', error);
        }
    },

    receiveData: function (overridePin = null) {
        let pinInput = overridePin;
        if (!pinInput) {
            const inputEl = document.getElementById('transfer-pin-input');
            pinInput = inputEl ? inputEl.value.trim() : '';
        }
        
        if (!pinInput || pinInput.length !== 6) {
            alert(i18n.t('transfer_error_pin') || 'Silakan masukkan 6 digit PIN yang valid.');
            return;
        }

        const statusContainer = document.getElementById('transfer-status-container');
        const statusText = document.getElementById('transfer-status-text');
        const statusIcon = document.getElementById('transfer-status-icon');
        
        if (statusContainer) statusContainer.style.display = 'block';
        if (statusText) statusText.innerText = i18n.t('transfer_status_connecting') || 'Menghubungkan ke pengirim...';
        if (statusIcon) statusIcon.className = 'ph ph-spinner ph-spin';

        try {
            if (typeof Peer !== 'function') {
                if (statusText) statusText.innerText = 'PeerJS tidak tersedia. Cek koneksi internet atau muat ulang halaman.';
                if (statusIcon) statusIcon.className = 'ph ph-warning-circle';
                if (statusIcon) statusIcon.style.color = 'var(--danger)';
                return;
            }

            if (this.peer) this.peer.destroy();
            
            // Receiver does not need a specific ID
            this.peer = new Peer();
            
            this.peer.on('open', (id) => {
                console.log('Receiver Peer ID is: ' + id);
                this.connection = this.peer.connect(this.prefix + pinInput);
                
                this.connection.on('open', () => {
                    if (statusText) statusText.innerText = i18n.t('transfer_status_receiving') || 'Terhubung! Menerima data...';
                    if (statusIcon) statusIcon.className = 'ph ph-download-simple';
                });
                
                this.connection.on('data', (data) => {
                    if (data && data.type === 'sync-data' && data.payload) {
                        if (confirm(i18n.t('transfer_confirm_override') || 'Data diterima. Apakah Anda yakin ingin menimpa seluruh data di perangkat ini?')) {
                            
                            localStorage.clear();
                            const payload = data.payload;
                            for (const key in payload) {
                                if (Object.prototype.hasOwnProperty.call(payload, key)) {
                                    localStorage.setItem(key, payload[key]);
                                }
                            }
                            
                            if (statusText) statusText.innerText = i18n.t('transfer_status_success') || 'Berhasil! Memuat ulang aplikasi...';
                            if (statusIcon) statusIcon.className = 'ph ph-check-circle';
                            if (statusIcon) statusIcon.style.color = 'var(--success)';
                            
                            setTimeout(() => {
                                window.location.reload();
                            }, 1500);
                        } else {
                            if (statusText) statusText.innerText = i18n.t('transfer_status_cancelled') || 'Transfer dibatalkan.';
                            if (statusIcon) statusIcon.className = 'ph ph-x-circle';
                            setTimeout(() => this.closeTransferModal(), 2000);
                        }
                    }
                });
                
                this.connection.on('error', (err) => {
                    console.error('Connection error:', err);
                    if (statusText) statusText.innerText = 'Koneksi gagal. Pastikan PIN benar dan pengirim masih membuka aplikasi.';
                    if (statusIcon) statusIcon.className = 'ph ph-warning-circle';
                    if (statusIcon) statusIcon.style.color = 'var(--danger)';
                });
            });
            
            this.peer.on('error', (err) => {
                console.error('PeerJS error:', err);
                if (statusText) statusText.innerText = 'Peer Error: ' + err.type;
                if (statusIcon) statusIcon.className = 'ph ph-warning-circle';
                if (statusIcon) statusIcon.style.color = 'var(--danger)';
            });
            
        } catch (error) {
            console.error('Failed to init PeerJS Receiver:', error);
            if (statusText) statusText.innerText = 'Gagal inisialisasi PeerJS.';
            if (statusIcon) statusIcon.className = 'ph ph-warning-circle';
        }
    }
};

// Expose manager for inline onclick handlers in index.html
window.syncManager = syncManager;

// Initialize after DOM load
document.addEventListener('DOMContentLoaded', () => {
    syncManager.init();
});
