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
    systemScreens: {},
    error: null
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
    try {
        await loadSystemScreens();
        await loadChapter('chapter1');
        displayScene('intro');
    } catch (error) {
        console.error("Failed to initialize game:", error);
        gameState.error = error;
        contentArea.innerHTML = `
            <p>Error initializing game. Please refresh the page.</p>
            <button class="choice-button" onclick="location.reload()">Refresh Page</button>
        `;
        return;
    }
    
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
        let sceneContent;
        if (Array.isArray(scene.content)) {
            // Handle array of content paragraphs
            sceneContent = scene.content.join('\n');
        } else {
            // Handle regular string or function content
            sceneContent = typeof scene.content === 'function' ? scene.content() : scene.content;
        }
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
                        console.error("Error displaying scene:", error);
                        contentArea.innerHTML = `
                            <p>Error loading game content.</p>
                            <button class="choice-button" onclick="confirmRestart(true)">Restart Game</button>
                        `;
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
    // Only add listeners if elements exist
    if (characterButton) characterButton.addEventListener('click', () => displaySystemScreen('character_screen'));
    if (journalButton) journalButton.addEventListener('click', () => displaySystemScreen('journal_screen'));
    if (achievementsButton) achievementsButton.addEventListener('click', () => displaySystemScreen('achievements_screen'));
    if (savesButton) savesButton.addEventListener('click', () => displaySystemScreen('saves_screen'));
    if (settingsButton) settingsButton.addEventListener('click', () => displaySystemScreen('settings_screen'));
    if (playButton) playButton.addEventListener('click', () => {
        if (gameState.currentScene) {
            displayScene(`${gameState.currentChapter}:${gameState.currentScene}`);
        } else {
            displayScene('intro');
        }
    });
    
    if (restartButton) restartButton.addEventListener('click', confirmRestart);
}

function showRestartOptions() {
    const options = `
        <div class="restart-options">
            <h3>Restart Options</h3>
            <button class="choice-button" onclick="confirmRestart(true)">Full Restart (Reset Everything)</button>
            <button class="choice-button" onclick="confirmRestart(false)">Quick Restart (Keep Character)</button>
            <button class="choice-button" onclick="displayScene(gameState.currentScene)">Cancel</button>
        </div>
    `;
    
    contentArea.innerHTML = options;
}

// Confirm restart
function confirmRestart() {
    const restartChoice = confirm(`Restart options:\n\nClick OK for full restart (back to intro)\nClick Cancel for quick restart (keep character)`);
    
    if (restartChoice === null) return; // User clicked cancel on the confirmation
    
    // Store name and gender temporarily if doing quick restart
    const playerName = gameState.character.name;
    const playerGender = gameState.character.gender;
    
    // Reset game state
    gameState.currentChapter = 'chapter1';
    gameState.visitedScenes = new Set();
    gameState.flags = {};
    
    if (restartChoice) {
        // Full restart - reset everything
        gameState.currentScene = 'intro';
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
    } else {
        // Quick restart - keep character but reset progress
        gameState.currentScene = 'self_focus_complete';
        gameState.character = {
            name: playerName,
            gender: playerGender,
            stats: {
                strength: 10,
                agility: 10,
                intelligence: 10,
                charisma: 10
            },
            inventory: []
        };
    }
    
    gameState.journal = [];
    gameState.achievements = [];
    
    try {
        // Always load chapter1 for restart
        loadChapter('chapter1')
            .then(() => {
                displayScene(gameState.currentScene);
            })
            .catch(error => {
                console.error("Failed to load chapter during restart:", error);
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
 
// Save game
function saveGame(slotId) {
    // Convert Set to Array for JSON serialization
    const saveData = JSON.stringify({
        ...gameState,
        visitedScenes: [...gameState.visitedScenes]
    });
    
    localStorage.setItem(`athazagoraphobia_save_${slotId}`, saveData);
    alert(`Game saved to slot ${slotId}`);
    displaySystemScreen('saves_screen');
}

// Load game
function loadGame(slotId) {
    try {
        const saveData = localStorage.getItem(`athazagoraphobia_save_${slotId}`);
        if (!saveData) {
            alert(`No save data found in slot ${slotId}`);
            return;
        }

        const loadedData = JSON.parse(saveData);
        
        // Validate save data
        if (!loadedData.currentChapter || !loadedData.currentScene) {
            throw new Error('Invalid save data - missing chapter/scene information');
        }

        // Convert visitedScenes array back to Set
        const visitedScenes = Array.isArray(loadedData.visitedScenes) 
            ? new Set(loadedData.visitedScenes) 
            : new Set();

        // Preserve system screens if they exist
        const systemScreens = loadedData.systemScreens || {};
        
        // Reset game state while preserving some system data
        Object.assign(gameState, {
            currentChapter: loadedData.currentChapter,
            currentScene: loadedData.currentScene,
            character: loadedData.character || {
                name: '',
                gender: '',
                stats: { strength: 10, agility: 10, intelligence: 10, charisma: 10 },
                inventory: []
            },
            journal: loadedData.journal || [],
            achievements: loadedData.achievements || [],
            visitedScenes,
            flags: loadedData.flags || {},
            systemScreens
        });

        // Load the chapter and display the scene
        loadChapter(gameState.currentChapter)
            .then(() => displayScene(`${gameState.currentChapter}:${gameState.currentScene}`))
            .catch(error => {
                console.error('Error loading chapter:', error);
                // Fallback to intro if chapter loading fails
                gameState.currentChapter = 'chapter1';
                gameState.currentScene = 'intro';
                displayScene('intro');
            });
            
    } catch (error) {
        console.error('Error loading game:', error);
        alert('Failed to load saved game. The save file may be corrupted.');
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
