#!/bin/sh
# Runs inside the Debian installer (busybox). Picks the disk to install HomeNAS on:
# the first internal disk that is not the USB stick / DVD holding this installer.
best=""
for d in $(list-devices disk); do
    n=${d#/dev/}
    [ "$(blkid -o value -s TYPE "$d" 2>/dev/null)" = "iso9660" ] && continue   # the installer itself
    [ "$(cat /sys/block/$n/removable 2>/dev/null)" = "1" ] && continue          # USB sticks, card readers
    sectors=$(cat /sys/block/$n/size 2>/dev/null || echo 0)
    [ "$sectors" -lt 16777216 ] && continue                                      # smaller than 8 GB
    best=$d
    break
done
[ -n "$best" ] || best=$(list-devices disk | head -n1)
logger -t homenas "installing on $best"
debconf-set partman-auto/disk "$best"
debconf-set grub-installer/bootdev "$best"
