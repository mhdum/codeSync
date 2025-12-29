"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { FileCode, Folder,  Settings } from "lucide-react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ModeToggle } from "./ThemeToggler";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";



const sideBarItems = [
  {
    href: "/dashboard",
    icon: FileCode,
    label: "Dashboard",
  },
  {
    href: "/projects",
    icon: Folder,
    label: "Projects",
  },
  // {
  //   href: "/collaborators",
  //   icon: Users,
  //   label: "Collaborators",
  // },
  {
    href: "/settings",
    icon: Settings,
    label: "Settings",
  },
];

export default function SideBar() {
  const { data: session, status } = useSession();
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [userProfile, setUserProfile] = useState<{
    name?: string;
    email?: string;
    image?: string;
  } | null>(null);
  const pathname = usePathname();

  // Store user email locally
  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      localStorage.setItem("userEmail", session.user.email);
    }
  }, [status, session]);

  // Fetch profile and projects
  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    if (!email) return;
    const fetchProfile = async () => {
      if (!email) return;

      try {
        const res = await fetch(
          `/api/profile/get?email=${encodeURIComponent(email)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        setUserProfile(data);
      } catch (err) {
        console.error("Profile fetch error:", err);
      } finally {
        setLoadingProfile(false);
      }
    };

    // const fetchProjects = async () => {
    //   const ownerid = localStorage.getItem("userEmail");
    //   if (!ownerid) return;

    //   try {
    //     const res = await fetch(`/api/project/get?ownerid=${encodeURIComponent(ownerid)}`);
    //     if (!res.ok) return;
    //     const data = await res.json();
    //     if (Array.isArray(data.projects)) {
    //       const projectsWithDate = data.projects.map((proj: any) => ({
    //         ...proj,
    //         createdAt: proj.createdAt?.seconds ? new Date(proj.createdAt.seconds * 1000) : new Date(),
    //       }));
    //       setProjects(projectsWithDate);
    //     }
    //   } catch (err) {
    //     console.error("Error fetching projects:", err);
    //   } finally {
    //     setLoadingProjects(false);
    //   }
    // };

    fetchProfile();
    // fetchProjects();
  }, []);

  if (status === "loading") return <p>Loading...</p>;
  if (status === "unauthenticated")
    return (
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="px-4 py-2 bg-red-500 text-white rounded"
      >
        Please log in
      </button>
    );

  return (
    <aside className="w-64 flex flex-col bg-white dark:bg-gray-900 border-r dark:border-gray-800">
      {/* Logo */}
      <div className="p-4 border-b dark:border-gray-800">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          CodeCollab
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        <ul className="space-y-1">
          {sideBarItems.map((item, i) => {
            const isActive = pathname === item.href;
            return (
              <li key={i}>
                <Link href={item.href}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white
                      ${isActive
                        ? "bg-gray-200/70 dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                        : ""
                      }`}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Dropdown */}
      <div className="p-3 border-t dark:border-gray-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              {loadingProfile ? (
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
              ) : userProfile?.image ? (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={userProfile.image} alt={userProfile.name} />
                  <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {userProfile?.email?.[0].toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {userProfile?.email?.[0].toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              )}

              <div className="flex flex-col text-left min-w-0 flex-1">
                <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                  {userProfile?.name || "User"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {userProfile?.email || "user@example.com"}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{userProfile?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {userProfile?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="w-full">
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ModeToggle />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}