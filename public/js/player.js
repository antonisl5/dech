// public/js/player.js

document.addEventListener('DOMContentLoaded', function () {
    // 1. Maintain Perfect 16:9 Screen Scaling to match Admin
    let gridContainer = document.querySelector('.grid-container');
    let columns = 16;
    let grid = null;

    function resizeContainer() {
        let winW = window.innerWidth;
        let winH = window.innerHeight;
        let aspect = 16 / 9;

        let calcW = winW;
        let calcH = winW / aspect;

        if (calcH > winH) {
            calcH = winH;
            calcW = winH * aspect;
        }

        gridContainer.style.width = calcW + 'px';
        gridContainer.style.height = calcH + 'px';

        return calcW / columns;
    }

    // Initialize Grid with precise cellHeight
    function initGrid() {
        if (grid) grid.destroy(false);
        let cellH = resizeContainer();

        grid = GridStack.init({
            cellHeight: cellH + 'px',
            staticGrid: true, // No drag & drop allowed
            margin: 0,
            column: columns
        }, '#playerGrid');
    }

    window.addEventListener('resize', function() {
        let cellH = resizeContainer();
        if (grid) {
            grid.cellHeight(cellH + 'px', true);
        }
    });

    // Global Widget State to manage timers/intervals
    let activeWidgets = {};

    // 2. Fetch and Render Layout
    function loadLayout() {
        fetch('api/get_layout.php')
            .then(response => response.json())
            .then(data => {
                if (data.widgets) {
                    if (!grid) initGrid();

                    // Stop current logic
                    cleanupWidgets();
                    grid.removeAll();

                    data.widgets.forEach(w => {
                        let widgetHtml = `
                            <div class="grid-stack-item"
                                 gs-x="${w.x}" gs-y="${w.y}"
                                 gs-w="${w.w}" gs-h="${w.h}"
                                 data-id="${w.id}">
                                <div class="grid-stack-item-content">
                                    <div class="widget-body" id="body_${w.id}"></div>
                                </div>
                            </div>
                        `;
                        grid.addWidget(widgetHtml);
                        renderWidgetContent(w.id, w.type, w.config);
                    });
                }
            })
            .catch(err => console.error("Error loading layout:", err));
    }

    // 3. Clear existing timers and logic before re-rendering
    function cleanupWidgets() {
        for (let id in activeWidgets) {
            let widgetData = activeWidgets[id];
            if (widgetData.timer) clearInterval(widgetData.timer);
            if (widgetData.interval) clearInterval(widgetData.interval);
        }
        activeWidgets = {};
    }

    // 4. Render Widget Logic
    function renderWidgetContent(id, type, config) {
        let container = document.getElementById(`body_${id}`);
        if (!container) return;

        // Initialize state tracker
        activeWidgets[id] = { timer: null, interval: null, data: {} };
        let state = activeWidgets[id];

        // Apply Generic Styles from Admin Panel Customizations
        container.style.color = config.color || '#ffffff';
        container.style.backgroundColor = config.bg_color || 'transparent';

        // Font size calculation (convert viewport width percentage if provided, or leave as string)
        if (config.font_size) {
            container.style.fontSize = config.font_size;
        }

        if (type === 'clock') {
            container.className = 'widget-body clock-widget';

            function updateClock() {
                let now = new Date();
                let hours = now.getHours();
                let minutes = now.getMinutes().toString().padStart(2, '0');
                let seconds = now.getSeconds().toString().padStart(2, '0');
                let ampm = '';

                if (config.format === '12h') {
                    ampm = hours >= 12 ? ' PM' : ' AM';
                    hours = hours % 12;
                    hours = hours ? hours : 12; // 0 = 12
                }

                hours = hours.toString().padStart(2, '0');
                container.innerHTML = `<span>${hours}:${minutes}:${seconds}${ampm}</span>`;
            }

            updateClock();
            state.interval = setInterval(updateClock, 1000);

        } else if (type === 'ticker') {
            container.className = 'widget-body ticker-widget';

            // Adjusting scrollamount based on speed configuration (1-100)
            let speed = config.speed ? Math.max(1, Math.min(100, parseInt(config.speed))) : 50;
            // Map 1-100 roughly to 1-30 scrollamount
            let scrollAmt = Math.max(1, Math.round(speed * 0.3));

            container.innerHTML = `<marquee scrollamount="${scrollAmt}">${config.text || ''}</marquee>`;

        } else if (type === 'countdown') {
            container.className = 'widget-body countdown-widget';
            let targetDate = new Date(config.target_date || new Date().getTime() + 86400000);

            function updateCountdown() {
                let now = new Date();
                let diff = targetDate.getTime() - now.getTime();

                if (diff <= 0) {
                    container.innerHTML = `
                        <div style="font-size:0.5em;">${config.text}</div>
                        <div>00d 00h 00m 00s</div>
                    `;
                    clearInterval(state.interval);
                    return;
                }

                let days = Math.floor(diff / (1000 * 60 * 60 * 24));
                let hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                let minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                let seconds = Math.floor((diff % (1000 * 60)) / 1000);

                container.innerHTML = `
                    <div style="font-size:0.5em;">${config.text}</div>
                    <div>
                        ${days}d
                        ${hours.toString().padStart(2, '0')}h
                        ${minutes.toString().padStart(2, '0')}m
                        ${seconds.toString().padStart(2, '0')}s
                    </div>
                `;
            }

            updateCountdown();
            state.interval = setInterval(updateCountdown, 1000);

        } else if (type === 'media') {
            container.className = 'widget-body media-widget';
            if (config.media_url) {
                if (config.type && config.type.startsWith('video')) {
                    container.innerHTML = `<video src="${config.media_url}" autoplay loop muted></video>`;
                } else {
                    container.innerHTML = `<img src="${config.media_url}" alt="Media">`;
                }
            } else {
                container.innerHTML = `<div>No Media</div>`;
            }
        } else if (type === 'youtube') {
            container.className = 'widget-body youtube-widget';
            if (config.youtube_url) {
                let videoId = extractYouTubeId(config.youtube_url);
                if (videoId) {
                    // Mute is required for autoplay in most modern browsers.
                    // Loop requires playlist parameter equal to videoId.
                    let embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1`;
                    container.innerHTML = `<iframe src="${embedUrl}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
                } else {
                    container.innerHTML = `<div>Invalid YouTube URL</div>`;
                }
            } else {
                 container.innerHTML = `<div>No YouTube URL provided</div>`;
            }
        }
    }

    function extractYouTubeId(url) {
        let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        let match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    // 5. Connect to Server-Sent Events (SSE) for Real-Time Sync
    function connectSSE() {
        console.log("Connecting to SSE...");
        let source = new EventSource('api/sse.php');

        // Layout update received
        source.addEventListener('layout_update', function(e) {
            console.log("Layout update received from server!", e.data);
            loadLayout(); // Refetch DB layout and update UI immediately
        }, false);

        // Keepalive received
        source.addEventListener('message', function(e) {
            // Ignore keepalive messages, handled implicitly
        }, false);

        // Reconnect on error
        source.addEventListener('error', function(e) {
            console.error("SSE connection lost. Reconnecting in 5 seconds...", e);
            source.close();
            setTimeout(connectSSE, 5000);
        }, false);
    }

    // Initial sequence
    initGrid();
    loadLayout();
    connectSSE();
});