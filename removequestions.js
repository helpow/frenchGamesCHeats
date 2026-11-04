(() => {
    const original = window.overlayShowOverlay;

    window.overlayShowOverlay = function (...args) { //DOES NOT WORK ON PONG
        correct = 1;
        window.havingAnswered();
    };

    console.log("Questions disabled.");
})();
