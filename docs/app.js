if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => console.log('SW Reg failed:', err));
    });
}

document.getElementById('currentYear').textContent = new Date().getFullYear();

const dict = {
    ru: {
        pageTitle: "Xiaomi Notes Exporter", mainTitle: "Xiaomi Notes Exporter",
        instrTitle: "Где взять файл бэкапа?",
        instr1: "1. Настройки ➔ О телефоне ➔ Резервирование и восстановление ➔ Мобильное устройство.",
        instr2: "2. Выберите только <strong>Заметки</strong> в системных приложениях.",
        instr3: "3. Файл появится по пути:",
        dropText: "Перетащите файл .bak сюда или нажмите для выбора",
        formatTitle: "Форматы экспорта", optMd: "Markdown (Obsidian Vault)", optJson: "База данных в JSON", optSkip: "Пропускать пустые заметки",
        propsTitle: "Свойства (YAML Frontmatter)", optFm: "Добавлять свойства в .md",
        btnStart: "Начать конвертацию",
        infoLocal: "Все данные обрабатываются <b>локально</b> на вашем устройстве. Файлы никуда не отправляются.",
        infoPwa: "Сайт можно установить как <b>веб-приложение (PWA)</b> через меню браузера.",
        infoCli: "Для автоматизации доступна <a href='https://github.com/OpexDevelop/xiaomi-notes-exporter' target='_blank'>CLI-версия на GitHub</a>.",
        logRead: "Чтение файла...", logTar: "Извлечение TAR архива (это может занять время)...",
        logTarDone: "Извлечено файлов из TAR: ", logDb: "Парсинг базы данных...",
        logFound: "Найдено: ", logZip: "Формирование ZIP архива...", logDone: "Успешно завершено! Загрузка началась.",
        starRepo: "🎉 Готово! Если этот инструмент вам помог, пожалуйста, <a href='https://github.com/OpexDevelop/xiaomi-notes-exporter' target='_blank'>поставьте ⭐️ на GitHub</a>!",
        errNoFile: "Пожалуйста, выберите файл .bak", errFormat: "Выберите хотя бы один формат для экспорта!",
        errMagic: "Неверный формат бэкапа (не найдена сигнатура none\\n).", errDb: "Файл базы данных _tmp_bak не найден в архиве."
    },
    en: {
        pageTitle: "Xiaomi Notes Exporter", mainTitle: "Xiaomi Notes Exporter",
        instrTitle: "Where to get the backup file?",
        instr1: "1. Settings ➔ About phone ➔ Back up and restore ➔ Mobile device.",
        instr2: "2. Select only <strong>Notes</strong> under Other system app data.",
        instr3: "3. The file will be saved at:",
        dropText: "Drop .bak file here or click to select",
        formatTitle: "Export Formats", optMd: "Markdown (Obsidian Vault)", optJson: "JSON Database", optSkip: "Skip empty notes",
        propsTitle: "Properties (YAML Frontmatter)", optFm: "Add properties to .md",
        btnStart: "Start Conversion",
        infoLocal: "All data is processed <b>locally</b> on your device. No files are uploaded.",
        infoPwa: "You can install this site as a <b>Web App (PWA)</b> via your browser menu.",
        infoCli: "For automation, a <a href='https://github.com/OpexDevelop/xiaomi-notes-exporter' target='_blank'>CLI version is available on GitHub</a>.",
        logRead: "Reading file...", logTar: "Extracting TAR archive (this may take a while)...",
        logTarDone: "Files extracted from TAR: ", logDb: "Parsing database...",
        logFound: "Found: ", logZip: "Generating ZIP archive...", logDone: "Successfully completed! Download started.",
        starRepo: "🎉 Done! If this tool helped you, please <a href='https://github.com/OpexDevelop/xiaomi-notes-exporter' target='_blank'>star the repo on GitHub ⭐️</a>!",
        errNoFile: "Please select a .bak file", errFormat: "Select at least one export format!",
        errMagic: "Invalid backup format (none\\n signature not found).", errDb: "Database file _tmp_bak not found in archive."
    }
};

let currentLang = localStorage.getItem('lang') || 'ru';
const langToggle = document.getElementById('langToggle');

function applyLang(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    langToggle.textContent = lang === 'ru' ? 'EN' : 'RU';
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[lang][key]) el.innerHTML = dict[lang][key];
    });
}
langToggle.addEventListener('click', () => applyLang(currentLang === 'ru' ? 'en' : 'ru'));
applyLang(currentLang);

function t(key) { return dict[currentLang][key] || key; }

const logEl = document.getElementById('log');
const btnStart = document.getElementById('btnStart');
const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const dropText = document.getElementById('dropText');
const optFrontmatter = document.getElementById('optFrontmatter');
const frontmatterOptions = document.getElementById('frontmatterOptions');

optFrontmatter.addEventListener('change', (e) => {
    frontmatterOptions.style.opacity = e.target.checked ? '1' : '0.5';
    frontmatterOptions.style.pointerEvents = e.target.checked ? 'auto' : 'none';
});

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) { fileInput.files = e.dataTransfer.files; updateFileName(); }
});
fileInput.addEventListener('change', updateFileName);

function updateFileName() {
    if (fileInput.files.length > 0) {
        dropText.textContent = fileInput.files[0].name;
        dropText.style.color = 'var(--highlight)';
    }
}

// Изменено: теперь поддерживает HTML теги (innerHTML вместо textContent)
function log(msg, type = 'info') {
    const span = document.createElement('div');
    span.className = `log-${type}`;
    span.innerHTML = msg;
    logEl.appendChild(span);
    logEl.scrollTop = logEl.scrollHeight;
}

const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

function safeDecode(bytes) {
    if (!bytes) return "";
    try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } 
    catch (e) { return "hex:0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''); }
}
function sanitizeFilename(name) { return name.replace(/[\\/*?:"<>|]/g, "").trim(); }
function formatTime(ms) {
    if (!ms) return "";
    const d = new Date(Number(ms));
    const pad = (n) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function guessExtension(mime) {
    const map = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp', 'audio/mp4': '.m4a', 'audio/amr': '.amr', 'audio/mpeg': '.mp3', 'audio/aac': '.aac', 'video/mp4': '.mp4', 'application/pdf': '.pdf' };
    if (mime === 'image/jpe') return '.jpg';
    return map[mime] || '';
}

function readVarint(data, pos) {
    let val = 0n, shift = 0n;
    while (true) {
        let b = BigInt(data[pos++]);
        val |= (b & 0x7Fn) << shift;
        if (!(b & 0x80n)) break;
        shift += 7n;
    }
    return [val, pos];
}

function parseProto(data, start = 0, end = data.length) {
    let msg = {}, pos = start;
    while (pos < end) {
        if (pos >= data.length) break;
        let key, wireType, tag;
        try {
            [key, pos] = readVarint(data, pos);
            tag = Number(key >> 3n); wireType = Number(key & 0x07n);
        } catch (e) { break; }

        if (wireType === 0) {
            let val; [val, pos] = readVarint(data, pos);
            if (!msg[tag]) msg[tag] = []; msg[tag].push(Number(val));
        } else if (wireType === 2) {
            let length; [length, pos] = readVarint(data, pos);
            let lenNum = Number(length), val = data.slice(pos, pos + lenNum); pos += lenNum;
            if (!msg[tag]) msg[tag] = []; msg[tag].push(val);
        } else if (wireType === 1) {
            let val = "64bit_hex:0x" + Array.from(data.slice(pos, pos+8)).map(b=>b.toString(16).padStart(2,'0')).join(''); pos += 8;
            if (!msg[tag]) msg[tag] = []; msg[tag].push(val);
        } else if (wireType === 5) {
            let val = "32bit_hex:0x" + Array.from(data.slice(pos, pos+4)).map(b=>b.toString(16).padStart(2,'0')).join(''); pos += 4;
            if (!msg[tag]) msg[tag] = []; msg[tag].push(val);
        } else break;
    }
    return [msg, pos];
}

async function parseTar(buffer) {
    let files = new Map(), offset = 0, view = new Uint8Array(buffer), decoder = new TextDecoder('utf-8'), count = 0;
    while (offset < buffer.byteLength) {
        if (view[offset] === 0) break;
        let nameBytes = view.slice(offset, offset + 100), nameLen = nameBytes.indexOf(0);
        if (nameLen === -1) nameLen = 100;
        let name = decoder.decode(nameBytes.slice(0, nameLen));
        let sizeBytes = view.slice(offset + 124, offset + 136), sizeStr = decoder.decode(sizeBytes).replace(/\0/g, '').trim(), size = parseInt(sizeStr, 8);
        if (isNaN(size)) break;
        offset += 512;
        if (size > 0) files.set(name, view.slice(offset, offset + size));
        offset += Math.ceil(size / 512) * 512;
        count++; if (count % 100 === 0) await yieldToMain();
    }
    return files;
}

function processFolder(rawBytes) {
    let [msg] = parseProto(rawBytes);
    return { id: safeDecode(msg[2]?.[0]), name: safeDecode(msg[9]?.[0]) };
}

function processNote(rawBytes) {
    let [msg] = parseProto(rawBytes);
    let tag16_raw = safeDecode(msg[16]?.[0]), mind_map_json = null;
    if (tag16_raw) {
        try {
            let clean_raw = tag16_raw.startsWith("<MiMind Prdfix>") ? tag16_raw.substring(15) : tag16_raw;
            let parsed_outer = JSON.parse(clean_raw);
            if (parsed_outer.content && typeof parsed_outer.content === 'string') parsed_outer.content = JSON.parse(parsed_outer.content);
            mind_map_json = parsed_outer;
        } catch (e) { mind_map_json = tag16_raw; }
    }
    let note = {
        id: safeDecode(msg[2]?.[0]), created_time_ms: msg[5]?.[0] || 0, modified_time_ms: msg[6]?.[0] || 0,
        snippet_preview: safeDecode(msg[8]?.[0]), folder_name: safeDecode(msg[10]?.[0]), pinned_time_ms: msg[12]?.[0] || 0,
        manual_title: safeDecode(msg[14]?.[0]), note_type: safeDecode(msg[15]?.[0]) || "common",
        mind_map_json: mind_map_json, mind_map_text: safeDecode(msg[17]?.[0]), data_items: []
    };
    if (msg[9]) {
        for (let itemBytes of msg[9]) {
            let [itemMsg] = parseProto(itemBytes);
            note.data_items.push({ mime_type: safeDecode(itemMsg[1]?.[0]), content: safeDecode(itemMsg[4]?.[0]) });
        }
    }
    return note;
}

function isNoteEmpty(note) {
    if ((note.manual_title || "").trim() || (note.snippet_preview || "").trim() || (note.note_type === "mind" && (note.mind_map_json || note.mind_map_text))) return false;
    for (let item of note.data_items) {
        if (item.mime_type === "vnd.android.cursor.item/text_note") { if ((item.content || "").trim()) return false; } 
        else return false;
    }
    return true;
}

function getNoteTitle(note) {
    let title = (note.manual_title || "").trim(); if (title) return title;
    let snippet = (note.snippet_preview || "").trim();
    if (snippet) { let firstLine = snippet.split('\n')[0].replace(/<[^>]+>/g, '').trim(); if (firstLine) return firstLine.substring(0, 40); }
    for (let item of note.data_items) {
        if (item.mime_type === "vnd.android.cursor.item/text_note") {
            let content = (item.content || "").trim();
            if (content) { let firstLine = content.replace(/<[^>]+>/g, '').split('\n')[0].trim(); if (firstLine) return firstLine.substring(0, 40); }
        }
    }
    if (note.note_type === "mind" && note.mind_map_text) {
        let text = (note.mind_map_text || "").trim(); if (text) { let firstLine = text.split('\n')[0].trim(); if (firstLine) return firstLine.substring(0, 40); }
    }
    return `Note_${note.id}`;
}

function toObsidian(htmlText, mediaMap) {
    if (!htmlText) return "";
    let text = htmlText.replace(/<input[^>]*checked="true"[^>]*type="checkbox"[^>]*>/g, '- [x] ')
                       .replace(/<input[^>]*type="checkbox"[^>]*checked="true"[^>]*>/g, '- [x] ')
                       .replace(/<input[^>]*type="checkbox"[^>]*>/g, '- [ ] ')
                       .replace(/<bullet\s*\/>\s*/g, '- ')
                       .replace(/<u>(.*?)<\/u>/g, '$1');
    text = text.replace(/<(sound|image|file)\s+fileid="([^"]+)"\s*\/>/g, (m, p1, p2) => `![[${mediaMap[p2] || p2}]]`);
    text = text.replace(/(?:☺|\xef\xbf\xbc)?\s*([a-f0-9]{40})(?:<[^>]*>)*/gi, (m, p1) => mediaMap[p1] ? `![[${mediaMap[p1]}]]` : m);
    return text.replace(/<b>(.*?)<\/b>/gs, '**$1**').replace(/<i>(.*?)<\/i>/gs, '*$1*');
}

btnStart.addEventListener('click', async () => {
    if (!fileInput.files.length) return log(t('errNoFile'), "error");
    const optMarkdown = document.getElementById('optMarkdown').checked, optJson = document.getElementById('optJson').checked, optSkipEmpty = document.getElementById('optSkipEmpty').checked;
    const optFm = document.getElementById('optFrontmatter').checked, fmId = document.getElementById('fmId').checked, fmCreated = document.getElementById('fmCreated').checked, fmUpdated = document.getElementById('fmUpdated').checked, fmPinned = document.getElementById('fmPinned').checked;

    if (!optMarkdown && !optJson) return log(t('errFormat'), "error");

    btnStart.disabled = true; logEl.innerHTML = ''; log(t('logRead'));

    try {
        const file = fileInput.files[0], arrayBuffer = await file.arrayBuffer(), view = new Uint8Array(arrayBuffer);
        let magicIdx = -1;
        for (let i = 0; i < view.length - 5; i++) {
            if (view[i]===0x6E && view[i+1]===0x6F && view[i+2]===0x6E && view[i+3]===0x65 && view[i+4]===0x0A) { magicIdx = i; break; }
        }
        if (magicIdx === -1) throw new Error(t('errMagic'));

        log(t('logTar')); await yieldToMain();
        const tarBuffer = arrayBuffer.slice(magicIdx + 5), tarFiles = await parseTar(tarBuffer);
        log(t('logTarDone') + tarFiles.size);

        let dbKey = Array.from(tarFiles.keys()).find(k => k.includes("apps/com.miui.notes/miui_bak/_tmp_bak"));
        if (!dbKey) throw new Error(t('errDb'));

        log(t('logDb')); await yieldToMain();
        const dbData = tarFiles.get(dbKey), [root] = parseProto(dbData), groups = root[6] || [];
        let folders = [], notes = [];

        for (let groupBytes of groups) {
            let [payload] = parseProto(groupBytes);
            if (payload[1]) folders.push(...payload[1].map(processFolder));
            if (payload[2]) notes.push(...payload[2].map(processNote));
        }

        log(t('logFound') + `${folders.length} folders, ${notes.length} notes.`);
        log(t('logZip')); const zip = new JSZip();

        if (optJson) zip.file("notes_database.json", JSON.stringify({ folders, notes }, null, 2));

        if (optMarkdown) {
            const vault = zip.folder("Obsidian_Vault"), attFolder = vault.folder("attachments");
            const attKeys = Array.from(tarFiles.keys()).filter(k => k.includes("apps/com.miui.notes/miui_att/"));
            let processedCount = 0;

            for (let note of notes) {
                try {
                    if (optSkipEmpty && isNoteEmpty(note)) continue;
                    let folderName = sanitizeFilename(note.folder_name || "Without Folder");
                    const noteDir = vault.folder(folderName);
                    let safeTitle = sanitizeFilename(getNoteTitle(note).replace(/<[^>]+>/g, '')) || `Note_${note.id}`;

                    let mediaMap = {};
                    for (let item of note.data_items) {
                        let mime = item.mime_type || "";
                        if (mime && mime !== "vnd.android.cursor.item/text_note") {
                            let rawFilename = item.content || ""; if (!rawFilename) continue;
                            let ext = guessExtension(mime), newFilename = rawFilename;
                            if (ext && !newFilename.toLowerCase().endsWith(ext.toLowerCase())) newFilename += ext;
                            mediaMap[rawFilename] = newFilename;
                            let tarAttKey = attKeys.find(k => k.endsWith(rawFilename));
                            if (tarAttKey) attFolder.file(newFilename, tarFiles.get(tarAttKey));
                        }
                    }

                    if (note.note_type === "mind" && note.mind_map_json && typeof note.mind_map_json === 'object') {
                        try {
                            let rootNode = note.mind_map_json.content?.data || {}, canvasNodes = [], canvasEdges = [];
                            function traverse(n) {
                                if (!n.id) return;
                                let label = (n.label || "").replace(/\\+n/g, '\n');
                                canvasNodes.push({ id: String(n.id), type: "text", text: n.type === "root-node" ? `### ${label}` : label, x: parseInt(n.x||0), y: parseInt(n.y||0), width: parseInt(n.labelWidth||200), height: parseInt(n.labelHeight||60) });
                                for (let child of (n.children || [])) {
                                    if (child.id) { canvasEdges.push({ id: `edge_${n.id}_${child.id}`, fromNode: String(n.id), fromSide: "right", toNode: String(child.id), toSide: "left" }); traverse(child); }
                                }
                            }
                            traverse(rootNode);
                            noteDir.file(`${safeTitle}.canvas`, JSON.stringify({ nodes: canvasNodes, edges: canvasEdges }, null, 2));
                            continue;
                        } catch (e) { log(`Canvas error note ${note.id}: ${e.message}`, "warn"); }
                    }

                    let mdContent = "";
                    for (let item of note.data_items) {
                        if (item.mime_type === "vnd.android.cursor.item/text_note") mdContent += toObsidian(item.content, mediaMap) + "\n";
                    }

                    let finalContent = mdContent;
                    if (optFm) {
                        let fm = "---\n";
                        if (fmId) fm += `id: ${note.id}\n`;
                        if (fmCreated) fm += `created: ${formatTime(note.created_time_ms)}\n`;
                        if (fmUpdated) fm += `updated: ${formatTime(note.modified_time_ms)}\n`;
                        if (fmPinned) fm += `pinned: ${note.pinned_time_ms ? "true" : "false"}\n`;
                        if (note.note_type === "mind") fm += "type: mindmap\n";
                        fm += "---\n\n";
                        finalContent = fm + mdContent;
                    }

                    let fileName = `${safeTitle}.md`, counter = 1;
                    while (noteDir.file(fileName)) { fileName = `${safeTitle}_${counter}.md`; counter++; }
                    noteDir.file(fileName, finalContent);

                } catch (noteErr) { log(`Error note ${note.id}: ${noteErr.message}`, "warn"); }
                processedCount++; if (processedCount % 50 === 0) await yieldToMain();
            }
        }

        log(t('logDone'), "success"); 
        
        // Добавлено сообщение с просьбой поставить звездочку
        log(t('starRepo'), "success");
        
        await yieldToMain();
        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a'); link.href = URL.createObjectURL(content); link.download = "Xiaomi_Notes_Export.zip"; link.click();

    } catch (err) { log(`Error: ${err.message}`, "error"); } 
    finally { btnStart.disabled = false; }
});