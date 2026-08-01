import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
import json
import os

print("=== Starting Endless Seven Deep Neural AI GPU Training Job ===")
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
                if f.endswith("self_play_dataset.csv"):
                    dataset_path = os.path.join(r, f)
                    break
            if dataset_path:
                break
    if dataset_path:
        break

if not dataset_path:
    raise FileNotFoundError("Could not find self_play_dataset.csv in /kaggle/input or local directories!")

print(f"Loading dataset from: {dataset_path}")
df = pd.read_csv(dataset_path)
print(f"Loaded {len(df)} decision samples from {dataset_path}")

feature_cols = [
    'round', 'is_enemy', 'my_seals', 'opp_seals', 
    'hand_champions', 'hand_total_power', 'slot_index', 
    'card_power', 'card_is_champion', 'card_has_haste', 'opp_slot_power'
]

X = df[feature_cols].values.astype(np.float32)
y = df['win_outcome'].values.astype(np.float32).reshape(-1, 1)

# Normalization stats
mean = np.mean(X, axis=0)
std = np.std(X, axis=0) + 1e-6

X_norm = (X - mean) / std

# Split Train/Val
split = int(len(X_norm) * 0.85)
X_train, X_val = torch.tensor(X_norm[:split]).to(device), torch.tensor(X_norm[split:]).to(device)
y_train, y_val = torch.tensor(y[:split]).to(device), torch.tensor(y[split:]).to(device)

class EndlessPolicyNet(nn.Module):
    def __init__(self, input_dim):
        super().__init__()
        self.fc1 = nn.Linear(input_dim, 256)
        self.relu1 = nn.ReLU()
        self.fc2 = nn.Linear(256, 256)
        self.relu2 = nn.ReLU()
        self.fc3 = nn.Linear(256, 128)
        self.relu3 = nn.ReLU()
        self.fc4 = nn.Linear(128, 1)
        self.tanh = nn.Tanh()

    def forward(self, x):
        x = self.relu1(self.fc1(x))
        x = self.relu2(self.fc2(x))
        x = self.relu3(self.fc3(x))
        return self.tanh(self.fc4(x))

model = EndlessPolicyNet(X.shape[1]).to(device)
criterion = nn.MSELoss()
optimizer = optim.AdamW(model.parameters(), lr=0.001, weight_decay=1e-4)

print("Training Deep Policy Network on GPU...")
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

print("\n--- Training Complete ---")

# Export weights to JSON for Node.js native execution
weights = {
  "mean": mean.tolist(),
  "std": std.tolist(),
  "fc1_w": model.fc1.weight.detach().cpu().numpy().tolist(),
  "fc1_b": model.fc1.bias.detach().cpu().numpy().tolist(),
  "fc2_w": model.fc2.weight.detach().cpu().numpy().tolist(),
  "fc2_b": model.fc2.bias.detach().cpu().numpy().tolist(),
  "fc3_w": model.fc3.weight.detach().cpu().numpy().tolist(),
  "fc3_b": model.fc3.bias.detach().cpu().numpy().tolist(),
  "fc4_w": model.fc4.weight.detach().cpu().numpy().tolist(),
  "fc4_b": model.fc4.bias.detach().cpu().numpy().tolist()
}

with open("endless_ai_weights.json", "w") as f:
    json.dump(weights, f)

print("Exported neural network model weights to endless_ai_weights.json")
