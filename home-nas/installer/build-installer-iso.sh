#!/bin/bash
# =====================================================================
#  Builds the H.SEF installer ISO: a live Debian 13 system that boots
#  into the H.SEF installer screens and copies itself onto the disk.
#  Everything (H.SEF, TV screen, Wi-Fi/Bluetooth drivers, face models)
#  is inside the ISO: installing needs no internet.
#
#    sudo ./installer/build-installer-iso.sh
#    MIRROR=http://127.0.0.1:8800/debian sudo -E ./installer/build-installer-iso.sh
#
#  Boots on BIOS and UEFI (Secure Boot through Debian's signed shim/GRUB).
# =====================================================================
set -euo pipefail

HERE="$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)"       # home-nas
WORK="${WORK:-$HERE/installer/build}"
MIRROR="${MIRROR:-http://deb.debian.org/debian}"               # used while building
FINAL_MIRROR="http://deb.debian.org/debian"                    # written into the installed system
SUITE=trixie
VERSION=$(python3 -c "import re;print(re.search(r'__version__ = \"(.+?)\"', open('$HERE/homenas/__init__.py').read()).group(1))")
OUT="${OUT:-$HERE/HSEF-$VERSION-Free-Home-Backup-System-amd64.iso}"
ROOT="$WORK/chroot"
ISO="$WORK/iso"
COMP="${COMP:-xz}"

log() { echo -e "\n\033[1;34m[H.SEF ISO]\033[0m $*"; }
[ "$(id -u)" -eq 0 ] || { echo "run as root"; exit 1; }
for t in debootstrap mksquashfs xorriso mkfs.vfat mcopy; do command -v $t >/dev/null || { echo "missing $t (apt install debootstrap squashfs-tools xorriso dosfstools mtools)"; exit 1; }; done

umount_all() { for m in var/cache/apt/archives dev/pts dev proc sys; do umount -l "$ROOT/$m" 2>/dev/null || true; done; }
trap umount_all EXIT

log "Fresh work folder $WORK"
umount_all
rm -rf --one-file-system "$WORK"
mkdir -p "$ROOT" "$ISO"

log "Debian $SUITE base system"
debootstrap --arch=amd64 --variant=minbase --components=main,contrib,non-free,non-free-firmware \
    "$SUITE" "$ROOT" "$MIRROR"

SEC="${MIRROR%/debian}/debian-security"
cat > "$ROOT/etc/apt/sources.list" <<EOF
deb $MIRROR $SUITE main contrib non-free non-free-firmware
deb $MIRROR $SUITE-updates main contrib non-free non-free-firmware
deb $SEC $SUITE-security main contrib non-free non-free-firmware
EOF
echo hsef > "$ROOT/etc/hostname"
printf '127.0.0.1\tlocalhost\n127.0.1.1\thsef\n' > "$ROOT/etc/hosts"
echo 'LANG=C.UTF-8' > "$ROOT/etc/default/locale"
cat > "$ROOT/etc/default/console-setup" <<'EOF'
ACTIVE_CONSOLES="/dev/tty[1-6]"
CHARMAP="UTF-8"
CODESET="Uni2"
FONTFACE="Fixed"
FONTSIZE="8x16"
EOF
cat > "$ROOT/etc/default/keyboard" <<'EOF'
XKBMODEL="pc105"
XKBLAYOUT="us"
EOF
mkdir -p "$ROOT/etc/default"
cat > "$ROOT/etc/default/grub" <<'EOF'
GRUB_DEFAULT=0
GRUB_TIMEOUT=2
GRUB_DISTRIBUTOR="H.SEF"
GRUB_CMDLINE_LINUX_DEFAULT="quiet loglevel=3"
GRUB_CMDLINE_LINUX=""
EOF
# لا تشغّل خدمات أثناء البناء
printf '#!/bin/sh\nexit 101\n' > "$ROOT/usr/sbin/policy-rc.d"; chmod +x "$ROOT/usr/sbin/policy-rc.d"

mount --bind /dev "$ROOT/dev"; mount --bind /dev/pts "$ROOT/dev/pts"
mount -t proc proc "$ROOT/proc"; mount -t sysfs sys "$ROOT/sys"
in_root() { chroot "$ROOT" /usr/bin/env -i PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin HOME=/root \
    DEBIAN_FRONTEND=noninteractive LANG=C.UTF-8 "$@"; }
# مخزن الحزم المحمّلة (يسرّع إعادة البناء)
if [ -n "${APT_CACHE:-}" ]; then mkdir -p "$APT_CACHE"; mount --bind "$APT_CACHE" "$ROOT/var/cache/apt/archives"; fi

log "System packages (kernel, boot loaders, drivers, TV screen)"
in_root apt-get update
in_root apt-get install -y --no-install-recommends \
    linux-image-amd64 live-boot systemd-sysv udev dbus kmod ca-certificates console-setup keyboard-configuration \
    grub-pc-bin grub-efi-amd64-bin grub-efi-amd64-signed shim-signed grub2-common grub-common efibootmgr \
    isolinux syslinux-common \
    parted gdisk dosfstools e2fsprogs mdadm rsync util-linux \
    ifupdown dhcpcd-base iproute2 iputils-ping netbase wpasupplicant iw bluez \
    firmware-linux-free firmware-misc-nonfree firmware-realtek firmware-iwlwifi firmware-atheros \
    firmware-intel-graphics firmware-amd-graphics firmware-intel-sound \
    cage chromium fonts-noto-core fonts-noto-color-emoji pipewire-audio wireplumber pulseaudio-utils wlr-randr \
    python3-opencv usbmuxd libimobiledevice-utils ifuse fuse3 less nano

log "H.SEF"
mkdir -p "$ROOT/opt/homenas-src"
tar -C "$HERE" --exclude=./installer/build --exclude=./iso/build --exclude=./data --exclude=./.venv \
    --exclude='__pycache__' --exclude='*.iso' --exclude=./games -cf - . | tar -C "$ROOT/opt/homenas-src" -xf -
in_root bash /opt/homenas-src/appliance/install.sh --appliance
# شاشة التلفاز جاهزة من البداية
in_root /usr/local/sbin/hsef-extras tv-write --create
in_root systemctl enable hsef-tv.service
in_root systemctl set-default graphical.target

# نماذج تمييز الوجوه (من جهاز البناء، إن توفر الإنترنت)
MODELS="$ROOT/srv/homenas/data/@system/models"
mkdir -p "$MODELS"
python3 - "$MODELS" <<'PY' || echo "warning: face models not downloaded (they can be added later)"
import sys, urllib.request, pathlib
out = pathlib.Path(sys.argv[1])
for name, rel in (("face_detection_yunet_2023mar.onnx", "models/face_detection_yunet/face_detection_yunet_2023mar.onnx"),
                  ("face_recognition_sface_2021dec.onnx", "models/face_recognition_sface/face_recognition_sface_2021dec.onnx")):
    for host in ("https://media.githubusercontent.com/media/opencv/opencv_zoo/main/", "https://github.com/opencv/opencv_zoo/raw/main/"):
        try:
            data = urllib.request.urlopen(host + rel, timeout=120).read()
            if len(data) > 100000:
                (out / name).write_bytes(data); break
        except Exception as e:
            print("model", name, e)
PY
in_root chown -R homenas:homenas /srv/homenas/data

log "Installer"
install -m 755 "$HERE/installer/hsef-installer" "$ROOT/usr/local/sbin/hsef-installer"
UIDIR="$ROOT/usr/local/share/hsef-installer"
mkdir -p "$UIDIR/fonts"
cp -r "$HERE/installer/ui/." "$UIDIR/"
cp "$HERE"/static/fonts/*.woff2 "$UIDIR/fonts/"
cp "$HERE/static/img/icon.svg" "$HERE/static/img/whatsapp-qr.png" "$UIDIR/"
cat > "$ROOT/etc/systemd/system/hsef-installer.service" <<'EOF'
[Unit]
Description=H.SEF installer (only when booted from the H.SEF USB stick)
ConditionKernelCommandLine=hsef_installer
Before=hsef-tv.service

[Service]
ExecStart=/usr/local/sbin/hsef-installer
Restart=always

[Install]
WantedBy=multi-user.target
EOF
in_root systemctl enable hsef-installer.service

log "Clean up"
[ -n "${APT_CACHE:-}" ] && umount "$ROOT/var/cache/apt/archives" || true
rm -f "$ROOT/usr/sbin/policy-rc.d"
cat > "$ROOT/etc/apt/sources.list" <<EOF
deb $FINAL_MIRROR $SUITE main contrib non-free non-free-firmware
deb $FINAL_MIRROR $SUITE-updates main contrib non-free non-free-firmware
deb http://security.debian.org/debian-security $SUITE-security main contrib non-free non-free-firmware
EOF
in_root apt-get clean
rm -rf "$ROOT"/var/lib/apt/lists/* "$ROOT"/tmp/* "$ROOT"/var/log/*.log "$ROOT/opt/homenas-src/installer/build"
: > "$ROOT/etc/machine-id"
in_root update-initramfs -u -k all

log "Boot files"
mkdir -p "$ISO/live" "$ISO/boot/grub" "$ISO/EFI/boot" "$ISO/isolinux" "$ISO/.disk"
cp "$(ls -1 "$ROOT"/boot/vmlinuz-* | tail -1)" "$ISO/live/vmlinuz"
cp "$(ls -1 "$ROOT"/boot/initrd.img-* | tail -1)" "$ISO/live/initrd.img"
echo "H.SEF $VERSION" > "$ISO/.disk/info"
umount_all

log "Compressing the system (this takes a while)"
mksquashfs "$ROOT" "$ISO/live/filesystem.squashfs" -comp "$COMP" -b 1M -noappend -e boot/efi

CREDIT="H.SEF by Hussein Sefrani  -  +32 494 49 94 30  -  Hussein@sefrani.com"
ARGS="boot=live hsef_installer quiet loglevel=3 consoleblank=0"
cat > "$ISO/boot/grub/grub.cfg" <<EOF
set default=0
set timeout=8
set menu_color_normal=white/blue
set menu_color_highlight=black/light-cyan
insmod all_video
insmod gfxterm
terminal_output gfxterm
menuentry 'Install H.SEF $VERSION' {
    linux /live/vmlinuz $ARGS
    initrd /live/initrd.img
}
menuentry 'Install H.SEF (safe graphics)' {
    linux /live/vmlinuz $ARGS nomodeset
    initrd /live/initrd.img
}
menuentry '-- $CREDIT' {
    echo '$CREDIT'
    sleep 5
}
EOF
# UEFI: shim + GRUB موقّعان من Debian (يعمل مع Secure Boot)
cp "$ROOT/usr/lib/shim/shimx64.efi.signed" "$ISO/EFI/boot/bootx64.efi"
cp "$ROOT/usr/lib/grub/x86_64-efi-signed/gcdx64.efi.signed" "$ISO/EFI/boot/grubx64.efi"
EFIIMG="$ISO/boot/grub/efi.img"
dd if=/dev/zero of="$EFIIMG" bs=1M count=10 status=none
mkfs.vfat -n HSEF_EFI "$EFIIMG" >/dev/null
mmd -i "$EFIIMG" ::/EFI ::/EFI/boot
mcopy -i "$EFIIMG" "$ISO/EFI/boot/bootx64.efi" "$ISO/EFI/boot/grubx64.efi" ::/EFI/boot/
# BIOS: isolinux
cp "$ROOT/usr/lib/ISOLINUX/isolinux.bin" "$ISO/isolinux/"
cp "$ROOT"/usr/lib/syslinux/modules/bios/{ldlinux.c32,libcom32.c32,libutil.c32,menu.c32} "$ISO/isolinux/"
cat > "$ISO/isolinux/isolinux.cfg" <<EOF
ui menu.c32
menu title H.SEF $VERSION
timeout 80
label install
  menu label Install H.SEF $VERSION
  kernel /live/vmlinuz
  append initrd=/live/initrd.img $ARGS
label safe
  menu label Install H.SEF (safe graphics)
  kernel /live/vmlinuz
  append initrd=/live/initrd.img $ARGS nomodeset
label credit
  menu label -- $CREDIT
  localboot 0
EOF

log "ISO image"
xorriso -as mkisofs -r -V "HSEF" -o "$OUT" -J -joliet-long -iso-level 3 \
    -isohybrid-mbr "$ROOT/usr/lib/ISOLINUX/isohdpfx.bin" \
    -b isolinux/isolinux.bin -c isolinux/boot.cat -no-emul-boot -boot-load-size 4 -boot-info-table \
    -eltorito-alt-boot -e boot/grub/efi.img -no-emul-boot -isohybrid-gpt-basdat \
    "$ISO"
( cd "$(dirname "$OUT")" && sha256sum "$(basename "$OUT")" > "$(basename "$OUT").sha256" )
ls -lh "$OUT"
log "Done: $OUT"
