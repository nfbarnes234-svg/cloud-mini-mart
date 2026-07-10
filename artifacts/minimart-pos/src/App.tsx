import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';
import { AuthProvider, useAuth } from '@/hooks/use-auth';

// Pages
import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import POS from '@/pages/pos';
import Inventory from '@/pages/inventory';
import Customers from '@/pages/customers';
import Sales from '@/pages/sales';
import Expenses from '@/pages/expenses';
import Reports from '@/pages/reports';
import Staff from '@/pages/staff';
import Settings from '@/pages/settings';
import CashierDashboard from '@/pages/cashier-dashboard';

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, allowedRoles }: { component: React.ComponentType, allowedRoles?: string[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">Loading...</div>;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Redirect to={user.role === 'cashier' ? '/' : '/'} />;
  }

  return <Component />;
}

function Home() {
  const { user } = useAuth();
  return user?.role === 'cashier' ? <CashierDashboard /> : <Dashboard />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Protected Routes */}
      <Route path="/">
        <ProtectedRoute component={Home} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>
      <Route path="/pos">
        <ProtectedRoute component={POS} />
      </Route>
      <Route path="/inventory">
        <ProtectedRoute component={Inventory} allowedRoles={['owner', 'manager']} />
      </Route>
      <Route path="/customers">
        <ProtectedRoute component={Customers} allowedRoles={['owner', 'manager']} />
      </Route>
      <Route path="/sales">
        <ProtectedRoute component={Sales} allowedRoles={['owner', 'manager']} />
      </Route>
      <Route path="/expenses">
        <ProtectedRoute component={Expenses} allowedRoles={['owner', 'manager']} />
      </Route>
      <Route path="/reports">
        <ProtectedRoute component={Reports} allowedRoles={['owner', 'manager']} />
      </Route>
      <Route path="/staff">
        <ProtectedRoute component={Staff} allowedRoles={['owner']} />
      </Route>
      
      {/* Fallback */}
      <Route>
        <Redirect to="/" />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <AuthProvider>
          <Router />
        </AuthProvider>
      </WouterRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
