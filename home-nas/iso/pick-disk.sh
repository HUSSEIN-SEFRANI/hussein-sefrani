#!/bin/sh
# Runs inside the Debian installer (busybox) before partitioning.
# Picks the internal disk(s) for HomeNAS, skipping the USB stick / DVD holding
# this installer. With "homenas_raid=1" on the boot line it builds a RAID 1
# mirror over the first two disks (system + data are both mirrored).

eligible() {
    for d in $(list-devices disk); do
        n=${d#/dev/}
        [ "$(blkid -o value -s TYPE "$d" 2>/dev/null)" = "iso9660" ] && continue   # the installer itself
        [ "$(cat /sys/block/$n/removable 2>/dev/null)" = "1" ] && continue          # USB sticks, card readers
        sectors=$(cat /sys/block/$n/size 2>/dev/null || echo 0)
        [ "$sectors" -lt 16777216 ] && continue                                      # smaller than 8 GB
        echo "$d"
    done
}
part() { case "$1" in *[0-9]) echo "${1}p$2" ;; *) echo "$1$2" ;; esac; }

disks=$(eligible)
first=$(echo "$disks" | sed -n 1p)
second=$(echo "$disks" | sed -n 2p)
[ -n "$first" ] || first=$(list-devices disk | head -n1)

if grep -q "homenas_raid=1" /proc/cmdline && [ -n "$second" ]; then
    logger -t homenas "RAID 1 install on $first + $second"
    if [ -d /sys/firmware/efi ]; then
        boot='538 538 538 free $iflabel{ gpt } $reusemethod{ } method{ efi } format{ } .'
    else
        boot='1 1 1 free $iflabel{ gpt } $reusemethod{ } method{ biosgrub } .'
    fi
    debconf-set partman-auto/disk "$first $second"
    debconf-set partman-auto/method raid
    debconf-set partman-partitioning/default_label gpt
    debconf-set partman-auto/expert_recipe "homenas-raid :: $boot 8000 1000 -1 raid \$lvmignore{ } method{ raid } . 2048 2048 2048 raid \$lvmignore{ } method{ raid } ."
    debconf-set partman-auto-raid/recipe "1 2 0 ext4 / $(part $first 2)#$(part $second 2) . 1 2 0 swap - $(part $first 3)#$(part $second 3) ."
    debconf-set grub-installer/bootdev "$first $second"
    echo "$first $second" > /tmp/homenas-raid-disks
else
    grep -q "homenas_raid=1" /proc/cmdline && logger -t homenas "RAID requested but only one disk found"
    logger -t homenas "installing on $first"
    debconf-set partman-auto/disk "$first"
    debconf-set grub-installer/bootdev "$first"
fi
