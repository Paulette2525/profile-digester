import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, UserPlus, Settings, Linkedin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/add-profile", label: "Ajouter un profil", icon: UserPlus },
  { to: "/settings", label: "Configuration", icon: Settings },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [linkedinConnected, setLinkedinConnected] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.functions.invoke("check-linkedin-connection").then(({ data }) => {
      setLinkedinConnected(data?.connected ?? false);
    }).catch(() => setLinkedinConnected(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Linkedin className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">Agent LinkedIn</span>
            {linkedinConnected !== null && (
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  linkedinConnected ? "bg-green-500" : "bg-destructive"
                )}
                title={linkedinConnected ? "LinkedIn connecté" : "LinkedIn non connecté"}
              />
            )}
          </Link>

          <nav className="ml-auto flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="container py-6">{children}</main>
    </div>
  );
}
