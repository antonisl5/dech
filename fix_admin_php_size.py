import re

with open('admin.php', 'r') as f:
    html = f.read()

html = re.sub(
    r'<div class="new-widget grid-stack-item"',
    r'<div class="new-widget grid-stack-item ui-draggable"',
    html
)

with open('admin.php', 'w') as f:
    f.write(html)
