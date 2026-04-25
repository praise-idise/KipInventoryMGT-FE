import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
} from "@tanstack/react-router";
import { isAuthenticated } from "@/auth/session";
import { AuthLayout } from "@/layouts/AuthLayout";
import { AppShellLayout } from "@/layouts/AppShellLayout";
import { RootLayout } from "@/layouts/RootLayout";
import { CustomerDetailPage } from "@/pages/app/CustomerDetailPage";
import { CustomersPage } from "@/pages/app/CustomersPage";
import { DashboardPage } from "@/pages/app/DashboardPage";
import { InventoryOpsPage } from "@/pages/app/InventoryOpsPage";
import { ProductDetailPage } from "@/pages/app/ProductDetailPage";
import { ProductsPage } from "@/pages/app/ProductsPage";
import { ProcurementPage } from "@/pages/app/ProcurementPage";
import { SupplierDetailPage } from "@/pages/app/SupplierDetailPage";
import { SuppliersPage } from "@/pages/app/SuppliersPage";
import { WarehouseDetailPage } from "@/pages/app/WarehouseDetailPage";
import { WarehousesPage } from "@/pages/app/WarehousesPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { LandingPage } from "@/pages/LandingPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingPage,
});

const authLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth",
  component: AuthLayout,
});

const loginRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: "/login",
  component: LoginPage,
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({ to: "/app/dashboard" });
    }
  },
});

const appShellRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/app",
  component: AppShellLayout,
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: "/auth/login" });
    }
  },
});

const dashboardRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const warehousesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: "/warehouses",
  component: WarehousesPage,
});

const warehouseDetailRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: "/warehouses/$warehouseId",
  component: WarehouseDetailPage,
});

const productsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: "/products",
  component: ProductsPage,
});

const productDetailRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: "/products/$productId",
  component: ProductDetailPage,
});

const suppliersRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: "/suppliers",
  component: SuppliersPage,
});

const supplierDetailRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: "/suppliers/$supplierId",
  component: SupplierDetailPage,
});

const customersRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: "/customers",
  component: CustomersPage,
});

const customerDetailRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: "/customers/$customerId",
  component: CustomerDetailPage,
});

const procurementRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: "/procurement",
  component: ProcurementPage,
});

const inventoryOpsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: "/inventory-ops",
  component: InventoryOpsPage,
});

const routeTree = rootRoute.addChildren([
  landingRoute,
  authLayoutRoute.addChildren([loginRoute]),
  appShellRoute.addChildren([
    dashboardRoute,
    warehousesRoute,
    warehouseDetailRoute,
    productsRoute,
    productDetailRoute,
    suppliersRoute,
    supplierDetailRoute,
    customersRoute,
    customerDetailRoute,
    procurementRoute,
    inventoryOpsRoute,
  ]),
]);

export const router = createRouter({ routeTree });

// Augment the TanStack Router module with our router type for full type-safety.
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
