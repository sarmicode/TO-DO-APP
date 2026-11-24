/* ============================================================
   js/storage.js — localStorage persistence
   Exposes window.loadTasks() and window.saveTasks(tasks)
   ============================================================ */

(function (global) {
  'use strict';

  var STORAGE_KEY = 'todo-app.tasks.v1';

  /**
   * Load tasks array from localStorage.
   * Returns [] on missing data or parse error.
   */
  function loadTasks() {
    try {
      var raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Basic shape sanitisation
      return parsed
        .filter(function (t) {
          return t && typeof t === 'object' && typeof t.id === 'string' &&
                 typeof t.title === 'string';
        })
        .map(function (t) {
          return {
            id: t.id,
            title: t.title,
            completed: !!t.completed,
            createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
          };
        });
    } catch (err) {
      console.warn('[storage] Failed to load tasks:', err);
      return [];
    }
  }

  /**
   * Persist the tasks array to localStorage.
   * Returns true on success, false on failure.
   */
  function saveTasks(tasks) {
    try {
      var payload = JSON.stringify(Array.isArray(tasks) ? tasks : []);
      global.localStorage.setItem(STORAGE_KEY, payload);
      return true;
    } catch (err) {
      console.warn('[storage] Failed to save tasks:', err);
      return false;
    }
  }

  global.loadTasks = loadTasks;
  global.saveTasks = saveTasks;

  global.Storage = { loadTasks: loadTasks, saveTasks: saveTasks };
})(window);