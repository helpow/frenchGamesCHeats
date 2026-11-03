
(() => {
    const win = window;
    const doc = document;
    const found = [];
    const evidence = [];
    const add = (name, points, reason) => {
        found.push({ name, points, reason });
    };

    // 1. Known engine globals
    const engines = {
        Phaser: ["Phaser"],
        PixiJS: ["PIXI"],
        ThreeJS: ["THREE"],
        BabylonJS: ["BABYLON"],
        PlayCanvas: ["pc"],
        Cocos: ["cc"],
        Construct: ["C3", "cr"],
        Godot: ["Engine"],
        Unity: ["unityInstance", "createUnityInstance"],
        GDevelop: ["gdjs"],
        RPGMaker: ["$gameSystem", "$dataMap"],
        melonJS: ["me"],
        LayaAir: ["Laya"],
        Egret: ["egret"],
        ImpactJS: ["ig"]
        MatterJS: ["Matter"],
    };

    for (const [engine, globals] of Object.entries(engines)) {
        for (const key of globals) {
            try {
                if (key in win && win[key] != null) {
                    add(engine, 100, "Global: " + key);
                    break;
                }
            } catch {}
        }
    }

    // 2. Inspect scripts and loaded resources
    const resources = performance.getEntriesByType("resource")
        .map(x => x.name.toLowerCase());

    const scriptText = [
        ...doc.scripts
    ].map(s => (s.src || "") + " " + (s.textContent || ""))
     .join(" ").toLowerCase();

    const signatures = {
        Phaser: /phaser/,
        PixiJS: /pixi/,
        ThreeJS: /three\.min|three\.module/,
        BabylonJS: /babylon/,
        PlayCanvas: /playcanvas/,
        Unity: /unityweb|unityframework|\.wasm/,
        Godot: /godot/,
        Construct: /construct|c3runtime/,
        GDevelop: /gdjs/
        MatterJS: /matter\.js|matter-min|matter\.min/,
    };

    for (const [engine, pattern] of Object.entries(signatures)) {
        const matches = resources.some(x => pattern.test(x)) ||
                        pattern.test(scriptText);
        if (matches) add(engine, 65, "Script/resource signature");
    }

    // 3. Canvas inspection
    const canvases = [...doc.querySelectorAll("canvas")];

    for (const canvas of canvases) {
        const width = canvas.width;
        const height = canvas.height;

        if (width > 200 && height > 150) {
            add("Canvas-based game", 15,
                `Canvas ${width}x${height}`);
        }
    }

    // 4. DOM game inspection
    const elements = [...doc.querySelectorAll("*")];

    const animated = elements.filter(el => {
        const style = getComputedStyle(el);
        return style.animationName !== "none" ||
               style.transitionDuration !== "0s";
    });

    const spriteElements = elements.filter(el => {
        const style = getComputedStyle(el);
        return style.backgroundImage !== "none" ||
               style.imageRendering === "pixelated";
    });

    if (elements.length > 1000)
        evidence.push("Large DOM tree");

    if (animated.length > 10)
        evidence.push("Many animated DOM elements");

    if (spriteElements.length > 10)
        evidence.push("Many image/background sprite elements");

    if (canvases.length === 0 && animated.length > 10)
        add("Possible DOM-based game", 30,
            "DOM animations detected");

    // 5. Game loop clues
    if (typeof win.requestAnimationFrame === "function")
        evidence.push("requestAnimationFrame available");

    if (doc.querySelector("canvas"))
        evidence.push("Canvas rendering surface exists");

    // 6. Results
    found.sort((a, b) => b.points - a.points);

    const unique = [...new Map(
        found.map(x => [x.name, x])
    ).values()];

    const result = {
        engines: unique,
        evidence,
        canvasCount: canvases.length,
        domElements: elements.length,
        animatedElements: animated.length,
        resources: resources.length
    };

    console.log("shnap??");
    console.table(unique);
    console.log("Evidence:", evidence);
    console.log("Full report:", result);

    return result;
})();
