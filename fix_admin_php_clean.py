import re

with open('admin.php', 'r') as f:
    html = f.read()

# Add button styles back, oops, we stripped them all with style="[^"]*"
html = html.replace('<button type="submit" class="btn btn-primary">', '<button type="submit" class="btn btn-primary" style="margin-top:10px; width: 100%;">')

with open('admin.php', 'w') as f:
    f.write(html)
