# Baccarat Game

A web-based baccarat betting game implemented with Python Flask and modern web technologies.

## Features
- Beautiful web interface with card animations
- Real-time game updates
- Track your bankroll
- Place bets on Player, Banker, or Tie
- Realistic card dealing animations
- Clear game state display
- Responsive design

## Game Rules
- Player can bet on either Player's hand, Banker's hand, or a Tie
- Cards 2-9 are worth their face value
- 10, Jack, Queen, and King are worth 0
- Ace is worth 1
- Hand values are calculated by taking the rightmost digit of the sum (e.g., 15 becomes 5)
- The hand closest to 9 wins
- Specific drawing rules for Player and Banker are implemented according to standard baccarat rules

## Prerequisites
- Python 3.x
- Git (for version control)
- Web browser (Chrome, Firefox, Safari, or Edge recommended)

## Setup and Installation

### Clone the Repository
```bash
# Clone this repository
git clone https://github.com/YOUR_USERNAME/baccarat-game.git

# Navigate to the project directory
cd baccarat-game
```

### Install and Run
1. Install the required packages:
```bash
pip install -r requirements.txt
```

2. Download the card images:
```bash
python download_cards.py
```

3. Run the web server:
```bash
python app.py
```

4. Open your browser and navigate to `http://localhost:5000`

## Payout Rules
- Player win: 1:1
- Banker win: 0.95:1 (5% commission)
- Tie: 8:1

## Technologies Used
- Backend: Python Flask
- Frontend: HTML5, CSS3, JavaScript
- Card Images: Deck of Cards API
- WebSocket: Flask-SocketIO
- Version Control: Git

## Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License
This project is open source and available under the MIT License. 