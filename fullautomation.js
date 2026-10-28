let currentTrackedQuestion = "";

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

function instantSolveQuiz() {
    if (typeof qTxt === 'undefined' || typeof answersArray === 'undefined' || !qTxt) {
        return;
    }

    if (qTxt === currentTrackedQuestion) {
        return;
    }

    const correctIndex = answersArray.indexOf(qTxt);
    if (correctIndex === -1) return;

    currentTrackedQuestion = qTxt;

    if (typeof goAfterClick === 'function') {
        goAfterClick(correctIndex);
    }
    if (typeof havingAnswered === 'function') {
        havingAnswered(correctIndex);
    }
}

function processFrame() {
    clearThreats();
    instantCollect();
    instantSolveQuiz();
    setTimeout(processFrame, 1);
}

processFrame();
