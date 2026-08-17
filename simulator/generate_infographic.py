import os
from PIL import Image, ImageDraw, ImageFont

# Define paths
old_path = r"C:\Users\jsnbr\.gemini\antigravity\brain\3e496487-2501-4841-a924-95c121925303\endless_seven_matrix_python_old.png"
new_path = r"C:\Users\jsnbr\.gemini\antigravity\brain\3e496487-2501-4841-a924-95c121925303\endless_seven_matrix_python_10k.png"
delta_path = r"C:\Users\jsnbr\.gemini\antigravity\brain\3e496487-2501-4841-a924-95c121925303\endless_seven_delta_matrix.png"
output_pdf = r"C:\Users\jsnbr\.gemini\antigravity\brain\3e496487-2501-4841-a924-95c121925303\Endless_Seven_Balance_Infographic.pdf"

# Load images
img_old = Image.open(old_path)
img_new = Image.open(new_path)
img_delta = Image.open(delta_path)

# Resize to make the PDF manageable
target_width = 3000
target_height = int(img_old.height * (target_width / img_old.width))

img_old = img_old.resize((target_width, target_height), Image.LANCZOS)
img_new = img_new.resize((target_width, target_height), Image.LANCZOS)
img_delta = img_delta.resize((target_width, target_height), Image.LANCZOS)

# Create a blank canvas (2x2 grid layout + some margin for the title)
margin = 200
canvas_width = target_width * 2 + margin * 3
canvas_height = target_height * 2 + margin * 4
canvas = Image.new('RGB', (canvas_width, canvas_height), color='#0b0c14')

draw = ImageDraw.Draw(canvas)

# Attempt to load a default font (if not found, use default)
try:
    title_font = ImageFont.truetype("arialbd.ttf", 100)
    subtitle_font = ImageFont.truetype("arial.ttf", 60)
    insight_font = ImageFont.truetype("arial.ttf", 55)
    insight_bold = ImageFont.truetype("arialbd.ttf", 65)
except:
    title_font = ImageFont.load_default()
    subtitle_font = ImageFont.load_default()
    insight_font = ImageFont.load_default()
    insight_bold = ImageFont.load_default()

# Add a main title
draw.text((margin, margin//2), "Endless Seven: Variant-2026-08-13 Balance Report", font=title_font, fill="#ffffff")

# Paste images
canvas.paste(img_old, (margin, margin * 2))
canvas.paste(img_new, (margin * 2 + target_width, margin * 2))
canvas.paste(img_delta, (margin, margin * 3 + target_height))

# Draw Labels
draw.text((margin, margin * 2 - 80), "Original Canonical Win Rates", font=subtitle_font, fill="#4cc9f0")
draw.text((margin * 2 + target_width, margin * 2 - 80), "New Variant-2026-08-13 Win Rates", font=subtitle_font, fill="#4cc9f0")
draw.text((margin, margin * 3 + target_height - 80), "Delta Matrix (New - Old)", font=subtitle_font, fill="#4cc9f0")

# Draw Key Insights Box in bottom right
insight_x = margin * 2 + target_width
insight_y = margin * 3 + target_height

# Draw bounding box for insights
draw.rectangle([insight_x, insight_y, insight_x + target_width, insight_y + target_height], outline="#4cc9f0", width=10, fill="#131520")

# Add Insight Text
insights = """
KEY INSIGHTS & TAKEAWAYS

1. Vampyre Dominance Curbed
The deep red/orange cells in the Delta Matrix show 
Vampyre combos losing 10-20% win rates across the board, 
pulling them down from their previous 75-85% dominance.

2. Lycans & Celestials Reborn
Green cells (+10% to +15%) highlight massive gains for 
Lycan and Celestial decks thanks to the new ability buffs 
and Ward mechanics.

3. Near Perfect Equilibrium
Looking at the New Matrix (top right), the head-to-head 
matchups are heavily clustered in the 45-55% sweet spot. 
The 1.44 million self-play simulations confirm the new 
variant is remarkably balanced and highly competitive.
"""
draw.text((insight_x + 100, insight_y + 100), insights.strip(), font=insight_font, fill="#ffffff", spacing=30)

# Save as PDF
canvas.save(output_pdf, "PDF", resolution=100.0, save_all=True)
print(f"Infographic PDF successfully generated at: {output_pdf}")
