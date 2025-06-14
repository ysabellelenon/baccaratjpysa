from flask import Flask, render_template, jsonify, request, session
import random
import json

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'

# Card deck setup
SUITS = ['hearts', 'diamonds', 'clubs', 'spades']
RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace']
DECK = [(rank, suit) for suit in SUITS for rank in RANKS]

def create_deck():
    deck = DECK.copy()
    random.shuffle(deck)
    return deck

def calculate_hand_value(hand):
    value = 0
    aces = 0
    
    for rank, _ in hand:
        if rank == 'ace':
            aces += 1
        elif rank in ['king', 'queen', 'jack', '10']:
            value += 0
        else:
            value += int(rank)
    
    # Add aces
    for _ in range(aces):
        if value + 1 <= 9:
            value += 1
        else:
            value += 0
            
    return value % 10

def deal_cards():
    deck = create_deck()
    player_hand = [deck.pop() for _ in range(2)]
    banker_hand = [deck.pop() for _ in range(2)]
    
    player_value = calculate_hand_value(player_hand)
    banker_value = calculate_hand_value(banker_hand)
    
    # Third card rules
    if player_value <= 5:
        player_hand.append(deck.pop())
        player_value = calculate_hand_value(player_hand)
        
        # Banker draws based on player's third card
        if banker_value <= 2:
            banker_hand.append(deck.pop())
        elif banker_value == 3 and player_value != 8:
            banker_hand.append(deck.pop())
        elif banker_value == 4 and player_value in [2, 3, 4, 5, 6, 7]:
            banker_hand.append(deck.pop())
        elif banker_value == 5 and player_value in [4, 5, 6, 7]:
            banker_hand.append(deck.pop())
        elif banker_value == 6 and player_value in [6, 7]:
            banker_hand.append(deck.pop())
    elif banker_value <= 5:
        banker_hand.append(deck.pop())
        
    banker_value = calculate_hand_value(banker_hand)
    
    return player_hand, banker_hand, player_value, banker_value

def determine_winner(player_value, banker_value):
    if player_value > banker_value:
        return 'player'
    elif banker_value > player_value:
        return 'banker'
    else:
        return 'tie'

def calculate_winnings(bets, winner):
    winnings = 0
    if winner == 'player':
        winnings += bets['player'] * 2  # 1:1 payout
        winnings -= bets['banker']
        winnings -= bets['tie']
    elif winner == 'banker':
        winnings += int(bets['banker'] * 1.95)  # 0.95:1 payout
        winnings -= bets['player']
        winnings -= bets['tie']
    else:  # tie
        winnings += bets['tie'] * 9  # 8:1 payout
        winnings += bets['player']  # Push on player/banker bets
        winnings += bets['banker']
    return winnings

@app.route('/')
def index():
    if 'bankroll' not in session:
        session['bankroll'] = 1000
    return render_template('index.html', bankroll=session['bankroll'])

@app.route('/deal', methods=['POST'])
def play():
    try:
        bets = request.json
        
        # Validate bets
        if not all(isinstance(v, (int, float)) for v in bets.values()):
            return jsonify({'error': 'Invalid bet amounts'})
        
        # Deal cards
        player_hand, banker_hand, player_value, banker_value = deal_cards()
        
        # Determine winner
        winner = determine_winner(player_value, banker_value)
        
        # Calculate winnings
        winnings = calculate_winnings(bets, winner)
        
        # Format cards for frontend
        player_cards = [f"{rank}_of_{suit}.png" for rank, suit in player_hand]
        banker_cards = [f"{rank}_of_{suit}.png" for rank, suit in banker_hand]
        
        return jsonify({
            'player_cards': player_cards,
            'banker_cards': banker_cards,
            'player_value': player_value,
            'banker_value': banker_value,
            'winner': winner,
            'winnings': winnings
        })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': 'An error occurred during the game'})

if __name__ == '__main__':
    app.run(debug=True) 