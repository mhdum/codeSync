"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { FileCode, Folder, Users, Settings, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ModeToggle} from "./ThemeToggler";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Project {
    name: string;
    createdAt: Date;
    project_id?: string;
}

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
    {
        href: "/collaborators",
        icon: Users,
        label: "Collaborators",
    },
    {
        href: "/settings",
        icon: Settings,
        label: "Settings",
    },
];

export default function SideBar() {
    const { data: session, status } = useSession();
    const [loadingProfile, setLoadingProfile] = useState(true);

    const [userProfile, setUserProfile] = useState<{ name?: string; email?: string; image?: string } | null>(null);
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
                const res = await fetch(`/api/profile/get?email=${encodeURIComponent(email)}`);
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
        <aside className="w-64 flex justify-between flex-col bg-white dark:bg-black border-r">
            <div className="p-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">CodeCollab</h1>
            </div>
            <nav className="mt-4 h-full">
                <ul className="space-y-2 px-2">
                    {sideBarItems.map((item, i) => (

                        <li key={i}>
                            <Link href={item.href}>
                                <Button variant="ghost" className={`w-full justify-start text-black dark:text-gray-200 ${pathname == item.href && "bg-gray-300/50"}`}>
                                    <item.icon className="mr-2 h-4 w-4" />
                                    {item.label}
                                </Button>
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
            <DropdownMenu>
                <DropdownMenuTrigger>
                    <div className=" flex flex-row px-2 gap-2 items-center">
                        {loadingProfile ? (
                            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
                        ) : userProfile?.image ? (
                            <Avatar>
                                <AvatarImage src={userProfile.image} alt={userProfile.name || "User"} />
                            </Avatar>
                        ) : (
                            <Avatar>
                                <AvatarFallback>{userProfile?.email?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                            </Avatar>
                        )}
                        <div className="flex flex-col pb-3">
                            <div className="font-bold text-black dark:text-white w-full">{userProfile?.name && userProfile.name}</div>
                            <div className="text-gray-400 text-sm">{userProfile?.email && userProfile.email}</div>
                        </div>
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Profile</DropdownMenuItem>
                    <DropdownMenuItem>
                        <ModeToggle />
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

        </aside>

    );
}
