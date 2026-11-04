let currentTrackedQuestion = "";

(() => {
    const original = window.overlayShowOverlay;

    window.overlayShowOverlay = function (...args) {
        correct = 1;
        window.havingAnswered();
    };

    console.log("Questions disabled.");
})();

function clearThreats() {
    try {
        Matter.Composite.remove(engine.world, bee);
        Matter.Composite.remove(engine.world, bee2);
        Matter.Body.setPosition(bee, { x: -9000, y: -9000 });
        Matter.Body.setPosition(bee2, { x: -9000, y: -9000 });
    } catch(e) {}
}

function instantCollect() {
    try {
        Matter.Body.setPosition(target, { 
            x: beetle.position.x, 
            y: beetle.position.y 
        });    
    } catch(e) {}
}

function processFrame() {
    clearThreats();
    instantCollect();
    setTimeout(processFrame, 1);
}

processFrame();
