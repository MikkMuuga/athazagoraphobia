// Game state
const gameState = {
    currentChapter: 'chapter1',
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
    flags: {},
    systemScreens: {}
};

// Scene cache
const sceneCache = {};

// DOM elements
const contentArea = document.getElementById('content-area');
const characterButton = document.getElementById('character-button');
const journalButton = document.getElementById('journal-button');
const achievementsButton = document.getElementById('achievements-button');
const savesButton = document.getElementById('saves-button');
const settingsButton = document.getElementById('settings-button');
const restartButton = document.getElementById('restart-button');
const playButton = document.getElementById('play-button'); 

async function loadSystemScreens() {
    try {
        const response = await fetch('scenes/system.json');
        if (!response.ok) {
            throw new Error('Failed to load system screens');
        }
        gameState.systemScreens = await response.json();
    } catch (error) {
        console.error('Error loading system screens:', error);
    }
}

// Initialize the game
async function initGame() {
    await loadSystemScreens(); // Add this line
    // Preload the first chapter then display the scene
    loadChapter('chapter1').then(() => {
        displayScene('intro');
    }).catch(error => {
        console.error("Failed to load initial chapter:", error);
        contentArea.innerHTML = "<p>Error loading game content. Please refresh the page.</p>";
    });
    
    setupEventListeners();
}

// Load a chapter's scenes from JSON
async function loadChapter(chapterId) {
    if (sceneCache[chapterId]) {
        return sceneCache[chapterId];
    }
    
    try {
        const response = await fetch(`scenes/${chapterId}.json`);
        if (!response.ok) {
            throw new Error(`Failed to load chapter: ${chapterId}`);
        }
        const scenes = await response.json();
        sceneCache[chapterId] = scenes;
        return scenes;
    } catch (error) {
        console.error('Error loading chapter:', error);
        throw error; // Re-throw to handle in calling function
    }
}

// Process content template with game state
function processContentTemplate(content) {
    if (!content) return '';
    return content.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
        const parts = path.split('.');
        let value = gameState;
        
        for (const part of parts) {
            value = value[part];
            if (value === undefined) break;
        }
        
        return value !== undefined ? value : match;
    });
}

// Display a scene
async function displayScene(sceneId) {
    try {
        // Check if sceneId contains chapter information (format: "chapter:scene")
        let [chapterId, actualSceneId] = sceneId.includes(':') ? 
            sceneId.split(':') : [gameState.currentChapter, sceneId];
        
        // Load the chapter if needed
        const chapterScenes = await loadChapter(chapterId);
        if (!chapterScenes) {
            throw new Error(`Chapter "${chapterId}" not found!`);
        }
        
        const scene = chapterScenes[actualSceneId];
        if (!scene) {
            throw new Error(`Scene "${actualSceneId}" not found in chapter "${chapterId}"!`);
        }
        
        // Update game state
        gameState.currentChapter = chapterId;
        gameState.currentScene = actualSceneId;
        gameState.visitedScenes.add(`${chapterId}:${actualSceneId}`);
        
        let content = '';
        
        // Add chapter title if exists
        if (scene.title) {
            content += `<h1 class="chapter-title">${scene.title}</h1>`;
        }
        
        // Add scene content
        let sceneContent = typeof scene.content === 'function' ? scene.content() : scene.content;
        sceneContent = processContentTemplate(sceneContent);
        content += sceneContent;
        
        // Add choices if they exist and scene doesn't have special handling
        if (!scene.noChoices && scene.choices && scene.choices.length > 0) {
            content += '<div class="choice-container">';
            scene.choices.forEach((choice) => {
                content += `<button class="choice-button" data-next-scene="${choice.nextScene}" 
                             ${choice.chapterTransition ? 'data-chapter-transition="true"' : ''}>
                             ${choice.text}
                           </button>`;
            });
            content += '</div>';
        }
        
        contentArea.innerHTML = content;
        
        // Set up event listeners for special scenes
        if (actualSceneId === 'self_focus') {
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
        } else if (actualSceneId === 'self_focus_gender') {
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
            button.addEventListener('click', async function() {
                const nextScene = this.getAttribute('data-next-scene');
                const isChapterTransition = this.getAttribute('data-chapter-transition') === 'true';
                
                if (nextScene) {
                    try {
                        if (isChapterTransition) {
                            // Preload the next chapter for smoother transition
                            const [nextChapter] = nextScene.split(':');
                            await loadChapter(nextChapter);
                        }
                        await displayScene(nextScene);
                    } catch (error) {
                        console.error("Error transitioning to next scene:", error);
                        contentArea.innerHTML = "<p>Error loading next scene. Please try again.</p>";
                    }
                }
            });
        });
    } catch (error) {
        console.error("Error displaying scene:", error);
        contentArea.innerHTML = `
            <p>Error loading game content.</p>
            <button class="choice-button" onclick="displayScene('intro')">Restart Game</button>
        `;
    }
}
 
async function displaySystemScreen(screenId) {
    const screen = gameState.systemScreens[screenId];
    if (!screen) {
        console.error(`System screen "${screenId}" not found!`);
        return;
    }

    let content = '';
    
    // Add title if exists
    if (screen.title) {
        content += `<h1 class="chapter-title">${screen.title}</h1>`;
    }
    
    // Process content
    let screenContent = processSystemContent(screen.content, screenId);
    content += screenContent;
    
    // Add choices
    if (screen.choices && screen.choices.length > 0) {
        content += '<div class="choice-container">';
        screen.choices.forEach((choice) => {
            content += `<button class="choice-button" data-action="${choice.action}">
                         ${choice.text}
                       </button>`;
        });
        content += '</div>';
    }
    
    contentArea.innerHTML = content;
    
    // Set up event listeners for buttons
    document.querySelectorAll('.choice-button').forEach(button => {
        button.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            if (action === 'backToGame') {
                displayScene(gameState.currentScene);
            }
        });
    });
    
    // Special handling for save slots
    if (screenId === 'saves_screen') {
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
    }
}

function processSystemContent(template, screenId) {
    // Simple template processing
    let content = template;
    
    // Handle character screen
    if (screenId === 'character_screen') {
        content = content.replace(/\{\{character\.name\}\}/g, gameState.character.name || "Unknown")
                         .replace(/\{\{character\.gender\}\}/g, gameState.character.gender || "Unknown")
                         .replace(/\{\{character\.stats\.strength\}\}/g, gameState.character.stats.strength)
                         .replace(/\{\{character\.stats\.agility\}\}/g, gameState.character.stats.agility)
                         .replace(/\{\{character\.stats\.intelligence\}\}/g, gameState.character.stats.intelligence)
                         .replace(/\{\{character\.stats\.charisma\}\}/g, gameState.character.stats.charisma);
        
        // Handle inventory
        if (gameState.character.inventory.length > 0) {
            content = content.replace(/\{\{#if character\.inventory\.length\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1')
                            .replace(/\{\{#each character\.inventory\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, itemTemplate) => {
                                return gameState.character.inventory.map(item => 
                                    itemTemplate.replace(/\{\{this\}\}/g, item)
                                ).join('');
                            });
        } else {
            content = content.replace(/\{\{#if character\.inventory\.length\}\}[\s\S]*?\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
        }
    }
    
    // Handle journal screen
    else if (screenId === 'journal_screen') {
        if (gameState.journal.length > 0) {
            content = content.replace(/\{\{#if journal\.length\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1')
                            .replace(/\{\{#each journal\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, entryTemplate) => {
                                return gameState.journal.map(entry => 
                                    entryTemplate.replace(/\{\{this\.text\}\}/g, entry.text)
                                                .replace(/\{\{this\.timestamp\}\}/g, entry.timestamp)
                                ).join('');
                            });
        } else {
            content = content.replace(/\{\{#if journal\.length\}\}[\s\S]*?\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
        }
    }
    
    // Handle achievements screen
    else if (screenId === 'achievements_screen') {
        if (gameState.achievements.length > 0) {
            content = content.replace(/\{\{#if achievements\.length\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1')
                            .replace(/\{\{#each achievements\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, achievementTemplate) => {
                                return gameState.achievements.map(achievement => 
                                    achievementTemplate.replace(/\{\{this\}\}/g, achievement)
                                ).join('');
                            });
        } else {
            content = content.replace(/\{\{#if achievements\.length\}\}[\s\S]*?\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
        }
    }
    
    // Handle saves screen
    else if (screenId === 'saves_screen') {
        let saveSlots = [];
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
            
            saveSlots.push({
                exists: !!saveExists,
                info: saveInfo
            });
        }
        
        content = content.replace(/\{\{#each saveSlots\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, slotTemplate) => {
            return saveSlots.map((slot, index) => 
                slotTemplate.replace(/\{\{@index\}\}/g, index + 1)
                           .replace(/\{\{this\.info\}\}/g, slot.info)
                           .replace(/\{\{this\.exists\}\}/g, slot.exists ? '' : 'style="display:none"')
            ).join('');
        });
    }
    
    return content;
}
 

function setupEventListeners() {
    // Sidebar buttons
    characterButton.addEventListener('click', () => displaySystemScreen('character_screen'));
    journalButton.addEventListener('click', () => displaySystemScreen('journal_screen'));
    achievementsButton.addEventListener('click', () => displaySystemScreen('achievements_screen'));
    savesButton.addEventListener('click', () => displaySystemScreen('saves_screen'));
    settingsButton.addEventListener('click', () => displaySystemScreen('settings_screen'));
    playButton.addEventListener('click', () => {
        if (gameState.currentScene) {
            displayScene(`${gameState.currentChapter}:${gameState.currentScene}`);
        } else {
            // Fallback to intro if no current scene is set
            displayScene('intro');
        }
    });
    
    restartButton.addEventListener('click', confirmRestart);
}
// Confirm restart
function confirmRestart() {
    if (confirm('Are you sure you want to restart the game? All progress will be lost.')) {
        // Store name and gender temporarily
        const playerName = gameState.character.name;
        const playerGender = gameState.character.gender;
        
        // Reset game state
        gameState.currentChapter = 'chapter1';
        gameState.currentScene = 'intro'; // First set to intro
        gameState.visitedScenes = new Set();
        gameState.flags = {};
        gameState.character = {
            name: playerName, // Preserve player name
            gender: playerGender, // Preserve player gender
            stats: {
                strength: 10,
                agility: 10,
                intelligence: 10,
                charisma: 10
            },
            inventory: []
        };
        gameState.journal = [];
        
        try {
            // Ensure the chapter is loaded before trying to display the scene
            loadChapter('chapter1')
                .then(() => {
                    // If character has a name, we'll assume they've completed setup
                    // and should skip to the first story scene
                    if (playerName && playerName.trim() !== '') {
                        // Try to load the first story scene
                        // This could be 'self_focus_complete' or another scene that starts the actual story
                        const firstStoryScene = 'self_focus_complete'; 
                        
                        // Check if the scene exists in chapter1
                        if (sceneCache['chapter1'] && sceneCache['chapter1'][firstStoryScene]) {
                            displayScene(firstStoryScene);
                        } else {
                            // If scene doesn't exist, fall back to intro
                            displayScene('intro');
                        }
                    } else {
                        // If no name is set, start from the very beginning
                        displayScene('intro');
                    }
                })
                .catch(error => {
                    console.error("Failed to load chapter during restart:", error);
                    // Fallback to a safe display if chapter loading fails
                    contentArea.innerHTML = `
                        <p>Error restarting game. Please refresh the page.</p>
                        <button class="choice-button" onclick="location.reload()">Refresh Page</button>
                    `;
                });
        } catch (error) {
            console.error("Error in restart process:", error);
            contentArea.innerHTML = `
                <p>Error restarting game. Please refresh the page.</p>
                <button class="choice-button" onclick="location.reload()">Refresh Page</button>
            `;
        }
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

function returnToGame() {
    try {
        // Check if we have a valid current scene
        if (gameState.currentChapter && gameState.currentScene) {
            const sceneKey = `${gameState.currentChapter}:${gameState.currentScene}`;
            
            // Verify the scene exists in cache
            if (sceneCache[gameState.currentChapter] && 
                sceneCache[gameState.currentChapter][gameState.currentScene]) {
                displayScene(sceneKey);
                return;
            }
        }
        
        // Fallback to intro if anything goes wrong
        displayScene('intro');
    } catch (error) {
        console.error("Error returning to game:", error);
        displayScene('intro');
    }
}