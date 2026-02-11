import fitz  # PyMuPDF
import json
import os

# Configuration
PDF_PATH = "Analyst_Crisis_TACTA_Solution.pdf"
OUTPUT_DIR = "extracted_assets"
JSON_OUTPUT = "content.json"

def extract_content():
    if not os.path.exists(PDF_PATH):
        print(f"Error: PDF not found at {PDF_PATH}")
        return

    # Create output directory for images
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    doc = fitz.open(PDF_PATH)
    presentation_data = {"slides": []}

    for page_num, page in enumerate(doc):
        slide = {
            "page_number": page_num + 1,
            "text_blocks": [],
            "images": []
        }

        # Extract text blocks
        # "dict" returns a dictionary with detailed information
        blocks = page.get_text("dict")["blocks"]
        
        for b in blocks:
            if b["type"] == 0:  # Text block
                for line in b["lines"]:
                    for span in line["spans"]:
                        text_item = {
                            "text": span["text"],
                            "size": span["size"],
                            "font": span["font"],
                            "color": span["color"],
                            "bbox": span["bbox"],  # (x0, y0, x1, y1)
                            "origin": span["origin"]
                        }
                        slide["text_blocks"].append(text_item)

        # Extract images
        image_list = page.get_images(full=True)
        
        for img_index, img in enumerate(image_list):
            xref = img[0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]
            image_ext = base_image["ext"]
            
            image_filename = f"slide_{page_num + 1}_img_{img_index + 1}.{image_ext}"
            image_path = os.path.join(OUTPUT_DIR, image_filename)
            
            with open(image_path, "wb") as f:
                f.write(image_bytes)
            
            # Get image bbox on page (this can be tricky, simplified here)
            # PyMuPDF doesn't give bbox in get_images directly, we need to search for it
            # or just list it as an asset belonging to the slide.
            # For accurate positioning, we would need to search for the image on the page
            # using page.get_image_rects(xref)
            
            rects = page.get_image_rects(xref)
            bboxes = [list(r) for r in rects]

            slide["images"].append({
                "filename": image_filename,
                "path": image_path,
                "bboxes": bboxes
            })

        presentation_data["slides"].append(slide)
        print(f"Processed slide {page_num + 1}")

    # Save structured data to JSON
    with open(JSON_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(presentation_data, f, indent=2, ensure_ascii=False)
    
    print(f"Extraction complete. JSON saved to {JSON_OUTPUT}")

if __name__ == "__main__":
    extract_content()
