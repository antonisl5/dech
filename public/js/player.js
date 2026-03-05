document.addEventListener('DOMContentLoaded', () => {
    const playerContainer = document.getElementById('player-container');
    let widgets = {};
    let activeIntervals = {};
    let activeTimeouts = {};

    function initSSE() {
        const source = new EventSource('api/sse.php');

        source.onmessage = function(event) {
            const data = JSON.parse(event.data);
            if (data.type === 'update') {
                console.log("SSE Update triggered. Fetching layout...");
                fetchLayout();
            }
        };

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
                    renderLayout(data);
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

    function renderLayout(data) {
        // Apply Global Background
        if (data.global_background_color) {
            playerContainer.style.backgroundColor = data.global_background_color;
        }

        clearAllIntervals();
        playerContainer.innerHTML = '';

        data.widgets.forEach(w => {
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

            playerContainer.appendChild(el);
            renderWidgetContent(contentWrapper, w);
        });
    }

    function renderWidgetContent(container, data) {
        const c = data.config;

        // Apply general styles
        if (c.bgColor) container.parentElement.style.backgroundColor = c.bgColor;
        if (c.textColor) container.parentElement.style.color = c.textColor;
        if (c.fontSize) container.style.fontSize = c.fontSize + 'cqi';

        switch (data.type) {
            case 'clock':
                updateClock(container, c);
                activeIntervals[data.id] = setInterval(() => updateClock(container, c), 1000);
                break;
            case 'media':
                if (c.mediaType === 'video') {
                    container.innerHTML = `<video src="${c.mediaUrl}" autoplay muted loop style="width:100%;height:100%;object-fit:cover;"></video>`;
                } else if (c.mediaUrl) {
                    container.innerHTML = `<img src="${c.mediaUrl}" alt="media" style="width:100%;height:100%;object-fit:cover;">`;
                }
                break;
            case 'ticker':
                container.innerHTML = `<div class="ticker-text" style="color:${c.textColor}">${c.text}</div>`;
                break;
            case 'countdown':
                updateCountdown(container, c);
                activeIntervals[data.id] = setInterval(() => updateCountdown(container, c), 1000);
                break;
            case 'youtube':
                if (c.youtubeUrl) {
                    const videoId = extractYouTubeID(c.youtubeUrl);
                    if (videoId) {
                        // Embed with autoplay, loop, mute, and hidden controls
                        container.innerHTML = `<iframe
                            src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&modestbranding=1"
                            allow="autoplay; encrypted-media"
                            allowfullscreen>
                        </iframe>`;
                    }
                }
                break;
            case 'shape':
                if (c.borderRadius) container.parentElement.style.borderRadius = c.borderRadius + '%';
                break;
            case 'freetext':
                container.classList.add('freetext-content');
                container.innerHTML = c.text; // Allows HTML like <br> or <b>
                break;
            case 'bambu':
                fetchBambuData(container, c);
                activeIntervals[data.id] = setInterval(() => fetchBambuData(container, c), 5000); // Poll every 5 seconds
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
        const opts = { timeZone: config.timezone || 'UTC' };
        if (config.format === '12h') {
            opts.hour12 = true;
        } else {
            opts.hour12 = false;
        }
        opts.hour = '2-digit';
        opts.minute = '2-digit';
        opts.second = '2-digit';

        el.innerHTML = new Intl.DateTimeFormat('en-US', opts).format(now);
    }

    function updateCountdown(el, config) {
        const target = new Date(config.targetDate).getTime();
        const now = new Date().getTime();
        const diff = target - now;

        if (diff <= 0) {
            el.innerHTML = `<div>${config.eventName}<br>00:00:00</div>`;
            return;
        }

        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);

        let timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        if (d > 0) {
            timeStr = `${d}d ` + timeStr;
        }

        el.innerHTML = `<div>${config.eventName}<br>${timeStr}</div>`;
    }

    // Bambu Lab 3D Printer Fetching
    function fetchBambuData(el, config) {
        // Fetch from the local Python Flask service
        fetch('http://localhost:5000/status')
            .then(res => res.json())
            .then(data => {
                let printers = data; // Data is a direct array now: [{"id": 0, "percent": 0, "minutes": 0, "status": "OFF"}, ...]

                // Map IDs to Names
                const printerNames = {
                    0: "P2S",
                    1: "A1",
                    2: "P1S"
                };

                // Filter if a specific ID is selected
                if (config.printerId && config.printerId !== 'all') {
                    const targetId = parseInt(config.printerId);
                    printers = printers.filter(p => p.id === targetId);
                }

                if (!printers || printers.length === 0) {
                    el.innerHTML = '<div style="color:red; font-size:4cqi;">No printers found</div>';
                    return;
                }

                let html = '';
                printers.forEach(p => {
                    const prog = p.percent || 0;
                    const name = printerNames[p.id] || \`Printer \${p.id}\`;
                    const statusColor = p.status === 'RUNNING' ? '#00ff00' : (p.status === 'ERROR' ? '#ff0000' : '#cccccc');

                    if (config.displayMode === 'percent') {
                        // Minimalist mode
                        html += \`
                            <div style="margin-bottom: 5px; text-align: center;">
                                <div style="font-size: 8cqi; font-weight: bold; color: \${statusColor};">\${prog}%</div>
                                <div style="font-size: 3cqi; color: #888;">\${name}</div>
                            </div>
                        \`;
                    } else {
                        // Full mode
                        html += \`
                            <div style="width: 100%; margin-bottom: 15px;">
                                <div class="bambu-title" style="color: \${statusColor};">\${name} - \${p.status}</div>
                                <div class="bambu-progress-bar">
                                    <div class="bambu-progress-fill" style="width: \${prog}%; background: \${statusColor};"></div>
                                </div>
                                <div class="bambu-details">
                                    <span>\${prog}%</span>
                                    <span>\${p.minutes || 0}m left</span>
                                </div>
                            </div>
                        \`;
                    }
                });

                // Allow scrolling if multiple printers exceed container height
                el.style.overflowY = 'auto';
                el.innerHTML = \`<div style="width:100%; padding: 10px; box-sizing: border-box;">\${html}</div>\`;
            })
            .catch(err => {
                console.error("Error fetching Bambu status:", err);
                el.innerHTML = '<div style="color:red; font-size:4cqi;">Failed to connect to 3D Printer Service</div>';
            });
    }

    function clearAllIntervals() {
        for (let id in activeIntervals) clearInterval(activeIntervals[id]);
        activeIntervals = {};
        for (let id in activeTimeouts) clearTimeout(activeTimeouts[id]);
        activeTimeouts = {};
    }

    // Initial load and scaling
    scaleCanvas();
    window.addEventListener('resize', scaleCanvas);

    fetchLayout();
    initSSE();
});
