if(!Module["preRun"])Module["preRun"]=[];
Module.preRun.push(function() {ENV.COOT_DATA_DIR="data/coot"});
Module.preRun.push(function() {ENV.CCP4_LIB="data/ccp4_lib"});
Module.preRun.push(function() {ENV.GEMMI_MON_LIB_PATH="data/ccp4_lib/data/monomers"});
Module.preRun.push(function() {ENV.COOT_BACKUP_DIR="COOT_BACKUP"});
Module.preRun.push(function() {ENV.SYMINFO="data/ccp4_lib/data/syminfo.lib"});

// How many threads coot may use, and how many pthread workers to start for them.
//
// Emscripten serves every thread from a pool of web workers that it starts when the module
// loads (-sPTHREAD_POOL_SIZE, which CMakeLists.txt sets to Module.moorhenPthreadPoolSize). A
// call that needs a worker when none is free never returns, so the pool has to be big enough
// for the thread limit that is given to coot:
//
//   limit   threads held all the time by the thread pool of molecules_container_t
//   limit   threads that one API call may start on top of those (coot is patched to respect
//           set_max_number_of_threads(), see patches/coot-thread-limits.patch)
//   4       margin, for calls that the thread audit (baby-gru/scripts/thread-budget-audit.mjs)
//           does not cover
//
// The limit is the number of cores, but not more than 8. Whoever creates the module can choose
// another one by passing moorhenThreadLimit in the module options. After the module is created
// Module.moorhenThreadLimit is the number to give to set_max_number_of_threads(): a bigger one
// can use up the pool.
(function() {
    var limit = Number(Module["moorhenThreadLimit"]);
    if (!(limit >= 1)) {
        var cores = Number(globalThis.navigator && globalThis.navigator.hardwareConcurrency) || 4;
        limit = Math.min(cores, 8);
    }
    limit = Math.max(1, Math.floor(limit));
    Module["moorhenThreadLimit"] = limit;
    Module["moorhenPthreadPoolSize"] = 2 * limit + 4;
    // Tell coot too. This is the limit that coot starts with, so the thread pool of a new
    // molecules_container_t has this many threads from the start: without it the pool starts
    // with up to 8 threads, whatever the limit, until set_max_number_of_threads() is called.
    Module.preRun.push(function() {ENV.COOT_N_THREADS=String(limit)});
})();
