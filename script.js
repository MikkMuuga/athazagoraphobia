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

// Notification system
const notificationSystem = {
    show: function(message, type = 'info', duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `game-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-message">${message}</div>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Show with animation
        setTimeout(() => {
            notification.classList.add('visible');
        }, 10);
        
        // Set up close button
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.classList.remove('visible');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300); // Match transition time
        });
        
        // Auto-close for non-confirmation notifications
        if (type !== 'confirm') {
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    notification.classList.remove('visible');
                    setTimeout(() => {
                        if (document.body.contains(notification)) {
                            document.body.removeChild(notification);
                        }
                    }, 300);
                }
            }, duration);
        }
        
        return notification;
    },
    
    confirm: function(message, onConfirm, onCancel = null) {
        // Create confirmation dialog
        const dialog = document.createElement('div');
        dialog.className = 'game-dialog confirm';
        dialog.innerHTML = `
            <div class="dialog-content">
                <div class="dialog-message">${message}</div>
                <div class="dialog-buttons">
                    <button class="dialog-button confirm-button">Confirm</button>
                    <button class="dialog-button cancel-button">Cancel</button>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(dialog);
        
        // Show with animation
        setTimeout(() => {
            dialog.classList.add('visible');
        }, 10);
        
        // Set up event listeners
        const confirmBtn = dialog.querySelector('.confirm-button');
        const cancelBtn = dialog.querySelector('.cancel-button');
        
        confirmBtn.addEventListener('click', () => {
            dialog.classList.remove('visible');
            setTimeout(() => {
                document.body.removeChild(dialog);
                if (typeof onConfirm === 'function') {
                    onConfirm();
                }
            }, 300);
        });
        
        cancelBtn.addEventListener('click', () => {
            dialog.classList.remove('visible');
            setTimeout(() => {
                document.body.removeChild(dialog);
                if (typeof onCancel === 'function') {
                    onCancel();
                }
            }, 300);
        });
        
        return dialog;
    },
    
    prompt: function(options) {
        const {
            title = 'Choose an option',
            buttons = [],
            onClose = null
        } = options;
        
        // Create custom dialog
        const dialog = document.createElement('div');
        dialog.className = 'game-dialog prompt';
        
        let buttonHTML = '';
        buttons.forEach(btn => {
            buttonHTML += `<button class="dialog-button" data-action="${btn.action}">${btn.text}</button>`;
        });
        
        dialog.innerHTML = `
            <div class="dialog-content">
                <div class="dialog-title">${title}</div>
                <div class="dialog-buttons">
                    ${buttonHTML}
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(dialog);
        
        // Show with animation
        setTimeout(() => {
            dialog.classList.add('visible');
        }, 10);
        
        // Set up buttons
        const dialogButtons = dialog.querySelectorAll('.dialog-button');
        dialogButtons.forEach(button => {
            button.addEventListener('click', () => {
                const action = button.getAttribute('data-action');
                dialog.classList.remove('visible');
                setTimeout(() => {
                    document.body.removeChild(dialog);
                    if (typeof onClose === 'function') {
                        onClose(action);
                    }
                }, 300);
            });
        });
        
        return dialog;
    }
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
        
        // Process journal entries if present
        processSceneJournals(scene);
        
        // Process achievements if present
        processSceneAchievements(scene);
        
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

// Initialize event handlers for journal entries when displaying system screens
function initJournalEventHandlers() {
    // Set up journal entry click handlers
    document.querySelectorAll('.journal-entry-button').forEach(button => {
        button.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            const entryKey = this.getAttribute('data-entry-key');
            
            // Find the journal entry
            const entry = gameState.journal.find(j => j.category === category && j.key === entryKey);
            
            if (entry) {
                // Hide all journal categories
                document.querySelectorAll('.journal-category, h2').forEach(el => {
                    el.style.display = 'none';
                });
                
                // Show detail view
                const detailView = document.getElementById('journal-detail-view');
                detailView.style.display = 'block';
                
                // Populate details
                document.getElementById('journal-detail-title').textContent = entry.title;
                document.getElementById('journal-detail-content').innerHTML = entry.text;
                document.getElementById('journal-detail-timestamp').textContent = entry.timestamp;
                
                // Set up back button - replace with new function to avoid duplicating listeners
                const backBtn = document.getElementById('back-to-journal-list');
                // Remove previous listeners to avoid duplicates
                const newBackBtn = backBtn.cloneNode(true);
                backBtn.parentNode.replaceChild(newBackBtn, backBtn);
                
                newBackBtn.addEventListener('click', function() {
                    detailView.style.display = 'none';
                    document.querySelectorAll('.journal-category, h2').forEach(el => {
                        el.style.display = 'block';
                    });
                });
            }
        });
    });
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
    
    // Initialize journal handlers if on journal screen
    if (screenId === 'journal_screen') {
        initJournalEventHandlers();
    }
    
    // Set up event listeners for buttons
    document.querySelectorAll('.choice-button').forEach(button => {
        button.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            if (action === 'backToGame') {
                displayScene(`${gameState.currentChapter}:${gameState.currentScene}`);
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


// Function to process system screen content with fixes for journal display
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
        // Extract unique categories
        const categories = [...new Set(gameState.journal.map(entry => entry.category))];
        
        // Replace categories display
        if (categories.length > 0) {
            // Replace the conditional
            content = content.replace(/\{\{#if journalCategories\.length\}\}([\s\S]*?)\{\{else\}\}[\s\S]*?\{\{\/if\}\}/g, '$1');
            
            // Replace the categories loop with actual categories
            let categoriesHtml = '';
            categories.forEach(category => {
                // Add the category header
                categoriesHtml += `<h2 style="margin-top: 20px; color: var(--header-color); font-size: 1.3em;">${category}</h2>`;
                categoriesHtml += '<div class="journal-category">';
                
                // Add entries for this category
                const entriesInCategory = gameState.journal.filter(j => j.category === category);
                entriesInCategory.forEach(entry => {
                    categoriesHtml += `
                        <div class="journal-entry-button" data-category="${entry.category}" data-entry-key="${entry.key}">
                            <div style="display: flex;">
                                <div class="journal-entry-marker"></div>
                                <div class="journal-entry-preview">
                                    <p class="journal-entry-title">${entry.title}</p>
                                    <p class="journal-entry-timestamp">${entry.timestamp}</p>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                categoriesHtml += '</div>';
            });
            
            // Replace the categories section - FIX: Remove the template tag
            content = content.replace(/\{\{#each journalCategories\}\}[\s\S]*?\{\{\/each\}\}/g, categoriesHtml);
            
            // Remove any remaining template expressions
            content = content.replace(/\{\{[^}]+\}\}/g, '');
        } else {
            content = content.replace(/\{\{#if journalCategories\.length\}\}[\s\S]*?\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
            
            // Remove any remaining template expressions
            content = content.replace(/\{\{[^}]+\}\}/g, '');
        }
    }
    
    // Handle achievements screen
    else if (screenId === 'achievements_screen') {
        if (gameState.achievements.length > 0) {
            // Replace the conditional
            content = content.replace(/\{\{#if achievements\.length\}\}([\s\S]*?)\{\{else\}\}[\s\S]*?\{\{\/if\}\}/g, '$1');
            
            // Replace the achievements loop with actual achievements
            let achievementsHtml = '';
            gameState.achievements.forEach(achievement => {
                achievementsHtml += `
                    <div class="achievement-item">
                        <div class="achievement-marker"></div>
                        <div class="achievement-content">
                            <p class="achievement-title">${achievement.title}</p>
                            <p class="achievement-description">${achievement.description}</p>
                        </div>
                    </div>
                `;
            });
            
            // Replace the achievements section
            content = content.replace(/\{\{#each achievements\}\}[\s\S]*?\{\{\/each\}\}/g, achievementsHtml);
            
            // Remove any remaining template expressions
            content = content.replace(/\{\{[^}]+\}\}/g, '');
        } else {
            content = content.replace(/\{\{#if achievements\.length\}\}[\s\S]*?\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');
            
            // Remove any remaining template expressions
            content = content.replace(/\{\{[^}]+\}\}/g, '');
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
                // Use scene name if available, otherwise use scene ID
                const sceneName = saveData.currentSceneName || saveData.currentScene;
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
                           .replace(/\{\{#if this\.exists\}\}([\s\S]*?)\{\{\/if\}\}/g, slot.exists ? '$1' : '')
            ).join('');
        });
        
        // Remove any remaining template expressions
        content = content.replace(/\{\{[^}]+\}\}/g, '');
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
    notificationSystem.prompt({
        title: 'Restart Options',
        buttons: [
            { text: 'Full Restart (Reset Everything)', action: 'full-restart' },
            { text: 'Quick Restart (Keep Character)', action: 'quick-restart' },
            { text: 'Cancel', action: 'cancel' }
        ],
        onClose: (action) => {
            if (action === 'full-restart') {
                performRestart(true);
            } else if (action === 'quick-restart') {
                performRestart(false);
            } else if (action === 'cancel') {
                displayScene(gameState.currentScene);
            }
        }
    });
}

// Confirm restart
function confirmRestart() {
    showRestartOptions();
}

function performRestart(fullRestart) {
    // Store name and gender temporarily if doing quick restart
    const playerName = gameState.character.name;
    const playerGender = gameState.character.gender;
    
    // Reset game state
    gameState.currentChapter = 'chapter1';
    gameState.visitedScenes = new Set();
    gameState.flags = {};
    
    if (fullRestart) {
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
                notificationSystem.show('Game restarted', 'info');
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
    const saveExists = localStorage.getItem(`athazagoraphobia_save_${slotId}`);
    
    const performSave = () => {
        // Get current scene name if available
        let currentSceneName = "";
        try {
            const scene = sceneCache[gameState.currentChapter][gameState.currentScene];
            currentSceneName = scene.name || gameState.currentScene;
        } catch (e) {
            currentSceneName = gameState.currentScene;
        }
        
        // Convert Set to Array for JSON serialization
        const saveData = JSON.stringify({
            ...gameState,
            currentSceneName,
            visitedScenes: [...gameState.visitedScenes]
        });
        
        localStorage.setItem(`athazagoraphobia_save_${slotId}`, saveData);
        notificationSystem.show(`Game saved to slot ${slotId}`, 'success');
        displaySystemScreen('saves_screen');
    };
    
    if (saveExists) {
        notificationSystem.confirm(`Overwrite existing save in slot ${slotId}?`, performSave);
    } else {
        performSave();
    }
}

// Load game
function loadGame(slotId) {
    try {
        const saveData = localStorage.getItem(`athazagoraphobia_save_${slotId}`);
        if (!saveData) {
            notificationSystem.show(`No save data found in slot ${slotId}`, 'error');
            return;
        }

        const performLoad = () => {
            try {
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
                    .then(() => {
                        displayScene(`${gameState.currentChapter}:${gameState.currentScene}`);
                        notificationSystem.show('Game loaded successfully', 'success');
                    })
                    .catch(error => {
                        console.error('Error loading chapter:', error);
                        // Fallback to intro if chapter loading fails
                        gameState.currentChapter = 'chapter1';
                        gameState.currentScene = 'intro';
                        displayScene('intro');
                        notificationSystem.show('Error loading saved chapter. Starting from intro.', 'error');
                    });
            } catch (error) {
                console.error('Error parsing save data:', error);
                notificationSystem.show('Failed to load saved game. The save file may be corrupted.', 'error');
            }
        };
        
        // Confirm before loading
        notificationSystem.confirm(`Load game from slot ${slotId}? Any unsaved progress will be lost.`, performLoad);
            
    } catch (error) {
        console.error('Error loading game:', error);
        notificationSystem.show('Failed to load saved game. The save file may be corrupted.', 'error');
    }
}

 
// Journal system functions
async function loadJournalEntries() {
    try {
        // Instead of fetching from a file (which is causing 404 errors),
        // return what we have in memory
        return {
            "Main Entries": {},
            "Locations": {},
            "Characters": {},
            "Extra Information": {}
        };
    } catch (error) {
        console.error('Error loading journal entries:', error);
        return {
            "Main Entries": {},
            "Locations": {},
            "Characters": {},
            "Extra Information": {}
        };
    }
}

// Add a journal entry
function addJournalEntry(category, entryKey, title, content, timestamp = null) {
    // Set timestamp if not provided
    if (!timestamp) {
        timestamp = new Date().toLocaleString();
    }
    
    try {
        const formattedEntry = {
            category: category,
            key: entryKey,
            title: title,
            text: content,
            timestamp: timestamp
        };
        
        // Check if entry already exists
        const existingEntryIndex = gameState.journal.findIndex(e => 
            e.category === category && e.key === entryKey);
            
        if (existingEntryIndex >= 0) {
            gameState.journal[existingEntryIndex] = formattedEntry;
        } else {
            gameState.journal.push(formattedEntry);
        }
        
        // Show notification
        notificationSystem.show('Journal updated.', 'info');
        
        return true;
    } catch (error) {
        console.error('Error saving journal entry:', error);
        return false;
    }
}

// Process journal entries from scene data
function processSceneJournals(scene) {
    if (scene.journal && Array.isArray(scene.journal)) {
        scene.journal.forEach(entry => {
            addJournalEntry(
                entry.category,
                entry.title.toLowerCase().replace(/\s+/g, '_'),
                entry.title,
                entry.content,
                entry.timestamp || 'Day 1'
            );
        });
    }
}

// Unlock achievements
function unlockAchievement(title, description) {
    // Check if achievement already exists
    const existingAchievement = gameState.achievements.find(a => a.title === title);
    
    if (!existingAchievement) {
        gameState.achievements.push({
            title: title,
            description: description
        });
        
        notificationSystem.show(`Achievement Unlocked: ${title}`, 'achievement');
    }
}

// Process achievements from scene data
function processSceneAchievements(scene) {
    if (scene.achievement) {
        unlockAchievement(scene.achievement.title, scene.achievement.description);
    }
}

// Start the game when the page loads
window.addEventListener('load', initGame);
