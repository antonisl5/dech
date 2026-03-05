<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Digital Signage Player</title>
    <link rel="stylesheet" href="public/css/player.css">
</head>
<body>
    <!-- Full-screen absolute canvas container (16:9 Aspect Ratio) -->
    <div id="player-container" class="grid-container">
        <!-- Screens and Widgets loaded via SSE and JSON -->
    </div>

    <!-- Black overlay for non-working hours to save screen/CPU -->
    <div id="sleep-overlay"></div>

    <!-- Container Queries for fluid responsive text size inside widgets -->
    <style>
        .grid-container {
            position: absolute;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            overflow: hidden;
            background-color: #000; /* Overridden by global settings */
        }

        .screen {
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            /* Hide by default, show when active */
            opacity: 0;
            visibility: hidden;
            z-index: 1;
            /* Container for fluid typography */
            container-type: size;
        }

        .screen.active {
            opacity: 1;
            visibility: visible;
            z-index: 10;
        }

        .widget-item {
            position: absolute;
            box-sizing: border-box;
            /* Allow responsive text */
            container-type: size;
        }

        /* Apply dynamic fluid typography to all text-based widgets */
        .widget-item .content {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10cqi; /* 10% of container width as default */
        }

        #sleep-overlay {
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background-color: #000;
            z-index: 9999;
            display: none; /* Hidden by default */
        }
    </style>

    <script src="public/js/player.js"></script>
</body>
</html>