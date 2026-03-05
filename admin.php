<?php
require_once 'api/auth.php';
require_login();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Digital Signage - Admin Panel</title>
    <!-- GridStack.js CSS -->
    <link href="https://cdn.jsdelivr.net/npm/gridstack@7.2.3/dist/gridstack.min.css" rel="stylesheet"/>
    <link rel="stylesheet" href="public/css/admin.css">
</head>
<body>

    <header>
        <h1>Digital Signage Admin Panel</h1>
        <div>
            <span class="user-greeting">Welcome, <?php echo htmlspecialchars($_SESSION['username']); ?></span>
            <a href="logout.php" class="btn btn-logout">Logout</a>
        </div>
    </header>

    <div class="main-container">
        <!-- Sidebar: Widgets & Media -->
        <aside class="sidebar">
            <div class="sidebar-section">
                <h2>Widgets</h2>
                <p>Drag widgets onto the layout.</p>
                <div class="widget-list">
                    <!-- The class "grid-stack-item" makes it draggable into gridstack -->
                    <div class="new-widget grid-stack-item ui-draggable" data-type="clock" gs-w="2" gs-h="2">
                        <div class="grid-stack-item-content">
                            <div class="widget-icon">🕒</div>
                            <span>Digital Clock</span>
                        </div>
                    </div>
                    <div class="new-widget grid-stack-item ui-draggable" data-type="media" gs-w="4" gs-h="3">
                        <div class="grid-stack-item-content">
                            <div class="widget-icon">🖼️</div>
                            <span>Media Viewer</span>
                        </div>
                    </div>
                    <div class="new-widget grid-stack-item ui-draggable" data-type="ticker" gs-w="12" gs-h="1">
                        <div class="grid-stack-item-content">
                            <div class="widget-icon">📜</div>
                            <span>Text Ticker</span>
                        </div>
                    </div>
                    <div class="new-widget grid-stack-item ui-draggable" data-type="countdown" gs-w="2" gs-h="2">
                        <div class="grid-stack-item-content">
                            <div class="widget-icon">⏳</div>
                            <span>Countdown</span>
                        </div>
                    </div>
                    <div class="new-widget grid-stack-item ui-draggable" data-type="youtube" gs-w="6" gs-h="4" style="padding: 10px; margin-bottom: 10px; border: 1px solid #ccc; text-align: center; cursor: move; width: 100%; box-sizing: border-box; background: #fff;">
                        <div class="grid-stack-item-content">
                            <div class="widget-icon">▶️</div>
                            <span>YouTube</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="sidebar-section">
                <h2>Media Library</h2>
                <form id="uploadForm" enctype="multipart/form-data">
                    <input type="file" id="mediaFile" name="file" accept="image/*,video/*" required>
                    <button type="submit" class="btn btn-primary" style="margin-top:10px; width: 100%;">Upload Media</button>
                    <div id="uploadStatus"></div>
                </form>

                <div class="media-gallery" id="mediaGallery">
                    <!-- Media items will be loaded here dynamically -->
                    <p class="loading">Loading media...</p>
                </div>
            </div>

            <div class="sidebar-section actions">
                 <button id="saveLayoutBtn" class="btn btn-success">Save Layout</button>
                 <span id="saveStatus"></span>
            </div>
        </aside>

        <!-- Canvas: Drag and Drop Area -->
        <main class="canvas-area">
            <div class="canvas-header">
                <h2>Screen Layout (16:9)</h2>
                <p>Configure widgets by clicking their settings gear.</p>
            </div>
            <div class="grid-container">
                <div class="grid-stack" id="layoutGrid"></div>
            </div>
        </main>
    </div>

    <!-- Configuration Modal -->
    <div id="configModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="modalTitle">Configure Widget</h3>
                <span class="close-modal">&times;</span>
            </div>
            <div class="modal-body" id="modalBody">
                <!-- Dynamic config form injected here -->
            </div>
            <div class="modal-footer">
                <button class="btn" id="cancelConfigBtn">Cancel</button>
                <button class="btn btn-primary" id="saveConfigBtn">Apply</button>
            </div>
        </div>
    </div>

    <!-- GridStack.js Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/gridstack@7.2.3/dist/gridstack-all.js"></script>
    <script src="public/js/admin.js"></script>
</body>
</html>