import os
import requests
import sys

MODELS = {
    "yolov10n.pt": "https://github.com/THU-MIG/yolov10/releases/download/v1.1/yolov10n.pt",
    "yolov10s.pt": "https://github.com/THU-MIG/yolov10/releases/download/v1.1/yolov10s.pt",
    "yolov10m.pt": "https://github.com/THU-MIG/yolov10/releases/download/v1.1/yolov10m.pt",
    "yolov10b.pt": "https://github.com/THU-MIG/yolov10/releases/download/v1.1/yolov10b.pt",
    "yolov10l.pt": "https://github.com/THU-MIG/yolov10/releases/download/v1.1/yolov10l.pt",
    "yolov10x.pt": "https://github.com/THU-MIG/yolov10/releases/download/v1.1/yolov10x.pt",
}

def download_file(url, filename):
    print(f"Downloading {filename}...")
    response = requests.get(url, stream=True)
    total_size = int(response.headers.get('content-length', 0))
    block_size = 1024
    wrote = 0
    
    with open(filename, 'wb') as f:
        for data in response.iter_content(block_size):
            wrote = wrote + len(data)
            f.write(data)
            done = int(50 * wrote / total_size)
            sys.stdout.write(f"\r[{'=' * done}{' ' * (50-done)}] {wrote}/{total_size} bytes")
            sys.stdout.flush()
    print(f"\nSaved to {filename}")

def check_and_download_models(target_dir='python/models/weights'):
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)
        
    # Default to YOLOv10x for best accuracy, or 's' for speed
    target_model = "yolov10x.pt" 
    
    file_path = os.path.join(target_dir, target_model)
    if not os.path.exists(file_path):
        print(f"Model {target_model} not found.")
        download_file(MODELS[target_model], file_path)
    else:
        print(f"Model {target_model} already exists.")

if __name__ == "__main__":
    check_and_download_models()
