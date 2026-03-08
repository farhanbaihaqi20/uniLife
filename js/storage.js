// Helper functions to interact with LocalStorage

const Storage = {
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from localStorage', error);
            return defaultValue;
        }
    },

    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            window.dispatchEvent(new CustomEvent('unilifeDataChanged', { detail: { key, value } }));
        } catch (error) {
            console.error('Error writing to localStorage', error);
        }
    },

    // Specific Getters/Setters for our data models
    getSchedules: () => Storage.get('unilife_schedules', []),
    setSchedules: (data) => Storage.set('unilife_schedules', data),

    getGrades: () => Storage.get('unilife_grades', []), // array of semesters
    setGrades: (data) => Storage.set('unilife_grades', data),

    getTasks: () => Storage.get('unilife_tasks', []),
    setTasks: (data) => Storage.set('unilife_tasks', data),

    getSettings: () => Storage.get('unilife_settings', { theme: 'light', reminders: true }),
    setSettings: (data) => Storage.set('unilife_settings', data),

    // New Models
    getProfile: () => Storage.get('unilife_profile', {
        fullName: 'Mahasiswa Baru',
        nickname: 'Mahasiswa',
        university: 'Universitas',
        major: 'Jurusan',
        semester: '1',
        photoBase64: null
    }),
    setProfile: (data) => Storage.set('unilife_profile', data),

    getReminders: () => Storage.get('unilife_reminders', []),
    setReminders: (data) => Storage.set('unilife_reminders', data),

    getFocusStats: () => Storage.get('unilife_focus', []), // Array of { date, sessions, totalMinutes }
    setFocusStats: (data) => Storage.set('unilife_focus', data),

    // Quick Capture Inbox
    getInbox: () => Storage.get('unilife_inbox', []), // Array of { id, text, type, timestamp }
    setInbox: (data) => Storage.set('unilife_inbox', data),

    // Focus-Task Integration
    getFocusSessions: () => Storage.get('unilife_focus_sessions', []), // Array of { id, taskId, date, duration, completed }
    setFocusSessions: (data) => Storage.set('unilife_focus_sessions', data),

    // Grade Goals (target scores per course)
    getGradeGoals: () => Storage.get('unilife_grade_goals', []), // Array of { courseId, semesterId, targetGrade, targetScore }
    setGradeGoals: (data) => Storage.set('unilife_grade_goals', data),

    // Notes (catatan materi)
    getNotes: () => Storage.get('unilife_notes', []), // Array of { id, title, content, category, createdAt, updatedAt }
    setNotes: (data) => Storage.set('unilife_notes', data)
};
