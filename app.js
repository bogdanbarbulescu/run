document.addEventListener('DOMContentLoaded', () => {

    // --- DATA & STATE --- //
    const WORKOUT_LIBRARY = {
        easy_run: { name: "Alergare Ușoară", type: 'easy_run', duration: "30-45 min", intensity: "Z2", targetHR: "60-70% Max", purpose: "Bază aerobică, recuperare.", color: "#10B981" },
        tempo_run: { name: "Alergare Tempo", type: 'tempo_run', duration: "20-30 min", intensity: "Z3-Z4", targetHR: "70-90% Max", purpose: "Creșterea pragului lactic.", color: "#F59E0B" },
        long_run: { name: "Alergare Lungă", type: 'long_run', duration: "60+ min", intensity: "Z2", targetHR: "60-70% Max", purpose: "Anduranță și rezistență.", color: "#22C55E" },
        strength: { name: "Sală / Forță", type: 'strength', duration: "45-60 min", intensity: "Variabilă", targetHR: "-", purpose: "Stabilitate și prevenție.", color: "#3B82F6" },
        v2max_intervals: { name: "Intervale V2 Max", type: 'v2max_intervals', duration: "4x4 min", intensity: "Z5", targetHR: "90-100% Max", purpose: "Îmbunătățirea consumului de O2.", color: "#EF4444" },
        hill_sprints: { name: "Sprinturi în Deal", type: 'hill_sprints', duration: "8x12 sec", intensity: "Maxim", targetHR: "-", purpose: "Putere și eficiență neuro.", color: "#D946EF" },
        rest: { name: "Pauză", type: 'rest', duration: "-", intensity: "-", targetHR: "-", purpose: "Recuperare completă.", color: "#6B7280" },
    };
    const DEFAULT_PLAN = {
        monday:    { type: 'strength' }, tuesday:   { type: 'easy_run' }, wednesday: { type: 'rest' },
        thursday:  { type: 'tempo_run' }, friday:    { type: 'strength' }, saturday:  { type: 'rest' },
        sunday:    { type: 'long_run' }
    };
    const GUIDE_CONTENT = {
        training: { title: "Antrenament Eficient", content: `<p>Cheia nu este cantitatea, ci calitatea. Două tipuri de antrenamente sunt esențiale:</p><ul><li><strong>Intervale V2 Max:</strong> Îmbunătățesc capacitatea corpului de a utiliza oxigenul.</li><li><strong>Exerciții de viteză/putere:</strong> Transformă picioarele în "arcuri puternice", reducând energia irosită.</li></ul>` },
        nutrition: { title: "Nutriție și Hidratare", content: `<p>Nutriția este combustibilul. Fără ea, programul perfect nu va da rezultate.</p><ul><li><strong>Carbohidrați (Ovăz, banane):</strong> Consumă cu 2-3 ore înainte de efort intens.</li><li><strong>Proteine (Pui, ouă, iaurt):</strong> Esențiale pentru reparația musculară. Țintește 1.6-2.2g per kg de greutate corporală pe zi.</li><li><strong>Hidratare:</strong> O deshidratare de doar 2% te va încetini considerabil.</li></ul>` },
        recovery: { title: "Recuperare Inteligentă", content: `<p>Nu te îmbunătățești în timp ce te antrenezi, ci atunci când te recuperezi.</p><ul><li><strong>Somn:</strong> Cel mai important. Țintește 7-9 ore pe noapte.</li><li><strong>Recuperare activă:</strong> Alergări foarte ușoare sau stretching.</li><li><strong>Zile de odihnă:</strong> Sunt la fel de importante ca zilele de antrenament.</li></ul>` },
    };
    const DAY_NAMES = { monday: "Luni", tuesday: "Marți", wednesday: "Miercuri", thursday: "Joi", friday: "Vineri", saturday: "Sâmbătă", sunday: "Duminică" };
    const APP_DATA_KEY = 'workoutAppV6Final';
    
    let appData = {};
    let currentModalDayKey = null;
    let calendarDate = new Date();

    const getInitialData = () => ({
        logs: {}, plan: DEFAULT_PLAN,
        settings: { maxHR: 187, theme: 'light' },
        prs: { longestRun: { value: 0, date: null }, fastest5k: { value: Infinity, date: null } },
        achievements: { firstWorkout: false, consistentWeek: false }
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
    const hrZonesContainer = document.getElementById('hrZonesContainer');
    const guideContainer = document.getElementById('guideContainer');
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
            : `<button class="btn ${isCompleted ? 'btn--secondary' : 'btn--success'}" data-action="log">${isCompleted ? 'Editează Rezultate' : 'Înregistrează Antrenament'}</button>`;
        
        todayCardContainer.innerHTML = `<div class="card today-card">
            <div class="card-header"><h2 class="activity-title">${plan.name}</h2><span class="activity-type" style="background-color: ${plan.color};">${plan.type.replace('_', ' ')}</span></div>
            <div class="details-grid">
                <div class="detail-item"><span class="detail-label">Durată / Distanță</span><span class="detail-value">${plan.duration}</span></div>
                <div class="detail-item"><span class="detail-label">Intensitate</span><span class="detail-value">${plan.intensity}</span></div>
                <div class="detail-item"><span class="detail-label">Puls Țintă</span><span class="detail-value">${plan.targetHR}</span></div>
            </div>
            <p class="purpose">${plan.purpose}</p>
            ${actionButtonHTML}${resultsHTML}</div>`;
    };

    const renderPlanView = () => {
        planEditorContainer.innerHTML = Object.keys(appData.plan).map(dayKey => {
            const workout = WORKOUT_LIBRARY[appData.plan[dayKey].type];
            return `<div class="card plan-day-card"><div class="plan-day-info"><div class="day-name">${DAY_NAMES[dayKey]}</div><div class="activity-name">${workout.name}</div></div><button class="btn btn--secondary" data-action="edit-plan" data-day="${dayKey}">Schimbă</button></div>`;
        }).join('');
    };

    const renderWorkoutLibrary = () => {
        libraryModal.body.innerHTML = Object.values(WORKOUT_LIBRARY).map(w => `<div class="library-item" data-type="${w.type}"><h4>${w.name}</h4></div>`).join('');
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
            return `<div class="trophy-item ${unlocked ? 'unlocked' : ''}"><div class="trophy-icon">${t.icon}</div><div class="trophy-title">${t.title}</div>${t.value && unlocked ? `<div class="trophy-value">${t.value}</div>` : ''}</div>`;
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
            return `<div class="chart-bar-group"><div class="chart-bar" style="height: ${height}%;" title="${distance.toFixed(1)} km"></div><div class="chart-label">S${week.split('-S')[1]}</div></div>`;
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
        renderHrZones();
        renderGuide();
    };

    const renderHrZones = () => {
        const zones = calculateHrZones(appData.settings.maxHR);
        hrZonesContainer.innerHTML = Object.values(zones).map(zone => `<div class="zone-item" style="background-color: ${zone.color}; border-color: ${zone.borderColor};"><div class="zone-name">${zone.name}</div><div class="zone-details">${zone.percentage} • ${zone.bpm}</div></div>`).join('');
    };
    
    const renderGuide = () => {
        guideContainer.innerHTML = Object.values(GUIDE_CONTENT).map(item => `<div class="accordion-item"><div class="accordion-header"><span class="accordion-title">${item.title}</span><span class="accordion-icon">+</span></div><div class="accordion-content">${item.content}</div></div>`).join('');
        guideContainer.querySelectorAll('.accordion-header').forEach(header => header.addEventListener('click', () => header.parentElement.classList.toggle('active')));
    };

    // --- LOGIC & HELPERS --- //
    const switchView = (viewName) => {
        Object.values(views).forEach(v => v.classList.add('hidden'));
        navButtons.forEach(b => b.classList.remove('active'));
        views[viewName].classList.remove('hidden');
        document.querySelector(`.nav-button[data-view="${viewName}"]`).classList.add('active');
        headerTitle.textContent = { dashboard: 'Acasă', plan: 'Planul Meu', progress: 'Progres', settings: 'Setări' }[viewName];
        if (viewName === 'progress') renderProgressView();
        if (viewName === 'settings') renderSettingsView();
    };

    const handleLogSubmit = (e) => {
        e.preventDefault();
        const form = e.target;
        const logEntry = {
            distance: form.elements.distanceInput.value.trim(), time: form.elements.timeInput.value.trim(),
            rpe: form.elements.rpeInput.value, notes: form.elements.notesInput.value.trim(),
        };
        logEntry.pace = calculatePace(logEntry.distance, logEntry.time);
        
        const logIsNotEmpty = Object.values(logEntry).some(v => v && v !== '5' && v !== '');
        if (logIsNotEmpty) {
            appData.logs[currentModalDayKey] = logEntry;
            checkAchievements(logEntry, currentModalDayKey);
        } else { delete appData.logs[currentModalDayKey]; }
        saveAppData(); closeAllModals(); rerenderAll();
    };

    const checkAchievements = (log, dateKey) => {
        const distance = parseFloat(log.distance);
        if (isNaN(distance)) return;
        const timeInSeconds = timeToSeconds(log.time);

        if (distance > appData.prs.longestRun.value) appData.prs.longestRun = { value: distance, date: dateKey };
        if (distance >= 5 && distance < 6) {
            const paceInSeconds = timeInSeconds / distance;
            if (paceInSeconds < appData.prs.fastest5k.value) appData.prs.fastest5k = { value: paceInSeconds, date: dateKey };
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
        form.distanceInput.value = log.distance || ''; form.timeInput.value = log.time || ''; form.notesInput.value = log.notes || '';
        logModal.rpeSlider.value = log.rpe || 5;
        logModal.rpeValue.textContent = log.rpe ? `Efort: ${log.rpe}/10` : 'Selectează o valoare';
    };
    
    const openLogDetailModal = (dateKey) => {
        const log = appData.logs[dateKey];
        if (!log) return;
        const date = new Date(dateKey + 'T00:00:00');
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

    const calculateHrZones = (maxHR) => ({
        zone1: { name: "Z1 - Recuperare", percentage: "50-60%", bpm: `${Math.round(maxHR * 0.5)}-${Math.round(maxHR * 0.6)} bpm`, color: 'rgba(110, 212, 128, 0.2)', borderColor: 'rgba(110, 212, 128, 0.4)' },
        zone2: { name: "Z2 - Anduranță",  percentage: "60-70%", bpm: `${Math.round(maxHR * 0.6)}-${Math.round(maxHR * 0.7)} bpm`, color: 'rgba(57, 182, 219, 0.2)', borderColor: 'rgba(57, 182, 219, 0.4)' },
        zone3: { name: "Z3 - Tempo", percentage: "70-80%", bpm: `${Math.round(maxHR * 0.7)}-${Math.round(maxHR * 0.8)} bpm`, color: 'rgba(255, 209, 58, 0.2)', borderColor: 'rgba(255, 209, 58, 0.4)' },
        zone4: { name: "Z4 - Prag", percentage: "80-90%", bpm: `${Math.round(maxHR * 0.8)}-${Math.round(maxHR * 0.9)} bpm`, color: 'rgba(255, 145, 77, 0.2)', borderColor: 'rgba(255, 145, 77, 0.4)' },
        zone5: { name: "Z5 - VO2max", percentage: "90-100%", bpm: `${Math.round(maxHR * 0.9)}-${maxHR} bpm`, color: 'rgba(255, 82, 82, 0.2)', borderColor: 'rgba(255, 82, 82, 0.4)' }
    });

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
            const cell = e.target.closest('.day-cell.has-log');
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
            renderHrZones();
        });
    };

    // --- INITIALIZATION --- //
    const rerenderAll = () => {
        renderTodayView();
        renderPlanView();
        renderTrophyCase();
        renderProgressView();
        renderSettingsView();
    };

    const init = () => {
        loadAppData();
        renderWorkoutLibrary();
        setupEventListeners();
        rerenderAll();
        switchView('dashboard');
    };

    init();
});
