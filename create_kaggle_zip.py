import zipfile
import os

def zip_folder(folder_path, output_path):
    print(f"Zipping '{folder_path}' to '{output_path}'...")
    try:
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(folder_path):
                for file in files:
                    # Get the full file path
                    file_path = os.path.join(root, file)
                    
                    # Create a relative path for the archive (e.g., python/api.py)
                    # We want the 'python' folder to be the root inside the zip
                    arcname = os.path.relpath(file_path, os.path.dirname(os.path.abspath(folder_path)))
                    
                    # CRITICAL: Force forward slashes for Linux/Kaggle compatibility
                    arcname = arcname.replace(os.sep, '/')
                    
                    print(f"Adding: {arcname}")
                    zipf.write(file_path, arcname)
        print(f"✅ Successfully created {output_path}")
    except Exception as e:
        print(f"❌ Error creating zip: {e}")

if __name__ == "__main__":
    # Run from the project root
    zip_folder('python', 'python_kaggle.zip')
