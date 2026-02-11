import numpy as np
from sklearn.cluster import KMeans
from models.reid_model import ReIDModel

class EmbeddingExtractor:
    def __init__(self):
        self.model = ReIDModel()
        
    def get_player_crops(self, frame, detections):
        crops = []
        h, w = frame.shape[:2]
        for box in detections.xyxy:
            x1, y1, x2, y2 = map(int, box)
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w, x2), min(h, y2)
            if x2 > x1 and y2 > y1:
                crops.append(frame[y1:y2, x1:x2])
            else:
                crops.append(np.zeros((10, 10, 3), dtype=np.uint8))
        return crops

    def extract(self, crops):
        # ReIDModel works on boxes. We can mock a list of boxes for the crops
        # Or just use the model directly on crops.
        # But ReIDModel.extract_features takes boxes and the WHOLE frame.
        # Let's simplify and just use color histogram if we don't want to overcomplicate.
        # Actually, let's use the ReIDModel logic.
        features = []
        for crop in crops:
            if crop.size == 0:
                features.append(np.zeros(2048))
                continue
            # Use ReIDModel transformations
            t_crop = self.model.transforms(crop).unsqueeze(0).to(self.model.device)
            import torch
            with torch.no_grad():
                f = self.model.model(t_crop).view(-1).cpu().numpy()
                # Normalize
                f = f / (np.linalg.norm(f) + 1e-6)
                features.append(f)
        return np.array(features)

class ClusteringManager:
    def __init__(self, n_clusters=2):
        self.n_clusters = n_clusters
        self.embedding_extractor = EmbeddingExtractor()
        self.kmeans = KMeans(n_clusters=n_clusters, n_init=10)
        
    def train_clustering_models(self, crops):
        features = self.embedding_extractor.extract(crops)
        labels = self.kmeans.fit_predict(features)
        return labels, None, None
