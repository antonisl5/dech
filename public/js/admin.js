// public/js/admin.js

document.addEventListener('DOMContentLoaded', function () {
    // 1. Calculate and set up grid cell height to match 16:9 ratio
    // If we have 12 columns, and aspect ratio is 16:9,
    // total rows = 12 * (9/16) = 6.75 rows roughly?
    // Let's use 12 columns and 12 rows, making it a square grid mapping to the 16:9 box.
    // Or we use 16 columns and 9 rows to match exactly. Let's do 16 columns and 9 rows.
    let columns = 16;
    let gridContainer = document.querySelector('.grid-container');

    function getCellHeight() {
        return gridContainer.clientWidth / columns;
    }

    let grid = GridStack.init({
        cellHeight: getCellHeight() + 'px',
        margin: 0,
        column: columns,
        float: true,
        acceptWidgets: true,
        disableResize: false,
        disableDrag: false
    }, '#layoutGrid');

    // Handle Resize
    window.addEventListener('resize', function() {
        grid.cellHeight(getCellHeight() + 'px', true);
    });

    // Make the new widgets draggable into the grid stack
    GridStack.setupDragIn('.new-widget', { appendTo: 'body', helper: 'clone' });

    // Handle dropping new widgets into the grid
    grid.on('added', function(e, items) {
        items.forEach(function(item) {
            if (!item.el.hasAttribute('data-initialized')) {
                // Determine widget type
                let type = item.el.getAttribute('data-type');
                if(!type) type = 'unknown';

                // Create a unique ID for the widget
                let id = 'widget_' + Math.random().toString(36).substr(2, 9);

                // Default styles
                let baseConfig = { font_size: '2vw', color: '#000000', bg_color: 'transparent' };

                // Set default configuration based on type
                let config = { ...baseConfig };
                if(type === 'clock') config = { format: '24h', color: '#000000', font_size: '4vw', bg_color: '#ffffff' };
                if(type === 'ticker') config = { text: 'Welcome to our display!', speed: '50', color: '#000000', bg_color: '#ffffff', font_size: '2vw' };
                if(type === 'media') config = { media_url: '', type: 'image', bg_color: '#000000' };
                if(type === 'countdown') config = { target_date: new Date(new Date().getTime() + 24*60*60*1000).toISOString().slice(0, 16), text: 'Event starts in:', color: '#ff0000', font_size: '2vw', bg_color: '#ffffff' };
                if(type === 'youtube') config = { youtube_url: '', bg_color: '#000000' };

                // Store state in element data attributes
                item.el.dataset.id = id;
                item.el.dataset.type = type;
                item.el.dataset.config = JSON.stringify(config);
                item.el.setAttribute('data-initialized', 'true');

                // Build the inner HTML for the grid item
                let content = `
                    <div class="widget-wrapper" style="width: 100%; height: 100%; position: relative;">
                        <div class="widget-controls" style="position:absolute; top:5px; right:5px; z-index:100; opacity: 0.5;">
                            <button class="control-btn config" style="background:#007bff; color:white; border:none; border-radius:3px; padding:3px 6px; cursor:pointer;" onclick="openConfigModal('${id}')">⚙️</button>
                            <button class="control-btn remove" style="background:#dc3545; color:white; border:none; border-radius:3px; padding:3px 6px; cursor:pointer;" onclick="removeWidget('${id}')">❌</button>
                        </div>
                        <div class="widget-body" id="body_${id}" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;">
                        </div>
                    </div>
                `;
                item.el.querySelector('.grid-stack-item-content').innerHTML = content;
                updateWidgetPreview(id);
            }
        });
    });

    // Remove inline hover effects and put them back to hover in JS/CSS
    const addHoverEffect = () => {
        document.querySelectorAll('.widget-wrapper').forEach(el => {
            el.addEventListener('mouseenter', () => { el.querySelector('.widget-controls').style.opacity = 1; });
            el.addEventListener('mouseleave', () => { el.querySelector('.widget-controls').style.opacity = 0.5; });
        });
    };
    grid.on('added', addHoverEffect);

    // 2. Load Initial Layout
    fetch('api/get_layout.php')
        .then(response => response.json())
        .then(data => {
            if (data.widgets && data.widgets.length > 0) {
                grid.removeAll();

                data.widgets.forEach(w => {
                    let widgetHtml = `
                        <div class="grid-stack-item"
                             gs-x="${w.x}" gs-y="${w.y}"
                             gs-w="${w.w}" gs-h="${w.h}"
                             data-id="${w.id}"
                             data-type="${w.type}"
                             data-config='${JSON.stringify(w.config)}'
                             data-initialized="true">
                            <div class="grid-stack-item-content">
                                <div class="widget-wrapper" style="width: 100%; height: 100%; position: relative;">
                                    <div class="widget-controls" style="position:absolute; top:5px; right:5px; z-index:100; opacity: 0.5;">
                                        <button class="control-btn config" style="background:#007bff; color:white; border:none; border-radius:3px; padding:3px 6px; cursor:pointer;" onclick="openConfigModal('${w.id}')">⚙️</button>
                                        <button class="control-btn remove" style="background:#dc3545; color:white; border:none; border-radius:3px; padding:3px 6px; cursor:pointer;" onclick="removeWidget('${w.id}')">❌</button>
                                    </div>
                                    <div class="widget-body" id="body_${w.id}" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;">
                                        Loading...
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    grid.addWidget(widgetHtml);
                    updateWidgetPreview(w.id);
                });
                addHoverEffect();
            }
        })
        .catch(err => console.error("Error loading layout:", err));

    // 3. Save Layout
    document.getElementById('saveLayoutBtn').addEventListener('click', function() {
        let items = grid.getGridItems();
        let layoutData = [];

        items.forEach(item => {
            let node = item.gridstackNode;
            let el = item;

            if (el.dataset.id) {
                layoutData.push({
                    id: el.dataset.id,
                    type: el.dataset.type,
                    x: node.x,
                    y: node.y,
                    w: node.w,
                    h: node.h,
                    config: JSON.parse(el.dataset.config || '{}')
                });
            }
        });

        let saveStatus = document.getElementById('saveStatus');
        saveStatus.textContent = 'Saving...';

        fetch('api/save_layout.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ widgets: layoutData })
        })
        .then(response => response.json())
        .then(data => {
            if(data.success) {
                saveStatus.style.color = 'green';
                saveStatus.textContent = 'Layout saved & screen updated!';
                setTimeout(() => saveStatus.textContent = '', 3000);
            } else {
                saveStatus.style.color = 'red';
                saveStatus.textContent = 'Error saving layout.';
            }
        })
        .catch(err => {
            console.error("Save error:", err);
            saveStatus.style.color = 'red';
            saveStatus.textContent = 'Network error.';
        });
    });

    // 4. Media Upload
    document.getElementById('uploadForm').addEventListener('submit', function(e) {
        e.preventDefault();

        let formData = new FormData();
        let fileInput = document.getElementById('mediaFile');
        let status = document.getElementById('uploadStatus');

        if(fileInput.files.length === 0) return;

        formData.append('file', fileInput.files[0]);
        status.innerHTML = '<span style="color:blue;">Uploading...</span>';

        fetch('api/upload.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if(data.success) {
                status.innerHTML = '<span style="color:green;">Upload successful!</span>';
                fileInput.value = ''; // clear
                loadMediaLibrary(); // refresh library
            } else {
                status.innerHTML = '<span style="color:red;">Error: ' + data.message + '</span>';
            }
        })
        .catch(err => {
            console.error(err);
            status.innerHTML = '<span style="color:red;">Upload failed.</span>';
        });
    });

    loadMediaLibrary();
});

// --- GLOBAL FUNCTIONS ---

window.removeWidget = function(id) {
    let el = document.querySelector(`.grid-stack-item[data-id="${id}"]`);
    if (el) {
        let grid = el.gridstackNode.grid;
        grid.removeWidget(el);
    }
};

let currentConfigWidgetId = null;

window.openConfigModal = function(id) {
    let el = document.querySelector(`.grid-stack-item[data-id="${id}"]`);
    if (!el) return;

    currentConfigWidgetId = id;
    let type = el.dataset.type;
    let config = JSON.parse(el.dataset.config || '{}');

    document.getElementById('modalTitle').textContent = `Configure ${type.toUpperCase()} Widget`;
    let modalBody = document.getElementById('modalBody');

    // Build common style fields
    let styleHtml = `
        <hr>
        <h4>Styling</h4>
        <div class="form-group">
            <label>Font Size (e.g. 2vw, 24px)</label>
            <input type="text" id="cfg_font_size" value="${config.font_size || '2vw'}">
        </div>
        <div class="form-group">
            <label>Text Color</label>
            <input type="color" id="cfg_color" value="${config.color || '#000000'}">
        </div>
        <div class="form-group">
            <label>Background Color (use #RRGGBBAA or transparent)</label>
            <input type="text" id="cfg_bg_color" value="${config.bg_color || 'transparent'}">
        </div>
    `;

    let formHtml = '';

    if (type === 'clock') {
        formHtml = `
            <div class="form-group">
                <label>Format</label>
                <select id="cfg_format">
                    <option value="12h" ${config.format === '12h' ? 'selected' : ''}>12-Hour (AM/PM)</option>
                    <option value="24h" ${config.format === '24h' ? 'selected' : ''}>24-Hour</option>
                </select>
            </div>
        `;
    } else if (type === 'ticker') {
        formHtml = `
            <div class="form-group">
                <label>Ticker Text</label>
                <input type="text" id="cfg_text" value="${config.text || ''}">
            </div>
            <div class="form-group">
                <label>Speed (1-100)</label>
                <input type="number" id="cfg_speed" value="${config.speed || '50'}" min="1" max="100">
            </div>
        `;
    } else if (type === 'countdown') {
        formHtml = `
            <div class="form-group">
                <label>Label Text</label>
                <input type="text" id="cfg_text" value="${config.text || 'Event starts in:'}">
            </div>
            <div class="form-group">
                <label>Target Date & Time</label>
                <input type="datetime-local" id="cfg_target_date" value="${config.target_date || ''}">
            </div>
        `;
    } else if (type === 'media') {
        formHtml = `
            <div class="form-group">
                <label>Select Media</label>
                <select id="cfg_media_url">
                    <option value="">Loading media...</option>
                </select>
            </div>
        `;
        fetch('api/get_media.php')
            .then(r => r.json())
            .then(data => {
                let select = document.getElementById('cfg_media_url');
                if(!select) return;
                select.innerHTML = '<option value="">-- Select Media --</option>';
                data.media.forEach(m => {
                    let path = 'media/' + m.filename;
                    let selected = (config.media_url === path) ? 'selected' : '';
                    select.innerHTML += `<option value="${path}" data-mtype="${m.type}" ${selected}>${m.filename}</option>`;
                });
            });
    } else if (type === 'youtube') {
        formHtml = `
            <div class="form-group">
                <label>YouTube URL</label>
                <input type="text" id="cfg_youtube_url" placeholder="https://www.youtube.com/watch?v=..." value="${config.youtube_url || ''}">
            </div>
        `;
        // No font size or text color needed for YouTube video wrapper
        styleHtml = `
        <hr>
        <h4>Styling</h4>
        <div class="form-group">
            <label>Background Color</label>
            <input type="text" id="cfg_bg_color" value="${config.bg_color || '#000000'}">
        </div>
        `;
    } else if (type === 'media' && !styleHtml) {
        styleHtml = `
        <hr>
        <h4>Styling</h4>
        <div class="form-group">
            <label>Background Color</label>
            <input type="text" id="cfg_bg_color" value="${config.bg_color || '#000000'}">
        </div>
        `;
    }

    modalBody.innerHTML = formHtml + styleHtml;
    document.getElementById('configModal').style.display = 'block';
};

document.getElementById('cancelConfigBtn').addEventListener('click', closeConfigModal);
document.querySelector('.close-modal').addEventListener('click', closeConfigModal);

function closeConfigModal() {
    document.getElementById('configModal').style.display = 'none';
    currentConfigWidgetId = null;
}

document.getElementById('saveConfigBtn').addEventListener('click', function() {
    if (!currentConfigWidgetId) return;

    let el = document.querySelector(`.grid-stack-item[data-id="${currentConfigWidgetId}"]`);
    if (!el) return;

    let type = el.dataset.type;
    let newConfig = {};

    // Save general styles
    let sizeEl = document.getElementById('cfg_font_size');
    let colorEl = document.getElementById('cfg_color');
    let bgEl = document.getElementById('cfg_bg_color');

    if(sizeEl) newConfig.font_size = sizeEl.value;
    if(colorEl) newConfig.color = colorEl.value;
    if(bgEl) newConfig.bg_color = bgEl.value;

    if (type === 'clock') {
        newConfig.format = document.getElementById('cfg_format').value;
    } else if (type === 'ticker') {
        newConfig.text = document.getElementById('cfg_text').value;
        newConfig.speed = document.getElementById('cfg_speed').value;
    } else if (type === 'countdown') {
        newConfig.text = document.getElementById('cfg_text').value;
        newConfig.target_date = document.getElementById('cfg_target_date').value;
    } else if (type === 'media') {
        let select = document.getElementById('cfg_media_url');
        newConfig.media_url = select.value;
        if(select.options.length > 0 && select.selectedIndex > 0) {
            newConfig.type = select.options[select.selectedIndex].getAttribute('data-mtype');
        }
    } else if (type === 'youtube') {
        newConfig.youtube_url = document.getElementById('cfg_youtube_url').value;
    }

    el.dataset.config = JSON.stringify(newConfig);
    updateWidgetPreview(currentConfigWidgetId);
    closeConfigModal();
});


function updateWidgetPreview(id) {
    let el = document.querySelector(`.grid-stack-item[data-id="${id}"]`);
    if (!el) return;

    let type = el.dataset.type;
    let config = JSON.parse(el.dataset.config || '{}');
    let body = el.querySelector('.widget-body');

    // Apply generic styles
    body.style.backgroundColor = config.bg_color || 'transparent';
    body.style.color = config.color || '#000';
    body.style.fontSize = config.font_size || '2vw';

    if (type === 'clock') {
        body.innerHTML = `<div style="text-align:center;"><span style="font-weight:bold;">12:00:00</span><br><small style="font-size:0.5em;">${config.format} Clock</small></div>`;
    } else if (type === 'ticker') {
        body.innerHTML = `<marquee scrollamount="5" style="width:100%;">${config.text || 'Ticker Text'}</marquee>`;
    } else if (type === 'countdown') {
        body.innerHTML = `<div style="text-align:center;"><small style="font-size:0.5em;">${config.text}</small><br><span style="font-weight:bold;">00d 00h 00m</span></div>`;
    } else if (type === 'media') {
        if (config.media_url) {
            if (config.type && config.type.startsWith('video')) {
                body.innerHTML = `<video src="${config.media_url}" style="width:100%; height:100%; object-fit:cover;" controls></video>`;
            } else {
                body.innerHTML = `<img src="${config.media_url}" style="width:100%; height:100%; object-fit:contain;">`;
            }
        } else {
            body.innerHTML = `<div style="font-size:1vw;">No Media Selected</div>`;
        }
    } else if (type === 'youtube') {
        if (config.youtube_url) {
            let videoId = extractYouTubeId(config.youtube_url);
            if(videoId) {
                body.innerHTML = `<img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" style="width:100%; height:100%; object-fit:cover;">
                <div style="position:absolute; background:rgba(0,0,0,0.6); padding:5px; border-radius:5px; color:#fff; font-size:1vw;">YouTube Video</div>`;
            } else {
                body.innerHTML = `<div style="font-size:1vw;">Invalid YouTube URL</div>`;
            }
        } else {
            body.innerHTML = `<div style="font-size:1vw;">No YouTube Video Selected</div>`;
        }
    }
}

function extractYouTubeId(url) {
    let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    let match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function loadMediaLibrary() {
    let gallery = document.getElementById('mediaGallery');
    gallery.innerHTML = '<p class="loading">Loading media...</p>';

    fetch('api/get_media.php')
        .then(response => response.json())
        .then(data => {
            gallery.innerHTML = '';
            if(!data.media || data.media.length === 0) {
                gallery.innerHTML = '<p>No media uploaded.</p>';
                return;
            }

            data.media.forEach(m => {
                let div = document.createElement('div');
                div.className = 'media-item';
                div.title = m.filename;

                let mediaPath = 'media/' + m.filename;
                let content = '';

                if (m.type.startsWith('image')) {
                    content = `<img src="${mediaPath}" alt="${m.filename}">`;
                } else if (m.type.startsWith('video')) {
                    content = `<video src="${mediaPath}" muted></video>`;
                }

                div.innerHTML = `
                    ${content}
                    <div class="delete-media" onclick="deleteMedia(${m.id}, '${m.filename}')">x</div>
                `;
                gallery.appendChild(div);
            });
        })
        .catch(err => {
            console.error(err);
            gallery.innerHTML = '<p style="color:red;">Error loading media</p>';
        });
}

window.deleteMedia = function(id, filename) {
    if(!confirm('Are you sure you want to delete ' + filename + '?')) return;

    fetch('api/delete_media.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'id=' + id
    })
    .then(r => r.json())
    .then(data => {
        if(data.success) {
            loadMediaLibrary();
        } else {
            alert('Error deleting media: ' + data.message);
        }
    });
};
