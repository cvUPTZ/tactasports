import cv2
import numpy as np

# -----------------------------
# Load image
# -----------------------------
image = cv2.imread("screenshot.jpg")
if image is None:
    raise ValueError("Image not found")

original = image.copy()

# -----------------------------
# Convert to HSV
# -----------------------------
hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

# -----------------------------
# Mask white pitch lines
# -----------------------------
# White color range in HSV
lower_white = np.array([0, 0, 180])
upper_white = np.array([180, 60, 255])

mask = cv2.inRange(hsv, lower_white, upper_white)

# -----------------------------
# Morphological cleanup
# -----------------------------
kernel = np.ones((5, 5), np.uint8)
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

# -----------------------------
# Edge detection
# -----------------------------
edges = cv2.Canny(mask, 50, 150, apertureSize=3)

# -----------------------------
# Hough Line Transform
# -----------------------------
lines = cv2.HoughLinesP(
    edges,
    rho=1,
    theta=np.pi / 180,
    threshold=120,
    minLineLength=80,
    maxLineGap=20
)

# -----------------------------
# Draw detected lines
# -----------------------------
if lines is not None:
    for line in lines:
        x1, y1, x2, y2 = line[0]
        cv2.line(original, (x1, y1), (x2, y2), (0, 0, 255), 2)

# -----------------------------
# Display results
# -----------------------------
cv2.imshow("Original", image)
cv2.imshow("White Mask", mask)
cv2.imshow("Edges", edges)
cv2.imshow("Detected Pitch Lines", original)

cv2.waitKey(0)
cv2.destroyAllWindows()
