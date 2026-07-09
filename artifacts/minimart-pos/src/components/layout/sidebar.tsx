import * as React from "react"
import { Link, useLocation } from "wouter"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Receipt, 
  CreditCard, 
  BarChart3, 
  Settings, 
  LogOut 
} from "lucide-react"

export function Sidebar() {
  const [location] = useLocation()
  const { user, logout } = useAuth()

  if (!user) return null;

  const isOwnerOrManager = user.role === 'owner' || user.role === 'manager';
  const isOwner = user.role === 'owner';

  const navItems = [
    ...(isOwnerOrManager ? [{ icon: LayoutDashboard, label: "Dashboard", href: "/" }] : []),
    { icon: ShoppingCart, label: "Point of Sale", href: "/pos" },
    ...(isOwnerOrManager ? [
      { icon: Package, label: "Inventory", href: "/inventory" },
      { icon: Users, label: "Customers", href: "/customers" },
      { icon: Receipt, label: "Sales History", href: "/sales" },
      { icon: CreditCard, label: "Expenses", href: "/expenses" },
      { icon: BarChart3, label: "Reports", href: "/reports" },
    ] : []),
    ...(isOwner ? [{ icon: Settings, label: "Staff", href: "/staff" }] : []),
  ];

  return (
    <div className="w-64 bg-sidebar text-sidebar-foreground flex flex-col h-screen fixed left-0 top-0 border-r border-sidebar-border shadow-xl">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-primary flex items-center justify-center font-bold text-white shadow-sm">
          MM
        </div>
        <h1 className="font-bold text-lg tracking-tight">Mini Mart</h1>
      </div>
      
      <div className="px-4 pb-4">
        <div className="bg-sidebar-accent rounded-lg p-3 text-sm">
          <div className="font-medium">{user.name}</div>
          <div className="text-sidebar-accent-foreground/70 capitalize text-xs mt-0.5">{user.role}</div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = location === item.href;
          return (
            <Link key={item.href} href={item.href} className="block">
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                active 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <button 
          onClick={() => logout()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors w-full text-left text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
