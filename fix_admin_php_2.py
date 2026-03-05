import re

with open('admin.php', 'r') as f:
    html = f.read()

html = re.sub(
    r'<div class="new-widget grid-stack-item"([^>]*)>',
    r'<div class="new-widget grid-stack-item"\1 style="padding: 10px; margin-bottom: 10px; border: 1px solid #ccc; text-align: center; cursor: move; width: 100%; box-sizing: border-box; background: #fff;">',
    html
)

with open('admin.php', 'w') as f:
    f.write(html)
