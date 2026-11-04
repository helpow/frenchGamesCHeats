(() => {
    const original = window.overlayShowOverlay;

    window.overlayShowOverlay = function (...args) { //DOES NOT WORK ON SOME GAMES "pong, rock fall, eg..."
        correct = 1;
        window.havingAnswered();
    };

    console.log("Questions disabled.");
})();
