"""قراءة محادثات الواتساب من ChatStorage.sqlite (قاعدة Core Data في نسخة الآيفون).

الجداول: ZWACHATSESSION (المحادثات)، ZWAMESSAGE (الرسائل)، ZWAMEDIAITEM (الوسائط)،
ZWAGROUPMEMBER (أعضاء المجموعات)، ZWAPROFILEPUSHNAME (الأسماء). الأعمدة تختلف قليلاً بين الإصدارات،
فنقرأ ما هو موجود فقط.
"""
from __future__ import annotations

import sqlite3
from datetime import datetime
from pathlib import Path

DOMAINS = ("AppDomainGroup-group.net.whatsapp.WhatsApp.shared", "AppDomainGroup-group.net.whatsapp.WhatsAppSMB.shared")
APPLE_EPOCH = 978307200   # 2001-01-01

# أنواع الرسائل في ZWAMESSAGE.ZMESSAGETYPE
TEXT, IMAGE, VIDEO, AUDIO, CONTACT, LOCATION, SYSTEM, LINK, DOC = 0, 1, 2, 3, 4, 5, 6, 7, 8
GIF, DELETED, STICKER = 11, 14, 15
KIND = {TEXT: "text", IMAGE: "image", VIDEO: "video", AUDIO: "audio", CONTACT: "contact", LOCATION: "location",
        SYSTEM: "system", LINK: "text", DOC: "doc", GIF: "video", DELETED: "deleted", STICKER: "sticker",
        38: "image", 39: "video", 42: "image", 43: "video"}   # 38/39: «عرض مرة واحدة»


def when(v) -> datetime | None:
    try:
        return datetime.fromtimestamp(float(v) + APPLE_EPOCH) if v is not None else None
    except (TypeError, ValueError, OSError, OverflowError):
        return None


def phone(jid: str | None) -> str:
    j = (jid or "").split("@")[0]
    return ("+" + j) if j.isdigit() else j


class ChatDB:
    def __init__(self, path: Path):
        self.db = sqlite3.connect(str(path), check_same_thread=False)   # نسخة مؤقتة: تُكتب فيها رسائل ملف WAL
        self.db.row_factory = sqlite3.Row
        self.cols = {}
        for t in ("ZWACHATSESSION", "ZWAMESSAGE", "ZWAMEDIAITEM", "ZWAGROUPMEMBER", "ZWAPROFILEPUSHNAME"):
            try:
                self.cols[t] = {r[1] for r in self.db.execute(f"PRAGMA table_info({t})")}
            except sqlite3.DatabaseError:
                self.cols[t] = set()
        if not self.cols["ZWACHATSESSION"] or not self.cols["ZWAMESSAGE"]:
            raise ValueError("ChatStorage.sqlite: not a WhatsApp database")
        self._push = None

    def close(self):
        self.db.close()

    def c(self, table, col, alias):
        """العمود إن وُجد، وإلا NULL (حتى لا يفشل الاستعلام في إصدار آخر من الواتساب)."""
        return f"{alias}.{col}" if col in self.cols[table] else "NULL"

    def push_names(self) -> dict:
        if self._push is None:
            self._push = {}
            if {"ZJID", "ZPUSHNAME"} <= self.cols["ZWAPROFILEPUSHNAME"]:
                for r in self.db.execute("SELECT ZJID, ZPUSHNAME FROM ZWAPROFILEPUSHNAME"):
                    if r[0] and r[1]:
                        self._push[r[0]] = r[1]
        return self._push

    def chats(self) -> list[dict]:
        S, M = "ZWACHATSESSION", "ZWAMESSAGE"
        q = f"""SELECT s.Z_PK id, {self.c(S, 'ZPARTNERNAME', 's')} name, {self.c(S, 'ZCONTACTJID', 's')} jid,
                       {self.c(S, 'ZSESSIONTYPE', 's')} stype, {self.c(S, 'ZLASTMESSAGEDATE', 's')} last,
                       {self.c(S, 'ZREMOVED', 's')} removed,
                       COUNT(m.Z_PK) n,
                       SUM(CASE WHEN m.ZMESSAGETYPE IN (1,38,42) THEN 1 ELSE 0 END) images,
                       SUM(CASE WHEN m.ZMESSAGETYPE IN (2,11,39,43) THEN 1 ELSE 0 END) videos,
                       MIN(m.ZMESSAGEDATE) first_date, MAX(m.ZMESSAGEDATE) last_date
                FROM {S} s LEFT JOIN {M} m ON m.ZCHATSESSION = s.Z_PK
                GROUP BY s.Z_PK"""
        out = []
        for r in self.db.execute(q):
            jid = r["jid"] or ""
            if jid.endswith("status@broadcast") or r["removed"] or not r["n"]:
                continue
            name = (r["name"] or "").strip() or self.push_names().get(jid) or phone(jid) or f"محادثة {r['id']}"
            last = when(r["last_date"] or r["last"])
            first = when(r["first_date"])
            out.append({"id": r["id"], "name": name, "group": jid.endswith("@g.us") or r["stype"] == 1, "messages": r["n"],
                        "images": r["images"] or 0, "videos": r["videos"] or 0,
                        "first": first.isoformat(timespec="minutes") if first else None,
                        "last": last.isoformat(timespec="minutes") if last else None})
        out.sort(key=lambda x: x["last"] or "", reverse=True)
        return out

    def chat(self, chat_id: int) -> dict | None:
        return next((c for c in self.chats() if c["id"] == chat_id), None)

    def messages(self, chat_id: int) -> list[dict]:
        M, I, G = "ZWAMESSAGE", "ZWAMEDIAITEM", "ZWAGROUPMEMBER"
        has_media = bool(self.cols[I]) and "ZMEDIAITEM" in self.cols[M]
        has_group = bool(self.cols[G]) and "ZGROUPMEMBER" in self.cols[M]
        q = f"""SELECT m.Z_PK id, m.ZISFROMME me, m.ZMESSAGEDATE d, m.ZTEXT text, m.ZMESSAGETYPE t,
                       {self.c(M, 'ZFROMJID', 'm')} from_jid, {self.c(M, 'ZPUSHNAME', 'm')} push,
                       {self.c(I, 'ZMEDIALOCALPATH', 'i') if has_media else 'NULL'} path,
                       {self.c(I, 'ZTHUMBNAILLOCALPATH', 'i') if has_media else 'NULL'} thumb,
                       {self.c(I, 'ZTITLE', 'i') if has_media else 'NULL'} title,
                       {self.c(I, 'ZMOVIEDURATION', 'i') if has_media else 'NULL'} duration,
                       {self.c(I, 'ZLATITUDE', 'i') if has_media else 'NULL'} lat,
                       {self.c(I, 'ZLONGITUDE', 'i') if has_media else 'NULL'} lon,
                       {self.c(I, 'ZVCARDNAME', 'i') if has_media else 'NULL'} vcard,
                       {self.c(G, 'ZCONTACTNAME', 'g') if has_group else 'NULL'} gname,
                       {self.c(G, 'ZFIRSTNAME', 'g') if has_group else 'NULL'} gfirst,
                       {self.c(G, 'ZMEMBERJID', 'g') if has_group else 'NULL'} gjid
                FROM {M} m
                {'LEFT JOIN ZWAMEDIAITEM i ON i.Z_PK = m.ZMEDIAITEM' if has_media else ''}
                {'LEFT JOIN ZWAGROUPMEMBER g ON g.Z_PK = m.ZGROUPMEMBER' if has_group else ''}
                WHERE m.ZCHATSESSION = ? ORDER BY m.ZMESSAGEDATE, m.Z_PK"""
        push = self.push_names()
        out = []
        for r in self.db.execute(q, (chat_id,)):
            kind = KIND.get(r["t"], "text" if r["text"] else None)
            if kind is None:
                continue
            sender = ""
            if not r["me"]:
                gj = r["gjid"] or ""
                sender = (r["gname"] or r["gfirst"] or push.get(gj) or r["push"] or (phone(gj) if gj else "")).strip()
            text = r["text"] or ""
            if kind in ("image", "video") and not text:
                text = r["title"] or ""   # تعليق الصورة أو الفيديو
            out.append({"id": r["id"], "me": bool(r["me"]), "when": when(r["d"]), "kind": kind, "text": text,
                        "sender": sender, "path": r["path"], "thumb": r["thumb"], "title": r["title"] or "",
                        "duration": r["duration"], "lat": r["lat"], "lon": r["lon"], "vcard": r["vcard"]})
        return out
