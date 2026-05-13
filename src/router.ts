import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
} from "@tanstack/react-router";
import { APP_ROLES } from "@/auth/roles";
import { getAuthUser, isAuthenticated } from "@/auth/session";
import { AuthLayout } from "@/layouts/AuthLayout";
import { AppShellLayout } from "@/layouts/AppShellLayout";
import { RootLayout } from "@/layouts/RootLayout";
import { ApprovalsPage } from "@/pages/app/ApprovalsPage";
import { ApprovalDetailPage } from "@/pages/app/ApprovalDetailPage";
import { CustomerDetailPage } from "@/pages/app/CustomerDetailPage";
import { CustomersPage } from "@/pages/app/CustomersPage";
import { DashboardPage } from "@/pages/app/DashboardPage";
import { OpeningBalanceDetailPage } from "@/pages/app/OpeningBalanceDetailPage";
import { OpeningBalancesPage } from "@/pages/app/OpeningBalancesPage";
import { ProductDetailPage } from "@/pages/app/ProductDetailPage";
import { ProductsPage } from "@/pages/app/ProductsPage";
import { ProcurementPage } from "@/pages/app/ProcurementPage";
import { PurchaseOrderDetailPage } from "@/pages/app/PurchaseOrderDetailPage";
import { PurchaseOrdersPage } from "@/pages/app/PurchaseOrdersPage";
import { SettingsPage } from "@/pages/app/SettingsPage";
import { StockAdjustmentDetailPage } from "@/pages/app/StockAdjustmentDetailPage";
import { StockAdjustmentsPage } from "@/pages/app/StockAdjustmentsPage";
import { StockIssuesPage } from "@/pages/app/StockIssuesPage";
import { TransferRequestDetailPage } from "@/pages/app/TransferRequestDetailPage";
import { UsersPage } from "@/pages/app/UsersPage";
import { SupplierDetailPage } from "@/pages/app/SupplierDetailPage";
import { SuppliersPage } from "@/pages/app/SuppliersPage";
import { WarehouseDetailPage } from "@/pages/app/WarehouseDetailPage";
import { WarehousesPage } from "@/pages/app/WarehousesPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { LandingPage } from "@/pages/LandingPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { ResendVerificationPage } from "@/pages/auth/ResendVerificationPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { VerifyEmailPage } from "@/pages/auth/VerifyEmailPage";
import { TransferRequestsPage } from "./pages/app/TransferRequestsPage";
import { SignupPage } from "./pages/auth/SignupPage";

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

const signupRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: "/signup",
  component: SignupPage,
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({ to: "/app/dashboard" });
    }
  },
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: "/forgot-password",
  component: ForgotPasswordPage,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: "/reset-password",
  component: ResetPasswordPage,
});

const resetPasswordAliasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reset-password",
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/auth/reset-password", search });
  },
});

const resendVerificationRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: "/resend-verification",
  component: ResendVerificationPage,
});

const verifyEmailRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: "/verify-email",
  component: VerifyEmailPage,
});

const verifyEmailAliasRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/verify-email",
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/auth/verify-email", search });
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
  beforeLoad: () => {
    throw redirect({ to: "/app/purchase-orders" });
  },
});

const purchaseOrdersRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: "/purchase-orders",
  component: PurchaseOrdersPage,
});

const purchaseOrderDetailRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: "/purchase-orders/$purchaseOrderId",
  component: PurchaseOrderDetailPage,
});

const transferRequestsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: "/transfers",
  component: TransferRequestsPage,
});

const transferRequestDetailRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: "/transfers/$transferRequestId",
  component: TransferRequestDetailPage,
});

const stockAdjustmentsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: "/stock-adjustments",
  component: StockAdjustmentsPage,
});

const stockAdjustmentDetailRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: "/stock-adjustments/$stockAdjustmentId",
  component: StockAdjustmentDetailPage,
});

const stockIssuesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: "/stock-issues",
  component: StockIssuesPage,
});

const openingBalancesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: "/opening-balances",
  component: OpeningBalancesPage,
});

const openingBalanceDetailRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: "/opening-balances/$openingBalanceId",
  component: OpeningBalanceDetailPage,
});

const approvalsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: "/approvals",
  component: ApprovalsPage,
  beforeLoad: () => {
    const authUser = getAuthUser();
    if (
      !authUser?.roles?.includes(APP_ROLES.APPROVER) &&
      !authUser?.roles?.includes(APP_ROLES.ADMIN)
    ) {
      throw redirect({ to: "/app/dashboard" });
    }
  },
});

const approvalDetailRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: "/approvals/$documentType/$documentId",
  component: ApprovalDetailPage,
  beforeLoad: () => {
    const authUser = getAuthUser();
    if (
      !authUser?.roles?.includes(APP_ROLES.APPROVER) &&
      !authUser?.roles?.includes(APP_ROLES.ADMIN)
    ) {
      throw redirect({ to: "/app/dashboard" });
    }
  },
});

const usersRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: "/users",
  component: UsersPage,
  beforeLoad: () => {
    const authUser = getAuthUser();
    if (!authUser?.roles?.includes(APP_ROLES.ADMIN)) {
      throw redirect({ to: "/app/dashboard" });
    }
  },
});

const settingsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: "/settings",
  component: SettingsPage,
});

const inventoryOpsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: "/inventory-ops",
  beforeLoad: () => {
    throw redirect({ to: "/app/transfers" });
  },
});

const routeTree = rootRoute.addChildren([
  landingRoute,
  resetPasswordAliasRoute,
  verifyEmailAliasRoute,
  authLayoutRoute.addChildren([
    loginRoute,
    signupRoute,
    forgotPasswordRoute,
    resetPasswordRoute,
    resendVerificationRoute,
    verifyEmailRoute,
  ]),
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
    purchaseOrdersRoute,
    purchaseOrderDetailRoute,
    transferRequestsRoute,
    transferRequestDetailRoute,
    stockAdjustmentsRoute,
    stockAdjustmentDetailRoute,
    stockIssuesRoute,
    openingBalancesRoute,
    openingBalanceDetailRoute,
    approvalsRoute,
    approvalDetailRoute,
    usersRoute,
    settingsRoute,
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
