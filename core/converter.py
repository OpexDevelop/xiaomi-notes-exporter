import re

class MarkdownConverter:
    @staticmethod
    def to_obsidian(html_text: str, media_map: dict) -> str:
        if not html_text:
            return ""
            
        text = html_text

        text = re.sub(r'<input[^>]*checked="true"[^>]*type="checkbox"[^>]*>', r'- [x] ', text)
        text = re.sub(r'<input[^>]*type="checkbox"[^>]*checked="true"[^>]*>', r'- [x] ', text)
        text = re.sub(r'<input[^>]*type="checkbox"[^>]*>', r'- [ ] ', text)

        text = re.sub(r'<bullet\s*/>\s*', r'- ', text)
        text = re.sub(r'<u>(.*?)</u>', r'\1', text)

        def replace_xml_media(match):
            fileid = match.group(2)
            filename = media_map.get(fileid, fileid)
            return f"![[{filename}]]"

        text = re.sub(r'<(sound|image|file)\s+fileid="([^"]+)"\s*/>', replace_xml_media, text)

        def replace_hash_media(match):
            file_hash = match.group(1)
            if file_hash in media_map:
                return f"![[{media_map[file_hash]}]]"
            return match.group(0)

        text = re.sub(r'(?:☺|\xef\xbf\xbc)?\s*([a-f0-9]{40})(?:<[^>]*>)*', replace_hash_media, text)

        text = re.sub(r'<b>(.*?)</b>', r'**\1**', text, flags=re.DOTALL)
        text = re.sub(r'<i>(.*?)</i>', r'*\1*', text, flags=re.DOTALL)

        return text