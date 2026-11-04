/* 
 * CIP - Closure Injection Patching
 * Version: 0.1.0
 * Browser / Chrome DevTools
 * Zero dependencies
 */
((root) => {
    "use strict";

    if (root.CIP) {
        console.warn("[CIP] Already loaded.");
        return;
    }

    const patches = new Set();
    const bridges = new Map();
    const watchers = new Set();

    let activeBridge = null;

    // Resolve an accessible object path.
    function resolve(path) {
        if (typeof path !== "string") return path;

        const parts = path.split(".");
        let value = root;

        for (const part of parts) {
            if (value == null || !(part in Object(value))) {
                throw new Error(`[CIP] Cannot resolve: ${path}`);
            }

            value = value[part];
        }

        return value;
    }

    function parentOf(path) {
        const parts = path.split(".");
        const key = parts.pop();

        return {
            target: resolve(parts.join(".")),
            key
        };
    }

    // Function patching.
    function patch(target, key, options = {}) {
        if (typeof target === "string") {
            const path = target;
            const replacement = key;

            if (typeof replacement !== "function") {
                throw new TypeError("Replacement must be a function.");
            }

            ({ target, key } = parentOf(path));

            options = {
                replace: (original, args, context) =>
                    replacement.apply(context.thisArg, args)
            };
        }

        if (target == null) {
            throw new TypeError("Invalid patch target.");
        }

        const descriptor = Object.getOwnPropertyDescriptor(target, key);
        const original = target[key];

        if (typeof original !== "function") {
            throw new TypeError(`${String(key)} is not a function.`);
        }

        const {
            when = () => true,
            before,
            after,
            replace
        } = options;

        let restored = false;

        function wrapped(...args) {
            if (!when.call(this, args, this)) {
                return original.apply(this, args);
            }

            const context = {
                target,
                key,
                thisArg: this,
                args,
                original
            };

            if (typeof before === "function") {
                before.call(this, context);
            }

            let result = typeof replace === "function"
                ? replace.call(this, original, args, context)
                : original.apply(this, args);

            if (typeof after === "function") {
                const modified = after.call(this, result, context);

                if (modified !== undefined) {
                    result = modified;
                }
            }

            return result;
        }

        try {
            target[key] = wrapped;

            if (target[key] !== wrapped) {
                throw new Error("Property rejected the replacement.");
            }
        } catch (error) {
            throw new Error(`[CIP] Patch failed: ${error.message}`);
        }

        const record = {
            target,
            key,
            original,
            wrapped,

            restore() {
                if (restored) return false;
                restored = true;

                // Do not overwrite a newer patch.
                if (target[key] === wrapped) {
                    if (descriptor) {
                        Object.defineProperty(target, key, descriptor);
                    } else {
                        delete target[key];
                    }
                }

                patches.delete(record);
                return true;
            }
        };

        patches.add(record);
        return record;
    }

    // Watch property writes.
    function watch(target, key, callback) {
        if (target == null || typeof callback !== "function") {
            throw new TypeError("Invalid watch arguments.");
        }

        const descriptor = Object.getOwnPropertyDescriptor(target, key);

        if (descriptor && !descriptor.configurable) {
            throw new Error("Property is not configurable.");
        }

        if (descriptor && (descriptor.get || descriptor.set)) {
            throw new Error("Accessor properties are not supported.");
        }

        if (descriptor && descriptor.writable === false) {
            throw new Error("Property is not writable.");
        }

        let value = descriptor ? descriptor.value : target[key];
        const enumerable = descriptor
            ? descriptor.enumerable
            : true;

        Object.defineProperty(target, key, {
            configurable: true,
            enumerable,

            get() {
                return value;
            },

            set(next) {
                const previous = value;
                value = next;

                callback.call(this, next, previous, key);
            }
        });

        let restored = false;

        const record = {
            restore() {
                if (restored) return false;
                restored = true;

                if (descriptor) {
                    Object.defineProperty(target, key, {
                        ...descriptor,
                        value
                    });
                } else {
                    delete target[key];
                    target[key] = value;
                }

                watchers.delete(record);
                return true;
            }
        };

        watchers.add(record);
        return record;
    }

    // Register an explicit closure bridge.
    function bridge(name, bindings) {
        if (!name || typeof name !== "string") {
            throw new TypeError("Bridge requires a name.");
        }

        if (!bindings || typeof bindings !== "object") {
            throw new TypeError("Bridge requires bindings.");
        }

        bridges.set(name, bindings);

        return {
            name,

            close() {
                if (bridges.get(name) !== bindings) return false;

                bridges.delete(name);

                if (activeBridge === name) {
                    activeBridge = null;
                }

                return true;
            }
        };
    }

    function getBridge(name) {
        const bindings = bridges.get(name);

        if (!bindings) {
            throw new Error(`[CIP] Bridge not found: ${name}`);
        }

        return {
            keys() {
                return Reflect.ownKeys(bindings);
            },

            get(key) {
                if (!(key in bindings)) {
                    throw new Error(`Unknown binding: ${String(key)}`);
                }

                return bindings[key];
            },

            set(key, value) {
                if (!(key in bindings)) {
                    throw new Error(`Unknown binding: ${String(key)}`);
                }

                bindings[key] = value;
                return value;
            },

            call(key, ...args) {
                const fn = bindings[key];

                if (typeof fn !== "function") {
                    throw new TypeError(`${String(key)} is not callable.`);
                }

                return fn(...args);
            }
        };
    }

    // Select a bridge for read/write/call.
    function attach(name) {
        if (!bridges.has(name)) {
            throw new Error(`[CIP] Cannot attach: bridge "${name}" does not exist.`);
        }

        activeBridge = name;
        console.log(`[CIP] Attached to bridge: ${name}`);

        return getBridge(name);
    }

    function read(key) {
        if (!activeBridge) throw new Error("No active bridge.");
        return getBridge(activeBridge).get(key);
    }

    function write(key, value) {
        if (!activeBridge) throw new Error("No active bridge.");
        return getBridge(activeBridge).set(key, value);
    }

    function call(key, ...args) {
        if (!activeBridge) throw new Error("No active bridge.");
        return getBridge(activeBridge).call(key, ...args);
    }

    // Inspect accessible objects without invoking getters.
    function inspect(value = root) {
        const object = typeof value === "string"
            ? resolve(value)
            : value;

        if (object == null) {
            throw new TypeError("Cannot inspect null or undefined.");
        }

        return Reflect.ownKeys(object).map(key => {
            const descriptor =
                Object.getOwnPropertyDescriptor(object, key);

            return {
                key: String(key),
                type: descriptor.get || descriptor.set
                    ? "accessor"
                    : typeof descriptor.value,
                writable: descriptor.writable,
                enumerable: descriptor.enumerable,
                configurable: descriptor.configurable
            };
        });
    }

    function restoreAll() {
        for (const record of [...patches]) record.restore();
        for (const record of [...watchers]) record.restore();

        console.log("[CIP] All active patches restored.");
    }

    const CIP = {
        version: "0.1.0",

        patch,
        watch,

        bridge,
        getBridge,
        attach,

        read,
        write,
        call,

        resolve,
        inspect,

        restoreAll,

        get status() {
            return {
                patches: patches.size,
                watchers: watchers.size,
                bridges: bridges.size,
                activeBridge
            };
        }
    };

    Object.defineProperty(root, "CIP", {
        value: CIP,
        configurable: true,
        writable: false
    });

    console.log(`[CIP] v${CIP.version} initialized.`);
})(window);
