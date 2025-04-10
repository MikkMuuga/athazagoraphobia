// Game state
const gameState = {
    currentScene: 'intro',
    character: {
        name: '',
        gender: '',
        stats: {
            strength: 10,
            agility: 10,
            intelligence: 10,
            charisma: 10
        },
        inventory: []
    },
    journal: [],
    achievements: [],
    visitedScenes: new Set(),
    flags: {} // For tracking game progress and choices
};
 
// Game scenes database
const scenes = {
    intro: {
        title: '',
        content: `<p class="story-paragraph">Welcome to Athazagoraphobia, a text-based adventure game about memory, fear, and the unknown.</p>
        <p class="story-paragraph">You will navigate through a mysterious world, uncovering secrets about yourself and your past. Make choices carefully, as they will affect your journey.</p>`,
        choices: [
            { text: "You open your eyes.", nextScene: "awaken" }
        ]
    },
    awaken: {
        title: 'CHAPTER 1',
        content: `<p class="story-paragraph">The canopy of foliage above your head is dipped in gold, each branch still clinging to the decaying summer glory, but its gilt is already shedding down onto the barely trodden forest paths. It is fresh, at least, and although the dewy, chill air may not move around, the smell of soggy wood and decaying leaves is always a pleasant change from that of cheap, bitter ale and rotting harvest mounts.</p>
        <p class="story-paragraph">Your back is one with the drying bark of an old beech tree, pressed into a convenient nook at its broad base. Moss spills around the roots, greedily swallowing the tiniest of sounds of your boots, heels dug firmly.</p>
        <p class="story-paragraph">As your vision clears, you see four bodies scattered around you. Skeletons, wearing tattered remains of what once might have been armor. These were your companions, your party members. You seem to be the only survivor.</p>`,
        choices: [
            { text: "Try to focus on remembering", nextScene: "remember_attempt" }
        ]
    },
    remember_attempt: {
        title: 'CHAPTER 1',
        content: `<p class="story-paragraph">The canopy of foliage above your head is dipped in gold, each branch still clinging to the decaying summer glory, but its gilt is already shedding down onto the barely trodden forest paths. It is fresh, at least, and although the dewy, chill air may not move around, the smell of soggy wood and decaying leaves is always a pleasant change from that of cheap, bitter ale and rotting harvest mounts.</p>
        <p class="story-paragraph">Your back is one with the drying bark of an old beech tree, pressed into a convenient nook at its broad base. Moss spills around the roots, greedily swallowing the tiniest of sounds of your boots, heels dug firmly.</p>
        <p class="story-paragraph">As your vision clears, you see four bodies scattered around you. Skeletons, wearing tattered remains of what once might have been armor. These were your companions, your party members. You seem to be the only survivor.</p>
        <p class="story-paragraph">You try to remember what happened, but all you can see is a bright flash of light. Despite your best efforts, you struggle to remember even the faintest of details.</p>`,
        choices: [
            { text: "Focus on yourself", nextScene: "self_focus" }
        ]
    },
    self_focus: {
        title: 'CHAPTER 1',
        content: `<p class="story-paragraph">Your name is: <input type="text" id="player-name" class="name-input"><button id="name-submit" class="choice-button" style="display:inline-block; padding:5px 10px;">Enter</button></p>`,
        noChoices: true // Special flag to indicate we're handling input differently
    },
    self_focus_gender: {
        title: 'CHAPTER 1',
        content: function() {
            return `<p class="story-paragraph">Your name is: ${gameState.character.name}</p>
            <p class="story-paragraph">You are <span class="gender-option" id="male-option">male</span>/<span class="gender-option" id="female-option">female</span>.</p>`;
        },
        noChoices: true // Special flag to indicate we're handling input differently
    },
    self_focus_complete: {
        title: 'CHAPTER 1',
        content: function() {
            return `<p class="story-paragraph">Your name is: ${gameState.character.name}</p>
            <p class="story-paragraph">You are ${gameState.character.gender}.</p>
            <p class="story-paragraph">You remember being an adventurer, alongside your party members. You seem to be the only one who survived your last mission. The details are hazy, but you recall entering these woods on a quest to investigate strange occurrences.</p>
            <p class="story-paragraph">You hear something moving in the bushes nearby.</p>`;
        },
        choices: [
            { text: "Stand up", nextScene: "wolves_1_1" }
        ]
    },
    wolves_1_1: {
        title: 'CHAPTER 1',
        content: `<p class="story-paragraph">As you struggle to your feet, three wolves emerge from the bushes. Their eyes gleam with hunger as they slowly circle around you, cutting off any escape route.</p>
        <p class="story-paragraph">Your muscles ache and your head feels light. These wolves must have smelled the death around you and came for an easy meal. Unfortunately for them, not everyone here is dead yet.</p>
        <p class="story-paragraph">You need to act quickly. The wolves are getting closer, their growls growing louder by the second.</p>`,
        choices: [
            { text: "Look for a weapon", nextScene: "wolves_weapon" },
            { text: "Try to intimidate the wolves", nextScene: "wolves_intimidate" },
            { text: "Attempt to flee", nextScene: "wolves_flee" }
        ]
    }
    // More scenes can be added as needed
};
 
// DOM elements
const contentArea = document.getElementById('content-area');
const characterButton = document.getElementById('character-button');
const journalButton = document.getElementById('journal-button');
const achievementsButton = document.getElementById('achievements-button');
const savesButton = document.getElementById('saves-button');
const settingsButton = document.getElementById('settings-button');
const restartButton = document.getElementById('restart-button');
 
// Initialize the game
function initGame() {
    displayScene('intro');
    setupEventListeners();
}
 
// Display a scene
function displayScene(sceneId) {
    const scene = scenes[sceneId];
    if (!scene) {
        console.error(`Scene "${sceneId}" not found!`);
        return;
    }
   
    gameState.currentScene = sceneId;
    gameState.visitedScenes.add(sceneId);
   
    let content = '';
   
    // Add chapter title if exists
    if (scene.title) {
        content += `<h1 class="chapter-title">${scene.title}</h1>`;
    }
   
    // Add scene content
    if (typeof scene.content === 'function') {
        content += scene.content(); // For dynamic content based on game state
    } else {
        content += scene.content;
    }
   
    // Add choices if they exist and scene doesn't have special handling
    if (!scene.noChoices && scene.choices && scene.choices.length > 0) {
        content += '<div class="choice-container">';
        scene.choices.forEach((choice) => {
            content += `<button class="choice-button" data-next-scene="${choice.nextScene}">${choice.text}</button>`;
        });
        content += '</div>';
    }
   
    contentArea.innerHTML = content;
   
    // Set up event listeners for special scenes
    if (sceneId === 'self_focus') {
        document.getElementById('name-submit').addEventListener('click', function() {
            const nameInput = document.getElementById('player-name');
            if (nameInput.value.trim() !== '') {
                gameState.character.name = nameInput.value.trim();
                displayScene('self_focus_gender');
            } else {
                alert('Please enter your name.');
            }
        });
       
        // Allow Enter key to submit name
        document.getElementById('player-name').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                document.getElementById('name-submit').click();
            }
        });
    } else if (sceneId === 'self_focus_gender') {
        document.getElementById('male-option').addEventListener('click', function() {
            gameState.character.gender = 'male';
            displayScene('self_focus_complete');
        });
       
        document.getElementById('female-option').addEventListener('click', function() {
            gameState.character.gender = 'female';
            displayScene('self_focus_complete');
        });
    }
   
    // Set up choice buttons
    document.querySelectorAll('.choice-button:not(#name-submit)').forEach(button => {
        button.addEventListener('click', function() {
            const nextScene = this.getAttribute('data-next-scene');
            if (nextScene) {
                displayScene(nextScene);
            }
        });
    });
}
 
// Display character screen
function displayCharacter() {
    const content = `
        <div id="character-content">
            <h1 class="chapter-title">Character</h1>
            <p class="story-paragraph"><strong>Name:</strong> ${gameState.character.name || "Unknown"}</p>
            <p class="story-paragraph"><strong>Gender:</strong> ${gameState.character.gender || "Unknown"}</p>
           
            <h2 style="margin-top: 20px; color: var(--accent-color);">Stats</h2>
            <div class="stats-container">
                <div class="stat-item">
                    <span class="stat-label">Strength:</span> ${gameState.character.stats.strength}
                </div>
                <div class="stat-item">
                    <span class="stat-label">Agility:</span> ${gameState.character.stats.agility}
                </div>
                <div class="stat-item">
                    <span class="stat-label">Intelligence:</span> ${gameState.character.stats.intelligence}
                </div>
                <div class="stat-item">
                    <span class="stat-label">Charisma:</span> ${gameState.character.stats.charisma}
                </div>
            </div>
           
            <h2 style="margin-top: 20px; color: var(--accent-color);">Inventory</h2>
            <div>
                ${gameState.character.inventory.length > 0
                    ? gameState.character.inventory.map(item => `<p>• ${item}</p>`).join('')
                    : '<p>Your inventory is empty.</p>'}
            </div>
           
            <button class="back-button" id="back-to-game">Return to Game</button>
        </div>
    `;
   
    contentArea.innerHTML = content;
   
    document.getElementById('back-to-game').addEventListener('click', function() {
        displayScene(gameState.currentScene);
    });
}
 
// Display journal screen
function displayJournal() {
    const content = `
        <div id="journal-content">
            <h1 class="chapter-title">Journal</h1>
            ${gameState.journal.length > 0
                ? gameState.journal.map(entry => `
                    <div style="margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid var(--divider-color);">
                        <p class="story-paragraph">${entry.text}</p>
                        <p style="font-size: 0.8em; color: var(--accent-color);">${entry.timestamp}</p>
                    </div>
                `).join('')
                : '<p class="story-paragraph">Your journal is empty. Notes will appear here as you discover important information.</p>'
            }
           
            <button class="back-button" id="back-to-game">Return to Game</button>
        </div>
    `;
   
    contentArea.innerHTML = content;
   
    document.getElementById('back-to-game').addEventListener('click', function() {
        displayScene(gameState.currentScene);
    });
}
 
// Display achievements screen
function displayAchievements() {
    const content = `
        <div id="achievements-content">
            <h1 class="chapter-title">Achievements</h1>
            ${gameState.achievements.length > 0
                ? gameState.achievements.map(achievement => `
                    <div style="margin-bottom: 15px; padding: 10px; background-color: rgba(255, 255, 255, 0.05); border-radius: 4px;">
                        <p style="font-weight: bold; color: var(--accent-color);">${achievement}</p>
                    </div>
                `).join('')
                : '<p class="story-paragraph">No achievements unlocked yet. Explore the world to discover achievements.</p>'
            }
           
            <button class="back-button" id="back-to-game">Return to Game</button>
        </div>
    `;
   
    contentArea.innerHTML = content;
   
    document.getElementById('back-to-game').addEventListener('click', function() {
        displayScene(gameState.currentScene);
    });
}
 
// Display saves screen
function displaySaves() {
    let saveSlots = '';
   
    for (let i = 1; i <= 3; i++) {
        const saveExists = localStorage.getItem(`athazagoraphobia_save_${i}`);
        let saveInfo = 'Empty Slot';
       
        if (saveExists) {
            const saveData = JSON.parse(saveExists);
            const sceneName = saveData.currentScene;
            saveInfo = `Scene: ${sceneName}`;
            if (saveData.character && saveData.character.name) {
                saveInfo += ` | Character: ${saveData.character.name}`;
            }
        }
       
        saveSlots += `
            <div class="save-slot">
                <div>
                    <strong>Slot ${i}</strong><br>
                    ${saveInfo}
                </div>
                <div>
                    <button class="save-slot-button" data-action="save" data-slot="${i}">Save</button>
                    ${saveExists ? `<button class="save-slot-button" data-action="load" data-slot="${i}">Load</button>` : ''}
                </div>
            </div>
        `;
    }
   
    const content = `
        <div id="saves-content">
            <h1 class="chapter-title">Save Game</h1>
            ${saveSlots}
            <button class="back-button" id="back-to-game">Return to Game</button>
        </div>
    `;
   
    contentArea.innerHTML = content;
   
    // Set up save/load buttons
    document.querySelectorAll('.save-slot-button').forEach(button => {
        button.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            const slot = this.getAttribute('data-slot');
           
            if (action === 'save') {
                saveGame(slot);
            } else if (action === 'load') {
                loadGame(slot);
            }
        });
    });
   
    document.getElementById('back-to-game').addEventListener('click', function() {
        displayScene(gameState.currentScene);
    });
}
 
// Display settings screen
function displaySettings() {
    const content = `
        <div id="settings-content">
            <h1 class="chapter-title">Settings</h1>
            <p class="story-paragraph">Game settings will appear here in future updates.</p>
            <button class="back-button" id="back-to-game">Return to Game</button>
        </div>
    `;
   
    contentArea.innerHTML = content;
   
    document.getElementById('back-to-game').addEventListener('click', function() {
        displayScene(gameState.currentScene);
    });
}
 
// Set up event listeners
function setupEventListeners() {
    // Sidebar buttons
    characterButton.addEventListener('click', displayCharacter);
    journalButton.addEventListener('click', displayJournal);
    achievementsButton.addEventListener('click', displayAchievements);
    savesButton.addEventListener('click', displaySaves);
    settingsButton.addEventListener('click', displaySettings);
    restartButton.addEventListener('click', confirmRestart);
}
 
// Confirm restart
function confirmRestart() {
    if (confirm('Are you sure you want to restart the game? All progress will be lost.')) {
        gameState.currentScene = 'intro';
        gameState.visitedScenes = new Set();
        gameState.flags = {};
        gameState.character = {
            name: '',
            gender: '',
            stats: {
                strength: 10,
                agility: 10,
                intelligence: 10,
                charisma: 10
            },
            inventory: []
        };
        gameState.journal = [];
        displayScene('intro');
    }
}
 
// Save game
function saveGame(slotId) {
    const saveData = JSON.stringify(gameState);
    localStorage.setItem(`athazagoraphobia_save_${slotId}`, saveData);
    alert(`Game saved to slot ${slotId}`);
    displaySaves(); // Refresh the saves screen
}
 
// Load game
function loadGame(slotId) {
    const saveData = localStorage.getItem(`athazagoraphobia_save_${slotId}`);
    if (saveData) {
        Object.assign(gameState, JSON.parse(saveData));
        displayScene(gameState.currentScene);
        alert(`Game loaded from slot ${slotId}`);
    } else {
        alert(`No save data found in slot ${slotId}`);
    }
}
 
// Add a journal entry
function addJournalEntry(entry) {
    gameState.journal.push({
        text: entry,
        timestamp: new Date().toLocaleString()
    });
}
 
// Unlock an achievement
function unlockAchievement(achievement) {
    if (!gameState.achievements.includes(achievement)) {
        gameState.achievements.push(achievement);
        alert(`Achievement Unlocked: ${achievement}`);
    }
}
 
// Start the game when the page loads
window.addEventListener('load', initGame);