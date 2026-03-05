import re

with open('public/js/admin.js', 'r') as f:
    js = f.read()

js = re.sub(
    r"dragInOptions: \{ appendTo: 'body', helper: 'clone' \}",
    r"dragInOptions: { revert: 'invalid', scroll: false, appendTo: 'body', helper: 'clone' }",
    js
)

with open('public/js/admin.js', 'w') as f:
    f.write(js)
