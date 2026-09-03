import {
  ArrowRightLeft,
  ClipboardCheck,
  CreditCard,
  Database,
  LayoutDashboard,
  Package,
  PackageMinus,
  PackagePlus,
  Scale,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import type { AppRole } from "@/auth/roles";
import { APP_ROLES } from "@/auth/roles";

export type NavItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
  soon?: boolean;
  roles?: AppRole[];
};

export type NavGroup = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
};

/** Single source of truth for sidebar structure and page badge labels. */
export const navGroups: (NavItem | NavGroup)[] = [
  { label: "Dashboard", to: "/app/dashboard", icon: LayoutDashboard },
  {
    label: "Master Data",
    icon: Database,
    items: [
      { label: "Warehouses", to: "/app/warehouses", icon: Warehouse },
      { label: "Products", to: "/app/products", icon: Package },
      { label: "Suppliers", to: "/app/suppliers", icon: Truck },
      { label: "Customers", to: "/app/customers", icon: Users },
    ],
  },
  {
    label: "Procurement",
    icon: ShoppingCart,
    items: [
      {
        label: "Purchase Orders",
        to: "/app/purchase-orders",
        icon: ShoppingCart,
      },
    ],
  },
  {
    label: "Inventory",
    icon: Package,
    items: [
      {
        label: "Opening Balances",
        to: "/app/opening-balances",
        icon: PackagePlus,
      },
      { label: "Transfers", to: "/app/transfers", icon: ArrowRightLeft },
      { label: "Stock Adjustments", to: "/app/stock-adjustments", icon: Scale },
      { label: "Stock Issues", to: "/app/stock-issues", icon: PackageMinus },
    ],
  },
  {
    label: "Administration",
    icon: Settings,
    items: [
      {
        label: "Approvals",
        to: "/app/approvals",
        icon: ClipboardCheck,
        roles: [APP_ROLES.ADMIN, APP_ROLES.APPROVER],
      },
      {
        label: "Users & Roles",
        to: "/app/users",
        icon: Users,
        roles: [APP_ROLES.ADMIN],
      },
      {
        label: "Billing",
        to: "/app/billing",
        icon: CreditCard,
        roles: [APP_ROLES.ADMIN],
      },
      { label: "Settings", to: "/app/settings", icon: Settings },
    ],
  },
];

/** Build a route→group-label map from the sidebar nav structure. */
function buildRouteLabelMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const entry of navGroups) {
    if ("items" in entry) {
      for (const item of entry.items) {
        if (item.to) map[item.to] = entry.label;
      }
    } else if (entry.to) {
      map[entry.to] = entry.label;
    }
  }
  return map;
}

const ROUTE_TO_GROUP = buildRouteLabelMap();

export function getGroupLabel(path: string): string {
  for (const [route, label] of Object.entries(ROUTE_TO_GROUP)) {
    if (path === route || path.startsWith(`${route}/`)) {
      return label;
    }
  }
  return "";
}
