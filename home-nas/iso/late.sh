#!/bin/sh
# Runs at the end of the Debian installer. Copies HomeNAS into the new system,
# installs it, and adds a first-boot service that finishes the job if the
# installation could not complete now (for example, no internet for pip).
set -x
mkdir -p /target/opt
cp -a /homenas/app /target/opt/homenas-src
cp /homenas/app/appliance/homenas-firstboot.service /target/etc/systemd/system/
in-target systemctl enable homenas-firstboot.service
in-target sh -c 'bash /opt/homenas-src/appliance/install.sh --appliance > /var/log/homenas-install.log 2>&1' || true
in-target chage -d 0 nasadmin || true
exit 0
