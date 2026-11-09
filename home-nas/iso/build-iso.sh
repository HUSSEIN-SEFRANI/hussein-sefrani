#!/bin/bash
# =====================================================================
#  Build the HomeNAS installer ISO from an official Debian installer ISO.
#
#    ./iso/build-iso.sh                         # downloads the latest Debian netinst
#    ./iso/build-iso.sh path/to/debian.iso      # use an ISO you already have
#    ./iso/build-iso.sh debian.iso out.iso      # choose the output name
#
#  Works with the Debian netinst ISO (recommended: includes network firmware)
#  and with the small netboot mini.iso. Requires: xorriso, cpio, gzip, curl.
#
#  How it works: the answers file (preseed.cfg) and the HomeNAS application are
#  appended to the installer's initrd as an extra cpio archive, and the boot
#  menus (BIOS + UEFI) are replaced with a single "Install HomeNAS" entry.
#  The original Debian boot records are replayed unchanged.
# =====================================================================
set -euo pipefail

HERE="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
APPDIR="$(cd "$HERE/.." && pwd)"
WORK="$HERE/build"
SRC_ISO=${1:-}
DEBIAN_CD=${DEBIAN_CD:-https://cdimage.debian.org/debian-cd/current/amd64/iso-cd}

for t in xorriso cpio gzip; do command -v $t >/dev/null || { echo "missing tool: $t (apt install xorriso cpio)"; exit 1; }; done

mkdir -p "$WORK"
if [ -z "$SRC_ISO" ]; then
    echo ">> Looking up the latest Debian netinst ISO"
    sums=$(curl -fsSL "$DEBIAN_CD/SHA256SUMS")
    name=$(echo "$sums" | awk '{print $2}' | grep -E '^debian-[0-9.]+-amd64-netinst\.iso$' | head -n1)
    [ -n "$name" ] || { echo "could not find the netinst ISO in $DEBIAN_CD"; exit 1; }
    SRC_ISO="$WORK/$name"
    if [ ! -f "$SRC_ISO" ]; then
        echo ">> Downloading $name"
        curl -fL --retry 3 -o "$SRC_ISO.part" "$DEBIAN_CD/$name"
        mv "$SRC_ISO.part" "$SRC_ISO"
    fi
    echo "$sums" | grep " $name\$" | sed "s# $name\$# $SRC_ISO#" | sha256sum -c -
fi
[ -f "$SRC_ISO" ] || { echo "ISO not found: $SRC_ISO"; exit 1; }

VERSION=$(cd "$APPDIR" && python3 -c "import re;print(re.search(r'__version__ = \"(.+?)\"', open('homenas/__init__.py').read()).group(1))")
DEB=$(basename "$SRC_ISO" .iso | sed -E 's/^debian-([0-9.]+).*/\1/;t;s/.*/debian/')
OUT=${2:-"$APPDIR/HomeNAS-$VERSION-debian-$DEB-amd64.iso"}

echo ">> Inspecting $(basename "$SRC_ISO")"
files=$(xorriso -indev "$SRC_ISO" -find / -type f 2>/dev/null | tr -d "'")
if echo "$files" | grep -qx /install.amd/vmlinuz; then
    KERNEL=/install.amd/vmlinuz; INITRD=/install.amd/initrd.gz; ISOLINUX_DIR=/isolinux       # netinst / DVD
elif echo "$files" | grep -qx /linux; then
    KERNEL=/linux; INITRD=/initrd.gz; ISOLINUX_DIR=""                                          # netboot mini.iso
else
    echo "unsupported ISO layout"; exit 1
fi
HAS_ISOLINUX=0; echo "$files" | grep -qx "$ISOLINUX_DIR/isolinux.cfg" && HAS_ISOLINUX=1

STAGE="$WORK/stage"; rm -rf --one-file-system "$STAGE"; mkdir -p "$STAGE/payload/homenas/app" "$STAGE/iso/homenas"

echo ">> Packing HomeNAS $VERSION into the installer"
tar -C "$APPDIR" --exclude=./data --exclude=./config.json --exclude=./.venv --exclude='__pycache__' \
    --exclude=./iso --exclude='*.iso' -cf - . | tar -C "$STAGE/payload/homenas/app" -xf -
cp "$HERE/preseed.cfg" "$STAGE/payload/preseed.cfg"
[ -n "${EXTRA_PRESEED:-}" ] && cat "$EXTRA_PRESEED" >> "$STAGE/payload/preseed.cfg"   # used by tests
cp "$HERE/pick-disk.sh" "$HERE/late.sh" "$STAGE/payload/homenas/"
chmod +x "$STAGE/payload/homenas/"*.sh

xorriso -osirrox on -indev "$SRC_ISO" -extract "$INITRD" "$STAGE/initrd.orig.gz" >/dev/null 2>&1
chmod u+w "$STAGE/initrd.orig.gz"
( cd "$STAGE/payload" && find . | cpio -o -H newc --quiet | gzip -9 ) > "$STAGE/extra.cpio.gz"
cat "$STAGE/initrd.orig.gz" "$STAGE/extra.cpio.gz" > "$STAGE/iso/homenas/initrd.gz"

ARGS="auto=true priority=critical vga=788 --- quiet"

# ---- UEFI (GRUB) menu
cat > "$STAGE/grub.cfg" <<EOF
if loadfont \$prefix/font.pf2 ; then
  set gfxmode=800x600
  set gfxpayload=keep
  insmod efi_gop
  insmod efi_uga
  insmod video_bochs
  insmod video_cirrus
  insmod gfxterm
  terminal_output gfxterm
fi
set menu_color_normal=white/blue
set menu_color_highlight=black/light-cyan
set default=0
set timeout=-1

menuentry 'Install HomeNAS  (ERASES the computer disk)' {
    linux  $KERNEL $ARGS
    initrd /homenas/initrd.gz
}
menuentry 'Install HomeNAS with RAID 1 mirror  (2 disks, ERASES both)' {
    linux  $KERNEL homenas_raid=1 $ARGS
    initrd /homenas/initrd.gz
}
menuentry 'Standard Debian installer (manual)' {
    linux  $KERNEL vga=788 --- quiet
    initrd $INITRD
}
EOF

# ---- BIOS (isolinux) menu
cat > "$STAGE/isolinux.cfg" <<EOF
path
prompt 1
timeout 0
default homenas
display homenas.msg
label homenas
  kernel $KERNEL
  append initrd=/homenas/initrd.gz $ARGS
label raid
  kernel $KERNEL
  append initrd=/homenas/initrd.gz homenas_raid=1 $ARGS
label debian
  kernel $KERNEL
  append initrd=$INITRD vga=788 --- quiet
EOF
cat > "$STAGE/homenas.msg" <<'EOF'


        =====================================================
                       HomeNAS  installer
        =====================================================

         This installs HomeNAS on this computer and ERASES
         its internal disk. Keep the network cable plugged in.

           Press  ENTER  to install HomeNAS on one disk
           Type   raid    then ENTER to mirror two disks (RAID 1)
           Type   debian  then ENTER for the normal Debian installer

        =====================================================

EOF

echo ">> Writing $(basename "$OUT")"
rm -f "$OUT"
MAP=(-map "$STAGE/iso/homenas" /homenas -map "$STAGE/grub.cfg" /boot/grub/grub.cfg)
if [ "$HAS_ISOLINUX" = 1 ]; then
    MAP+=(-map "$STAGE/isolinux.cfg" "$ISOLINUX_DIR/isolinux.cfg" -map "$STAGE/homenas.msg" "$ISOLINUX_DIR/homenas.msg")
fi
xorriso -indev "$SRC_ISO" -outdev "$OUT" \
    "${MAP[@]}" -boot_image any replay -compliance no_emul_toc >/dev/null 2>&1 || {
    echo "xorriso failed, re-running with output:"; xorriso -indev "$SRC_ISO" -outdev "$OUT" \
    "${MAP[@]}" -boot_image any replay; exit 1; }

( cd "$(dirname "$OUT")" && sha256sum "$(basename "$OUT")" > "$(basename "$OUT").sha256" )
echo
echo "Done: $OUT ($(du -h "$OUT" | cut -f1))"
echo "Write it to a USB stick with balenaEtcher or Rufus (DD mode), or burn it to a DVD."
