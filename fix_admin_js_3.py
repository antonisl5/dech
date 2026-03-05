with open('public/js/admin.js', 'r') as f:
    js = f.read()

# Replace initialization
js = js.replace("""    let grid = GridStack.init({
        cellHeight: 60,
        acceptWidgets: true,
        dragIn: '.new-widget',
        dragInOptions: { revert: 'invalid', scroll: false, appendTo: 'body', helper: 'clone' },
        margin: 5,
        column: 12,
        float: true
    }, '#layoutGrid');

    // Make the new widgets draggable into the grid stack
    GridStack.setupDragIn('.new-widget', { revert: 'invalid', scroll: false, appendTo: 'body', helper: 'clone' });""", """    let grid = GridStack.init({
        cellHeight: 60,
        acceptWidgets: true,
        margin: 5,
        column: 12,
        float: true
    }, '#layoutGrid');

    // Make the new widgets draggable into the grid stack
    GridStack.setupDragIn('.new-widget', { appendTo: 'body', helper: 'clone' });""")

with open('public/js/admin.js', 'w') as f:
    f.write(js)
