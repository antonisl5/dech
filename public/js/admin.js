// public/js/admin.js

document.addEventListener('DOMContentLoaded', function () {
    // 1. Initialize GridStack
    let grid = GridStack.init({
        cellHeight: 60,
        acceptWidgets: true,
        dragIn: '.new-widget',
        dragInOptions: { appendTo: 'body', helper: 'clone' },
        margin: 5,
        column: 12,
        float: true
    }, '#layoutGrid');

    // Make the new widgets draggable into the grid stack
    GridStack.setupDragIn('.new-widget', { appendTo: 'body', helper: 'clone' });

    // Handle dropping new widgets into the grid
    grid.on('added', function(e, items) {
        items.forEach(function(item) {
            if (!item.el.hasAttribute('data-initialized')) {
                // Determine widget type
                let type = item.el.getAttribute('data-type');

                // If dragged from the sidebar, it might not have the attribute directly on el, but on a child
                if (!type) {
                    let source = item.el.querySelector('.new-widget');
                    if(source) type = source.getAttribute('data-type');
                }

                if(!type) type = 'unknown';

                // Create a unique ID for the widget
                let id = 'widget_' + Math.random().toString(36).substr(2, 9);

                // Set default configuration based on type
                let config = {};
                if(type === 'clock') config = { format: '24h', color: '#000000', size: '24' };
                if(type === 'ticker') config = { text: 'Welcome to our display!', speed: '50', color: '#000000', bg: '#ffffff' };
                if(type === 'media') config = { media_url: '', type: 'image' };
                if(type === 'countdown') config = { target_date: new Date(new Date().getTime() + 24*60*60*1000).toISOString().slice(0, 16), text: 'Event starts in:', color: '#ff0000' };

                // Store state in element data attributes
                item.el.dataset.id = id;
                item.el.dataset.type = type;
                item.el.dataset.config = JSON.stringify(config);
                item.el.setAttribute('data-initialized', 'true');

                // Build the inner HTML for the grid item
                let content = `
                    <div class="widget-wrapper">
                        <div class="widget-controls">
                            <button class="control-btn config" onclick="openConfigModal('${id}')">⚙️</button>
                            <button class="control-btn remove" onclick="removeWidget('${id}')">❌</button>
                        </div>
                        <div class="widget-body" id="body_${id}">
                            ${type.toUpperCase()} WIDGET<br><small>Click ⚙️ to configure</small>
                        </div>
                    </div>
                `;
                item.el.querySelector('.grid-stack-item-content').innerHTML = content;
                updateWidgetPreview(id);
            }
        });
    });

    // 2. Load Initial Layout
    fetch('api/get_layout.php')
        .then(response => response.json())
        .then(data => {
            if (data.widgets && data.widgets.length > 0) {
                // Clear grid first
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
                                <div class="widget-wrapper">
                                    <div class="widget-controls">
                                        <button class="control-btn config" onclick="openConfigModal('${w.id}')">⚙️</button>
                                        <button class="control-btn remove" onclick="removeWidget('${w.id}')">❌</button>
                                    </div>
                                    <div class="widget-body" id="body_${w.id}">
                                        Loading...
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    grid.addWidget(widgetHtml);
                    updateWidgetPreview(w.id);
                });
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

            // Ensure we have the data attributes
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

    // Initial load of media library
    loadMediaLibrary();
});

// --- GLOBAL FUNCTIONS (attached to window for inline onclick handlers) ---

// Remove widget from grid
window.removeWidget = function(id) {
    let el = document.querySelector(`.grid-stack-item[data-id="${id}"]`);
    if (el) {
        let grid = el.gridstackNode.grid;
        grid.removeWidget(el);
    }
};

// Modal Logic
let currentConfigWidgetId = null;

window.openConfigModal = function(id) {
    let el = document.querySelector(`.grid-stack-item[data-id="${id}"]`);
    if (!el) return;

    currentConfigWidgetId = id;
    let type = el.dataset.type;
    let config = JSON.parse(el.dataset.config || '{}');

    document.getElementById('modalTitle').textContent = `Configure ${type.toUpperCase()} Widget`;
    let modalBody = document.getElementById('modalBody');

    // Generate form based on type
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
            <div class="form-group">
                <label>Text Color</label>
                <input type="color" id="cfg_color" value="${config.color || '#000000'}">
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
            <div class="form-group">
                <label>Text Color</label>
                <input type="color" id="cfg_color" value="${config.color || '#000000'}">
            </div>
            <div class="form-group">
                <label>Background Color</label>
                <input type="color" id="cfg_bg" value="${config.bg || '#ffffff'}">
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
            <div class="form-group">
                <label>Text Color</label>
                <input type="color" id="cfg_color" value="${config.color || '#ff0000'}">
            </div>
        `;
    } else if (type === 'media') {
        // Fetch media list dynamically for selection
        formHtml = `
            <div class="form-group">
                <label>Select Media</label>
                <select id="cfg_media_url">
                    <option value="">Loading media...</option>
                </select>
            </div>
        `;

        // Populate media select asynchronously
        fetch('api/get_media.php')
            .then(r => r.json())
            .then(data => {
                let select = document.getElementById('cfg_media_url');
                if(!select) return; // Modal closed before load
                select.innerHTML = '<option value="">-- Select Media --</option>';
                data.media.forEach(m => {
                    let path = 'media/' + m.filename;
                    let selected = (config.media_url === path) ? 'selected' : '';
                    select.innerHTML += `<option value="${path}" data-mtype="${m.type}" ${selected}>${m.filename}</option>`;
                });
            });
    }

    modalBody.innerHTML = formHtml;
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

    if (type === 'clock') {
        newConfig.format = document.getElementById('cfg_format').value;
        newConfig.color = document.getElementById('cfg_color').value;
    } else if (type === 'ticker') {
        newConfig.text = document.getElementById('cfg_text').value;
        newConfig.speed = document.getElementById('cfg_speed').value;
        newConfig.color = document.getElementById('cfg_color').value;
        newConfig.bg = document.getElementById('cfg_bg').value;
    } else if (type === 'countdown') {
        newConfig.text = document.getElementById('cfg_text').value;
        newConfig.target_date = document.getElementById('cfg_target_date').value;
        newConfig.color = document.getElementById('cfg_color').value;
    } else if (type === 'media') {
        let select = document.getElementById('cfg_media_url');
        newConfig.media_url = select.value;
        if(select.options.length > 0 && select.selectedIndex > 0) {
            newConfig.type = select.options[select.selectedIndex].getAttribute('data-mtype');
        }
    }

    // Save back to dataset
    el.dataset.config = JSON.stringify(newConfig);

    // Update visual preview
    updateWidgetPreview(currentConfigWidgetId);

    closeConfigModal();
});


// Helper to update the visual representation of the widget in the admin panel
function updateWidgetPreview(id) {
    let el = document.querySelector(`.grid-stack-item[data-id="${id}"]`);
    if (!el) return;

    let type = el.dataset.type;
    let config = JSON.parse(el.dataset.config || '{}');
    let body = el.querySelector('.widget-body');

    if (type === 'clock') {
        body.style.color = config.color || '#000';
        body.innerHTML = `<div><span style="font-size:24px;">12:00:00</span><br><small>${config.format} Clock</small></div>`;
    } else if (type === 'ticker') {
        body.style.color = config.color || '#000';
        body.style.backgroundColor = config.bg || '#fff';
        body.innerHTML = `<marquee scrollamount="5">${config.text || 'Ticker Text'}</marquee>`;
    } else if (type === 'countdown') {
        body.style.color = config.color || '#f00';
        body.innerHTML = `<div><small>${config.text}</small><br><span style="font-size:18px;">00d 00h 00m</span></div>`;
    } else if (type === 'media') {
        if (config.media_url) {
            if (config.type && config.type.startsWith('video')) {
                body.innerHTML = `<video src="${config.media_url}" style="max-width:100%; max-height:100%;" controls></video>`;
            } else {
                body.innerHTML = `<img src="${config.media_url}" style="max-width:100%; max-height:100%; object-fit:contain;">`;
            }
        } else {
            body.innerHTML = `No Media Selected`;
        }
    }
}


// Load Media Gallery
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

// Delete media
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
