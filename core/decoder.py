import os
import json
from .proto import parse_proto, safe_decode

class NotesDecoder:
    def __init__(self, app_data_path: str):
        self.app_data_path = app_data_path

    def get_metadata(self) -> dict:
        meta_path = os.path.join(self.app_data_path, "miui_meta", "_tmp_meta")
        manifest_path = os.path.join(self.app_data_path, "_manifest")
        
        meta_info = {}
        if os.path.exists(meta_path):
            with open(meta_path, 'r', encoding='utf-8') as f:
                lines = [line.strip() for line in f.readlines()]
                if len(lines) >= 9:
                    meta_info['app_version'] = lines[3]
                    meta_info['device_codename'] = lines[7]
                    meta_info['miui_version'] = lines[8]

        if os.path.exists(manifest_path):
            with open(manifest_path, 'r', encoding='utf-8') as f:
                lines = [line.strip() for line in f.readlines()]
                if len(lines) >= 4:
                    meta_info['android_sdk'] = lines[3]

        return meta_info

    def decode_database(self) -> dict:
        db_path = os.path.join(self.app_data_path, "miui_bak", "_tmp_bak")
        if not os.path.exists(db_path):
            raise FileNotFoundError("Database file _tmp_bak not found.")

        with open(db_path, 'rb') as f:
            raw_data = f.read()

        root, _ = parse_proto(raw_data)
        groups = root.get(6, [])
        
        folders = []
        notes = []
        
        for group_bytes in groups:
            payload, _ = parse_proto(group_bytes)
            if 1 in payload:
                folders.extend([self._process_folder(f) for f in payload[1]])
            if 2 in payload:
                notes.extend([self._process_note(n) for n in payload[2]])
                
        return {"metadata": self.get_metadata(), "folders": folders, "notes": notes}

    def _process_folder(self, raw_bytes) -> dict:
        msg, _ = parse_proto(raw_bytes)
        return {
            "id": safe_decode(msg.get(2, [b""])[0]),
            "tag3": msg.get(3, [0])[0],
            "tag4": msg.get(4, [0])[0],
            "created_time_ms": msg.get(5, [0])[0],
            "modified_time_ms": msg.get(6, [0])[0],
            "tag7": msg.get(7, [0])[0],
            "name": safe_decode(msg.get(9, [b""])[0])
        }

    def _process_note(self, raw_bytes) -> dict:
        msg, _ = parse_proto(raw_bytes)
        
        tag16_raw = safe_decode(msg.get(16, [b""])[0])
        mind_map_json = None
        if tag16_raw:
            try:
                clean_raw = tag16_raw[15:] if tag16_raw.startswith("<MiMind Prdfix>") else tag16_raw
                parsed_outer = json.loads(clean_raw)
                if "content" in parsed_outer and isinstance(parsed_outer["content"], str):
                    parsed_outer["content"] = json.loads(parsed_outer["content"])
                mind_map_json = parsed_outer
            except Exception:
                mind_map_json = tag16_raw

        note = {
            "id": safe_decode(msg.get(2, [b""])[0]),
            "tag3": msg.get(3, [0])[0],
            "tag4": msg.get(4, [0])[0],
            "created_time_ms": msg.get(5, [0])[0],
            "modified_time_ms": msg.get(6, [0])[0],
            "tag7": msg.get(7, [0])[0],
            "snippet_preview": safe_decode(msg.get(8, [b""])[0]),
            "folder_name": safe_decode(msg.get(10, [b""])[0]),
            "pinned_time_ms": msg.get(12, [0])[0],
            "bg_color_id": msg.get(13, [0])[0],
            "manual_title": safe_decode(msg.get(14, [b""])[0]),
            "note_type": safe_decode(msg.get(15, [b"common"])[0]),
            "mind_map_json": mind_map_json,
            "mind_map_text": safe_decode(msg.get(17, [b""])[0]),
            "data_items": []
        }
        
        if 9 in msg:
            for item_bytes in msg[9]:
                item_msg, _ = parse_proto(item_bytes)
                note["data_items"].append({
                    "mime_type": safe_decode(item_msg.get(1, [b""])[0]),
                    "created_time_ms": item_msg.get(2, [0])[0],
                    "modified_time_ms": item_msg.get(3, [0])[0],
                    "content": safe_decode(item_msg.get(4, [b""])[0]),
                    "tag5": item_msg.get(5, [0])[0],
                    "tag6": item_msg.get(6, [0])[0],
                    "tag7": safe_decode(item_msg.get(7, [b""])[0]),
                    "tag8": safe_decode(item_msg.get(8, [b""])[0]),
                    "tag9": safe_decode(item_msg.get(9, [b""])[0])
                })
        return note