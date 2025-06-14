import os
import requests

def download_card_images():
    # Create images directory if it doesn't exist
    os.makedirs('static/images', exist_ok=True)

    # Base URL for card images
    base_url = "https://deckofcardsapi.com/static/img/"

    # Card values and suits
    values = list(range(2, 11)) + ['A', 'J', 'Q', 'K']
    suits = ['H', 'D', 'C', 'S']  # Hearts, Diamonds, Clubs, Spades
    
    # Map for special cards
    special_cards = {
        'A': 1,
        'J': 11,
        'Q': 12,
        'K': 13
    }

    # Download each card image
    for suit in ['hearts', 'diamonds', 'clubs', 'spades']:
        for value in values:
            # Convert value to filename format
            if isinstance(value, int):
                filename = f"{value}_of_{suit}.png"
                api_value = str(value)
                if value == 10:
                    api_value = '0'  # In the API, 10 is represented as '0'
            else:
                filename = f"{special_cards[value]}_of_{suit}.png"
                api_value = value

            # Create API filename (e.g., "KH" for King of Hearts)
            api_filename = f"{api_value}{suits[['hearts', 'diamonds', 'clubs', 'spades'].index(suit)]}"
            
            # Download image
            response = requests.get(f"{base_url}{api_filename}.png")
            
            if response.status_code == 200:
                with open(f"static/images/{filename}", 'wb') as f:
                    f.write(response.content)
                print(f"Downloaded {filename}")
            else:
                print(f"Failed to download {filename}")

if __name__ == "__main__":
    download_card_images() 