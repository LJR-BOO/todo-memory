/* app.js — 页面逻辑：视图切换、表单提交、列表渲染、分页 */
(function () {
  'use strict';

  const api = window.api;
  const PAGE_SIZE = 10;
  let currentPage = 1;
  let totalPages = 1;

  const $id = (id) => document.getElementById(id);

  /* ---------- 通用工具 ---------- */
  function toast(text, ok) {
    const t = $id('toast');
    t.textContent = text;
    t.className = 'toast show' + (ok ? ' ok' : ' err');
    setTimeout(() => { t.className = 'toast hidden'; }, 2200);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  /* ---------- 视图切换 ---------- */
  function spawnPetals() {
    const box = $id('petals');
    if (!box) return;
    const count = 16;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'petal';
      const size = 8 + Math.random() * 10;
      const dur = 9 + Math.random() * 9;
      p.style.left = (Math.random() * 100) + 'vw';
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.animationDuration = dur + 's';
      p.style.animationDelay = (-Math.random() * dur) + 's';
      box.appendChild(p);
    }
  }

  function showView(name) {
    $id('view-auth').classList.toggle('hidden', name !== 'auth');
    $id('view-todo').classList.toggle('hidden', name !== 'todo');
    // 切换背景图：登录页 / 待办页 各用一张
    document.body.className = name === 'todo' ? 'bg-todo' : 'bg-login';
  }
  window.api.onUnauthorized = function () {
    showView('auth');
    toast('登录已失效，请重新登录', false);
  };

  /* ---------- 登录 / 注册 ---------- */
  function bindAuth() {
    // 注册与登录表单切换
    $id('goRegister').addEventListener('click', (e) => {
      e.preventDefault();
      $id('loginForm').classList.add('hidden');
      $id('registerForm').classList.remove('hidden');
      $id('registerMsg').textContent = '';
    });
    $id('goLogin').addEventListener('click', (e) => {
      e.preventDefault();
      $id('registerForm').classList.add('hidden');
      $id('loginForm').classList.remove('hidden');
      $id('loginMsg').textContent = '';
    });

    // 登录
    $id('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = $id('loginUsername').value.trim();
      const password = $id('loginPassword').value;
      const msg = $id('loginMsg');
      msg.textContent = '';
      try {
        await api.login(username, password);
        toast('欢迎回来，旅行者！', true);
        enterTodo();
      } catch (err) {
        msg.textContent = err.message;
      }
    });

    // 注册
    $id('registerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = $id('regUsername').value.trim();
      const password = $id('regPassword').value;
      const msg = $id('registerMsg');
      msg.textContent = '';
      try {
        await api.register(username, password);
        $id('registerForm').classList.add('hidden');
        $id('loginForm').classList.remove('hidden');
        $id('loginUsername').value = username;
        $id('loginMsg').textContent = '注册成功，请登录';
        toast('注册成功，去登录吧', true);
      } catch (err) {
        msg.textContent = err.message;
      }
    });
  }

  function enterTodo() {
    showView('todo');
    $id('currentUser').textContent = api.getUsername() || '未知旅行者';
    currentPage = 1;
    loadTodos(1);
  }

  /* ---------- 待办 ---------- */
  function bindTodo() {
    $id('createForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = $id('createTitle').value.trim();
      const desc = $id('createDesc').value.trim();
      if (!title) return;
      try {
        await api.createTodo(title, desc || null);
        $id('createTitle').value = '';
        $id('createDesc').value = '';
        toast('添加成功', true);
        loadTodos(1);
      } catch (err) {
        toast(err.message, false);
      }
    });

    $id('logoutBtn').addEventListener('click', () => {
      api.clearToken();
      showView('auth');
      toast('已退出登录');
    });

    $id('clearBtn').addEventListener('click', async () => {
      if (!confirm('确定清空全部待办吗？')) return;
      try {
        await api.clearTodos();
        toast('已清空', true);
        loadTodos(1);
      } catch (err) {
        toast(err.message, false);
      }
    });
  }

  async function loadTodos(page) {
    try {
      const body = await api.listTodos(page || 1, PAGE_SIZE);
      const data = body.data || {};
      const list = data.list || [];
      currentPage = data.page_num || page || 1;
      totalPages = Math.max(1, Math.ceil((data.total || 0) / PAGE_SIZE));
      renderList(list);
      renderPagination();
    } catch (err) {
      toast(err.message, false);
    }
  }

  function renderList(items) {
    const ul = $id('todoList');
    const empty = $id('todoEmpty');
    if (!items.length) {
      ul.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    ul.innerHTML = items.map((t) => {
      const done = t.is_done ? ' done' : '';
      const doneBox = t.is_done ? '✓' : '';
      return `<li class="todo-item${done}" data-id="${t.id}">
        <label class="todo-check">
          <span class="check-box">${doneBox}</span>
          <span class="todo-title">${esc(t.title)}</span>
        </label>
        ${t.description ? `<p class="todo-desc">${esc(t.description)}</p>` : ''}
        <span class="todo-time">${esc(t.create_time || '')}</span>
        <div class="todo-actions">
          <button class="btn btn-ghost btn-sm" data-act="toggle">${t.is_done ? '恢复' : '完成'}</button>
          <button class="btn btn-ghost btn-sm" data-act="edit">编辑</button>
          <button class="btn btn-danger btn-sm" data-act="del">删除</button>
        </div>
      </li>`;
    }).join('');

    ul.querySelectorAll('.todo-item').forEach((li) => {
      const id = li.getAttribute('data-id');
      li.addEventListener('click', (e) => {
        const act = e.target.getAttribute('data-act');
        if (act === 'toggle') toggleTodo(id, li);
        else if (act === 'edit') editTodo(id, li);
        else if (act === 'del') delTodo(id);
      });
    });
  }

  async function toggleTodo(id, li) {
    const isDone = li.classList.contains('done');
    try {
      await api.updateTodo(id, { is_done: !isDone });
      loadTodos(currentPage);
    } catch (err) { toast(err.message, false); }
  }

  async function editTodo(id, li) {
    const titleEl = li.querySelector('.todo-title');
    const current = titleEl.textContent;
    const next = prompt('修改标题：', current);
    if (next === null) return;
    const t = next.trim();
    if (!t || t === current) return;
    try {
      await api.updateTodo(id, { title: t });
      toast('已保存', true);
      loadTodos(currentPage);
    } catch (err) { toast(err.message, false); }
  }

  async function delTodo(id) {
    if (!confirm('确定删除这条待办吗？')) return;
    try {
      await api.deleteTodo(id);
      toast('已删除', true);
      loadTodos(currentPage);
    } catch (err) { toast(err.message, false); }
  }

  function renderPagination() {
    const pag = $id('pagination');
    pag.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="pagePrev" ${currentPage <= 1 ? 'disabled' : ''}>上一页</button>
      <span class="page-info">第 ${currentPage} / ${totalPages} 页</span>
      <button class="btn btn-ghost btn-sm" id="pageNext" ${currentPage >= totalPages ? 'disabled' : ''}>下一页</button>`;
    $id('pagePrev').addEventListener('click', () => { if (currentPage > 1) loadTodos(currentPage - 1); });
    $id('pageNext').addEventListener('click', () => { if (currentPage < totalPages) loadTodos(currentPage + 1); });
  }

  /* ---------- 初始化 ---------- */
  function init() {
    spawnPetals();
    bindAuth();
    bindTodo();
    if (api.getToken()) {
      enterTodo();
    } else {
      showView('auth');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
