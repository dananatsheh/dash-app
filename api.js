/**
 * DASH API Layer
 * Replace the MOCK_DATA imports in DASHApp.jsx with these hooks.
 * Each hook returns { data, loading, error } and a refetch function.
 *
 * Usage in a component:
 *   import { useTasks, useGames, useDepartments, useSales } from "./api.js";
 *   const { data: tasks, loading, refetch } = useTasks();
 */

import { useState, useEffect, useCallback } from "react";

const BASE = "/api";

async function apiFetch(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function useResource(path) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch(path);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, refetch: fetch };
}

// ─── READ HOOKS ────────────────────────────────────────────────────────────────
export const useTasks       = () => useResource("/tasks");
export const useEmployees   = () => useResource("/employees");
export const useDepartments = () => useResource("/departments");
export const useGames       = () => useResource("/games");
export const useSales       = () => useResource("/sales");
export const useCustomers   = () => useResource("/customers");
export const useStages      = () => useResource("/stages");

// ─── WRITE HELPERS ─────────────────────────────────────────────────────────────
export const api = {
  // Tasks
  createTask:   (body) => apiFetch("/tasks", { method: "POST", body: JSON.stringify(body) }),
  deleteTask:   (id)   => apiFetch(`/tasks/${id}`, { method: "DELETE" }),
  updateTask:   (id, body) => apiFetch(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  // Departments
  createDepartment: (body) => apiFetch("/departments", { method: "POST", body: JSON.stringify(body) }),

  // Games
  createGame:   (body) => apiFetch("/games", { method: "POST", body: JSON.stringify(body) }),
  deleteGame:   (id)   => apiFetch(`/games/${id}`, { method: "DELETE" }),

  // Sales
  createSale:   (body) => apiFetch("/sales", { method: "POST", body: JSON.stringify(body) }),
};

/**
 * ─── HOW TO WIRE UP ──────────────────────────────────────────────────────────
 *
 * In OmarVerse, replace:
 *   const [tasks, setTasks] = useState(MOCK_DATA.tasks);
 * With:
 *   const { data: tasks, refetch } = useTasks();
 *   const handleAdd = async () => { await api.createTask(form); refetch(); };
 *   const handleDelete = async (id) => { await api.deleteTask(id); refetch(); };
 *
 * In SaraVerse, replace:
 *   const [depts, setDepts] = useState(MOCK_DATA.departments);
 * With:
 *   const { data: depts, refetch } = useDepartments();
 *   const handleAdd = async () => { await api.createDepartment(form); refetch(); };
 *
 * In LinaVerse, replace:
 *   const [games, setGames] = useState(MOCK_DATA.games);
 * With:
 *   const { data: games, refetch } = useGames();
 *   const handleAdd = async () => { await api.createGame(form); refetch(); };
 *   const handleDelete = async (id) => { await api.deleteGame(id); refetch(); };
 *
 * Sales table in LinaVerse:
 *   const { data: sales } = useSales();   // replaces MOCK_DATA.sales
 *
 * In YousefVerse:
 *   const { data: tasks } = useTasks();   // replaces MOCK_DATA.tasks
 */
