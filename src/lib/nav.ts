import {
  BarChart3,
  HeartPulse,
  LayoutDashboard,
  Receipt,
  Repeat,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  to:
    | "/dashboard"
    | "/expenses"
    | "/advisor"
    | "/budgets"
    | "/goals"
    | "/analytics"
    | "/predictor"
    | "/subscriptions"
    | "/health"
    | "/settings";
  icon: LucideIcon;
  description: string;
};

export const mainNav: NavItem[] = [
  { title: "Dashboard", to: "/dashboard", icon: LayoutDashboard, description: "Your money at a glance" },
  { title: "Expense Tracker", to: "/expenses", icon: Receipt, description: "Every rupee in and out" },
  { title: "AI Financial Advisor", to: "/advisor", icon: Sparkles, description: "Chat with Compass AI" },
  { title: "Smart Budget Planner", to: "/budgets", icon: Wallet, description: "Plan each month" },
  { title: "Savings Goals", to: "/goals", icon: Target, description: "Save for what matters" },
  { title: "Spending Analytics", to: "/analytics", icon: BarChart3, description: "Reports and trends" },
  { title: "Future Expense Predictor", to: "/predictor", icon: TrendingUp, description: "See next month early" },
  { title: "Subscription Tracker", to: "/subscriptions", icon: Repeat, description: "Recurring payments" },
  { title: "Financial Health Score", to: "/health", icon: HeartPulse, description: "Your money habits score" },
];

export const settingsNav: NavItem = {
  title: "Settings",
  to: "/settings",
  icon: Settings,
  description: "Profile and preferences",
};

export const allNav = [...mainNav, settingsNav];
