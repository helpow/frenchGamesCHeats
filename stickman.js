/**
 * stickman.js (Universal All-Topics Fix)
 * Uses a smart proxy circuit breaker to eliminate loop recursion crashes 
 * during execution phases.
 */
class UniversalStickmanHacker {
    constructor() {
        this._customWord = null;
        this._lastInterceptedWord = "None detected yet. Start a round!";
        this._blacklist = ['style', 'div', 'span', 'svg', 'path', 'g', 'letterCell', 'keyButton', 'moving', 'skyGrad'];
        this._isProcessing = false; // The crash circuit-breaker
        this._initializePatcher();
    }

    _initializePatcher() {
        const self = this;
        const originalArrayFrom = Array.from;

        Array.from = function(target) {
            // Circuit-breaker: If our script is already processing an override layout, ignore recursion
            if (self._isProcessing) {
                return originalArrayFrom.apply(this, arguments);
            }

            if (typeof target === 'string' && target.trim().length > 0 && !self._blacklist.includes(target.toLowerCase())) {
                if (isNaN(target)) {
                    self._lastInterceptedWord = target.toUpperCase();
                    
                    if (self._customWord) {
                        const activeOverride = self._customWord.toUpperCase();
                        
                        console.clear();
                        console.log(`%c[stickman.js] 🔄 HIJACKING COMPCOMPLETE: "${target.toUpperCase()}" ➡️ "${activeOverride}"`, "color: #00ffff; font-weight: bold; background: #222; padding: 4px;");
                        
                        // Flip circuit breaker, process original construction array, then reset
                        self._isProcessing = true;
                        try {
                            const customResult = originalArrayFrom.call(this, activeOverride);
                            self._isProcessing = false;
                            return customResult;
                        } catch(err) {
                            self._isProcessing = false;
                        }
                    }

                    console.log(`%c[stickman.js] 🔑 SECRET WORD UNLOCKED: "${self._lastInterceptedWord}"`, "color: #00ff00; font-weight: bold; background: #111; padding: 4px;");
                }
            }
            return originalArrayFrom.apply(this, arguments);
        };

        console.log("%c[stickman.js] Crash-Proof Patcher Installed. Ready for complex sentences!", "color: #ff00ff; font-weight: bold;");
    }

    get words() {
        const self = this;
        return {
            /**
             * Safely injects sentences into any active topic pack without triggering loop errors.
             * @param {string} newSentence - The phrase or sentence to insert.
             */
            changeWord(newSentence) {
                if (!newSentence || typeof newSentence !== 'string') {
                    console.error("[stickman.js] Input must be a valid text string.");
                    return;
                }
                
                // Format text into a clean string stream, converting regular spaces to safe layout underscores
                let formatted = newSentence.trim().toUpperCase().replace(/\s+/g, '_');
                
                // Clear remaining prohibited special characters
                formatted = formatted.replace(/[’'()\-:;.,]/g, '');
                
                self._customWord = formatted;
                console.log(`%c[stickman.js] Locked payload structure to: "${self._customWord}"`, "color: #ffaa00; font-weight: bold;");

                const endScreen = document.querySelector("#endScr");
                if (endScreen) endScreen.style.display = "none";

                // Force an immediate layout regeneration
                if (typeof window.startGameAgain === 'function') {
                    window.startGameAgain();
                    console.log("%c[stickman.js] ⚡ Layout regenerated successfully!", "color: #00ff00; font-weight: bold;");
                }
            },

            getWord() {
                return self._customWord ? `OVERRIDE: "${self._customWord}" (Original topic target: "${self._lastInterceptedWord}")` : self._lastInterceptedWord;
            },

            clearOverride() {
                self._customWord = null;
                console.log("[stickman.js] Custom data overrides removed.");
                if (typeof window.startGameAgain === 'function') {
                    window.startGameAgain();
                }
            }
        };
    }
}

// Re-instantiate the wrapper cleanly
window.stickman = new UniversalStickmanHacker();
