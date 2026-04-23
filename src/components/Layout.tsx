import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";

const NAV_ITEMS = [
  { to: "/", label: "工具库", icon: "◈" },
  { to: "/settings", label: "设置", icon: "⚙" },
];

export function Layout() {
  return (
    <div className="flex h-screen bg-surface text-white select-none overflow-hidden">
      {/* Sidebar */}
      <aside className="w-48 shrink-0 bg-surface-card border-r border-white/10 flex flex-col py-4 px-3 gap-1">
        <div className="px-2 mb-4">
          <h1 className="text-accent font-bold text-lg tracking-tight">Olympus Hub</h1>
          <p className="text-gray-500 text-xs">AI 工具管理器</p>
        </div>

        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-accent/20 text-accent"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              )
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
