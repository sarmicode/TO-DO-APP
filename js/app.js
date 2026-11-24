/* ============================================================
   js/app.js — Full app: display, create, toggle, delete,
               inline edit, filters, counter, clear-completed,
               empty state, smooth transitions, a11y.
   Depends on: js/storage.js, js/tasks.js
   ============================================================ */

(function () {
  'use strict';

  /* ---------- State ---------- */
  var tasks = [];
  var currentFilter = 'all';

  /* ---------- DOM refs ---------- */
  var taskListEl;
  var taskFormEl;
  var taskInputEl;
  var taskCounterEl;
  var clearCompletedBtn;
  var filterButtons = [];

  /* ---------- Inline-edit guard ---------- */
  var editingInProgress = false;

  /* ============================================================
     RENDER
     ============================================================ */
  function render() {
    if (!taskListEl) return;

    taskListEl.textContent = '';

    var allTasks = Array.isArray(tasks) ? tasks : [];
    var visibleTasks = typeof filterTasks === 'function'
      ? filterTasks(allTasks, currentFilter)
      : allTasks.slice();

    if (visibleTasks.length === 0) {
      taskListEl.appendChild(buildEmptyState(allTasks));
    } else {
      var fragment = document.createDocumentFragment();
      visibleTasks.forEach(function (task) {
        fragment.appendChild(buildTaskItem(task));
      });
      taskListEl.appendChild(fragment);
    }

    updateCounter();
  }

  function buildTaskItem(task) {
    var li = document.createElement('li');
    li.className = 'task-item' + (task.completed ? ' completed' : '');
    li.dataset.id = task.id;

    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!task.completed;
    checkbox.setAttribute(
      'aria-label',
      'Mark "' + task.title + '" as ' +
        (task.completed ? 'incomplete' : 'complete')
    );

    var titleSpan = document.createElement('span');
    titleSpan.className = 'task-title';
    titleSpan.textContent = task.title;
    titleSpan.dataset.id = task.id;
    titleSpan.setAttribute('title', 'Double-click to edit');

    var deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-btn';
    deleteBtn.dataset.id = task.id;
    deleteBtn.textContent = '✕';
    deleteBtn.setAttribute('aria-label', 'Delete task: ' + task.title);

    li.appendChild(checkbox);
    li.appendChild(titleSpan);
    li.appendChild(deleteBtn);
    return li;
  }

  function buildEmptyState(allTasks) {
    var li = document.createElement('li');
    li.className = 'empty-state';
    li.setAttribute('role', 'status');
    li.setAttribute('aria-live', 'polite');

    var icon = document.createElement('span');
    icon.className = 'empty-state__icon';
    icon.setAttribute('aria-hidden', 'true');

    var title = document.createElement('span');
    title.className = 'empty-state__title';

    var hint = document.createElement('span');
    hint.className = 'empty-state__hint';

    if (allTasks.length === 0) {
      icon.textContent = '📝';
      title.textContent = 'Your list is empty';
      hint.textContent = 'Add your first task using the field above.';
    } else if (currentFilter === 'active') {
      icon.textContent = '🎉';
      title.textContent = 'All done!';
      hint.textContent = 'There are no active tasks right now.';
    } else if (currentFilter === 'completed') {
      icon.textContent = '🕒';
      title.textContent = 'Nothing completed yet';
      hint.textContent = 'Finish a task and it will appear here.';
    } else {
      icon.textContent = '📋';
      title.textContent = 'No tasks to show';
      hint.textContent = 'Try a different filter.';
    }

    li.appendChild(icon);
    li.appendChild(title);
    li.appendChild(hint);
    return li;
  }

  function updateCounter() {
    if (!taskCounterEl) return;
    var total = Array.isArray(tasks) ? tasks.length : 0;
    var done = typeof countCompleted === 'function' ? countCompleted(tasks) : 0;
    taskCounterEl.textContent = done + ' of ' + total + ' completed';
  }

  /* ============================================================
     HANDLERS
     ============================================================ */
  function handleAddTask(event) {
    event.preventDefault();
    if (!taskInputEl) return;

    var title = taskInputEl.value.trim();

    if (!title) {
      taskInputEl.classList.add('input-error');
      window.setTimeout(function () {
        taskInputEl.classList.remove('input-error');
      }, 600);
      taskInputEl.focus();
      return;
    }

    tasks.push(createTask(title));
    if (typeof saveTasks === 'function') saveTasks(tasks);
    render();

    taskInputEl.value = '';
    taskInputEl.focus();
  }

  function handleListChange(event) {
    var target = event.target;

    // Toggle
    if (event.type === 'change' && target.matches('input[type="checkbox"]')) {
      var item = target.closest('.task-item');
      if (!item) return;
      var id = item.dataset.id;
      if (!id) return;

      tasks = toggleTask(tasks, id);
      if (typeof saveTasks === 'function') saveTasks(tasks);

      var stillVisible =
        currentFilter === 'all' ||
        (currentFilter === 'active' && !isTaskCompleted(id)) ||
        (currentFilter === 'completed' && isTaskCompleted(id));

      if (stillVisible) {
        item.classList.toggle('completed', isTaskCompleted(id));
        var cb = item.querySelector('input[type="checkbox"]');
        if (cb) {
          cb.setAttribute(
            'aria-label',
            'Mark "' + getTaskTitle(id) + '" as ' +
              (isTaskCompleted(id) ? 'incomplete' : 'complete')
          );
        }
        updateCounter();
      } else {
        animateRemove(item, render);
      }
      return;
    }

    // Delete
    if (event.type === 'click' && target.matches('.delete-btn')) {
      var delId = target.dataset.id || (target.closest('.task-item') && target.closest('.task-item').dataset.id);
      if (!delId) return;

      var row = target.closest('.task-item');
      tasks = deleteTask(tasks, delId);
      if (typeof saveTasks === 'function') saveTasks(tasks);

      if (row) animateRemove(row, render);
      else render();
      return;
    }

    // Inline edit
    if (event.type === 'dblclick' && target.matches('.task-title')) {
      beginInlineEdit(target);
    }
  }

  function isTaskCompleted(id) {
    var t = tasks.find(function (x) { return x.id === id; });
    return !!(t && t.completed);
  }

  function getTaskTitle(id) {
    var t = tasks.find(function (x) { return x.id === id; });
    return t ? t.title : '';
  }

  function animateRemove(item, done) {
    if (!item || item.classList.contains('closing')) return;
    item.classList.add('closing');

    var settled = false;
    function finish() {
      if (settled) return;
      settled = true;
      item.removeEventListener('animationend', finish);
      done();
    }

    item.addEventListener('animationend', finish);
    window.setTimeout(finish, 300);
  }

  function beginInlineEdit(titleSpan) {
    if (!titleSpan || editingInProgress) return;
    editingInProgress = true;

    var item = titleSpan.closest('.task-item');
    if (!item) { editingInProgress = false; return; }

    var id = item.dataset.id;
    if (!id) { editingInProgress = false; return; }

    var originalTitle = titleSpan.textContent;

    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'task-edit-input';
    input.value = originalTitle;
    input.maxLength = 500;
    input.setAttribute('aria-label', 'Edit task: ' + originalTitle);

    item.replaceChild(input, titleSpan);
    input.focus();
    input.select();

    var finished = false;

    function finish(commit) {
      if (finished) return;
      finished = true;
      editingInProgress = false;

      var newTitle = commit ? input.value.trim() : originalTitle;

      if (commit && newTitle && newTitle !== originalTitle) {
        tasks = tasks.map(function (t) {
          return t.id === id ? Object.assign({}, t, { title: newTitle }) : t;
        });
        if (typeof saveTasks === 'function') saveTasks(tasks);
      }

      render();
    }

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });

    input.addEventListener('blur', function () { finish(true); });
  }

  function handleFilterClick(event) {
    var btn = event.currentTarget;
    var filter = btn.dataset.filter;
    if (!filter) return;

    currentFilter = filter;

    filterButtons.forEach(function (b) {
      var isActive = b.dataset.filter === currentFilter;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    render();
  }

  function handleClearCompleted() {
    if (!Array.isArray(tasks)) return;
    var remaining = tasks.filter(function (t) { return !t.completed; });
    if (remaining.length === tasks.length) return;

    var completedRows = taskListEl
      ? Array.prototype.slice.call(taskListEl.querySelectorAll('.task-item.completed'))
      : [];

    tasks = remaining;
    if (typeof saveTasks === 'function') saveTasks(tasks);

    if (completedRows.length === 0) {
      render();
      return;
    }

    var pending = completedRows.length;
    completedRows.forEach(function (row) {
      animateRemove(row, function () {
        pending -= 1;
        if (pending === 0) render();
      });
    });
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    taskListEl = document.getElementById('task-list');
    taskFormEl = document.getElementById('task-form');
    taskInputEl = document.getElementById('task-input');
    taskCounterEl = document.getElementById('task-counter');
    clearCompletedBtn = document.getElementById('clear-completed-btn');

    filterButtons = Array.prototype.slice.call(
      document.querySelectorAll('.filter-btn')
    );

    tasks = typeof loadTasks === 'function' ? loadTasks() : [];

    currentFilter = 'all';
    filterButtons.forEach(function (b) {
      var isActive = b.dataset.filter === currentFilter;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    if (taskFormEl) taskFormEl.addEventListener('submit', handleAddTask);

    if (taskListEl) {
      taskListEl.addEventListener('change', handleListChange);
      taskListEl.addEventListener('click', handleListChange);
      taskListEl.addEventListener('dblclick', handleListChange);
    }

    filterButtons.forEach(function (btn) {
      btn.addEventListener('click', handleFilterClick);
    });

    if (clearCompletedBtn) {
      clearCompletedBtn.addEventListener('click', handleClearCompleted);
    }

    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();