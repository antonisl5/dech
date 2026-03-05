with open('public/css/admin.css', 'r') as f:
    css = f.read()

# Make sure new-widget displays properly with grid-stack-item-content
if '.new-widget .grid-stack-item-content' not in css:
    css += """
.new-widget .grid-stack-item-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
}
"""
    with open('public/css/admin.css', 'w') as f:
        f.write(css)
