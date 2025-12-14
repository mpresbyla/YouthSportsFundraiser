import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import LeagueDetail from "./pages/LeagueDetail";
import TeamDetail from "./pages/TeamDetail";
import FundraiserDetail from "./pages/FundraiserDetail";
import FundraiserPreview from "./pages/FundraiserPreview";
import Dashboard from "./pages/Dashboard";
import TeamDashboard from "./pages/TeamDashboard";
import CreateFundraiser from "./pages/CreateFundraiser";
import LeagueCreate from "./pages/LeagueCreate";
import Login from "./pages/Login";
import Register from "./pages/Register";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/leagues/create" component={LeagueCreate} />
      <Route path="/league/:id" component={LeagueDetail} />
      <Route path="/team/:id" component={TeamDetail} />
      <Route path="/fundraiser/:id" component={FundraiserDetail} />
      <Route path="/fundraiser/:id/preview" component={FundraiserPreview} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/team/:id/dashboard" component={TeamDashboard} />
      <Route path="/team/:teamId/create-fundraiser" component={CreateFundraiser} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
