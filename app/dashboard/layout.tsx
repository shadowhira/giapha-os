import DashboardHeader from "@/components/DashboardHeader";
import Footer from "@/components/Footer";
import { UserProvider } from "@/components/UserProvider";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import React from "react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <UserProvider user={session.user}>
      <div className="min-h-screen bg-neutral text-primary flex flex-col font-sans">
        <DashboardHeader />
        {children}
        <Footer
          className="mt-auto bg-white border-t border-stone-200"
          showDisclaimer={true}
        />
      </div>
    </UserProvider>
  );
}
