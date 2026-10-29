/**
 * stickman.js (Universal God-Mode Edition)
 * A fully reactive runtime injector that catches any game word list 
 * by sniffing string array mutations directly in memory.
 */
class GodModeStickmanHacker {
    constructor() {
        this._customWord = null;
        this._lastInterceptedWord = "None detected yet. Click 'Again' / start a round!";
        this._blacklist = ['style', 'div', 'span', 'svg', 'path', 'g', 'letterCell', 'keyButton', 'moving', 'skyGrad'];
        this._initializePatcher();
    }

    _initializePatcher() {
        const self = this;
        const originalArrayFrom = Array.from;

        Array.from = function(target) {
            // Check if the input is a legitimate string, not an empty space, and not an HTML keyword
            if (typeof target === 'string' && target.trim().length > 0 && !self._blacklist.includes(target.toLowerCase())) {
                
                // Exclude raw numerical counts or layout coordinates
                if (isNaN(target)) {
                    self._lastInterceptedWord = target.toUpperCase();

                    // If you actively want to swap out the word/topic with a custom cheat phrase
                    if (self._customWord) {
                        const activeOverride = self._customWord.toUpperCase();
                        console.log(`%c[stickman.js] ⚡ HIJACKED PACK: "${target.toUpperCase()}" ➡️ "${activeOverride}"`, "color: #00ffff; font-weight: bold; background: #000; padding: 4px;");
                        return originalArrayFrom.call(this, activeOverride);
                    }

                    console.log(`%c[stickman.js] 🔓 SECRET WORD UNLOCKED: "${self._lastInterceptedWord}"`, "color: #00ff00; font-weight: bold; font-size: 14px; background: #111; padding: 4px; border-left: 4px solid #00ff00;");
                }
            }
            return originalArrayFrom.apply(this, arguments);
        };

        console.log("%c[stickman.js] All-Topics God-Mode Engine fully listening to string allocations.", "color: #ff00ff; font-weight: bold;");
    }

    get words() {
        const self = this;
        return {
            changeWord(newWord) {
                if (!newWord || typeof newWord !== 'string') {
                    console.error("[stickman.js] Input must be a valid text string.");
                    return;
                }
                // Condense the input string to match normal game parameters
                self._customWord = newWord.replace(/[\s’'()\-:;.,]/g, '').toUpperCase();
                console.log(`%c[stickman.js] Locked override payload: "${self._customWord}"`, "color: #ffaa00; font-weight: bold;");

                const endScreen = document.querySelector("#endScr");
                if (endScreen) endScreen.style.display = "none";

                if (typeof window.startGameAgain === 'function') {
                    window.startGameAgain();
                }
            },

            getWord() {
                return self._customWord ? `OVERRIDE: "${self._customWord}" (Intended game phrase: "${self._lastInterceptedWord}")` : self._lastInterceptedWord;
            },

            clearOverride() {
                self._customWord = null;
                console.log("[stickman.js] Custom inputs cleared. Standard gameplay selection restored.");
                if (typeof window.startGameAgain === 'function') {
                    window.startGameAgain();
                }
            }
        };
    }
}

// Instantiate the proxy handler interface globally
window.stickman = new GodModeStickmanHacker();
