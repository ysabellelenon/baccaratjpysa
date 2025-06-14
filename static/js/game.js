document.addEventListener('DOMContentLoaded', () => {
    // Game state
    let selectedChipValue = null;
    let currentBets = {
        player: 0,
        banker: 0,
        tie: 0
    };
    let bankroll = 10000; // Starting bankroll
    let gameInProgress = false;

    // Cache DOM elements
    const dealButton = document.getElementById('deal-button');
    const clearButton = document.getElementById('clear-button');
    const rebetButton = document.getElementById('rebet-button');
    const playerHand = document.getElementById('player-hand');
    const bankerHand = document.getElementById('banker-hand');
    const playerValue = document.getElementById('player-value');
    const bankerValue = document.getElementById('banker-value');
    const chips = document.querySelectorAll('.chip');
    const bettingSpots = document.querySelectorAll('.betting-spot');

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
            if (bankroll < selectedChipValue) {
                showMessage('Insufficient funds');
                return;
            }
            
            // Add bet
            currentBets[betType] += selectedChipValue;
            updateBetDisplay(betType);
            
            // Update bankroll
            bankroll -= selectedChipValue;
            updateBankrollDisplay();
        });
    });

    // Update bet display
    function updateBetDisplay(betType) {
        const betDisplay = document.getElementById(`${betType}-bet`);
        betDisplay.textContent = currentBets[betType];
    }

    // Update bankroll display
    function updateBankrollDisplay() {
        // Update the bankroll display in the UI
        console.log('Bankroll:', bankroll);
    }

    // Show message
    function showMessage(message) {
        const messageBox = document.createElement('div');
        messageBox.className = 'message';
        messageBox.textContent = message;
        document.body.appendChild(messageBox);
        
        setTimeout(() => {
            messageBox.remove();
        }, 3000);
    }

    // Clear bets
    clearButton.addEventListener('click', () => {
        if (gameInProgress) return;
        
        // Refund current bets
        Object.keys(currentBets).forEach(type => {
            bankroll += currentBets[type];
            currentBets[type] = 0;
            updateBetDisplay(type);
        });
        
        updateBankrollDisplay();
    });

    // Deal cards
    dealButton.addEventListener('click', async () => {
        if (gameInProgress) return;
        
        const totalBet = Object.values(currentBets).reduce((a, b) => a + b, 0);
        if (totalBet === 0) {
            showMessage('Please place your bets');
            return;
        }

        gameInProgress = true;
        dealButton.disabled = true;

        try {
            const response = await fetch('/deal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(currentBets)
            });

            const result = await response.json();
            
            if (result.error) {
                showMessage(result.error);
                return;
            }

            // Clear hands
            playerHand.innerHTML = '';
            bankerHand.innerHTML = '';

            // Deal cards with animation
            await dealCards(result.player_cards, playerHand);
            await dealCards(result.banker_cards, bankerHand);

            // Update values
            playerValue.textContent = `Value: ${result.player_value}`;
            bankerValue.textContent = `Value: ${result.banker_value}`;

            // Show result and update bankroll
            showResult(result);
            bankroll += result.winnings;
            updateBankrollDisplay();

            // Clear bets
            Object.keys(currentBets).forEach(type => {
                currentBets[type] = 0;
                updateBetDisplay(type);
            });

        } catch (error) {
            console.error('Error:', error);
            showMessage('An error occurred');
        } finally {
            gameInProgress = false;
            dealButton.disabled = false;
        }
    });

    // Deal cards with animation
    async function dealCards(cards, container) {
        for (const card of cards) {
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            
            const cardImage = document.createElement('img');
            cardImage.src = `/static/images/cards/${card}`;
            cardImage.alt = card;
            
            cardElement.appendChild(cardImage);
            container.appendChild(cardElement);
        }
    }

    // Show result
    function showResult(result) {
        let message = '';
        if (result.winner === 'player') {
            message = 'Player Wins!';
        } else if (result.winner === 'banker') {
            message = 'Banker Wins!';
        } else {
            message = 'Tie!';
        }
        showMessage(message);
    }
}); 