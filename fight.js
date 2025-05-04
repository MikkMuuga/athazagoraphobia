console.log("Fight.js loaded successfully!");

// Combat System for Athazagoraphobia
let combatState = {
    currentFight: null,
    playerHand: [],
    enemyHand: [],
    playedCards: [],
    playerAttackPool: [],
    playerActionPool: [],
    enemyAttackPool: [],
    enemyActionPool: [],
    turnCount: 0,
    playerFocus: 5,
    maxPlayerFocus: 10,
    focusRegen: 2,
    handSize: 10,
    selectedCards: [],
    discardCards: [],
    playerDefenseMultiplier: 1.0,
    enemyDefenseMultiplier: 1.0,
    playerVulnerabilityMultiplier: 1.0,
    enemyVulnerabilityMultiplier: 1.0,
    playerTankHealAmount: 0,
    enemyTankHealAmount: 0,
    playerReflectAmount: 0,
    enemyReflectAmount: 0,
    playerDamageBoost: 1.0,
    playerDamageBoostDuration: 0,
    totalFocusCost: 0,
    // Add health tracking directly in combatState
    playerMaxHealth: 100,
    playerHealth: 100,
    enemyMaxHealth: 0,
    enemyHealth: 0,
    // Add damage multipliers
    playerDamageMultiplier: 1.0,
    enemyDamageMultiplier: 1.0
};

// Initialize combat with a specific fight ID
function initiateCombat(fight) {
    console.log("Initiating combat with:", fight);
    
    // Store the current fight
    combatState.currentFight = fight;
    
    // Reset combat state
    combatState.playerHand = [];
    combatState.enemyHand = [];
    combatState.playedCards = [];
    combatState.turnCount = 0;
    
    // Set health values from the fight configuration
    if (fight.player && fight.player.maxHealth) {
        combatState.playerMaxHealth = fight.player.maxHealth;
        combatState.playerHealth = fight.player.maxHealth;
    } else {
        // Default values if not specified
        combatState.playerMaxHealth = 100;
        combatState.playerHealth = 100;
    }
    
    if (fight.enemy && fight.enemy.maxHealth) {
        combatState.enemyMaxHealth = fight.enemy.maxHealth;
        combatState.enemyHealth = fight.enemy.currentHealth || fight.enemy.maxHealth;
    } else {
        console.error("Enemy health not specified in fight configuration");
        combatState.enemyMaxHealth = 50;
        combatState.enemyHealth = 50;
    }
    
    // Set damage multipliers
    combatState.playerDamageMultiplier = fight.player?.damageMultiplier || 1.0;
    combatState.enemyDamageMultiplier = fight.enemy?.damageMultiplier || 1.0;
    
    // Set up player attack and action card pools
    combatState.playerAttackPool = [];
    combatState.playerActionPool = [];
    
    if (fight.player && Array.isArray(fight.player.attackDeck)) {
        combatState.playerAttackPool = [...fight.player.attackDeck];
    } else {
        console.error("Player attack deck is missing or not an array:", fight.player);
        combatState.playerAttackPool = [];
    }
    
    if (fight.player && Array.isArray(fight.player.actionDeck)) {
        combatState.playerActionPool = [...fight.player.actionDeck];
    } else {
        console.error("Player action deck is missing or not an array:", fight.player);
        combatState.playerActionPool = [];
    }
    
    // Set up enemy deck
    combatState.enemyAttackPool = [];
    combatState.enemyActionPool = [];
    
    if (fight.enemy && Array.isArray(fight.enemy.attackDeck)) {
        combatState.enemyAttackPool = [...fight.enemy.attackDeck];
    } else {
        console.error("Enemy attack deck is missing or not an array:", fight.enemy);
        combatState.enemyAttackPool = [];
    }
    
    if (fight.enemy && Array.isArray(fight.enemy.actionDeck)) {
        combatState.enemyActionPool = [...fight.enemy.actionDeck];
    } else {
        console.error("Enemy action deck is missing or not an array:", fight.enemy);
        combatState.enemyActionPool = [];
    }
    
    // Initialize focus
    combatState.playerFocus = 5;
    combatState.maxPlayerFocus = 10;
    
    // Reset multipliers and effects
    combatState.playerDefenseMultiplier = 1.0;
    combatState.enemyDefenseMultiplier = 1.0;
    combatState.playerVulnerabilityMultiplier = 1.0;
    combatState.enemyVulnerabilityMultiplier = 1.0;
    combatState.playerTankHealAmount = 0;
    combatState.enemyTankHealAmount = 0;
    combatState.playerReflectAmount = 0;
    combatState.enemyReflectAmount = 0;
    combatState.playerDamageBoost = 1.0;
    combatState.playerDamageBoostDuration = 0;
    
    // Deal initial hand
    dealPlayerHand();
    
    console.log("Combat initialized:", combatState);
}


// Load fight data from fights.json
async function loadFight(fightId) {
    try {
        // Load all necessary data in parallel
        const [fightsResponse, attackResponse, actionResponse] = await Promise.all([
            fetch('fight/fights.json'),
            fetch('fight/attack.json'),
            fetch('fight/action.json')
        ]);
        
        const fights = await fightsResponse.json();
        combatState.attackCards = await attackResponse.json();
        combatState.actionCards = await actionResponse.json();
        
        if (!fights[fightId]) {
            console.error(`Fight ID ${fightId} not found!`);
            return;
        }
        
        combatState.currentFight = fights[fightId];
        
        // Initialize player and enemy stats
        gameState.playerStats.health = gameState.playerStats.health || combatState.currentFight.player.maxHealth;
        combatState.currentFight.enemy.currentHealth = combatState.currentFight.enemy.maxHealth;
        
        // Initialize player deck based on class
        const playerClass = gameState.playerStats.class || "sword";
        
        // Initialize player attack deck
        combatState.playerAttackDeck = [];
        combatState.currentFight.player.attackDeck.forEach(cardId => {
            if (cardId.startsWith(playerClass.toLowerCase())) {
                combatState.playerAttackDeck.push(cardId);
            }
        });
        
        // Initialize player action deck
        combatState.playerActionDeck = [...combatState.currentFight.player.actionDeck];
        
        // Initialize enemy decks
        combatState.enemyAttackDeck = [...combatState.currentFight.enemy.attackDeck];
        combatState.enemyActionDeck = [...combatState.currentFight.enemy.actionDeck];
    } catch (error) {
        console.error("Error loading fight data:", error);
    }
}

// Get card data by ID
function getCardById(cardId) {
    if (!cardId || typeof cardId !== 'string') {
        console.error("Invalid card ID:", cardId);
        return null;
    }
    
    try {
        // Parse the card ID to determine its properties
        const parts = cardId.split('_');
        const baseType = parts[0] || '';
        
        // Determine card type and properties based on ID
        let cardType, cardName, cardDescription, focusCost, baseDamage, effectType, effectValue;
        
        // Action cards
        if (baseType === 'heal') {
            cardType = 'action';
            cardName = 'Healing Potion';
            cardDescription = 'Restore some health.';
            focusCost = 2;
            effectType = 'heal';
            effectValue = 0.2; // 20% of max health
        } 
        else if (baseType === 'defend') {
            cardType = 'action';
            cardName = 'Defensive Stance';
            cardDescription = 'Reduce incoming damage.';
            focusCost = 2;
            effectType = 'defense';
            effectValue = 0.5; // 50% damage reduction
        }
        else if (baseType === 'focus') {
            cardType = 'action';
            cardName = 'Concentrate';
            cardDescription = 'Gain additional focus.';
            focusCost = 1;
            effectType = 'focus_gain';
            effectValue = 3;
        }
        else if (baseType === 'reflect') {
            cardType = 'action';
            cardName = 'Reflect';
            cardDescription = 'Reflect some damage back to the attacker.';
            focusCost = 3;
            effectType = 'reflect';
            effectValue = 0.3; // 30% damage reflection
        }
        else if (baseType === 'analyze') {
            cardType = 'action';
            cardName = 'Analyze';
            cardDescription = 'Identify enemy weaknesses, increasing your damage.';
            focusCost = 2;
            effectType = 'damage_boost';
            effectValue = 0.25; // 25% damage boost
        }
        else if (baseType === 'tank') {
            cardType = 'action';
            cardName = 'Last Stand';
            cardDescription = 'Take more damage but heal at the start of your next turn.';
            focusCost = 2;
            effectType = 'tank_heal';
            effectValue = 0.3; // 30% of max health healed next turn
        }
        // Attack cards
        else {
            cardType = 'attack';
            const weapon = baseType || 'sword';
            const element = parts[1] || 'normal';
            const tier = parseInt(parts[2]) || 1;
            
            // Determine base damage by weapon and tier
            switch (weapon) {
                case 'sword':
                    baseDamage = 5 + (tier - 1) * 2;
                    break;
                case 'daggers':
                    baseDamage = 3 + (tier - 1) * 1.5;
                    break;
                case 'staff':
                    baseDamage = 4 + (tier - 1) * 1.8;
                    break;
                default:
                    baseDamage = 4 + (tier - 1) * 2;
            }
            
            // Safely create weapon and element names - avoid toUpperCase() on undefined
            let weaponName = "Weapon";
            if (weapon && typeof weapon === 'string') {
                weaponName = weapon.charAt(0).toUpperCase() + weapon.slice(1);
            }
            
            let elementName = "Normal";
            if (element && typeof element === 'string') {
                elementName = element.charAt(0).toUpperCase() + element.slice(1);
            }
            
            cardName = `${elementName} ${weaponName}`;
            cardDescription = `Deal ${baseDamage} ${element || 'normal'} damage.`;
            focusCost = tier;
            effectType = 'damage';
            effectValue = baseDamage;
        }
        
        return {
            id: cardId,
            name: cardName,
            description: cardDescription,
            focus_cost: focusCost,
            type: cardType,
            base_damage: baseDamage,
            effect_type: effectType,
            effect_value: effectValue
        };
    } catch (error) {
        console.error("Error parsing card ID:", cardId, error);
        return {
            id: cardId,
            name: "Unknown Card",
            description: "This card could not be identified.",
            focus_cost: 1,
            type: "unknown",
            effect_type: "none",
            effect_value: 0
        };
    }
}

// Deal cards to player's hand
function dealPlayerHand() {
    // Clear the current hand
    combatState.playerHand = [];
    
    // Deal 7 attack cards
    for (let i = 0; i < 7; i++) {
        if (combatState.playerAttackPool.length > 0) {
            const cardIndex = Math.floor(Math.random() * combatState.playerAttackPool.length);
            const drawnCard = combatState.playerAttackPool[cardIndex];
            combatState.playerHand.push(drawnCard);
        }
    }
    
    // Deal 3 action cards
    for (let i = 0; i < 3; i++) {
        if (combatState.playerActionPool.length > 0) {
            const cardIndex = Math.floor(Math.random() * combatState.playerActionPool.length);
            const drawnCard = combatState.playerActionPool[cardIndex];
            combatState.playerHand.push(drawnCard);
        }
    }
    
    console.log("Player hand dealt:", combatState.playerHand);
}

// Update the createCardElement function for better card design
function createCardElement(card) {
    if (!card) {
        console.error("Attempted to create card element with null card data");
        return document.createElement('div'); // Return empty div to avoid errors
    }
    
    const cardElement = document.createElement('div');
    cardElement.className = 'card';
    cardElement.dataset.cardId = card.id || '';
    
    // Determine card color class based on type and effect
    let cardColorClass = 'card-normal';
    
    if (card.type === 'attack' && card.id && typeof card.id === 'string') {
        try {
            const parts = card.id.split('_');
            const element = parts[1] || 'normal';
            cardColorClass = `card-${element}`;
        } catch (error) {
            console.error("Error parsing card ID for color:", error);
            // Fallback to default
            cardColorClass = 'card-normal';
        }
    } else if (card.type === 'action') {
        cardColorClass = 'card-action';
    }
    
    cardElement.classList.add(cardColorClass);
    
    // Avoid any potential undefined values in the HTML
    const cardName = card.name || 'Unknown Card';
    const cardDescription = card.description || 'No description';
    const focusCost = card.focus_cost || 0;
    
    // Build HTML content safely
    let htmlContent = `
        <div class="card-name">${cardName}</div>
        <div class="card-description">${cardDescription}</div>
        <div class="card-cost">Focus: ${focusCost}</div>
    `;
    
    if (card.type === 'attack' && card.base_damage) {
        htmlContent += `<div class="card-damage">Damage: ${card.base_damage}</div>`;
    }
    
    if (card.effect_type) {
        const effectDisplay = card.effect_type.replace ? card.effect_type.replace(/_/g, ' ') : card.effect_type;
        htmlContent += `<div class="card-effect">Effect: ${effectDisplay}</div>`;
    }
    
    cardElement.innerHTML = htmlContent;
    
    return cardElement;
}

// Deal cards to enemy's hand
function dealEnemyHand() {
    combatState.enemyHand = [];
    
    // Shuffle the attack deck
    const shuffledAttackDeck = [...combatState.enemyAttackDeck].sort(() => Math.random() - 0.5);
    
    // Shuffle the action deck
    const shuffledActionDeck = [...combatState.enemyActionDeck].sort(() => Math.random() - 0.5);
    
    // Deal cards based on enemy difficulty
    const attackCount = combatState.currentFight.enemy.difficulty === "simple" ? 2 : 3;
    const actionCount = combatState.currentFight.enemy.difficulty === "simple" ? 1 : 2;
    
    // Add attack cards
    for (let i = 0; i < attackCount && i < shuffledAttackDeck.length; i++) {
        combatState.enemyHand.push(shuffledAttackDeck[i]);
    }
    
    // Add action cards
    for (let i = 0; i < actionCount && i < shuffledActionDeck.length; i++) {
        combatState.enemyHand.push(shuffledActionDeck[i]);
    }
}

// Display combat UI
function displayCombatUI() {
    // Declare contentArea first before using it
    const contentArea = document.getElementById('content-area');
    if (!contentArea) {
        console.error("Content area element not found");
        return;
    }
    
    // Add the combat-active class to expand the content area
    contentArea.classList.add('combat-active');
    
    // Check if combat state is properly initialized
    if (!combatState.currentFight || !combatState.currentFight.enemy) {
        console.error("Combat state not properly initialized:", combatState);
        contentArea.innerHTML = `<div class="error-message">Error: Combat could not be initialized properly.</div>`;
        return;
    }
    
    // Create combat UI structure with the new layout
    contentArea.innerHTML = `
        <div id="combat-container">
            <div id="enemy-area">
                <div class="enemy-info">
                    <h2>${combatState.currentFight.enemy.name}</h2>
                    <div class="health-bar">
                        <div class="health-fill" style="width: ${(combatState.enemyHealth / combatState.enemyMaxHealth) * 100}%"></div>
                        <span>${Math.floor(combatState.enemyHealth)}/${combatState.enemyMaxHealth}</span>
                    </div>
                </div>
                <div id="enemy-cards-played" class="cards-played-area"></div>
            </div>
            
            <div id="combat-messages">
                <div class="combat-message">${combatState.currentFight.description || 'Combat started!'}</div>
            </div>
            
            <div id="combat-field"></div>
            
            <div id="player-area">
                <div id="focus-cost-display">Total Focus Cost: ${combatState.totalFocusCost || 0}</div>
                
                <div class="combat-controls">
                    <button id="end-turn-btn" onclick="endPlayerTurn()">End Turn</button>
                </div>
                
                <div class="player-info">
                    <div class="health-bar">
                        <div class="health-fill" style="width: ${(combatState.playerHealth / combatState.playerMaxHealth) * 100}%"></div>
                        <span>${Math.floor(combatState.playerHealth)}/${combatState.playerMaxHealth}</span>
                    </div>
                    <div class="focus-bar">
                        <div class="focus-fill" style="width: ${(combatState.playerFocus / combatState.maxPlayerFocus) * 100}%"></div>
                        <span>Focus: ${combatState.playerFocus}/${combatState.maxPlayerFocus}</span>
                    </div>
                </div>
                
                <div id="player-hand" class="card-hand"></div>
            </div>
        </div>
    `;
    
    // Display player's hand
    displayPlayerHand();
    
    // Prevent context menu on the entire combat container
    const combatContainer = document.getElementById('combat-container');
    if (combatContainer) {
        combatContainer.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });
    }
}


// Display player's hand
function displayPlayerHand() {
    const handContainer = document.getElementById('player-hand');
    if (!handContainer) {
        console.error("Player hand container not found");
        return;
    }
    
    handContainer.innerHTML = '';
    
    if (!Array.isArray(combatState.playerHand)) {
        console.error("Player hand is not an array:", combatState.playerHand);
        return;
    }
    
    // Separate attack and action cards
    const attackCards = [];
    const actionCards = [];
    
    for (const cardId of combatState.playerHand) {
        if (!cardId) {
            console.error("Invalid card ID in player hand:", cardId);
            continue;
        }
        
        try {
            const card = getCardById(cardId);
            
            if (!card) {
                console.error("Failed to get card data for ID:", cardId);
                continue;
            }
            
            if (card.type === 'attack') {
                attackCards.push(cardId);
            } else if (card.type === 'action') {
                actionCards.push(cardId);
            } else {
                console.error("Unknown card type:", card.type, "for card:", cardId);
            }
        } catch (error) {
            console.error(`Error processing card ${cardId}:`, error);
        }
    }
    
    // Display attack cards
    attackCards.forEach(cardId => {
        try {
            const card = getCardById(cardId);
            
            if (!card) {
                console.error("Failed to get card data for ID:", cardId);
                return;
            }
            
            const cardElement = createCardElement(card);
            cardElement.dataset.cardId = cardId;
            cardElement.classList.add('attack-card');
            
            // Add click event for card selection
            cardElement.addEventListener('click', (e) => {
                e.preventDefault();
                toggleCardSelection(cardId, cardElement);
            });
            
            // Add right-click event for card discard
            cardElement.addEventListener('contextmenu', (e) => {
                e.preventDefault(); // Prevent the default context menu
                e.stopPropagation(); // Stop the event from bubbling up
                toggleCardDiscard(cardId, cardElement);
                return false; // For older browsers
            });
            
            handContainer.appendChild(cardElement);
        } catch (error) {
            console.error("Error creating attack card element:", error);
        }
    });
    
    // Add a vertical divider between attack and action cards if both exist
    if (attackCards.length > 0 && actionCards.length > 0) {
        const divider = document.createElement('div');
        divider.className = 'card-divider';
        handContainer.appendChild(divider);
    }
    
    // Display action cards
    actionCards.forEach(cardId => {
        try {
            const card = getCardById(cardId);
            
            if (!card) {
                console.error("Failed to get card data for ID:", cardId);
                return;
            }
            
            const cardElement = createCardElement(card);
            cardElement.dataset.cardId = cardId;
            cardElement.classList.add('action-card');
            
            // Add click event for card selection
            cardElement.addEventListener('click', (e) => {
                e.preventDefault();
                toggleCardSelection(cardId, cardElement);
            });
            
            // Add right-click event for card discard
            cardElement.addEventListener('contextmenu', (e) => {
                e.preventDefault(); // Prevent the default context menu
                e.stopPropagation(); // Stop the event from bubbling up
                toggleCardDiscard(cardId, cardElement);
                return false; // For older browsers
            });
            
            handContainer.appendChild(cardElement);
        } catch (error) {
            console.error("Error creating action card element:", error);
        }
    });
}

function toggleCardSelection(cardId, cardElement) {
    if (!cardId || !cardElement) {
        console.error("Invalid card or element in toggleCardSelection:", cardId, cardElement);
        return;
    }
    
    const card = getCardById(cardId);
    if (!card) {
        console.error("Failed to get card data for selection:", cardId);
        return;
    }
    
    // Initialize selectedCards array if it doesn't exist
    if (!combatState.selectedCards) {
        combatState.selectedCards = [];
    }
    
    // Initialize totalFocusCost if it doesn't exist
    if (combatState.totalFocusCost === undefined) {
        combatState.totalFocusCost = 0;
    }
    
    // Check if card is already selected
    const isSelected = cardElement.classList.contains('selected');
    
    // If card is discarded, remove discard first
    if (cardElement.classList.contains('discard')) {
        toggleCardDiscard(cardId, cardElement);
    }
    
    // Toggle selection state
    if (isSelected) {
        cardElement.classList.remove('selected');
        combatState.selectedCards = combatState.selectedCards.filter(id => id !== cardId);
        combatState.totalFocusCost -= card.focus_cost || 0;
    } else {
        // Check if we have enough focus
        if (combatState.totalFocusCost + (card.focus_cost || 0) <= combatState.playerFocus) {
            cardElement.classList.add('selected');
            combatState.selectedCards.push(cardId);
            combatState.totalFocusCost += card.focus_cost || 0;
        } else {
            // Not enough focus - don't select the card and don't show a message
            return;
        }
    }
    
    // Update focus cost display
    updateFocusCostDisplay();
    
    // Enable/disable play button based on selections
    const endTurnBtn = document.getElementById('end-turn-btn');
    if (endTurnBtn) {
        endTurnBtn.disabled = combatState.selectedCards.length === 0;
    }
}

function playSelectedCards() {
    // Check if player has enough focus
    if (combatState.totalFocusCost > combatState.playerFocus) {
        displayCombatMessage("Not enough focus to play these cards!");
        return;
    }
    
    // Play each selected card
    for (const cardId of combatState.selectedCards) {
        const card = getCardById(cardId);
        if (!card) continue;
        
        // Remove card from hand and add to played cards
        combatState.playerHand = combatState.playerHand.filter(id => id !== cardId);
        combatState.playedCards.push(cardId);
        
        // Apply card effects
        applyCardEffect(card, 'player');
    }
    
    // Discard selected cards
    for (const cardId of combatState.discardCards) {
        // Just remove from hand
        combatState.playerHand = combatState.playerHand.filter(id => id !== cardId);
    }
    
    // Deduct focus cost
    combatState.playerFocus -= combatState.totalFocusCost;
    
    // Reset selections
    combatState.selectedCards = [];
    combatState.discardCards = [];
    combatState.totalFocusCost = 0;
    
    // Update UI
    displayPlayerHand();
    displayPlayedCards();
    updateFocusDisplay();
    updateFocusCostDisplay();
}

// Create a card element
function createCardElement(card) {
    if (!card) {
        console.error("Attempted to create card element with null card data");
        return document.createElement('div'); // Return empty div to avoid errors
    }
    
    console.log("Creating card element for:", card);
    
    const cardElement = document.createElement('div');
    cardElement.className = 'card';
    cardElement.dataset.cardId = card.id || '';
    
    // Determine card color class based on type and effect
    let cardColorClass = 'card-normal';
    
    if (card.type === 'attack' && card.id && typeof card.id === 'string') {
        try {
            const parts = card.id.split('_');
            const element = parts[1] || 'normal';
            cardColorClass = `card-${element}`;
        } catch (error) {
            console.error("Error parsing card ID for color:", error);
            // Fallback to default
            cardColorClass = 'card-normal';
        }
    } else if (card.type === 'action') {
        cardColorClass = 'card-action';
    }
    
    cardElement.classList.add(cardColorClass);
    
    // Avoid any potential undefined values in the HTML
    const cardName = card.name || 'Unknown Card';
    const cardDescription = card.description || 'No description';
    const focusCost = card.focus_cost || 0;
    
    // Build HTML content safely
    let htmlContent = `
        <div class="card-name">${cardName}</div>
        <div class="card-description">${cardDescription}</div>
        <div class="card-cost">Focus: ${focusCost}</div>
    `;
    
    if (card.type === 'attack' && card.base_damage) {
        htmlContent += `<div class="card-damage">Damage: ${card.base_damage}</div>`;
    }
    
    if (card.effect_type) {
        const effectDisplay = card.effect_type.replace ? card.effect_type.replace(/_/g, ' ') : card.effect_type;
        htmlContent += `<div class="card-effect">Effect: ${effectDisplay}</div>`;
    }
    
    cardElement.innerHTML = htmlContent;
    
    return cardElement;
}

// Select a card from hand
function selectCard(cardId) {
    const card = getCardById(cardId);
    if (!card) return;
    
    // Check if player has enough focus
    if (card.focus_cost > combatState.playerFocus) {
        displayCombatMessage("Not enough focus to play this card!");
        return;
    }
    
    // Remove card from hand and add to played cards
    combatState.playerHand = combatState.playerHand.filter(id => id !== cardId);
    combatState.playedCards.push(cardId);
    combatState.playerFocus -= card.focus_cost;
    
    // Update UI
    displayPlayerHand();
    displayPlayedCards();
    updateFocusDisplay();
    
    // Apply card effects immediately
    applyCardEffect(card, 'player');
}

// Display played cards
function displayPlayedCards() {
    const playedArea = document.getElementById('player-cards-played');
    playedArea.innerHTML = '';
    
    combatState.playedCards.forEach(cardId => {
        const card = getCardById(cardId);
        if (!card) return;
        
        const cardElement = createCardElement(card);
        cardElement.classList.add('played');
        playedArea.appendChild(cardElement);
    });
}

// Update focus display
function updateFocusDisplay() {
    const focusFill = document.querySelector('.focus-fill');
    const focusText = document.querySelector('.focus-bar span');
    
    focusFill.style.width = `${(combatState.playerFocus / combatState.maxPlayerFocus) * 100}%`;
    focusText.textContent = `Focus: ${combatState.playerFocus}/${combatState.maxPlayerFocus}`;
}

// Apply card effect
function applyCardEffect(card, source) {
    if (card.type === 'attack') {
        // Apply damage
        let damage = card.base_damage;
        
        // Apply damage boost if active
        if (source === 'player' && combatState.playerDamageBoost > 1.0) {
            damage = Math.floor(damage * combatState.playerDamageBoost);
        }
        
        // Apply synergy bonuses
        const synergyBonus = calculateSynergyBonus(source);
        damage += synergyBonus;
        
        if (source === 'player') {
            // Apply enemy defense multiplier
            damage = Math.floor(damage * (2 - combatState.enemyDefenseMultiplier));
            
            // Apply enemy vulnerability multiplier
            damage = Math.floor(damage * combatState.enemyVulnerabilityMultiplier);
            
            // Player attacking enemy
            combatState.currentFight.enemy.currentHealth -= damage;
            displayCombatMessage(`You dealt ${damage} damage to ${combatState.currentFight.enemy.name}!`);
            
            // Apply reflect if active
            if (combatState.enemyReflectAmount > 0) {
                const reflectDamage = Math.floor(damage * combatState.enemyReflectAmount);
                gameState.playerStats.health -= reflectDamage;
                displayCombatMessage(`${reflectDamage} damage was reflected back to you!`);
                updatePlayerHealth();
            }
            
            updateEnemyHealth();
        } else {
            // Apply player defense multiplier
            damage = Math.floor(damage * (2 - combatState.playerDefenseMultiplier));
            
            // Apply player vulnerability multiplier
            damage = Math.floor(damage * combatState.playerVulnerabilityMultiplier);
            
            // Enemy attacking player
            gameState.playerStats.health -= damage;
            displayCombatMessage(`${combatState.currentFight.enemy.name} dealt ${damage} damage to you!`);
            
            // Apply reflect if active
            if (combatState.playerReflectAmount > 0) {
                const reflectDamage = Math.floor(damage * combatState.playerReflectAmount);
                combatState.currentFight.enemy.currentHealth -= reflectDamage;
                displayCombatMessage(`${reflectDamage} damage was reflected back to the enemy!`);
                updateEnemyHealth();
            }
            
            updatePlayerHealth();
        }
    } else if (card.type === 'action') {
        // Apply action effect based on card's effect property
        switch (card.effect_type) {
            case 'heal':
                if (source === 'player') {
                    const healAmount = Math.floor(gameState.playerStats.maxHealth * card.effect_value);
                    gameState.playerStats.health = Math.min(gameState.playerStats.health + healAmount, gameState.playerStats.maxHealth);
                    displayCombatMessage(`You healed for ${healAmount} health!`);
                    updatePlayerHealth();
                } else {
                    const healAmount = Math.floor(combatState.currentFight.enemy.maxHealth * card.effect_value);
                    combatState.currentFight.enemy.currentHealth = Math.min(
                        combatState.currentFight.enemy.currentHealth + healAmount, 
                        combatState.currentFight.enemy.maxHealth
                    );
                    displayCombatMessage(`${combatState.currentFight.enemy.name} healed for ${healAmount} health!`);
                    updateEnemyHealth();
                }
                break;
            case 'focus_gain':
                if (source === 'player') {
                    combatState.playerFocus = Math.min(combatState.playerFocus + card.effect_value, combatState.maxPlayerFocus);
                    displayCombatMessage(`You gained ${card.effect_value} focus!`);
                    updateFocusDisplay();
                }
                break;
            case 'defense':
                if (source === 'player') {
                    combatState.playerDefenseMultiplier = card.effect_value;
                    displayCombatMessage(`You take ${Math.round((1 - card.effect_value) * 100)}% less damage for one turn!`);
                } else {
                    combatState.enemyDefenseMultiplier = card.effect_value;
                    displayCombatMessage(`${combatState.currentFight.enemy.name} takes ${Math.round((1 - card.effect_value) * 100)}% less damage for one turn!`);
                }
                break;
            case 'focus_gain_vulnerable':
                if (source === 'player') {
                    combatState.playerFocus = Math.min(combatState.playerFocus + card.effect_value, combatState.maxPlayerFocus);
                    combatState.playerVulnerabilityMultiplier = card.vulnerability_multiplier;
                    displayCombatMessage(`You gained ${card.effect_value} focus but are now vulnerable!`);
                    updateFocusDisplay();
                }
                break;
            case 'tank_heal':
                if (source === 'player') {
                    combatState.playerVulnerabilityMultiplier = card.vulnerability_multiplier;
                    combatState.playerTankHealAmount = card.effect_value;
                    displayCombatMessage(`You enter a risky stance! Damage taken is tripled, but you'll heal if you survive.`);
                } else {
                    combatState.enemyVulnerabilityMultiplier = card.vulnerability_multiplier;
                    combatState.enemyTankHealAmount = card.effect_value;
                    displayCombatMessage(`${combatState.currentFight.enemy.name} enters a risky stance!`);
                }
                break;
            case 'reflect':
                if (source === 'player') {
                    combatState.playerReflectAmount = card.effect_value;
                    displayCombatMessage(`You created a reflective barrier that returns ${Math.round(card.effect_value * 100)}% of damage!`);
                } else {
                    combatState.enemyReflectAmount = card.effect_value;
                    displayCombatMessage(`${combatState.currentFight.enemy.name} created a reflective barrier!`);
                }
                break;
            case 'damage_boost':
                if (source === 'player') {
                    combatState.playerDamageBoost = 1.0 + card.effect_value;
                    combatState.playerDamageBoostDuration = card.effect_duration;
                    displayCombatMessage(`You analyzed the enemy's weakness! +${Math.round(card.effect_value * 100)}% damage for ${card.effect_duration} turns.`);
                }
                break;
        }
    }
    
    // Check win/loss conditions
    checkCombatEnd();
}

// Calculate synergy bonus based on played cards
function calculateSynergyBonus(source) {
    const playedCards = source === 'player' ? combatState.playedCards : combatState.enemyPlayedCards;
    const cardObjects = playedCards.map(getCardById).filter(card => card && card.type === 'attack');
    
    // Get unique affinities
    const affinities = new Set(cardObjects.map(card => card.affinity));
    
    // Basic synergy: 1 bonus damage per unique affinity beyond the first
    let bonus = affinities.size > 1 ? affinities.size - 1 : 0;
    
    // Perfect synergy: all 5 elemental affinities
    const elementalAffinities = ['fire', 'water', 'thunder', 'light', 'dark'];
    const hasAllElements = elementalAffinities.every(aff => affinities.has(aff));
    
    if (hasAllElements) {
        // Perfect synergy bonus (massive damage)
        bonus += 10;
        displayCombatMessage("PERFECT SYNERGY! Massive damage bonus!");
    }
    
    return bonus;
}

// Update enemy health display
function updateEnemyHealth() {
    const healthBar = document.querySelector('#enemy-area .health-fill');
    const healthText = document.querySelector('#enemy-area .health-bar span');
    
    if (healthBar && healthText) {
        const healthPercentage = (combatState.enemyHealth / combatState.enemyMaxHealth) * 100;
        healthBar.style.width = `${healthPercentage}%`;
        healthText.textContent = `${combatState.enemyHealth}/${combatState.enemyMaxHealth}`;
    }
}

// Update player health display
function updatePlayerHealth() {
    const healthBar = document.querySelector('#player-area .health-fill');
    const healthText = document.querySelector('#player-area .health-bar span');
    
    if (healthBar && healthText) {
        const healthPercentage = (combatState.playerHealth / combatState.playerMaxHealth) * 100;
        healthBar.style.width = `${healthPercentage}%`;
        healthText.textContent = `${combatState.playerHealth}/${combatState.playerMaxHealth}`;
    }
}

// Display combat message
function displayCombatMessage(message) {
    const messagesDiv = document.getElementById('combat-messages');
    if (messagesDiv) {
        // Replace the content instead of appending
        messagesDiv.innerHTML = `<div class="combat-message">${message}</div>`;
    }
}

// End player turn
function endPlayerTurn() {
    // Calculate and apply synergy effects for all played cards
    const synergyBonus = calculateSynergyBonus('player');
    if (synergyBonus > 0) {
        displayCombatMessage(`Synergy bonus: +${synergyBonus} damage!`);
    }
    
    // Clear played cards
    combatState.playedCards = [];
    displayPlayedCards();
    
    // Start enemy turn
    startEnemyTurn();
}

// Sacrifice turn for focus
function sacrificeForFocus() {
    displayCombatMessage("You sacrificed your turn to regain focus!");
    
    // Gain extra focus (more than regular regeneration)
    const focusGain = combatState.focusRegen + 2;
    combatState.playerFocus = Math.min(combatState.playerFocus + focusGain, combatState.maxPlayerFocus);
    updateFocusDisplay();
    
    // Clear played cards
    combatState.playedCards = [];
    displayPlayedCards();
    
    // Start enemy turn
    startEnemyTurn();
}

// Start player turn
function startPlayerTurn() {
    combatState.turnCount++;
    displayCombatMessage(`--- Turn ${combatState.turnCount}: Your Turn ---`);
    
    // Reset defense multiplier each turn
    combatState.playerDefenseMultiplier = 1.0;
    
    // Reset vulnerability multiplier unless from tank_heal
    if (combatState.playerTankHealAmount === 0) {
        combatState.playerVulnerabilityMultiplier = 1.0;
    }
    
    // Reset reflect amount
    combatState.playerReflectAmount = 0;
    
    // Check if tank_heal should trigger
    if (combatState.playerTankHealAmount > 0) {
        const healAmount = Math.floor(combatState.playerMaxHealth * combatState.playerTankHealAmount);
        combatState.playerHealth = Math.min(combatState.playerHealth + healAmount, combatState.playerMaxHealth);
        displayCombatMessage(`Last Stand activated! You healed for ${healAmount} health!`);
        updatePlayerHealth();
        
        // Reset tank heal and vulnerability
        combatState.playerTankHealAmount = 0;
        combatState.playerVulnerabilityMultiplier = 1.0;
    }
    
    // Decrement damage boost duration
    if (combatState.playerDamageBoostDuration > 0) {
        combatState.playerDamageBoostDuration--;
        if (combatState.playerDamageBoostDuration === 0) {
            combatState.playerDamageBoost = 1.0;
            displayCombatMessage("Your damage boost has worn off.");
        } else {
            displayCombatMessage(`Damage boost active: ${Math.round((combatState.playerDamageBoost - 1.0) * 100)}% for ${combatState.playerDamageBoostDuration} more turns.`);
        }
    }
    
    // Regenerate focus
    combatState.playerFocus = Math.min(combatState.playerFocus + combatState.focusRegen, combatState.maxPlayerFocus);
    updateFocusDisplay();
    
    // Enable player controls
    document.getElementById('end-turn-btn').disabled = false;
    document.getElementById('focus-btn').disabled = false;
    
    // Count current attack and action cards
    const attackCards = combatState.playerHand.filter(cardId => {
        const card = getCardById(cardId);
        return card && card.type === 'attack';
    });
    
    const actionCards = combatState.playerHand.filter(cardId => {
        const card = getCardById(cardId);
        return card && card.type === 'action';
    });
    
    // Fill up missing attack cards
    const attackCardsToDraw = 7 - attackCards.length;
    for (let i = 0; i < attackCardsToDraw; i++) {
        if (combatState.playerAttackPool.length > 0) {
            const cardIndex = Math.floor(Math.random() * combatState.playerAttackPool.length);
            const drawnCard = combatState.playerAttackPool[cardIndex];
            combatState.playerHand.push(drawnCard);
        }
    }
    
    // Fill up missing action cards
    const actionCardsToDraw = 3 - actionCards.length;
    for (let i = 0; i < actionCardsToDraw; i++) {
        if (combatState.playerActionPool.length > 0) {
            const cardIndex = Math.floor(Math.random() * combatState.playerActionPool.length);
            const drawnCard = combatState.playerActionPool[cardIndex];
            combatState.playerHand.push(drawnCard);
        }
    }
    
    // Update the display
    displayPlayerHand();
    
    // Reset selections
    combatState.selectedCards = [];
    combatState.discardCards = [];
    combatState.totalFocusCost = 0;
    updateFocusCostDisplay();
}

// Start enemy turn
function startEnemyTurn() {
    displayCombatMessage(`--- ${combatState.currentFight.enemy.name}'s Turn ---`);
    
    // Disable player controls
    document.getElementById('end-turn-btn').disabled = true;
    document.getElementById('focus-btn').disabled = true;
    
    // Enemy AI selects and plays cards
    setTimeout(() => {
        executeEnemyTurn();
    }, 1000);
}

// Execute enemy turn
function executeEnemyTurn() {
    // Clear enemy played cards
    combatState.enemyPlayedCards = [];
    
    // Simple AI for enemy card selection
    const enemyFocus = combatState.currentFight.enemy.focus || 5;
    let remainingFocus = enemyFocus;
    
    // Sort cards by priority (attack cards first, then action cards)
    const sortedHand = [...combatState.enemyHand].sort((a, b) => {
        const cardA = getCardById(a);
        const cardB = getCardById(b);
        
        if (!cardA || !cardB) return 0;
        
        // Prioritize attack cards
        if (cardA.type === 'attack' && cardB.type !== 'attack') return -1;
        if (cardA.type !== 'attack' && cardB.type === 'attack') return 1;
        
        // Then prioritize by damage or effect value
        if (cardA.type === 'attack' && cardB.type === 'attack') {
            return cardB.base_damage - cardA.base_damage;
        }
        
        return 0;
    });
    
    // Play cards until out of focus or cards
    const playedCardIds = [];
    
    for (const cardId of sortedHand) {
        const card = getCardById(cardId);
        if (!card) continue;
        
        // Check if enemy has enough focus
        if (card.focus_cost <= remainingFocus) {
            // Play the card
            playedCardIds.push(cardId);
            combatState.enemyPlayedCards.push(cardId);
            remainingFocus -= card.focus_cost;
            
            // Display enemy playing card
            displayCombatMessage(`${combatState.currentFight.enemy.name} plays ${card.name}!`);
            
            // Apply card effect
            applyCardEffect(card, 'enemy');
            
            // Break if combat has ended
            if (!combatState.inCombat) break;
            
            // Add a small delay between cards
            setTimeout(() => {}, 500);
        }
    }
    
    // Remove played cards from enemy hand
    combatState.enemyHand = combatState.enemyHand.filter(id => !playedCardIds.includes(id));
    
    // If enemy hand is empty, deal new cards
    if (combatState.enemyHand.length === 0) {
        dealEnemyHand();
    }
    
    // End enemy turn if combat is still ongoing
    if (combatState.inCombat) {
        setTimeout(() => {
            startPlayerTurn();
        }, 1000);
    }
}

// Check if combat has ended
function checkCombatEnd() {
    // Check if enemy is defeated
    if (combatState.currentFight.enemy.currentHealth <= 0) {
        combatState.inCombat = false;
        displayCombatMessage(`You defeated ${combatState.currentFight.enemy.name}!`);
        
        setTimeout(() => {
            endCombat('victory');
        }, 2000);
        return true;
    }
    
    // Check if player is defeated
    if (gameState.playerStats.health <= 0) {
        combatState.inCombat = false;
        displayCombatMessage("You have been defeated!");
        
        setTimeout(() => {
            endCombat('defeat');
        }, 2000);
        return true;
    }
    
    return false;
}

function toggleCardDiscard(cardId, cardElement) {
    if (!cardId || !cardElement) {
        console.error("Invalid card or element in toggleCardDiscard:", cardId, cardElement);
        return;
    }
    
    console.log("Toggling discard for card:", cardId);
    
    const card = getCardById(cardId);
    if (!card) {
        console.error("Failed to get card data for discard:", cardId);
        return;
    }
    
    // Initialize discardCards array if it doesn't exist
    if (!combatState.discardCards) {
        combatState.discardCards = [];
    }
    
    // Check if card is already discarded
    const isDiscarded = cardElement.classList.contains('discard');
    
    // If card is selected, deselect it first
    if (cardElement.classList.contains('selected')) {
        toggleCardSelection(cardId, cardElement);
    }
    
    // Toggle discard state
    if (isDiscarded) {
        cardElement.classList.remove('discard');
        combatState.discardCards = combatState.discardCards.filter(id => id !== cardId);
        console.log("Card removed from discard list:", cardId);
    } else {
        cardElement.classList.add('discard');
        if (!combatState.discardCards.includes(cardId)) {
            combatState.discardCards.push(cardId);
        }
        console.log("Card added to discard list:", cardId);
    }
    
    // Update focus cost display (in case we deselected a card)
    updateFocusCostDisplay();
}

// End combat and return to story
function endCombat(result) {
    const contentArea = document.getElementById('content-area');
    contentArea.classList.remove('combat-active');
    // Apply post-combat effects
    if (result === 'victory') {
        // Award experience, items, etc.
        if (combatState.currentFight.rewards) {
            // Handle rewards
            displayCombatMessage("You received rewards!");
        }
        
        // Proceed to next scene
        const nextSceneId = combatState.currentFight.nextSceneId;
        if (nextSceneId) {
            displayScene(nextSceneId);
        } else {
            displayScene(combatState.returnScene);
        }
    } else {
        // Handle defeat
        displayScene(combatState.returnScene || 'game_over');
    }
    
    // Reset combat state
    combatState.inCombat = false;
    combatState.currentFight = null;
    combatState.playerHand = [];
    combatState.enemyHand = [];
}

// Show restart options for combat
function restartCombat() {
    if (!combatState.currentFight) return;
    
    // Reset health and focus
    gameState.playerStats.health = gameState.playerStats.maxHealth;
    combatState.playerFocus = combatState.maxPlayerFocus;
    
    // Reinitialize the same fight
    initiateCombat(combatState.currentFight.id, combatState.returnScene);
}

function logPlayerHand() {
    console.log("Current player hand:", combatState.playerHand);
    
    if (Array.isArray(combatState.playerHand)) {
        combatState.playerHand.forEach(cardId => {
            const card = getCardById(cardId);
            console.log(`Card ${cardId}:`, card);
        });
    }
}
