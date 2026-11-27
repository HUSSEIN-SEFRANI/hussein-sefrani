"""AES (FIPS-197) بلغة Python فقط، لفك مفاتيح نسخة الآيفون المشفّرة (RFC 3394 key unwrap).

الملفات الكبيرة تُفك بأمر openssl (أسرع بكثير)؛ هذا للمفاتيح الصغيرة فقط.
"""
from __future__ import annotations


def _xt(a):
    a <<= 1
    return (a ^ 0x11B) & 0xFF if a & 0x100 else a


def _mul(a, b):
    r = 0
    while b:
        if b & 1:
            r ^= a
        a = _xt(a)
        b >>= 1
    return r


def _sbox():
    s = [0] * 256
    p = q = 1
    while True:
        p = p ^ ((p << 1) & 0xFF) ^ (0x1B if p & 0x80 else 0)
        q ^= q << 1
        q ^= q << 2
        q ^= q << 4
        q &= 0xFF
        if q & 0x80:
            q ^= 0x09
        x = q ^ ((q << 1 | q >> 7) & 0xFF) ^ ((q << 2 | q >> 6) & 0xFF) ^ ((q << 3 | q >> 5) & 0xFF) ^ ((q << 4 | q >> 4) & 0xFF)
        s[p] = x ^ 0x63
        if p == 1:
            break
    s[0] = 0x63
    return s


SBOX = _sbox()
INV = [0] * 256
for _i, _v in enumerate(SBOX):
    INV[_v] = _i
RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1B, 0x36, 0x6C, 0xD8, 0xAB, 0x4D]


def expand(key: bytes) -> list[list[int]]:
    nk = len(key) // 4
    if nk not in (4, 6, 8):
        raise ValueError("AES key must be 16/24/32 bytes")
    nr = nk + 6
    w = [list(key[4 * i:4 * i + 4]) for i in range(nk)]
    for i in range(nk, 4 * (nr + 1)):
        t = list(w[i - 1])
        if i % nk == 0:
            t = [SBOX[b] for b in t[1:] + t[:1]]
            t[0] ^= RCON[i // nk - 1]
        elif nk > 6 and i % nk == 4:
            t = [SBOX[b] for b in t]
        w.append([a ^ b for a, b in zip(w[i - nk], t)])
    return [sum(w[4 * r:4 * r + 4], []) for r in range(nr + 1)]


def _add(s, k):
    return [a ^ b for a, b in zip(s, k)]


def encrypt_block(rk, block: bytes) -> bytes:
    s = _add(list(block), rk[0])
    nr = len(rk) - 1
    for r in range(1, nr + 1):
        s = [SBOX[b] for b in s]
        s = [s[(i + 4 * (i % 4)) % 16] for i in range(16)]   # ShiftRows (عمودي)
        if r != nr:
            m = []
            for c in range(4):
                a = s[4 * c:4 * c + 4]
                m += [_mul(a[0], 2) ^ _mul(a[1], 3) ^ a[2] ^ a[3], a[0] ^ _mul(a[1], 2) ^ _mul(a[2], 3) ^ a[3],
                      a[0] ^ a[1] ^ _mul(a[2], 2) ^ _mul(a[3], 3), _mul(a[0], 3) ^ a[1] ^ a[2] ^ _mul(a[3], 2)]
            s = m
        s = _add(s, rk[r])
    return bytes(s)


def decrypt_block(rk, block: bytes) -> bytes:
    nr = len(rk) - 1
    s = _add(list(block), rk[nr])
    for r in range(nr - 1, -1, -1):
        s = [s[(i - 4 * (i % 4)) % 16] for i in range(16)]   # InvShiftRows
        s = [INV[b] for b in s]
        s = _add(s, rk[r])
        if r:
            m = []
            for c in range(4):
                a = s[4 * c:4 * c + 4]
                m += [_mul(a[0], 14) ^ _mul(a[1], 11) ^ _mul(a[2], 13) ^ _mul(a[3], 9),
                      _mul(a[0], 9) ^ _mul(a[1], 14) ^ _mul(a[2], 11) ^ _mul(a[3], 13),
                      _mul(a[0], 13) ^ _mul(a[1], 9) ^ _mul(a[2], 14) ^ _mul(a[3], 11),
                      _mul(a[0], 11) ^ _mul(a[1], 13) ^ _mul(a[2], 9) ^ _mul(a[3], 14)]
            s = m
    return bytes(s)


IV3394 = b"\xa6" * 8


def unwrap(kek: bytes, wrapped: bytes) -> bytes | None:
    """RFC 3394. يرجع None إن كان المفتاح خطأ (كلمة السر غير صحيحة)."""
    if len(wrapped) % 8 or len(wrapped) < 24:
        return None
    rk = expand(kek)
    n = len(wrapped) // 8 - 1
    a = wrapped[:8]
    r = [wrapped[8 * (i + 1):8 * (i + 2)] for i in range(n)]
    for j in range(5, -1, -1):
        for i in range(n, 0, -1):
            t = (n * j + i).to_bytes(8, "big")
            b = decrypt_block(rk, bytes(x ^ y for x, y in zip(a, t)) + r[i - 1])
            a, r[i - 1] = b[:8], b[8:]
    return b"".join(r) if a == IV3394 else None


def wrap(kek: bytes, key: bytes) -> bytes:
    """RFC 3394 (للاختبار: صنع نسخة مشفّرة تجريبية)."""
    rk = expand(kek)
    n = len(key) // 8
    a = IV3394
    r = [key[8 * i:8 * i + 8] for i in range(n)]
    for j in range(6):
        for i in range(1, n + 1):
            b = encrypt_block(rk, a + r[i - 1])
            t = (n * j + i).to_bytes(8, "big")
            a, r[i - 1] = bytes(x ^ y for x, y in zip(b[:8], t)), b[8:]
    return a + b"".join(r)
