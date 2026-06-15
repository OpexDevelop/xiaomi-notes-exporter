import tarfile
import os
import shutil

class BackupArchive:
    def __init__(self, backup_path: str):
        self.backup_path = backup_path

    def extract_all(self, extract_to: str) -> str:
        if not os.path.exists(self.backup_path):
            raise FileNotFoundError(f"File not found: {self.backup_path}")
        
        os.makedirs(extract_to, exist_ok=True)
        clean_tar_path = os.path.join(extract_to, "clean_backup.tar")
        
        with open(self.backup_path, 'rb') as f_in, open(clean_tar_path, 'wb') as f_out:
            header_chunk = f_in.read(1024)
            magic_idx = header_chunk.find(b"none\n")
            
            if magic_idx == -1:
                raise ValueError("Invalid backup format.")
            
            tar_start = magic_idx + 5
            f_out.write(header_chunk[tar_start:])
            shutil.copyfileobj(f_in, f_out)

        with tarfile.open(clean_tar_path, "r:") as tar:
            tar.extractall(path=extract_to)
            
        os.remove(clean_tar_path)
        
        app_data_path = os.path.join(extract_to, "apps", "com.miui.notes")
        if not os.path.exists(app_data_path):
            raise ValueError("apps/com.miui.notes/ not found in archive.")
        
        return app_data_path 