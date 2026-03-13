const notesManager = {
    notes: [],
    filter: 'all',
    sortBy: 'newest',
    searchQuery: '',

    init: function () {
        this.notes = Storage.getNotes() || [];
        this.renderCategoryTabs();
        this.renderNotesDashboard();
    },

    openNotesDashboard: function () {
        // Remove active from any bottom nav elements since Notes isn't fixed there
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));

        // Hide all views, display view-notes
        document.querySelectorAll('.view-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById('view-notes').classList.add('active');

        this.renderNotesDashboard();
    },

    renderCategoryTabs: function () {
        const container = document.getElementById('notes-category-tabs');
        if (!container) return;

        const categories = [
            { id: 'all', label: 'Semua', icon: 'list' },
            { id: 'lecture', label: 'Materi Kuliah', icon: 'book-open' },
            { id: 'assignment', label: 'Tugas/PR', icon: 'pencil-line' },
            { id: 'exam', label: 'Persiapan Ujian', icon: 'exam' },
            { id: 'general', label: 'Umum', icon: 'note' }
        ];

        container.innerHTML = '';
        categories.forEach(cat => {
            const btn = document.createElement('div');
            btn.className = `day-tab ${this.filter === cat.id ? 'active' : ''}`;
            btn.innerHTML = `<i class="ph ph-${cat.icon}"></i> ${cat.label}`;
            btn.onclick = () => this.setFilter(cat.id);
            container.appendChild(btn);
        });

        // Re-bind drag-to-scroll to this specific container
        if (typeof window.setupDragToScroll === 'function') {
            window.setupDragToScroll('#notes-category-tabs');
        }
    },

    setFilter: function (categoryId) {
        this.filter = categoryId;
        this.renderCategoryTabs();
        this.renderNotesDashboard();
    },

    handleSearch: function (query) {
        this.searchQuery = query.toLowerCase();
        this.renderNotesDashboard();
    },

    handleSortChange: function (sortValue) {
        this.sortBy = sortValue;
        this.renderNotesDashboard();
    },

    renderNotesDashboard: function () {
        const container = document.getElementById('notes-dashboard-list');
        if (!container) return;
        container.innerHTML = '';

        let filteredNotes = this.notes;

        // Filter by category
        if (this.filter !== 'all') {
            filteredNotes = filteredNotes.filter(n => n.category === this.filter);
        }

        // Filter by search query
        if (this.searchQuery) {
            filteredNotes = filteredNotes.filter(n =>
                n.title.toLowerCase().includes(this.searchQuery) ||
                n.content.toLowerCase().includes(this.searchQuery) ||
                (n.courseName && n.courseName.toLowerCase().includes(this.searchQuery))
            );
        }

        // Sort notes
        let sortedNotes = [...filteredNotes];
        switch (this.sortBy) {
            case 'newest':
                sortedNotes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                break;
            case 'oldest':
                sortedNotes.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
                break;
            case 'a-z':
                sortedNotes.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'z-a':
                sortedNotes.sort((a, b) => b.title.localeCompare(a.title));
                break;
        }

        if (sortedNotes.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; padding:4rem 1rem; color:var(--text-muted); background:var(--bg-card); border-radius:var(--radius-md); border:1px dashed var(--border-color);">
                    <i class="ph ph-notebook" style="font-size:3.5rem; opacity:0.3; margin-bottom:1rem; display:block;"></i>
                    <p style="font-size:1rem; font-weight:500;">${this.searchQuery ? 'Tidak ada catatan yang cocok dengan pencarian.' : 'Belum ada catatan di kategori ini.'}</p>
                    ${!this.searchQuery ? '<button class="btn btn-outline mt-4" onclick="notesManager.openAddModal()"><i class="ph ph-plus"></i> Tambah Catatan Pertama</button>' : ''}
                </div>
            `;
            return;
        }

        sortedNotes.forEach(note => {
            const categoryColors = {
                'general': { bg: 'var(--bg-card)', border: 'var(--text-muted)', borderLight: 'rgba(148, 163, 184, 0.1)', icon: 'note', label: 'Umum', glow: 'rgba(148, 163, 184, 0.05)' },
                'lecture': { bg: 'var(--bg-card)', border: 'var(--primary)', borderLight: 'rgba(59, 130, 246, 0.1)', icon: 'book-open', label: 'Materi Kuliah', glow: 'rgba(59, 130, 246, 0.05)' },
                'assignment': { bg: 'var(--bg-card)', border: 'var(--success)', borderLight: 'rgba(16, 185, 129, 0.1)', icon: 'pencil-line', label: 'Tugas/PR', glow: 'rgba(16, 185, 129, 0.05)' },
                'exam': { bg: 'var(--bg-card)', border: 'var(--danger)', borderLight: 'var(--danger-light)', icon: 'exam', label: 'Persiapan Ujian', glow: 'rgba(239, 68, 68, 0.05)' }
            };

            const style = categoryColors[note.category] || categoryColors['general'];
            const updatedDate = new Date(note.updatedAt);
            const timeStr = updatedDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

            // Truncate content for preview
            const contentPreview = note.content.length > 120 ? note.content.substring(0, 120) + '...' : note.content;

            const el = document.createElement('div');
            el.className = 'card note-card-premium fade-in';
            el.style.background = style.bg;
            el.style.border = '1px solid var(--border-color)';
            el.style.borderLeft = `4px solid ${style.border}`;
            el.style.padding = '1.25rem';
            el.style.position = 'relative';
            el.style.cursor = 'pointer';
            el.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            el.style.overflow = 'hidden';

            // Click to edit
            el.onclick = (e) => {
                if (!e.target.closest('button')) {
                    this.editNote(note.id);
                }
            };

            // Hover effects
            el.onmouseenter = function () {
                this.style.transform = 'translateY(-4px)';
                this.style.boxShadow = `0 12px 24px -8px ${style.glow}, var(--shadow-md)`;
            };
            el.onmouseleave = function () {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = 'var(--shadow-sm)';
            };

            el.innerHTML = `
                <div style="position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; background: ${style.border}; opacity: 0.05; border-radius: 50%;"></div>
                
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem; position: relative; z-index: 1;">
                    <div style="display:flex; align-items:center; gap:0.5rem; background: ${style.borderLight}; padding: 0.25rem 0.625rem; border-radius: 1rem;">
                        <i class="ph-fill ph-${style.icon}" style="color:${style.border}; font-size:0.9rem;"></i>
                        <span style="font-size:0.7rem; color:${style.border}; text-transform:uppercase; font-weight:700; letter-spacing:0.03em;">${style.label}</span>
                    </div>
                    ${note.courseName ? `
                        <div style="background: rgba(147, 51, 234, 0.1); padding: 0.25rem 0.625rem; border-radius: 1rem; border: 1px solid rgba(147, 51, 234, 0.2);">
                            <span style="font-size:0.7rem; color: #a855f7; font-weight:600;"><i class="ph ph-graduation-cap"></i> ${note.courseName}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div style="position: relative; z-index: 1;">
                    <div style="font-weight:700; font-size:1.15rem; margin-bottom:0.5rem; color:var(--text-main); line-height:1.3;">${note.title}</div>
                    <div style="font-size:0.875rem; color:var(--text-muted); line-height:1.6; margin-bottom:1rem;">${contentPreview}</div>
                </div>
                
                <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:0.75rem; position: relative; z-index: 1;">
                    <span style="font-size:0.7rem; color:var(--text-muted); display: flex; align-items: center; gap: 0.25rem;"><i class="ph ph-clock"></i> ${timeStr}</span>
                    <div style="display:flex; gap:0.5rem;" onclick="event.stopPropagation();">
                        <button class="icon-btn" onclick="notesManager.editNote('${note.id}')" style="width:32px; height:32px; border:none; box-shadow:none; color:${style.border}; background:${style.borderLight}; transition: all 0.2s;">
                            <i class="ph-bold ph-pencil-simple"></i>
                        </button>
                        <button class="icon-btn" onclick="notesManager.deleteNote('${note.id}')" style="width:32px; height:32px; border:none; box-shadow:none; color:var(--danger); background:var(--danger-light); transition: all 0.2s;">
                            <i class="ph-bold ph-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(el);
        });
    },

    openAddModal: function (scheduleId = null, courseName = null) {
        const modal = document.getElementById('modal-note-add');
        if (modal) {
            document.getElementById('note-id-input').value = '';
            document.getElementById('note-schedule-id-input').value = scheduleId || '';
            document.getElementById('note-course-name-input').value = courseName || '';
            document.getElementById('modal-note-title').innerText = courseName ? `Catatan: ${courseName}` : 'Catatan Baru';

            // Pre-select category to lecture if from schedule
            if (scheduleId && courseName) {
                document.getElementById('note-category-input').value = 'lecture';
            }

            modal.classList.add('active');
            setTimeout(() => document.getElementById('note-title-input').focus(), 100);
        }
    },

    // Shortcut untuk buka dari jadwal
    openAddModalFromSchedule: function (scheduleId, courseName) {
        this.openAddModal(scheduleId, courseName);
    },

    closeAddModal: function () {
        const modal = document.getElementById('modal-note-add');
        if (modal) modal.classList.remove('active');
        document.getElementById('note-form').reset();
        document.getElementById('note-id-input').value = '';
        document.getElementById('note-schedule-id-input').value = '';
        document.getElementById('note-course-name-input').value = '';
    },

    editNote: function (id) {
        const note = this.notes.find(n => n.id === id);
        if (!note) return;

        document.getElementById('note-id-input').value = note.id;
        document.getElementById('note-title-input').value = note.title;
        document.getElementById('note-category-input').value = note.category;
        document.getElementById('note-content-input').value = note.content;
        document.getElementById('note-schedule-id-input').value = note.scheduleId || '';
        document.getElementById('note-course-name-input').value = note.courseName || '';

        document.getElementById('modal-note-title').innerText = 'Edit Catatan';
        document.getElementById('modal-note-add').classList.add('active');
    },

    deleteNote: function (id) {
        if (confirm('Apakah Anda yakin ingin menghapus catatan ini?')) {
            this.notes = this.notes.filter(n => n.id !== id);
            Storage.setNotes(this.notes);
            this.renderNotesDashboard();
            this.showToast('Catatan dihapus');
        }
    },

    saveNote: function (e) {
        e.preventDefault();

        const idToEdit = document.getElementById('note-id-input').value;
        const scheduleId = document.getElementById('note-schedule-id-input').value || null;
        const courseName = document.getElementById('note-course-name-input').value || null;
        const now = new Date().toISOString();

        if (idToEdit) {
            // Edit existing
            const index = this.notes.findIndex(n => n.id === idToEdit);
            if (index > -1) {
                this.notes[index].title = document.getElementById('note-title-input').value.trim();
                this.notes[index].content = document.getElementById('note-content-input').value.trim();
                this.notes[index].category = document.getElementById('note-category-input').value || 'general';
                this.notes[index].scheduleId = scheduleId;
                this.notes[index].courseName = courseName;
                this.notes[index].updatedAt = now;
            }
        } else {
            // Add new
            const note = {
                id: uuidv4(),
                title: document.getElementById('note-title-input').value.trim(),
                content: document.getElementById('note-content-input').value.trim(),
                category: document.getElementById('note-category-input').value || 'general',
                scheduleId: scheduleId,
                courseName: courseName,
                createdAt: now,
                updatedAt: now
            };
            this.notes.push(note);
        }

        Storage.setNotes(this.notes);
        this.closeAddModal();
        this.renderNotesDashboard();
        this.showToast('Catatan tersimpan!');
    },

    showToast: function (message) {
        const toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.bottom = '100px';
        toast.style.right = '20px';
        toast.style.background = 'var(--text-main)';
        toast.style.color = 'var(--bg-main)';
        toast.style.padding = '0.75rem 1.25rem';
        toast.style.borderRadius = 'var(--radius-md)';
        toast.style.boxShadow = 'var(--shadow-lg)';
        toast.style.zIndex = '1000';
        toast.style.fontSize = '0.9rem';
        toast.style.fontWeight = '500';
        toast.style.maxWidth = 'calc(100vw - 40px)';
        toast.style.wordWrap = 'break-word';
        toast.innerText = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    },

    injectModal: function () {
        const modalHtml = `
            <div class="modal-overlay" id="modal-note-add">
                <div class="modal-content">
                    <button class="modal-close" onclick="notesManager.closeAddModal()"><i class="ph ph-x"></i></button>
                    <h3 id="modal-note-title">Catatan Baru</h3>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem;">Catat materi kuliah atau hal penting</p>
                    <form id="note-form" onsubmit="notesManager.saveNote(event)">
                        <input type="hidden" id="note-id-input">
                        <input type="hidden" id="note-schedule-id-input">
                        <input type="hidden" id="note-course-name-input">
                        <div class="form-group">
                            <label>Judul Catatan</label>
                            <input type="text" id="note-title-input" required placeholder="Misal: Catatan Algoritma - Sorting">
                        </div>
                        <div class="form-group">
                            <label>Kategori</label>
                            <select id="note-category-input">
                                <option value="general">Umum</option>
                                <option value="lecture">Materi Kuliah</option>
                                <option value="assignment">Tugas/PR</option>
                                <option value="exam">Persiapan Ujian</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Isi Catatan</label>
                            <textarea id="note-content-input" required placeholder="Tulis catatan di sini..." style="width: 100%; min-height: 150px; padding: 0.75rem 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--bg-card); color: var(--text-main); font-family: inherit; font-size: 0.95rem; resize: vertical;"></textarea>
                        </div>
                        <div style="display: flex; gap: 0.75rem;">
                            <button type="button" class="btn btn-outline" style="flex: 1;" onclick="notesManager.closeAddModal()">Batal</button>
                            <button type="submit" class="btn btn-primary" style="flex: 1;">Simpan</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
};

