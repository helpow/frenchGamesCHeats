/* CIP v2.0.0 — Closure Injection Patching */
((root) => {
  "use strict";
  if (root.CIP) return console.warn("[CIP] Already loaded.");

  const records = new Map(), bridges = new Map(), listeners = new Set();
  let nextId = 1, activeBridge = null, enabled = true;
  const objectLike = v => v !== null && (typeof v === "object" || typeof v === "function");

  function emit(type, detail = {}) {
    const event = Object.freeze({type, time: Date.now(), ...detail});
    for (const fn of [...listeners]) try { fn(event); } catch(e) { console.error(e); }
  }

  function subscribe(fn) {
    if (typeof fn !== "function") throw new TypeError("Listener must be a function.");
    listeners.add(fn);
    return {unsubscribe: () => listeners.delete(fn)};
  }

  function resolve(path, base = root) {
    if (typeof path !== "string") return path;
    if (!path.trim()) return base;
    for (const part of path.replace(/\[(\d+)\]/g, ".$1").split(".")) {
      if (!part) continue;
      if (base == null || !(part in Object(base))) throw Error("Cannot resolve: " + path);
      base = base[part];
    }
    return base;
  }

  function parentOf(path) {
    const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
    const key = parts.pop();
    return {target: resolve(parts.join(".")), key};
  }

  function record(kind, target, key, restore, extra = {}) {
    const r = {id: nextId++, kind, target, key, active: true, ...extra,
      restore() {
        if (!r.active) return false;
        const ok = restore() !== false;
        r.active = false;
        records.delete(r.id);
        emit("restore", {id:r.id, kind, key, restored:ok});
        return ok;
      }
    };
    records.set(r.id, r);
    emit("install", {id:r.id, kind, key});
    return r;
  }

  function patch(target, key, options = {}) {
    if (typeof target === "string") {
      const path = target;
      if (typeof key === "function") {
        const replacement = key;
        options = {replace:(original,args,ctx) =>
          Reflect.apply(replacement,ctx.thisArg,args)};
      } else if (key && typeof key === "object") options = key;
      else if (key !== undefined) throw TypeError("Invalid patch options.");
      ({target,key} = parentOf(path));
    }

    if (!objectLike(target)) throw TypeError("Invalid patch target.");
    const descriptor = Object.getOwnPropertyDescriptor(target,key);
    if (descriptor && !("value" in descriptor))
      throw Error("Accessor methods are not supported.");

    const original = target[key];
    if (typeof original !== "function")
      throw TypeError(String(key) + " is not a function.");

    const {before,after,replace,filter = () => true,name = String(key)} = options || {};
    for (const fn of [before,after,replace,filter])
      if (fn !== undefined && typeof fn !== "function")
        throw TypeError("Hooks must be functions.");

    let r;

    function wrapped(...args) {
      if (!enabled || !filter.call(this,args,this))
        return Reflect.apply(original,this,args);

      const ctx = {
        id:r.id,name,target,key,thisArg:this,args,original,
        startedAt:performance.now()
      };

      emit("call:before",{id:r.id,name,args});
      if (before) before.call(this,ctx);

      const finish = value => {
        let result = value;
        if (after) {
          const changed = after.call(this,result,ctx);
          if (changed !== undefined) result = changed;
        }
        emit("call:after",{id:r.id,name,result,
          duration:performance.now()-ctx.startedAt});
        return result;
      };

      try {
        const result = replace
          ? replace.call(this,original,args,ctx)
          : Reflect.apply(original,this,args);

        return result && typeof result.then === "function"
          ? Promise.resolve(result).then(finish,error => {
              emit("call:error",{id:r.id,name,error});
              throw error;
            })
          : finish(result);
      } catch(error) {
        emit("call:error",{id:r.id,name,error});
        throw error;
      }
    }

    Object.defineProperty(target,key,descriptor
      ? {...descriptor,value:wrapped}
      : {configurable:true,enumerable:true,writable:true,value:wrapped});

    r = record("patch",target,key,() => {
      if (target[key] !== wrapped) return false;
      if (descriptor) Object.defineProperty(target,key,descriptor);
      else delete target[key];
      return true;
    },{name,original,wrapped});

    return r;
  }

  function watch(target,key,callback) {
    if (!objectLike(target) || typeof callback !== "function")
      throw TypeError("Invalid watch arguments.");

    const descriptor = Object.getOwnPropertyDescriptor(target,key);
    if (descriptor && !descriptor.configurable)
      throw Error("Property is not configurable.");
    if (descriptor && !("value" in descriptor))
      throw Error("Accessors are not supported.");

    let value = descriptor ? descriptor.value : target[key];

    Object.defineProperty(target,key,{
      configurable:true,
      enumerable:descriptor ? descriptor.enumerable : true,
      get(){return value;},
      set(next) {
        const previous = value;
        value = next;
        emit("property:write",{target,key,previous,value:next});
        callback.call(this,next,previous,key);
      }
    });

    return record("watch",target,key,() => {
      const current = value;
      if (descriptor) Object.defineProperty(target,key,{...descriptor,value:current});
      else {delete target[key];target[key] = current;}
      return true;
    });
  }

  function bridge(name,bindings) {
    if (typeof name !== "string" || !name.trim() || !objectLike(bindings))
      throw TypeError("Invalid bridge.");
    if (bridges.has(name)) throw Error("Bridge already exists: " + name);

    const entry = {bindings};
    bridges.set(name,entry);
    emit("bridge:open",{name});

    return {name,close() {
      if (bridges.get(name) !== entry) return false;
      bridges.delete(name);
      if (activeBridge === name) activeBridge = null;
      emit("bridge:close",{name});
      return true;
    }};
  }

  function getBridge(name) {
    const entry = bridges.get(name);
    if (!entry) throw Error("Bridge not found: " + name);
    const b = entry.bindings;

    return Object.freeze({
      name,
      keys:() => Reflect.ownKeys(b),
      has:k => Reflect.has(b,k),
      get(k) {
        if (!Reflect.has(b,k)) throw Error("Unknown binding: " + String(k));
        return Reflect.get(b,k);
      },
      set(k,v) {
        if (!Reflect.has(b,k)) throw Error("Unknown binding: " + String(k));
        if (!Reflect.set(b,k,v)) throw Error("Write rejected.");
        return v;
      },
      call(k,...args) {
        const fn = Reflect.get(b,k);
        if (typeof fn !== "function") throw TypeError("Not callable.");
        return Reflect.apply(fn,b,args);
      }
    });
  }

  function attach(name) {
    getBridge(name);
    activeBridge = name;
    emit("bridge:attach",{name});
    return getBridge(name);
  }

  function active() {
    if (!activeBridge) throw Error("No active bridge. Call CIP.attach(name).");
    return getBridge(activeBridge);
  }

  const read = key => active().get(key);
  const write = (key,value) => active().set(key,value);
  const call = (key,...args) => active().call(key,...args);

  function inspect(value = root,{depth=1,includeSymbols=true} = {}) {
    if (typeof value === "string") value = resolve(value);
    if (!objectLike(value)) return {type:typeof value,value};

    const seen = new WeakSet();

    function walk(obj,level) {
      if (!objectLike(obj)) return obj;
      if (seen.has(obj)) return "[Circular]";
      seen.add(obj);

      const keys = includeSymbols ? Reflect.ownKeys(obj) : Object.getOwnPropertyNames(obj);

      return {
        type:typeof obj,
        constructor:obj.constructor?.name || null,
        properties:keys.map(key => {
          const d = Object.getOwnPropertyDescriptor(obj,key);
          const accessor = !!(d.get || d.set);
          const item = {
            key:typeof key === "symbol" ? key.toString() : key,
            type:accessor ? "accessor" : typeof d.value,
            enumerable:d.enumerable,
            configurable:d.configurable,
            writable:d.writable
          };

          if (accessor) {
            item.getter = !!d.get;
            item.setter = !!d.set;
          } else if (level < depth && objectLike(d.value)) {
            item.value = walk(d.value,level+1);
          } else if (!accessor) item.value = d.value;

          return item;
        })
      };
    }

    return walk(value,0);
  }

  function list() {
    return [...records.values()].map(({id,kind,key,name,active}) =>
      ({id,kind,key:String(key),name,active}));
  }

  function restore(id) {
    const r = records.get(Number(id));
    return r ? r.restore() : false;
  }

  function restoreAll() {
    return [...records.values()].map(r =>
      ({id:r.id,restored:r.restore()}));
  }

  function pause() {enabled = false;emit("runtime:paused");}
  function resume() {enabled = true;emit("runtime:resumed");}

  function uninstall() {
    restoreAll();
    bridges.clear();
    activeBridge = null;
    if (root.CIP === CIP) delete root.CIP;
    emit("runtime:uninstalled");
    return true;
  }

  const CIP = Object.freeze({
    version:"2.0.0",
    patch,watch,resolve,inspect,subscribe,list,restore,restoreAll,
    pause,resume,bridge,getBridge,attach,read,write,call,uninstall,
    get status() {
      return Object.freeze({
        enabled,
        patches:[...records.values()].filter(r => r.kind === "patch").length,
        watchers:[...records.values()].filter(r => r.kind === "watch").length,
        bridges:bridges.size,activeBridge,listeners:listeners.size
      });
    }
  });

  Object.defineProperty(root,"CIP",{
    value:CIP,configurable:true,writable:false,enumerable:false
  });

  console.info("[CIP] v" + CIP.version + " initialized.");
})(window);
