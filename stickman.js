/**
 * stickman.js (Restored Standard Version)
 * A clean runtime hook library for extracting and injecting custom words 
 * into the minified HTML5 Vanilla DOM Hangman engine.
 */
class StickmanHackerLibrary {
    constructor() {
        this._customWord = null;
        this._lastInterceptedWord = "None detected yet. Start a round!";
        this._dictionaryPool = ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix'];
        this._initializePatcher();
    }

    /**
     * Internal patcher that hooks directly into the browser's native array construction pipeline
     * to intercept or override variables right before the minifier obfuscates them.
     */
    _initializePatcher() {
        const self = this;
        const originalArrayFrom = Array.from;

        Array.from = function(target) {
            if (typeof target === 'string' && self._dictionaryPool.includes(target.toLowerCase())) {
                self._lastInterceptedWord = target.toUpperCase();
                
                // If a user has injected a custom word override via stickman.words.changeWord()
                if (self._customWord) {
                    const activeOverride = self._customWord.toUpperCase();
                    console.log(`%c[stickman.js] 🔄 HIJACKING TEXT: Swapping "${target.toUpperCase()}" ➡️ "${activeOverride}"`, "color: #00ffff; font-weight: bold; background: #222; padding: 3px;");
                    return originalArrayFrom.call(this, activeOverride);
                }

                console.log(`%c[stickman.js] 🔑 WORD SPY: Intercepted "${self._lastInterceptedWord}"`, "color: #00ff00; font-weight: bold; background: #222; padding: 3px;");
            }
            return originalArrayFrom.apply(this, arguments);
        };

        console.log("%c[stickman.js] Standard library restored and monitoring pipelines successfully.", "color: #ff00ff; font-weight: bold;");
    }

    /**
     * Nested class wrapper management handling the word pipeline configuration updates.
     */
    get words() {
        const self = this;
        return {
            /**
             * Sets a new custom target text string that forces the game layout to conform 
             * to your specific word input on the next round.
             * @param {string} newWord - The replacement text payload.
             */
            changeWord(newWord) {
                if (!newWord || typeof newWord !== 'string') {
                    console.error("[stickman.js] Error: Input must be a valid text string.");
                    return;
                }
                
                // Clean the input string: Remove spaces and punctuation to keep the engine from lagging
                const sanitizedWord = newWord.replace(/[\s’'()\-:;.,]/g, '').toUpperCase();
                
                self._customWord = sanitizedWord;
                console.log(`%c[stickman.js] Word locked to: "${self._customWord}".`, "color: #ffaa00; font-weight: bold;");

                // Clear out the "Round Over/End Game" overlay graphic if it's currently showing
                const endScreen = document.querySelector("#endScr");
                if (endScreen) {
                    endScreen.style.display = "none";
                }

                // Force the game engine to trigger its reset function instantly
                if (typeof window.startGameAgain === 'function') {
                    window.startGameAgain();
                    console.log("%c[stickman.js] ⚡ Game board reset forced instantly!", "color: #00ff00; font-weight: bold;");
                } else {
                    console.warn("[stickman.js] Could not find window.startGameAgain. Please click 'Again' manually once.");
                }
            },

            /**
             * Fetches the true text values currently being computed or played by the engine.
             * @returns {string} The active string value.
             */
            getWord() {
                if (self._customWord) {
                    return `OVERRIDE ACTIVE: "${self._customWord}" (Game originally intended: "${self._lastInterceptedWord}")`;
                }
                return self._lastInterceptedWord;
            },

            /**
             * Resets the game tracking state to let the engine pick natively from its standard list again.
             */
            clearOverride() {
                self._customWord = null;
                console.log("[stickman.js] Custom text override cleared. Normal gameplay selection restored.");
                if (typeof window.startGameAgain === 'function') {
                    window.startGameAgain();
                }
            }
        };
    }
}

// Instantiate the global runtime wrapper accessor interface
window.stickman = new StickmanHackerLibrary();
