document.addEventListener('DOMContentLoaded', () => {
    const canvasContainer = document.getElementById('canvas-container');
    const saveLayoutBtn = document.getElementById('save-layout-btn');
    const globalBgColorInput = document.getElementById('global-bg-color');
    const globalWhStartInput = document.getElementById('global-wh-start');
    const globalWhEndInput = document.getElementById('global-wh-end');
    const widgetList = document.getElementById('widget-list');

    // Modals & Forms
    const configModal = document.getElementById('config-modal');
    const closeModal = document.querySelector('.close-modal');
    const configForm = document.getElementById('config-form');
    const configFields = document.getElementById('config-fields');
    const configWidgetId = document.getElementById('config-widget-id');
    const deleteWidgetBtn = document.getElementById('delete-widget-btn');

    // Layering controls
    const btnBringForward = document.getElementById('btn-bring-forward');
    const btnSendBackward = document.getElementById('btn-send-backward');
    const configZIndex = document.getElementById('config-z-index');

    // Screen State Management
    let currentScreenId = 1;
    let screensData = [];

    // UI Elements for Screen Settings
    const screenTabs = document.querySelectorAll('.screen-tab');
    const screenEnabledInput = document.getElementById('screen-enabled');
    const screenDurationInput = document.getElementById('screen-duration');
    const screenTransitionSelect = document.getElementById('screen-transition');

    let widgets = {};
    let selectedWidgetId = null;
    let draggedItemType = null;

    // Initialize Default Screens if backend empty
    function initDefaultScreens() {
        for(let i=1; i<=5; i++) {
            screensData.push({ id: i, enabled: 1, duration: 10, transition: 'fade' });
        }
    }

    // Load initial layout
    fetch('api/get_layout.php')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                if (data.global_background_color) {
                    globalBgColorInput.value = data.global_background_color;
                    canvasContainer.style.backgroundColor = data.global_background_color;
                }
                if (data.working_hours_start) globalWhStartInput.value = data.working_hours_start;
                if (data.working_hours_end) globalWhEndInput.value = data.working_hours_end;

                if (data.screens && data.screens.length > 0) {
                    screensData = data.screens;
                } else {
                    initDefaultScreens();
                }

                data.widgets.forEach(w => {
                    createWidgetElement(w);
                });

                // Set initial tab state
                switchScreen(1);
            }
        })
        .catch(err => {
            console.error("Error loading layout:", err);
            initDefaultScreens();
            switchScreen(1);
        });

    // --- Screen Navigation Logic ---
    screenTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const sId = parseInt(tab.dataset.screenId);
            switchScreen(sId);
        });
    });

    function switchScreen(screenId) {
        currentScreenId = screenId;

        // Update Tabs UI
        screenTabs.forEach(t => t.classList.remove('active'));
        document.querySelector(`.screen-tab[data-screen-id="${screenId}"]`).classList.add('active');

        // Update Screen Settings UI
        const sData = screensData.find(s => s.id === screenId);
        if (sData) {
            screenEnabledInput.checked = sData.enabled === 1;
            screenDurationInput.value = sData.duration;
            screenTransitionSelect.value = sData.transition;
        }

        // Filter Widgets on Canvas
        document.querySelectorAll('.widget-item').forEach(el => {
            const wData = widgets[el.id];
            if (wData.screen_id === currentScreenId) {
                el.classList.remove('hidden-screen');
            } else {
                el.classList.add('hidden-screen');
                el.classList.remove('is-selected'); // Deselect if hidden
            }
        });

        selectedWidgetId = null;
    }

    // Bind Screen Setting Inputs to Data
    screenEnabledInput.addEventListener('change', (e) => {
        const s = screensData.find(x => x.id === currentScreenId);
        if(s) s.enabled = e.target.checked ? 1 : 0;
    });
    screenDurationInput.addEventListener('input', (e) => {
        const s = screensData.find(x => x.id === currentScreenId);
        if(s) s.duration = parseInt(e.target.value) || 10;
    });
    screenTransitionSelect.addEventListener('change', (e) => {
        const s = screensData.find(x => x.id === currentScreenId);
        if(s) s.transition = e.target.value;
    });

    // Global Background Color Live Update
    globalBgColorInput.addEventListener('input', (e) => {
        canvasContainer.style.backgroundColor = e.target.value;
    });

    // Drag from sidebar to canvas
    const newWidgets = document.querySelectorAll('.new-widget');
    newWidgets.forEach(nw => {
        nw.setAttribute('draggable', true);
        nw.addEventListener('dragstart', (e) => {
            draggedItemType = e.target.closest('.new-widget').dataset.type;
            e.dataTransfer.setData('text/plain', draggedItemType);
        });
    });

    canvasContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    canvasContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedItemType) {
            // Calculate drop position relative to canvas percentages
            const rect = canvasContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const leftPct = (x / rect.width) * 100;
            const topPct = (y / rect.height) * 100;

            const newWidgetData = {
                id: 'w_' + Date.now(),
                screen_id: currentScreenId,
                type: draggedItemType,
                left: Math.max(0, Math.min(leftPct, 80)), // 20% width default
                top: Math.max(0, Math.min(topPct, 80)), // 20% height default
                width: 20,
                height: 20,
                z_index: 10,
                config: getDefaultConfig(draggedItemType)
            };
            createWidgetElement(newWidgetData);
            draggedItemType = null;
        }
    });

    function getDefaultConfig(type) {
        let config = {
            textColor: '#ffffff',
            bgColor: 'transparent',
            fontSize: '10' // in cqi
        };
        switch (type) {
            case 'clock':
                config.timezone = 'Europe/Athens';
                config.format = '24h';
                break;
            case 'media':
                config.mediaUrl = '';
                config.mediaType = 'image';
                break;
            case 'ticker':
                config.text = 'Welcome to the display!';
                config.speed = 'normal';
                break;
            case 'countdown':
                config.targetDate = new Date().toISOString().split('T')[0] + 'T00:00';
                config.eventName = 'Event';
                config.displayFormat = 'full';
                break;
            case 'youtube':
                config.youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
                break;
            case 'shape':
                config.bgColor = '#007bff';
                config.shapeType = 'rectangle'; // rectangle, oval, triangle
                config.borderRadius = '0'; // Custom border radius option
                break;
            case 'freetext':
                config.text = 'Double click to edit text';
                break;
            case 'bambu':
                config.printerId = '0';
                config.displayMode = 'text_bar';
                config.barThickness = '10';
                config.bgColor = 'rgba(0,0,0,0.8)';
                break;
        }
        return config;
    }

    function createWidgetElement(wData) {
        // Ensure legacy widgets get a screen_id
        if (!wData.screen_id) wData.screen_id = 1;

        widgets[wData.id] = wData;

        const el = document.createElement('div');
        el.className = `widget-item widget-${wData.type}`;
        el.id = wData.id;

        // Hide if not on current screen
        if (wData.screen_id !== currentScreenId) {
            el.classList.add('hidden-screen');
        }

        // Apply CSS absolute percentages
        el.style.left = wData.left + '%';
        el.style.top = wData.top + '%';
        el.style.width = wData.width + '%';
        el.style.height = wData.height + '%';
        el.style.zIndex = wData.z_index;

        // Content wrapper
        const content = document.createElement('div');
        content.className = 'content';
        el.appendChild(content);

        // Resize Handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        el.appendChild(resizeHandle);

        canvasContainer.appendChild(el);
        renderWidgetContent(el, wData);

        // Click to select and open config
        el.addEventListener('mousedown', () => {
            selectWidget(wData.id);
        });
        el.addEventListener('dblclick', () => {
            openConfigModal(wData.id);
        });
    }

    function renderWidgetContent(el, data) {
        const content = el.querySelector('.content');
        const c = data.config;

        // Apply general styles
        if (c.bgColor) el.style.backgroundColor = c.bgColor;
        if (c.textColor) el.style.color = c.textColor;
        if (c.fontSize) content.style.fontSize = c.fontSize + 'cqi';

        // Reset specific styles
        el.style.borderRadius = '0';
        el.style.clipPath = 'none';

        switch (data.type) {
            case 'clock':
                content.innerHTML = `<div>12:00:00<br><small style="font-size:0.5em;">${c.timezone || 'UTC'}</small></div>`;
                break;
            case 'media':
                if (c.mediaType === 'video') {
                    content.innerHTML = `<video src="${c.mediaUrl}" muted loop></video>`;
                } else if (c.mediaUrl) {
                    content.innerHTML = `<img src="${c.mediaUrl}" alt="media">`;
                } else {
                    content.innerHTML = `<span>No Media Selected</span>`;
                }
                break;
            case 'ticker':
                content.innerHTML = `<div class="ticker-text" style="color:${c.textColor}">${c.text}</div>`;
                break;
            case 'countdown':
                let placeholderText = '00:00:00';
                if (c.displayFormat === 'days_only') placeholderText = '0 Days';
                else if (c.displayFormat === 'days_hours') placeholderText = '0d 00h';
                else if (c.displayFormat === 'hours_minutes') placeholderText = '00:00';
                else if (c.displayFormat === 'minutes_seconds') placeholderText = '00:00';
                else placeholderText = '0d 00:00:00';
                content.innerHTML = `<div>${c.eventName}<br>${placeholderText}</div>`;
                break;
            case 'youtube':
                content.innerHTML = `<div style="background:red;color:white;padding:10px;text-align:center;">YouTube Video<br><small>${c.youtubeUrl}</small></div>`;
                break;
            case 'shape':
                if (c.shapeType === 'triangle') {
                    el.style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
                } else if (c.shapeType === 'oval') {
                    el.style.borderRadius = '50%'; // Base for oval, will be overridden if user set custom radius
                }
                // Always apply the user's custom border-radius slider if they tweaked it
                if (c.borderRadius) {
                    el.style.borderRadius = c.borderRadius + '%';
                }
                content.innerHTML = '';
                break;
            case 'freetext':
                content.innerHTML = `<div style="text-align:center;">${c.text}</div>`;
                break;
            case 'bambu':
                const pNames = { '0': 'P2S', '1': 'A1', '2': 'P1S' };
                const pName = pNames[c.printerId] || 'P2S';
                let bHtml = `<div style="color: #00ff00; font-weight: bold; width: 100%; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${pName}: 50% | 12 min</div>`;

                if (c.displayMode === 'text_bar') {
                    bHtml += `
                    <div style="width: 100%; height: ${c.barThickness}px; background: #444; border-radius: 5px; margin-top: 5px; overflow: hidden;">
                        <div style="width: 50%; height: 100%; background: #00ff00;"></div>
                    </div>`;
                }

                content.innerHTML = `<div style="width: 100%; padding: 10px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center;">${bHtml}</div>`;
                break;
        }
    }

    // --- INTERACT.JS LOGIC FOR DRAG AND RESIZE ---
    interact('.widget-item:not(.hidden-screen)')
        .draggable({
            inertia: true,
            modifiers: [
                interact.modifiers.restrictRect({
                    restriction: 'parent',
                    endOnly: true
                })
            ],
            autoScroll: true,
            listeners: {
                start(event) {
                    selectWidget(event.target.id);
                },
                move(event) {
                    const target = event.target;
                    const id = target.id;
                    const wData = widgets[id];

                    // Convert pixel movement to percentages relative to container
                    const rect = canvasContainer.getBoundingClientRect();
                    const dxPct = (event.dx / rect.width) * 100;
                    const dyPct = (event.dy / rect.height) * 100;

                    wData.left += dxPct;
                    wData.top += dyPct;

                    target.style.left = wData.left + '%';
                    target.style.top = wData.top + '%';
                }
            }
        })
        .resizable({
            // resize from all edges and corners
            edges: { left: false, right: '.resize-handle', bottom: '.resize-handle', top: false },
            modifiers: [
                interact.modifiers.restrictEdges({
                    outer: 'parent'
                }),
                interact.modifiers.restrictSize({
                    min: { width: 50, height: 50 } // min 50px
                })
            ],
            inertia: true,
            listeners: {
                start(event) {
                    selectWidget(event.target.id);
                },
                move: function (event) {
                    let { x, y } = event.target.dataset;
                    const target = event.target;
                    const id = target.id;
                    const wData = widgets[id];
                    const rect = canvasContainer.getBoundingClientRect();

                    // Convert pixel size to percentages
                    const widthPct = (event.rect.width / rect.width) * 100;
                    const heightPct = (event.rect.height / rect.height) * 100;

                    wData.width = widthPct;
                    wData.height = heightPct;

                    target.style.width = widthPct + '%';
                    target.style.height = heightPct + '%';
                }
            }
        });

    function selectWidget(id) {
        document.querySelectorAll('.widget-item').forEach(el => el.classList.remove('is-selected'));
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('is-selected');
            selectedWidgetId = id;
            // Bring to top visually during interaction without saving yet
            el.style.zIndex = parseInt(widgets[id].z_index) + 100;
        }
    }

    // Deselect on clicking canvas background
    canvasContainer.addEventListener('mousedown', (e) => {
        if (e.target === canvasContainer) {
            document.querySelectorAll('.widget-item').forEach(el => {
                el.classList.remove('is-selected');
                if (widgets[el.id]) el.style.zIndex = widgets[el.id].z_index; // restore real z-index
            });
            selectedWidgetId = null;
        }
    });

    // Configuration Modal
    function openConfigModal(id) {
        const data = widgets[id];
        configWidgetId.value = id;
        document.getElementById('modal-title').innerText = `Configure ${data.type}`;

        let fieldsHtml = '';
        const c = data.config;

        // Common Fields
        fieldsHtml += `
            <div class="form-group">
                <label>Text Color</label>
                <input type="color" id="cfg-textColor" class="form-control" value="${c.textColor || '#ffffff'}">
            </div>
            <div class="form-group">
                <label>Background Color (Transparent: leave blank or #00000000)</label>
                <input type="text" id="cfg-bgColor" class="form-control" value="${c.bgColor || 'transparent'}">
            </div>
            <div class="form-group">
                <label>Font Size (Container % - cqi)</label>
                <input type="number" id="cfg-fontSize" class="form-control" value="${c.fontSize || '10'}">
            </div>
        `;

        // Specific Fields
        if (data.type === 'clock') {
            const timezones = [
                'UTC', 'Europe/Athens', 'Europe/London', 'Europe/Berlin',
                'America/New_York', 'America/Chicago', 'America/Los_Angeles',
                'Asia/Tokyo', 'Asia/Dubai', 'Asia/Singapore',
                'Australia/Sydney', 'Pacific/Auckland'
            ];

            let tzOptions = '';
            timezones.forEach(tz => {
                const selected = (c.timezone === tz) ? 'selected' : '';
                tzOptions += `<option value="${tz}" ${selected}>${tz}</option>`;
            });

            fieldsHtml += `
                <div class="form-group">
                    <label>Timezone</label>
                    <select id="cfg-timezone" class="form-control">
                        ${tzOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Format</label>
                    <select id="cfg-format" class="form-control">
                        <option value="24h" ${c.format==='24h'?'selected':''}>24 Hour</option>
                        <option value="12h" ${c.format==='12h'?'selected':''}>12 Hour (AM/PM)</option>
                    </select>
                </div>
            `;
        } else if (data.type === 'media') {
            fieldsHtml += `
                <div class="form-group">
                    <label>Media URL (Select from Library below or paste)</label>
                    <input type="text" id="cfg-mediaUrl" class="form-control" value="${c.mediaUrl || ''}">
                </div>
                <div class="form-group">
                    <label>Type</label>
                    <select id="cfg-mediaType" class="form-control">
                        <option value="image" ${c.mediaType==='image'?'selected':''}>Image</option>
                        <option value="video" ${c.mediaType==='video'?'selected':''}>Video</option>
                    </select>
                </div>
            `;
        } else if (data.type === 'ticker') {
             fieldsHtml += `
                <div class="form-group">
                    <label>Ticker Text</label>
                    <input type="text" id="cfg-text" class="form-control" value="${c.text || ''}">
                </div>
            `;
        } else if (data.type === 'countdown') {
             fieldsHtml += `
                <div class="form-group">
                    <label>Event Name</label>
                    <input type="text" id="cfg-eventName" class="form-control" value="${c.eventName || ''}">
                </div>
                <div class="form-group">
                    <label>Target Date & Time</label>
                    <input type="datetime-local" id="cfg-targetDate" class="form-control" value="${c.targetDate || ''}">
                </div>
                <div class="form-group">
                    <label>Display Format</label>
                    <select id="cfg-displayFormat" class="form-control">
                        <option value="full" ${c.displayFormat==='full'?'selected':''}>Full (Days, Hours, Min, Sec)</option>
                        <option value="days_only" ${c.displayFormat==='days_only'?'selected':''}>Days Only</option>
                        <option value="days_hours" ${c.displayFormat==='days_hours'?'selected':''}>Days & Hours</option>
                        <option value="hours_minutes" ${c.displayFormat==='hours_minutes'?'selected':''}>Hours & Minutes</option>
                        <option value="minutes_seconds" ${c.displayFormat==='minutes_seconds'?'selected':''}>Minutes & Seconds</option>
                    </select>
                </div>
            `;
        } else if (data.type === 'youtube') {
            fieldsHtml += `
               <div class="form-group">
                   <label>YouTube URL</label>
                   <input type="text" id="cfg-youtubeUrl" class="form-control" value="${c.youtubeUrl || ''}">
               </div>
           `;
        } else if (data.type === 'shape') {
            fieldsHtml += `
               <div class="form-group">
                    <label>Shape Type</label>
                    <select id="cfg-shapeType" class="form-control">
                        <option value="rectangle" ${c.shapeType==='rectangle'?'selected':''}>Rectangle / Square</option>
                        <option value="oval" ${c.shapeType==='oval'?'selected':''}>Oval / Circle</option>
                        <option value="triangle" ${c.shapeType==='triangle'?'selected':''}>Triangle</option>
                    </select>
               </div>
               <div class="form-group">
                   <label>Border Radius (%) - Applies to all</label>
                   <input type="number" id="cfg-borderRadius" class="form-control" value="${c.borderRadius || '0'}" max="50">
                   <small style="color:#aaa;">0 = Sharp, 50 = Full Round. Custom styling overlays.</small>
               </div>
           `;
        } else if (data.type === 'freetext') {
            fieldsHtml += `
               <div class="form-group">
                   <label>Text Content (HTML allowed)</label>
                   <textarea id="cfg-text" class="form-control" rows="4">${c.text || ''}</textarea>
               </div>
           `;
        } else if (data.type === 'bambu') {
            fieldsHtml += `
               <div class="form-group">
                   <label>Specific Printer</label>
                   <select id="cfg-printerId" class="form-control">
                       <option value="0" ${c.printerId==='0'?'selected':''}>P2S</option>
                       <option value="1" ${c.printerId==='1'?'selected':''}>A1</option>
                       <option value="2" ${c.printerId==='2'?'selected':''}>P1S</option>
                   </select>
               </div>
               <div class="form-group">
                    <label>Display Mode</label>
                    <select id="cfg-displayMode" class="form-control">
                        <option value="text_only" ${c.displayMode==='text_only'?'selected':''}>Text Only</option>
                        <option value="text_bar" ${c.displayMode==='text_bar'?'selected':''}>Text + Progress Bar</option>
                    </select>
                </div>
                <div class="form-group">
                   <label>Progress Bar Thickness (px)</label>
                   <input type="number" id="cfg-barThickness" class="form-control" value="${c.barThickness || '10'}" min="1" max="100">
               </div>
           `;
        }

        configFields.innerHTML = fieldsHtml;
        configZIndex.value = data.z_index;
        configModal.style.display = 'block';
    }

    closeModal.onclick = () => { configModal.style.display = 'none'; };
    window.onclick = (event) => {
        if (event.target == configModal) configModal.style.display = 'none';
    };

    // Layering Adjustments in Modal
    btnBringForward.onclick = () => {
        configZIndex.value = parseInt(configZIndex.value) + 1;
    };
    btnSendBackward.onclick = () => {
        configZIndex.value = Math.max(0, parseInt(configZIndex.value) - 1);
    };

    configForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = configWidgetId.value;
        const data = widgets[id];

        data.z_index = parseInt(configZIndex.value);

        // Save dynamic fields back to config object
        const inputs = configFields.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.id.startsWith('cfg-')) {
                const key = input.id.replace('cfg-', '');
                data.config[key] = input.value;
            }
        });

        const el = document.getElementById(id);
        el.style.zIndex = data.z_index;
        renderWidgetContent(el, data);
        configModal.style.display = 'none';
    });

    deleteWidgetBtn.addEventListener('click', () => {
        const id = configWidgetId.value;
        document.getElementById(id).remove();
        delete widgets[id];
        configModal.style.display = 'none';
    });

    // Save Layout (including Screens array)
    saveLayoutBtn.addEventListener('click', () => {
        const layoutData = {
            global_background_color: globalBgColorInput.value,
            working_hours_start: globalWhStartInput.value,
            working_hours_end: globalWhEndInput.value,
            screens: screensData,
            widgets: Object.values(widgets)
        };

        fetch('api/save_layout.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(layoutData)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('Layout saved successfully! Display screens will update automatically.');
                // Restore real z-indexes
                document.querySelectorAll('.widget-item').forEach(el => {
                    if(widgets[el.id]) el.style.zIndex = widgets[el.id].z_index;
                });
            } else {
                alert('Error: ' + data.message);
            }
        });
    });

    // Media Library Upload Logic
    const uploadForm = document.getElementById('upload-form');
    const uploadStatus = document.getElementById('upload-status');
    const mediaLibrary = document.getElementById('media-library');

    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const fileInput = document.getElementById('media-file');
        const file = fileInput.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        uploadStatus.innerHTML = '<span style="color: yellow;">Uploading...</span>';

        fetch('api/upload.php', { method: 'POST', body: formData })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                uploadStatus.innerHTML = '<span style="color: green;">Upload successful!</span>';
                loadMediaLibrary();
                uploadForm.reset();
            } else {
                uploadStatus.innerHTML = `<span style="color: red;">Error: ${data.message}</span>`;
            }
        })
        .catch(err => {
            uploadStatus.innerHTML = '<span style="color: red;">Upload failed.</span>';
        });
    });

    function loadMediaLibrary() {
        fetch('api/get_media.php')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                mediaLibrary.innerHTML = '';
                data.media.forEach(item => {
                    const el = document.createElement('div');
                    el.className = 'media-item';

                    if (item.type.startsWith('image/')) {
                        el.innerHTML = `<img src="${item.filepath}" alt="${item.filename}">
                                        <div class="filename">${item.filename}</div>`;
                    } else if (item.type.startsWith('video/')) {
                         el.innerHTML = `<div style="height:60px; background:#444; color:white; display:flex; align-items:center; justify-content:center;">🎥 Video</div>
                                        <div class="filename">${item.filename}</div>`;
                    }

                    // Click to copy URL to clipboard for use in widgets
                    el.addEventListener('click', () => {
                        const url = window.location.origin + '/' + item.filepath.replace('../', '');
                        navigator.clipboard.writeText(url).then(() => {
                            alert(`Copied URL to clipboard:\n${url}`);
                        });
                    });

                    mediaLibrary.appendChild(el);
                });
            }
        });
    }

    loadMediaLibrary();
});