import re

with open('public/js/admin.js', 'r') as f:
    content = f.read()

# Replace new-widget markup and GridStack config
# In GridStack 7.x, elements to be dragged in must have grid-stack-item class
# and they need gs-w and gs-h attributes.
with open('admin.php', 'r') as f:
    admin_php = f.read()

admin_php = admin_php.replace(
    'class="new-widget" data-type="clock"',
    'class="new-widget grid-stack-item" data-type="clock" gs-w="2" gs-h="2"'
)
admin_php = admin_php.replace(
    'class="new-widget" data-type="media"',
    'class="new-widget grid-stack-item" data-type="media" gs-w="4" gs-h="3"'
)
admin_php = admin_php.replace(
    'class="new-widget" data-type="ticker"',
    'class="new-widget grid-stack-item" data-type="ticker" gs-w="12" gs-h="1"'
)
admin_php = admin_php.replace(
    'class="new-widget" data-type="countdown"',
    'class="new-widget grid-stack-item" data-type="countdown" gs-w="2" gs-h="2"'
)

# And inside new-widget, we need grid-stack-item-content wrapper
admin_php = re.sub(
    r'(<div class="new-widget grid-stack-item"[^>]*>)\s*(<div class="widget-icon">.*?</div>)\s*(<span>.*?</span>)\s*</div>',
    r'\1\n                        <div class="grid-stack-item-content">\n                            \2\n                            \3\n                        </div>\n                    </div>',
    admin_php,
    flags=re.DOTALL
)

with open('admin.php', 'w') as f:
    f.write(admin_php)
