"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileCode, Folder, Users, Settings, Loader2 } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import SideBar from "@/components/SideBar";
import { toast } from "sonner";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [userProfile, setUserProfile] = useState<{
    name?: string;
    email?: string;
    image?: string;
  } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const localEmail = localStorage.getItem("userEmail");
      if (!localEmail) return;

      try {
        const res = await fetch(`/api/profile/get?email=${localEmail}`);
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();
        setUserProfile(data);

        // ✅ Set form fields
        setName(data.name || "");
        setEmail(data.email || "");
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSaveProfile = async () => {
    const localEmail = localStorage.getItem("userEmail");
    if (!localEmail) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, localEmail }),
      });

      if (!res.ok) throw new Error("Failed to update profile");

      // alert("Profile updated successfully");
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error(error);
      // alert("Error updating profile");
      toast.error("Error updating profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (

    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b dark:border-gray-700 ... p-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Settings</h2>
        <div className="flex items-center space-x-4">
          {/* Avatar Skeleton */}
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
        </div>
      </header>

      {/* Settings Content */}
      <main className="flex-1 p-6 overflow-auto bg-gray-50 dark:bg-gray-950">
        <div className="grid gap-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Avatar + Button Skeleton */}
                {loadingProfile ? (
                  <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 rounded-full bg-gray-200 animate-pulse"></div>
                    <div className="h-10 w-32 bg-gray-200 animate-pulse rounded-md"></div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={userProfile?.image || "/placeholder-user.jpg"} alt="User" />
                      <AvatarFallback>{userProfile?.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                    <Button variant="outline">Change Avatar</Button>
                  </div>
                )}

                {/* Name Skeleton */}
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  {loadingProfile ? (
                    <div className="h-10 bg-gray-200 animate-pulse rounded-md"></div>
                  ) : (
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                    />
                  )}
                </div>

                {/* Email Skeleton */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  {loadingProfile ? (
                    <div className="h-10 bg-gray-200 animate-pulse rounded-md"></div>
                  ) : (
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  )}
                </div>

                {/* Save Profile Button */}
                <Button onClick={handleSaveProfile} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2 inline-block" />
                      Saving...
                    </>
                  ) : (
                    "Save Profile"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Here you can add skeletons if notification preferences are loaded via API */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-gray-500">Receive email updates for project changes</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>In-App Notifications</Label>
                    <p className="text-sm text-gray-500">Receive in-app alerts for collaborator actions</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="space-y-2">
                  <Label>Notification Frequency</Label>
                  <Select defaultValue="daily">
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instant">Instant</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button>Save Notification Settings</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>

  );
}
