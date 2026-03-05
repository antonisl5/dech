<?php
require_once 'api/auth.php';
require_login();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Digital Signage Admin</title>
    <link rel="stylesheet" href="public/css/admin.css">
    <!-- Interact.js for drag and resize -->
    <script src="https://cdn.jsdelivr.net/npm/interactjs/dist/interact.min.js"></script>
    <style>
        /* Specific overrides to allow absolute positioning inside the admin wrapper */
        .grid-container {
            position: relative;
            width: 100%;
            height: 100%;
            background-color: #000; /* Fallback, overridden by JS */
            overflow: hidden;
            /* Container queries for responsive scaling inside canvas */
            container-type: size;
            container-name: canvas;
        }

        .widget-item {
            position: absolute;
            box-sizing: border-box;
            background-color: rgba(255, 255, 255, 0.1);
            border: 1px dashed #666;
            touch-action: none; /* Required for interact.js */
            /* Container queries for widgets */
            container-type: size;
        }

        .widget-item.is-selected {
            border: 2px solid #007bff;
        }

        .resize-handle {
            position: absolute;
            width: 10px;
            height: 10px;
            background-color: #007bff;
            bottom: -5px;
            right: -5px;
            cursor: se-resize;
            border-radius: 50%;
        }

        /* Prevent contents from capturing drag events */
        .widget-item .content {
            width: 100%;
            height: 100%;
            pointer-events: none;
            overflow: hidden;
        }

        /* New Global Background Setting in sidebar */
        .global-settings {
            margin-bottom: 20px;
            padding: 10px;
            background: #2a2a2a;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Digital Signage Admin (Canvas Editor)</h1>
        <div>
            <button id="save-layout-btn" class="btn btn-primary">Save Layout</button>
            <a href="logout.php" class="btn btn-danger" style="text-decoration: none;">Logout</a>
        </div>
    </div>

    <div class="admin-layout">
        <div class="sidebar">
            <div class="global-settings">
                <h3>Canvas Settings</h3>
                <div class="form-group">
                    <label for="global-bg-color">Global Background Color</label>
                    <input type="color" id="global-bg-color" class="form-control" value="#000000">
                </div>
            </div>

            <h3>Available Widgets</h3>
            <p style="font-size: 0.9em; color: #aaa;">Click a widget to add it to the canvas, then drag and resize.</p>
            <div id="widget-list">
                <div class="new-widget" data-type="clock">
                    <div class="widget-icon">⏰</div> Clock
                </div>
                <div class="new-widget" data-type="media">
                    <div class="widget-icon">🖼️</div> Media
                </div>
                <div class="new-widget" data-type="ticker">
                    <div class="widget-icon">📜</div> Ticker
                </div>
                <div class="new-widget" data-type="countdown">
                    <div class="widget-icon">⏱️</div> Countdown
                </div>
                <div class="new-widget" data-type="youtube">
                    <div class="widget-icon" style="color: red; background: white; border-radius: 4px; font-weight: bold; font-family: sans-serif; display: inline-flex; justify-content: center; align-items: center; width: 24px; height: 24px;">▶</div> YouTube
                </div>
                <div class="new-widget" data-type="shape">
                    <div class="widget-icon">🟦</div> Basic Shape
                </div>
                <div class="new-widget" data-type="freetext">
                    <div class="widget-icon">T</div> Free Text
                </div>
                <div class="new-widget" data-type="bambu">
                    <div class="widget-icon">🖨️</div> 3D Printer (Bambu)
                </div>
            </div>

            <div style="margin-top: 30px;">
                <h3>Media Library</h3>
                <form id="upload-form" enctype="multipart/form-data">
                    <input type="file" id="media-file" name="file" accept="image/*,video/*" required>
                    <button type="submit" class="btn btn-secondary" style="margin-top: 5px; width: 100%;">Upload Media</button>
                </form>
                <div id="upload-status"></div>
                <div id="media-library" class="media-library-grid">
                    <!-- Media items loaded via JS -->
                </div>
            </div>
        </div>

        <div class="main-content">
            <!-- Strict 16:9 Aspect Ratio Container Wrapper -->
            <div class="aspect-ratio-wrapper">
                <div class="grid-container" id="canvas-container">
                    <!-- Widgets placed here via interact.js -->
                </div>
            </div>
        </div>
    </div>

    <!-- Configuration Modal -->
    <div id="config-modal" class="modal">
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h2 id="modal-title">Configure Widget</h2>
            <form id="config-form">
                <input type="hidden" id="config-widget-id">
                <div id="config-fields">
                    <!-- Dynamic fields injected here -->
                </div>

                <hr style="margin: 20px 0; border: 0; border-top: 1px solid #444;">
                <h3>Layering (Z-Index)</h3>
                <div class="form-group" style="display: flex; gap: 10px;">
                    <button type="button" class="btn btn-secondary" id="btn-bring-forward">Bring Forward</button>
                    <button type="button" class="btn btn-secondary" id="btn-send-backward">Send Backward</button>
                </div>
                <div class="form-group">
                    <label for="config-z-index">Z-Index Value (Higher is in front)</label>
                    <input type="number" id="config-z-index" class="form-control" value="1">
                </div>

                <hr style="margin: 20px 0; border: 0; border-top: 1px solid #444;">
                <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                    <button type="button" id="delete-widget-btn" class="btn btn-danger">Remove Widget</button>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
            </form>
        </div>
    </div>

    <script src="public/js/admin.js"></script>
</body>
</html>
