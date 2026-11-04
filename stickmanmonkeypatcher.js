(() => {
    const original = Array.from;

    Array.from = function (value, ...args) {
        if (
            typeof value === "string" &&
            value.trim() !== "" &&
            !Number.isFinite(Number(value))
        ) {
            console.log("Word:", value.toUpperCase());
        }

        return original.call(this, value, ...args);
    };
})();
