// public/js/player.js

document.addEventListener('DOMContentLoaded', function () {
    // 1. Initialize Player Grid (Static/Read-Only)
    let grid = GridStack.init({
        cellHeight: '8.33vh', // 12 columns means ~ 100vh / 12 rows
        staticGrid: true, // No drag & drop allowed
        margin: 0,
        column: 12
    }, '#playerGrid');

    // Global Widget State to manage timers/intervals
    let activeWidgets = {};

    // 2. Fetch and Render Layout
    function loadLayout() {
        fetch('api/get_layout.php')
            .then(response => response.json())
            .then(data => {
                if (data.widgets) {
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

        if (type === 'clock') {
            container.className = 'widget-body clock-widget';
            container.style.color = config.color || '#ffffff';

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
                container.innerHTML = `<span style="font-size: ${config.size || '6'}vw;">${hours}:${minutes}:${seconds}${ampm}</span>`;
            }

            updateClock();
            state.interval = setInterval(updateClock, 1000);

        } else if (type === 'ticker') {
            container.className = 'widget-body ticker-widget';
            container.style.color = config.color || '#ffffff';
            container.style.backgroundColor = config.bg || 'transparent';

            // Adjusting scrollamount for different sizes
            let speed = config.speed ? Math.max(1, Math.min(100, parseInt(config.speed))) : 10;
            // 50 speed mapped to roughly scrollamount 15
            let scrollAmt = Math.round(speed * 0.3);

            container.innerHTML = `<marquee scrollamount="${scrollAmt}">${config.text || ''}</marquee>`;

        } else if (type === 'countdown') {
            container.className = 'widget-body countdown-widget';
            container.style.color = config.color || '#ff0000';
            let targetDate = new Date(config.target_date || new Date().getTime() + 86400000);

            function updateCountdown() {
                let now = new Date();
                let diff = targetDate.getTime() - now.getTime();

                if (diff <= 0) {
                    container.innerHTML = `
                        <span>${config.text}</span>
                        <div class="time-left">00d 00h 00m 00s</div>
                    `;
                    clearInterval(state.interval);
                    return;
                }

                let days = Math.floor(diff / (1000 * 60 * 60 * 24));
                let hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                let minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                let seconds = Math.floor((diff % (1000 * 60)) / 1000);

                container.innerHTML = `
                    <span>${config.text}</span>
                    <div class="time-left">
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
                container.innerHTML = `<div style="color: #666; font-size:2vw;">No Media</div>`;
            }
        }
    }

    // 5. Initial Load
    loadLayout();

    // 6. Connect to Server-Sent Events (SSE) for Real-Time Sync
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

    // Start SSE listener
    connectSSE();
});
