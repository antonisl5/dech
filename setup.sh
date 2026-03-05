#!/bin/bash

# Exit on error
set -e

echo "=========================================="
echo " Starting Zero-Knowledge Installation for"
echo " PHP Digital Signage (Canvas Editor)"
echo "=========================================="

# 1. Update system
echo "[1/6] Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. Install required packages
echo "[2/6] Installing Apache, PHP, SQLite, Python3, and utilities..."
# Added python3-flask and python3-flask-cors for the Bambu API microservice
sudo apt-get install -y apache2 php libapache2-mod-php php-sqlite3 sqlite3 unclutter python3 python3-flask python3-flask-cors

# We need the browser to display the signage.
# On newer Debian (Trixie/Bookworm) it's 'chromium', not 'chromium-browser'
if apt-cache show chromium-browser > /dev/null 2>&1; then
    sudo apt-get install -y chromium-browser
else
    sudo apt-get install -y chromium
fi

# 3. Configure Apache and PHP
echo "[3/6] Configuring Apache web server..."

# Remove default index.html
if [ -f /var/www/html/index.html ]; then
    sudo rm /var/www/html/index.html
fi

# Copy project files to web root
PROJECT_DIR=$(pwd)
sudo cp -r $PROJECT_DIR/* /var/www/html/

# Set up database directory and permissions
echo "Setting up SQLite database..."
sudo mkdir -p /var/www/html/db
sudo mkdir -p /var/www/html/public/uploads

# Run the PHP initialization script to create tables
cd /var/www/html
sudo php api/init_db.php

# Crucial: Give Apache (www-data) ownership of the web root so it can write to SQLite and uploads
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 775 /var/www/html

# Enable necessary Apache modules and restart
sudo a2enmod rewrite
sudo systemctl restart apache2

# 4. Configure OS to prevent screen sleep/blanking
echo "[4/6] Configuring display settings to prevent sleep..."

# Determine display server (Wayland vs X11)
if [ -d "/etc/xdg/wayfire" ] || [ -f "/etc/wayfire/wayfire.ini" ]; then
    echo "Detected Wayland (Wayfire). Configuring..."
    mkdir -p ~/.config
    WAYFIRE_CONFIG=~/.config/wayfire.ini
    if [ ! -f "$WAYFIRE_CONFIG" ]; then
        touch "$WAYFIRE_CONFIG"
    fi
    # Disable idle/blanking in wayfire
    if ! grep -q "\[idle\]" "$WAYFIRE_CONFIG"; then
        echo -e "\n[idle]\ndpms_timeout = -1\n" >> "$WAYFIRE_CONFIG"
    fi
else
    echo "Detected X11. Configuring..."
    # Disable screen blanking in lightdm if it exists
    if [ -f /etc/lightdm/lightdm.conf ]; then
        sudo sed -i 's/^#xserver-command=.*/xserver-command=X -s 0 -dpms/' /etc/lightdm/lightdm.conf
    fi
    # Disable screen blanking in X11 user settings
    mkdir -p ~/.config/lxsession/LXDE-pi
    LXSESSION_AUTOSTART=~/.config/lxsession/LXDE-pi/autostart
    if [ ! -f "$LXSESSION_AUTOSTART" ]; then
        touch "$LXSESSION_AUTOSTART"
    fi
    sed -i '/@xscreensaver/d' "$LXSESSION_AUTOSTART"
    if ! grep -q "@xset s off" "$LXSESSION_AUTOSTART"; then
        echo "@xset s off" >> "$LXSESSION_AUTOSTART"
        echo "@xset -dpms" >> "$LXSESSION_AUTOSTART"
        echo "@xset s noblank" >> "$LXSESSION_AUTOSTART"
    fi
fi

# 5. Auto-launch Chromium and Python Microservice on boot
echo "[5/6] Setting up auto-start services..."

# Create a master startup script
STARTUP_SCRIPT=~/.signage_start.sh
cat << 'STARTUP_EOF' > "$STARTUP_SCRIPT"
#!/bin/bash

# Hide cursor
unclutter -idle 0.1 -root &

# Start the Python Bambu API microservice in the background
# We assume the user's updated python script is in the webroot or home dir.
cd /var/www/html && python3 bambu_api.py > /dev/null 2>&1 &

# Launch Chromium in Kiosk mode
# Give Apache a few seconds to ensure it's up, then launch
sleep 5
chromium --kiosk --noerrdialogs --disable-infobars --start-fullscreen http://localhost/player.php
STARTUP_EOF

chmod +x "$STARTUP_SCRIPT"

# Add to wayfire autostart (Wayland)
if [ -d "/etc/xdg/wayfire" ] || [ -f "/etc/wayfire/wayfire.ini" ]; then
    if ! grep -q "signage_start" "$WAYFIRE_CONFIG"; then
        echo -e "\n[autostart]\nsignage = $STARTUP_SCRIPT\n" >> "$WAYFIRE_CONFIG"
    fi
# Add to LXDE autostart (X11)
else
    if ! grep -q ".signage_start.sh" "$LXSESSION_AUTOSTART"; then
        echo "@$STARTUP_SCRIPT" >> "$LXSESSION_AUTOSTART"
    fi
fi

echo "=========================================="
echo " Setup Complete! "
echo " Please reboot the Raspberry Pi to apply display settings and auto-launch the player."
echo " Admin Panel: http://<raspberry-pi-ip>/admin.php"
echo "=========================================="
