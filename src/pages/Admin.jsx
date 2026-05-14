import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, Package, ShoppingBag, TrendingUp, Zap } from 'lucide-react';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/creators', label: 'Creators', icon: Users },
  { path: '/admin/investors', label: 'Investors', icon: TrendingUp },
  { path: '/admin/products', label: 'Products', icon: Package },
  { path: '/admin/orders', label: 'Orders', icon: ShoppingBag },
];

export default function Admin() {
  const location = useLocation();

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-heading font-bold text-lg text-foreground">Admin Panel</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 overflow-x-auto pb-2 border-b border-border/50">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all whitespace-nowrap ${
              isActive(item)
                ? 'text-primary bg-primary/10 border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
      </div>

      <Outlet />
    </div>
  );
}
