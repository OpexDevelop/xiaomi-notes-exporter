import os
import json
import shutil
import re
import mimetypes
from datetime import datetime
from .converter import MarkdownConverter

class Exporter:
    def __init__(self, parsed_data: dict, app_data_path: str, output_dir: str, no_meta: bool = False, skip_empty: bool = False):
        self.data = parsed_data
        self.app_data_path = app_data_path
        self.output_dir = output_dir
        self.no_meta = no_meta
        self.skip_empty = skip_empty
        self.att_dir = os.path.join(self.app_data_path, "miui_att")

    def export_json(self):
        os.makedirs(self.output_dir, exist_ok=True)
        out_file = os.path.join(self.output_dir, "notes_database.json")
        with open(out_file, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)

    def export_obsidian(self):
        vault_dir = os.path.join(self.output_dir, "Obsidian_Vault")
        attachments_dir = os.path.join(vault_dir, "attachments")
        os.makedirs(attachments_dir, exist_ok=True)

        for note in self.data["notes"]:
            if self.skip_empty and self._is_note_empty(note):
                continue

            folder_name = note.get("folder_name") or "Without Folder"
            folder_name = self._sanitize_filename(folder_name)
            note_dir = os.path.join(vault_dir, folder_name)
            os.makedirs(note_dir, exist_ok=True)

            title = self._get_note_title(note)
            safe_title = self._sanitize_filename(title)

            media_map = {}
            for item in note.get("data_items", []):
                mime = item.get("mime_type", "")
                if mime and mime != "vnd.android.cursor.item/text_note":
                    raw_filename = item.get("content", "")
                    if not raw_filename:
                        continue
                    
                    ext = mimetypes.guess_extension(mime) or ""
                    if ext == ".jpe":
                        ext = ".jpg"
                        
                    new_filename = raw_filename
                    if ext and not new_filename.lower().endswith(ext.lower()):
                        new_filename += ext
                        
                    media_map[raw_filename] = new_filename
                    
                    src = os.path.join(self.att_dir, raw_filename)
                    dst = os.path.join(attachments_dir, new_filename)
                    if os.path.exists(src) and not os.path.exists(dst):
                        shutil.copy2(src, dst)
                        
                        item_mod_time = item.get("modified_time_ms")
                        if item_mod_time:
                            t_sec = item_mod_time / 1000.0
                            try:
                                os.utime(dst, (t_sec, t_sec))
                            except Exception:
                                pass

            if note.get("note_type") == "mind" and isinstance(note.get("mind_map_json"), dict):
                try:
                    root_node = note["mind_map_json"].get("content", {}).get("data", {})
                    canvas_nodes = []
                    canvas_edges = []
                    
                    def traverse(n):
                        nid = n.get("id")
                        if not nid:
                            return
                        label = n.get("label", "")
                        label = re.sub(r'\\+n', '\n', label)
                        
                        x = n.get("x", 0)
                        y = n.get("y", 0)
                        w = n.get("labelWidth", 200)
                        h = n.get("labelHeight", 60)
                        
                        canvas_nodes.append({
                            "id": str(nid),
                            "type": "text",
                            "text": f"### {label}" if n.get("type") == "root-node" else label,
                            "x": int(x) if x is not None else 0,
                            "y": int(y) if y is not None else 0,
                            "width": int(w) if w else 200,
                            "height": int(h) if h else 60
                        })
                        
                        for child in n.get("children", []):
                            child_id = child.get("id")
                            if child_id:
                                canvas_edges.append({
                                    "id": f"edge_{nid}_{child_id}",
                                    "fromNode": str(nid),
                                    "fromSide": "right",
                                    "toNode": str(child_id),
                                    "toSide": "left"
                                })
                                traverse(child)
                    
                    traverse(root_node)
                    
                    canvas_data = {
                        "nodes": canvas_nodes,
                        "edges": canvas_edges
                    }
                    
                    canvas_path = os.path.join(note_dir, f"{safe_title}.canvas")
                    with open(canvas_path, 'w', encoding='utf-8') as f:
                        json.dump(canvas_data, f, indent=2, ensure_ascii=False)
                    
                    note_mod_time = note.get("modified_time_ms")
                    if note_mod_time:
                        t_sec = note_mod_time / 1000.0
                        try:
                            os.utime(canvas_path, (t_sec, t_sec))
                        except Exception:
                            pass
                    continue
                except Exception:
                    pass

            md_content = ""
            for item in note.get("data_items", []):
                if item["mime_type"] == "vnd.android.cursor.item/text_note":
                    md_content += MarkdownConverter.to_obsidian(item["content"], media_map) + "\n"

            if not self.no_meta:
                created_str = self._format_time(note["created_time_ms"])
                updated_str = self._format_time(note["modified_time_ms"])
                is_pinned = "true" if note.get("pinned_time_ms") else "false"
                
                frontmatter = f"---\nid: {note['id']}\ncreated: {created_str}\nupdated: {updated_str}\npinned: {is_pinned}\n"
                if note.get("note_type") == "mind":
                    frontmatter += "type: mindmap\n"
                frontmatter += "---\n\n"
                md_content = frontmatter + md_content

            file_path = os.path.join(note_dir, f"{safe_title}.md")
            counter = 1
            while os.path.exists(file_path):
                file_path = os.path.join(note_dir, f"{safe_title}_{counter}.md")
                counter += 1

            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(md_content)

            note_mod_time = note.get("modified_time_ms")
            if note_mod_time:
                t_sec = note_mod_time / 1000.0
                try:
                    os.utime(file_path, (t_sec, t_sec))
                except Exception:
                    pass

    def _get_note_title(self, note) -> str:
        title = note.get("manual_title", "").strip()
        if title:
            return title

        snippet = note.get("snippet_preview", "").strip()
        if snippet:
            first_line = snippet.split('\n')[0].strip()
            first_line = re.sub(r'<[^>]+>', '', first_line).strip()
            if first_line:
                return first_line[:40]

        for item in note.get("data_items", []):
            if item.get("mime_type") == "vnd.android.cursor.item/text_note":
                content = item.get("content", "").strip()
                if content:
                    clean_content = re.sub(r'<[^>]+>', '', content).strip()
                    first_line = clean_content.split('\n')[0].strip()
                    if first_line:
                        return first_line[:40]

        if note.get("note_type") == "mind" and note.get("mind_map_text"):
            text = note.get("mind_map_text", "").strip()
            if text:
                first_line = text.split('\n')[0].strip()
                if first_line:
                    return first_line[:40]

        return f"Note_{note['id']}"

    def _is_note_empty(self, note) -> bool:
        if note.get("manual_title", "").strip():
            return False
        if note.get("snippet_preview", "").strip():
            return False
        if note.get("note_type") == "mind" and (note.get("mind_map_json") or note.get("mind_map_text")):
            return False
            
        for item in note.get("data_items", []):
            if item.get("mime_type") == "vnd.android.cursor.item/text_note":
                if item.get("content", "").strip():
                    return False
            else:
                return False
        return True

    @staticmethod
    def _sanitize_filename(name: str) -> str:
        return re.sub(r'[\\/*?:"<>|]', "", name).strip()

    @staticmethod
    def _format_time(ms: int) -> str:
        try:
            return datetime.fromtimestamp(ms / 1000.0).strftime('%Y-%m-%d %H:%M:%S')
        except:
            return ""