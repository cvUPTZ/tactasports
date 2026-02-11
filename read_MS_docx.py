import zipfile
import re
import xml.etree.ElementTree as ET
import sys
import os

def read_docx(file_path):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    try:
        with zipfile.ZipFile(file_path) as z:
            xml_content = z.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            
            # fast and loose XML parsing for text in w:t tags
            # The namespace map for docx usually includes w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            # But finding all text nodes recursively is easier
            
            text_content = []
            for elem in tree.iter():
                if elem.tag.endswith('}t'):
                    if elem.text:
                        text_content.append(elem.text)
                elif elem.tag.endswith('}p'):
                    text_content.append('\n') 
            
            print("".join(text_content))
            
    except Exception as e:
        print(f"Error reading docx: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        read_docx(sys.argv[1])
    else:
        print("Please provide a file path")
