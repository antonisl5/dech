import re

with open('admin.php', 'r') as f:
    html = f.read()

# Make sure new-widget items don't have new-widget class which might interfere or are styled weirdly
# Or just ensure they are formatted properly with .grid-stack-item
# It seems gridstack setupDragIn works best if the selector strictly matches and there are no weird css issues.
# Wait, test_drag6 worked! Let's adapt its exact approach to our JS and CSS.
