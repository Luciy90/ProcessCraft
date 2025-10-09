// Инициализация иконок
document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons({ attrs: { "stroke-width": 1.5 } });
  }

  // После готовности иконок, инициализируем рендереры
  renderRoles();
  renderModules();
});

// Данные
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

// Вспомогательные функции для преобразования в плоский список
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

// Предварительное вычисление статистики по уровням (структура статична)
const levelCounts = (() => {
  const map = new Map();
  flatModules.forEach(n => map.set(n.depth, (map.get(n.depth) || 0) + 1));
  return map;
})();
const totalRows = flatModules.length;

// Права доступа для каждой роли (один набор "отмеченных" элементов)
const rolePermissions = {
  admin: { checked: new Set(allModuleIds) },
  editor: { checked: new Set(["dashboard", "projects", "projects.view", "projects.edit", "reports"]) },
  viewer: { checked: new Set(["dashboard", "projects", "projects.view", "reports", "reports.sales"]) },
  contractor: { checked: new Set(["projects", "projects.view"]) }
};

// UI elements
const modal = document.getElementById("settingsModal");
const openModalBtn = document.getElementById("openModalBtn");
const closeModalX = document.getElementById("closeModalX");
const cancelBtn = document.getElementById("cancel");
const applyBtn = document.getElementById("apply");
const rolesList = document.getElementById("rolesList");
const modulesTree = document.getElementById("modulesTree");

const rolesSearch = document.getElementById("rolesSearch");
const modulesSearch = document.getElementById("modulesSearch");
const expandAllBtn = document.getElementById("expandAllBtn");
const collapseAllBtn = document.getElementById("collapseAllBtn");

const presetViewAll = document.getElementById("presetViewAll");
const presetDisableAll = document.getElementById("presetDisableAll");

// Ссылки на новые счетчики
const countRowsEl = document.getElementById("countRows");
const levelsBreakdownEl = document.getElementById("levelsBreakdown");
const countActiveEl = document.getElementById("countActive");
const countDeniedEl = document.getElementById("countDenied");

const activeRoleNameEl = document.getElementById("activeRoleName");

// Локальное состояние
let activeRoleId = roles[0].id;
const stateByRole = new Map(roles.map(r => {
  const s = rolePermissions[r.id] || { checked: new Set() };
  return [r.id, { checked: new Set(s.checked) }];
}));

// Фильтры и состояние просмотра
let rolesQuery = "";
let modulesQuery = "";

// Отслеживание развернутых узлов (сохраняет состояние открытия между перерисовками)
const expandedIds = new Set();

// Возвращает SVG разметку для индикатора раскрытия узла. `expanded` - булево значение.
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

// Рендеринг ролей
function renderRoles() {
  if (!rolesList) return;
  rolesList.innerHTML = "";
  const q = rolesQuery.trim().toLowerCase();
  roles
    .filter(r => !q || r.name.toLowerCase().includes(q) || (r.info && r.info.toLowerCase().includes(q)))
    .forEach((r) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left";
      row.setAttribute("data-role-id", r.id);

      const isActive = r.id === activeRoleId;

      row.innerHTML = `
        <div class="h-8 w-8 rounded-md border border-white/10 bg-white/5 grid place-items-center">
          <span class="text-xs font-semibold">${r.name.charAt(0)}</span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium ${isActive ? 'text-white' : 'text-white/90'}">${r.name}</span>
            ${isActive ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-400/30 text-emerald-200">Выбрано</span>' : ''}
          </div>
          <div class="text-xs text-white/60 truncate">${r.info || ''}</div>
        </div>
      `;

      row.addEventListener("click", () => {
        activeRoleId = r.id;
        expandedIds.clear();
        renderRoles();
        renderModules();
      });

      rolesList.appendChild(row);
    });

  if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons({ attrs: { "stroke-width": 1.5 } });
  const activeRole = roles.find(r => r.id === activeRoleId);
  if (activeRoleNameEl && activeRole) activeRoleNameEl.textContent = activeRole.name;
}

// Рендеринг дерева модулей
function renderModules() {
  if (!modulesTree) return;
  const roleState = stateByRole.get(activeRoleId);
  const filtered = filterTree(modules, modulesQuery);
  modulesTree.innerHTML = "";

  const build = (nodes, depth = 0, parentEl) => {
    nodes.forEach((node) => {
      const row = document.createElement("div");
      row.className = "grid items-center p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors shadow-sm";
      row.style.gridTemplateColumns = "minmax(0,1fr) auto";
      row.style.columnGap = "3.35rem";
      row.setAttribute("data-node-id", node.id);

      const hasChildren = node.children && node.children.length > 0;
      const paddingLeft = 8 + depth * 16;

      const isChecked = roleState.checked.has(node.id);

      let collapsed = hasChildren ? !expandedIds.has(node.id) : false;

      row.innerHTML = `
        <div class="flex items-center gap-2 min-w-0">
          <button type="button" class="shrink-0 h-6 w-6 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 grid place-items-center group" data-expand aria-expanded="${hasChildren ? String(!collapsed) : 'false'}">
            ${nodeIconSVG(hasChildren, !collapsed)}
          </button>
          <div class="min-w-0" style="padding-left:${paddingLeft}px">
            <div class="text-sm leading-6 truncate">${node.name}</div>
          </div>
        </div>

        <div class="flex justify-center">
          <label class="group inline-flex items-center justify-center select-none active:scale-95 transition-transform" style="cursor: pointer;">
            <input type="checkbox" data-permission="${node.id}" ${isChecked ? "checked" : ""} class="peer sr-only" />
            <span class="relative h-5 w-5 rounded-md border border-white/10 bg-white/[0.06] shadow-sm transition duration-200 ease-out group-hover:bg-white/10 peer-checked:border-emerald-400/40 peer-checked:bg-emerald-500/20">
              <span class="absolute inset-0 rounded-md ring-1 ring-inset ring-white/10 transition group-hover:ring-white/20 peer-focus-visible:ring-2 peer-focus-visible:ring-white/25 peer-checked:ring-emerald-400/25"></span>
              <svg data-lucide="check" class="absolute inset-0 m-auto h-3.5 w-3.5 text-emerald-300 opacity-0 scale-90 transition duration-200 ease-out peer-checked:opacity-100 peer-checked:scale-100"></svg>
            </span>
          </label>
        </div>
      `;

      // Контейнер для дочерних элементов (аккордеон)
      const childrenWrap = document.createElement("div");
      childrenWrap.setAttribute("data-children", "1");
      childrenWrap.setAttribute("data-node-id", node.id);
      childrenWrap.className = hasChildren ? (collapsed ? "hidden" : "") : "";

      // Раскрытие/сворачивание
      const expandBtn = row.querySelector("[data-expand]");
      const iconExpand = expandBtn.querySelector("svg");
      if (hasChildren && !collapsed) iconExpand.style.transform = "rotate(90deg)";

      const checkbox = row.querySelector('input[type="checkbox"][data-permission]');

      expandBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!hasChildren) return;

        collapsed = !collapsed;
        childrenWrap.classList.toggle("hidden", collapsed);

        // Поворот иконки + отражение состояния
        iconExpand.style.transform = collapsed ? "rotate(0deg)" : "rotate(90deg)";
        expandBtn.setAttribute("aria-expanded", String(!collapsed));
        if (collapsed) expandedIds.delete(node.id); else expandedIds.add(node.id);

        // Поведение аккордеона: сворачивание соседних элементов при открытии
        if (!collapsed) {
          const siblings = Array.from(parentEl.querySelectorAll(':scope > div[data-children="1"]'));
          siblings.forEach((wrap) => {
            if (wrap !== childrenWrap) {
              wrap.classList.add("hidden");
              const sibRow = wrap.previousElementSibling;
              if (sibRow) {
                const sibIcon = sibRow.querySelector('[data-expand] svg');
                const sibBtn = sibRow.querySelector('[data-expand]');
                if (sibIcon) sibIcon.style.transform = "rotate(0deg)";
                if (sibBtn) sibBtn.setAttribute("aria-expanded", "false");
                const sibId = sibRow.getAttribute('data-node-id');
                if (sibId) expandedIds.delete(sibId);
              }
            }
          });
        }
      });

      // Поведение чекбокса (каскадное вниз)
      checkbox.addEventListener("change", (e) => {
        const on = e.target.checked;
        cascadeChecked(node, stateByRole.get(activeRoleId).checked, on);
        renderModules();
      });

      parentEl.appendChild(row);
      parentEl.appendChild(childrenWrap);

      if (hasChildren) {
        build(node.children, depth + 1, childrenWrap);
      }
    });

    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons({ attrs: { "stroke-width": 1.5 } });
  };

  build(filtered, 0, modulesTree);
  updateCounters();
}

function cascadeChecked(node, set, on) {
  const toggle = (n) => {
    if (on) set.add(n.id); else set.delete(n.id);
    if (n.children?.length) n.children.forEach(toggle);
  };
  toggle(node);
}

// Счетчики (Итого)
function updateCounters() {
  const s = stateByRole.get(activeRoleId);
  const active = s.checked.size;
  const denied = Math.max(0, totalRows - active);

  // rows total
  if (countRowsEl) countRowsEl.textContent = String(totalRows);

  // levels breakdown like: 0: X • 1: Y • 2: Z
  const parts = [];
  const maxLevel = Math.max(...Array.from(levelCounts.keys()));
  for (let d = 0; d <= maxLevel; d++) {
    parts.push(`${d}: ${levelCounts.get(d) || 0}`);
  }
  if (levelsBreakdownEl) levelsBreakdownEl.textContent = parts.join(' • ');

  // active / denied
  if (countActiveEl) countActiveEl.textContent = String(active);
  if (countDeniedEl) countDeniedEl.textContent = String(denied);
}

// Управление модальным окном
function openModal() {
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}
function closeModal() {
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

if (openModalBtn) openModalBtn.addEventListener("click", openModal);
if (closeModalX) closeModalX.addEventListener("click", closeModal);
if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
if (applyBtn) applyBtn.addEventListener("click", closeModal);

// Фильтры
if (rolesSearch) rolesSearch.addEventListener("input", (e) => {
  rolesQuery = e.target.value || "";
  renderRoles();
});
if (modulesSearch) modulesSearch.addEventListener("input", (e) => {
  modulesQuery = e.target.value || "";
  renderModules();
});

// Раскрыть/Свернуть все: обновление expandedIds
function addAllExpandable(nodes) {
  nodes.forEach(n => {
    if (n.children?.length) {
      expandedIds.add(n.id);
      addAllExpandable(n.children);
    }
  });
}

if (expandAllBtn) expandAllBtn.addEventListener("click", () => {
  expandedIds.clear();
  addAllExpandable(modules);
  renderModules();
});

if (collapseAllBtn) collapseAllBtn.addEventListener("click", () => {
  expandedIds.clear();
  renderModules();
});

// Закрытие по клику на оверлей
if (modal) modal.addEventListener("click", (e) => {
  if (e.target === modal || e.target === modal.firstElementChild) {
    closeModal();
  }
});

// Предустановки
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
