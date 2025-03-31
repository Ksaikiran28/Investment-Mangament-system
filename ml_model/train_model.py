import pandas as pd
import numpy as np
import pickle
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression

# Generate dummy stock data
np.random.seed(42)
investment = np.random.randint(1000, 10000, 100).reshape(-1, 1)
profit = investment * 1.2 + np.random.randint(-1000, 1000, 100).reshape(-1, 1)

# Train model
X_train, X_test, y_train, y_test = train_test_split(investment, profit, test_size=0.2, random_state=42)
model = LinearRegression()
model.fit(X_train, y_train)

# Save model
pickle.dump(model, open("ml_model/stock_model.pkl", "wb"))

print("Model trained and saved successfully!")
