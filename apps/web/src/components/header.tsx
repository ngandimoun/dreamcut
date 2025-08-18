"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
import { HeaderBase } from "./header-base";
import Image from "next/image";
import { useSupabaseAuth } from "@/hooks/auth/useSupabaseAuth";
import UserProfile from "./auth/UserProfile";

export function Header() {
  const { isAuthenticated, loading } = useSupabaseAuth();

  const leftContent = (
    <Link href="/" className="flex items-center gap-3">
      <Image
        src="/logo.svg"
        alt="OpenCut Logo"
        className="invert dark:invert-0"
        width={32}
        height={32}
      />
      <span className="text-xl font-medium hidden md:block">OpenCut</span>
    </Link>
  );

  const rightContent = (
    <nav className="flex items-center gap-1">
      <div className="flex items-center gap-4">
        <Link href="/blog">
          <Button variant="text" className="text-sm p-0" type="button">
            Blog
          </Button>
        </Link>
        <Link href="/contributors">
          <Button variant="text" className="text-sm p-0" type="button">
            Contributors
          </Button>
        </Link>
      </div>
      
      {!loading && (
        <>
          {isAuthenticated ? (
            <UserProfile />
          ) : (
            <Link href="/login">
              <Button size="sm" className="text-sm ml-4" type="button">
                Sign In
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </>
      )}
    </nav>
  );

  return (
    <div className="sticky top-4 z-50 mx-4 md:mx-0">
      <HeaderBase
        className="bg-background border rounded-2xl max-w-3xl mx-auto mt-4 pl-4 pr-[14px]"
        leftContent={leftContent}
        rightContent={rightContent}
      />
    </div>
  );
}
