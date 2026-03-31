import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Zap, Lightbulb, PenLine, Calendar, BarChart3, UserPlus, Settings, Linkedin, MessageSquareHeart, Brain, LogOut, Rocket, CalendarDays, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const workflowItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/autopilote", label: "Autopilote", icon: Rocket },
  { to: "/posts-suggeres", label: "Publications", icon: PenLine },
  { to: "/calendrier", label: "Calendrier", icon: CalendarDays },
  { to: "/analyser", label: "Performance", icon: BarChart3 },
];

const automationItems = [
  { to: "/engagement", label: "Engagement", icon: MessageSquareHeart },
];

const managementItems = [
  { to: "/memoire", label: "Mémoire", icon: Brain },
  { to: "/idees", label: "Boîte à idées", icon: Lightbulb },
  { to: "/add-profile", label: "Profils", icon: UserPlus },
  { to: "/settings", label: "Configuration", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut, user } = useAuth();

  const { data: linkedinConnected = null } = useQuery({
    queryKey: ["linkedin-connection"],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("check-linkedin-connection");
      return data?.connected ?? false;
    },
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Linkedin className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight">Agent LinkedIn</span>
              {linkedinConnected !== null && (
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    linkedinConnected ? "bg-green-500" : "bg-destructive"
                  )}
                  title={linkedinConnected ? "LinkedIn connecté" : "LinkedIn non connecté"}
                />
              )}
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workflow</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workflowItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.to}
                      end={item.to === "/"}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Automation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {automationItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.to}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Gestion</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.to}
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-2">
        {!collapsed && user && (
          <p className="text-xs text-muted-foreground truncate text-center">{user.email}</p>
        )}
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Déconnexion</span>}
        </Button>
        {!collapsed && (
          <p className="text-[10px] text-muted-foreground text-center">Agent LinkedIn v1.0</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
