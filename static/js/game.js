document.addEventListener('DOMContentLoaded', () => {
    // Initialize Socket.IO
    const socket = io();
    
    // Game state
    let selectedChipValue = null;
    let currentBets = {
        player: 0,
        banker: 0,
        tie: 0
    };
    let gameInProgress = false;
    let lastBets = null;
    let currentRoomId = null;
    let currentPlayerId = null;

    // Cache DOM elements
    const loginModal = document.getElementById('login-modal');
    const gameContainer = document.querySelector('.game-container');
    const playerNameInput = document.getElementById('player-name');
    const roomIdInput = document.getElementById('room-id');
    const createRoomBtn = document.getElementById('create-room-btn');
    const joinRoomBtn = document.getElementById('join-room-btn');
    const currentRoomIdSpan = document.getElementById('current-room-id');
    const copyRoomIdBtn = document.getElementById('copy-room-id');
    const playerPositions = document.getElementById('player-positions');
    const dealButton = document.getElementById('deal-button');
    const clearButton = document.getElementById('clear-button');
    const rebetButton = document.getElementById('rebet-button');
    const messageBox = document.getElementById('message-box');
    const chips = document.querySelectorAll('.chip');
    const bettingSpots = document.querySelectorAll('.betting-spot');

    // Socket connection status
    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        showMessage('Disconnected from server');
    });

    socket.on('error', (data) => {
        console.error('Socket error:', data);
        showMessage(data.message);
    });

    // Create Room
    createRoomBtn.addEventListener('click', async () => {
        const playerName = playerNameInput.value.trim();
        if (!playerName) {
            showMessage('Please enter your name');
            return;
        }

        try {
            const response = await fetch('/create-room', {
                method: 'POST'
            });
            const data = await response.json();
            console.log('Room created:', data.room_id);
            joinRoom(data.room_id, playerName);
        } catch (error) {
            console.error('Error creating room:', error);
            showMessage('Error creating room');
        }
    });

    // Join Room
    joinRoomBtn.addEventListener('click', () => {
        const playerName = playerNameInput.value.trim();
        const roomId = roomIdInput.value.trim();
        
        if (!playerName || !roomId) {
            showMessage('Please enter both name and room ID');
            return;
        }

        console.log('Attempting to join room:', roomId);
        joinRoom(roomId, playerName);
    });

    function joinRoom(roomId, playerName) {
        console.log('Joining room:', roomId, 'as', playerName);
        socket.emit('join', {
            room_id: roomId,
            player_name: playerName
        });
    }

    // Copy Room ID
    copyRoomIdBtn.addEventListener('click', () => {
        const roomId = document.getElementById('current-room-id').textContent;
        if (!roomId) {
            showMessage('No room ID available');
            return;
        }

        navigator.clipboard.writeText(roomId)
            .then(() => {
                copyRoomIdBtn.classList.add('copied');
                setTimeout(() => {
                    copyRoomIdBtn.classList.remove('copied');
                }, 2000);
                showMessage('Room ID copied to clipboard');
            })
            .catch(() => {
                showMessage('Failed to copy room ID');
            });
    });

    // Socket event handlers
    socket.on('player_joined', (data) => {
        console.log('Player joined event:', data);
        currentRoomId = data.room_id;
        currentPlayerId = data.player_id;
        
        // Update room ID display
        const roomIdElement = document.getElementById('current-room-id');
        roomIdElement.textContent = currentRoomId;
        
        // Hide login modal and show game
        loginModal.style.display = 'none';
        gameContainer.style.display = 'block';
        
        // Update player positions
        updatePlayerPositions(data.players);
        
        showMessage(`${data.player_name} joined the game`);
    });

    socket.on('player_left', (data) => {
        updatePlayerPositions(data.players);
        showMessage(`${data.players[data.player_id].name} left the game`);
    });

    socket.on('bet_placed', (data) => {
        if (data.player_id === currentPlayerId) {
            // Update local bet display
            currentBets[data.bet_type] = data.amount;
            updateBetDisplay(data.bet_type);
            updatePlayerBalance(data.player_balance);
        }
        
        // Update total bets display
        updateTotalBets(data.current_bets);
    });

    socket.on('game_result', (data) => {
        gameInProgress = false;
        dealButton.disabled = false;
        
        // Clear hands
        document.getElementById('player-hand').innerHTML = '';
        document.getElementById('banker-hand').innerHTML = '';
        
        // Deal cards with animation
        dealCards(data.player_cards, 'player-hand');
        dealCards(data.banker_cards, 'banker-hand');
        
        // Update values
        document.getElementById('player-value').textContent = `Value: ${data.player_value}`;
        document.getElementById('banker-value').textContent = `Value: ${data.banker_value}`;
        
        // Update player positions with new balances
        updatePlayerPositions(data.players);
        
        // Show winner
        showResult(data);
        
        // Reset bets
        currentBets = {player: 0, banker: 0, tie: 0};
        updateAllBetDisplays();
    });

    // Initialize chip selection
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            if (gameInProgress) return;
            
            chips.forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
            selectedChipValue = parseInt(chip.dataset.value);
        });
    });

    // Initialize betting spots
    bettingSpots.forEach(spot => {
        spot.addEventListener('click', () => {
            if (gameInProgress || !selectedChipValue) return;
            
            const betType = spot.dataset.type;
            socket.emit('place_bet', {
                bet_type: betType,
                amount: selectedChipValue
            });
        });
    });

    // Deal button
    dealButton.addEventListener('click', () => {
        if (gameInProgress) return;
        
        const totalBet = Object.values(currentBets).reduce((a, b) => a + b, 0);
        if (totalBet === 0) {
            showMessage('Please place your bets');
            return;
        }

        gameInProgress = true;
        dealButton.disabled = true;
        lastBets = {...currentBets};
        
        socket.emit('deal');
    });

    // Clear button
    clearButton.addEventListener('click', () => {
        if (gameInProgress) return;
        
        currentBets = {player: 0, banker: 0, tie: 0};
        updateAllBetDisplays();
    });

    // Rebet button
    rebetButton.addEventListener('click', () => {
        if (gameInProgress || !lastBets) return;
        
        Object.entries(lastBets).forEach(([type, amount]) => {
            socket.emit('place_bet', {
                bet_type: type,
                amount: amount
            });
        });
    });

    // Helper Functions
    function updatePlayerPositions(players) {
        console.log('Updating player positions:', players); // Debug log
        playerPositions.innerHTML = '';
        Object.entries(players).forEach(([id, player]) => {
            const position = createPlayerPosition(player, id === currentPlayerId);
            playerPositions.appendChild(position);
        });
    }

    function createPlayerPosition(player, isCurrentPlayer) {
        const position = document.createElement('div');
        position.className = 'player-position' + (isCurrentPlayer ? ' current-player' : '');
        position.innerHTML = `
            <div class="player-avatar">
                <span>${player.position}</span>
            </div>
            <div class="player-info">
                <div class="player-name">${player.name}</div>
                <div class="player-balance">$${player.balance.toLocaleString()}</div>
            </div>
        `;
        return position;
    }

    function updateBetDisplay(betType) {
        const betDisplay = document.getElementById(`${betType}-bet`);
        betDisplay.textContent = currentBets[betType];
        betDisplay.style.animation = 'updateNumber 0.3s ease-out';
        setTimeout(() => betDisplay.style.animation = '', 300);
    }

    function updateAllBetDisplays() {
        Object.keys(currentBets).forEach(type => updateBetDisplay(type));
    }

    function updateTotalBets(bets) {
        Object.entries(bets).forEach(([type, amount]) => {
            document.getElementById(`${type}-bet`).textContent = amount;
        });
    }

    function updatePlayerBalance(balance) {
        const playerPosition = document.querySelector('.player-position.current-player');
        if (playerPosition) {
            const balanceElement = playerPosition.querySelector('.player-balance');
            balanceElement.textContent = `$${balance.toLocaleString()}`;
            balanceElement.style.animation = 'updateNumber 0.3s ease-out';
            setTimeout(() => balanceElement.style.animation = '', 300);
        }
    }

    async function dealCards(cards, containerId) {
        const container = document.getElementById(containerId);
        for (const card of cards) {
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            
            const cardImage = document.createElement('img');
            cardImage.src = `/static/images/${card}`;
            cardImage.alt = card.replace('.png', '');
            cardImage.onload = () => {
                cardElement.style.animation = 'dealCard 0.5s ease-out';
            };
            
            cardElement.appendChild(cardImage);
            container.appendChild(cardElement);
        }
    }

    function showResult(data) {
        let message = '';
        let emoji = '';
        
        switch(data.winner) {
            case 'player':
                emoji = '🎉';
                message = 'Player Wins!';
                break;
            case 'banker':
                emoji = '🎯';
                message = 'Banker Wins!';
                break;
            default:
                emoji = '🎲';
                message = 'Tie!';
        }
        
        showMessage(`${emoji} ${message} ${emoji}`);
    }

    function showMessage(message) {
        console.log('Message:', message); // Debug log
        messageBox.textContent = message;
        messageBox.style.animation = 'fadeInOut 3s ease-in-out';
        setTimeout(() => messageBox.style.animation = '', 3000);
    }

    // Check for room ID in URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomIdFromUrl = urlParams.get('room');
    if (roomIdFromUrl) {
        roomIdInput.value = roomIdFromUrl;
    }
}); 