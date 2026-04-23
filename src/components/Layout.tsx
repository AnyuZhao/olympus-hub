import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";

const NAV_ITEMS = [
  { to: "/", label: "工具库", icon: "◈" },
  { to: "/settings", label: "设置", icon: "⚙" },
];

export function Layout() {
  return (
    <div className="app-shell select-none">
      <aside className="app-sidebar" aria-label="主导航">
        <div className="app-sidebar-brand">
          <h1 className="app-sidebar-title">Olympus Hub</h1>
          <p className="app-sidebar-subtitle">
            安装、启动并管理本机 AI 工具。
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-1" aria-label="页面入口">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                clsx("app-nav-link", isActive && "app-nav-link-active")
              }
            >
              <span className="text-base leading-none text-accent/80">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
