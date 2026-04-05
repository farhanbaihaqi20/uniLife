const budgetManager = {
    transactions: [],
    accounts: [],
    monthlyLimit: 0,
    baseBalance: 0,
    currentChart: null,
    selectedMonth: null,
    topCategoryEntries: [],
    monthAnimationTimer: null,
    recentInterestFundIds: [],
    interestVisualTimer: null,
    moreActionsBound: false,

    init: function () {
        this.accounts = this.normalizeAccounts(Storage.getBudgetAccounts());
        this.migrateLegacyBaseBalance();
        this.transactions = this.normalizeTransactions(Storage.getBudgetTransactions());
        this.applyPendingAccountInterest();
        Storage.setBudgetTransactions(this.transactions);
        Storage.setBudgetAccounts(this.accounts);
        this.monthlyLimit = Storage.getBudgetLimit();
        this.baseBalance = this.getTotalInitialBalance();
        this.selectedMonth = this.getInitialSelectedMonth();
        this.bindMoreActionsEvents();
        this.updateDashboard();
    },

    bindMoreActionsEvents: function () {
        if (this.moreActionsBound) return;

        document.addEventListener('click', (event) => {
            const wrapper = document.getElementById('budget-more-wrapper');
            if (!wrapper || !wrapper.contains(event.target)) {
                this.closeMoreActions();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeMoreActions();
            }
        });

        // Close overflow actions when user scrolls to avoid a floating menu that feels detached.
        document.addEventListener('scroll', () => {
            const menu = document.getElementById('budget-more-menu');
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

        const menu = document.getElementById('budget-more-menu');
        const toggle = document.getElementById('budget-more-toggle');
        const wrapper = document.getElementById('budget-more-wrapper');
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
        const menu = document.getElementById('budget-more-menu');
        const toggle = document.getElementById('budget-more-toggle');
        const wrapper = document.getElementById('budget-more-wrapper');
        if (!menu || !toggle || !wrapper) return;

        wrapper.classList.remove('is-open');
        menu.classList.remove('is-open');
        menu.setAttribute('aria-hidden', 'true');
        toggle.setAttribute('aria-expanded', 'false');
    },

    // --- Data Calculation ---

    getInitialSelectedMonth: function () {
        const validDates = this.transactions
            .map(tx => this.getTransactionDate(tx))
            .filter(date => !Number.isNaN(date.getTime()))
            .sort((a, b) => b - a);

        if (validDates.length > 0) {
            return new Date(validDates[0].getFullYear(), validDates[0].getMonth(), 1);
        }

        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    },

    getTransactionDate: function (tx) {
        return new Date(tx.date || tx.timestamp || tx.createdAt || new Date().toISOString());
    },

    getTransactionsByMonth: function (monthDate = this.selectedMonth) {
        const month = monthDate.getMonth();
        const year = monthDate.getFullYear();

        return this.transactions.filter(tx => {
            const txDate = this.getTransactionDate(tx);
            return txDate.getMonth() === month && txDate.getFullYear() === year;
        });
    },

    getMonthLabel: function (monthDate = this.selectedMonth) {
        const locale = (typeof i18n !== 'undefined' && typeof i18n.locale === 'function') ? i18n.locale() : 'id-ID';
        return monthDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    },

    isCurrentMonthSelected: function () {
        const now = new Date();
        return this.selectedMonth.getMonth() === now.getMonth() && this.selectedMonth.getFullYear() === now.getFullYear();
    },

    changeMonth: function (step) {
        this.selectedMonth = new Date(this.selectedMonth.getFullYear(), this.selectedMonth.getMonth() + step, 1);
        this.animateMonthTransition();
        this.updateDashboard();
    },

    goToCurrentMonth: function () {
        const now = new Date();
        this.selectedMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        this.animateMonthTransition();
        this.updateDashboard();
    },

    calculateTotals: function (transactions = this.transactions) {
        let income = 0;
        let expense = 0;

        transactions.forEach(tx => {
            if (tx.type === 'income') {
                income += tx.amount;
            } else {
                expense += tx.amount;
            }
        });

        return {
            income,
            expense,
            balance: income - expense
        };
    },

    getExpensesByCategory: function (transactions) {
        const categories = {};
        transactions.forEach(tx => {
            if (tx.type === 'expense') {
                categories[tx.category] = (categories[tx.category] || 0) + tx.amount;
            }
        });
        return categories;
    },

    formatCurrency: function (amount) {
        return 'Rp ' + amount.toLocaleString('id-ID');
    },

    sanitizeNominalInput: function (value) {
        return String(value ?? '').replace(/\D+/g, '');
    },

    parseNominalInput: function (value) {
        const digits = this.sanitizeNominalInput(value);
        return digits ? parseInt(digits, 10) : 0;
    },

    formatNominalInput: function (value) {
        const parsed = this.parseNominalInput(value);
        return parsed > 0 ? parsed.toLocaleString('id-ID') : '';
    },

    getCaretPositionForDigitOffset: function (formattedValue, digitOffset) {
        if (!formattedValue || digitOffset <= 0) return 0;

        let seenDigits = 0;
        for (let index = 0; index < formattedValue.length; index += 1) {
            if (/\d/.test(formattedValue[index])) {
                seenDigits += 1;
            }
            if (seenDigits >= digitOffset) {
                return index + 1;
            }
        }

        return formattedValue.length;
    },

    applyNominalInputFormatting: function (inputEl) {
        if (!(inputEl instanceof HTMLInputElement)) return;

        const rawValue = inputEl.value || '';
        const caretStart = inputEl.selectionStart ?? rawValue.length;
        const digitsBeforeCaret = this.sanitizeNominalInput(rawValue.slice(0, caretStart)).length;
        const formattedValue = this.formatNominalInput(rawValue);

        inputEl.value = formattedValue;

        if (document.activeElement !== inputEl || typeof inputEl.setSelectionRange !== 'function') {
            return;
        }

        const nextCaret = this.getCaretPositionForDigitOffset(formattedValue, digitsBeforeCaret);
        inputEl.setSelectionRange(nextCaret, nextCaret);
    },

    setNominalInputValue: function (inputId, value) {
        const input = document.getElementById(inputId);
        if (!input) return;
        input.value = this.formatNominalInput(value);
    },

    handleNominalInput: function (inputId, withPreviewWarning = false) {
        const input = document.getElementById(inputId);
        if (!input) return;

        this.applyNominalInputFormatting(input);
        if (withPreviewWarning) this.previewFundSourceWarning();
    },

    getDefaultBudgetAccounts: function () {
        return [
            { id: 'cash-default', name: 'Cash', type: 'cash', initialBalance: 0, interestEnabled: false, interestRatePa: 0, interestPayoutFrequency: 'monthly', interestLastAppliedAt: null },
            { id: 'bank-default', name: 'Bank Utama', type: 'banking', initialBalance: 0, interestEnabled: false, interestRatePa: 0, interestPayoutFrequency: 'monthly', interestLastAppliedAt: null },
            { id: 'ewallet-default', name: 'E-Wallet Utama', type: 'ewallet', initialBalance: 0, interestEnabled: false, interestRatePa: 0, interestPayoutFrequency: 'monthly', interestLastAppliedAt: null }
        ];
    },

    normalizeAccountType: function (type) {
        const normalized = String(type || '').toLowerCase();
        if (normalized === 'cash' || normalized === 'banking' || normalized === 'ewallet' || normalized === 'other') {
            return normalized;
        }
        return 'other';
    },

    normalizeInterestFrequency: function (frequency) {
        const normalized = String(frequency || '').toLowerCase();
        return normalized === 'daily' ? 'daily' : 'monthly';
    },

    normalizeInterestRatePa: function (rate) {
        const numeric = Number(rate);
        if (!Number.isFinite(numeric) || numeric <= 0) return 0;
        return Math.max(0, Math.min(100, numeric));
    },

    toLocalDateKey: function (value) {
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = `${date.getMonth() + 1}`.padStart(2, '0');
        const day = `${date.getDate()}`.padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    parseLocalDateKey: function (dateKey) {
        if (!dateKey || typeof dateKey !== 'string') return null;
        const parts = dateKey.split('-').map(Number);
        if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
        return new Date(parts[0], parts[1] - 1, parts[2]);
    },

    getStartOfDay: function (value) {
        const date = value instanceof Date ? new Date(value) : new Date(value);
        if (Number.isNaN(date.getTime())) return null;
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    },

    getCurrentInterestMarkerDate: function (frequency) {
        const now = new Date();
        if (this.normalizeInterestFrequency(frequency) === 'daily') {
            return this.toLocalDateKey(this.getStartOfDay(now));
        }
        return this.toLocalDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
    },

    normalizeAccounts: function (accounts) {
        const source = Array.isArray(accounts) ? accounts : [];
        const cleaned = source
            .map((account) => {
                const type = this.normalizeAccountType(account?.type);
                const rawEnabled = !!account?.interestEnabled;
                const payoutFrequency = this.normalizeInterestFrequency(account?.interestPayoutFrequency);
                const ratePa = this.normalizeInterestRatePa(account?.interestRatePa);
                const marker = this.toLocalDateKey(account?.interestLastAppliedAt);
                const interestEnabled = type === 'banking' && rawEnabled && ratePa > 0;

                return {
                    id: account?.id || ((typeof uuidv4 === 'function') ? uuidv4() : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
                    name: String(account?.name || '').trim() || 'Sumber Dana',
                    type,
                    initialBalance: Number(account?.initialBalance) || 0,
                    interestEnabled,
                    interestRatePa: interestEnabled ? ratePa : 0,
                    interestPayoutFrequency: payoutFrequency,
                    interestLastAppliedAt: interestEnabled ? (marker || this.getCurrentInterestMarkerDate(payoutFrequency)) : null
                };
            })
            .filter((account, index, arr) => arr.findIndex((a) => a.id === account.id) === index);

        if (cleaned.length > 0) return cleaned;
        return this.getDefaultBudgetAccounts();
    },

    getTotalInitialBalance: function () {
        return this.accounts.reduce((sum, account) => sum + (Number(account.initialBalance) || 0), 0);
    },

    getDefaultAccountId: function () {
        if (!Array.isArray(this.accounts) || this.accounts.length === 0) return 'cash-default';
        const cashAccount = this.accounts.find((account) => account.type === 'cash');
        return (cashAccount || this.accounts[0]).id;
    },

    getAccountById: function (id) {
        return this.accounts.find((account) => account.id === id) || null;
    },

    getFundSourceLabelById: function (id) {
        const account = this.getAccountById(id);
        return account ? account.name : 'Cash';
    },

    normalizeTransactions: function (transactions) {
        const defaultAccountId = this.getDefaultAccountId();
        const source = Array.isArray(transactions) ? transactions : [];
        return source.map((tx) => ({
            ...tx,
            fundSourceId: this.getAccountById(tx?.fundSourceId) ? tx.fundSourceId : defaultAccountId
        }));
    },

    calculateAccountBalances: function (transactions = this.transactions) {
        const balances = {};
        this.accounts.forEach((account) => {
            balances[account.id] = Number(account.initialBalance) || 0;
        });

        transactions.forEach((tx) => {
            const fundSourceId = tx.fundSourceId;
            if (!fundSourceId || typeof balances[fundSourceId] !== 'number') return;
            const amount = Number(tx.amount) || 0;
            if (tx.type === 'income') {
                balances[fundSourceId] += amount;
            } else {
                balances[fundSourceId] -= amount;
            }
        });

        return balances;
    },

    calculateAccountBalanceAtDate: function (accountId, upToDate, transactions = this.transactions) {
        const account = this.getAccountById(accountId);
        if (!account) return 0;

        const limitDate = upToDate instanceof Date ? upToDate : new Date(upToDate);
        if (Number.isNaN(limitDate.getTime())) return Number(account.initialBalance) || 0;

        let balance = Number(account.initialBalance) || 0;
        transactions.forEach((tx) => {
            if (tx.fundSourceId !== accountId) return;
            const txDate = this.getTransactionDate(tx);
            if (Number.isNaN(txDate.getTime()) || txDate > limitDate) return;

            const amount = Number(tx.amount) || 0;
            if (tx.type === 'income') {
                balance += amount;
            } else {
                balance -= amount;
            }
        });

        return balance;
    },

    buildInterestTransaction: function (account, amount, applyDate, interestKey) {
        return {
            id: (typeof uuidv4 === 'function') ? uuidv4() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            type: 'income',
            amount,
            category: 'other_income',
            note: `Bunga ${account.name} (${String(account.interestRatePa).replace('.', ',')}% p.a.)`,
            date: new Date(applyDate.getFullYear(), applyDate.getMonth(), applyDate.getDate(), 12, 0, 0).toISOString(),
            fundSourceId: account.id,
            isInterest: true,
            isSystemGenerated: true,
            interestKey,
            interestFrequency: account.interestPayoutFrequency,
            source: 'bank_interest'
        };
    },

    applyPendingAccountInterest: function () {
        const now = new Date();
        const todayStart = this.getStartOfDay(now);
        if (!todayStart) return false;

        let changed = false;
        const appendedTransactions = [];
        const creditedFundIds = new Set();
        const existingKeys = new Set(
            (Array.isArray(this.transactions) ? this.transactions : [])
                .filter(tx => tx?.isInterest && tx?.interestKey)
                .map(tx => tx.interestKey)
        );

        this.accounts.forEach((account) => {
            if (account.type !== 'banking') return;
            if (!account.interestEnabled) return;

            const rate = this.normalizeInterestRatePa(account.interestRatePa);
            if (rate <= 0) return;

            const frequency = this.normalizeInterestFrequency(account.interestPayoutFrequency);
            let marker = this.parseLocalDateKey(account.interestLastAppliedAt);

            if (!marker || Number.isNaN(marker.getTime())) {
                account.interestLastAppliedAt = this.getCurrentInterestMarkerDate(frequency);
                changed = true;
                return;
            }

            if (frequency === 'daily') {
                let cursor = this.getStartOfDay(marker);
                while (cursor < todayStart) {
                    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
                    const dayKey = this.toLocalDateKey(cursor);
                    const interestKey = `${account.id}|daily|${dayKey}`;
                    if (existingKeys.has(interestKey)) continue;

                    const referenceBalance = this.calculateAccountBalanceAtDate(
                        account.id,
                        new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 23, 59, 59),
                        [...this.transactions, ...appendedTransactions]
                    );

                    if (referenceBalance <= 0) continue;

                    const interestAmount = Math.round((referenceBalance * (rate / 100)) / 365);
                    if (interestAmount <= 0) continue;

                    appendedTransactions.push(this.buildInterestTransaction(account, interestAmount, cursor, interestKey));
                    existingKeys.add(interestKey);
                    creditedFundIds.add(account.id);
                    changed = true;
                }

                const newMarker = this.toLocalDateKey(todayStart);
                if (account.interestLastAppliedAt !== newMarker) {
                    account.interestLastAppliedAt = newMarker;
                    changed = true;
                }
                return;
            }

            let monthCursor = new Date(marker.getFullYear(), marker.getMonth(), 1);
            const currentMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

            while (monthCursor < currentMonthStart) {
                const payoutDate = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1);
                const monthKey = `${payoutDate.getFullYear()}-${`${payoutDate.getMonth() + 1}`.padStart(2, '0')}`;
                const interestKey = `${account.id}|monthly|${monthKey}`;

                if (!existingKeys.has(interestKey)) {
                    const referenceBalance = this.calculateAccountBalanceAtDate(
                        account.id,
                        new Date(payoutDate.getFullYear(), payoutDate.getMonth(), payoutDate.getDate(), 0, 0, 0),
                        [...this.transactions, ...appendedTransactions]
                    );

                    if (referenceBalance > 0) {
                        const interestAmount = Math.round((referenceBalance * (rate / 100)) / 12);
                        if (interestAmount > 0) {
                            appendedTransactions.push(this.buildInterestTransaction(account, interestAmount, payoutDate, interestKey));
                            existingKeys.add(interestKey);
                            creditedFundIds.add(account.id);
                            changed = true;
                        }
                    }
                }

                monthCursor = payoutDate;
            }

            const monthlyMarker = this.toLocalDateKey(currentMonthStart);
            if (account.interestLastAppliedAt !== monthlyMarker) {
                account.interestLastAppliedAt = monthlyMarker;
                changed = true;
            }
        });

        if (appendedTransactions.length > 0) {
            this.transactions = [...this.transactions, ...appendedTransactions];
        }

        this.recentInterestFundIds = Array.from(creditedFundIds);

        return changed;
    },

    persistBudgetSilently: function () {
        try {
            localStorage.setItem('unilife_budget_transactions', JSON.stringify(this.transactions));
            localStorage.setItem('unilife_budget_accounts', JSON.stringify(this.accounts));
        } catch (error) {
            console.error('Failed to persist budget state silently', error);
        }
    },

    migrateLegacyBaseBalance: function () {
        const oldBaseBalance = Number(Storage.getBudgetBaseBalance()) || 0;
        const hasAccountsKey = !!localStorage.getItem('unilife_budget_accounts');

        if (hasAccountsKey || oldBaseBalance === 0) return;

        const cashAccount = this.accounts.find((account) => account.type === 'cash') || this.accounts[0];
        if (!cashAccount) return;

        cashAccount.initialBalance = (Number(cashAccount.initialBalance) || 0) + oldBaseBalance;
        Storage.setBudgetBaseBalance(0);
    },

    // --- UI Rendering ---

    updateDashboard: function () {
        this.accounts = this.normalizeAccounts(this.accounts);
        this.baseBalance = this.getTotalInitialBalance();
        this.transactions = this.normalizeTransactions(this.transactions);
        const interestApplied = this.applyPendingAccountInterest();
        if (interestApplied) {
            this.persistBudgetSilently();
            window.dispatchEvent(new CustomEvent('unilifeDataChanged', { detail: { key: 'unilife_budget_tx' } }));
        }

        const currentMonthTx = this.getTransactionsByMonth(this.selectedMonth);
        const previousMonth = new Date(this.selectedMonth.getFullYear(), this.selectedMonth.getMonth() - 1, 1);
        const previousMonthTx = this.getTransactionsByMonth(previousMonth);
        const totals = this.calculateTotals(this.transactions); // Total overall balance
        const totalBalanceWithManual = totals.balance + this.baseBalance;
        const monthTotals = this.calculateTotals(currentMonthTx); // Monthly stats for limit/chart
        const prevMonthTotals = this.calculateTotals(previousMonthTx);

        // Update Balance Cards
        const elBalance = document.getElementById('budget-total-balance');
        const elIncome = document.getElementById('budget-total-income');
        const elExpense = document.getElementById('budget-total-expense');

        if (elBalance) elBalance.innerText = this.formatCurrency(totalBalanceWithManual);
        if (elIncome) elIncome.innerText = this.formatCurrency(monthTotals.income);
        if (elExpense) elExpense.innerText = this.formatCurrency(monthTotals.expense);

        this.renderManualBalanceInfo();
        this.renderFundBreakdown();
        if (this.interestVisualTimer) {
            clearTimeout(this.interestVisualTimer);
            this.interestVisualTimer = null;
        }
        if (this.recentInterestFundIds.length > 0) {
            this.interestVisualTimer = setTimeout(() => {
                this.recentInterestFundIds = [];
                this.renderFundBreakdown();
                this.interestVisualTimer = null;
            }, 2400);
        }

        this.renderMonthHeader();

        // Update Limit Progress
        this.renderLimitProgress(monthTotals.expense);

        // Update Insights
        this.renderInsights(monthTotals, prevMonthTotals, currentMonthTx);

        // Premium signals
        this.renderProSignals(monthTotals, prevMonthTotals, currentMonthTx);

        // Update Chart
        this.renderChart(currentMonthTx);

        // Update Transaction List
        this.renderTransactionList(currentMonthTx);
    },

    renderProSignals: function (monthTotals, prevMonthTotals, currentMonthTx) {
        const healthScoreEl = document.getElementById('budget-health-score');
        const healthNoteEl = document.getElementById('budget-health-note');
        const forecastEl = document.getElementById('budget-forecast-end');
        const forecastNoteEl = document.getElementById('budget-forecast-note');
        const dailySafeEl = document.getElementById('budget-daily-safe');
        const dailySafeNoteEl = document.getElementById('budget-daily-safe-note');
        const proTipEl = document.getElementById('budget-pro-tip');

        if (!healthScoreEl || !forecastEl || !dailySafeEl || !proTipEl) return;

        const now = new Date();
        const isCurrentMonth = this.isCurrentMonthSelected();
        const monthDays = new Date(this.selectedMonth.getFullYear(), this.selectedMonth.getMonth() + 1, 0).getDate();
        const dayOfMonth = isCurrentMonth ? now.getDate() : monthDays;

        const health = this.calculateHealthScore(monthTotals, prevMonthTotals);
        healthScoreEl.innerText = `${health.score}/100`;
        if (healthNoteEl) healthNoteEl.innerText = health.note;

        const forecastExpense = this.calculateForecastExpense(monthTotals.expense, dayOfMonth, monthDays);
        forecastEl.innerText = this.formatCurrency(forecastExpense);
        if (forecastNoteEl) {
            const delta = forecastExpense - monthTotals.expense;
            forecastNoteEl.innerText = delta > 0
                ? `Potensi naik ${this.formatCurrency(delta)} hingga akhir bulan`
                : 'Trend pengeluaran stabil';
        }

        if (this.monthlyLimit > 0) {
            const daysLeft = Math.max(1, monthDays - dayOfMonth + 1);
            const remainingLimit = this.monthlyLimit - monthTotals.expense;
            const dailySafe = Math.floor(remainingLimit / daysLeft);

            dailySafeEl.innerText = this.formatCurrency(Math.max(0, dailySafe));
            if (dailySafeNoteEl) {
                if (remainingLimit < 0) {
                    dailySafeNoteEl.innerText = 'Limit sudah terlewati, prioritaskan pengeluaran penting dulu';
                } else {
                    dailySafeNoteEl.innerText = `${daysLeft} hari tersisa untuk tetap di bawah limit`;
                }
            }
        } else {
            dailySafeEl.innerText = 'Rp 0';
            if (dailySafeNoteEl) dailySafeNoteEl.innerText = 'Set limit bulanan untuk aktivasi';
        }

        const recurringExpense = this.estimateRecurringExpense();
        const topCat = this.topCategoryEntries && this.topCategoryEntries[0] ? this.topCategoryEntries[0][0] : null;
        const topCatName = topCat ? (i18n.t('budget_cat_' + topCat) || topCat) : 'belum ada';

        if (health.score >= 80) {
            proTipEl.innerText = `Kondisi keuangan sehat. Pertahankan ritme ini dan sisihkan minimal 10% dari pemasukan bulan depan.`;
        } else if (this.monthlyLimit > 0 && monthTotals.expense > this.monthlyLimit) {
            proTipEl.innerText = `Limit terlampaui. Fokus menahan kategori ${topCatName} dulu dan evaluasi transaksi harian.`;
        } else if (recurringExpense > 0) {
            proTipEl.innerText = `Terdeteksi pengeluaran rutin sekitar ${this.formatCurrency(recurringExpense)}/bulan. Pertimbangkan paket langganan yang lebih hemat.`;
        } else {
            proTipEl.innerText = `Sinyal premium aktif. Tambah transaksi rutin agar rekomendasi finansial makin akurat.`;
        }
    },

    calculateForecastExpense: function (expense, dayOfMonth, monthDays) {
        if (dayOfMonth <= 0) return expense;
        if (expense <= 0) return 0;
        return Math.round((expense / dayOfMonth) * monthDays);
    },

    calculateHealthScore: function (monthTotals, prevMonthTotals) {
        let score = 55;

        if (monthTotals.income > 0) {
            const savingRate = ((monthTotals.income - monthTotals.expense) / monthTotals.income) * 100;
            if (savingRate >= 30) score += 20;
            else if (savingRate >= 15) score += 12;
            else if (savingRate >= 5) score += 6;
            else if (savingRate < 0) score -= 20;
        }

        if (this.monthlyLimit > 0) {
            const usage = (monthTotals.expense / this.monthlyLimit) * 100;
            if (usage <= 60) score += 15;
            else if (usage <= 85) score += 8;
            else if (usage > 100) score -= 18;
        }

        const trend = monthTotals.expense - prevMonthTotals.expense;
        if (trend < 0) score += 8;
        if (trend > 0) score -= 6;

        score = Math.max(0, Math.min(100, Math.round(score)));

        let note = 'Perlu optimasi pengeluaran mingguan';
        if (score >= 85) note = 'Excellent. Arus kas sangat sehat.';
        else if (score >= 70) note = 'Bagus. Finansial kamu cukup stabil.';
        else if (score >= 55) note = 'Cukup aman, masih bisa ditingkatkan.';

        return { score, note };
    },

    estimateRecurringExpense: function () {
        const expenseTx = this.transactions.filter(tx => tx.type === 'expense');
        if (expenseTx.length < 4) return 0;

        const groups = {};
        expenseTx.forEach((tx) => {
            const key = `${tx.category}::${(tx.note || '').toLowerCase().trim()}`;
            const monthKey = this.getTransactionDate(tx).toISOString().slice(0, 7);
            if (!groups[key]) groups[key] = { months: new Set(), amounts: [] };
            groups[key].months.add(monthKey);
            groups[key].amounts.push(Number(tx.amount) || 0);
        });

        let recurring = 0;
        Object.values(groups).forEach((entry) => {
            if (entry.months.size < 2 || entry.amounts.length < 2) return;
            const avg = entry.amounts.reduce((a, b) => a + b, 0) / entry.amounts.length;
            if (avg > 0) recurring += avg;
        });

        return Math.round(recurring);
    },

    exportCurrentMonthCSV: function () {
        const currentMonthTx = this.getTransactionsByMonth(this.selectedMonth)
            .sort((a, b) => this.getTransactionDate(a) - this.getTransactionDate(b));

        if (currentMonthTx.length === 0) {
            if (typeof inboxManager !== 'undefined') inboxManager.showToast('Tidak ada data bulan ini untuk diekspor');
            return;
        }

        const header = ['Tanggal', 'Tipe', 'Sumber Dana', 'Kategori', 'Nominal', 'Catatan'];
        const rows = currentMonthTx.map((tx) => {
            const date = this.toDateInputValue(this.getTransactionDate(tx));
            const typeLabel = tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
            const fundSourceName = this.getFundSourceLabelById(tx.fundSourceId);
            const catName = i18n.t('budget_cat_' + tx.category) || tx.category;
            const safeNote = (tx.note || '').replace(/\"/g, '""');
            return [date, typeLabel, fundSourceName, catName, tx.amount, safeNote];
        });

        const csvContent = [header, ...rows]
            .map(row => row.map(v => `"${String(v)}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const monthSlug = this.toDateInputValue(this.selectedMonth).slice(0, 7);
        const fileName = `unilife-keuangan-${monthSlug}.csv`;
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);

        if (typeof inboxManager !== 'undefined') inboxManager.showToast('CSV berhasil diekspor');
    },

    cloneLastMonthExpenses: function () {
        const previousMonth = new Date(this.selectedMonth.getFullYear(), this.selectedMonth.getMonth() - 1, 1);
        const previousMonthTx = this.getTransactionsByMonth(previousMonth)
            .filter(tx => tx.type === 'expense' && !tx.isTransfer);

        if (previousMonthTx.length === 0) {
            if (typeof inboxManager !== 'undefined') inboxManager.showToast('Tidak ada pengeluaran bulan lalu untuk di-clone');
            return;
        }

        const confirmed = confirm(`Clone ${previousMonthTx.length} pengeluaran dari ${this.getMonthLabel(previousMonth)} ke ${this.getMonthLabel(this.selectedMonth)}?`);
        if (!confirmed) return;

        const maxDayCurrentMonth = new Date(this.selectedMonth.getFullYear(), this.selectedMonth.getMonth() + 1, 0).getDate();

        const clones = previousMonthTx.map((tx) => {
            const originalDate = this.getTransactionDate(tx);
            const clonedDay = Math.min(originalDate.getDate(), maxDayCurrentMonth);
            const clonedDate = new Date(this.selectedMonth.getFullYear(), this.selectedMonth.getMonth(), clonedDay, 12, 0, 0);

            return {
                ...tx,
                id: (typeof uuidv4 === 'function') ? uuidv4() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                date: clonedDate.toISOString(),
                note: tx.note ? `${tx.note} (clone)` : 'Auto Clone (bulan lalu)'
            };
        });

        this.transactions = [...this.transactions, ...clones];
        Storage.setBudgetTransactions(this.transactions);
        window.dispatchEvent(new CustomEvent('unilifeDataChanged', { detail: { key: 'unilife_budget_tx' } }));

        if (typeof inboxManager !== 'undefined') inboxManager.showToast(`${clones.length} transaksi berhasil di-clone`);
    },

    renderMonthHeader: function () {
        const monthLabel = document.getElementById('budget-current-month');
        const backTodayBtn = document.getElementById('budget-month-today');
        if (monthLabel) monthLabel.innerText = this.getMonthLabel();
        if (backTodayBtn) backTodayBtn.style.display = this.isCurrentMonthSelected() ? 'none' : 'inline-flex';
    },

    renderLimitProgress: function (currentExpense) {
        const elLimitText = document.getElementById('budget-limit-text');
        const elProgressBar = document.getElementById('budget-limit-progress');
        const elLimitAdvice = document.getElementById('budget-limit-advice');
        if (!elLimitText || !elProgressBar) return;

        if (this.monthlyLimit <= 0) {
            elLimitText.innerText = `Belum diatur`;
            elProgressBar.style.width = '0%';
            elProgressBar.style.background = 'var(--text-muted)';
            if (elLimitAdvice) {
                elLimitAdvice.innerText = 'Atur limit untuk dapat saran pengeluaran otomatis.';
                elLimitAdvice.style.color = 'var(--text-muted)';
            }
            return;
        }

        const rawPercentage = (currentExpense / this.monthlyLimit) * 100;
        const percentage = Math.min(rawPercentage, 100);

        // Dynamic styling based on usage
        let color = '#10b981'; // Green
        if (percentage >= 90) {
            color = '#ef4444'; // Red
        } else if (percentage >= 75) {
            color = '#f59e0b'; // Orange
        } else if (percentage >= 50) {
            color = '#3b82f6'; // Blue
        }

        elLimitText.innerText = `${this.formatCurrency(currentExpense)} / ${this.formatCurrency(this.monthlyLimit)}`;
        elProgressBar.style.width = `${percentage}%`;
        elProgressBar.style.background = color;

        if (elLimitAdvice) {
            if (rawPercentage > 120) {
                elLimitAdvice.innerText = 'Melebihi limit jauh. Prioritaskan pengeluaran wajib dan stop transaksi impulsif dulu.';
                elLimitAdvice.style.color = 'var(--danger)';
            } else if (rawPercentage > 100) {
                elLimitAdvice.innerText = 'Limit terlewati. Evaluasi 2-3 pos terbesar agar bulan depan lebih aman.';
                elLimitAdvice.style.color = 'var(--danger)';
            } else if (rawPercentage >= 85) {
                elLimitAdvice.innerText = 'Mendekati limit. Hindari pengeluaran non-prioritas sampai akhir bulan.';
                elLimitAdvice.style.color = 'var(--warning)';
            } else if (rawPercentage >= 60) {
                elLimitAdvice.innerText = 'Penggunaan masih terkontrol. Tetap pantau biar tidak bocor di akhir bulan.';
                elLimitAdvice.style.color = 'var(--text-main)';
            } else {
                elLimitAdvice.innerText = 'Pengeluaran aman. Kamu masih punya ruang yang cukup untuk bulan ini.';
                elLimitAdvice.style.color = 'var(--success)';
            }
        }
    },

    renderManualBalanceInfo: function () {
        const infoEl = document.getElementById('budget-manual-balance-info');
        if (!infoEl) return;

        if (!this.accounts || this.accounts.length === 0) {
            infoEl.innerText = 'Sumber dana belum diatur';
            return;
        }

        infoEl.innerText = `${this.accounts.length} sumber dana aktif • Saldo awal total: ${this.formatCurrency(this.baseBalance)}`;
    },

    getFundTypeLabel: function (type) {
        const normalized = this.normalizeAccountType(type);
        if (normalized === 'cash') return 'Cash';
        if (normalized === 'banking') return 'Banking';
        if (normalized === 'ewallet') return 'E-Wallet';
        return 'Lainnya';
    },

    getFundInterestVisual: function (account) {
        if (account?.type !== 'banking') {
            return { label: this.getFundTypeLabel(account?.type), className: 'budget-fund-badge' };
        }

        const rate = this.normalizeInterestRatePa(account?.interestRatePa);
        const frequency = this.normalizeInterestFrequency(account?.interestPayoutFrequency);

        if (account?.interestEnabled && rate > 0) {
            const rateText = String(rate).replace('.', ',');
            const freqText = frequency === 'daily' ? 'cair harian' : 'cair bulanan';
            return {
                label: `${rateText}% p.a. • ${freqText}`,
                className: 'budget-fund-badge budget-fund-badge-interest'
            };
        }

        return {
            label: 'Banking • tanpa bunga',
            className: 'budget-fund-badge budget-fund-badge-muted'
        };
    },

    renderFundBreakdown: function () {
        const container = document.getElementById('budget-fund-breakdown');
        if (!container) return;

        const balances = this.calculateAccountBalances(this.transactions);
        container.innerHTML = '';
        container.classList.add('budget-fund-grid');

        this.accounts.forEach((account) => {
            const value = Number(balances[account.id]) || 0;
            const isMinus = value < 0;
            const chip = document.createElement('div');
            const interestVisual = this.getFundInterestVisual(account);
            const hasInterestPulse = this.recentInterestFundIds.includes(account.id);
            chip.className = `budget-fund-card${isMinus ? ' is-minus' : ''}${hasInterestPulse ? ' has-interest-pulse' : ''}`;
            chip.innerHTML = `
                ${hasInterestPulse ? '<span class="budget-fund-interest-toast">+Bunga cair</span>' : ''}
                <p class="budget-fund-name">${account.name}</p>
                <p class="budget-fund-value">${this.formatCurrency(value)}</p>
                <span class="${interestVisual.className}">${interestVisual.label}</span>
            `;
            container.appendChild(chip);
        });
    },

    renderChart: function (currentMonthTx) {
        const canvas = document.getElementById('budgetChart');
        const centerText = document.getElementById('budget-chart-center-text');
        const centerAmount = document.getElementById('budget-chart-center-amount');
        if (!canvas) return;

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#E2E8F0' : '#1E293B';
        const tooltipBg = isDark ? 'rgba(15, 23, 42, 0.96)' : 'rgba(15, 23, 42, 0.9)';

        const expensesByCategory = this.getExpensesByCategory(currentMonthTx);
        const categories = Object.keys(expensesByCategory);
        const data = Object.values(expensesByCategory);

        const totalMonthExpense = data.reduce((a, b) => a + b, 0);

        if (totalMonthExpense === 0) {
            if (centerText) centerText.style.display = 'none';
            if (this.currentChart) {
                this.currentChart.destroy();
                this.currentChart = null;
            }
            // Draw empty state circle
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, 70, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(0,0,0,0.05)';
            // check dark mode
            if (isDark) {
                ctx.fillStyle = 'rgba(255,255,255,0.05)';
            }
            ctx.fill();

            ctx.font = "12px Inter";
            ctx.fillStyle = "var(--text-muted)";
            ctx.textAlign = "center";
            ctx.fillText("Belum ada data", canvas.width / 2, canvas.height / 2 + 4);
            return;
        }

        if (centerText && centerAmount) {
            centerText.style.display = 'block';
            centerAmount.innerText = this.formatCurrency(totalMonthExpense);
        }

        const labels = categories.map(cat => i18n.t('budget_cat_' + cat) || cat);

        // Color mapping for categories
        const colors = isDark
            ? {
                'food': '#fbbf24',
                'transport': '#60a5fa',
                'education': '#a78bfa',
                'shopping': '#f472b6',
                'entertainment': '#2dd4bf',
                'other': '#cbd5e1'
            }
            : {
                'food': '#f59e0b',
                'transport': '#3b82f6',
                'education': '#8b5cf6',
                'shopping': '#ec4899',
                'entertainment': '#14b8a6',
                'other': '#94a3b8'
            };

        const bgColors = categories.map(cat => colors[cat] || colors['other']);

        if (this.currentChart) {
            this.currentChart.data.labels = labels;
            this.currentChart.data.datasets[0].data = data;
            this.currentChart.data.datasets[0].backgroundColor = bgColors;
            this.currentChart.update();
        } else {
            this.currentChart = new Chart(canvas, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: bgColors,
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '75%', // Make it thin for premium look
                    plugins: {
                        legend: {
                            display: false, // Custom legend if needed, but tooltips are fine
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed !== null) {
                                        label += budgetManager.formatCurrency(context.parsed);
                                    }
                                    return label;
                                }
                            },
                            backgroundColor: tooltipBg,
                            padding: 12,
                            titleColor: '#f8fafc',
                            bodyColor: '#f8fafc',
                            titleFont: { family: 'Inter', size: 13 },
                            bodyFont: { family: 'Inter', size: 12 },
                            cornerRadius: 8,
                            displayColors: true
                        },
                        datalabels: {
                            display: false
                        }
                    },
                    color: textColor
                }
            });
        }

        if (this.currentChart) {
            this.currentChart.options.plugins.tooltip.backgroundColor = tooltipBg;
            this.currentChart.options.color = textColor;
            this.currentChart.update();
        }
    },

    renderInsights: function (monthTotals, prevMonthTotals, currentMonthTx) {
        const savingRateEl = document.getElementById('budget-insight-saving-rate');
        const savingNoteEl = document.getElementById('budget-insight-saving-note');
        const vsLastEl = document.getElementById('budget-insight-vs-last');
        const vsNoteEl = document.getElementById('budget-insight-vs-note');
        const topCatEl = document.getElementById('budget-insight-top-cat');
        const topValueEl = document.getElementById('budget-insight-top-value');

        if (savingRateEl && savingNoteEl) {
            if (monthTotals.income <= 0) {
                savingRateEl.innerText = '0%';
                savingNoteEl.innerText = 'Belum ada pemasukan di bulan ini';
            } else {
                const savingRate = Math.max(0, ((monthTotals.income - monthTotals.expense) / monthTotals.income) * 100);
                savingRateEl.innerText = `${Math.round(savingRate)}%`;
                savingNoteEl.innerText = savingRate >= 20 ? 'Ritme finansial sehat' : 'Coba kurangi pengeluaran variabel';
            }
        }

        if (vsLastEl && vsNoteEl) {
            const deltaExpense = monthTotals.expense - prevMonthTotals.expense;
            const isHigher = deltaExpense > 0;
            const sign = deltaExpense === 0 ? '' : (isHigher ? '+' : '-');
            vsLastEl.innerText = `${sign}${this.formatCurrency(Math.abs(deltaExpense))}`;
            vsLastEl.style.color = deltaExpense === 0 ? 'var(--text-main)' : (isHigher ? 'var(--danger)' : 'var(--success)');
            if (deltaExpense === 0) {
                vsNoteEl.innerText = 'Pengeluaran stabil dibanding bulan lalu';
            } else {
                vsNoteEl.innerText = isHigher ? 'Pengeluaran naik dari bulan lalu' : 'Pengeluaran turun dari bulan lalu';
            }
        }

        if (topCatEl && topValueEl) {
            const byCategory = this.getExpensesByCategory(currentMonthTx);
            const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
            this.topCategoryEntries = entries;
            if (entries.length === 0) {
                topCatEl.innerText = '-';
                topValueEl.innerText = 'Belum ada pengeluaran';
            } else {
                const [cat, value] = entries[0];
                topCatEl.innerText = i18n.t('budget_cat_' + cat) || cat;
                topValueEl.innerText = `${this.formatCurrency(value)} - Tap untuk detail`;
            }
        }
    },

    openTopCategoriesModal: function () {
        this.renderTopCategoriesModal();
        const modal = document.getElementById('modal-budget-top-categories');
        if (modal) modal.classList.add('active');
    },

    closeTopCategoriesModal: function () {
        const modal = document.getElementById('modal-budget-top-categories');
        if (modal) modal.classList.remove('active');
    },

    renderTopCategoriesModal: function () {
        const monthEl = document.getElementById('budget-top-categories-month');
        const listEl = document.getElementById('budget-top-categories-list');
        if (!listEl) return;

        if (monthEl) monthEl.innerText = this.getMonthLabel();
        listEl.innerHTML = '';

        if (!this.topCategoryEntries || this.topCategoryEntries.length === 0) {
            listEl.innerHTML = `
                <div style="text-align: center; padding: 1.25rem; border: 1px dashed var(--border-color); border-radius: var(--radius-md); color: var(--text-muted);">
                    Belum ada pengeluaran di bulan ini.
                </div>
            `;
            return;
        }

        this.topCategoryEntries.forEach((entry, index) => {
            const [cat, value] = entry;
            const row = document.createElement('div');
            row.className = 'budget-category-rank-row';
            row.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div class="budget-category-rank-badge">#${index + 1}</div>
                    <div>
                        <p style="font-weight: 700; color: var(--text-main);">${i18n.t('budget_cat_' + cat) || cat}</p>
                        <small style="color: var(--text-muted);">Kontribusi pengeluaran</small>
                    </div>
                </div>
                <p style="font-weight: 700; color: var(--text-main);">${this.formatCurrency(value)}</p>
            `;
            listEl.appendChild(row);
        });
    },

    renderTransactionList: function (monthTransactions) {
        const container = document.getElementById('budget-transaction-list');
        if (!container) return;

        container.innerHTML = '';

        if (monthTransactions.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
                    <i class="ph ph-receipt" style="font-size: 3rem; opacity: 0.3; margin-bottom: 0.75rem; display: block;"></i>
                    <p style="font-size: 0.9rem; font-weight: 500;">Belum ada catatan di ${this.getMonthLabel()}.</p>
                </div>
            `;
            return;
        }

        // Sort by date descending
        const sorted = [...monthTransactions].sort((a, b) => this.getTransactionDate(b) - this.getTransactionDate(a));

        // Show up to 15 items for richer monthly context
        const recent = sorted.slice(0, 15);

        recent.forEach((tx, index) => {
            const el = document.createElement('div');
            el.className = 'card tx-card';
            el.style.padding = '1rem';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.gap = '1rem';
            el.style.cursor = 'pointer';
            el.style.transition = 'transform 0.2s, box-shadow 0.2s';
            el.style.animationDelay = `${index * 0.04}s`;
            el.onclick = () => this.openEditModal(tx.id);

            const isIncome = tx.type === 'income';

            // Icon mapping
            const iconMap = {
                'food': 'hamburger',
                'transport': 'car',
                'education': 'graduation-cap',
                'shopping': 'shopping-bag',
                'entertainment': 'popcorn',
                'allowance': 'wallet',
                'salary': 'money',
                'bonus': 'gift',
                'other_income': 'coins',
                'other': 'dots-three-circle'
            };

            const iconName = iconMap[tx.category] || 'receipt';
            const catName = i18n.t('budget_cat_' + tx.category) || tx.category;
            const fundSourceName = this.getFundSourceLabelById(tx.fundSourceId);

            const dateObj = this.getTransactionDate(tx);
            const dateStr = dateObj.toLocaleDateString(i18n.locale(), { day: 'numeric', month: 'short' });

            el.innerHTML = `
                <div style="width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; 
                    background: ${isIncome ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'}; 
                    color: ${isIncome ? '#10b981' : '#f59e0b'};">
                    <i class="ph ph-${iconName}"></i>
                </div>
                <div style="flex: 1; overflow: hidden;">
                    <h4 style="font-size: 0.95rem; font-weight: 600; color: var(--text-main); margin-bottom: 0.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${tx.note || catName}
                    </h4>
                    <p style="font-size: 0.75rem; color: var(--text-muted);">${catName} &bull; ${fundSourceName} &bull; ${dateStr}</p>
                </div>
                <div style="text-align: right;">
                    <p style="font-size: 1rem; font-weight: 700; color: ${isIncome ? '#10b981' : 'var(--text-main)'};">
                        ${isIncome ? '+' : '-'}${this.formatCurrency(tx.amount)}
                    </p>
                </div>
            `;
            container.appendChild(el);
        });
    },

    animateMonthTransition: function () {
        const section = document.getElementById('view-budget');
        if (!section) return;

        if (this.monthAnimationTimer) {
            clearTimeout(this.monthAnimationTimer);
            this.monthAnimationTimer = null;
        }

        section.classList.remove('budget-month-animating');
        void section.offsetWidth;
        section.classList.add('budget-month-animating');

        this.monthAnimationTimer = setTimeout(() => {
            section.classList.remove('budget-month-animating');
            this.monthAnimationTimer = null;
        }, 500);
    },

    toDateInputValue: function (value) {
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = `${date.getMonth() + 1}`.padStart(2, '0');
        const day = `${date.getDate()}`.padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    getSuggestedTransactionDate: function () {
        const now = new Date();
        if (this.isCurrentMonthSelected()) return this.toDateInputValue(now);

        const year = this.selectedMonth.getFullYear();
        const month = this.selectedMonth.getMonth();
        const maxDay = new Date(year, month + 1, 0).getDate();
        const day = Math.min(now.getDate(), maxDay);
        const suggested = new Date(year, month, day);
        return this.toDateInputValue(suggested);
    },

    populateFundSourceSelect: function (targetId, selectedId) {
        const select = document.getElementById(targetId);
        if (!select) return;

        const preferredId = selectedId && this.getAccountById(selectedId)
            ? selectedId
            : this.getDefaultAccountId();

        select.innerHTML = this.accounts.map((account) => {
            const selectedAttr = account.id === preferredId ? 'selected' : '';
            return `<option value="${account.id}" ${selectedAttr}>${account.name} (${account.type})</option>`;
        }).join('');
    },

    previewFundSourceWarning: function () {
        const warningEl = document.getElementById('budget-fund-warning');
        const sourceSelect = document.getElementById('budget-fund-source');
        const amountInput = document.getElementById('budget-tx-amount');
        const typeInput = document.querySelector('input[name="budget-type"]:checked');
        if (!warningEl || !sourceSelect || !amountInput || !typeInput) return;

        if (typeInput.value !== 'expense') {
            warningEl.classList.remove('is-visible');
            warningEl.textContent = '';
            return;
        }

        const selectedSourceId = sourceSelect.value;
        const amount = this.parseNominalInput(amountInput.value);
        if (amount <= 0) {
            warningEl.classList.remove('is-visible');
            warningEl.textContent = '';
            return;
        }

        const balances = this.calculateAccountBalances(this.transactions);
        const currentBalance = Number(balances[selectedSourceId]) || 0;
        if (currentBalance < amount) {
            warningEl.classList.add('is-visible');
            warningEl.textContent = `Saldo sumber dana kurang (${this.formatCurrency(currentBalance)}). Kamu tetap bisa lanjut dan saldo akan minus.`;
            return;
        }

        warningEl.classList.remove('is-visible');
        warningEl.textContent = '';
    },

    renderAccountRows: function () {
        const container = document.getElementById('budget-account-list');
        if (!container) return;

        container.innerHTML = '';
        this.accounts.forEach((account) => {
            const row = document.createElement('div');
            row.className = 'budget-account-row';
            row.dataset.id = account.id;
            row.style.display = 'grid';
            row.style.gridTemplateColumns = '1.4fr 1fr 1fr auto';
            row.style.gap = '0.5rem';
            row.style.alignItems = 'center';
            row.style.marginBottom = '0.5rem';

            const isBanking = account.type === 'banking';
            const interestEnabled = !!account.interestEnabled;
            const ratePa = this.normalizeInterestRatePa(account.interestRatePa);
            const payoutFrequency = this.normalizeInterestFrequency(account.interestPayoutFrequency);

            row.innerHTML = `
                <input type="text" class="budget-account-name" value="${account.name}" data-id="${account.id}" placeholder="Nama sumber dana" required>
                <select class="budget-account-type" data-id="${account.id}">
                    <option value="cash" ${account.type === 'cash' ? 'selected' : ''}>cash</option>
                    <option value="banking" ${account.type === 'banking' ? 'selected' : ''}>banking</option>
                    <option value="ewallet" ${account.type === 'ewallet' ? 'selected' : ''}>ewallet</option>
                    <option value="other" ${account.type === 'other' ? 'selected' : ''}>other</option>
                </select>
                <input type="number" class="budget-account-initial" value="${Number(account.initialBalance) || 0}" data-id="${account.id}" placeholder="Saldo awal">
                <button type="button" class="btn btn-outline" data-remove-id="${account.id}" style="padding:0.45rem 0.55rem; color: var(--danger); border-color: var(--danger);">
                    <i class="ph ph-trash"></i>
                </button>
                <div style="grid-column:1 / -1; display:grid; grid-template-columns:auto 1fr 1fr; gap:0.45rem; align-items:center; padding:0.45rem 0.55rem; border:1px solid var(--border-color); border-radius:10px; background:var(--bg-main);">
                    <label style="display:inline-flex; align-items:center; gap:0.35rem; font-size:0.76rem; font-weight:600; color:var(--text-main);">
                        <input type="checkbox" class="budget-account-interest-enabled" ${interestEnabled ? 'checked' : ''} ${isBanking ? '' : 'disabled'}>
                        Bunga
                    </label>
                    <input type="number" class="budget-account-interest-rate" min="0" max="100" step="0.01" placeholder="% p.a" value="${ratePa || ''}" ${isBanking && interestEnabled ? '' : 'disabled'} style="padding:0.45rem 0.55rem; font-size:0.8rem;">
                    <select class="budget-account-interest-frequency" ${isBanking && interestEnabled ? '' : 'disabled'} style="padding:0.45rem 0.55rem; font-size:0.8rem;">
                        <option value="daily" ${payoutFrequency === 'daily' ? 'selected' : ''}>Cair harian</option>
                        <option value="monthly" ${payoutFrequency !== 'daily' ? 'selected' : ''}>Cair bulanan</option>
                    </select>
                </div>
            `;

            const typeSelect = row.querySelector('.budget-account-type');
            const interestToggle = row.querySelector('.budget-account-interest-enabled');
            const interestRateInput = row.querySelector('.budget-account-interest-rate');
            const interestFrequencySelect = row.querySelector('.budget-account-interest-frequency');

            const syncInterestAvailability = () => {
                const type = this.normalizeAccountType(typeSelect?.value);
                const canUseInterest = type === 'banking';
                if (interestToggle) {
                    interestToggle.disabled = !canUseInterest;
                    if (!canUseInterest) interestToggle.checked = false;
                }

                const enableFields = canUseInterest && !!interestToggle?.checked;
                if (interestRateInput) {
                    interestRateInput.disabled = !enableFields;
                    if (!enableFields) interestRateInput.value = '';
                }
                if (interestFrequencySelect) {
                    interestFrequencySelect.disabled = !enableFields;
                    if (!enableFields) interestFrequencySelect.value = 'monthly';
                }
            };

            if (typeSelect) typeSelect.onchange = syncInterestAvailability;
            if (interestToggle) interestToggle.onchange = syncInterestAvailability;
            syncInterestAvailability();

            const removeBtn = row.querySelector(`[data-remove-id="${account.id}"]`);
            if (removeBtn) {
                removeBtn.onclick = () => {
                    if (this.accounts.length <= 1) {
                        if (typeof inboxManager !== 'undefined') inboxManager.showToast('Minimal harus ada 1 sumber dana');
                        return;
                    }
                    this.accounts = this.accounts.filter((item) => item.id !== account.id);
                    this.renderAccountRows();
                };
            }

            container.appendChild(row);
        });
    },

    // --- Modal Logic ---

    openLimitModal: function () {
        this.setNominalInputValue('budget-limit-input', this.monthlyLimit > 0 ? this.monthlyLimit : '');
        document.getElementById('modal-budget-limit').classList.add('active');
        setTimeout(() => document.getElementById('budget-limit-input').focus(), 100);
    },

    openBalanceModal: function () {
        this.renderAccountRows();
        document.getElementById('modal-budget-balance').classList.add('active');
        setTimeout(() => {
            const firstInput = document.querySelector('.budget-account-name');
            if (firstInput) firstInput.focus();
        }, 100);
    },

    closeBalanceModal: function () {
        document.getElementById('modal-budget-balance').classList.remove('active');
    },

    addBudgetAccountRow: function () {
        this.accounts.push({
            id: (typeof uuidv4 === 'function') ? uuidv4() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            name: 'Sumber Dana Baru',
            type: 'cash',
            initialBalance: 0,
            interestEnabled: false,
            interestRatePa: 0,
            interestPayoutFrequency: 'monthly',
            interestLastAppliedAt: null
        });
        this.renderAccountRows();
    },

    saveBaseBalance: function (e) {
        e.preventDefault();

        const rows = Array.from(document.querySelectorAll('.budget-account-row'));
        const previousById = new Map(this.accounts.map((account) => [account.id, account]));

        const nextAccounts = rows.map((row) => {
            const id = row.dataset.id;
            const previous = previousById.get(id) || null;

            const nameInput = row.querySelector('.budget-account-name');
            const typeInput = row.querySelector('.budget-account-type');
            const initialInput = row.querySelector('.budget-account-initial');
            const interestEnabledInput = row.querySelector('.budget-account-interest-enabled');
            const interestRateInput = row.querySelector('.budget-account-interest-rate');
            const interestFrequencyInput = row.querySelector('.budget-account-interest-frequency');

            const type = this.normalizeAccountType(typeInput?.value);
            const ratePa = this.normalizeInterestRatePa(interestRateInput?.value);
            const frequency = this.normalizeInterestFrequency(interestFrequencyInput?.value);
            const isBanking = type === 'banking';
            const rawEnabled = !!interestEnabledInput?.checked;
            const interestEnabled = isBanking && rawEnabled && ratePa > 0;

            let interestLastAppliedAt = null;
            if (interestEnabled) {
                const previousEnabled = previous?.interestEnabled && previous?.type === 'banking';
                const previousFrequency = this.normalizeInterestFrequency(previous?.interestPayoutFrequency);
                if (previousEnabled && previousFrequency === frequency && previous?.interestLastAppliedAt) {
                    interestLastAppliedAt = this.toLocalDateKey(previous.interestLastAppliedAt);
                } else {
                    interestLastAppliedAt = this.getCurrentInterestMarkerDate(frequency);
                }
            }

            return {
                id,
                name: String(nameInput?.value || '').trim() || 'Sumber Dana',
                type,
                initialBalance: Number(initialInput?.value) || 0,
                interestEnabled,
                interestRatePa: interestEnabled ? ratePa : 0,
                interestPayoutFrequency: frequency,
                interestLastAppliedAt
            };
        });

        this.accounts = this.normalizeAccounts(nextAccounts);
        this.transactions = this.normalizeTransactions(this.transactions);

        this.baseBalance = this.getTotalInitialBalance();
        Storage.setBudgetAccounts(this.accounts);
        Storage.setBudgetBaseBalance(this.baseBalance);
        Storage.setBudgetTransactions(this.transactions);
        window.dispatchEvent(new CustomEvent('unilifeDataChanged', { detail: { key: 'unilife_budget_accounts' } }));
        window.dispatchEvent(new CustomEvent('unilifeDataChanged', { detail: { key: 'unilife_budget_base_balance' } }));

        this.closeBalanceModal();
        if (typeof inboxManager !== 'undefined') {
            inboxManager.showToast('Sumber dana berhasil disimpan');
        }
    },

    closeLimitModal: function () {
        document.getElementById('modal-budget-limit').classList.remove('active');
    },

    saveLimit: function (e) {
        e.preventDefault();
        const rawValue = document.getElementById('budget-limit-input').value;
        const limit = this.parseNominalInput(rawValue);

        Storage.setBudgetLimit(limit);

        // Dispatch event so UI updates
        window.dispatchEvent(new CustomEvent('unilifeDataChanged', { detail: { key: 'unilife_budget_limit' } }));

        this.closeLimitModal();
        if (typeof inboxManager !== 'undefined') inboxManager.showToast('Limit berhasil disimpan');
    },

    openAddModal: function () {
        document.getElementById('budget-modal-title').innerText = i18n.t('budget_add_transaction') || 'Tambah Transaksi';
        document.getElementById('form-budget-add').reset();
        document.getElementById('budget-tx-id').value = '';
        this.setNominalInputValue('budget-tx-amount', '');
        document.getElementById('budget-tx-date').value = this.getSuggestedTransactionDate();
        document.getElementById('budget-btn-delete').style.display = 'none';
        this.populateFundSourceSelect('budget-fund-source');

        this.handleTypeChange('expense'); // Default to expense

        document.getElementById('modal-budget-add').classList.add('active');
        setTimeout(() => document.getElementById('budget-tx-amount').focus(), 100);
    },

    openEditModal: function (id) {
        const tx = this.transactions.find(t => t.id === id);
        if (!tx) return;

        document.getElementById('budget-modal-title').innerText = 'Edit Transaksi';
        document.getElementById('budget-tx-id').value = tx.id;
        this.setNominalInputValue('budget-tx-amount', tx.amount);
        document.getElementById('budget-tx-note').value = tx.note || '';
        document.getElementById('budget-tx-date').value = this.toDateInputValue(this.getTransactionDate(tx));
        this.populateFundSourceSelect('budget-fund-source', tx.fundSourceId);

        // Set type
        this.handleTypeChange(tx.type);
        document.querySelector(`input[name="budget-type"][value="${tx.type}"]`).checked = true;

        // Set category
        const catName = tx.type === 'expense' ? 'budget-category' : 'budget-category-inc';
        const catRadio = document.querySelector(`input[name="${catName}"][value="${tx.category}"]`);
        if (catRadio) catRadio.checked = true;

        document.getElementById('budget-btn-delete').style.display = 'block';
        document.getElementById('modal-budget-add').classList.add('active');
    },

    closeAddModal: function () {
        document.getElementById('modal-budget-add').classList.remove('active');
        const warningEl = document.getElementById('budget-fund-warning');
        if (warningEl) {
            warningEl.classList.remove('is-visible');
            warningEl.textContent = '';
        }
    },

    resetBudgetData: function () {
        const confirmed = confirm('Reset semua catatan keuangan? Semua transaksi dan limit bulanan akan dihapus.');
        if (!confirmed) return;

        this.transactions = [];
        this.accounts = this.getDefaultBudgetAccounts();
        this.monthlyLimit = 0;
        this.baseBalance = 0;
        this.topCategoryEntries = [];
        this.selectedMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        Storage.setBudgetTransactions([]);
        Storage.setBudgetAccounts(this.accounts);
        Storage.setBudgetLimit(0);
        Storage.setBudgetBaseBalance(0);
        window.dispatchEvent(new CustomEvent('unilifeDataChanged', { detail: { key: 'unilife_budget_tx' } }));
        window.dispatchEvent(new CustomEvent('unilifeDataChanged', { detail: { key: 'unilife_budget_accounts' } }));
        window.dispatchEvent(new CustomEvent('unilifeDataChanged', { detail: { key: 'unilife_budget_limit' } }));
        window.dispatchEvent(new CustomEvent('unilifeDataChanged', { detail: { key: 'unilife_budget_base_balance' } }));

        this.closeTopCategoriesModal();
        if (typeof inboxManager !== 'undefined') inboxManager.showToast('Catatan keuangan berhasil di-reset');
    },

    handleTypeChange: function (type) {
        const expenseBtn = document.getElementById('budget-type-expense-btn');
        const incomeBtn = document.getElementById('budget-type-income-btn');
        const expenseGrid = document.getElementById('budget-cat-grid-expense');
        const incomeGrid = document.getElementById('budget-cat-grid-income');
        const saveBtn = document.getElementById('budget-btn-save');

        if (type === 'expense') {
            expenseBtn.style.color = '#ef4444';
            expenseBtn.style.background = 'var(--bg-card)';
            expenseBtn.style.boxShadow = 'var(--shadow-sm)';

            incomeBtn.style.color = 'var(--text-muted)';
            incomeBtn.style.background = 'transparent';
            incomeBtn.style.boxShadow = 'none';

            expenseGrid.style.display = 'grid';
            incomeGrid.style.display = 'none';

            saveBtn.style.background = '#ef4444';
            saveBtn.style.borderColor = '#ef4444';
            saveBtn.innerText = i18n.t('budget_save') || 'Simpan Pengeluaran';

            // Ensure first is selected if nothing is
            if (!document.querySelector('input[name="budget-category"]:checked')) {
                document.querySelector('input[name="budget-category"][value="food"]').checked = true;
            }
        } else {
            incomeBtn.style.color = '#10b981';
            incomeBtn.style.background = 'var(--bg-card)';
            incomeBtn.style.boxShadow = 'var(--shadow-sm)';

            expenseBtn.style.color = 'var(--text-muted)';
            expenseBtn.style.background = 'transparent';
            expenseBtn.style.boxShadow = 'none';

            expenseGrid.style.display = 'none';
            incomeGrid.style.display = 'grid';

            saveBtn.style.background = '#10b981';
            saveBtn.style.borderColor = '#10b981';
            saveBtn.innerText = 'Simpan Pemasukan';

            // Ensure first is selected if nothing is
            if (!document.querySelector('input[name="budget-category-inc"]:checked')) {
                document.querySelector('input[name="budget-category-inc"][value="allowance"]').checked = true;
            }
        }

        this.previewFundSourceWarning();
    },

    syncFromBbm: function (action, payload) {
        const bbmId = payload?.relation?.bbm_id || payload?.bbm_id;
        if (!bbmId) return false;

        this.transactions = this.normalizeTransactions(Storage.getBudgetTransactions());
        const index = this.transactions.findIndex((tx) =>
            tx?.relation?.bbm_id === bbmId || tx?.bbm_id === bbmId || tx?.sourceId === bbmId
        );

        if (action === 'delete') {
            if (index > -1) {
                this.transactions.splice(index, 1);
                Storage.setBudgetTransactions(this.transactions);
                window.dispatchEvent(new CustomEvent('unilifeDataChanged', { detail: { key: 'unilife_budget_tx' } }));
            }
            return true;
        }

        const amount = this.parseNominalInput(payload?.nominal);
        if (amount <= 0) return false;

        const parsedDate = payload?.tanggal ? new Date(payload.tanggal) : new Date();
        const txDate = Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();

        const linkedTx = {
            type: 'expense',
            amount,
            category: 'transport',
            note: payload?.catatan || 'Isi BBM',
            date: txDate,
            fundSourceId: payload?.fundSourceId || this.getDefaultAccountId(),
            relation: { bbm_id: bbmId },
            bbm_id: bbmId,
            source: 'bbm',
            sourceId: bbmId
        };

        if (index > -1) {
            this.transactions[index] = {
                ...this.transactions[index],
                ...linkedTx
            };
        } else {
            this.transactions.push({
                id: (typeof uuidv4 === 'function') ? uuidv4() : Date.now().toString(),
                ...linkedTx
            });
        }

        Storage.setBudgetTransactions(this.transactions);
        window.dispatchEvent(new CustomEvent('unilifeDataChanged', { detail: { key: 'unilife_budget_tx' } }));
        return true;
    },

    saveTransaction: function (e) {
        e.preventDefault();

        const id = document.getElementById('budget-tx-id').value;
        const type = document.querySelector('input[name="budget-type"]:checked').value;
        const amount = this.parseNominalInput(document.getElementById('budget-tx-amount').value);
        const note = document.getElementById('budget-tx-note').value.trim();
        const txDateRaw = document.getElementById('budget-tx-date').value;
        const fundSourceId = document.getElementById('budget-fund-source').value;

        const catName = type === 'expense' ? 'budget-category' : 'budget-category-inc';
        const category = document.querySelector(`input[name="${catName}"]:checked`).value;

        if (amount <= 0) {
            if (typeof inboxManager !== 'undefined') inboxManager.showToast('Nominal tidak valid!');
            return;
        }

        if (!this.getAccountById(fundSourceId)) {
            if (typeof inboxManager !== 'undefined') inboxManager.showToast('Sumber dana tidak valid');
            return;
        }

        if (type === 'expense') {
            const accountBalances = this.calculateAccountBalances(this.transactions);
            const currentBalance = Number(accountBalances[fundSourceId]) || 0;
            if (currentBalance < amount) {
                const confirmed = confirm(`Saldo sumber dana ini kurang (${this.formatCurrency(currentBalance)}). Lanjutkan dan izinkan saldo minus?`);
                if (!confirmed) return;
            }
        }

        const parsedDate = txDateRaw ? new Date(`${txDateRaw}T12:00:00`) : new Date();
        const txDate = Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();

        if (id) {
            // Edit existing
            const index = this.transactions.findIndex(t => t.id === id);
            if (index > -1) {
                this.transactions[index] = {
                    ...this.transactions[index],
                    type,
                    amount,
                    category,
                    note,
                    date: txDate,
                    fundSourceId
                };
            }
        } else {
            // Add new
            const newTx = {
                id: (typeof uuidv4 === 'function') ? uuidv4() : Date.now().toString(),
                type,
                amount,
                category,
                note,
                date: txDate,
                fundSourceId
            };
            this.transactions.push(newTx);
        }

        // Keep selected month aligned with just-saved transaction for a seamless monthly workflow.
        const savedDate = new Date(txDate);
        this.selectedMonth = new Date(savedDate.getFullYear(), savedDate.getMonth(), 1);

        Storage.setBudgetTransactions(this.transactions);
        window.dispatchEvent(new CustomEvent('unilifeDataChanged', { detail: { key: 'unilife_budget_tx' } }));

        this.closeAddModal();
        if (typeof inboxManager !== 'undefined') inboxManager.showToast('Transaksi berhasil disimpan');
    },

    deleteTransaction: function () {
        const id = document.getElementById('budget-tx-id').value;
        if (!id) return;

        if (confirm(i18n.t('budget_delete_confirm') || 'Hapus transaksi ini?')) {
            this.transactions = this.transactions.filter(t => t.id !== id);
            Storage.setBudgetTransactions(this.transactions);
            window.dispatchEvent(new CustomEvent('unilifeDataChanged', { detail: { key: 'unilife_budget_tx' } }));

            this.closeAddModal();
            if (typeof inboxManager !== 'undefined') inboxManager.showToast('Transaksi dihapus');
        }
    },

    openTransferModal: function () {
        this.populateFundSourceSelect('budget-transfer-from');
        this.populateFundSourceSelect('budget-transfer-to', this.accounts[1]?.id || this.getDefaultAccountId());
        this.setNominalInputValue('budget-transfer-amount', '');
        document.getElementById('budget-transfer-note').value = '';
        document.getElementById('budget-transfer-date').value = this.getSuggestedTransactionDate();
        document.getElementById('modal-budget-transfer').classList.add('active');
    },

    closeTransferModal: function () {
        document.getElementById('modal-budget-transfer').classList.remove('active');
    },

    saveTransferTransaction: function (e) {
        e.preventDefault();

        const fromId = document.getElementById('budget-transfer-from').value;
        const toId = document.getElementById('budget-transfer-to').value;
        const amount = this.parseNominalInput(document.getElementById('budget-transfer-amount').value);
        const note = document.getElementById('budget-transfer-note').value.trim();
        const txDateRaw = document.getElementById('budget-transfer-date').value;

        if (!this.getAccountById(fromId) || !this.getAccountById(toId)) {
            if (typeof inboxManager !== 'undefined') inboxManager.showToast('Sumber dana transfer tidak valid');
            return;
        }

        if (fromId === toId) {
            if (typeof inboxManager !== 'undefined') inboxManager.showToast('Sumber asal dan tujuan harus berbeda');
            return;
        }

        if (amount <= 0) {
            if (typeof inboxManager !== 'undefined') inboxManager.showToast('Nominal transfer tidak valid');
            return;
        }

        const balances = this.calculateAccountBalances(this.transactions);
        const fromBalance = Number(balances[fromId]) || 0;
        if (fromBalance < amount) {
            const confirmed = confirm(`Saldo sumber asal kurang (${this.formatCurrency(fromBalance)}). Lanjutkan transfer dan izinkan saldo minus?`);
            if (!confirmed) return;
        }

        const parsedDate = txDateRaw ? new Date(`${txDateRaw}T12:00:00`) : new Date();
        const txDate = Number.isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
        const transferId = (typeof uuidv4 === 'function') ? uuidv4() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

        const transferOut = {
            id: (typeof uuidv4 === 'function') ? uuidv4() : `${Date.now()}-out`,
            type: 'expense',
            amount,
            category: 'other',
            note: note || `Transfer ke ${this.getFundSourceLabelById(toId)}`,
            date: txDate,
            fundSourceId: fromId,
            isTransfer: true,
            transferId,
            transferDirection: 'out'
        };

        const transferIn = {
            id: (typeof uuidv4 === 'function') ? uuidv4() : `${Date.now()}-in`,
            type: 'income',
            amount,
            category: 'other_income',
            note: note || `Transfer dari ${this.getFundSourceLabelById(fromId)}`,
            date: txDate,
            fundSourceId: toId,
            isTransfer: true,
            transferId,
            transferDirection: 'in'
        };

        this.transactions.push(transferOut, transferIn);

        const savedDate = new Date(txDate);
        this.selectedMonth = new Date(savedDate.getFullYear(), savedDate.getMonth(), 1);

        Storage.setBudgetTransactions(this.transactions);
        window.dispatchEvent(new CustomEvent('unilifeDataChanged', { detail: { key: 'unilife_budget_tx' } }));
        this.closeTransferModal();
        if (typeof inboxManager !== 'undefined') inboxManager.showToast('Transfer berhasil disimpan');
    }
};
