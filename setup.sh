#!/bin/bash

# Ensure the script is run as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (e.g., sudo ./setup.sh)"
  exit 1
fi

echo "Starting Digital Signage Installation..."

# 1. Update system
echo "Updating system..."
apt-get update -y
apt-get upgrade -y

# 2. Install Web Server, PHP, SQLite, and utilities
echo "Installing Apache, PHP, SQLite, and utilities..."
# Changed chromium-browser to chromium for newer Debian/Raspberry Pi OS
apt-get install -y apache2 php libapache2-mod-php php-sqlite3 sqlite3 unclutter chromium sed xdotool

# 3. Configure Apache DocumentRoot and PHP settings
echo "Configuring Apache..."
# Increase upload limits in PHP to support 100MB files
PHP_INI=$(find /etc/php -name "php.ini" | grep apache2 | head -n 1)
if [ -f "$PHP_INI" ]; then
    sed -i 's/upload_max_filesize = .*/upload_max_filesize = 100M/' "$PHP_INI"
    sed -i 's/post_max_size = .*/post_max_size = 100M/' "$PHP_INI"
fi

# Enable Apache modules
a2enmod rewrite headers
systemctl restart apache2

# 4. Copy project files and set permissions
echo "Copying files to web directory and setting permissions..."
# Assuming the script is run from the project root
rsync -av --exclude 'setup.sh' --exclude '.git' ./ /var/www/html/

mkdir -p /var/www/html/media
mkdir -p /var/www/html/db

chown -R www-data:www-data /var/www/html
chmod -R 775 /var/www/html/media
chmod -R 775 /var/www/html/db

# 5. Initialize the SQLite database
echo "Initializing database..."
# Run the init_db.php script from command line to create tables if they don't exist
php /var/www/html/api/init_db.php

# 6. Kiosk Mode and Display Settings (Wayland vs X11)
echo "Configuring Kiosk Mode..."

# Determine the primary user (usually 'pi' or the one running sudo)
USER_SUDO=${SUDO_USER:-pi}

# Create a launcher script for Chromium
LAUNCHER="/home/$USER_SUDO/start_kiosk.sh"
cat << 'EOF' > "$LAUNCHER"
#!/bin/bash

# Prevent screen blanking (X11)
xset s noblank
xset s off
xset -dpms

# Hide cursor
unclutter -idle 0.5 -root &

# Start Chromium in kiosk mode (Changed chromium-browser to chromium)
chromium --noerrdialogs --disable-infobars --kiosk http://localhost/player.php
EOF

chmod +x "$LAUNCHER"
chown "$USER_SUDO:$USER_SUDO" "$LAUNCHER"

# Detect display manager / Wayland vs X11
if [ -n "$WAYLAND_DISPLAY" ] || loginctl show-session $(loginctl | awk '/tty/ {print $1}' | head -n 1) -p Type | grep -q wayland; then
    echo "Wayland detected. Configuring Wayfire..."
    # Wayfire configuration for Bookworm/Wayland/Trixie
    WAYFIRE_CONFIG="/home/$USER_SUDO/.config/wayfire.ini"
    mkdir -p "/home/$USER_SUDO/.config"

    # Disable screen blanking in wayfire
    if grep -q "\[idle\]" "$WAYFIRE_CONFIG" 2>/dev/null; then
        sed -i 's/dpms_timeout = .*/dpms_timeout = -1/' "$WAYFIRE_CONFIG"
    else
        echo -e "\n[idle]\ndpms_timeout = -1" >> "$WAYFIRE_CONFIG"
    fi

    # Auto-start launcher
    if grep -q "\[autostart\]" "$WAYFIRE_CONFIG" 2>/dev/null; then
        # Check if kiosk is already there, if not append it
        if ! grep -q "kiosk =" "$WAYFIRE_CONFIG"; then
             echo "kiosk = $LAUNCHER" >> "$WAYFIRE_CONFIG"
        fi
    else
        echo -e "\n[autostart]\nkiosk = $LAUNCHER" >> "$WAYFIRE_CONFIG"
    fi
    chown -R "$USER_SUDO:$USER_SUDO" "/home/$USER_SUDO/.config"

else
    echo "X11 detected. Configuring LXDE/Autostart..."
    # X11 configuration for Bullseye/Buster
    AUTOSTART_DIR="/home/$USER_SUDO/.config/lxsession/LXDE-pi"
    mkdir -p "$AUTOSTART_DIR"
    AUTOSTART_FILE="$AUTOSTART_DIR/autostart"

    cat << EOF > "$AUTOSTART_FILE"
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xset s off
@xset s noblank
@xset -dpms
@unclutter -idle 0.5 -root
@chromium --noerrdialogs --disable-infobars --kiosk http://localhost/player.php
EOF
    chown -R "$USER_SUDO:$USER_SUDO" "/home/$USER_SUDO/.config"
fi

echo "Installation complete! The Raspberry Pi is now configured."
echo "Please REBOOT the Raspberry Pi to start the Digital Signage."
echo "You can access the admin panel at http://<pi-ip-address>/admin.php"
