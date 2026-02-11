import zipfile
import os
from pathlib import Path

def create_colab_package():
    output_filename = "colab_package.zip"
    source_dir = Path("python")
    
    with zipfile.ZipFile(output_filename, "w", zipfile.ZIP_DEFLATED) as zipf:
        # Add python directory
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                if file == "__pycache__" or file.endswith(".pyc"):
                    continue
                file_path = os.path.join(root, file)
                zipf.write(file_path, file_path)
        
        # Add requirements.txt if it exists outside
        if os.path.exists("requirements.txt"):
             zipf.write("requirements.txt", "requirements.txt")
             
        # Add models if they exist (optional, usually downloaded)
        # But here we assume models are downloaded by the script or in the repo
        # If 'models' dir exists, add it
        if os.path.exists("models"):
             for root, dirs, files in os.walk("models"):
                for file in files:
                    file_path = os.path.join(root, file)
                    zipf.write(file_path, file_path)

    print(f"Created {output_filename}. Upload this file to Google Colab.")

if __name__ == "__main__":
    create_colab_package()
