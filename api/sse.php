<?php
// Set headers for Server-Sent Events (SSE)
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');

// Turn off output buffering to flush immediately
@ob_end_clean();

// Get the initial timestamp
$trigger_file = __DIR__ . '/../db/sse_trigger.txt';

if (!file_exists($trigger_file)) {
    file_put_contents($trigger_file, time());
}
$last_modified = filemtime($trigger_file);

// Keep connection open for up to 5 minutes to avoid Apache timeout,
// then let client reconnect automatically
$start_time = time();
$timeout = 300; // seconds

while (time() - $start_time < $timeout) {
    clearstatcache();
    $current_modified = filemtime($trigger_file);

    // If file was modified, layout changed!
    if ($current_modified > $last_modified) {
        $last_modified = $current_modified;

        // Push an event to the client
        echo "event: layout_update\n";
        echo "data: {\"timestamp\": " . time() . "}\n\n";

        // Flush buffer immediately
        if (ob_get_level() > 0) {
            ob_flush();
        }
        flush();
    }

    // Ping the client every 15 seconds to keep connection alive
    // and prevent proxy buffering issues
    if (time() % 15 == 0) {
        echo ": keepalive\n\n";
        if (ob_get_level() > 0) ob_flush();
        flush();
    }

    // Sleep for 1 second before checking again to reduce CPU load
    sleep(1);
}

// End of execution. Client's EventSource will auto-reconnect.
?>