// Access modal script (moved from design/access/script.js)
// NOTE: This file is intended to be loaded as part of renderer scripts bundle.

// Initialization will be done after all functions are declared
// to ensure function declarations (renderRoles/renderModules) are available.
function initAccessModal() {
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    try {
      lucide.createIcons({ attrs: { "stroke-width": 1.5 } });
    } catch (e) {
      console.warn('Lucide icons init failed:', e);
    }
  }

  // After icons ready, initialize renderers
  try {
    if (typeof renderRoles === 'function') renderRoles();
    if (typeof renderModules === 'function') renderModules();
  } catch (e) {
    console.error('Error initializing access modal renderers:', e);
  }
}

// Data
const roles = [
  { id: "admin", name: "Администратор", info: "Полный доступ", color: "emerald" },
  { id: "editor", name: "Редактор", info: "Управление контентом", color: "sky" },
  { id: "viewer", name: "Наблюдатель", info: "Только чтение", color: "violet" },
  { id: "contractor", name: "Подрядчик", info: "Ограниченный доступ", color: "amber" }
];

const modules = [
  { id: "dashboard", name: "Панель", children: [] },
  {
    id: "projects", name: "Проекты", children: [
      { id: "projects.view", name: "Просмотр", children: [] },
      { id: "projects.edit", name: "Редактирование", children: [] },
      { id: "projects.delete", name: "Удаление", children: [] }
    ]
  },
  {
    id: "reports", name: "Отчеты", children: [
      { id: "reports.sales", name: "Продажи", children: [] },
      { id: "reports.finance", name: "Финансы", children: [] }
    ]
  },
  {
    id: "settings", name: "Настройки", children: [
      { id: "settings.users", name: "Пользователи", children: [] },
      { id: "settings.roles", name: "Роли", children: [] },
      { id: "settings.billing", name: "Оплата", children: [] }
    ]
  }
];

// Flatten helpers
function flattenWithDepth(tree) {
  const out = [];
  const walk = (nodes, depth) => {
    nodes.forEach(n => {
      out.push({ id: n.id, depth, children: n.children || [] });
      if (n.children?.length) walk(n.children, depth + 1);
    });
  };
  walk(tree, 0);
  return out;
}
const flatModules = flattenWithDepth(modules);
const allModuleIds = flatModules.map(n => n.id);

// Precompute per-level stats (structure is static)
const levelCounts = (() => {
  const map = new Map();
  flatModules.forEach(n => map.set(n.depth, (map.get(n.depth) || 0) + 1));
  return map;
})();
const totalRows = flatModules.length;

// Permissions per role (single "checked" set)
const rolePermissions = {
  admin: { checked: new Set(allModuleIds) },
  editor: { checked: new Set(["dashboard", "projects", "projects.view", "projects.edit", "reports"]) },
  viewer: { checked: new Set(["dashboard", "projects", "projects.view", "reports", "reports.sales"]) },
  contractor: { checked: new Set(["projects", "projects.view"]) }
};

// UI elements (will be bound after template is inserted)
let modal = null;
let openModalBtn = null;
let closeModalX = null;
let cancelBtn = null;
let applyBtn = null;
let rolesList = null;
let modulesTree = null;

let rolesSearch = null;
let modulesSearch = null;
let expandAllBtn = null;
let collapseAllBtn = null;

let presetViewAll = null;
let presetDisableAll = null;

// New counter refs
let countRowsEl = null;
let levelsBreakdownEl = null;
let countActiveEl = null;
let countDeniedEl = null;

let activeRoleNameEl = null;

// Local state
let activeRoleId = roles[0].id;
const stateByRole = new Map(roles.map(r => {
  const s = rolePermissions[r.id] || { checked: new Set() };
  return [r.id, { checked: new Set(s.checked) }];
}));

// Filters and view state
let rolesQuery = "";
let modulesQuery = "";

// Track expanded nodes (preserves open state across re-renders)
const expandedIds = new Set();

// Returns SVG markup for node expand indicator. `expanded` is boolean.
function nodeIconSVG(hasChildren, expanded) {
  if (hasChildren) {
      return `
            <svg viewBox="0 0 16 16" class="h-4 w-4 text-slate-500" aria-hidden="true">
              <g data-expanded="${expanded}" class="origin-center transition-transform duration-300 ease-out">
                <circle cx="3" cy="3" r="0.9" class="fill-current opacity-85 transition-transform duration-300 corner-dot" data-corner="tl"></circle>
                <circle cx="8" cy="3" r="0.9" class="fill-current opacity-85"></circle>
                <circle cx="13" cy="3" r="0.9" class="fill-current opacity-85 transition-transform duration-300 corner-dot" data-corner="tr"></circle>
                <circle cx="3" cy="8" r="0.9" class="fill-current opacity-85"></circle>
                <circle cx="8" cy="8" r="0.9" class="fill-current opacity-100"></circle>
                <circle cx="13" cy="8" r="0.9" class="fill-current opacity-85"></circle>
                <circle cx="3" cy="13" r="0.9" class="fill-current opacity-85 transition-transform duration-300 corner-dot" data-corner="bl"></circle>
                <circle cx="8" cy="13" r="0.9" class="fill-current opacity-85"></circle>
                <circle cx="13" cy="13" r="0.9" class="fill-current opacity-85 transition-transform duration-300 corner-dot" data-corner="br"></circle>
              </g>
            </svg>
          `;
  }
  return `
            <svg viewBox="0 0 16 16" class="h-4 w-4 text-slate-500/80" aria-hidden="true">
              <circle cx="8" cy="8" r="1.25" class="fill-current"></circle>
            </svg>
          `;
}

function setForAll(tree, set, on) {
  const toggle = (nodes) => {
    nodes.forEach((n) => {
      if (on) set.add(n.id); else set.delete(n.id);
      if (n.children?.length) toggle(n.children);
    });
  };
  toggle(tree);
}

function filterTree(nodes, query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) {
    return JSON.parse(JSON.stringify(nodes));
  }
  const walk = (arr) => {
    const out = [];
    for (const n of arr) {
      const nameMatch = n.name.toLowerCase().includes(q);
      const children = n.children?.length ? walk(n.children) : [];
      if (nameMatch || children.length) {
        out.push({ id: n.id, name: n.name, children });
      }
    }
    return out;
  };
  return walk(nodes);
}

// Bind DOM refs after template insertion
function bindDomRefs() {
  modal = document.getElementById("accessModal");
  openModalBtn = document.getElementById("openModalBtn");
  closeModalX = document.getElementById("closeModalX");
  cancelBtn = document.getElementById("cancel");
  applyBtn = document.getElementById("apply");
  rolesList = document.getElementById("rolesList");
  modulesTree = document.getElementById("modulesTree");

  rolesSearch = document.getElementById("rolesSearch");
  modulesSearch = document.getElementById("modulesSearch");
  expandAllBtn = document.getElementById("expandAllBtn");
  collapseAllBtn = document.getElementById("collapseAllBtn");

  presetViewAll = document.getElementById("presetViewAll");
  presetDisableAll = document.getElementById("presetDisableAll");

  countRowsEl = document.getElementById("countRows");
  levelsBreakdownEl = document.getElementById("levelsBreakdown");
  countActiveEl = document.getElementById("countActive");
  countDeniedEl = document.getElementById("countDenied");

  activeRoleNameEl = document.getElementById("activeRoleName");
}

// Attach high-level controls (those that were set earlier when DOM was missing)
function attachControls() {
  // Modal controls
  if (openModalBtn) openModalBtn.addEventListener("click", openModal);
  if (closeModalX) closeModalX.addEventListener("click", closeModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
  if (applyBtn) applyBtn.addEventListener("click", closeModal);

  // Filters
  if (rolesSearch) rolesSearch.addEventListener("input", (e) => {
    rolesQuery = e.target.value || "";
    renderRoles();
  });
  if (modulesSearch) modulesSearch.addEventListener("input", (e) => {
    modulesQuery = e.target.value || "";
    renderModules();
  });

  // Expand/Collapse all
  if (expandAllBtn) expandAllBtn.addEventListener("click", () => {
    expandedIds.clear();
    addAllExpandable(modules);
    renderModules();
  });
  if (collapseAllBtn) collapseAllBtn.addEventListener("click", () => {
    expandedIds.clear();
    renderModules();
  });

  // Close by clicking overlay
  if (modal) modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target === modal.firstElementChild) {
      closeModal();
    }
  });

  // Presets
  if (presetViewAll) presetViewAll.addEventListener("click", () => {
    const s = stateByRole.get(activeRoleId);
    setForAll(modules, s.checked, true);
    renderModules();
  });
  if (presetDisableAll) presetDisableAll.addEventListener("click", () => {
    const s = stateByRole.get(activeRoleId);
    setForAll(modules, s.checked, false);
    renderModules();
  });
}

// Ensure template is present in DOM; if not, fetch and insert it lazily.
async function ensureTemplateInserted() {
  if (document.getElementById('accessModal')) return;
  try {
    const res = await fetch('templates/access-modal.html');
    if (!res.ok) throw new Error('Failed to fetch template: ' + res.status);
    let html = await res.text();

    // Remove any script tags that would try to load a local script relative to templates dir
    html = html.replace(/<script[^>]*src=["'][^"']+["'][^>]*><\/script>/g, '');

    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    // Append to body so IDs resolve
    document.body.appendChild(wrapper);

  // Bind refs and attach controls
  bindDomRefs();
    attachControls();

    // Initialize renderers for the modal
    initAccessModal();
  } catch (e) {
    console.error('Failed to insert access modal template:', e);
  }
}

// Implement open/close to ensure template exists and then show/hide
async function openModal() {
  try {
    await ensureTemplateInserted();
    // Bind refs in case template was just added
    bindDomRefs();
    attachControls();
    if (!modal) modal = document.getElementById('accessModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  } catch (e) {
    console.error('openModal failed:', e);
  }
}

function closeModal() {
  try {
    if (!modal) modal = document.getElementById('accessModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  } catch (e) {
    console.error('closeModal failed:', e);
  }
}

// Expose a minimal API so other modules can open/close the modal
window.AccessModal = window.AccessModal || {};
// These functions will be exposed via global AccessModal
window.AccessModal.open = function() { try { return openModal(); } catch (e) { console.warn('AccessModal.open failed:', e); } };
window.AccessModal.close = function() { try { return closeModal(); } catch (e) { console.warn('AccessModal.close failed:', e); } };

// Ensure initialization after definitions (no-op if template loaded lazily)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAccessModal);
} else {
  // DOM already ready
  initAccessModal();
}

// Exports for app-style imports (parity with model-settings.js)
export { initAccessModal };

export default { initAccessModal };
