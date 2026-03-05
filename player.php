<?php
// Initialize DB and fetch initial layout state if needed.
// However, since we are using plain JS and SSE, we can do it all from the frontend
// to keep it clean. But having it as .php makes it future-proof.
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Digital Signage Player</title>
    <!-- Use GridStack CSS since we use its layout system (read-only mode) -->
    <link href="https://cdn.jsdelivr.net/npm/gridstack@7.2.3/dist/gridstack.min.css" rel="stylesheet"/>
    <link rel="stylesheet" href="public/css/player.css">
</head>
<body>

    <!-- Container for dynamic widgets -->
    <div class="grid-container">
        <!-- We use grid-stack strictly for display structure -->
        <div class="grid-stack" id="playerGrid"></div>
    </div>

    <!-- No dependencies here for layout execution other than GridStack logic -->
    <script src="https://cdn.jsdelivr.net/npm/gridstack@7.2.3/dist/gridstack-all.js"></script>
    <script src="public/js/player.js"></script>
</body>
</html>