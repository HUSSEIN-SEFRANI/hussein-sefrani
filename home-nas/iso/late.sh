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

# RAID 1 + UEFI: copy the EFI boot partition to the second disk so the
# machine still boots if the first disk dies.
if [ -f /tmp/homenas-raid-disks ] && [ -d /sys/firmware/efi ]; then
    set -- $(cat /tmp/homenas-raid-disks)
    case "$1" in *[0-9]) a="${1}p1" ;; *) a="${1}1" ;; esac
    case "$2" in *[0-9]) b="${2}p1" ;; *) b="${2}1" ;; esac
    [ -b "$a" ] && [ -b "$b" ] && dd if="$a" of="$b" bs=1M 2>/dev/null
fi
if [ -f /tmp/homenas-raid-disks ]; then
    # boot even when one disk of the mirror is missing
    echo "BOOT_DEGRADED=true" > /target/etc/initramfs-tools/conf.d/mdadm
    in-target update-initramfs -u || true
fi
exit 0
