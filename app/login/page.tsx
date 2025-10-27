"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "next-auth/react";

import Link from "next/link";

interface LoginForm {
  email: string;
  password: string;
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error);
        return;
      }

      // Optionally save JWT for future requests
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      alert("Login successful!");
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Login failed:", err);
      alert("Something went wrong");
    }
  };

  const handleGoogleLogin = async () => {
    await signIn("google", { callbackUrl: "/dashboard" }); // Redirects to homepage
  };

  const handleGithubLogin = async () => {
    await signIn("github", { callbackUrl: "/dashboard" });
  };

  return (
    <Card className="w-full max-w-sm sm:max-w-lg md:max-w-xl lg:max-w-sm mx-auto shadow-lg p-4">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
        <CardDescription>Login to your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Your password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full">
            Log In
          </Button>
        </form>

        <div className="flex items-center my-6">
          <hr className="flex-grow border-t border-gray-300" />
          <span className="mx-3 text-muted-foreground whitespace-nowrap">
            Or continue with
          </span>
          <hr className="flex-grow border-t border-gray-300" />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            variant="outline"
            className="flex-1 flex items-center justify-center gap-2"
            onClick={handleGoogleLogin}
            aria-label="Login with Google"
          >
            {/* Google Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 533.5 544.3"
              className="h-5 w-5"
              fill="currentColor"
            >
              <path d="M533.5 278.4c0-17.8-1.6-35-4.7-51.8H272.1v98h147.6c-6.4 34.8-26 64.4-55.7 84.1v69h89.8c52.5-48.3 82.7-119.5 82.7-199.3z" />
              <path d="M272.1 544.3c75.2 0 138.5-24.9 184.7-67.5l-89.8-69c-24.9 16.8-56.7 26.7-94.9 26.7-72.9 0-134.7-49.2-156.8-115.2h-92.6v72.2c46.3 90.5 141.1 153.8 249.4 153.8z" />
              <path d="M115.3 317.2c-10.2-30.8-10.2-64 0-94.8v-72.2H22.7c-41.2 81.7-41.2 178.6 0 260.3l92.6-72.2z" />
              <path d="M272.1 107.7c39.5-.6 77.4 14 106.3 40.4l79.6-79.6C408.7 24.4 344.4 0 272.1 0 164 0 69.2 63.3 22.9 153.8l92.4 72.2c22.4-66.1 84.3-115.6 156.8-118.3z" />
            </svg>
            Google
          </Button>

          <Button
            variant="outline"
            className="flex-1 flex items-center justify-center gap-2"
            onClick={handleGithubLogin}
            aria-label="Login with GitHub"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="currentColor"
            >
              <path d="M12 0C5.372 0 0 5.372 0 12c0 5.303 3.438 9.8 8.205 11.387.6.11.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.09-.745.083-.73.083-.73 1.205.084 1.84 1.236 1.84 1.236 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.76-1.605-2.665-.304-5.467-1.332-5.467-5.932 0-1.31.468-2.382 1.236-3.222-.124-.303-.536-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.5 11.5 0 0 1 3-.404c1.02.005 2.047.138 3 .404 2.29-1.552 3.297-1.23 3.297-1.23.655 1.653.244 2.873.12 3.176.77.84 1.235 1.912 1.235 3.222 0 4.61-2.807 5.625-5.48 5.922.43.372.823 1.104.823 2.227 0 1.606-.015 2.896-.015 3.287 0 .32.217.694.825.576C20.565 21.796 24 17.298 24 12c0-6.628-5.373-12-12-12z" />
            </svg>
            GitHub
          </Button>
        </div>
        <div className="mx-auto w-[80%] my-2 text-muted-foreground">
          Don't have an account?
          <Link href="/signup" className="px-2 underline text-primary">
            Sign Up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default LoginForm;
