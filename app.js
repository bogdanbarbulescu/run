document.addEventListener('DOMContentLoaded', () => {

    // --- DATA & STATE (Final Structure) --- //
    const WORKOUT_LIBRARY = {
        easy_run: { name: "Alergare Ușoară", details: "Z2, bază aerobică" },
        tempo_run: { name: "Alergare Tempo", details: "Z3-Z4, viteză" },
        long_run: { name: "Alergare Lungă", details: "Z2, anduranță" },
        strength: { name: "Sală / Forță", details: "Antrenament de forță" },
        rest: { name: "Pauză", details: "Recuperare completă" }
    };
    const DEFAULT_PLAN = {
        monday:    { type: 'strength' }, tuesday:   { type: 'easy_run' }, wednesday: { type: 'rest' },
        thursday:  { type: 'tempo_run' }, friday:    { type: 'strength' }, saturday:  { type: 'rest' },
        sunday:    { type: 'long_run' }
    };
    const DAY_NAMES = { monday: "Luni", tuesday: "Marți", wednesday: "Miercuri", thursday: "Joi", friday: "Vineri", saturday: "Sâmbătă", sunday: "Duminică" };
    const APP_DATA_KEY = 'workoutAppV4Final';
    
    let appData = {};
    let currentModalDayKey = null; // Used for both logging and plan editing
    let calendarDate = new Date();

    const getInitialData = () => ({
        logs: {},
        plan: DEFAULT_PLAN,
        settings: { maxHR: 187, theme: 'light' },
        prs: {
            longestRun: { value: 0, date: null },
            fastest5k: { value: Infinity, date: null },
        },
        achievements: {
            firstWorkout: false,
            consistentWeek: false,
        }
    });

    // --- DOM ELEMENTS --- //
    const headerTitle = document.getElementById('headerTitle');
    const mainContent = document.getElementById('mainContent');
    const views = {
        dashboard: document.getElementById('dashboardView'), plan: document.getElementById('planView'),
        progress: document.getElementById('progressView'), settings: document.getElementById('settingsView'),
    };
    const navButtons = document.querySelectorAll('.nav-button');
    const todayCardContainer = document.getElementById('todayCardContainer');
    const planEditorContainer = document.getElementById('planEditorContainer');
    const trophyCase = document.getElementById('trophyCase');
    const chartContainer = document.getElementById('chartContainer');
    const calendarGrid = document.getElementById('calendarGrid');
    const calendarMonthYear = document.getElementById('calendarMonthYear');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const logModal = {
        overlay: document.getElementById('logModal'), title: document.getElementById('modalTitle'),
        form: document.getElementById('logForm'), rpeSlider: document.getElementById('rpeInput'),
        rpeValue: document.querySelector('.rpe-value-display'),
    };
    const logDetailModal = {
        overlay: document.getElementById('logDetailModal'), title: document.getElementById('logDetailTitle'),
        body: document.getElementById('logDetailBody'),
    };
    const libraryModal = {
        overlay: document.getElementById('workoutLibraryModal'), body: document.getElementById('workoutLibraryBody'),
    };
    const resetDataBtn = document.getElementById('resetDataBtn');

    // --- DATA MANAGEMENT --- //
    const loadAppData = () => {
        const data = localStorage.getItem(APP_DATA_KEY);
        const defaults = getInitialData();
        appData = data ? JSON.parse(data) : defaults;
        // Ensure data structure is up-to-date if loading from an older version
        if (!appData.prs) appData.prs = defaults.prs;
        if (!appData.achievements) appData.achievements = defaults.achievements;
        if (!appData.plan) appData.plan = defaults.plan;
    };
    const saveAppData = () => localStorage.setItem(APP_DATA_KEY, JSON.stringify(appData));
    const resetData = () => {
        if (confirm("Ești sigur? Toate antrenamentele și recordurile vor fi șterse permanent.")) {
            appData = getInitialData();
            saveAppData();
            rerenderAll();
        }
    };

    // --- RENDER FUNCTIONS --- //
    const renderTodayView = () => {
        const todayKey = getDayKey(new Date());
        const planDay = appData.plan[todayKey];
        const plan = WORKOUT_LIBRARY[planDay.type];
        const log = appData.logs[formatDateKey(new Date())];
        const isCompleted = !!log;
        const isRestDay = planDay.type === 'rest';

        let resultsHTML = '';
        if (isCompleted && !isRestDay) {
            resultsHTML = `<div class="results-display"><h4>Rezultate:</h4><div class="results-grid">
                ${log.distance ? `<div class="stat-item"><span class="stat-label">Distanță</span><span class="stat-value">${log.distance} km</span></div>` : ''}
                ${log.time ? `<div class="stat-item"><span class="stat-label">Timp</span><span class="stat-value">${log.time}</span></div>` : ''}
                ${log.pace ? `<div class="stat-item"><span class="stat-label">Ritm</span><span class="stat-value">${log.pace}/km</span></div>` : ''}
                ${log.rpe ? `<div class="stat-item"><span class="stat-label">Efort</span><span class="stat-value">${log.rpe}/10</span></div>` : ''}
            </div>${log.notes ? `<p class="results-note">"${log.notes}"</p>` : ''}</div>`;
        }

        const actionButtonHTML = isRestDay
            ? `<p style="color: var(--color-text-light);">Zi de odihnă. Bucură-te de ea!</p>`
            : `<button class="btn ${isCompleted ? 'btn--secondary' : 'btn--success'}" data-action="log" data-day="${todayKey}">
                ${isCompleted ? 'Editează Rezultate' : 'Înregistrează Antrenament'}
              </button>`;

        todayCardContainer.innerHTML = `<div class="card today-card">
            <h3 class="activity-name">${plan.name}</h3>
            <p style="color: var(--color-text-light); margin-bottom: 16px;">${plan.details}</p>
            ${actionButtonHTML}
            ${resultsHTML}</div>`;
    };

    const renderPlanView = () => {
        planEditorContainer.innerHTML = Object.keys(appData.plan).map(dayKey => {
            const workout = WORKOUT_LIBRARY[appData.plan[dayKey].type];
            return `<div class="card plan-day-card"><div class="plan-day-info"><div class="day-name">${DAY_NAMES[dayKey]}</div>
                <div class="activity-name">${workout.name}</div></div>
                <button class="btn btn--secondary" data-action="edit-plan" data-day="${dayKey}">Schimbă</button></div>`;
        }).join('');
    };

    const renderWorkoutLibrary = () => {
        libraryModal.body.innerHTML = Object.keys(WORKOUT_LIBRARY).map(typeKey => {
            const workout = WORKOUT_LIBRARY[typeKey];
            return `<div class="library-item" data-type="${typeKey}"><h4>${workout.name}</h4></div>`;
        }).join('');
    };

    const renderProgressView = () => {
        renderCalendar();
        renderProgressChart();
    };

    const renderTrophyCase = () => {
        const { prs, achievements } = appData;
        const trophies = {
            longestRun: { icon: '🏃‍♂️', title: 'Cea Mai Lungă Alergare', value: `${prs.longestRun.value.toFixed(1)} km` },
            fastest5k: { icon: '⚡️', title: 'Cel Mai Rapid 5k', value: prs.fastest5k.value === Infinity ? 'N/A' : secondsToPace(prs.fastest5k.value) + '/km' },
            firstWorkout: { icon: '🎉', title: 'Primul Pas', unlocked: achievements.firstWorkout },
            consistentWeek: { icon: '🗓️', title: 'Săptămână Activă', unlocked: achievements.consistentWeek },
        };
        trophyCase.innerHTML = Object.keys(trophies).map(key => {
            const t = trophies[key];
            const unlocked = t.unlocked || (prs[key] && prs[key].value > 0 && prs[key].value !== Infinity);
            return `<div class="trophy-item ${unlocked ? 'unlocked' : ''}"><div class="trophy-icon">${t.icon}</div>
                <div class="trophy-title">${t.title}</div>
                ${t.value && unlocked ? `<div class="trophy-value">${t.value}</div>` : ''}</div>`;
        }).join('');
        const hasTrophies = Object.values(achievements).some(v => v) || Object.values(prs).some(pr => pr.value > 0 && pr.value !== Infinity);
        document.getElementById('trophyEmptyState').classList.toggle('hidden', hasTrophies);
    };

    const renderProgressChart = () => {
        const weeklyData = getWeeklyChartData();
        const hasData = Object.keys(weeklyData).length > 0;
        document.getElementById('chartEmptyState').classList.toggle('hidden', hasData);
        chartContainer.classList.toggle('hidden', !hasData);
        if (!hasData) return;
        const maxDistance = Math.max(...Object.values(weeklyData), 1);
        chartContainer.innerHTML = Object.entries(weeklyData).slice(-8).map(([week, distance]) => {
            const height = (distance / maxDistance) * 100;
            return `<div class="chart-bar-group"><div class="chart-bar" style="height: ${height}%;" title="${distance.toFixed(1)} km"></div>
                <div class="chart-label">S${week.split('-S')[1]}</div></div>`;
        }).join('');
    };

    const renderCalendar = () => {
        const year = calendarDate.getFullYear(), month = calendarDate.getMonth();
        calendarMonthYear.textContent = new Date(year, month).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
        const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        calendarGrid.innerHTML = Array(firstDay).fill(`<div class="day-cell other-month"></div>`).join('');
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day), dateKey = formatDateKey(date);
            let classes = 'day-cell';
            if (dateKey === formatDateKey(new Date())) classes += ' is-today';
            if (appData.logs[dateKey]) classes += ' has-log';
            calendarGrid.innerHTML += `<div class="${classes}" data-date-key="${dateKey}">${day}</div>`;
        }
    };
    
    const renderSettingsView = () => {
        document.getElementById('maxHrInput').value = appData.settings.maxHR;
        document.getElementById('themeToggle').checked = appData.settings.theme === 'dark';
        applyTheme();
    };

    // --- LOGIC & HELPERS --- //
    const switchView = (viewName) => {
        Object.values(views).forEach(v => v.classList.add('hidden'));
        navButtons.forEach(b => b.classList.remove('active'));
        views[viewName].classList.remove('hidden');
        document.querySelector(`.nav-button[data-view="${viewName}"]`).classList.add('active');
        headerTitle.textContent = { dashboard: 'Acasă', plan: 'Planul Meu', progress: 'Progres', settings: 'Setări' }[viewName];
        if (viewName === 'progress') renderProgressView();
    };

    const handleLogSubmit = (e) => {
        e.preventDefault();
        const form = e.target;
        const logEntry = {
            distance: form.elements.distanceInput.value.trim(),
            time: form.elements.timeInput.value.trim(),
            rpe: form.elements.rpeInput.value,
            notes: form.elements.notesInput.value.trim(),
        };
        logEntry.pace = calculatePace(logEntry.distance, logEntry.time);
        
        const logIsNotEmpty = Object.values(logEntry).some(v => v && v !== '5');
        if (logIsNotEmpty) {
            appData.logs[currentModalDayKey] = logEntry;
            checkAchievements(logEntry, currentModalDayKey);
        } else {
            delete appData.logs[currentModalDayKey];
        }
        saveAppData();
        closeAllModals();
        rerenderAll();
    };

    const checkAchievements = (log, dateKey) => {
        const distance = parseFloat(log.distance);
        const timeInSeconds = timeToSeconds(log.time);

        if (distance > appData.prs.longestRun.value) {
            appData.prs.longestRun = { value: distance, date: dateKey };
        }
        if (distance >= 5 && distance < 6) {
            const paceInSeconds = timeInSeconds / distance;
            if (paceInSeconds < appData.prs.fastest5k.value) {
                appData.prs.fastest5k = { value: paceInSeconds, date: dateKey };
            }
        }
        
        appData.achievements.firstWorkout = true;
        const { start, end } = getWeekDateRange(new Date(dateKey));
        let weekCount = 0;
        Object.keys(appData.logs).forEach(d => { if (new Date(d) >= start && new Date(d) <= end) weekCount++; });
        if (weekCount >= 5) appData.achievements.consistentWeek = true;
    };
    
    const openLogModal = (dateKey) => {
        currentModalDayKey = dateKey;
        logModal.overlay.classList.remove('hidden');
        const log = appData.logs[currentModalDayKey] || {};
        const form = logModal.form.elements;
        form.distanceInput.value = log.distance || '';
        form.timeInput.value = log.time || '';
        form.notesInput.value = log.notes || '';
        logModal.rpeSlider.value = log.rpe || 5;
        logModal.rpeValue.textContent = log.rpe ? `Efort: ${log.rpe}/10` : 'Selectează o valoare';
    };
    
    const openLogDetailModal = (dateKey) => {
        const log = appData.logs[dateKey];
        if (!log) return;
        const date = new Date(dateKey + 'T00:00:00'); // Ensure correct date parsing
        const formattedDate = date.toLocaleDateString('ro-RO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        logDetailModal.title.textContent = `Antrenament - ${formattedDate}`;
        logDetailModal.body.innerHTML = `
            ${log.distance ? `<div class="detail-group"><div class="detail-label">Distanță</div><div class="detail-value">${log.distance} km</div></div>` : ''}
            ${log.time ? `<div class="detail-group"><div class="detail-label">Timp</div><div class="detail-value">${log.time}</div></div>` : ''}
            ${log.pace ? `<div class="detail-group"><div class="detail-label">Ritm Mediu</div><div class="detail-value">${log.pace} /km</div></div>` : ''}
            ${log.rpe ? `<div class="detail-group"><div class="detail-label">Efort Perceput</div><div class="detail-value">${log.rpe} / 10</div></div>` : ''}
            ${log.notes ? `<div class="detail-group"><div class="detail-label">Notițe</div><p class="detail-note">"${log.notes}"</p></div>` : ''}
        `;
        logDetailModal.overlay.classList.remove('hidden');
    };

    const closeAllModals = () => document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
    const applyTheme = () => document.documentElement.setAttribute('data-theme', appData.settings.theme);

    // --- UTILITY FUNCTIONS --- //
    const getDayKey = date => ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
    const formatDateKey = date => date.toISOString().split('T')[0];
    const getWeekDateRange = date => { const start = new Date(date); const day = date.getDay(); const diff = date.getDate() - day + (day === 0 ? -6 : 1); start.setDate(diff); start.setHours(0, 0, 0, 0); const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999); return { start, end }; };
    const timeToSeconds = (timeStr) => { if (!timeStr) return 0; const p = timeStr.split(':').map(Number); if(p.length === 2) return p[0] * 60 + p[1]; if(p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2]; return 0;};
    const calculatePace = (dist, time) => { if (!dist || !time || parseFloat(dist) === 0) return ''; const totalSeconds = timeToSeconds(time); const paceSec = totalSeconds / parseFloat(dist); return secondsToPace(paceSec); };
    const secondsToPace = (sec) => { if (!sec || !isFinite(sec)) return 'N/A'; const min = Math.floor(sec / 60); const s = Math.round(sec % 60); return `${min}:${s.toString().padStart(2, '0')}`; };
    const getWeekNumber = d => { d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7); return weekNo; };
    const getWeeklyChartData = () => { const data = {}; Object.entries(appData.logs).forEach(([dateKey, log]) => { if (log.distance) { const date = new Date(dateKey); const week = getWeekNumber(date); const year = date.getFullYear(); const label = `${year}-S${week}`; data[label] = (data[label] || 0) + parseFloat(log.distance); } }); return data; };

    // --- EVENT LISTENERS --- //
    const setupEventListeners = () => {
        navButtons.forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));
        document.querySelectorAll('[data-action="close"]').forEach(b => b.addEventListener('click', closeAllModals));
        logModal.form.addEventListener('submit', handleLogSubmit);
        logModal.rpeSlider.addEventListener('input', () => logModal.rpeValue.textContent = `Efort: ${logModal.rpeSlider.value}/10`);
        resetDataBtn.addEventListener('click', resetData);
        prevMonthBtn.addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar(); });
        nextMonthBtn.addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar(); });
        
        mainContent.addEventListener('click', e => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            const action = target.dataset.action;
            const day = target.dataset.day;
            if (action === 'log') openLogModal(formatDateKey(new Date()));
            if (action === 'edit-plan') { currentModalDayKey = day; libraryModal.overlay.classList.remove('hidden'); }
        });
        
        calendarGrid.addEventListener('click', e => {
            const cell = e.target.closest('.has-log');
            if (cell) openLogDetailModal(cell.dataset.dateKey);
        });
        
        libraryModal.body.addEventListener('click', e => {
            const item = e.target.closest('[data-type]');
            if (item) {
                appData.plan[currentModalDayKey].type = item.dataset.type;
                saveAppData();
                closeAllModals();
                rerenderAll();
            }
        });

        document.getElementById('themeToggle').addEventListener('change', e => {
            appData.settings.theme = e.target.checked ? 'dark' : 'light';
            saveAppData();
            applyTheme();
        });
        
        document.getElementById('maxHrInput').addEventListener('change', e => {
            appData.settings.maxHR = parseInt(e.target.value) || 187;
            saveAppData();
        });
    };

    // --- INITIALIZATION --- //
    const rerenderAll = () => {
        renderTodayView();
        renderPlanView();
        renderTrophyCase();
        renderProgressView(); // This already calls calendar and chart renderers
        renderSettingsView();
    };

    const init = () => {
        loadAppData();
        renderWorkoutLibrary(); // Critical fix: Render library content once on startup.
        setupEventListeners();
        rerenderAll();
        switchView('dashboard');
    };

    init();
});
