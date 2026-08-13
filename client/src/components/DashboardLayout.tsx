import { useAuth } from "@/_core/hooks/useAuth";
import { useIsMobile } from "@/hooks/useMobile";
import { BookOpenCheck, LogOut, PanelLeft } from "lucide-react";
import { ReactNode } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "./ui/sidebar";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

export default function DashboardLayout({ children, sidebarContent }: { children: ReactNode; sidebarContent: ReactNode }) {
  const { loading, user, logout } = useAuth();
  const isMobile = useIsMobile();

  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) {
    return (
      <div className="min-h-screen bg-[#f7f8f5] px-6 flex items-center justify-center">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0a2825] text-[#e3efb0] shadow-xl">
            <BookOpenCheck className="h-7 w-7" />
          </div>
          <h1 className="font-serif text-3xl text-[#102522]">Research, with receipts.</h1>
          <p className="mt-3 text-sm leading-6 text-[#61716c]">Sign in to create and preserve evidence-led research sessions.</p>
          <Button onClick={() => { window.location.href = "/login"; }} className="mt-7 w-full bg-[#0a2825] text-white hover:bg-[#123c37]">Sign in to research</Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas" className="border-r border-[#dce4de] bg-[#f7f8f5]">
        <SidebarHeader className="h-[84px] border-b border-[#dce4de] px-5 flex justify-center">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0a2825] text-[#e3efb0] shadow-sm">
              <BookOpenCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-serif text-[17px] leading-5 text-[#102522]">Evidence Studio</p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#83928d]">autonomous research</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-3 py-4">{sidebarContent}</SidebarContent>
        <SidebarFooter className="border-t border-[#dce4de] p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left outline-none transition-colors hover:bg-[#edf1eb] focus-visible:ring-2 focus-visible:ring-[#9aaf4f]">
                <Avatar className="h-8 w-8 border border-[#dce4de]">
                  <AvatarFallback className="bg-[#dfe8d6] text-xs font-semibold text-[#30564d]">{user.name?.charAt(0).toUpperCase() || "R"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-[#213a35]">{user.name || "Researcher"}</p>
                  <p className="mt-0.5 truncate text-[11px] text-[#82908b]">{user.email || "Workspace member"}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-[#fcfdfb]">
        {isMobile && (
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[#dce4de] bg-[#fcfdfb]/95 px-3 backdrop-blur">
            <SidebarTrigger className="h-9 w-9 rounded-lg" />
            <span className="font-serif text-lg text-[#102522]">Evidence Studio</span>
          </header>
        )}
        <main className="min-h-screen">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
