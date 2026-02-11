import fitz
import os

PDF_PATH = "Analyst_Crisis_TACTA_Solution.pdf"
OUTPUT_DIR = "reference_slides"

def extract_reference():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    doc = fitz.open(PDF_PATH)
    
    for page_num, page in enumerate(doc):
        # Render the page to an image (pixmap) instead of extracting embedded images
        # This ensures we get exactly what the slide looks like (text included)
        pix = page.get_pixmap(matrix=fitz.Matrix(1, 1)) # Standard resolution is fine for reading text
        
        output_filename = f"slide_{page_num + 1}_ref.png"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        
        pix.save(output_path)
        print(f"Saved reference {output_path}")

if __name__ == "__main__":
    extract_reference()
