import tkinter as tk
from tkinter import messagebox, simpledialog
import cv2
import numpy as np
from PIL import Image, ImageTk, ImageGrab
from ultralytics import YOLO
from collections import deque
import torch
import sys

# ================= AI ENGINE (YOLOv8) =================
class AI_Tracker:
    def __init__(self, model_size="yolov8n.pt"):
        self.model_path = model_size
        self.model = None
        self.ball_trace = deque(maxlen=30) # Remembers last 30 frames (The "Tail")
        
    def load_model(self):
        """Safely loads YOLOv8 with PyTorch 2.6 fix"""
        if self.model is not None: return

        print("🧠 Loading AI Model...")
        # --- PYTORCH 2.6 SECURITY PATCH ---
        _original_load = torch.load
        def patched_load(*args, **kwargs):
            if 'weights_only' not in kwargs: kwargs['weights_only'] = False
            return _original_load(*args, **kwargs)
            
        try:
            torch.load = patched_load
            self.model = YOLO(self.model_path)
        finally:
            torch.load = _original_load
        print("✅ AI Ready.")

    def run_tracking(self, video_path, start_seconds=0):
        self.load_model()
        
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        # Seek to start time
        cap.set(cv2.CAP_PROP_POS_MSEC, start_seconds * 1000)
        
        print(f"⚡ Starting Video at {start_seconds}s...")

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret: break
            
            # 1. AI PREDICTION
            # conf=0.25 is a good balance for balls
            results = self.model.track(frame, persist=True, verbose=False, conf=0.25)
            
            # 2. FIND BALL
            ball_center = None
            
            if results[0].boxes.id is not None:
                boxes = results[0].boxes.xyxy.cpu().numpy()
                classes = results[0].boxes.cls.cpu().numpy()
                
                for box, cls in zip(boxes, classes):
                    # Class 32 = Sports Ball (COCO Dataset)
                    if int(cls) == 32:
                        x1, y1, x2, y2 = map(int, box)
                        ball_center = (int((x1+x2)/2), int((y1+y2)/2))
                        
                        # Draw Box around ball
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 255), 2)
                        break # Only track one ball

            # 3. UPDATE TRACE (The "Comet Tail")
            if ball_center:
                self.ball_trace.append(ball_center)
            else:
                # If ball is lost briefly, we don't clear the trace immediately
                # but if lost for long, we might want to break the line.
                pass 

            # 4. DRAW TRACE
            for i in range(1, len(self.ball_trace)):
                if self.ball_trace[i-1] is None or self.ball_trace[i] is None:
                    continue
                
                # Thickness fades out (Oldest points are thin, newest are thick)
                thickness = int(np.sqrt(64 / float(len(self.ball_trace) - i + 1)) * 2)
                cv2.line(frame, self.ball_trace[i-1], self.ball_trace[i], (0, 0, 255), thickness)

            # 5. DISPLAY
            # Add timecode
            current_time = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000.0
            cv2.putText(frame, f"Time: {current_time:.1f}s", (20, 40), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            
            cv2.putText(frame, "PRESS 'Q' TO STOP", (20, 80), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 100, 100), 1)

            cv2.imshow("AI Ball Tracker (Max Level)", frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        cap.release()
        cv2.destroyAllWindows()

# ================= GUI STUDIO =================
class FootballStudio:
    def __init__(self, root):
        self.root = root
        self.root.title("⚽ Max Level AI Studio")
        self.root.geometry("1280x800")
        
        self.video_path = "match.mp4" # DEFAULT VIDEO
        self.ai_tracker = AI_Tracker()
        
        self._setup_ui()

    def _setup_ui(self):
        # --- TOP TOOLBAR ---
        toolbar = tk.Frame(self.root, bd=1, relief=tk.RAISED, bg="#222")
        toolbar.pack(side=tk.TOP, fill=tk.X)
        
        style_lbl = {"bg": "#222", "fg": "white", "font": ("Arial", 10)}
        style_btn = {"bg": "#444", "fg": "white", "relief": tk.FLAT, "padx": 10}
        style_accent = {"bg": "#007acc", "fg": "white", "relief": tk.FLAT, "padx": 15, "font": ("Arial", 10, "bold")}

        # Input: Start Time
        tk.Label(toolbar, text="Start Time (sec):", **style_lbl).pack(side=tk.LEFT, padx=5)
        self.entry_time = tk.Entry(toolbar, width=6)
        self.entry_time.insert(0, "0") # Default 0 seconds
        self.entry_time.pack(side=tk.LEFT, padx=5)

        # Button: RUN AI
        btn_run = tk.Button(toolbar, text="▶ START PROCESSING", command=self.start_processing, **style_accent)
        btn_run.pack(side=tk.LEFT, padx=20, pady=10)
        
        # Button: Paste Frame (Legacy feature)
        tk.Button(toolbar, text="📸 Snapshot", command=self.snapshot, **style_btn).pack(side=tk.LEFT, padx=5)

        # --- CANVAS ---
        self.canvas_frame = tk.Frame(self.root, bg="#111")
        self.canvas_frame.pack(fill=tk.BOTH, expand=True)
        
        self.canvas = tk.Canvas(self.canvas_frame, bg="#111", highlightthickness=0)
        self.canvas.pack(fill=tk.BOTH, expand=True)
        
        # Placeholder Text
        self.canvas.create_text(640, 400, text="Ready to Process.\nEnter Start Time and Click START.", 
                               fill="#555", font=("Arial", 20))

    def start_processing(self):
        # 1. Get Time
        try:
            time_str = self.entry_time.get()
            if ":" in time_str:
                # Handle "10:30" format
                m, s = map(int, time_str.split(":"))
                start_sec = m * 60 + s
            else:
                # Handle "630" format
                start_sec = int(time_str)
        except ValueError:
            messagebox.showerror("Error", "Invalid Time Format. Use seconds (e.g. '10') or mm:ss")
            return

        # 2. Run AI (This opens a CV2 window)
        self.root.minimize() # Hide GUI temporarily
        try:
            self.ai_tracker.run_tracking(self.video_path, start_seconds=start_sec)
        except Exception as e:
            messagebox.showerror("AI Error", str(e))
        finally:
            self.root.deiconify() # Bring GUI back

    def snapshot(self):
        # Just grab the first frame for the canvas background
        cap = cv2.VideoCapture(self.video_path)
        ret, frame = cap.read()
        cap.release()
        if ret:
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            self.pil_image = Image.fromarray(frame)
            self.tk_image = ImageTk.PhotoImage(self.pil_image)
            self.canvas.create_image(0, 0, image=self.tk_image, anchor=tk.NW)

def main():
    # Fix for high-DPI displays (Windows)
    try:
        from ctypes import windll
        windll.shcore.SetProcessDpiAwareness(1)
    except:
        pass
        
    root = tk.Tk()
    app = FootballStudio(root)
    root.mainloop()

if __name__ == "__main__":
    main()