const i18n = {
    currentLang: 'id',

    // Dictionary
    dict: {
        'id': {
            // Navbar
            'nav_home': 'Beranda',
            'nav_schedule': 'Jadwal',
            'nav_grades': 'Nilai',
            'nav_tasks': 'Tugas',
            'nav_focus': 'Fokus',
            'nav_profile': 'Profil',

            // Home View
            'home_welcome': 'Halo',
            'home_quick_schedule': 'Jadwal',
            'home_quick_tasks': 'Tugas',
            'home_quick_focus': 'Fokus',
            'home_today_schedule': 'Kuliah Hari Ini',
            'home_urgent_tasks': 'Tugas Mendesak',
            'home_see_all': 'Lihat Semua',
            'home_overview': 'Ringkasan Akademik',
            'home_quick_reminder': 'Pengingat Cepat',
            'home_empty_today_schedule': 'Tidak ada jadwal kelas hari ini.',
            'home_empty_urgent_tasks': 'Tidak ada tugas mendesak.',
            'home_due_prefix': 'Tenggat:',
            'home_view': 'Lihat',
            'home_prompt_add_reminder': 'Ketik pengingat: (Cth: Beli buku tulis, Fotocopy KTP)',

            // Profile View
            'profile_active_semester': 'Semester Aktif',
            'profile_major': 'Program Studi',
            'profile_edit': 'Edit Profil',
            'profile_settings': 'Pengaturan',
            'profile_reset_data': 'Hapus Akun / Reset Data',
            'profile_reset': 'Reset Aplikasi (Hapus Data)',
            'profile_default_university': 'Fakultas',
            'profile_label_semester': 'Semester {semester}',
            'profile_edit_photo': 'Ubah Foto',
            'profile_full_name': 'Nama Lengkap',
            'profile_nickname': 'Nama Panggilan',
            'profile_university': 'Fakultas (Opsional)',
            'profile_level_semester': 'Level/Semester',
            'profile_level_placeholder': 'Cth: 1',
            'profile_major_department': 'Program Studi / Jurusan',
            'profile_lang_indonesian': 'Bahasa Indonesia',
            'profile_english_dummy_note': '*Dukungan English sekarang sudah aktif penuh.',
            'profile_reset_confirm_1': '⚠️ PERINGATAN ⚠️\nApakah kamu yakin ingin mereset aplikasi? Semua jadwal, nilai, tugas, dan data profil akan DIHAPUS PERMANEN dan tidak dapat dikembalikan!',
            'profile_reset_confirm_2': 'Sekali lagi, apakah kamu SERIUS mau menghapus semuanya?',
            'profile_export': 'Backup Data',
            'profile_import': 'Pulihkan (Import)',
            'profile_import_confirm': 'Peringatan: Data di perangkat ini akan TERHAPUS dan tertimpa oleh data dari file backup. Yakin ingin melanjutkan?',
            'profile_import_success': 'Data berhasil dipulihkan!',
            'profile_import_error': 'File backup tidak valid atau rusak.',

            // Welcome Screen
            'welcome_title': 'Mulai Perjalanan Akademikmu',
            'welcome_subtitle': 'Satu aplikasi dengan desain elegan untuk bantu kamu fokus pada hal yang paling penting.',
            'welcome_feature1_title': 'Jadwal Kuliah',
            'welcome_feature1_desc': 'Atur jadwal kuliah mingguan Anda',
            'welcome_feature2_title': 'Manajemen Tugas',
            'welcome_feature2_desc': 'Track dan selesaikan tugas tepat waktu',
            'welcome_feature3_title': 'Tracking Nilai',
            'welcome_feature3_desc': 'Monitor progress akademik Anda',
            'welcome_get_started': 'Atur Profil Sekarang',
            'welcome_skip': 'Nanti saja',

            // Settings Modal
            'settings_title': 'Pengaturan Aplikasi',
            'settings_lang_title': 'Bahasa / Language',
            'settings_theme_title': 'Tema Tampilan',
            'settings_theme_light': 'Terang',
            'settings_theme_dark': 'Gelap',
            'settings_theme_system': 'Sesuai Sistem',
            'settings_save': 'Simpan Pengaturan',
            'settings_changing_language': 'Mengubah Bahasa...',

            // Shared
            'common_close': 'Tutup',
            'common_add': 'Tambah',
            'common_save': 'Simpan',
            'common_delete': 'Hapus',
            'common_edit': 'Edit',
            'common_day_today': 'Hari ini!',
            'common_overdue_prefix': 'Terlambat:',
            'common_semester': 'Semester {semester}',
            'common_no_data': 'Belum ada data.',

            // Schedule View
            'schedule_title': 'Jadwal Kuliah',
            'schedule_add': 'Tambah',
            'schedule_day_1': 'Senin',
            'schedule_day_2': 'Selasa',
            'schedule_day_3': 'Rabu',
            'schedule_day_4': 'Kamis',
            'schedule_day_5': 'Jumat',
            'schedule_day_6': 'Sabtu',
            'schedule_add_modal_title': 'Tambah Jadwal',
            'schedule_course_name': 'Nama Mata Kuliah',
            'schedule_course_placeholder': 'Contoh: Pemrograman Web',
            'schedule_day': 'Hari',
            'schedule_sks': 'SKS',
            'schedule_start': 'Mulai',
            'schedule_end': 'Selesai',
            'schedule_room': 'Ruangan',
            'schedule_room_placeholder': 'Contoh: Lab Komputer A',
            'schedule_lecturer': 'Dosen Pengampu',
            'schedule_lecturer_placeholder': 'Nama Dosen',
            'schedule_save': 'Simpan Jadwal',
            'schedule_empty': 'Tidak ada jadwal kuliah hari ini untuk Semester {semester}.',
            'schedule_task_badge': '{count} Tugas',
            'schedule_detail_tasks_title': 'Tugas Matkul Ini',
            'schedule_detail_add_task': 'Tambah Tugas',
            'schedule_detail_grades_title': 'Nilai Akademik',
            'schedule_detail_no_grades': 'Belum ada data nilai terhubung.',
            'schedule_detail_input_grade': 'Input Nilai',
            'schedule_detail_delete_course': 'Hapus',
            'schedule_detail_edit_course': 'Edit Jadwal',
            'schedule_delete_confirm': 'Hapus jadwal ini? Ini tidak akan menghapus tugas yang sudah tertaut ke matkul ini, tapi tautan namanya akan hilang.',
            'schedule_detail_no_active_tasks': 'Tidak ada tugas aktif',
            'schedule_detail_no_linked_tasks': 'Tidak ada tugas terhubung ke matkul ini.',
            'schedule_need_semester_for_grade': 'Silakan buat Semester terlebih dahulu di menu Nilai!',

            // Grades View
            'grades_title': 'Statistik Akademik',
            'grades_ipk': 'IPK Saat Ini',
            'grades_total_sks': 'Total SKS Lulus',
            'grades_ips_chart': 'Grafik IPS (Per Semester)',
            'grades_course_chart': 'Nilai Akhir Mata Kuliah',
            'grades_add_semester': 'Semester',
            'grades_saved_semesters': 'Semester Tersimpan',
            'grades_ipk_cumulative': 'IPK Kumulatif:',
            'grades_course_compare_note': 'Perbandingan skor akhir dari semester terisi paling baru.',
            'grades_chart_ips_label': 'IPS per Semester',
            'grades_chart_final_label': 'Nilai Akhir',
            'grades_empty_semesters': 'Belum ada data semester.',
            'grades_empty_courses': 'Belum ada mata kuliah',
            'grades_add_course': 'Tambah Nilai Matkul',
            'grades_semester_prompt': 'Masukkan nama semester (Contoh: Semester 1):',
            'grades_delete_semester_confirm': 'Yakin ingin menghapus semester ini beserta semua nilainya?',
            'grades_modal_add_title': 'Tambah Nilai Matkul',
            'grades_modal_edit_title': 'Edit Nilai Matkul',
            'grades_course_module_label': 'Modul Kuliah',
            'grades_course_name': 'Nama Mata Kuliah',
            'grades_course_placeholder': 'Contoh: Kalkulus 1',
            'grades_final_title': 'Nilai Akhir Matkul',
            'grades_final_number': 'Angka Final (0-100)',
            'grades_auto_grade_note': 'Huruf Mutu Otomatis: A(>=85), AB(>=80), B(>=70), BC(>=65), C(>=55), D(>=40), E',
            'grades_save_capture': 'Simpan Tangkap Nilai',

            // Tasks View
            'tasks_title': 'Tugas Kuliah',
            'tasks_add': 'Tambah',
            'tasks_filter_active': 'Aktif',
            'tasks_filter_done': 'Selesai',
            'tasks_empty_done': 'Belum ada tugas yang selesai di Semester {semester}.',
            'tasks_empty_active': 'Hore! Tidak ada tugas aktif di Semester {semester}.',
            'tasks_due_prefix': 'Tenggat:',
            'tasks_general_course': 'Umum',
            'tasks_delete_confirm': 'Hapus tugas ini?',
            'tasks_add_modal_title': 'Tambah Tugas',
            'tasks_what_label': 'Apa tugasnya?',
            'tasks_what_placeholder': 'Contoh: Buat Makalah Bab 1',
            'tasks_course_optional': 'Mata Kuliah (Opsional)',
            'tasks_course_placeholder': 'Contoh: Kewarganegaraan',
            'tasks_due_date': 'Tenggat Waktu',
            'tasks_notes_optional': 'Catatan Tambahan (Opsional)',
            'tasks_save': 'Simpan Tugas',

            // Focus View
            'focus_title': 'Fokus Belajar',
            'focus_mode_work': 'Kerja',
            'focus_mode_break': 'Istirahat',
            'focus_stats_title': 'Statistik Hari Ini',
            'focus_stats_sessions': 'Sesi Fokus',
            'focus_stats_minutes': 'Menit Total',
            'focus_status_work': 'Waktu Kerja',
            'focus_status_break': 'Waktu Istirahat',
            'focus_switch_confirm': 'Timer sedang berjalan. Yakin ingin mengganti mode?',
            'focus_notification_title': 'Waktunya Habis!',
            'focus_notification_work_done': 'Saatnya istirahat sebentar.',
            'focus_notification_break_done': 'Waktunya kembali fokus.',
            'focus_alert_work_done': 'Kerja bagus! Sesi belajar dicatat. Waktunya istirahat 5 menit.',
            'focus_alert_break_done': 'Istirahat selesai. Waktunya kembali bekerja!',

            // Modals
            'modal_save_profile': 'Simpan Profil',
            'modal_close': 'Tutup',
            'loader_switching_semester': 'Mengalihkan ke Semester...',
            'loader_switching_semester_to': 'Mengalihkan ke Semester {semester}...',

            // Quick Capture Inbox
            'inbox_title': 'Tangkap Cepat',
            'inbox_subtitle': 'Ketik apa saja, kami atur nanti',
            'inbox_capture': 'Tangkap',
            'inbox_captured': 'Ditangkap!',
            'inbox_section': 'Inbox Cepat',

            // Deadline Radar
            'radar_title': 'Radar Deadline',
            'radar_risk_high': 'Risiko Tinggi',
            'radar_risk_medium': 'Perhatian',
            'radar_risk_low': 'Aman',
            'radar_empty': 'Tidak ada deadline mendesak',

            // Grade Goals
            'goal_title': 'Target Nilai',
            'goal_target': 'Target',
            'goal_current': 'Saat Ini',
            'goal_needed': 'Perlu Skor',
            'goal_set': 'Atur Target',
            'goal_info_desc': 'Klik icon <i class="ph ph-target"></i> atau <i class="ph ph-plus"></i> di setiap mata kuliah untuk set target nilai',
            'goal_info_tip': 'Tips: Setelah set target, kamu akan lihat berapa poin lagi yang perlu dicapai!',

            // Focus-Task Integration
            'focus_select_task': 'Pilih Tugas (Opsional)',
            'focus_task_completed': 'Sesi selesai! Progress disimpan.',

            // Calendar Export
            'calendar_export': 'Ekspor ke Kalender',
            'calendar_exported': 'Kalender diekspor!',

            // Notification System
            'notification_title': 'Notifikasi',
            'notification_reminder': 'Pengingat',
            'notification_task_deadline': 'Tugas Mendekati Deadline',
            'notification_inbox_new': 'Tangkap Cepat Baru',
            'notification_no_notifications': 'Tidak ada notifikasi',
            'notification_mark_all_read': 'Tandai semua sebagai dibaca',
            'notification_delete_all': 'Hapus semua',
            'notification_just_now': 'Baru saja',
            'notification_minutes_ago': '{count} menit yang lalu',
            'notification_hours_ago': '{count} jam yang lalu',
            'notification_days_ago': '{count} hari yang lalu',

            // Notes View
            'notes_title': 'Catatan Kuliah',
            'notes_search_placeholder': 'Cari catatan...',
            'notes_sort_newest': 'Terbaru',
            'notes_sort_oldest': 'Terlama',

            // Attendance View
            'attendance_title': 'Rekap Presensi',
            'attendance_rules_title': 'Aturan Kehadiran',
            'attendance_rules_desc': 'Total pertemuan standar: <b>16 kali</b>. Minimal kehadiran: <b>75%</b> (setara minimal <b>12 pertemuan</b>).',
            'attendance_under_target': 'Belum Memenuhi 75%',
            'attendance_filter_all': 'Semua',
            'attendance_filter_under': 'Belum 75%',
            'attendance_filter_met': 'Sudah 75%',

            // Profile Dashboard Stats
            'profile_urgent_tasks': 'Tugas Mendesak (3 Hari ke Depan)',
            'profile_urgent_empty': 'Tidak ada tugas mendesak, tetap semangat! ✨',
            'profile_stats_title': 'Statistik Lengkap',
            'profile_stats_courses': 'Mata Kuliah',
            'profile_stats_completed': 'Tugas Selesai',
            'profile_stats_focus': 'Total Fokus',
            'profile_stats_attendance': 'Kehadiran'
        },
        'en': {
            // Navbar
            'nav_home': 'Home',
            'nav_schedule': 'Schedule',
            'nav_grades': 'Grades',
            'nav_tasks': 'Tasks',
            'nav_focus': 'Focus',
            'nav_profile': 'Profile',

            // Home View
            'home_welcome': 'Hello',
            'home_quick_schedule': 'Schedule',
            'home_quick_tasks': 'Tasks',
            'home_quick_focus': 'Focus',
            'home_today_schedule': 'Today\'s Classes',
            'home_urgent_tasks': 'Urgent Tasks',
            'home_see_all': 'See All',
            'home_overview': 'Academic Overview',
            'home_quick_reminder': 'Quick Reminders',
            'home_empty_today_schedule': 'No classes scheduled for today.',
            'home_empty_urgent_tasks': 'No urgent tasks.',
            'home_due_prefix': 'Due:',
            'home_view': 'View',
            'home_prompt_add_reminder': 'Type a reminder: (e.g. Buy notebook, Photocopy ID)',

            // Profile View
            'profile_active_semester': 'Active Semester',
            'profile_major': 'Major / Study Program',
            'profile_edit': 'Edit Profile',
            'profile_settings': 'Settings',
            'profile_reset_data': 'Delete Account / Reset Data',
            'profile_reset': 'Reset App (Wipe Data)',
            'profile_default_name': 'User Name',
            'profile_default_university': 'Faculty',
            'profile_label_semester': 'Semester {semester}',
            'profile_edit_photo': 'Change Photo',
            'profile_full_name': 'Full Name',
            'profile_nickname': 'Nickname',
            'profile_university': 'Faculty (Optional)',
            'profile_level_semester': 'Level/Semester',
            'profile_level_placeholder': 'Ex: 1',
            'profile_major_department': 'Major / Department',
            'profile_lang_indonesian': 'Bahasa Indonesia',
            'profile_english_dummy_note': '*English support is now fully enabled.',
            'profile_reset_confirm_1': '⚠️ WARNING ⚠️\nAre you sure you want to reset the app? All schedules, grades, tasks, and profile data will be PERMANENTLY DELETED and cannot be restored!',
            'profile_reset_confirm_2': 'One more time, are you REALLY sure you want to delete everything?',
            'profile_export': 'Backup Data',
            'profile_import': 'Restore (Import)',
            'profile_import_confirm': 'Warning: Current data on this device will be COMPLTELY REPLACED by the backup file. Are you sure you want to proceed?',
            'profile_import_success': 'Data restored successfully!',
            'profile_import_error': 'Invalid or corrupted backup file.',

            // Welcome Screen
            'welcome_title': 'Start Your Academic Journey',
            'welcome_subtitle': 'One app with an elegant design to help you focus on what matters most.',
            'welcome_feature1_title': 'Class Schedule',
            'welcome_feature1_desc': 'Organize your weekly class schedule',
            'welcome_feature2_title': 'Task Management',
            'welcome_feature2_desc': 'Track and complete tasks on time',
            'welcome_feature3_title': 'Grade Tracking',
            'welcome_feature3_desc': 'Monitor your academic progress',
            'welcome_get_started': 'Set Up Profile',
            'welcome_skip': 'Maybe Later',

            // Settings Modal
            'settings_title': 'App Settings',
            'settings_lang_title': 'Language',
            'settings_theme_title': 'Display Theme',
            'settings_theme_light': 'Light',
            'settings_theme_dark': 'Dark',
            'settings_theme_system': 'System',
            'settings_save': 'Save Settings',
            'settings_changing_language': 'Changing Language...',

            // Shared
            'common_close': 'Close',
            'common_add': 'Add',
            'common_save': 'Save',
            'common_delete': 'Delete',
            'common_edit': 'Edit',
            'common_day_today': 'Today!',
            'common_overdue_prefix': 'Overdue:',
            'common_semester': 'Semester {semester}',
            'common_no_data': 'No data yet.',

            // Schedule View
            'schedule_title': 'Class Schedule',
            'schedule_add': 'Add',
            'schedule_day_1': 'Mon',
            'schedule_day_2': 'Tue',
            'schedule_day_3': 'Wed',
            'schedule_day_4': 'Thu',
            'schedule_day_5': 'Fri',
            'schedule_day_6': 'Sat',
            'schedule_add_modal_title': 'Add Schedule',
            'schedule_course_name': 'Course Name',
            'schedule_course_placeholder': 'Example: Web Programming',
            'schedule_day': 'Day',
            'schedule_sks': 'Credits',
            'schedule_start': 'Start',
            'schedule_end': 'End',
            'schedule_room': 'Room',
            'schedule_room_placeholder': 'Example: Computer Lab A',
            'schedule_lecturer': 'Lecturer',
            'schedule_lecturer_placeholder': 'Lecturer Name',
            'schedule_save': 'Save Schedule',
            'schedule_empty': 'No classes today for Semester {semester}.',
            'schedule_task_badge': '{count} Tasks',
            'schedule_detail_tasks_title': 'Tasks for This Course',
            'schedule_detail_add_task': 'Add Task',
            'schedule_detail_grades_title': 'Academic Grades',
            'schedule_detail_no_grades': 'No linked grade data yet.',
            'schedule_detail_input_grade': 'Input Grade',
            'schedule_detail_delete_course': 'Delete',
            'schedule_detail_edit_course': 'Edit Schedule',
            'schedule_delete_confirm': 'Delete this schedule? This will not remove linked tasks, but course name links may disappear.',
            'schedule_detail_no_active_tasks': 'No active tasks',
            'schedule_detail_no_linked_tasks': 'No tasks linked to this course.',
            'schedule_need_semester_for_grade': 'Please create a Semester first in the Grades menu!',

            // Grades View
            'grades_title': 'Academic Stats',
            'grades_ipk': 'Current GPA',
            'grades_total_sks': 'Total Credits (SKS)',
            'grades_ips_chart': 'GPA Trend (Per Semester)',
            'grades_course_chart': 'Final Course Grades',
            'grades_add_semester': 'Semester',
            'grades_saved_semesters': 'Saved Semesters',
            'grades_ipk_cumulative': 'Cumulative GPA:',
            'grades_course_compare_note': 'Comparison of final scores from the latest filled semester.',
            'grades_chart_ips_label': 'GPA per Semester',
            'grades_chart_final_label': 'Final Score',
            'grades_empty_semesters': 'No semester data yet.',
            'grades_empty_courses': 'No courses yet',
            'grades_add_course': 'Add Course Grade',
            'grades_semester_prompt': 'Enter semester name (Example: Semester 1):',
            'grades_delete_semester_confirm': 'Are you sure you want to delete this semester and all its grades?',
            'grades_modal_add_title': 'Add Course Grade',
            'grades_modal_edit_title': 'Edit Course Grade',
            'grades_course_module_label': 'Course Module',
            'grades_course_name': 'Course Name',
            'grades_course_placeholder': 'Example: Calculus 1',
            'grades_final_title': 'Final Course Score',
            'grades_final_number': 'Final Number (0-100)',
            'grades_auto_grade_note': 'Auto Grade Letters: A(>=85), AB(>=80), B(>=70), BC(>=65), C(>=55), D(>=40), E',
            'grades_save_capture': 'Save Grade Snapshot',

            // Tasks View
            'tasks_title': 'Assignments',
            'tasks_add': 'Add',
            'tasks_filter_active': 'Active',
            'tasks_filter_done': 'Done',
            'tasks_empty_done': 'No completed tasks yet in Semester {semester}.',
            'tasks_empty_active': 'Great! No active tasks in Semester {semester}.',
            'tasks_due_prefix': 'Due:',
            'tasks_general_course': 'General',
            'tasks_delete_confirm': 'Delete this task?',
            'tasks_add_modal_title': 'Add Task',
            'tasks_what_label': 'What is the task?',
            'tasks_what_placeholder': 'Example: Write Chapter 1 Paper',
            'tasks_course_optional': 'Course (Optional)',
            'tasks_course_placeholder': 'Example: Civic Education',
            'tasks_due_date': 'Due Date',
            'tasks_notes_optional': 'Additional Notes (Optional)',
            'tasks_save': 'Save Task',

            // Focus View
            'focus_title': 'Study Focus',
            'focus_mode_work': 'Work',
            'focus_mode_break': 'Break',
            'focus_stats_title': 'Today\'s Stats',
            'focus_stats_sessions': 'Focus Sessions',
            'focus_stats_minutes': 'Total Minutes',
            'focus_status_work': 'Work Time',
            'focus_status_break': 'Break Time',
            'focus_switch_confirm': 'The timer is running. Are you sure you want to switch mode?',
            'focus_notification_title': 'Time is up!',
            'focus_notification_work_done': 'Time for a short break.',
            'focus_notification_break_done': 'Time to focus again.',
            'focus_alert_work_done': 'Great work! Study session saved. Time for a 5-minute break.',
            'focus_alert_break_done': 'Break is over. Time to get back to work!',

            // Modals
            'modal_save_profile': 'Save Profile',
            'modal_close': 'Close',
            'loader_switching_semester': 'Switching Semester...',
            'loader_switching_semester_to': 'Switching to Semester {semester}...',

            // Quick Capture Inbox
            'inbox_title': 'Quick Capture',
            'inbox_subtitle': 'Type anything, we\'ll organize it later',
            'inbox_capture': 'Capture',
            'inbox_captured': 'Captured!',
            'inbox_section': 'Quick Inbox',

            // Deadline Radar
            'radar_title': 'Deadline Radar',
            'radar_risk_high': 'High Risk',
            'radar_risk_medium': 'Warning',
            'radar_risk_low': 'Safe',
            'radar_empty': 'No urgent deadlines',

            // Grade Goals
            'goal_title': 'Grade Goals',
            'goal_target': 'Target',
            'goal_current': 'Current',
            'goal_needed': 'Score Needed',
            'goal_set': 'Set Target',
            'goal_info_desc': 'Click the <i class="ph ph-target"></i> or <i class="ph ph-plus"></i> icon on each course to set a grade target',
            'goal_info_tip': 'Tip: After setting a target, you\'ll see how many points you still need to achieve it!',

            // Focus-Task Integration
            'focus_select_task': 'Select Task (Optional)',
            'focus_task_completed': 'Session completed! Progress saved.',

            // Calendar Export
            'calendar_export': 'Export to Calendar',
            'calendar_exported': 'Calendar exported!',

            // Notification System
            'notification_title': 'Notifications',
            'notification_reminder': 'Reminder',
            'notification_task_deadline': 'Task Approaching Deadline',
            'notification_inbox_new': 'New Quick Capture',
            'notification_no_notifications': 'No notifications',
            'notification_mark_all_read': 'Mark all as read',
            'notification_delete_all': 'Delete all',
            'notification_just_now': 'Just now',
            'notification_minutes_ago': '{count} minutes ago',
            'notification_hours_ago': '{count} hours ago',
            'notification_days_ago': '{count} days ago',

            // Notes View
            'notes_title': 'Lecture Notes',
            'notes_search_placeholder': 'Search notes...',
            'notes_sort_newest': 'Newest',
            'notes_sort_oldest': 'Oldest',

            // Attendance View
            'attendance_title': 'Attendance Recap',
            'attendance_rules_title': 'Attendance Rules',
            'attendance_rules_desc': 'Standard total meetings: <b>16 times</b>. Minimum attendance: <b>75%</b> (req. at least <b>12 meetings</b>).',
            'attendance_under_target': 'Below 75%',
            'attendance_filter_all': 'All',
            'attendance_filter_under': 'Below 75%',
            'attendance_filter_met': 'Met 75%',

            // Profile Dashboard Stats
            'profile_urgent_tasks': 'Urgent Tasks (Next 3 Days)',
            'profile_urgent_empty': 'No urgent tasks, keep it up! ✨',
            'profile_stats_title': 'Detailed Statistics',
            'profile_stats_courses': 'Courses',
            'profile_stats_completed': 'Completed Tasks',
            'profile_stats_focus': 'Total Focus',
            'profile_stats_attendance': 'Attendance'
        }
    },

    init: function () {
        // Load language preference
        const settings = Storage.getSettings ? Storage.getSettings() : { language: 'id' };
        this.currentLang = settings.language || 'id';

        // Translate the static DOM
        this.translateDOM();
    },

    translateDOM: function () {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.t(key);
            if (translation) {
                // If the element has children like icons, we might need to be careful.
                // Best practice is to wrap text in a <span> next to the icon.
                el.innerHTML = translation;
            }
        });

        const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
        placeholders.forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.setAttribute('placeholder', this.t(key));
        });

        const titles = document.querySelectorAll('[data-i18n-title]');
        titles.forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            el.setAttribute('title', this.t(key));
        });
    },

    t: function (key) {
        if (this.dict[this.currentLang] && this.dict[this.currentLang][key]) {
            return this.dict[this.currentLang][key];
        }
        if (this.dict.id && this.dict.id[key]) {
            return this.dict.id[key];
        }
        return key;
    },

    tf: function (key, params = {}) {
        let text = this.t(key);
        Object.keys(params).forEach((paramKey) => {
            const token = `{${paramKey}}`;
            text = text.replaceAll(token, params[paramKey]);
        });
        return text;
    },

    locale: function () {
        return this.currentLang === 'en' ? 'en-US' : 'id-ID';
    }
};
