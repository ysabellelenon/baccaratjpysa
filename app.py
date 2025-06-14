from flask import Flask, render_template, jsonify, request, session
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import random
import uuid

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
app.config['SECRET_KEY'] = 'your-secret-key'
app.config['DEBUG'] = True
app.config['CORS_HEADERS'] = 'Content-Type'

# Initialize Socket.IO with proper configuration
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='threading',
    logger=True,
    engineio_logger=True
)

# Game rooms storage
rooms = {}

class Room:
    def __init__(self, room_id):
        self.id = room_id
        self.players = {}
        self.current_bets = {'player': 0, 'banker': 0, 'tie': 0}
        self.game_in_progress = False
        self.deck = []
        self.initialize_deck()

    def initialize_deck(self):
        suits = ['hearts', 'diamonds', 'clubs', 'spades']
        values = list(range(1, 14))  # 1-13 (Ace-King)
        self.deck = [f"{value}_of_{suit}.png" for suit in suits for value in values]
        random.shuffle(self.deck)

    def add_player(self, player_id, name):
        if len(self.players) < 5:  # Maximum 5 players per room
            self.players[player_id] = {
                'name': name,
                'balance': 10000,  # Starting balance
                'position': len(self.players) + 1
            }
            return True
        return False

    def remove_player(self, player_id):
        if player_id in self.players:
            del self.players[player_id]

    def deal_cards(self):
        if len(self.deck) < 4:
            self.initialize_deck()
        
        player_cards = [self.deck.pop() for _ in range(2)]
        banker_cards = [self.deck.pop() for _ in range(2)]
        
        return player_cards, banker_cards

    def calculate_hand_value(self, cards):
        total = 0
        for card in cards:
            value = int(card.split('_')[0])
            if value > 9:  # Face cards
                value = 0
            total += value
        return total % 10

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/create-room', methods=['POST'])
def create_room():
    room_id = str(uuid.uuid4())[:8]  # Generate a unique room ID
    rooms[room_id] = Room(room_id)
    return jsonify({'room_id': room_id})

@app.route('/join-room/<room_id>')
def join_room_page(room_id):
    if room_id not in rooms:
        return "Room not found", 404
    return render_template('index.html', room_id=room_id)

@socketio.on('join')
def on_join(data):
    room_id = data['room_id']
    player_name = data['player_name']
    
    print(f"Join attempt - Room ID: {room_id}, Player: {player_name}")  # Debug log
    print(f"Available rooms: {list(rooms.keys())}")  # Debug log
    
    if room_id not in rooms:
        print(f"Room {room_id} not found")  # Debug log
        emit('error', {'message': 'Room not found'})
        return

    room = rooms[room_id]
    player_id = str(uuid.uuid4())
    
    if room.add_player(player_id, player_name):
        join_room(room_id)
        session['player_id'] = player_id
        session['room_id'] = room_id
        
        print(f"Player {player_name} joined room {room_id}")  # Debug log
        
        # Notify all players in the room about the new player
        emit('player_joined', {
            'players': room.players,
            'player_id': player_id,
            'room_id': room_id,
            'player_name': player_name
        }, room=room_id)
    else:
        emit('error', {'message': 'Room is full'})

@socketio.on('disconnect')
def on_disconnect():
    if 'player_id' in session and 'room_id' in session:
        room_id = session['room_id']
        player_id = session['player_id']
        
        if room_id in rooms:
            room = rooms[room_id]
            room.remove_player(player_id)
            
            if len(room.players) == 0:
                del rooms[room_id]
            else:
                emit('player_left', {
                    'players': room.players,
                    'player_id': player_id
                }, room=room_id)

@socketio.on('place_bet')
def on_place_bet(data):
    room_id = session.get('room_id')
    player_id = session.get('player_id')
    
    if not room_id or not player_id or room_id not in rooms:
        emit('error', {'message': 'Invalid room or player'})
        return
    
    room = rooms[room_id]
    player = room.players.get(player_id)
    
    if not player:
        emit('error', {'message': 'Player not found'})
        return
    
    bet_type = data['bet_type']
    amount = data['amount']
    
    if player['balance'] >= amount:
        player['balance'] -= amount
        room.current_bets[bet_type] += amount
        
        emit('bet_placed', {
            'player_id': player_id,
            'bet_type': bet_type,
            'amount': amount,
            'current_bets': room.current_bets,
            'player_balance': player['balance']
        }, room=room_id)
    else:
        emit('error', {'message': 'Insufficient funds'})

@socketio.on('deal')
def on_deal():
    room_id = session.get('room_id')
    if not room_id or room_id not in rooms:
        emit('error', {'message': 'Invalid room'})
        return
    
    room = rooms[room_id]
    if room.game_in_progress:
        emit('error', {'message': 'Game is already in progress'})
        return
    
    room.game_in_progress = True
    player_cards, banker_cards = room.deal_cards()
    
    player_value = room.calculate_hand_value(player_cards)
    banker_value = room.calculate_hand_value(banker_cards)
    
    # Determine winner
    winner = None
    if player_value > banker_value:
        winner = 'player'
    elif banker_value > player_value:
        winner = 'banker'
    else:
        winner = 'tie'
    
    # Calculate winnings and update player balances
    for player_id, player in room.players.items():
        winnings = 0
        if winner == 'player' and room.current_bets['player'] > 0:
            winnings = room.current_bets['player'] * 2
        elif winner == 'banker' and room.current_bets['banker'] > 0:
            winnings = room.current_bets['banker'] * 1.95  # 5% commission
        elif winner == 'tie' and room.current_bets['tie'] > 0:
            winnings = room.current_bets['tie'] * 8
        
        player['balance'] += winnings
    
    # Reset game state
    room.current_bets = {'player': 0, 'banker': 0, 'tie': 0}
    room.game_in_progress = False
    
    # Broadcast result to all players in the room
    emit('game_result', {
        'player_cards': player_cards,
        'banker_cards': banker_cards,
        'player_value': player_value,
        'banker_value': banker_value,
        'winner': winner,
        'players': room.players
    }, room=room_id)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5001, debug=True, allow_unsafe_werkzeug=True) 