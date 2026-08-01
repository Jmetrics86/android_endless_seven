import csv
import numpy as np
import json
import os

print("=== Starting NumPy Neural Network Training ===")

dataset_file = "kaggle_dataset/self_play_dataset.csv"
if not os.path.exists(dataset_file):
    print("Dataset not found!")
    exit(1)

rows = []
with open(dataset_file, "r") as f:
    reader = csv.DictReader(f)
    for row in reader:
        rows.append([
            float(row['round']),
            float(row['is_enemy']),
            float(row['my_seals']),
            float(row['opp_seals']),
            float(row['hand_champions']),
            float(row['hand_total_power']),
            float(row['slot_index']),
            float(row['card_power']),
            float(row['card_is_champion']),
            float(row['card_has_haste']),
            float(row['opp_slot_power']),
            float(row['win_outcome'])
        ])

data = np.array(rows, dtype=np.float32)
print(f"Loaded {len(data)} decision samples from {dataset_file}")

X = data[:, :-1]
y = data[:, -1:].reshape(-1, 1)

# Normalization stats
mean = np.mean(X, axis=0)
std = np.std(X, axis=0) + 1e-6

X_norm = (X - mean) / std

# Xavier Initialization
np.random.seed(42)
input_dim = X.shape[1]
h1_dim = 64
h2_dim = 32

W1 = np.random.randn(input_dim, h1_dim).astype(np.float32) * np.sqrt(2.0 / input_dim)
b1 = np.zeros((1, h1_dim), dtype=np.float32)

W2 = np.random.randn(h1_dim, h2_dim).astype(np.float32) * np.sqrt(2.0 / h1_dim)
b2 = np.zeros((1, h2_dim), dtype=np.float32)

W3 = np.random.randn(h2_dim, 1).astype(np.float32) * np.sqrt(2.0 / h2_dim)
b3 = np.zeros((1, 1), dtype=np.float32)

lr = 0.01
batch_size = 512
epochs = 15

num_samples = X_norm.shape[0]

for epoch in range(epochs):
    indices = np.random.permutation(num_samples)
    epoch_loss = 0.0

    for i in range(0, num_samples, batch_size):
        batch_idx = indices[i:i + batch_size]
        xb = X_norm[batch_idx]
        yb = y[batch_idx]

        # Forward pass
        z1 = np.dot(xb, W1) + b1
        a1 = np.maximum(0, z1)

        z2 = np.dot(a1, W2) + b2
        a2 = np.maximum(0, z2)

        z3 = np.dot(a2, W3) + b3
        out = np.tanh(z3)

        loss = np.mean((out - yb) ** 2)
        epoch_loss += loss * len(xb)

        # Backprop
        dout = 2 * (out - yb) / len(xb)
        dtanh = dout * (1.0 - out ** 2)

        dW3 = np.dot(a2.T, dtanh)
        db3 = np.sum(dtanh, axis=0, keepdims=True)

        da2 = np.dot(dtanh, W3.T)
        dz2 = da2 * (z2 > 0)

        dW2 = np.dot(a1.T, dz2)
        db2 = np.sum(dz2, axis=0, keepdims=True)

        da1 = np.dot(dz2, W2.T)
        dz1 = da1 * (z1 > 0)

        dW1 = np.dot(xb.T, dz1)
        db1 = np.sum(dz1, axis=0, keepdims=True)

        # SGD Update
        W3 -= lr * dW3
        b3 -= lr * db3
        W2 -= lr * dW2
        b2 -= lr * db2
        W1 -= lr * dW1
        b1 -= lr * db1

    epoch_loss /= num_samples
    print(f"Epoch {epoch+1:2d}/{epochs} | Loss: {epoch_loss:.5f}")

print("\nNumPy Neural Network Training Complete.")

# Export weights for Node.js
weights = {
    "mean": mean.tolist(),
    "std": std.tolist(),
    "fc1_w": W1.T.tolist(),
    "fc1_b": b1.reshape(-1).tolist(),
    "fc2_w": W2.T.tolist(),
    "fc2_b": b2.reshape(-1).tolist(),
    "fc3_w": W3.T.tolist(),
    "fc3_b": b3.reshape(-1).tolist()
}

with open("endless_ai_weights.json", "w") as f:
    json.dump(weights, f)

print("Saved trained weights to endless_ai_weights.json")
