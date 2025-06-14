from PIL import Image, ImageDraw, ImageFont
import os

def create_card_image(rank, suit, output_path):
    # Create a new image with white background
    width = 100
    height = 140
    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)
    
    # Draw border
    draw.rectangle([(0, 0), (width-1, height-1)], outline='black')
    
    # Add rank and suit
    try:
        font = ImageFont.truetype('Arial.ttf', 20)
    except:
        font = ImageFont.load_default()
        
    text = f"{rank} of {suit}"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (width - text_width) // 2
    y = (height - text_height) // 2
    
    draw.text((x, y), text, fill='black', font=font)
    
    # Save the image
    img.save(output_path)

def main():
    # Create output directory
    output_dir = 'static/images/cards'
    os.makedirs(output_dir, exist_ok=True)
    
    # Card properties
    suits = ['hearts', 'diamonds', 'clubs', 'spades']
    ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace']
    
    # Generate all cards
    for suit in suits:
        for rank in ranks:
            filename = f"{rank}_of_{suit}.png"
            output_path = os.path.join(output_dir, filename)
            create_card_image(rank, suit, output_path)
            print(f"Created {filename}")

if __name__ == '__main__':
    main() 