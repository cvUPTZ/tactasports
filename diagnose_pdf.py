import fitz

PDF_PATH = "Analyst_Crisis_TACTA_Solution.pdf"

def diagnose_pdf():
    doc = fitz.open(PDF_PATH)
    page = doc[0] # Check first page
    
    # Check text again
    text = page.get_text()
    print(f"--- Text on Page 1 ---\n{text if text.strip() else 'NO TEXT FOUND'}\n----------------------")
    
    # Check drawings (vector graphics)
    drawings = page.get_drawings()
    print(f"Number of drawings on Page 1: {len(drawings)}")
    if drawings:
        print("Sample drawing:", drawings[0])

    # Check for other objects
    print(f"Page content: {page.read_contents()}")

if __name__ == "__main__":
    diagnose_pdf()
