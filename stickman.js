class UniversalStickmanHacker {
    constructor() {
        this._customWord = null;
        this._lastInterceptedWord = "None detected yet. Start a round!";
        this._blacklist = ['style', 'div', 'span', 'svg', 'path', 'g', 'letterCell', 'keyButton', 'moving', 'skyGrad'];
        this._isProcessing = false;
        this._initializePatcher();
    }

    _initializePatcher() {
        const self = this;
        const originalArrayFrom = Array.from;

        Array.from = function(target) {
            if (self._isProcessing) {
                return originalArrayFrom.apply(this, arguments);
            }

            if (typeof target === 'string' && target.trim().length > 0 && !self._blacklist.includes(target.toLowerCase())) {
                if (isNaN(target)) {
                    self._lastInterceptedWord = target.toUpperCase();

                    if (self._customWord) {
                        const activeOverride = self._customWord.toUpperCase();

                        console.clear();
                        console.log(`%c[stickman.js] "${target.toUpperCase()}" ➡️ "${activeOverride}"`");

                        self._isProcessing = true;
                        try {
                            const customResult = originalArrayFrom.call(this, activeOverride);
                            self._isProcessing = false;
                            return customResult;
                        } catch(err) {
                            self._isProcessing = false;
                        }
                    }

                    console.log(`%c[stickman.js] word: "${self._lastInterceptedWord}"`");
                }
            }
            return originalArrayFrom.apply(this, arguments);
        };

        console.log("%c[stickman.js] Crash-Proof Patcher Installed. Ready for complex sentences!", "color:
    }

    get words() {
        const self = this;
        return {

            changeWord(newSentence) {
                if (!newSentence || typeof newSentence !== 'string') {
                    console.error("[stickman.js] Input must be a valid text string.");
                    return;
                }

                let formatted = newSentence.trim().toUpperCase().replace(/\s+/g, '_');

                formatted = formatted.replace(/[’'()\-:;., ]/g, '');

                self._customWord = formatted;
                console.log(`%c[stickman.js] Locked payload structure to: "${self._customWord}"`, "color:

                const endScreen = document.querySelector("#endScr");
                if (endScreen) endScreen.style.display = "none";

                if (typeof window.startGameAgain === 'function') {
                    window.startGameAgain();
                    console.log("%c[stickman.js] ⚡ Layout regenerated successfully!", "color:
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

window.stickman = new UniversalStickmanHacker();
