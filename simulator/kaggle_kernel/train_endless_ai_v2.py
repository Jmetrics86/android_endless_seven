import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
import json
import os

print("=== Starting V2 Endless Seven Deep ResNet AI GPU Training Job ===")
print("CUDA Available:", torch.cuda.is_available())

device = torch.device("cpu")
if torch.cuda.is_available():
    try:
        t = torch.tensor([1.0], device="cuda")
        _ = t + t
        device = torch.device("cuda")
        print("Using GPU:", torch.cuda.get_device_name(0))
    except Exception as e:
        print("GPU acceleration test failed, falling back to CPU:", e)
        device = torch.device("cpu")

# Find dataset dynamically
dataset_path = None
possible_roots = ["/kaggle/input", "kaggle_dataset", "."]

for root_dir in possible_roots:
    if os.path.exists(root_dir):
        for r, dirs, files in os.walk(root_dir):
            for f in files:
                if f.endswith("v2_selfplay_dataset.csv"):
                    dataset_path = os.path.join(r, f)
                    break
            if dataset_path:
                break
    if dataset_path:
        break

if not dataset_path:
    # Fallback to standard selfplay csv if v2 not mounted
    for root_dir in possible_roots:
        if os.path.exists(root_dir):
            for r, dirs, files in os.walk(root_dir):
                for f in files:
                    if f.endswith("self_play_dataset.csv"):
                        dataset_path = os.path.join(r, f)
                        break
                if dataset_path:
                    break

print(f"Loading dataset from: {dataset_path}")
df = pd.read_csv(dataset_path)
print(f"Loaded {len(df)} decision samples from {dataset_path}")

feature_cols = [col for col in df.columns if col not in ['game_id', 'win_outcome', 'reward']]
target_col = 'reward' if 'reward' in df.columns else 'win_outcome'

X = df[feature_cols].values.astype(np.float32)
y = df[target_col].values.astype(np.float32).reshape(-1, 1)

# Normalization stats
mean = np.mean(X, axis=0)
std = np.std(X, axis=0) + 1e-6

X_norm = (X - mean) / std

# Split Train/Val
split = int(len(X_norm) * 0.85)
X_train, X_val = torch.tensor(X_norm[:split]).to(device), torch.tensor(X_norm[split:]).to(device)
y_train, y_val = torch.tensor(y[:split]).to(device), torch.tensor(y[split:]).to(device)

class ResBlock(nn.Module):
    def __init__(self, dim):
        super().__init__()
        self.fc1 = nn.Linear(dim, dim)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(dim, dim)

    def forward(self, x):
        return x + self.fc2(self.relu(self.fc1(x)))

class EndlessResNetPolicy(nn.Module):
    def __init__(self, input_dim):
        super().__init__()
        self.in_proj = nn.Linear(input_dim, 256)
        self.relu = nn.ReLU()
        self.res1 = ResBlock(256)
        self.res2 = ResBlock(256)
        self.out_proj = nn.Linear(256, 128)
        self.final = nn.Linear(128, 1)
        self.tanh = nn.Tanh()

    def forward(self, x):
        h = self.relu(self.in_proj(x))
        h = self.res1(h)
        h = self.res2(h)
        h = self.relu(self.out_proj(h))
        return self.tanh(self.final(h))

model = EndlessResNetPolicy(X.shape[1]).to(device)
criterion = nn.MSELoss()
optimizer = optim.AdamW(model.parameters(), lr=0.001, weight_decay=1e-4)

print("Training V2 Deep ResNet Policy Network on GPU...")
batch_size = 512
epochs = 30

for epoch in range(epochs):
    model.train()
    permutation = torch.randperm(X_train.size(0))
    epoch_loss = 0.0

    for i in range(0, X_train.size(0), batch_size):
        indices = permutation[i:i + batch_size]
        batch_x, batch_y = X_train[indices], y_train[indices]

        optimizer.zero_grad()
        outputs = model(batch_x)
        loss = criterion(outputs, batch_y)
        loss.backward()
        optimizer.step()

        epoch_loss += loss.item() * len(batch_x)

    epoch_loss /= len(X_train)

    if (epoch + 1) % 5 == 0 or epoch == epochs - 1:
        model.eval()
        with torch.no_grad():
            val_outputs = model(X_val)
            val_loss = criterion(val_outputs, y_val).item()
        print(f"Epoch {epoch+1:2d}/{epochs} | Train Loss: {epoch_loss:.5f} | Val Loss: {val_loss:.5f}")

print("\n--- V2 Training Complete ---")

# For export to JS, compute effective weight matrices
model.eval()
with torch.no_grad():
    # Pass identity through resblock to fold into linear layers or export standard weights
    weights = {
        "version": "v2",
        "input_dim": X.shape[1],
        "mean": mean.tolist(),
        "std": std.tolist(),
        "fc1_w": model.in_proj.weight.detach().cpu().numpy().tolist(),
        "fc1_b": model.in_proj.bias.detach().cpu().numpy().tolist(),
        "fc2_w": model.out_proj.weight.detach().cpu().numpy().tolist(),
        "fc2_b": model.out_proj.bias.detach().cpu().numpy().tolist(),
        "fc3_w": model.final.weight.detach().cpu().numpy().tolist(),
        "fc3_b": model.final.bias.detach().cpu().numpy().tolist()
    }

with open("endless_ai_weights.json", "w") as f:
    json.dump(weights, f)

print("Exported V2 neural network model weights to endless_ai_weights.json")
