import re

with open('public/js/admin.js', 'r') as f:
    js = f.read()

# Replace:
#    GridStack.setupDragIn('.new-widget', { appendTo: 'body', helper: 'clone' });
# with:
#    GridStack.setupDragIn('.new-widget', { revert: 'invalid', scroll: false, appendTo: 'body', helper: 'clone' });

js = re.sub(
    r"GridStack.setupDragIn\('.new-widget', { appendTo: 'body', helper: 'clone' }\);",
    r"GridStack.setupDragIn('.new-widget', { revert: 'invalid', scroll: false, appendTo: 'body', helper: 'clone' });",
    js
)

with open('public/js/admin.js', 'w') as f:
    f.write(js)
