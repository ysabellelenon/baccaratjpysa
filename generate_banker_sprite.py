from PIL import Image, ImageDraw
import os

def create_banker_sprite():
    # Create directory if it doesn't exist
    os.makedirs('static/images', exist_ok=True)

    # Sprite sheet dimensions (4 frames)
    width = 800  # 200px per frame
    height = 300
    
    # Create new image with transparent background
    sprite_sheet = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(sprite_sheet)
    
    # Colors
    suit_color = (0, 0, 0, 255)  # Black
    skin_color = (255, 218, 185, 255)  # Light skin tone
    shirt_color = (255, 255, 255, 255)  # White
    
    # Draw 4 frames
    for frame in range(4):
        x_offset = frame * 200
        
        # Draw body (suit)
        draw.rectangle([x_offset + 70, 100, x_offset + 130, 250], fill=suit_color)
        
        # Draw head
        draw.ellipse([x_offset + 85, 50, x_offset + 115, 80], fill=skin_color)
        
        # Draw arms in different positions for each frame
        if frame == 0:  # Standing
            draw.rectangle([x_offset + 60, 120, x_offset + 140, 140], fill=suit_color)
        elif frame == 1:  # Reaching for card
            draw.rectangle([x_offset + 60, 120, x_offset + 160, 140], fill=suit_color)
        elif frame == 2:  # Dealing
            draw.rectangle([x_offset + 40, 120, x_offset + 160, 140], fill=suit_color)
        else:  # Return to position
            draw.rectangle([x_offset + 50, 120, x_offset + 150, 140], fill=suit_color)
        
        # Draw shirt collar
        draw.rectangle([x_offset + 85, 100, x_offset + 115, 110], fill=shirt_color)
    
    # Save the sprite sheet
    sprite_sheet.save('static/images/banker-sprite.png', 'PNG')

if __name__ == '__main__':
    create_banker_sprite() 