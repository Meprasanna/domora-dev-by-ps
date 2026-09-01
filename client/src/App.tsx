import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Partner from "@/pages/Partner";
import PartnerManage from "@/pages/PartnerManage";
import Admin from "@/pages/Admin";
import SupplierAdmin from "@/pages/SupplierAdmin";
import HotelDetail from "@/pages/HotelDetail";
import Booking from "@/pages/Booking";
import Wishlist from "@/pages/Wishlist";
import BookingConfirmation from "@/pages/BookingConfirmation";
import InviteAccept from "@/pages/InviteAccept";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import SearchResults from "./pages/SearchResults";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/search"} component={SearchResults} />
      <Route path={"/partner"} component={Partner} />
      <Route path={"/partner/manage"} component={PartnerManage} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/admin/comparison"} component={SupplierAdmin} />
      <Route path={"/hotel/:slug"} component={HotelDetail} />
      <Route path={"/book/:hotelId/:roomId"} component={Booking} />
      <Route path={"/wishlist"} component={Wishlist} />
      <Route path={"/bookings/:id"} component={BookingConfirmation} />
      <Route path={"/invite"} component={InviteAccept} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
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
