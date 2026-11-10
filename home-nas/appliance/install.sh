#!/bin/bash
# =====================================================================
#  H.SEF appliance installer
#  Installs H.SEF as a system service on Debian 12/13 or Ubuntu 22.04+.
#
#  Used automatically by the H.SEF ISO, and can also be run by hand:
#      sudo ./appliance/install.sh              # service only
#      sudo ./appliance/install.sh --appliance  # also tune the machine as a dedicated NAS
#  Re-running it upgrades the app and keeps all data and settings.
# =====================================================================
set -euo pipefail

SRC="$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)"
APP=/opt/homenas/app
VENV=/opt/homenas/venv
CONF_DIR=/etc/homenas
CONF=$CONF_DIR/config.json
DATA=${HOMENAS_DATA:-/srv/homenas/data}
PORT=${HOMENAS_PORT:-80}
APPLIANCE=0
[ "${1:-}" = "--appliance" ] && APPLIANCE=1

log() { echo -e "\n\033[1;34m[H.SEF]\033[0m $*"; }
[ "$(id -u)" -eq 0 ] || { echo "Please run as root (sudo)."; exit 1; }
[ -f "$SRC/server.py" ] || { echo "server.py not found next to the installer ($SRC)."; exit 1; }

export DEBIAN_FRONTEND=noninteractive

retry() { local n=0; until "$@"; do n=$((n+1)); [ $n -ge 4 ] && return 1; echo "retrying ($n)..."; sleep $((n*5)); done; }

log "Installing system packages"
PKGS="python3 python3-venv python3-pip ffmpeg avahi-daemon libnss-mdns sudo ca-certificates \
    unattended-upgrades rsync parted e2fsprogs sqlite3 mdadm smartmontools samba minidlna \
    python3-flask python3-waitress python3-pil python3-psutil libheif-examples libheif-plugin-libde265 \
    poppler-utils"
# بدون إنترنت (تحديث من فلاشة): نكمل إذا كانت الحزم الأساسية مثبتة مسبقاً
OFFLINE=0
if ! apt-get update >/dev/null 2>&1; then
    OFFLINE=1
    echo "warning: no internet - using the packages already installed"
fi
if [ "$OFFLINE" -eq 0 ]; then
  retry apt-get install -y --no-install-recommends $PKGS || OFFLINE=1
fi
if [ "$OFFLINE" -eq 1 ]; then
  for p in python3 python3-flask python3-waitress python3-pil sqlite3; do
    dpkg -s "$p" >/dev/null 2>&1 || { echo "Package $p is missing and there is no internet."; exit 1; }
  done
fi

# Windows network discovery (shows H.SEF under "Network" in Explorer)
apt-get install -y --no-install-recommends wsdd2 >/dev/null 2>&1 || apt-get install -y --no-install-recommends wsdd >/dev/null 2>&1 || true

log "Creating service user"
id homenas >/dev/null 2>&1 || useradd --system --home-dir /var/lib/homenas --create-home \
    --shell /usr/sbin/nologin homenas

log "Installing application to $APP"
mkdir -p /opt/homenas
# نسخة جديدة نظيفة من البرنامج (البيانات والإعدادات في أماكن أخرى ولا تتأثر)
if [ "$SRC" != "$APP" ]; then
    mkdir -p "$APP.new"
    tar -C "$SRC" --exclude=./data --exclude=./config.json --exclude=./.venv --exclude='__pycache__' \
        --exclude=./iso/build -cf - . | tar -C "$APP.new" -xf -
    if [ -d "$APP" ]; then mv "$APP" "$APP.old"; fi
    mv "$APP.new" "$APP"
    if [ -d "$APP.old" ]; then rm -rf --one-file-system "$APP.old"; fi
fi
chown -R root:root "$APP"

log "Installing Python libraries"
# Flask, Waitress, Pillow and psutil come from Debian (same mirror as the installer).
# pillow-heif (fast iPhone HEIC support) is the only library from PyPI; if PyPI cannot be
# reached, HEIC photos are still handled by Debian's heif-convert, just a bit slower.
if [ -x "$VENV/bin/python" ] && ! "$VENV/bin/python" -c "import flask" 2>/dev/null; then
    rm -rf --one-file-system "$VENV"
fi
[ -x "$VENV/bin/python" ] || python3 -m venv --system-site-packages "$VENV"
"$VENV/bin/pip" install --disable-pip-version-check -q --timeout 30 pillow-heif \
    || echo "warning: pillow-heif not installed (PyPI unreachable) - using heif-convert for HEIC photos"
"$VENV/bin/python" -c "import flask, waitress, PIL, psutil" || { echo "Python libraries are missing"; exit 1; }

log "Preparing data folder $DATA"
mkdir -p "$DATA" "$CONF_DIR"
chown homenas:homenas "$DATA" "$CONF_DIR"
if [ ! -f "$CONF" ]; then
    SECRET=$(python3 -c 'import secrets; print(secrets.token_hex(32))')
    cat > "$CONF" <<EOF
{
  "host": "0.0.0.0",
  "port": $PORT,
  "data_dir": "$DATA",
  "max_upload_gb": 50,
  "secret_key": "$SECRET"
}
EOF
fi
chown homenas:homenas "$CONF"; chmod 600 "$CONF"

log "Installing system service"
cat > /etc/systemd/system/homenas.service <<EOF
[Unit]
Description=H.SEF home storage server
After=network-online.target
Wants=network-online.target
ConditionKernelCommandLine=!hsef_installer

[Service]
User=homenas
Group=homenas
Environment=HOMENAS_CONFIG=$CONF
Environment=HOMENAS_APPLIANCE=1
Environment=PYTHONUNBUFFERED=1
# '+' = run as root: writes the on-screen banner with the address and setup code
ExecStartPre=+$VENV/bin/python $APP/appliance/banner.py
ExecStart=$VENV/bin/python $APP/server.py
AmbientCapabilities=CAP_NET_BIND_SERVICE
LimitNOFILE=65536
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Let the web panel reboot / power off the machine (and nothing else)
cat > /etc/sudoers.d/homenas <<'EOF'
homenas ALL=(root) NOPASSWD: /usr/bin/systemctl reboot, /usr/bin/systemctl poweroff, /usr/bin/timedatectl set-timezone *, /usr/sbin/smartctl -j -H -A /dev/*, /usr/local/sbin/hsef-net, /usr/local/sbin/hsef-apps, /usr/local/sbin/hsef-extras
EOF
chmod 440 /etc/sudoers.d/homenas
visudo -cf /etc/sudoers.d/homenas >/dev/null

# Announce the web panel on the network (Bonjour / mDNS)
mkdir -p /etc/avahi/services
cat > /etc/avahi/services/homenas.service <<EOF
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name replace-wildcards="yes">H.SEF on %h</name>
  <service><type>_http._tcp</type><port>$PORT</port></service>
</service-group>
EOF

install -m 755 "$APP/appliance/homenas-disk" /usr/local/sbin/homenas-disk
install -m 755 "$APP/appliance/hsef-net" /usr/local/sbin/hsef-net
install -m 755 "$APP/appliance/hsef-apps" /usr/local/sbin/hsef-apps
install -m 755 "$APP/appliance/hsef-extras" /usr/local/sbin/hsef-extras
# App Center: user choices written by the app, logs written by hsef-apps
mkdir -p "$CONF_DIR/apps" /var/lib/homenas/apps /srv/homenas/apps
chown homenas:homenas "$CONF_DIR/apps"

log "Preparing network sharing (SMB) and TV server (DLNA)"
# file written by the web app, applied by hsef-net (root)
[ -f "$CONF_DIR/network.json" ] || echo '{}' > "$CONF_DIR/network.json"
chown homenas:homenas "$CONF_DIR/network.json"
mkdir -p /var/lib/homenas/minidlna /var/lib/homenas/smb-homes
chown homenas:homenas /var/lib/homenas/minidlna
# Debian's own minidlna service is replaced by ours (runs as homenas, our config)
systemctl disable --now minidlna.service >/dev/null 2>&1 || true
cat > /etc/systemd/system/hsef-dlna.service <<EOF
[Unit]
Description=H.SEF TV media server (DLNA)
After=network-online.target
Wants=network-online.target

[Service]
User=homenas
Group=homenas
ExecStart=/usr/sbin/minidlnad -S -f $CONF_DIR/minidlna.conf -P /var/lib/homenas/minidlna/minidlna.pid
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
# SMB stays off until it is enabled from the web panel
if [ ! -f /etc/samba/hsef-usermap ]; then
    systemctl disable --now smbd nmbd >/dev/null 2>&1 || true
fi
cat > /etc/avahi/services/hsef-smb.service <<'EOF'
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name replace-wildcards="yes">%h</name>
  <service><type>_smb._tcp</type><port>445</port></service>
  <service><type>_device-info._tcp</type><port>0</port><txt-record>model=MacSamba</txt-record></service>
</service-group>
EOF

# Automatic security updates
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

if [ "$APPLIANCE" -eq 1 ]; then
    log "Tuning machine as a dedicated NAS"
    # Laptops: keep running with the lid closed. Never sleep.
    mkdir -p /etc/systemd/logind.conf.d
    cat > /etc/systemd/logind.conf.d/homenas.conf <<'EOF'
[Login]
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
HandleSuspendKey=ignore
HandleHibernateKey=ignore
IdleAction=ignore
EOF
    systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target >/dev/null 2>&1 || true
    # Turn the console screen off after 5 minutes (saves power, screen keeps the banner)
    if [ -f /etc/default/grub ] && ! grep -q consoleblank /etc/default/grub; then
        sed -i 's/^GRUB_CMDLINE_LINUX_DEFAULT="\(.*\)"/GRUB_CMDLINE_LINUX_DEFAULT="\1 consoleblank=300"/' /etc/default/grub
        command -v update-grub >/dev/null && update-grub >/dev/null 2>&1 || true
    fi
fi

systemctl daemon-reload 2>/dev/null || true
systemctl enable avahi-daemon.service >/dev/null 2>&1 || true
systemctl enable homenas.service
# داخل بيئة المثبّت لا يعمل systemd؛ الخدمة ستبدأ عند أول إقلاع
if [ -d /run/systemd/system ]; then
    systemctl restart avahi-daemon.service || true
    systemctl restart homenas.service
    sleep 3
    systemctl --no-pager --lines=0 status homenas.service || true
fi

# وضع التلفاز: إن كان مثبّتاً، حدّث خدمته مع البرنامج
if [ -f /etc/systemd/system/hsef-tv.service ] && [ -d /run/systemd/system ]; then
    /usr/local/sbin/hsef-extras tv-write || true
    systemctl try-restart hsef-tv.service || true
fi

touch /opt/homenas/.installed
log "Done. H.SEF will be available at http://$(hostname).local$([ "$PORT" = 80 ] || echo ":$PORT")"
