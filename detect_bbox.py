from PIL import Image
import sys

def find_content_bbox(image_path, threshold=240):
    """
    Finds the bounding box of non-white content in an image.
    Assumes white background (pixel value > threshold).
    """
    try:
        img = Image.open(image_path).convert("RGB")
        width, height = img.size
        print(f"Analyzing {image_path} ({width}x{height})")

        left, top, right, bottom = width, height, 0, 0
        found = False

        # Load pixels
        pixels = img.load()

        # Simplify: Scan rows and columns to find limits
        # Top
        for y in range(height):
            for x in range(width):
                r, g, b = pixels[x, y]
                if r < threshold or g < threshold or b < threshold:
                    top = y
                    found = True
                    break
            if found: break
        
        if not found:
            print("No content found (image is all white/light).")
            return

        # Bottom
        found = False
        for y in range(height - 1, -1, -1):
            for x in range(width):
                r, g, b = pixels[x, y]
                if r < threshold or g < threshold or b < threshold:
                    bottom = y
                    found = True
                    break
            if found: break

        # Left
        found = False
        for x in range(width):
            for y in range(top, bottom + 1):
                r, g, b = pixels[x, y]
                if r < threshold or g < threshold or b < threshold:
                    left = x
                    found = True
                    break
            if found: break

        # Right
        found = False
        for x in range(width - 1, -1, -1):
            for y in range(top, bottom + 1):
                r, g, b = pixels[x, y]
                if r < threshold or g < threshold or b < threshold:
                    right = x
                    found = True
                    break
            if found: break

        print(f"Content BBox: ({left}, {top}, {right}, {bottom})")
        print(f"Width: {right - left}, Height: {bottom - top}")

        # Also, let's try to detect if there's a distinct "right side" image
        # Assuming the image is on the right half
        mid_x = width // 2
        print(f"\nScanning right half (x > {mid_x})...")
        
        r_left, r_top, r_right, r_bottom = width, height, mid_x, 0
        r_found = False

        # Scan right half
        for y in range(height):
            for x in range(mid_x, width):
                r, g, b = pixels[x, y]
                if r < threshold or g < threshold or b < threshold:
                    if x < r_left: r_left = x
                    if x > r_right: r_right = x
                    if y < r_top: r_top = y
                    if y > r_bottom: r_bottom = y
                    r_found = True
        
        if r_found:
            print(f"Right Side Blob BBox: ({r_left}, {r_top}, {r_right}, {r_bottom})")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        find_content_bbox(sys.argv[1])
    else:
        print("Usage: python detect_bbox.py <image_path>")
