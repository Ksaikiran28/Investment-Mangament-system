from flask import Flask, request, jsonify
import numpy as np
import pickle
from flask_cors import CORS  # Allow frontend requests

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Load trained model
model = pickle.load(open("ml_model/stock_model.pkl", "rb"))

@app.route("/", methods=["GET"])
def home():
    return "Stock Prediction API is running!"

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    amount = float(data["amount"])

    # Predict profit & loss using AI model
    predicted_profit = model.predict(np.array([[amount]]))[0][0]
    predicted_loss = predicted_profit * 0.35  # 35% of profit assumed as loss

    # **Final Risk Calculation**
    risk_ratio = (predicted_loss / amount) * 100  # Loss as % of investment

    if predicted_loss > 10000 or risk_ratio > 50:  
        risk_level = "High"  
    elif predicted_loss > 3000 or risk_ratio > 30:  
        risk_level = "Medium"  
    elif predicted_loss > 500 or risk_ratio > 10:  
        risk_level = "Low"  
    else:  
        risk_level = "Very Low"  

    return jsonify({
        "investment": amount,
        "predicted_profit": predicted_profit,
        "predicted_loss": predicted_loss,
        "risk": risk_level
    })

if __name__ == "__main__":
    app.run(debug=True)
