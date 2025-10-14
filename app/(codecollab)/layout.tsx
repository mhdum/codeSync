import SideBar from "@/components/SideBar";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <SideBar />
            {children}
        </div>
    );
}