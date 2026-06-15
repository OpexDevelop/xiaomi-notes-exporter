# Xiaomi Notes Exporter

Python tool for exporting notes from Xiaomi Notes to Markdown (Obsidian) and JSON. 

It can extract normal notes, attachments, lists, formatting, mind maps, note metadata (folders, creation/modification time, pinned status), etc.

### Where to get the backup file?
1. Settings ➔ About phone ➔ Back up and restore ➔ Mobile device.
2. Select only Notes in Other system app data.
3. The file will be saved at:
MIUI/backup/AllBackup/date_time/Notes(com.miui.notes).bak

## Installation

Ensure you have Python 3.7 or higher installed on your system.

1. Clone this repository:
   ```bash
   git clone https://github.com/OpexDevelop/xiaomi-notes-exporter.git
   cd xiaomi-notes-exporter
   ```

2. Place your `.bak` file in the directory.

## Usage

```bash
python cli.py <path_to_backup_file.bak> [options]
```

### CLI Options

```text
positional arguments:
  backup_file           Path to the Xiaomi Notes backup file (.bak)
                        (e.g., 'Notes(com.miui.notes).bak')

options:
  -h, --help            show this help message and exit
  -o, --output OUTPUT   Directory where extracted data will be saved
                        (default: ./export_result)
  --format {json,obsidian,all}
                        Output format:
                          json     - database exported as a single JSON file
                          obsidian - folders and .md files (Markdown) with attachments
                          all      - exports both formats (default)
  --no-meta             Exclude frontmatter metadata block (ID, dates, etc.) from Markdown files
  --skip-empty          Do not export notes that contain no text and no attachments
```

### Examples

- **Standard Export** (decodes notes and attachments into both JSON and Markdown):
  ```bash
  python cli.py "Notes(com.miui.notes).bak"
  ```

- **Markdown-Only Export without Frontmatter** (excludes metadata blocks and skips empty notes):
  ```bash
  python cli.py "Notes(com.miui.notes).bak" -o ./my_vault --format obsidian --no-meta --skip-empty
  ```

- **JSON DB Dump**:
  ```bash
  python cli.py "Notes(com.miui.notes).bak" --format json
  ```

## Output Structure

```text
export_result/
├── notes_database.json
└── Obsidian_Vault/
    ├── attachments/
    │   ├── 34b29e00cd9d1804d4f684bf4cb558ee2d58f0ca.jpg
    │   └── bb9aa528f08d7af53f5a33858cb275b868621111.mp3
    ├── Folder_Name_1/
    │   └── My_Note_Title.md
    └── Folder_Name_2/
        └── Note_60.md
```

## License

This project is licensed under the MIT License.
