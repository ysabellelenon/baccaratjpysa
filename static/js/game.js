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
    let bettingEnabled = true;
    let timerInterval = null;
    const BETTING_TIME = 20; // 20 seconds for betting
    const WARNING_TIME = 5; // Show warning at 5 seconds

    // Cache DOM elements
    const loginModal = document.getElementById('login-modal');
    const gameContainer = document.querySelector('.game-container');
    const createPlayerNameInput = document.getElementById('create-player-name');
    const joinPlayerNameInput = document.getElementById('join-player-name');
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
    const createNameValidation = document.getElementById('create-name-validation');
    const joinNameValidation = document.getElementById('join-name-validation');
    const roomIdValidation = document.getElementById('room-id-validation');
    const timerDisplay = document.getElementById('timer-countdown');
    const timerStatus = document.querySelector('.timer-status');

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
        if (data.message.includes('Room not found')) {
            showValidationError(roomIdInput, 'Room not found', roomIdValidation);
        } else if (data.message.includes('Room is full')) {
            showValidationError(roomIdInput, 'Room is full', roomIdValidation);
        }
        showMessage(data.message);
    });

    // Validation functions
    function showValidationError(input, message, validationElement) {
        input.classList.add('error');
        validationElement.textContent = message;
        validationElement.classList.add('show');
    }

    function clearValidationError(input, validationElement) {
        input.classList.remove('error');
        validationElement.classList.remove('show');
    }

    function validateInput(input, validationElement, message) {
        const value = input.value.trim();
        if (!value) {
            showValidationError(input, message, validationElement);
            return false;
        }
        clearValidationError(input, validationElement);
        return true;
    }

    // Add input event listeners for real-time validation
    createPlayerNameInput.addEventListener('input', () => {
        validateInput(createPlayerNameInput, createNameValidation, 'Please enter your name');
    });

    joinPlayerNameInput.addEventListener('input', () => {
        validateInput(joinPlayerNameInput, joinNameValidation, 'Please enter your name');
    });

    roomIdInput.addEventListener('input', () => {
        validateInput(roomIdInput, roomIdValidation, 'Please enter a room ID');
    });

    // Create Room
    createRoomBtn.addEventListener('click', async () => {
        if (!validateInput(createPlayerNameInput, createNameValidation, 'Please enter your name')) {
            return;
        }

        const playerName = createPlayerNameInput.value.trim();
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
        const nameValid = validateInput(joinPlayerNameInput, joinNameValidation, 'Please enter your name');
        const roomIdValid = validateInput(roomIdInput, roomIdValidation, 'Please enter a room ID');
        
        if (!nameValid || !roomIdValid) {
            return;
        }

        const playerName = joinPlayerNameInput.value.trim();
        const roomId = roomIdInput.value.trim();
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
        // Clear all validation messages on successful join
        clearValidationError(createPlayerNameInput, createNameValidation);
        clearValidationError(joinPlayerNameInput, joinNameValidation);
        clearValidationError(roomIdInput, roomIdValidation);
        
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
        
        // Start the first round
        startNewRound();
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
        gameInProgress = true;
        
        // Deal cards with animation
        dealCards(data.player_cards, 'player-hand');
        dealCards(data.banker_cards, 'banker-hand');
        
        // Update values
        document.getElementById('player-value').textContent = `Value: ${data.player_value}`;
        document.getElementById('banker-value').textContent = `Value: ${data.banker_value}`;
        
        // Update player positions
        updatePlayerPositions(data.players);
        
        // Show winner
        showResult(data);
        
        // Reset bets
        currentBets = {player: 0, banker: 0, tie: 0};
        updateAllBetDisplays();
        
        // Start new round after a delay
        setTimeout(() => {
            startNewRound();
        }, 5000); // 5 second delay between rounds
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
            if (!bettingEnabled || !selectedChipValue) return;
            
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
        if (!bettingEnabled) return;
        
        currentBets = {player: 0, banker: 0, tie: 0};
        updateAllBetDisplays();
    });

    // Rebet button
    rebetButton.addEventListener('click', () => {
        if (!bettingEnabled || !lastBets) return;
        
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

    function startNewRound() {
        // Reset game state
        gameInProgress = false;
        bettingEnabled = true;
        
        // Clear hands
        document.getElementById('player-hand').innerHTML = '';
        document.getElementById('banker-hand').innerHTML = '';
        document.getElementById('player-value').textContent = 'Value: 0';
        document.getElementById('banker-value').textContent = 'Value: 0';
        
        // Start betting timer
        startBettingTimer();
    }

    function startBettingTimer() {
        let timeLeft = BETTING_TIME;
        timerDisplay.textContent = timeLeft;
        timerDisplay.classList.remove('warning');
        timerStatus.textContent = 'Place Your Bets';
        
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = timeLeft;
            
            if (timeLeft <= WARNING_TIME) {
                timerDisplay.classList.add('warning');
                timerStatus.textContent = 'Last Call!';
            }
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                endBettingPhase();
            }
        }, 1000);
    }

    function endBettingPhase() {
        bettingEnabled = false;
        timerStatus.textContent = 'No More Bets';
        gameInProgress = true;
        
        // Store last bets for rebet feature
        lastBets = {...currentBets};
        
        // Emit deal event regardless of bets
        socket.emit('deal');
    }

    // Check for room ID in URL
    const urlParams = new URLSearchParams(window.location.search);
    const roomIdFromUrl = urlParams.get('room');
    if (roomIdFromUrl) {
        roomIdInput.value = roomIdFromUrl;
    }
}); 