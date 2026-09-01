/* api.js — 封装所有后端请求，统一处理 token 与响应格式 */
(function (global) {
  'use strict';

  const TOKEN_KEY = 'todo_token';
  const USER_KEY = 'todo_user';

  /* ---------- token 存取 ---------- */
  function setToken(token, username) {
    localStorage.setItem(TOKEN_KEY, token);
    if (username) localStorage.setItem(USER_KEY, username);
  }
  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }
  function getUsername() {
    return localStorage.getItem(USER_KEY) || '';
  }
  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  /* ---------- 统一的 JSON 请求 ---------- */
  async function request(url, options) {
    options = options || {};
    const headers = Object.assign({}, options.headers || {});
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';

    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const resp = await fetch(url, Object.assign({}, options, { headers }));
    let body = null;
    try { body = await resp.json(); } catch (e) { /* 非 JSON 响应 */ }

    // 认证失败：token 失效，清掉并跳到登录
    if (resp.status === 401) {
      clearToken();
      if (typeof global.onUnauthorized === 'function') global.onUnauthorized();
      throw new Error((body && body.detail) || '认证已失效，请重新登录');
    }
    if (body && typeof body.code === 'number' && body.code !== 200) {
      throw new Error(body.msg || '请求失败');
    }
    return body;
  }

  /* ---------- 具体接口 ---------- */
  // 注册：JSON
  async function register(username, password) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }
  // 登录：表单（OAuth2 密码流字段名 username/password）
  async function login(username, password) {
    const resp = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username, password }),
    });
    const data = await resp.json();
    if (!resp.ok || !data.access_token) {
      throw new Error(data.msg || data.detail || '登录失败');
    }
    setToken(data.access_token, username);
    return data;
  }

  // 待办 CRUD
  async function createTodo(title, description) {
    return request('/todo/', {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    });
  }
  async function listTodos(pageNum, pageSize) {
    const q = new URLSearchParams({ page_num: pageNum, page_size: pageSize });
    return request('/todo/?' + q.toString(), { method: 'GET' });
  }
  async function updateTodo(id, patch) {
    return request('/todo/' + id, {
      method: 'PUT',
      body: JSON.stringify(patch),
    });
  }
  async function deleteTodo(id) {
    return request('/todo/' + id, { method: 'DELETE' });
  }
  async function clearTodos() {
    return request('/todo/clear', { method: 'DELETE' });
  }

  global.api = {
    setToken, getToken, getUsername, clearToken,
    register, login,
    createTodo, listTodos, updateTodo, deleteTodo, clearTodos,
  };
})(window);
