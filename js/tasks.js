/* ============================================================
   js/tasks.js — Pure task functions (no DOM, no side effects)
   Task shape: { id, title, completed, createdAt }
   ============================================================ */

(function (global) {
  'use strict';

  function createTask(title) {
    return {
      id: crypto.randomUUID(),
      title: String(title).trim(),
      completed: false,
      createdAt: Date.now(),
    };
  }

  function addTask(tasks, title) {
    var trimmed = String(title).trim();
    if (!trimmed) return tasks.slice();
    return tasks.concat([createTask(trimmed)]);
  }

  function toggleTask(tasks, id) {
    return tasks.map(function (task) {
      return task.id === id ? Object.assign({}, task, { completed: !task.completed }) : task;
    });
  }

  function deleteTask(tasks, id) {
    return tasks.filter(function (task) { return task.id !== id; });
  }

  function filterTasks(tasks, filter) {
    switch (filter) {
      case 'active':    return tasks.filter(function (t) { return !t.completed; });
      case 'completed': return tasks.filter(function (t) { return t.completed; });
      case 'all':
      default:          return tasks.slice();
    }
  }

  function countCompleted(tasks) {
    return tasks.reduce(function (count, task) {
      return task.completed ? count + 1 : count;
    }, 0);
  }

  global.Tasks = {
    createTask: createTask,
    addTask: addTask,
    toggleTask: toggleTask,
    deleteTask: deleteTask,
    filterTasks: filterTasks,
    countCompleted: countCompleted,
  };

  global.createTask = createTask;
  global.addTask = addTask;
  global.toggleTask = toggleTask;
  global.deleteTask = deleteTask;
  global.filterTasks = filterTasks;
  global.countCompleted = countCompleted;
})(window);