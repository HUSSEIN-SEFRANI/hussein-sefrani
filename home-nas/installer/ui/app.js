// شاشات تنصيب HOME ANAB — تُعرض بملء الشاشة من الفلاشة. الأسهم و Enter أو الفأرة.
(function () {
  "use strict";
  const T = {
    ar: {
      setup: "تنصيب النظام", overall: "التقدم الكلي", eta: "الوقت المتبقي: حوالي {n} دقائق", eta1: "أقل من دقيقة",
      steps: ["الترحيب واللغة", "الشبكة والوايفاي", "اختيار القرص", "تجهيز القرص", "نسخ النظام", "تثبيت إعدادات HOME ANAB", "محمّل الإقلاع"],
      now: "جارٍ الآن…", stopped: "توقف هنا",
      w_h: "أهلاً بك في HOME ANAB", w_p: "سنحوّل هذا الكمبيوتر إلى خزنة منزلية لصورك وملفاتك، مع شاشة تلفاز للعائلة. التنصيب تلقائي ويأخذ من 5 إلى 15 دقيقة.",
      lang: "اختر لغة النظام", offline: "كل البرامج داخل الفلاشة: لا حاجة للإنترنت", next: "التالي", keys: "الأسهم و Enter، أو الفأرة",
      d_h: "أين نثبّت النظام؟", d_p: "هذه الأقراص الموجودة في الجهاز. الفلاشة التي تقلع منها مخفية حتى لا تُمسح.",
      chosen: "مُختار", raid: "استخدم قرصين كمرآة (RAID 1): كل ملف يُحفظ على القرصين", raid2: "اختر القرص الثاني للمرآة",
      warn: "سيُمسح كل ما على القرص المختار. تأكد أنه لا يحتوي ملفات تحتاجها.", go: "امسح القرص وابدأ التثبيت", sure: "اضغط مرة أخرى للتأكيد",
      back: "رجوع", nodisk: "لم يُعثر على قرص صالح (8 غيغابايت أو أكثر). تأكد من تركيب القرص.", ssd: "قرص SSD", hdd: "قرص صلب", nvme: "قرص NVMe", usb: "قرص USB",
      i_top: "يمكنك ترك الجهاز الآن، سيكمل وحده", did: "هل تعلم؟",
      done_h: "تم التثبيت بنجاح!", done_p: "اسحب الفلاشة الآن. سيعيد الجهاز التشغيل خلال {n} ثانية.", open: "افتح من هاتفك أو كمبيوترك",
      code: "رمز الإعداد سرّي", code2: "اطلبه من المطوّر عبر واتساب", reboot: "إعادة التشغيل الآن", tv: "إن وصلت تلفازاً تظهر عليه شاشة HOME ANAB بعد الإقلاع",
      e_h: "توقف التثبيت", e_disk: "القرص لا يستجيب للقراءة. غالباً هو مقفول بكلمة مرور، أو كابله غير مثبت، أو معطوب.",
      e_space: "لا توجد مساحة كافية على القرص.", e_other: "حدثت مشكلة أثناء التثبيت.",
      fix: ["تأكد من تركيب القرص وكابله جيداً.", "أزل كلمة مرور القرص من إعدادات BIOS إن وُجدت.", "جرّب قرصاً آخر."],
      retry: "إعادة المحاولة", off: "إيقاف الجهاز", photo: "صوّر هذه الشاشة وأرسلها إن احتجت مساعدة",
      n_h: "الاتصال بشبكة البيت", n_p: "وصّل كابل الشبكة بالراوتر، أو اختر شبكة الوايفاي. يبقى الجهاز متصلاً بها بعد التثبيت.",
      cable: "الكابل", cable_off: "غير موصول", getting: "جارٍ أخذ عنوان…", wifi: "الوايفاي", wifi_off: "غير متصل", wifi_none: "لا توجد بطاقة وايفاي في هذا الجهاز",
      nets: "شبكات الوايفاي القريبة: اختر شبكتك", scanning: "جارٍ البحث عن الشبكات…", nonets: "لم نجد شبكات. اقترب من الراوتر واضغط «بحث من جديد».",
      rescan: "بحث من جديد", skip: "تخطَّ (لاحقاً من الإعدادات)", nowifi: "يمكنك المتابعة بالكابل، أو تركيب بطاقة وايفاي لاحقاً.",
      pw: "كلمة مرور {n}", pw2: "اكتبها بلوحة المفاتيح. إن ظهرت أحرف غير التي تكتبها غيّر نوع لوحة المفاتيح.", show: "إظهار", hide: "إخفاء", kb: "لوحة المفاتيح:",
      connect: "اتصل", connecting: "جارٍ الاتصال… قد يأخذ نصف دقيقة", open_net: "شبكة مفتوحة بلا كلمة مرور",
      ok_w: "تم الاتصال بشبكة {n}. سيتصل الجهاز بها وحده بعد التثبيت.", e_auth: "لم ينجح الاتصال. تأكد من كلمة المرور (الأحرف الكبيرة والصغيرة)، أو اقترب من الراوتر.",
      e_dhcp: "اتصل بالشبكة لكن الراوتر لم يعطِ عنواناً. أعد المحاولة بعد قليل.", e_driver: "بطاقة الوايفاي لا تعمل مع هذا النظام. استعمل الكابل.",
      e_noadapter: "لا توجد بطاقة وايفاي.", e_psk: "كلمة المرور من 8 أحرف على الأقل.", ip_or: "أو بالعنوان", same_net: "هاتفك يجب أن يكون على شبكة البيت نفسها",
    },
    en: {
      setup: "System setup", overall: "Overall progress", eta: "Time left: about {n} minutes", eta1: "Less than a minute",
      steps: ["Welcome & language", "Network & Wi-Fi", "Choose disk", "Prepare disk", "Copy system", "Configure HOME ANAB", "Boot loader"],
      now: "In progress…", stopped: "Stopped here",
      w_h: "Welcome to HOME ANAB", w_p: "We will turn this computer into a home vault for your photos and files, with a TV screen for the family. Setup is automatic and takes 5 to 15 minutes.",
      lang: "Choose the system language", offline: "Everything is on the USB stick: no internet needed", next: "Next", keys: "Arrows and Enter, or the mouse",
      d_h: "Where should we install?", d_p: "These are the disks in this computer. The USB stick you booted from is hidden so it is not erased.",
      chosen: "Selected", raid: "Use two disks as a mirror (RAID 1): every file is kept on both", raid2: "Choose the second disk for the mirror",
      warn: "Everything on the selected disk will be erased. Make sure it holds nothing you need.", go: "Erase the disk and install", sure: "Press again to confirm",
      back: "Back", nodisk: "No suitable disk found (8 GB or more). Check that the disk is connected.", ssd: "SSD", hdd: "Hard disk", nvme: "NVMe disk", usb: "USB disk",
      i_top: "You can leave the computer now, it finishes by itself", did: "Did you know?",
      done_h: "Installation complete!", done_p: "Remove the USB stick now. The computer restarts in {n} seconds.", open: "Open from your phone or computer",
      code: "The setup code is private", code2: "Ask the developer on WhatsApp", reboot: "Restart now", tv: "If a TV is connected, it shows the HOME ANAB screen after restart",
      e_h: "Installation stopped", e_disk: "The disk does not respond. It may be password-locked, badly connected or faulty.",
      e_space: "Not enough space on the disk.", e_other: "Something went wrong during installation.",
      fix: ["Check the disk and its cable.", "Remove a disk password in the BIOS settings if there is one.", "Try another disk."],
      retry: "Try again", off: "Power off", photo: "Take a photo of this screen if you need help",
      n_h: "Connect to your home network", n_p: "Plug a network cable into the router, or choose your Wi-Fi. The server stays connected to it after setup.",
      cable: "Cable", cable_off: "Not plugged in", getting: "Getting an address…", wifi: "Wi-Fi", wifi_off: "Not connected", wifi_none: "This computer has no Wi-Fi card",
      nets: "Nearby Wi-Fi networks: choose yours", scanning: "Looking for networks…", nonets: "No networks found. Move closer to the router and press “Search again”.",
      rescan: "Search again", skip: "Skip (later in settings)", nowifi: "You can continue with the cable, or add a Wi-Fi card later.",
      pw: "Password for {n}", pw2: "Type it on the keyboard. If other letters appear than the ones you type, change the keyboard type.", show: "Show", hide: "Hide", kb: "Keyboard:",
      connect: "Connect", connecting: "Connecting… this can take half a minute", open_net: "Open network without a password",
      ok_w: "Connected to {n}. The server will join it by itself after setup.", e_auth: "Could not connect. Check the password (capital and small letters) or move closer to the router.",
      e_dhcp: "Joined the network but the router gave no address. Try again in a moment.", e_driver: "This Wi-Fi card does not work with the system. Use the cable.",
      e_noadapter: "No Wi-Fi card.", e_psk: "The password has at least 8 characters.", ip_or: "or by address", same_net: "Your phone must be on the same home network",
    },
    fr: {
      setup: "Installation du système", overall: "Progression", eta: "Temps restant : environ {n} minutes", eta1: "Moins d'une minute",
      steps: ["Bienvenue et langue", "Réseau et Wi-Fi", "Choix du disque", "Préparation du disque", "Copie du système", "Configuration de HOME ANAB", "Démarrage"],
      now: "En cours…", stopped: "Arrêté ici",
      w_h: "Bienvenue dans HOME ANAB", w_p: "Cet ordinateur va devenir le coffre-fort de vos photos et fichiers, avec un écran TV pour la famille. L'installation est automatique et dure 5 à 15 minutes.",
      lang: "Choisissez la langue", offline: "Tout est sur la clé USB : pas besoin d'internet", next: "Suivant", keys: "Flèches et Entrée, ou la souris",
      d_h: "Où installer le système ?", d_p: "Voici les disques de cet ordinateur. La clé USB de démarrage est masquée pour ne pas être effacée.",
      chosen: "Choisi", raid: "Utiliser deux disques en miroir (RAID 1) : chaque fichier est gardé sur les deux", raid2: "Choisissez le second disque du miroir",
      warn: "Tout le contenu du disque choisi sera effacé. Vérifiez qu'il ne contient rien d'important.", go: "Effacer le disque et installer", sure: "Appuyez encore pour confirmer",
      back: "Retour", nodisk: "Aucun disque adapté (8 Go ou plus). Vérifiez que le disque est branché.", ssd: "SSD", hdd: "Disque dur", nvme: "Disque NVMe", usb: "Disque USB",
      i_top: "Vous pouvez laisser l'ordinateur, il termine tout seul", did: "Le saviez-vous ?",
      done_h: "Installation terminée !", done_p: "Retirez la clé USB. L'ordinateur redémarre dans {n} secondes.", open: "Ouvrez depuis votre téléphone ou ordinateur",
      code: "Le code d'installation est privé", code2: "Demandez-le au développeur sur WhatsApp", reboot: "Redémarrer", tv: "Si une TV est branchée, l'écran HOME ANAB s'y affiche au démarrage",
      e_h: "Installation interrompue", e_disk: "Le disque ne répond pas. Il est peut-être verrouillé par mot de passe, mal branché ou défectueux.",
      e_space: "Pas assez d'espace sur le disque.", e_other: "Un problème est survenu pendant l'installation.",
      fix: ["Vérifiez le disque et son câble.", "Supprimez le mot de passe du disque dans le BIOS s'il y en a un.", "Essayez un autre disque."],
      retry: "Réessayer", off: "Éteindre", photo: "Prenez une photo de cet écran si besoin d'aide",
      n_h: "Connexion au réseau de la maison", n_p: "Branchez un câble réseau sur la box, ou choisissez votre Wi-Fi. Le serveur y reste connecté après l'installation.",
      cable: "Câble", cable_off: "Non branché", getting: "Obtention d'une adresse…", wifi: "Wi-Fi", wifi_off: "Non connecté", wifi_none: "Cet ordinateur n'a pas de carte Wi-Fi",
      nets: "Réseaux Wi-Fi proches : choisissez le vôtre", scanning: "Recherche des réseaux…", nonets: "Aucun réseau trouvé. Rapprochez-vous de la box et appuyez sur « Rechercher ».",
      rescan: "Rechercher", skip: "Passer (plus tard dans les réglages)", nowifi: "Vous pouvez continuer avec le câble, ou ajouter une carte Wi-Fi plus tard.",
      pw: "Mot de passe de {n}", pw2: "Tapez-le au clavier. Si d'autres lettres apparaissent, changez le type de clavier.", show: "Afficher", hide: "Masquer", kb: "Clavier :",
      connect: "Connecter", connecting: "Connexion… cela peut prendre une demi-minute", open_net: "Réseau ouvert sans mot de passe",
      ok_w: "Connecté à {n}. Le serveur s'y connectera tout seul après l'installation.", e_auth: "Connexion impossible. Vérifiez le mot de passe (majuscules et minuscules) ou rapprochez-vous de la box.",
      e_dhcp: "Réseau rejoint mais la box n'a donné aucune adresse. Réessayez dans un moment.", e_driver: "Cette carte Wi-Fi ne fonctionne pas avec le système. Utilisez le câble.",
      e_noadapter: "Pas de carte Wi-Fi.", e_psk: "Le mot de passe a au moins 8 caractères.", ip_or: "ou par l'adresse", same_net: "Le téléphone doit être sur le même réseau de la maison",
    },
  };
  const TIPS = {
    ar: [["صوري من الآيفون", "احفظ صور هاتفك تلقائياً على السيرفر، وتصفحها بالألبومات والأشخاص.", "#fb7185,#f59e0b", "photos"],
      ["شاشة للعائلة على التلفاز", "لكل شخص صفحته: صور، وفيديو، ورسوم متحركة وألعاب للأطفال، ومواقيت الصلاة.", "#a855f7,#ec4899", "tv"],
      ["ألعاب للأطفال", "أضف الألعاب إلى مجلد الألعاب لتظهر على التلفاز، وتعمل مع يد بلايستيشن.", "#06b6d4,#2563eb", "games"],
      ["قرص شبكة في البيت", "افتح ملفاتك من ويندوز والآيفون كأنها قرص في جهازك.", "#22c55e,#15803d", "disk"],
      ["بدون إنترنت", "يعمل السيرفر في البيت فقط، ويُحدَّث من فلاشة متى أردت.", "#f59e0b,#f97316", "lock"]],
    en: [["Your iPhone photos", "Back up your phone photos automatically and browse them by album and by person.", "#fb7185,#f59e0b", "photos"],
      ["A family screen on the TV", "Each person has a page: photos, videos, cartoons and games for kids, prayer times.", "#a855f7,#ec4899", "tv"],
      ["Games for kids", "Drop games into the games folder; they work with a PlayStation controller.", "#06b6d4,#2563eb", "games"],
      ["A network drive at home", "Open your files from Windows and the iPhone like a local disk.", "#22c55e,#15803d", "disk"],
      ["No internet needed", "The server works at home only and is updated from a USB stick.", "#f59e0b,#f97316", "lock"]],
    fr: [["Vos photos d'iPhone", "Sauvegardez automatiquement les photos du téléphone et parcourez-les par album et par personne.", "#fb7185,#f59e0b", "photos"],
      ["Un écran familial sur la TV", "Chacun a sa page : photos, vidéos, dessins animés et jeux pour les enfants, horaires de prière.", "#a855f7,#ec4899", "tv"],
      ["Des jeux pour les enfants", "Ajoutez des jeux dans le dossier jeux ; ils marchent avec une manette PlayStation.", "#06b6d4,#2563eb", "games"],
      ["Un disque réseau à la maison", "Ouvrez vos fichiers depuis Windows et l'iPhone comme un disque local.", "#22c55e,#15803d", "disk"],
      ["Sans internet", "Le serveur fonctionne à la maison et se met à jour par clé USB.", "#f59e0b,#f97316", "lock"]],
  };
  const ICON = {
    photos: '<svg width="88" height="88" viewBox="0 0 54 54"><rect x="6" y="12" width="42" height="32" rx="6" fill="#fff"/><circle cx="18" cy="23" r="4.5" fill="#fbbf24"/><path d="M10 40 L22 28 L30 35 L36 30 L44 40 Z" fill="#34d399"/></svg>',
    tv: '<svg width="88" height="88" viewBox="0 0 54 54"><rect x="6" y="14" width="42" height="30" rx="7" fill="#fff"/><path d="M23 22 L34 29 L23 36 Z" fill="#a855f7"/><path d="M20 14 L15 6 M34 14 L39 6" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>',
    games: '<svg width="88" height="88" viewBox="0 0 54 54"><path d="M15 16 H39 C46 16 50 23 50 32 C50 41 45 44 41 41 L35 36 H19 L13 41 C9 44 4 41 4 32 C4 23 8 16 15 16 Z" fill="#fff"/><rect x="14" y="24" width="4" height="11" rx="1.5" fill="#7c3aed"/><rect x="10.5" y="27.5" width="11" height="4" rx="1.5" fill="#7c3aed"/><circle cx="37" cy="26" r="3" fill="#facc15"/><circle cx="42" cy="31" r="3" fill="#06b6d4"/><circle cx="32" cy="31" r="3" fill="#f472b6"/></svg>',
    disk: '<svg width="88" height="88" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M7 15h.01M11 15h6"/></svg>',
    lock: '<svg width="88" height="88" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  };
  const CHECK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>';
  const $ = (s) => document.querySelector(s);
  const main = $("#main"), stageEl = $("#stage");
  let lang = "ar", view = "welcome", diskList = [], chosen = null, chosen2 = null, raid = false, confirmArm = false;
  // الشبكة: الحالة، الشبكات القريبة، الشبكة المختارة لكتابة كلمة المرور
  let net = { wired: {}, wifi: {} }, nets = null, scanning = false, pick = null, pwVal = "", showPw = true, wBusy = false, wErr = "", wOk = "", kb = "us";
  try { kb = localStorage.getItem("kb") || "us"; } catch (e) { /* */ }
  let st = { stage: "welcome", step: 0, percent: 0 };
  const tr = (k) => (T[lang] || T.ar)[k];
  const t = (k, n) => String((T[lang] || T.ar)[k] ?? k).replace("{n}", n);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const api = (u, b) => fetch(u, b ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) } : {}).then((r) => r.json());

  function fit() {
    const s = Math.min(innerWidth / 1280, innerHeight / 720);
    stageEl.style.transform = `translate(${(innerWidth - 1280 * s) / 2}px, ${(innerHeight - 720 * s) / 2}px) scale(${s})`;
  }
  addEventListener("resize", fit); fit();

  // ------------------------------------------------------------ الخطوات على الجانب
  function drawSteps() {
    const cur = view === "welcome" ? 0 : view === "net" ? 1 : view === "disk" ? 2 : view === "done" ? 99 : Math.max(3, st.step);
    $("#steps").innerHTML = tr("steps").map((name, i) => {
      let cls = i < cur ? "done" : i === cur ? "now" : "todo";
      if (view === "error" && i === cur) cls = "err";
      const n = cls === "done" ? CHECK : cls === "err" ? "!" : i + 1;
      const sub = cls === "now" && view === "installing" ? `<small>${t("now")}</small>` : cls === "err" ? `<small>${t("stopped")}</small>` : "";
      return `<li class="${cls}"><span class="n">${n}</span><span class="l">${esc(name)}${sub}</span></li>`;
    }).join("");
    const showBar = view === "installing" || view === "done";
    $("#overall").hidden = !showBar;
    if (showBar) {
      const p = view === "done" ? 100 : st.percent || 0;
      $("#pct").textContent = `${Math.round(p)}%`;
      $("#barfill").style.width = `${p}%`;
      $("#eta").textContent = view === "done" ? "" : st.eta_min ? (st.eta_min <= 1 ? t("eta1") : t("eta", st.eta_min)) : "";
    }
    stageEl.classList.toggle("ok", view === "done");
    stageEl.classList.toggle("bad", view === "error");
  }

  // ------------------------------------------------------------ الشاشات
  function render() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.querySelectorAll("[data-t]").forEach((e) => { e.textContent = t(e.dataset.t); });
    drawSteps();
    if (view === "welcome") {
      main.innerHTML = `<h1>${t("w_h")}</h1><p>${t("w_p")}</p>
        <div class="muted" style="margin-top:10px">${t("lang")}</div>
        <div class="row">${[["ar", "العربية"], ["en", "English"], ["fr", "Français"]].map(([k, n]) =>
          `<button class="btn f ${k === lang ? "gold" : ""}" data-lang="${k}">${n}</button>`).join("")}</div>
        <div class="ok-line">${CHECK.replace('stroke="#fff"', 'stroke="#86efac"')} ${t("offline")}</div>
        <div class="bottom"><button class="btn go f" data-go="net">${t("next")}</button><span class="muted">${t("keys")}</span></div>`;
    } else if (view === "net") {
      main.innerHTML = netView();
    } else if (view === "disk") {
      const items = diskList.map((d, i) => {
        const kind = d.tran === "nvme" ? t("nvme") : d.tran === "usb" ? t("usb") : d.rota ? t("hdd") : t("ssd");
        const on = d.path === chosen || (raid && d.path === chosen2);
        return `<button class="disk f ${on ? "on" : ""}" data-disk="${i}">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${on ? "#fde68a" : "#bfd3f2"}" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M7 15h.01M11 15h6"/></svg>
          <span><b>${esc(kind)} · <bdi dir="ltr">${(d.size / 1e9).toFixed(0)} GB</bdi></b><span class="d" dir="ltr">${esc(d.model || d.name)} · ${esc(d.path)}</span></span>
          <span class="tag">${t("chosen")}</span></button>`;
      }).join("");
      main.innerHTML = `<h1>${t("d_h")}</h1><p>${t("d_p")}</p>
        <div style="display:flex;flex-direction:column;gap:10px">${items || `<div class="warn">${t("nodisk")}</div>`}</div>
        ${diskList.length >= 2 ? `<div class="check f ${raid ? "on" : ""}" data-raid="1"><span class="box">${raid ? "✓" : ""}</span>${t("raid")}</div>
          ${raid && !chosen2 ? `<div class="muted">${t("raid2")}</div>` : ""}` : ""}
        ${diskList.length ? `<div class="warn">⚠ ${t("warn")}</div>` : ""}
        <div class="bottom"><button class="btn danger f" data-install="1" ${chosen && (!raid || chosen2) ? "" : "disabled"}>${confirmArm ? t("sure") : t("go")}</button>
          <button class="btn f" data-go="net">${t("back")}</button></div>`;
    } else if (view === "installing") {
      const tips = TIPS[lang] || TIPS.ar;
      const k = Math.floor(Date.now() / 9000) % tips.length, tip = tips[k];
      const [c1, c2] = tip[2].split(",");
      main.innerHTML = `<div class="muted">${t("i_top")}</div><h1>${esc(tr("steps")[Math.min(6, st.step)])}</h1>
        <section class="tip"><div class="ic" style="background:linear-gradient(135deg,${c1},${c2})">${ICON[tip[3]]}</div>
          <div><div class="k">${t("did")}</div><div class="h">${esc(tip[0])}</div><div class="x">${esc(tip[1])}</div></div></section>
        <div class="dots">${tips.map((_, i) => `<span class="${i === k ? "on" : ""}"></span>`).join("")}</div>
        <div class="detail"><i></i><span>${esc(st.detail || "")}</span></div>`;
    } else if (view === "done") {
      main.innerHTML = `<div class="badge-ok">${CHECK.replace(/18/g, "54")}</div><h1>${t("done_h")}</h1><p>${t("done_p", countdown)}</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="card"><div class="muted">${t("open")}</div><div class="big" dir="ltr">hsef.local</div>
            ${myIp() ? `<div class="ipline">${t("ip_or")} <bdi dir="ltr">${esc(myIp())}</bdi></div>` : ""}<div class="muted" style="font-size:13px;margin-top:4px">${t("same_net")}</div></div>
          <div class="card gold" style="display:flex;gap:14px;align-items:center"><img class="qr" src="whatsapp-qr.png" alt="">
            <div><div style="color:#fde68a;font-size:15px">${t("code")}</div><div style="font-weight:700;font-size:18px">${t("code2")}</div><div dir="ltr" style="color:#bfd3f2">+32 494 49 94 30</div></div></div>
        </div>
        <div class="bottom"><button class="btn go f" data-reboot="1">${t("reboot")}</button><span class="muted">${t("tv")}</span></div>`;
    } else if (view === "error") {
      const why = st.hint === "disk" ? t("e_disk") : st.hint === "space" ? t("e_space") : t("e_other");
      main.innerHTML = `<h1>${t("e_h")}</h1><p>${why}</p>
        <div class="card" style="font-size:18px;line-height:1.9">${tr("fix").map((x, i) => `<div><b style="color:#fde68a">${i + 1}.</b> ${esc(x)}</div>`).join("")}</div>
        <div class="log">${esc(st.error || "")}</div>
        <div class="bottom"><button class="btn gold f" data-retry="1">${t("retry")}</button><button class="btn f" data-off="1">${t("off")}</button><span class="muted">${t("photo")}</span></div>`;
    }
    bind();
    focusFirst();
  }


  // ------------------------------------------------------------ شاشة الشبكة
  const ICO_CABLE = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="8" rx="1.5"/><path d="M10 6h.01M14 6h.01M12 10v5M7 15h10v4a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z"/></svg>';
  const ICO_WIFI = '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1.2" fill="currentColor"/></svg>';
  const LOCK = '<svg class="lk" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#bfd3f2" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  const bars = (dbm) => {
    const n = dbm > -55 ? 4 : dbm > -67 ? 3 : dbm > -77 ? 2 : 1;
    return `<svg class="sig" width="26" height="22" viewBox="0 0 26 22">${[0, 1, 2, 3].map((i) =>
      `<rect x="${i * 7}" y="${16 - i * 5}" width="5" height="${6 + i * 5}" rx="1.5" fill="${i < n ? "#86efac" : "rgba(255,255,255,.22)"}"/>`).join("")}</svg>`;
  };
  const ssidHtml = (n) => `<bdi class="ss" dir="auto">${esc(n)}</bdi>`;
  const myIp = () => (net.wifi && net.wifi.ip) || (net.wired && net.wired.ip) || "";
  const KBN = { us: "QWERTY", be: "AZERTY (BE)", fr: "AZERTY (FR)" };

  function netView() {
    const c = net.wired || {}, w = net.wifi || {};
    const ipb = (ip) => `<bdi dir="ltr">${esc(ip)}</bdi>`;
    const status = `<div class="nst">
        <div class="st ${c.ip ? "on" : ""}">${ICO_CABLE}<span><b>${t("cable")}</b><small>${c.ip ? ipb(c.ip) : c.cable ? t("getting") : t("cable_off")}</small></span></div>
        <div class="st ${w.ip ? "on" : ""}">${ICO_WIFI}<span><b>${t("wifi")}</b><small>${!w.iface ? t("wifi_none") : w.ip ? `${esc(w.ssid || "")} · ${ipb(w.ip)}` : t("wifi_off")}</small></span></div></div>`;
    if (pick) {
      return `<h1 class="sm">${t("pw", ssidHtml(pick.ssid))}</h1>${status}
        ${pick.secure ? `<p class="sm">${t("pw2")}</p>
        <div class="pwrow"><input id="pw" class="f inp" type="${showPw ? "text" : "password"}" dir="ltr" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="64" ${wBusy ? "disabled" : ""}>
          <button class="btn f" data-eye="1">${showPw ? t("hide") : t("show")}</button></div>
        <div class="row kbrow"><span class="muted">${t("kb")}</span>${Object.keys(KBN).map((k) =>
          `<button class="chip f ${kb === k ? "on" : ""}" data-kb="${k}" dir="ltr">${KBN[k]}</button>`).join("")}</div>` : `<p class="sm">${t("open_net")}</p>`}
        ${wErr ? `<div class="warn">⚠ ${esc(t("e_" + wErr))}</div>` : ""}
        <div class="bottom"><button class="btn go f" data-conn="1" ${wBusy ? "disabled" : ""}>${wBusy ? t("connecting") : t("connect")}</button>
          <button class="btn f" data-unpick="1" ${wBusy ? "disabled" : ""}>${t("back")}</button></div>`;
    }
    let list;
    if (!w.iface) list = `<div class="muted">${t("nowifi")}</div>`;
    else if (scanning && !nets) list = `<div class="muted scanning"><i></i>${t("scanning")}</div>`;
    else if (!nets || !nets.length) list = `<div class="muted">${t("nonets")}</div>`;
    else list = `<div class="muted">${t("nets")}</div><div class="nets">${nets.map((n, i) => {
      const on = w.ip && w.ssid === n.ssid;
      return `<button class="net f ${on ? "on" : ""}" data-net="${i}">${bars(n.signal)}<span class="nm" dir="auto">${esc(n.ssid)}</span>${on ? CHECK.replace('stroke="#fff"', 'stroke="#86efac"') : n.secure ? LOCK : ""}</button>`;
    }).join("")}</div>`;
    const done = myIp();
    return `<h1 class="sm">${t("n_h")}</h1><p class="sm">${t("n_p")}</p>${status}
      ${wOk ? `<div class="ok-line">${CHECK.replace('stroke="#fff"', 'stroke="#86efac"')} <span>${t("ok_w", ssidHtml(wOk))}</span></div>` : ""}
      ${wErr ? `<div class="warn">⚠ ${esc(t("e_" + wErr))}</div>` : ""}
      ${list}
      <div class="bottom"><button class="btn ${done ? "go" : ""} f" data-go="disk">${done ? t("next") : t("skip")}</button>
        ${w.iface ? `<button class="btn f" data-scan="1" ${scanning ? "disabled" : ""}>${scanning ? t("scanning") : t("rescan")}</button>` : ""}
        <button class="btn f" data-go="welcome">${t("back")}</button></div>`;
  }

  async function refreshNet() {
    try { net = await api("/api/net"); } catch (e) { /* */ }
  }
  async function scan() {
    if (scanning) return;
    scanning = true; if (view === "net") { keepFocus = "[data-scan]"; render(); }
    try { const r = await api("/api/wifi/scan", {}); nets = r.networks || []; if (r.net) net = r.net; } catch (e) { nets = nets || []; }
    scanning = false;
    if (view === "net" && !pick) render();
  }
  async function connect() {
    if (wBusy || !pick) return;
    const psk = pick.secure ? pwVal : "";
    if (pick.secure && psk.length < 8) { wErr = "psk"; keepFocus = "#pw"; render(); return; }
    wBusy = true; wErr = ""; keepFocus = "[data-conn]"; render();
    let r = {};
    try { r = await api("/api/wifi/connect", { ssid: pick.ssid, psk }); } catch (e) { r = { error: "auth" }; }
    wBusy = false;
    if (r.net) net = r.net;
    if (r.ok) { wOk = pick.ssid; pick = null; pwVal = ""; keepFocus = "[data-go=disk]"; }
    else { wErr = r.error || "auth"; keepFocus = "#pw"; }
    render();
  }

  // لوحة المفاتيح: الشاشة تعمل بتخطيط QWERTY، فنحوّل الأزرار حسب لوحة المستخدم (AZERTY) من مكانها
  const D = (s) => Object.fromEntries(["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((d, i) => [`Digit${d}`, s[i]]));
  const AZ = { KeyQ: "a", KeyW: "z", KeyA: "q", KeyZ: "w", Semicolon: "m" };
  const KBMAP = {
    be: { n: { ...D("&é\"'(§è!çà"), Backquote: "²", Minus: ")", Equal: "-", BracketLeft: "^", BracketRight: "$", Quote: "ù", Backslash: "µ", IntlBackslash: "<", KeyM: ",", Comma: ";", Period: ":", Slash: "=" },
      s: { ...D("1234567890"), Backquote: "³", Minus: "°", Equal: "_", BracketLeft: "¨", BracketRight: "*", Quote: "%", Backslash: "£", IntlBackslash: ">", KeyM: "?", Comma: ".", Period: "/", Slash: "+" },
      g: { Digit1: "|", Digit2: "@", Digit3: "#", Digit6: "^", Digit9: "{", Digit0: "}", BracketLeft: "[", BracketRight: "]", Equal: "~", Quote: "´", Backslash: "`", IntlBackslash: "\\", KeyE: "€" } },
    fr: { n: { ...D("&é\"'(-è_çà"), Backquote: "²", Minus: ")", Equal: "=", BracketLeft: "^", BracketRight: "$", Quote: "ù", Backslash: "*", IntlBackslash: "<", KeyM: ",", Comma: ";", Period: ":", Slash: "!" },
      s: { ...D("1234567890"), Minus: "°", Equal: "+", BracketLeft: "¨", BracketRight: "£", Quote: "%", Backslash: "µ", IntlBackslash: ">", KeyM: "?", Comma: ".", Period: "/", Slash: "§" },
      g: { Digit2: "~", Digit3: "#", Digit4: "{", Digit5: "[", Digit6: "|", Digit7: "`", Digit8: "\\", Digit9: "^", Digit0: "@", Minus: "]", Equal: "}", KeyE: "€" } },
  };
  let altGr = false;
  addEventListener("keyup", (e) => { if (e.code === "AltRight") altGr = false; });
  function kbType(e, inp) {
    if (e.code === "AltRight") { altGr = true; return true; }
    const m = KBMAP[kb];
    if (!m || e.ctrlKey || e.metaKey) return false;
    let ch;
    if (altGr || e.getModifierState("AltGraph")) ch = m.g[e.code] || "";
    else if (AZ[e.code]) {
      const up = e.shiftKey !== e.getModifierState("CapsLock");
      ch = up ? AZ[e.code].toUpperCase() : AZ[e.code];
    } else ch = (e.shiftKey ? m.s : m.n)[e.code];
    if (ch === undefined) return false;
    if (ch) inp.setRangeText(ch, inp.selectionStart, inp.selectionEnd, "end");
    pwVal = inp.value;
    return true;
  }

  function bind() {
    main.querySelectorAll("[data-lang]").forEach((b) => b.onclick = () => { lang = b.dataset.lang; api("/api/lang", { lang }); render(); });
    main.querySelectorAll("[data-go]").forEach((b) => b.onclick = () => go(b.dataset.go));
    main.querySelectorAll("[data-disk]").forEach((b) => b.onclick = () => {
      const d = diskList[+b.dataset.disk].path;
      confirmArm = false;
      if (raid && chosen && d !== chosen) chosen2 = chosen2 === d ? null : d;
      else { chosen = d; if (chosen2 === d) chosen2 = null; }
      keepFocus = `[data-disk="${b.dataset.disk}"]`; render();
    });
    const r = main.querySelector("[data-raid]");
    if (r) r.onclick = () => { raid = !raid; chosen2 = null; confirmArm = false; keepFocus = "[data-raid]"; render(); };
    const ins = main.querySelector("[data-install]");
    if (ins) ins.onclick = async () => {
      if (!confirmArm) { confirmArm = true; keepFocus = "[data-install]"; render(); return; }
      const res = await api("/api/install", { disk: chosen, disk2: raid ? chosen2 : null, raid });
      if (res.ok) { view = "installing"; render(); }
    };
    main.querySelectorAll("[data-net]").forEach((b) => b.onclick = () => {
      const n = nets[+b.dataset.net];
      wErr = ""; wOk = "";
      pick = n; pwVal = "";
      if (!n.secure) { connect(); return; }
      keepFocus = "#pw"; render();
    });
    const sc = main.querySelector("[data-scan]"); if (sc) sc.onclick = () => { wErr = ""; scan(); };
    const pw = main.querySelector("#pw");
    if (pw) { pw.value = pwVal; pw.oninput = () => { pwVal = pw.value; }; }
    const eye = main.querySelector("[data-eye]"); if (eye) eye.onclick = () => { showPw = !showPw; keepFocus = "#pw"; render(); };
    main.querySelectorAll("[data-kb]").forEach((b) => b.onclick = () => {
      kb = b.dataset.kb; try { localStorage.setItem("kb", kb); } catch (e) { /* */ }
      keepFocus = "#pw"; render();
    });
    const cn = main.querySelector("[data-conn]"); if (cn) cn.onclick = connect;
    const up = main.querySelector("[data-unpick]"); if (up) up.onclick = () => { pick = null; wErr = ""; pwVal = ""; render(); };
    const rb = main.querySelector("[data-reboot]"); if (rb) rb.onclick = () => api("/api/reboot", {});
    const of = main.querySelector("[data-off]"); if (of) of.onclick = () => api("/api/poweroff", {});
    const rt = main.querySelector("[data-retry]"); if (rt) rt.onclick = async () => { await api("/api/retry", {}); go("disk"); };
  }

  async function go(v) {
    confirmArm = false;
    if (v === "net") {
      wErr = ""; pick = null;
      await refreshNet();
      view = v; render();
      if (net.wifi && net.wifi.iface && !nets) scan();
      return;
    }
    if (v === "disk") {
      const r = await api("/api/disks");
      diskList = r.disks || [];
      if (!chosen || !diskList.some((d) => d.path === chosen)) chosen = diskList[0] ? diskList[0].path : null;
    }
    view = v; render();
  }

  // ------------------------------------------------------------ التنقل بالأسهم
  let cur = 0, keepFocus = null;
  const focusables = () => [...main.querySelectorAll(".f")].filter((e) => !e.disabled);
  function setSel(i, soft) {
    const f = focusables(); if (!f.length) return;
    cur = (i + f.length) % f.length;
    f.forEach((e, j) => e.classList.toggle("sel", j === cur));
    if (soft) return; // مرور الفأرة لا يُخرج الكتابة من حقل كلمة المرور
    // حقل الكتابة يأخذ التركيز الحقيقي حتى تصل إليه لوحة المفاتيح
    if (f[cur].tagName === "INPUT") { f[cur].focus(); const n = f[cur].value.length; try { f[cur].setSelectionRange(n, n); } catch (e) { /* */ } }
    else if (document.activeElement && document.activeElement.tagName === "INPUT") document.activeElement.blur();
  }
  function focusFirst() {
    const f = focusables();
    let i = keepFocus ? f.findIndex((e) => e.matches(keepFocus)) : -1;
    keepFocus = null;
    if (i < 0) i = f.findIndex((e) => e.classList.contains("go") || e.classList.contains("danger"));
    if (i < 0) i = f.findIndex((e) => e.dataset.retry);
    setSel(i < 0 ? 0 : i);
  }
  addEventListener("keydown", (e) => {
    const inp = e.target && e.target.tagName === "INPUT" ? e.target : null;
    if (inp) {
      if (e.key === "Enter") { const c = main.querySelector("[data-conn]"); if (c) c.click(); e.preventDefault(); }
      else if (e.key === "Escape") { const u = main.querySelector("[data-unpick]"); if (u) u.click(); }
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") { setSel(cur + (e.key === "ArrowDown" ? 1 : -1)); e.preventDefault(); }
      else if (kbType(e, inp)) e.preventDefault();
      return;
    }
    const f = focusables();
    if (["ArrowDown", "ArrowLeft"].includes(e.key)) { setSel(cur + 1); e.preventDefault(); }
    else if (["ArrowUp", "ArrowRight"].includes(e.key)) { setSel(cur - 1); e.preventDefault(); }
    else if (e.key === "Enter" || e.key === " ") { if (f[cur]) f[cur].click(); e.preventDefault(); }
  });
  main.addEventListener("mouseover", (e) => { const b = e.target.closest(".f"); if (b) setSel(focusables().indexOf(b), true); });
  main.addEventListener("focusin", (e) => { if (e.target.tagName === "INPUT") setSel(focusables().indexOf(e.target), true); });

  // ------------------------------------------------------------ متابعة التثبيت
  let countdown = 15, cdTimer = 0;
  async function poll() {
    try {
      st = await api("/api/state");
      if (st.stage === "installing") { if (view !== "installing") view = "installing"; render(); }
      else if (st.stage === "done" && view !== "done") {
        await refreshNet();
        view = "done"; countdown = 15; render();
        cdTimer = setInterval(() => { countdown--; if (countdown <= 0) { clearInterval(cdTimer); api("/api/reboot", {}); } else render(); }, 1000);
      } else if (st.stage === "error" && view !== "error") { view = "error"; render(); }
    } catch (e) { /* */ }
    setTimeout(poll, 1000);
  }
  api("/api/state").then((s) => { st = s; lang = s.lang || "ar"; render(); poll(); }).catch(() => { render(); poll(); });
})();
