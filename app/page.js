"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirected.current) return;
    hasRedirected.current = true;

    const user = localStorage.getItem("user");
    if (user) {
      const parsed = JSON.parse(user);
      router.replace(parsed.role === "admin" ? "/admin" : "/dashboard");
    } else {
      router.replace("/login");
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );
}
