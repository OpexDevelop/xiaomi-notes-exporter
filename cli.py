import argparse
import os
import shutil
import sys
from core.archive import BackupArchive
from core.decoder import NotesDecoder
from core.exporter import Exporter

class DefaultHelpParser(argparse.ArgumentParser):
    def error(self, message):
        sys.stderr.write(f"Error: {message}\n\n")
        self.print_help()
        sys.exit(2)

def main():
    interpreter = "python"
    exec_name = os.path.basename(sys.executable).lower()
    if exec_name.startswith("python3"):
        interpreter = "python3"
    elif exec_name.startswith("py"):
        interpreter = "py"
    
    prog_name = os.path.basename(sys.argv[0])
    cmd = f"{interpreter} {prog_name}"

    parser = DefaultHelpParser(
        description="Python tool for exporting notes from Xiaomi Notes to Markdown (Obsidian) and JSON.",
        formatter_class=argparse.RawTextHelpFormatter,
        epilog=f"""
Examples:
  1. Default export to all formats (JSON & Markdown):
     {cmd} "Notes(com.miui.notes).bak"
     
  2. Export only to Markdown (Obsidian) format in a specific folder:
     {cmd} "Notes(com.miui.notes).bak" -o ./my_vault --format obsidian
     
  3. Export to JSON format only:
     {cmd} "Notes(com.miui.notes).bak" --format json

  4. Export without frontmatter metadata and skip empty notes:
     {cmd} "Notes(com.miui.notes).bak" --no-meta --skip-empty
"""
    )
    
    parser.add_argument(
        "backup_file", 
        help="Path to the Xiaomi Notes backup file (.bak)\n(e.g., 'Notes(com.miui.notes).bak')"
    )
    parser.add_argument(
        "-o", "--output", 
        default="./export_result", 
        help="Directory where extracted data will be saved\n(default: ./export_result)"
    )
    parser.add_argument(
        "--format", 
        choices=["json", "obsidian", "all"], 
        default="all", 
        help="Output format:\n  json     - database exported as a single JSON file\n  obsidian - folders and .md files (Markdown) with attachments\n  all      - exports both formats (default)"
    )
    parser.add_argument(
        "--no-meta",
        action="store_true",
        help="Exclude frontmatter metadata block (ID, dates, etc.) from Markdown files"
    )
    parser.add_argument(
        "--skip-empty",
        action="store_true",
        help="Do not export notes that contain no text and no attachments"
    )
    
    if len(sys.argv) == 1:
        parser.print_help()
        sys.exit(0)
        
    args = parser.parse_args()
    temp_extract_dir = os.path.join(args.output, "_temp_extracted")

    try:
        print(f"Analyzing {os.path.basename(args.backup_file)}...")
        
        archive = BackupArchive(args.backup_file)
        app_data_path = archive.extract_all(temp_extract_dir)

        decoder = NotesDecoder(app_data_path)
        parsed_data = decoder.decode_database()

        exporter = Exporter(
            parsed_data=parsed_data, 
            app_data_path=app_data_path, 
            output_dir=args.output,
            no_meta=args.no_meta,
            skip_empty=args.skip_empty
        )
        
        if args.format in ["json", "all"]:
            exporter.export_json()
            
        if args.format in ["obsidian", "all"]:
            exporter.export_obsidian()

        folders_count = len(parsed_data.get("folders", []))
        notes_count = len(parsed_data.get("notes", []))
        pinned_count = sum(1 for n in parsed_data.get("notes", []) if n.get("pinned_time_ms"))
        mind_count = sum(1 for n in parsed_data.get("notes", []) if n.get("note_type") == "mind")

        print("Success!")
        print(f"{folders_count} folders, {notes_count} notes ({pinned_count} pinned, {mind_count} mindmaps) found.")
        print(f"Exported to {os.path.abspath(args.output)} in {args.format} format.")

    except Exception as e:
        print(f"\nError: {e}")
    
    finally:
        if os.path.exists(temp_extract_dir):
            shutil.rmtree(temp_extract_dir)

if __name__ == "__main__":
    main()