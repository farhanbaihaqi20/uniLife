(function () {
    const BBM_KEYS = {
        transactions: 'unilife_bbm_transactions',
        prices: 'unilife_bbm_prices',
        setup: 'unilife_bbm_setup'
    };

    const BBM_DEFAULT_PRICES = {
        pertalite: 10000,
        pertamax: 12300,
        pertamax_green_95: 12900,
        pertamax_turbo: 13100
    };

    const BBM_FUEL_OPTIONS = [
        { key: 'pertalite', label: 'Pertalite' },
        { key: 'pertamax', label: 'Pertamax' },
        { key: 'pertamax_green_95', label: 'Pertamax Green 95' },
        { key: 'pertamax_turbo', label: 'Pertamax Turbo' }
    ];

    const BBM_VEHICLE_LABELS = {
        motor: 'Motor',
        mobil: 'Mobil'
    };

    const BBM_SUBTYPE_LABELS = {
        matic: 'Matic',
        manual: 'Manual',
        sport: 'Sport'
    };

    const bbmManager = {
        initialized: false,
        transactions: [],
        prices: { ...BBM_DEFAULT_PRICES },
        trendChart: null,
        lastReminderSignature: '',
        setup: {
            vehicleType: '',
            vehicleSubtype: '',
            monthlyBudget: 0,
            reminderDays: 14,
            reminderKm: 250,
            setupCompleted: false
        },
        selectedHistoryMonth: '',
        selectedLocationFilter: 'all',
        selectedFuelKey: 'pertalite',

        init: function () {
            if (this.initialized) return;

            this.loadState();
            this.injectSection();
            this.injectHomeEntryPoints();
            this.injectModals();
            this.bindEvents();
            this.renderAll();

            if (!this.setup.setupCompleted) {
                this.openSetupModal();
            }

            this.initialized = true;
        },

        loadState: function () {
            this.transactions = this.readStore(BBM_KEYS.transactions, []);
            this.prices = {
                ...BBM_DEFAULT_PRICES,
                ...this.readStore(BBM_KEYS.prices, {})
            };

            this.setup = {
                vehicleType: '',
                vehicleSubtype: '',
                monthlyBudget: 0,
                reminderDays: 14,
                reminderKm: 250,
                setupCompleted: false,
                ...this.readStore(BBM_KEYS.setup, {})
            };

            this.transactions = this.transactions
                .filter((item) => item && item.id && item.datetime && item.totalBayar)
                .sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

            this.selectedHistoryMonth = this.selectedHistoryMonth || this.getCurrentMonthKey();
            this.selectedLocationFilter = this.selectedLocationFilter || 'all';
        },

        readStore: function (key, fallback) {
            if (typeof Storage !== 'undefined' && typeof Storage.get === 'function') {
                return Storage.get(key, fallback);
            }

            try {
                const raw = localStorage.getItem(key);
                return raw ? JSON.parse(raw) : fallback;
            } catch (error) {
                console.error('BBM read store error', error);
                return fallback;
            }
        },

        writeStore: function (key, value) {
            if (typeof Storage !== 'undefined' && typeof Storage.set === 'function') {
                Storage.set(key, value);
                return;
            }

            try {
                localStorage.setItem(key, JSON.stringify(value));
                window.dispatchEvent(new CustomEvent('unilifeDataChanged', { detail: { key, value } }));
            } catch (error) {
                console.error('BBM write store error', error);
            }
        },

        injectSection: function () {
            if (document.getElementById('bbm-section')) return;

            const section = document.createElement('section');
            section.id = 'bbm-section';
            section.className = 'view-section bbm-section';
            section.innerHTML = `
                <div class="section-header bbm-section-header">
                    <div>
                        <h2 class="bbm-title"><i class="ph ph-gas-pump"></i> BBM Tracker</h2>
                        <p class="bbm-subtitle">Pantau pengeluaran BBM dengan cepat dan rapi.</p>
                    </div>
                    <div class="bbm-header-actions">
                        <button type="button" class="bbm-chip-btn" id="bbm-btn-export-csv">
                            <i class="ph ph-file-csv"></i> CSV
                        </button>
                        <button type="button" class="bbm-chip-btn" id="bbm-btn-backup-json">
                            <i class="ph ph-download-simple"></i> Backup
                        </button>
                        <button type="button" class="bbm-chip-btn" id="bbm-btn-restore-json">
                            <i class="ph ph-arrow-clockwise"></i> Restore
                        </button>
                        <button type="button" class="btn btn-primary bbm-btn-add" id="bbm-btn-open-form">
                            <i class="ph ph-plus"></i> Tambah
                        </button>
                    </div>
                </div>

                <input type="file" id="bbm-restore-input" accept="application/json,.json" style="display:none;">

                <div class="bbm-card bbm-vehicle-card" id="bbm-vehicle-card">
                    <div class="bbm-card-head">
                        <h3>Kendaraan Aktif</h3>
                        <button type="button" class="bbm-chip-btn" id="bbm-btn-open-setup">
                            <i class="ph ph-pencil-simple"></i> Setup Awal
                        </button>
                    </div>
                    <div class="bbm-vehicle-content" id="bbm-vehicle-content"></div>
                </div>

                <div class="bbm-grid-two">
                    <div class="bbm-card">
                        <div class="bbm-card-head">
                            <h3>Summary Bulanan</h3>
                            <span class="bbm-month-pill" id="bbm-current-month-pill"></span>
                        </div>
                        <div class="bbm-summary-grid" id="bbm-summary-grid"></div>
                    </div>

                    <div class="bbm-card">
                        <div class="bbm-card-head">
                            <h3>Budget Bulanan</h3>
                            <span class="bbm-trend-badge" id="bbm-trend-badge">Stabil</span>
                        </div>
                        <div class="bbm-budget-value" id="bbm-budget-text">Rp 0 / Rp 0</div>
                        <div class="bbm-progress-wrap">
                            <div class="bbm-progress-bar" id="bbm-progress-bar"></div>
                        </div>
                        <div class="bbm-budget-meta" id="bbm-budget-meta">0% terpakai</div>
                    </div>
                </div>

                <div class="bbm-grid-two">
                    <div class="bbm-card bbm-reminder-card">
                        <div class="bbm-card-head">
                            <h3>Reminder BBM</h3>
                            <span class="bbm-reminder-pill" id="bbm-reminder-pill">Aktif</span>
                        </div>
                        <div class="bbm-reminder-body" id="bbm-reminder-body"></div>
                    </div>

                    <div class="bbm-card bbm-chart-card">
                        <div class="bbm-card-head">
                            <h3>Tren Bulanan</h3>
                            <span class="bbm-month-pill">6 Bulan</span>
                        </div>
                        <div class="bbm-chart-wrap">
                            <canvas id="bbm-trend-chart"></canvas>
                        </div>
                    </div>
                </div>

                <div class="bbm-card bbm-month-map-card">
                    <div class="bbm-card-head">
                        <h3>Peta Lokasi BBM Bulanan</h3>
                        <span class="bbm-month-pill">Ringkas per bulan</span>
                    </div>
                    <div class="bbm-month-map" id="bbm-month-map"></div>
                </div>

                <div class="bbm-card bbm-station-card">
                    <div class="bbm-card-head">
                        <h3>SPBU Favorit</h3>
                        <span class="bbm-month-pill">Konsistensi Nominal</span>
                    </div>
                    <div class="bbm-station-body" id="bbm-station-body"></div>
                </div>

                <div class="bbm-card">
                    <div class="bbm-card-head">
                        <h3>Harga BBM Saat Ini</h3>
                        <button type="button" class="bbm-icon-btn" id="bbm-btn-open-settings" title="Edit harga BBM">
                            <i class="ph ph-pencil-simple"></i>
                        </button>
                    </div>
                    <div class="bbm-price-list" id="bbm-price-list"></div>
                </div>

                <div class="bbm-card bbm-history-card">
                    <div class="bbm-card-head">
                        <h3>Riwayat BBM</h3>
                        <select id="bbm-history-month" class="bbm-select"></select>
                    </div>

                    <div class="bbm-mini-summary" id="bbm-mini-summary"></div>

                    <div class="bbm-history-list" id="bbm-history-list"></div>
                </div>
            `;

            const mainContent = document.querySelector('main.main-content') || document.querySelector('main') || document.body;
            mainContent.appendChild(section);
        },

        injectHomeEntryPoints: function () {
            if (document.getElementById('bbm-home-menu-card')) return;

            // Penanda: ubah selector parent menu Home di sini jika struktur berbeda (contoh: '.home-grid').
            const homeMenuContainer = document.querySelector('.quick-actions');
            if (!homeMenuContainer) return;

            const menuCard = document.createElement('button');
            menuCard.type = 'button';
            menuCard.id = 'bbm-home-menu-card';
            menuCard.className = 'card bbm-home-card';
            menuCard.innerHTML = `
                <div class="bbm-home-card-icon bbm-home-card-icon-main"><i class="ph ph-gas-pump"></i></div>
                <span>BBM</span>
            `;
            menuCard.addEventListener('click', () => this.openSection());

            homeMenuContainer.appendChild(menuCard);
        },

        injectModals: function () {
            if (!document.getElementById('bbm-modal-form')) {
                document.body.insertAdjacentHTML('beforeend', `
                    <div class="modal-overlay bbm-modal" id="bbm-modal-form">
                        <div class="modal-content bbm-modal-content">
                            <button type="button" class="modal-close" id="bbm-form-close"><i class="ph ph-x"></i></button>
                            <h3 id="bbm-form-title">Tambah BBM</h3>
                            <form id="bbm-form">
                                <input type="hidden" id="bbm-form-id">

                                <div class="form-group">
                                    <label for="bbm-form-datetime">Tanggal & Jam</label>
                                    <input type="datetime-local" id="bbm-form-datetime" required>
                                </div>

                                <div class="form-group">
                                    <label for="bbm-form-total">Total Bayar (Rp)</label>
                                    <input type="number" id="bbm-form-total" min="1" required placeholder="Contoh: 50000">
                                </div>

                                <div class="bbm-quick-nominal" id="bbm-quick-nominal">
                                    <button type="button" data-value="10000">10k</button>
                                    <button type="button" data-value="20000">20k</button>
                                    <button type="button" data-value="50000">50k</button>
                                    <button type="button" data-value="100000">100k</button>
                                    <button type="button" data-value="full">Full Tank</button>
                                </div>

                                <div class="form-group">
                                    <label for="bbm-form-fuel">Jenis BBM</label>
                                    <select id="bbm-form-fuel" required></select>
                                </div>

                                <div class="form-group">
                                    <label for="bbm-form-location">Lokasi SPBU (Opsional)</label>
                                    <input type="text" id="bbm-form-location" list="bbm-location-suggestions" placeholder="Contoh: SPBU Pertamina Jl. Sudirman">
                                    <datalist id="bbm-location-suggestions"></datalist>
                                </div>

                                <div class="bbm-live-liter" id="bbm-live-liter">Estimasi Liter: <strong>0.00 L</strong></div>

                                <div class="form-group">
                                    <label for="bbm-form-odometer">Odometer (Opsional)</label>
                                    <input type="number" id="bbm-form-odometer" min="0" placeholder="Contoh: 15420">
                                </div>

                                <div class="form-group">
                                    <label for="bbm-form-note">Catatan (Opsional)</label>
                                    <textarea id="bbm-form-note" rows="3" placeholder="Contoh: isi di SPBU dekat kampus"></textarea>
                                </div>

                                <div class="bbm-modal-actions">
                                    <button type="button" class="btn btn-outline" id="bbm-form-cancel">Batal</button>
                                    <button type="button" class="btn btn-outline bbm-btn-danger" id="bbm-form-delete" style="display:none;"><i class="ph ph-trash"></i></button>
                                    <button type="submit" class="btn btn-primary">Simpan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                `);
            }

            if (!document.getElementById('bbm-modal-settings')) {
                document.body.insertAdjacentHTML('beforeend', `
                    <div class="modal-overlay bbm-modal" id="bbm-modal-settings">
                        <div class="modal-content bbm-modal-content">
                            <button type="button" class="modal-close" id="bbm-settings-close"><i class="ph ph-x"></i></button>
                            <h3>Harga BBM</h3>
                            <p class="bbm-modal-note">Harga ini dipakai untuk kalkulasi liter otomatis.</p>
                            <form id="bbm-settings-form"></form>
                        </div>
                    </div>
                `);
            }

            if (!document.getElementById('bbm-modal-setup')) {
                document.body.insertAdjacentHTML('beforeend', `
                    <div class="modal-overlay bbm-modal" id="bbm-modal-setup">
                        <div class="modal-content bbm-modal-content">
                            <button type="button" class="modal-close" id="bbm-setup-close"><i class="ph ph-x"></i></button>
                            <h3>Setup Awal BBM</h3>
                            <p class="bbm-modal-note">Pilih kendaraan dan budget agar dashboard lebih akurat.</p>
                            <form id="bbm-setup-form">
                                <div class="form-group">
                                    <label for="bbm-vehicle-type">Tipe Kendaraan</label>
                                    <select id="bbm-vehicle-type" required>
                                        <option value="">Pilih tipe</option>
                                        <option value="motor">Motor</option>
                                        <option value="mobil">Mobil</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="bbm-vehicle-subtype">Subtype</label>
                                    <select id="bbm-vehicle-subtype" required>
                                        <option value="">Pilih subtype</option>
                                        <option value="matic">Matic</option>
                                        <option value="manual">Manual</option>
                                        <option value="sport">Sport</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="bbm-budget-monthly">Budget Bulanan (Rp)</label>
                                    <input type="number" id="bbm-budget-monthly" min="0" placeholder="Contoh: 500000" required>
                                </div>
                                <div class="bbm-setup-grid">
                                    <div class="form-group">
                                        <label for="bbm-reminder-days">Reminder Isi (Hari)</label>
                                        <input type="number" id="bbm-reminder-days" min="1" placeholder="Contoh: 14">
                                    </div>
                                    <div class="form-group">
                                        <label for="bbm-reminder-km">Reminder Jarak (Km)</label>
                                        <input type="number" id="bbm-reminder-km" min="0" placeholder="Contoh: 250">
                                    </div>
                                </div>
                                <div class="bbm-modal-actions">
                                    <button type="submit" class="btn btn-primary full-width">Simpan Setup</button>
                                </div>
                            </form>
                        </div>
                    </div>
                `);
            }

            this.renderSettingsForm();
        },

        renderSettingsForm: function () {
            const form = document.getElementById('bbm-settings-form');
            if (!form) return;

            const fuelInputs = BBM_FUEL_OPTIONS.map((fuel) => {
                const value = this.prices[fuel.key] || 0;
                return `
                    <div class="form-group">
                        <label for="bbm-price-${fuel.key}">${fuel.label}</label>
                        <input type="number" id="bbm-price-${fuel.key}" min="1" value="${value}" required>
                    </div>
                `;
            }).join('');

            form.innerHTML = `
                ${fuelInputs}
                <div class="bbm-modal-actions">
                    <button type="button" class="btn btn-outline" id="bbm-settings-cancel">Batal</button>
                    <button type="submit" class="btn btn-primary">Simpan Harga</button>
                </div>
            `;
        },

        bindEvents: function () {
            const section = document.getElementById('bbm-section');
            if (!section) return;

            const form = document.getElementById('bbm-form');
            const settingsForm = document.getElementById('bbm-settings-form');
            const setupForm = document.getElementById('bbm-setup-form');

            document.getElementById('bbm-btn-open-form')?.addEventListener('click', () => this.openFormModal());
            document.getElementById('bbm-btn-open-settings')?.addEventListener('click', () => this.openSettingsModal());
            document.getElementById('bbm-btn-open-setup')?.addEventListener('click', () => this.openSetupModal());
            document.getElementById('bbm-btn-export-csv')?.addEventListener('click', () => this.exportTransactionsCsv());
            document.getElementById('bbm-btn-backup-json')?.addEventListener('click', () => this.backupTransactionsJson());

            document.getElementById('bbm-history-month')?.addEventListener('change', (event) => {
                this.selectedHistoryMonth = event.target.value;
                this.renderHistory();
            });

            document.getElementById('bbm-history-location')?.addEventListener('change', (event) => {
                this.selectedLocationFilter = event.target.value || 'all';
                this.renderHistory();
            });

            document.getElementById('bbm-form-fuel')?.addEventListener('change', (event) => {
                this.selectedFuelKey = event.target.value;
                this.updateLiveLiterEstimate();
            });

            document.getElementById('bbm-form-total')?.addEventListener('input', () => this.updateLiveLiterEstimate());

            document.getElementById('bbm-quick-nominal')?.addEventListener('click', (event) => {
                const button = event.target.closest('button[data-value]');
                if (!button) return;

                const amountInput = document.getElementById('bbm-form-total');
                if (!amountInput) return;

                const value = button.getAttribute('data-value');
                if (value === 'full') {
                    amountInput.value = this.getFullTankNominal();
                } else {
                    amountInput.value = value;
                }

                this.updateLiveLiterEstimate();
            });

            section.addEventListener('click', (event) => {
                const actionButton = event.target.closest('[data-bbm-action]');
                if (!actionButton) return;

                const action = actionButton.getAttribute('data-bbm-action');
                const id = actionButton.getAttribute('data-bbm-id');
                if (!id) return;

                if (action === 'edit') {
                    this.openFormModal(id);
                } else if (action === 'delete') {
                    this.deleteTransaction(id);
                }
            });

            form?.addEventListener('submit', (event) => this.saveTransaction(event));
            settingsForm?.addEventListener('submit', (event) => this.saveSettings(event));
            setupForm?.addEventListener('submit', (event) => this.saveSetup(event));

            document.getElementById('bbm-form-close')?.addEventListener('click', () => this.closeFormModal());
            document.getElementById('bbm-form-cancel')?.addEventListener('click', () => this.closeFormModal());
            document.getElementById('bbm-form-delete')?.addEventListener('click', () => this.deleteFromForm());

            document.getElementById('bbm-settings-close')?.addEventListener('click', () => this.closeSettingsModal());
            document.getElementById('bbm-settings-cancel')?.addEventListener('click', () => this.closeSettingsModal());

            document.getElementById('bbm-modal-settings')?.addEventListener('click', (event) => {
                if (event.target.closest('#bbm-settings-cancel')) {
                    this.closeSettingsModal();
                }
            });

            document.getElementById('bbm-setup-close')?.addEventListener('click', () => {
                if (this.setup.setupCompleted) this.closeSetupModal();
            });

            ['bbm-modal-form', 'bbm-modal-settings', 'bbm-modal-setup'].forEach((modalId) => {
                const modal = document.getElementById(modalId);
                modal?.addEventListener('click', (event) => {
                    if (event.target !== modal) return;
                    if (modalId === 'bbm-modal-form') this.closeFormModal();
                    if (modalId === 'bbm-modal-settings') this.closeSettingsModal();
                    if (modalId === 'bbm-modal-setup' && this.setup.setupCompleted) this.closeSetupModal();
                });
            });

            window.addEventListener('unilifeDataChanged', (event) => {
                const key = event.detail?.key;
                if (!key || key.startsWith('unilife_bbm_')) {
                    this.loadState();
                    this.renderAll();
                }
            });
        },

        saveSetup: function (event) {
            event.preventDefault();

            const vehicleType = document.getElementById('bbm-vehicle-type')?.value || '';
            const vehicleSubtype = document.getElementById('bbm-vehicle-subtype')?.value || '';
            const monthlyBudget = parseInt(document.getElementById('bbm-budget-monthly')?.value || '0', 10) || 0;
            const reminderDays = parseInt(document.getElementById('bbm-reminder-days')?.value || '14', 10) || 14;
            const reminderKm = parseInt(document.getElementById('bbm-reminder-km')?.value || '250', 10) || 250;

            if (!vehicleType || !vehicleSubtype) {
                this.notify('Pilih tipe dan subtype kendaraan terlebih dahulu.');
                return;
            }

            this.setup = {
                vehicleType,
                vehicleSubtype,
                monthlyBudget,
                reminderDays,
                reminderKm,
                setupCompleted: true
            };

            this.writeStore(BBM_KEYS.setup, this.setup);
            this.renderAll();
            this.closeSetupModal();
            this.notify('Setup BBM berhasil disimpan.');
        },

        saveSettings: function (event) {
            event.preventDefault();

            const nextPrices = {};
            for (const fuel of BBM_FUEL_OPTIONS) {
                const input = document.getElementById(`bbm-price-${fuel.key}`);
                const value = parseInt(input?.value || '0', 10);
                nextPrices[fuel.key] = value > 0 ? value : (this.prices[fuel.key] || BBM_DEFAULT_PRICES[fuel.key]);
            }

            this.prices = { ...this.prices, ...nextPrices };
            this.writeStore(BBM_KEYS.prices, this.prices);

            this.renderFuelOptions();
            this.renderPriceList();
            this.updateLiveLiterEstimate();
            this.closeSettingsModal();
            this.notify('Harga BBM berhasil diperbarui.');
        },

        saveTransaction: function (event) {
            event.preventDefault();

            const id = document.getElementById('bbm-form-id')?.value || '';
            const datetime = document.getElementById('bbm-form-datetime')?.value || '';
            const totalBayar = parseInt(document.getElementById('bbm-form-total')?.value || '0', 10) || 0;
            const fuelKey = document.getElementById('bbm-form-fuel')?.value || 'pertalite';
            const location = (document.getElementById('bbm-form-location')?.value || '').trim();
            const odometerRaw = document.getElementById('bbm-form-odometer')?.value || '';
            const note = (document.getElementById('bbm-form-note')?.value || '').trim();

            if (!datetime || totalBayar <= 0 || !fuelKey) {
                this.notify('Lengkapi tanggal, nominal, dan jenis BBM.');
                return;
            }

            const pricePerLiter = this.prices[fuelKey] || 0;
            if (pricePerLiter <= 0) {
                this.notify('Harga BBM untuk jenis ini belum valid.');
                return;
            }

            const liter = totalBayar / pricePerLiter;
            const odometer = odometerRaw ? parseInt(odometerRaw, 10) : null;

            if (id) {
                const index = this.transactions.findIndex((tx) => tx.id === id);
                if (index < 0) return;

                const prevTx = this.transactions[index];
                const updatedTx = {
                    ...prevTx,
                    datetime,
                    totalBayar,
                    fuelKey,
                    fuelLabel: this.getFuelLabel(fuelKey),
                    location,
                    pricePerLiter,
                    liter,
                    odometer,
                    note,
                    vehicleType: this.setup.vehicleType || prevTx.vehicleType || '',
                    vehicleSubtype: this.setup.vehicleSubtype || prevTx.vehicleSubtype || '',
                    updatedAt: new Date().toISOString()
                };

                this.transactions[index] = updatedTx;
                this.syncKeuangan('update', updatedTx);
                this.notify('Transaksi BBM berhasil diperbarui.');
            } else {
                const txId = (typeof uuidv4 === 'function')
                    ? uuidv4()
                    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

                const newTx = {
                    id: txId,
                    datetime,
                    totalBayar,
                    fuelKey,
                    fuelLabel: this.getFuelLabel(fuelKey),
                    location,
                    pricePerLiter,
                    liter,
                    odometer,
                    note,
                    vehicleType: this.setup.vehicleType || '',
                    vehicleSubtype: this.setup.vehicleSubtype || '',
                    financialRelationId: txId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                this.transactions.unshift(newTx);
                this.syncKeuangan('add', newTx);
                this.notify('Transaksi BBM berhasil disimpan.');
            }

            this.transactions.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
            this.writeStore(BBM_KEYS.transactions, this.transactions);
            this.renderAll();
            this.closeFormModal();
        },

        deleteFromForm: function () {
            const id = document.getElementById('bbm-form-id')?.value || '';
            if (!id) return;
            this.deleteTransaction(id);
            this.closeFormModal();
        },

        deleteTransaction: function (id) {
            const target = this.transactions.find((tx) => tx.id === id);
            if (!target) return;

            const confirmed = confirm('Hapus transaksi BBM ini?');
            if (!confirmed) return;

            this.transactions = this.transactions.filter((tx) => tx.id !== id);
            this.syncKeuangan('delete', target);
            this.writeStore(BBM_KEYS.transactions, this.transactions);
            this.renderAll();
            this.notify('Transaksi BBM berhasil dihapus.');
        },

        renderAll: function () {
            this.renderCurrentMonthPill();
            this.renderVehicleCard();
            this.renderSummary();
            this.renderBudget();
            this.renderReminderCard();
            this.renderTrendChart();
            this.renderMonthMap();
            this.renderStationInsights();
            this.renderPriceList();
            this.renderFuelOptions();
            this.renderLocationOptions();
            this.renderLocationSuggestions();
            this.renderHistoryMonthOptions();
            this.renderHistory();
            this.evaluateReminder();
        },

        renderCurrentMonthPill: function () {
            const pill = document.getElementById('bbm-current-month-pill');
            if (!pill) return;

            const label = new Date().toLocaleDateString('id-ID', {
                month: 'long',
                year: 'numeric'
            });

            pill.textContent = label;
        },

        renderVehicleCard: function () {
            const container = document.getElementById('bbm-vehicle-content');
            if (!container) return;

            if (!this.setup.setupCompleted) {
                container.innerHTML = `
                    <div class="bbm-empty-state">
                        <i class="ph ph-car-profile"></i>
                        <p>Kendaraan belum diset. Jalankan Setup Awal untuk mulai tracking BBM.</p>
                    </div>
                `;
                return;
            }

            const icon = this.getVehicleIcon(this.setup.vehicleType, this.setup.vehicleSubtype);
            const typeText = BBM_VEHICLE_LABELS[this.setup.vehicleType] || '-';
            const subtypeText = BBM_SUBTYPE_LABELS[this.setup.vehicleSubtype] || '-';

            container.innerHTML = `
                <div class="bbm-vehicle-chip">
                    <div class="bbm-vehicle-icon"><i class="ph ${icon}"></i></div>
                    <div>
                        <div class="bbm-vehicle-title">${typeText} • ${subtypeText}</div>
                        <div class="bbm-vehicle-subtitle">Budget bulanan: ${this.formatCurrency(this.setup.monthlyBudget)}</div>
                    </div>
                </div>
            `;
        },

        renderSummary: function () {
            const summaryGrid = document.getElementById('bbm-summary-grid');
            if (!summaryGrid) return;

            const monthKey = this.getCurrentMonthKey();
            const monthlyStats = this.getMonthlyStats(monthKey);
            const monthlyEfficiency = this.getMonthlyEfficiencyStats(monthKey);
            const lastFill = monthlyStats.lastFillDate
                ? this.formatDateTime(monthlyStats.lastFillDate)
                : '-';

            summaryGrid.innerHTML = `
                <div class="bbm-summary-item">
                    <span>Total Pengeluaran</span>
                    <strong>${this.formatCurrency(monthlyStats.totalMoney)}</strong>
                </div>
                <div class="bbm-summary-item">
                    <span>Total Liter</span>
                    <strong>${monthlyStats.totalLiter.toFixed(2)} L</strong>
                </div>
                <div class="bbm-summary-item">
                    <span>Total Isi</span>
                    <strong>${monthlyStats.totalCount}x</strong>
                </div>
                <div class="bbm-summary-item">
                    <span>Rata-rata Jeda</span>
                    <strong>${monthlyStats.avgGapDays > 0 ? `${monthlyStats.avgGapDays.toFixed(1)} hari` : '-'}</strong>
                </div>
                <div class="bbm-summary-item">
                    <span>Efisiensi Rata-rata</span>
                    <strong>${monthlyEfficiency.avgKpl > 0 ? `${monthlyEfficiency.avgKpl.toFixed(1)} km/L` : '-'}</strong>
                </div>
                <div class="bbm-summary-item bbm-summary-item-wide">
                    <span>Terakhir Isi</span>
                    <strong>${lastFill}</strong>
                </div>
            `;
        },

        renderBudget: function () {
            const monthlyStats = this.getMonthlyStats(this.getCurrentMonthKey());
            const limit = this.setup.monthlyBudget || 0;
            const used = monthlyStats.totalMoney;
            const ratio = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

            const budgetText = document.getElementById('bbm-budget-text');
            const progressBar = document.getElementById('bbm-progress-bar');
            const budgetMeta = document.getElementById('bbm-budget-meta');
            const trendBadge = document.getElementById('bbm-trend-badge');

            if (budgetText) {
                budgetText.textContent = `${this.formatCurrency(used)} / ${this.formatCurrency(limit)}`;
            }

            if (progressBar) {
                progressBar.style.width = `${ratio}%`;
            }

            if (budgetMeta) {
                budgetMeta.textContent = limit > 0
                    ? `${ratio.toFixed(1)}% terpakai dari budget bulan ini`
                    : 'Budget bulanan belum diatur';
            }

            const trend = this.getTrendStatus(used);
            if (trendBadge) {
                trendBadge.textContent = trend.label;
                trendBadge.className = `bbm-trend-badge ${trend.className}`;
            }
        },

        renderPriceList: function () {
            const list = document.getElementById('bbm-price-list');
            if (!list) return;

            list.innerHTML = BBM_FUEL_OPTIONS.map((fuel) => `
                <div class="bbm-price-row">
                    <span>${fuel.label}</span>
                    <strong>${this.formatCurrency(this.prices[fuel.key] || 0)} / L</strong>
                </div>
            `).join('');
        },

        renderFuelOptions: function () {
            const select = document.getElementById('bbm-form-fuel');
            if (!select) return;

            const prevValue = select.value || this.selectedFuelKey || 'pertalite';
            select.innerHTML = BBM_FUEL_OPTIONS.map((fuel) => `
                <option value="${fuel.key}">${fuel.label}</option>
            `).join('');

            select.value = this.prices[prevValue] ? prevValue : 'pertalite';
            this.selectedFuelKey = select.value;
        },

        renderHistoryMonthOptions: function () {
            const select = document.getElementById('bbm-history-month');
            if (!select) return;

            const monthSet = new Set(this.transactions.map((tx) => this.getMonthKey(tx.datetime)));
            monthSet.add(this.getCurrentMonthKey());
            const monthKeys = Array.from(monthSet).sort((a, b) => (a > b ? -1 : 1));

            select.innerHTML = monthKeys.map((key) => {
                const [year, month] = key.split('-');
                const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
                const label = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                return `<option value="${key}">${label}</option>`;
            }).join('');

            if (!monthKeys.includes(this.selectedHistoryMonth)) {
                this.selectedHistoryMonth = monthKeys[0];
            }

            select.value = this.selectedHistoryMonth;
        },

        renderLocationOptions: function () {
            const select = document.getElementById('bbm-history-location');
            if (!select) return;

            const locations = this.getUniqueLocations();
            const options = ['<option value="all">Semua Lokasi</option>'];

            locations.forEach((location) => {
                options.push(`<option value="${this.escapeHtml(location)}">${this.escapeHtml(location)}</option>`);
            });

            select.innerHTML = options.join('');
            select.value = this.selectedLocationFilter || 'all';
        },

        renderLocationSuggestions: function () {
            const datalist = document.getElementById('bbm-location-suggestions');
            if (!datalist) return;

            const locations = this.getUniqueLocations();
            datalist.innerHTML = locations.map((location) => `<option value="${this.escapeHtml(location)}"></option>`).join('');
        },

        renderMonthMap: function () {
            const container = document.getElementById('bbm-month-map');
            if (!container) return;

            const months = this.buildMonthLocationMap(6);
            if (months.length === 0) {
                container.innerHTML = `
                    <div class="bbm-empty-state">
                        <i class="ph ph-map-trifold"></i>
                        <p>Tambahkan lokasi SPBU agar peta bulanan tampil.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = months.map((month) => `
                <div class="bbm-month-map-item">
                    <div class="bbm-month-map-head">
                        <strong>${month.label}</strong>
                        <span>${month.totalTx} transaksi</span>
                    </div>
                    <div class="bbm-month-map-location">${this.escapeHtml(month.topLocation || '-')}</div>
                    <div class="bbm-month-map-meta">
                        <span>${month.countLocations} lokasi</span>
                        <span>${month.consistencyLabel}</span>
                    </div>
                </div>
            `).join('');
        },

        renderHistory: function () {
            const monthKey = this.selectedHistoryMonth || this.getCurrentMonthKey();
            const monthTransactions = this.transactions
                .filter((tx) => this.getMonthKey(tx.datetime) === monthKey)
                .filter((tx) => {
                    if (this.selectedLocationFilter === 'all') return true;
                    return (tx.location || '').trim() === this.selectedLocationFilter;
                })
                .sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

            const efficiencyMap = this.getEfficiencyMap(monthTransactions);

            this.renderMiniSummary(monthTransactions);

            const list = document.getElementById('bbm-history-list');
            if (!list) return;

            if (monthTransactions.length === 0) {
                list.innerHTML = `
                    <div class="bbm-empty-state">
                        <i class="ph ph-drop-half-bottom"></i>
                        <p>Belum ada riwayat BBM di bulan ini.</p>
                    </div>
                `;
                return;
            }

            let previousDateLabel = '';
            const rows = [];

            monthTransactions.forEach((tx) => {
                const dateLabel = new Date(tx.datetime).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                });

                if (dateLabel !== previousDateLabel) {
                    rows.push(`<div class="bbm-history-day">${dateLabel}</div>`);
                    previousDateLabel = dateLabel;
                }

                const fuelLabel = tx.fuelLabel || this.getFuelLabel(tx.fuelKey);
                const efficiencyInfo = efficiencyMap[tx.id];
                rows.push(`
                    <div class="bbm-history-item">
                        <div class="bbm-history-main">
                            <div class="bbm-history-top">
                                <strong>${fuelLabel}</strong>
                                <span>${this.formatCurrency(tx.totalBayar)}</span>
                            </div>
                            <div class="bbm-history-meta">
                                <span>${this.formatDateTime(tx.datetime)}</span>
                                <span>${(tx.liter || 0).toFixed(2)} L</span>
                                <span>${tx.odometer ? `ODO ${tx.odometer}` : 'ODO -'}</span>
                                ${tx.location ? `<span>${this.escapeHtml(tx.location)}</span>` : ''}
                            </div>
                            ${efficiencyInfo ? `<div class="bbm-efficiency-line">${efficiencyInfo.distance.toFixed(0)} km • ${efficiencyInfo.kpl.toFixed(1)} km/L</div>` : ''}
                            ${tx.note ? `<p class="bbm-history-note">${this.escapeHtml(tx.note)}</p>` : ''}
                        </div>
                        <div class="bbm-history-actions">
                            <button type="button" class="bbm-icon-btn" data-bbm-action="edit" data-bbm-id="${tx.id}" title="Edit">
                                <i class="ph ph-pencil-simple"></i>
                            </button>
                            <button type="button" class="bbm-icon-btn bbm-icon-btn-danger" data-bbm-action="delete" data-bbm-id="${tx.id}" title="Hapus">
                                <i class="ph ph-trash"></i>
                            </button>
                        </div>
                    </div>
                `);
            });

            list.innerHTML = rows.join('');
        },

        renderMiniSummary: function (rows) {
            const mini = document.getElementById('bbm-mini-summary');
            if (!mini) return;

            const totalCount = rows.length;
            const totalLiter = rows.reduce((sum, item) => sum + (Number(item.liter) || 0), 0);
            const totalMoney = rows.reduce((sum, item) => sum + (Number(item.totalBayar) || 0), 0);

            mini.innerHTML = `
                <div>
                    <span>Total Isi</span>
                    <strong>${totalCount}x</strong>
                </div>
                <div>
                    <span>Total Liter</span>
                    <strong>${totalLiter.toFixed(2)} L</strong>
                </div>
                <div>
                    <span>Total Uang</span>
                    <strong>${this.formatCurrency(totalMoney)}</strong>
                </div>
            `;
        },

        getMonthlyStats: function (monthKey) {
            const rows = this.transactions
                .filter((tx) => this.getMonthKey(tx.datetime) === monthKey)
                .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

            const totalMoney = rows.reduce((sum, tx) => sum + (Number(tx.totalBayar) || 0), 0);
            const totalLiter = rows.reduce((sum, tx) => sum + (Number(tx.liter) || 0), 0);
            const totalCount = rows.length;

            let avgGapDays = 0;
            if (rows.length > 1) {
                let totalGap = 0;
                for (let i = 1; i < rows.length; i += 1) {
                    const prev = new Date(rows[i - 1].datetime).getTime();
                    const curr = new Date(rows[i].datetime).getTime();
                    totalGap += Math.max((curr - prev) / 86400000, 0);
                }
                avgGapDays = totalGap / (rows.length - 1);
            }

            const lastFillDate = rows.length > 0 ? rows[rows.length - 1].datetime : '';

            return {
                totalMoney,
                totalLiter,
                totalCount,
                avgGapDays,
                lastFillDate
            };
        },

        getTrendStatus: function (thisMonthSpend) {
            const now = new Date();
            const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
            const prevSpend = this.getMonthlyStats(prevKey).totalMoney;

            if (prevSpend > 0) {
                const delta = (thisMonthSpend - prevSpend) / prevSpend;
                if (delta <= -0.1) return { label: 'Hemat', className: 'bbm-trend-hemat' };
                if (delta >= 0.1) return { label: 'Boros', className: 'bbm-trend-boros' };
                return { label: 'Stabil', className: 'bbm-trend-stabil' };
            }

            const limit = this.setup.monthlyBudget || 0;
            if (limit <= 0) return { label: 'Stabil', className: 'bbm-trend-stabil' };

            const ratio = (thisMonthSpend / limit) * 100;
            if (ratio <= 60) return { label: 'Hemat', className: 'bbm-trend-hemat' };
            if (ratio <= 90) return { label: 'Stabil', className: 'bbm-trend-stabil' };
            return { label: 'Boros', className: 'bbm-trend-boros' };
        },

        renderReminderCard: function () {
            const container = document.getElementById('bbm-reminder-body');
            const pill = document.getElementById('bbm-reminder-pill');
            if (!container) return;

            const state = this.getReminderState();
            if (pill) {
                pill.textContent = state.due ? 'Perlu Isi' : 'Aktif';
                pill.className = `bbm-reminder-pill ${state.due ? 'bbm-reminder-danger' : 'bbm-reminder-safe'}`;
            }

            container.innerHTML = `
                <div class="bbm-reminder-main ${state.due ? 'is-due' : ''}">
                    <strong>${state.title}</strong>
                    <p>${state.message}</p>
                </div>
                <div class="bbm-reminder-meta">
                    <span>Patokan: ${state.reminderDays} hari</span>
                    <span>Jarak: ${state.reminderKm} km</span>
                    <span>${state.lastFillLabel}</span>
                </div>
            `;
        },

        renderStationInsights: function () {
            const container = document.getElementById('bbm-station-body');
            if (!container) return;

            const stats = this.getStationInsights(this.getCurrentMonthKey());
            if (!stats.topLocation) {
                container.innerHTML = `
                    <div class="bbm-empty-state">
                        <i class="ph ph-map-pin"></i>
                        <p>Isi lokasi SPBU saat menambah transaksi agar insight favorit muncul di sini.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <div class="bbm-station-main">
                    <div class="bbm-station-pin"><i class="ph ph-map-pin"></i></div>
                    <div>
                        <strong>${this.escapeHtml(stats.topLocation)}</strong>
                        <p>${stats.count}x dipakai • rata-rata ${this.formatCurrency(stats.avgAmount)}</p>
                    </div>
                </div>
                <div class="bbm-station-grid">
                    <div>
                        <span>Nominal</span>
                        <strong>${stats.amountConsistencyLabel}</strong>
                    </div>
                    <div>
                        <span>Rentang</span>
                        <strong>${this.formatCurrency(stats.minAmount)} - ${this.formatCurrency(stats.maxAmount)}</strong>
                    </div>
                    <div>
                        <span>Total Transaksi</span>
                        <strong>${stats.count}x</strong>
                    </div>
                    <div>
                        <span>SPBU Lain</span>
                        <strong>${stats.locationsCount} lokasi</strong>
                    </div>
                </div>
            `;
        },

        evaluateReminder: function (silent = false) {
            const state = this.getReminderState();
            const signature = `${state.due}|${state.lastTxId}|${state.remainingDays}|${state.lastFillLabel}`;

            if (state.due && !silent && this.lastReminderSignature !== signature) {
                this.notify(state.title);
                this.lastReminderSignature = signature;
            }

            return state;
        },

        getReminderState: function () {
            const reminderDays = Math.max(parseInt(this.setup.reminderDays, 10) || 14, 1);
            const reminderKm = Math.max(parseInt(this.setup.reminderKm, 10) || 250, 0);
            const lastTx = this.transactions[0] || null;

            if (!lastTx) {
                return {
                    due: false,
                    title: 'Belum ada riwayat BBM',
                    message: 'Tambah transaksi pertama untuk mengaktifkan reminder otomatis.',
                    reminderDays,
                    reminderKm,
                    remainingDays: reminderDays,
                    lastTxId: '',
                    lastFillLabel: '-'
                };
            }

            const lastDate = new Date(lastTx.datetime);
            const now = new Date();
            const diffDays = Math.max((now.getTime() - lastDate.getTime()) / 86400000, 0);
            const remainingDays = Math.max(Math.ceil(reminderDays - diffDays), 0);
            const due = diffDays >= reminderDays;

            const lastFillLabel = `${this.formatDateTime(lastTx.datetime)}${lastTx.odometer ? ` • ODO ${lastTx.odometer}` : ''}`;
            const title = due ? 'Saatnya isi BBM lagi' : 'Reminder BBM aktif';
            const message = due
                ? `Sudah ${Math.floor(diffDays)} hari sejak isi terakhir. Segera lakukan pengisian berikutnya.`
                : `Perkiraan isi lagi dalam ${remainingDays} hari.`;

            return {
                due,
                title,
                message,
                reminderDays,
                reminderKm,
                remainingDays,
                lastTxId: lastTx.id,
                lastFillLabel
            };
        },

        getEfficiencyMap: function (rows) {
            const sortedRows = [...rows].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
            const map = {};

            for (let i = 1; i < sortedRows.length; i += 1) {
                const prev = sortedRows[i - 1];
                const current = sortedRows[i];
                const prevOdo = Number(prev.odometer);
                const currentOdo = Number(current.odometer);
                const prevLiter = Number(prev.liter);

                if (!Number.isFinite(prevOdo) || !Number.isFinite(currentOdo) || !Number.isFinite(prevLiter)) continue;
                const distance = currentOdo - prevOdo;
                if (distance <= 0 || prevLiter <= 0) continue;

                map[current.id] = {
                    distance,
                    kpl: distance / prevLiter
                };
            }

            return map;
        },

        getMonthlyEfficiencyStats: function (monthKey) {
            const rows = this.transactions
                .filter((tx) => this.getMonthKey(tx.datetime) === monthKey)
                .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

            let totalDistance = 0;
            let totalFuel = 0;
            const efficiencyMap = {};

            for (let i = 1; i < rows.length; i += 1) {
                const prev = rows[i - 1];
                const current = rows[i];
                const prevOdo = Number(prev.odometer);
                const currentOdo = Number(current.odometer);
                const prevLiter = Number(prev.liter);

                if (!Number.isFinite(prevOdo) || !Number.isFinite(currentOdo) || !Number.isFinite(prevLiter)) continue;
                const distance = currentOdo - prevOdo;
                if (distance <= 0 || prevLiter <= 0) continue;

                totalDistance += distance;
                totalFuel += prevLiter;
                efficiencyMap[current.id] = {
                    distance,
                    kpl: distance / prevLiter
                };
            }

            return {
                avgKpl: totalFuel > 0 ? totalDistance / totalFuel : 0,
                totalDistance,
                totalFuel,
                efficiencyMap
            };
        },

        getStationInsights: function (monthKey) {
            const rows = this.transactions.filter((tx) => this.getMonthKey(tx.datetime) === monthKey && (tx.location || '').trim());
            const locations = new Map();

            rows.forEach((tx) => {
                const location = (tx.location || '').trim();
                if (!location) return;

                const amount = Number(tx.totalBayar) || 0;
                const entry = locations.get(location) || { count: 0, amounts: [], total: 0 };
                entry.count += 1;
                entry.amounts.push(amount);
                entry.total += amount;
                locations.set(location, entry);
            });

            let topLocation = '';
            let topEntry = null;
            for (const [location, entry] of locations.entries()) {
                if (!topEntry || entry.count > topEntry.count || (entry.count === topEntry.count && entry.total > topEntry.total)) {
                    topLocation = location;
                    topEntry = entry;
                }
            }

            if (!topEntry) {
                return {
                    topLocation: '',
                    count: 0,
                    avgAmount: 0,
                    minAmount: 0,
                    maxAmount: 0,
                    amountConsistencyLabel: '-',
                    locationsCount: 0
                };
            }

            const avgAmount = topEntry.total / topEntry.count;
            const minAmount = Math.min(...topEntry.amounts);
            const maxAmount = Math.max(...topEntry.amounts);
            const variance = topEntry.amounts.reduce((sum, amount) => sum + Math.pow(amount - avgAmount, 2), 0) / topEntry.count;
            const stdDev = Math.sqrt(variance);
            const consistencyRatio = avgAmount > 0 ? (stdDev / avgAmount) * 100 : 0;
            const amountConsistencyLabel = consistencyRatio <= 8 ? 'Stabil' : consistencyRatio <= 18 ? 'Lumayan Stabil' : 'Variatif';

            return {
                topLocation,
                count: topEntry.count,
                avgAmount,
                minAmount,
                maxAmount,
                amountConsistencyLabel,
                locationsCount: locations.size
            };
        },

        getUniqueLocations: function () {
            const locations = new Set();

            this.transactions.forEach((tx) => {
                const location = (tx.location || '').trim();
                if (location) locations.add(location);
            });

            return Array.from(locations).sort((a, b) => a.localeCompare(b, 'id'));
        },

        buildMonthLocationMap: function (monthsCount = 6) {
            const result = [];

            for (let offset = monthsCount - 1; offset >= 0; offset -= 1) {
                const date = new Date();
                date.setMonth(date.getMonth() - offset, 1);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const monthRows = this.transactions.filter((tx) => this.getMonthKey(tx.datetime) === monthKey);
                const locationStats = this.getStationInsights(monthKey);

                result.push({
                    key: monthKey,
                    label: date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
                    totalTx: monthRows.length,
                    topLocation: locationStats.topLocation,
                    countLocations: locationStats.locationsCount,
                    consistencyLabel: locationStats.amountConsistencyLabel
                });
            }

            return result.filter((item) => item.totalTx > 0 || item.topLocation);
        },

        buildMonthlySeries: function (monthsCount = 6) {
            const labels = [];
            const spendData = [];
            const literData = [];

            for (let offset = monthsCount - 1; offset >= 0; offset -= 1) {
                const date = new Date();
                date.setMonth(date.getMonth() - offset, 1);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const stats = this.getMonthlyStats(monthKey);
                labels.push(date.toLocaleDateString('id-ID', { month: 'short' }));
                spendData.push(stats.totalMoney);
                literData.push(Number(stats.totalLiter.toFixed(2)));
            }

            return { labels, spendData, literData };
        },

        renderTrendChart: function () {
            const canvas = document.getElementById('bbm-trend-chart');
            if (!canvas || typeof Chart === 'undefined') return;

            const context = canvas.getContext('2d');
            if (!context) return;

            const series = this.buildMonthlySeries(6);

            if (this.trendChart) {
                this.trendChart.destroy();
                this.trendChart = null;
            }

            this.trendChart = new Chart(context, {
                type: 'bar',
                data: {
                    labels: series.labels,
                    datasets: [
                        {
                            label: 'Pengeluaran',
                            data: series.spendData,
                            backgroundColor: 'rgba(37, 99, 235, 0.28)',
                            borderColor: 'rgba(37, 99, 235, 0.95)',
                            borderWidth: 1,
                            borderRadius: 12,
                            yAxisID: 'yMoney'
                        },
                        {
                            label: 'Liter',
                            data: series.literData,
                            type: 'line',
                            borderColor: 'rgba(245, 158, 11, 0.95)',
                            backgroundColor: 'rgba(245, 158, 11, 0.16)',
                            tension: 0.38,
                            pointRadius: 3,
                            pointHoverRadius: 4,
                            fill: false,
                            yAxisID: 'yLiter'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            labels: {
                                usePointStyle: true,
                                boxWidth: 8,
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted') || '#64748B'
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: (context) => {
                                    if (context.dataset.label === 'Pengeluaran') {
                                        return ` ${context.dataset.label}: ${this.formatCurrency(context.parsed.y)}`;
                                    }
                                    return ` ${context.dataset.label}: ${Number(context.parsed.y || 0).toFixed(2)} L`;
                                }
                            }
                        }
                    },
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted') || '#64748B'
                            }
                        },
                        yMoney: {
                            position: 'left',
                            grid: {
                                color: 'rgba(148, 163, 184, 0.12)'
                            },
                            ticks: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted') || '#64748B',
                                callback: (value) => this.formatCurrency(value)
                            }
                        },
                        yLiter: {
                            position: 'right',
                            grid: {
                                drawOnChartArea: false
                            },
                            ticks: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted') || '#64748B',
                                callback: (value) => `${Number(value).toFixed(0)} L`
                            }
                        }
                    }
                }
            });
        },

        exportTransactionsCsv: function () {
            const header = ['Tanggal', 'Jam', 'BBM', 'Lokasi SPBU', 'Total Bayar', 'Liter', 'Odometer', 'Catatan', 'Vehicle Type', 'Vehicle Subtype'];
            const rows = this.transactions.map((tx) => {
                const date = new Date(tx.datetime);
                return [
                    date.toLocaleDateString('id-ID'),
                    date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                    tx.fuelLabel || this.getFuelLabel(tx.fuelKey),
                    tx.location || '',
                    String(tx.totalBayar || 0),
                    (Number(tx.liter) || 0).toFixed(2),
                    tx.odometer ?? '',
                    tx.note ? String(tx.note).replace(/"/g, '""') : '',
                    tx.vehicleType || '',
                    tx.vehicleSubtype || ''
                ].map((value) => `"${value}"`);
            });

            const csv = [header.join(','), ...rows.map((row) => row.join(','))].join('\n');
            this.downloadFile(`bbm-export-${this.getCurrentMonthKey()}.csv`, csv, 'text/csv;charset=utf-8;');
            this.notify('Export CSV BBM berhasil dibuat.');
        },

        backupTransactionsJson: function () {
            const payload = {
                version: 1,
                exportedAt: new Date().toISOString(),
                setup: this.setup,
                prices: this.prices,
                transactions: this.transactions
            };

            this.downloadFile(`bbm-backup-${this.getCurrentMonthKey()}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8;');
            this.notify('Backup JSON BBM berhasil dibuat.');
        },

        handleRestoreFile: function (event) {
            const file = event.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const parsed = JSON.parse(String(reader.result || '{}'));
                    this.restoreFromBackup(parsed);
                } catch (error) {
                    console.error('BBM restore parse error', error);
                    this.notify('File backup tidak valid.');
                } finally {
                    event.target.value = '';
                }
            };
            reader.readAsText(file);
        },

        restoreFromBackup: function (payload) {
            const normalized = this.normalizeBackupPayload(payload);
            if (!normalized) {
                this.notify('Struktur backup tidak dikenali.');
                return;
            }

            const confirmed = confirm('Restore backup BBM akan menimpa data BBM saat ini. Lanjutkan?');
            if (!confirmed) return;

            this.setup = normalized.setup;
            this.prices = normalized.prices;
            this.transactions = normalized.transactions.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

            this.writeStore(BBM_KEYS.setup, this.setup);
            this.writeStore(BBM_KEYS.prices, this.prices);
            this.writeStore(BBM_KEYS.transactions, this.transactions);

            this.renderAll();
            this.notify('Backup BBM berhasil dipulihkan.');
        },

        normalizeBackupPayload: function (payload) {
            if (!payload || typeof payload !== 'object') return null;

            const transactions = Array.isArray(payload.transactions) ? payload.transactions : [];
            const prices = payload.prices && typeof payload.prices === 'object' ? { ...BBM_DEFAULT_PRICES, ...payload.prices } : { ...this.prices };
            const setup = payload.setup && typeof payload.setup === 'object' ? {
                vehicleType: '',
                vehicleSubtype: '',
                monthlyBudget: 0,
                reminderDays: 14,
                reminderKm: 250,
                setupCompleted: false,
                ...payload.setup
            } : { ...this.setup };

            const normalizedTransactions = transactions
                .filter((item) => item && (item.id || item.datetime) && item.totalBayar)
                .map((item) => ({
                    ...item,
                    id: item.id || ((typeof uuidv4 === 'function') ? uuidv4() : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
                    datetime: item.datetime || new Date().toISOString(),
                    fuelLabel: item.fuelLabel || this.getFuelLabel(item.fuelKey),
                    location: item.location || '',
                    liter: Number(item.liter) || 0,
                    totalBayar: Number(item.totalBayar) || 0,
                    pricePerLiter: Number(item.pricePerLiter) || 0,
                    odometer: item.odometer ?? null,
                    note: item.note || '',
                    vehicleType: item.vehicleType || setup.vehicleType || '',
                    vehicleSubtype: item.vehicleSubtype || setup.vehicleSubtype || ''
                }));

            return {
                setup,
                prices,
                transactions: normalizedTransactions
            };
        },

        downloadFile: function (filename, content, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            setTimeout(() => URL.revokeObjectURL(url), 0);
        },

        openSection: function () {
            if (!this.setup.setupCompleted) {
                this.openSetupModal();
            }

            if (typeof window.openView === 'function') {
                window.openView('bbm-section', 'view-home');
                return;
            }

            document.querySelectorAll('.view-section').forEach((item) => item.classList.remove('active'));
            document.getElementById('bbm-section')?.classList.add('active');
        },

        openFormModal: function (id = '') {
            if (!this.setup.setupCompleted) {
                this.notify('Selesaikan Setup Awal sebelum menambah transaksi BBM.');
                this.openSetupModal();
                return;
            }

            const modal = document.getElementById('bbm-modal-form');
            const form = document.getElementById('bbm-form');
            if (!modal || !form) return;

            const title = document.getElementById('bbm-form-title');
            const idInput = document.getElementById('bbm-form-id');
            const datetimeInput = document.getElementById('bbm-form-datetime');
            const totalInput = document.getElementById('bbm-form-total');
            const fuelInput = document.getElementById('bbm-form-fuel');
            const locationInput = document.getElementById('bbm-form-location');
            const odoInput = document.getElementById('bbm-form-odometer');
            const noteInput = document.getElementById('bbm-form-note');
            const deleteBtn = document.getElementById('bbm-form-delete');

            if (!id) {
                title.textContent = 'Tambah BBM';
                form.reset();
                idInput.value = '';
                datetimeInput.value = this.toDateTimeLocal(new Date());
                fuelInput.value = this.selectedFuelKey || 'pertalite';
                if (locationInput) locationInput.value = '';
                deleteBtn.style.display = 'none';
            } else {
                const tx = this.transactions.find((item) => item.id === id);
                if (!tx) return;

                title.textContent = 'Edit Transaksi BBM';
                idInput.value = tx.id;
                datetimeInput.value = this.toDateTimeLocal(new Date(tx.datetime));
                totalInput.value = tx.totalBayar;
                fuelInput.value = tx.fuelKey || 'pertalite';
                if (locationInput) locationInput.value = tx.location || '';
                odoInput.value = tx.odometer || '';
                noteInput.value = tx.note || '';
                deleteBtn.style.display = 'inline-flex';
            }

            this.selectedFuelKey = fuelInput.value;
            this.updateLiveLiterEstimate();
            modal.classList.add('active');
        },

        closeFormModal: function () {
            document.getElementById('bbm-modal-form')?.classList.remove('active');
        },

        openSettingsModal: function () {
            this.renderSettingsForm();
            document.getElementById('bbm-modal-settings')?.classList.add('active');
        },

        closeSettingsModal: function () {
            document.getElementById('bbm-modal-settings')?.classList.remove('active');
        },

        openSetupModal: function () {
            const modal = document.getElementById('bbm-modal-setup');
            if (!modal) return;

            document.getElementById('bbm-vehicle-type').value = this.setup.vehicleType || '';
            document.getElementById('bbm-vehicle-subtype').value = this.setup.vehicleSubtype || '';
            document.getElementById('bbm-budget-monthly').value = this.setup.monthlyBudget || '';
            document.getElementById('bbm-reminder-days').value = this.setup.reminderDays || 14;
            document.getElementById('bbm-reminder-km').value = this.setup.reminderKm || 250;

            modal.classList.add('active');
        },

        closeSetupModal: function () {
            document.getElementById('bbm-modal-setup')?.classList.remove('active');
        },

        updateLiveLiterEstimate: function () {
            const total = parseInt(document.getElementById('bbm-form-total')?.value || '0', 10) || 0;
            const fuel = document.getElementById('bbm-form-fuel')?.value || this.selectedFuelKey || 'pertalite';
            const price = this.prices[fuel] || 0;
            const liter = price > 0 ? total / price : 0;

            const liveEl = document.getElementById('bbm-live-liter');
            if (liveEl) {
                liveEl.innerHTML = `Estimasi Liter: <strong>${liter.toFixed(2)} L</strong>`;
            }
        },

        getFullTankNominal: function () {
            const type = this.setup.vehicleType;
            const subtype = this.setup.vehicleSubtype;

            const map = {
                motor: { matic: 30000, manual: 40000, sport: 60000 },
                mobil: { matic: 200000, manual: 180000, sport: 250000 }
            };

            return map[type]?.[subtype] || (type === 'mobil' ? 200000 : 50000);
        },

        syncKeuangan: function (action, dataBbm) {
            const payload = {
                action,
                bbm_id: dataBbm.id,
                relation: {
                    bbm_id: dataBbm.id
                },
                kategori: 'Transportasi',
                catatan: `Isi BBM ${dataBbm.fuelLabel || this.getFuelLabel(dataBbm.fuelKey)}`,
                nominal: dataBbm.totalBayar,
                tanggal: dataBbm.datetime
            };

            // TODO: Sambungkan ke budget.js disini
            if (typeof budgetManager !== 'undefined' && typeof budgetManager.syncFromBbm === 'function') {
                budgetManager.syncFromBbm(action, payload);
            } else {
                console.info('[BBM] syncKeuangan placeholder', payload);
            }
            return payload;
        },

        notify: function (message) {
            if (typeof inboxManager !== 'undefined' && typeof inboxManager.showToast === 'function') {
                inboxManager.showToast(message);
                return;
            }
            console.log('[BBM]', message);
        },

        getCurrentMonthKey: function () {
            const now = new Date();
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        },

        getMonthKey: function (dateStr) {
            if (!dateStr) return this.getCurrentMonthKey();
            return String(dateStr).slice(0, 7);
        },

        toDateTimeLocal: function (dateObj) {
            const date = new Date(dateObj);
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const h = String(date.getHours()).padStart(2, '0');
            const min = String(date.getMinutes()).padStart(2, '0');
            return `${y}-${m}-${d}T${h}:${min}`;
        },

        getFuelLabel: function (fuelKey) {
            return BBM_FUEL_OPTIONS.find((item) => item.key === fuelKey)?.label || 'Pertalite';
        },

        getVehicleIcon: function (vehicleType, vehicleSubtype) {
            if (vehicleType === 'motor') {
                if (vehicleSubtype === 'sport') return 'ph-motorcycle';
                if (vehicleSubtype === 'manual') return 'ph-moped';
                return 'ph-scooter';
            }

            if (vehicleType === 'mobil') {
                if (vehicleSubtype === 'sport') return 'ph-car-profile';
                if (vehicleSubtype === 'manual') return 'ph-car';
                return 'ph-car-simple';
            }

            return 'ph-gas-pump';
        },

        formatCurrency: function (value) {
            return new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                maximumFractionDigits: 0
            }).format(Number(value) || 0);
        },

        formatDateTime: function (value) {
            if (!value) return '-';
            const date = new Date(value);
            return date.toLocaleString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        escapeHtml: function (text) {
            if (!text) return '';
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }
    };

    window.bbmManager = bbmManager;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => bbmManager.init());
    } else {
        bbmManager.init();
    }
})();
