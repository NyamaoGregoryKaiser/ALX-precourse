```python
# inference-service/app.py
import pickle
import os
import json
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
import logging
import time

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Directory where models are stored
MODEL_DIR = os.environ.get("MODEL_DIR", "./model")

# Dummy model for demonstration
# In a real scenario, you would load a model based on model_path from the request
# For this example, we'll create a dummy model if it doesn't exist
DUMMY_MODEL_PATH = os.path.join(MODEL_DIR, "sample_model.pkl")

class DummyPredictor:
    def predict(self, data):
        """
        Dummy prediction: sums numerical values, concatenates strings, or returns a fixed value.
        For demonstration, assumes input_data is a dictionary.
        """
        if not isinstance(data, dict):
            return {"error": "Input data must be a dictionary"}

        results = {}
        for key, value in data.items():
            if isinstance(value, (int, float)):
                results[key] = value * 2 # Double the number
            elif isinstance(value, str):
                results[key] = f"processed_{value}" # Prefix string
            elif isinstance(value, list):
                if all(isinstance(x, (int, float)) for x in value):
                    results[key] = sum(value)
                else:
                    results[key] = [f"item_{x}" for x in value]
            else:
                results[key] = f"unhandled_type_{type(value).__name__}"
        return results

    def __str__(self):
        return "DummyPredictor (always returns 0.5 for demonstration)"

# Create a dummy model file if it doesn't exist
def create_dummy_model():
    if not os.path.exists(MODEL_DIR):
        os.makedirs(MODEL_DIR)
    if not os.path.exists(DUMMY_MODEL_PATH):
        with open(DUMMY_MODEL_PATH, 'wb') as f:
            pickle.dump(DummyPredictor(), f)
        logger.info(f"Created dummy model at {DUMMY_MODEL_PATH}")
    else:
        logger.info(f"Dummy model already exists at {DUMMY_MODEL_PATH}")

# Call this once when the app starts
create_dummy_model()

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON input"}), 400

        model_path = data.get("model_path")
        input_data = data.get("input_data")

        if not model_path:
            return jsonify({"error": "Missing 'model_path' in request"}), 400
        if not input_data:
            return jsonify({"error": "Missing 'input_data' in request"}), 400

        # Simulate model loading and prediction
        # In a real system, you'd load the specific model_path provided
        # For this example, we'll always use our dummy model, but log the requested path
        logger.info(f"Received prediction request for model_path: {model_path}")
        logger.debug(f"Input data: {json.dumps(input_data)}")

        # Load the dummy model
        with open(DUMMY_MODEL_PATH, 'rb') as f:
            model = pickle.load(f)

        # Simulate a delay for inference
        time.sleep(0.05) # 50ms delay

        prediction_result = model.predict(input_data)

        return jsonify({"prediction": prediction_result}), 200

    except Exception as e:
        logger.error(f"Error during prediction: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Use Gunicorn for production or Flask's dev server directly for local testing
    # When run via docker-compose, gunicorn will be used based on Dockerfile CMD
    app.run(host='0.0.0.0', port=5001, debug=True)

```