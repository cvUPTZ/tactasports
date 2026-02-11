import os
import json
import tempfile
from pathlib import Path
from cog import BasePredictor, Input, Path as CogPath

# Import your analysis modules
import sys
sys.path.insert(0, './python')

from soccer_analysis_processor import SoccerMatchAnalyzer, AnalysisConfig
from soccer_analysis_core import logger
import numpy as np


class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NumpyEncoder, self).default(obj)


class Predictor(BasePredictor):
    def setup(self):
        """Load the model into memory to make running multiple predictions efficient"""
        # Model will be loaded on first prediction
        pass

    def predict(
        self,
        video: CogPath = Input(description="Input video file"),
        confidence_threshold: float = Input(
            description="Detection confidence threshold", 
            default=0.3, 
            ge=0.1, 
            le=0.9
        ),
        generate_video: bool = Input(
            description="Generate annotated output video", 
            default=False
        ),
    ) -> dict:
        """Run soccer match analysis"""
        
        # Create config
        config = AnalysisConfig(confidence_threshold=confidence_threshold)
        
        # Create analyzer
        analyzer = SoccerMatchAnalyzer(config)
        
        # Run analysis
        results = analyzer.analyze(
            video_path=str(video),
            clips=None,
            homography_matrix=None,
            generate_annotated_video=generate_video
        )
        
        # Convert numpy types for JSON serialization
        results_json = json.loads(json.dumps(results, cls=NumpyEncoder))
        
        return results_json
