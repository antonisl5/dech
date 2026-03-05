document.addEventListener('DOMContentLoaded', () => {
    const playerContainer = document.getElementById('player-container');
    const sleepOverlay = document.getElementById('sleep-overlay');

    let currentLayoutData = null;
    let activeIntervals = {};
    let mainLoopInterval = null;
    let isSleeping = false;

    // Playlist State
    let enabledScreens = [];
    let currentScreenIndex = 0;
    let playlistTimeout = null;

    function initSSE() {
        const source = new EventSource('api/sse.php');

        // Listen for the specific named event from the server
        source.addEventListener('layout_update', function(event) {
            console.log("SSE Update triggered. Fetching layout...");
            fetchLayout();
        });

        source.onerror = function(error) {
            console.error("SSE Connection Error. Reconnecting...", error);
            source.close();
            setTimeout(initSSE, 5000);
        };
    }

    function fetchLayout() {
        fetch('api/get_layout.php')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    currentLayoutData = data;
                    // Pass true to force a render since layout just updated via SSE
                    checkWorkingHoursAndRender(true);
                }
            })
            .catch(err => console.error("Error fetching layout:", err));
    }

    function scaleCanvas() {
        // Enforce exact 16:9 ratio in the player window regardless of screen size
        const w = window.innerWidth;
        const h = window.innerHeight;
        let cWidth, cHeight;

        if (w / h > 16 / 9) {
            // Screen is wider than 16:9 (pillarbox)
            cHeight = h;
            cWidth = h * (16 / 9);
        } else {
            // Screen is taller than 16:9 (letterbox)
            cWidth = w;
            cHeight = w / (16 / 9);
        }

        playerContainer.style.width = cWidth + 'px';
        playerContainer.style.height = cHeight + 'px';

        // Center the container
        playerContainer.style.left = (w - cWidth) / 2 + 'px';
        playerContainer.style.top = (h - cHeight) / 2 + 'px';
    }

    function checkWorkingHoursAndRender(forceRender = false) {
        if (!currentLayoutData) return;

        const whStart = currentLayoutData.working_hours_start;
        const whEnd = currentLayoutData.working_hours_end;

        let shouldSleep = false;

        if (whStart && whEnd) {
            const now = new Date();
            const currentHours = now.getHours();
            const currentMinutes = now.getMinutes();
            const currentTimeStr = `${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;

            if (whStart <= whEnd) {
                // e.g., 08:00 to 22:00
                shouldSleep = currentTimeStr < whStart || currentTimeStr >= whEnd;
            } else {
                // e.g., 22:00 to 08:00 (crosses midnight)
                shouldSleep = currentTimeStr >= whEnd && currentTimeStr < whStart;
            }
        }

        if (shouldSleep) {
            if (!isSleeping) {
                console.log("Entering sleep mode. Pausing all widgets.");
                isSleeping = true;
                sleepOverlay.style.display = 'block';
                clearAllIntervals(); // Pause network and CPU heavy tasks
                if (playlistTimeout) clearTimeout(playlistTimeout);
            }
        } else {
            if (isSleeping || playerContainer.innerHTML === '' || forceRender) {
                console.log("Waking up or forced render.");
                isSleeping = false;
                sleepOverlay.style.display = 'none';
                renderLayout(currentLayoutData);
            }
        }
    }

    function renderLayout(data) {
        if (isSleeping) return; // Don't render if we should be sleeping

        // Apply Global Background
        if (data.global_background_color) {
            playerContainer.style.backgroundColor = data.global_background_color;
        }

        clearAllIntervals();
        if (playlistTimeout) clearTimeout(playlistTimeout);
        playerContainer.innerHTML = '';

        // 1. Setup Screens
        enabledScreens = (data.screens || []).filter(s => s.enabled === 1).sort((a,b) => a.id - b.id);

        if (enabledScreens.length === 0) {
            // Fallback if none enabled
            enabledScreens = [{id: 1, duration: 10, transition: 'fade'}];
        }

        // Group widgets by screen_id
        const widgetsByScreen = {};
        data.widgets.forEach(w => {
            const sId = w.screen_id || 1;
            if (!widgetsByScreen[sId]) widgetsByScreen[sId] = [];
            widgetsByScreen[sId].push(w);
        });

        // Render each enabled screen container
        enabledScreens.forEach(screenData => {
            const sEl = document.createElement('div');
            sEl.className = `screen transition-${screenData.transition}`;
            sEl.id = `screen-${screenData.id}`;
            sEl.dataset.duration = screenData.duration;
            sEl.dataset.transition = screenData.transition;

            // Render widgets into this screen
            const sWidgets = widgetsByScreen[screenData.id] || [];
            sWidgets.forEach(w => {
                const wEl = createWidgetElement(w);
                sEl.appendChild(wEl);
            });

            playerContainer.appendChild(sEl);
        });

        // 2. Start Playlist Logic
        currentScreenIndex = 0;
        if (enabledScreens.length > 0) {
            showScreen(currentScreenIndex);
        }
    }

    function createWidgetElement(w) {
        const el = document.createElement('div');
        el.className = `widget-item widget-${w.type}`;
        el.id = 'p_' + w.id;

        // Apply absolute percentages
        el.style.left = w.left + '%';
        el.style.top = w.top + '%';
        el.style.width = w.width + '%';
        el.style.height = w.height + '%';
        el.style.zIndex = w.z_index;

        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'content';
        el.appendChild(contentWrapper);

        // Store config data for later rendering when screen becomes active
        el.dataset.config = JSON.stringify(w.config);
        el.dataset.type = w.type;
        el.dataset.id = w.id;

        // Apply general static styles now
        if (w.config.bgColor) el.style.backgroundColor = w.config.bgColor;
        if (w.config.textColor) el.style.color = w.config.textColor;
        if (w.config.fontSize) contentWrapper.style.fontSize = w.config.fontSize + 'cqi';

        if (w.type === 'shape') {
            if (w.config.shapeType === 'triangle') {
                el.style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
            } else if (w.config.shapeType === 'oval') {
                el.style.borderRadius = '50%';
            }
            if (w.config.borderRadius) {
                el.style.borderRadius = w.config.borderRadius + '%';
            }
        }

        return el;
    }

    function showScreen(index) {
        if (isSleeping || enabledScreens.length === 0) return;

        // Ensure index wraps around
        if (index >= enabledScreens.length) {
            index = 0;
        }

        // Hide all screens, clear exit classes, pause their heavy intervals
        document.querySelectorAll('.screen').forEach(s => {
            if (s.classList.contains('active')) {
                // Apply exit animation based on its transition type
                const trans = s.dataset.transition;
                s.classList.add(`exit-${trans.split('-')[1] || trans}`); // map 'slide-left' to 'exit-left', 'fade' doesn't need one it just loses opacity
            }
            s.classList.remove('active');

            // Cleanup intervals for widgets in this screen so they don't consume CPU when hidden
            s.querySelectorAll('.widget-item').forEach(wEl => {
                const widgetId = wEl.dataset.id;
                if (activeIntervals[widgetId]) {
                    clearInterval(activeIntervals[widgetId]);
                    delete activeIntervals[widgetId];
                }
            });
        });

        const targetScreenData = enabledScreens[index];
        const targetScreenEl = document.getElementById(`screen-${targetScreenData.id}`);

        if (targetScreenEl) {
            // Remove any previous exit classes before showing
            const trans = targetScreenData.transition;
            targetScreenEl.classList.remove(`exit-${trans.split('-')[1] || trans}`);

            // Force a reflow to restart CSS animations if needed
            void targetScreenEl.offsetWidth;

            targetScreenEl.classList.add('active');

            // Initialize/Resume widgets for this active screen
            targetScreenEl.querySelectorAll('.widget-item').forEach(wEl => {
                const config = JSON.parse(wEl.dataset.config);
                const type = wEl.dataset.type;
                const id = wEl.dataset.id;
                const contentWrapper = wEl.querySelector('.content');

                startWidget(contentWrapper, type, config, id);
            });

            // Schedule next screen transition
            if (enabledScreens.length > 1) {
                const durationMs = (parseInt(targetScreenData.duration) || 10) * 1000;
                playlistTimeout = setTimeout(() => {
                    showScreen(index + 1);
                }, durationMs);
            }
        }
    }

    function startWidget(container, type, c, id) {
        switch (type) {
            case 'clock':
                updateClock(container, c);
                activeIntervals[id] = setInterval(() => updateClock(container, c), 1000);
                break;
            case 'media':
                // Only inject HTML once to avoid restarting video unnecessarily
                if (container.innerHTML === '') {
                    if (c.mediaType === 'video') {
                        container.innerHTML = `<video src="${c.mediaUrl}" autoplay muted loop style="width:100%;height:100%;object-fit:cover;"></video>`;
                    } else if (c.mediaUrl) {
                        container.innerHTML = `<img src="${c.mediaUrl}" alt="media" style="width:100%;height:100%;object-fit:cover;">`;
                    }
                }
                break;
            case 'ticker':
                if (container.innerHTML === '') {
                    container.innerHTML = `<div class="ticker-text" style="color:${c.textColor}">${c.text}</div>`;
                }
                break;
            case 'countdown':
                updateCountdown(container, c);
                activeIntervals[id] = setInterval(() => updateCountdown(container, c), 1000);
                break;
            case 'youtube':
                if (container.innerHTML === '' && c.youtubeUrl) {
                    const videoId = extractYouTubeID(c.youtubeUrl);
                    if (videoId) {
                        container.innerHTML = `<iframe
                            src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&modestbranding=1"
                            allow="autoplay; encrypted-media"
                            allowfullscreen>
                        </iframe>`;
                    }
                }
                break;
            case 'freetext':
                if (container.innerHTML === '') {
                    container.classList.add('freetext-content');
                    container.innerHTML = c.text;
                }
                break;
            case 'bambu':
                fetchBambuData(container, c);
                activeIntervals[id] = setInterval(() => fetchBambuData(container, c), 5000);
                break;
        }
    }

    function extractYouTubeID(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    function updateClock(el, config) {
        const now = new Date();
        const opts = {
            timeZone: config.timezone || 'Europe/Athens',
            hour12: config.format === '12h',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };

        try {
            el.innerHTML = new Intl.DateTimeFormat('en-US', opts).format(now);
        } catch (e) {
            el.innerHTML = new Intl.DateTimeFormat('en-US', {hour: '2-digit', minute:'2-digit', second:'2-digit'}).format(now);
        }
    }

    function updateCountdown(el, config) {
        const target = new Date(config.targetDate).getTime();
        const now = new Date().getTime();
        const diff = target - now;

        const format = config.displayFormat || 'full';

        if (diff <= 0) {
            let zeroStr = '00:00:00';
            if (format === 'days_only') zeroStr = '0 Days';
            else if (format === 'days_hours') zeroStr = '0d 00h';
            else if (format === 'hours_minutes') zeroStr = '00:00';
            else if (format === 'minutes_seconds') zeroStr = '00:00';
            else zeroStr = '0d 00:00:00';

            el.innerHTML = `<div>${config.eventName}<br>${zeroStr}</div>`;
            return;
        }

        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);

        const totalHours = Math.floor(diff / (1000 * 60 * 60));
        const totalMinutes = Math.floor(diff / (1000 * 60));

        let timeStr = '';

        if (format === 'days_only') {
            timeStr = `${d} Days`;
        } else if (format === 'days_hours') {
            timeStr = `${d}d ${h.toString().padStart(2, '0')}h`;
        } else if (format === 'hours_minutes') {
            timeStr = `${totalHours.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        } else if (format === 'minutes_seconds') {
            timeStr = `${totalMinutes.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        } else {
            timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            if (d > 0) timeStr = `${d}d ` + timeStr;
        }

        el.innerHTML = `<div>${config.eventName}<br>${timeStr}</div>`;
    }

    function fetchBambuData(el, config) {
        fetch('http://localhost:5000/status')
            .then(res => res.json())
            .then(data => {
                let printers = data;
                const printerNames = { 0: "P2S", 1: "A1", 2: "P1S" };
                const targetId = parseInt(config.printerId || '0');
                const printer = printers.find(p => p.id === targetId);

                if (!printer) {
                    el.innerHTML = '<div style="color:red; font-size:4cqi;">Printer not found</div>';
                    return;
                }

                const prog = printer.percent || 0;
                const name = printerNames[printer.id] || `Printer ${printer.id}`;
                let statusColor = '#cccccc';
                if (printer.status === 'RUNNING' || printer.status === 'PRINTING') statusColor = '#00ff00';
                else if (printer.status === 'ERROR' || printer.status === 'FAILED') statusColor = '#ff0000';
                else if (printer.status === 'FINISH' || printer.status === 'DONE') statusColor = '#00aaff';

                const textLine = `${name}: ${prog}% | ${printer.minutes || 0} min`;

                let html = `
                    <div style="color: ${statusColor}; font-weight: bold; width: 100%; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${textLine}
                    </div>
                `;

                if (config.displayMode === 'text_bar') {
                    const thickness = parseInt(config.barThickness || '10');
                    html += `
                        <div style="width: 100%; height: ${thickness}px; background: #444; border-radius: 5px; margin-top: 5px; overflow: hidden;">
                            <div style="width: ${prog}%; height: 100%; background: ${statusColor}; transition: width 0.5s ease;"></div>
                        </div>
                    `;
                }

                el.innerHTML = `
                    <div style="width: 100%; padding: 10px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                        ${html}
                    </div>
                `;
            })
            .catch(err => {
                console.error("Error fetching Bambu status:", err);
                el.innerHTML = '<div style="color:red; font-size:4cqi;">Failed to connect to 3D Printer Service</div>';
            });
    }

    function clearAllIntervals() {
        for (let id in activeIntervals) {
            clearInterval(activeIntervals[id]);
        }
        activeIntervals = {};
    }

    // Initial load and scaling
    scaleCanvas();
    window.addEventListener('resize', scaleCanvas);

    // Start main checking loop for working hours (runs every 60 seconds)
    mainLoopInterval = setInterval(checkWorkingHoursAndRender, 60000);

    fetchLayout();
    initSSE();
});