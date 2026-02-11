import json
import os
from PIL import Image

CONFIG_FILE = "crop_config.json"
ASSETS_DIR = "extracted_assets"
OUTPUT_DIR = "recreated_assets"

def crop_images():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    with open(CONFIG_FILE, "r") as f:
        config = json.load(f)

    for slide in config["slides"]:
        page_num = slide["page"]
        src_image_name = f"slide_{page_num}_img_1.png"
        src_path = os.path.join(ASSETS_DIR, src_image_name)
        
        if not os.path.exists(src_path):
            print(f"Source image not found: {src_path}")
            continue

        img = Image.open(src_path)

        for crop in slide["crops"]:
            bbox = tuple(crop["bbox"])
            crop_name = crop["name"]
            
            cropped_img = img.crop(bbox)
            
            output_filename = f"slide_{page_num}_{crop_name}.png"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            
            cropped_img.save(output_path)
            print(f"Saved {output_path}")

if __name__ == "__main__":
    crop_images()
