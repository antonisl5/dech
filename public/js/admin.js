document.addEventListener('DOMContentLoaded', () => {
    const canvasContainer = document.getElementById('canvas-container');
    const saveLayoutBtn = document.getElementById('save-layout-btn');
    const globalBgColorInput = document.getElementById('global-bg-color');
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

    let widgets = {};
    let selectedWidgetId = null;
    let draggedItemType = null;

    // Load initial layout
    fetch('api/get_layout.php')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                if (data.global_background_color) {
                    globalBgColorInput.value = data.global_background_color;
                    canvasContainer.style.backgroundColor = data.global_background_color;
                }
                data.widgets.forEach(w => {
                    createWidgetElement(w);
                });
            }
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
                config.timezone = 'UTC';
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
                break;
            case 'youtube':
                config.youtubeUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
                break;
            case 'shape':
                config.bgColor = '#007bff';
                config.borderRadius = '0'; // 0 for square, 50 for circle
                break;
            case 'freetext':
                config.text = 'Double click to edit text';
                break;
            case 'bambu':
                config.printerId = 'all'; // or specific ID
                config.displayMode = 'full'; // 'full' or 'percent'
                config.bgColor = 'rgba(0,0,0,0.8)';
                break;
        }
        return config;
    }

    function createWidgetElement(wData) {
        widgets[wData.id] = wData;

        const el = document.createElement('div');
        el.className = `widget-item widget-${wData.type}`;
        el.id = wData.id;

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

        switch (data.type) {
            case 'clock':
                content.innerHTML = `<div>12:00:00</div>`;
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
                content.innerHTML = `<div>${c.eventName}<br>00:00:00</div>`;
                break;
            case 'youtube':
                content.innerHTML = `<div style="background:red;color:white;padding:10px;text-align:center;">YouTube Video<br><small>${c.youtubeUrl}</small></div>`;
                break;
            case 'shape':
                if (c.borderRadius) el.style.borderRadius = c.borderRadius + '%';
                content.innerHTML = '';
                break;
            case 'freetext':
                content.innerHTML = `<div style="text-align:center;">${c.text}</div>`;
                break;
            case 'bambu':
                content.innerHTML = `
                    <div class="bambu-title">3D Printer</div>
                    <div class="bambu-progress-bar"><div class="bambu-progress-fill" style="width: 50%;"></div></div>
                    <div class="bambu-details">50% | 2h 30m</div>
                `;
                break;
        }
    }

    // --- INTERACT.JS LOGIC FOR DRAG AND RESIZE ---
    interact('.widget-item')
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
                el.style.zIndex = widgets[el.id].z_index; // restore real z-index
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
            fieldsHtml += `
                <div class="form-group">
                    <label>Timezone</label>
                    <input type="text" id="cfg-timezone" class="form-control" value="${c.timezone || 'UTC'}">
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
                   <label>Border Radius (%)</label>
                   <input type="number" id="cfg-borderRadius" class="form-control" value="${c.borderRadius || '0'}" max="50">
                   <small style="color:#aaa;">0 = Square, 50 = Circle</small>
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
                   <label>Printer (or 'all')</label>
                   <select id="cfg-printerId" class="form-control">
                       <option value="all" ${c.printerId==='all'?'selected':''}>All Printers</option>
                       <option value="0" ${c.printerId==='0'?'selected':''}>P2S (ID: 0)</option>
                       <option value="1" ${c.printerId==='1'?'selected':''}>A1 (ID: 1)</option>
                       <option value="2" ${c.printerId==='2'?'selected':''}>P1S (ID: 2)</option>
                   </select>
               </div>
               <div class="form-group">
                    <label>Display Mode</label>
                    <select id="cfg-displayMode" class="form-control">
                        <option value="full" ${c.displayMode==='full'?'selected':''}>Full (Bar + Text)</option>
                        <option value="percent" ${c.displayMode==='percent'?'selected':''}>Percent Only</option>
                    </select>
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

    // Save Layout
    saveLayoutBtn.addEventListener('click', () => {
        const layoutData = {
            global_background_color: globalBgColorInput.value,
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
