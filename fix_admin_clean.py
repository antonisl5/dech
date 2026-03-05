import re

with open('admin.php', 'r') as f:
    html = f.read()

# Remove inline styles
html = re.sub(r' style="[^"]*"', '', html)

with open('admin.php', 'w') as f:
    f.write(html)
