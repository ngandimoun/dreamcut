"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { memo, Suspense } from "react";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import SignUpWithGoogleButton from "@/components/auth/SignUpWithGoogleButton";

const SignUpPage = () => {
  const router = useRouter();

  return (
    <div className="flex h-screen items-center justify-center relative">
      <Button
        variant="text"
        onClick={() => router.back()}
        className="absolute top-6 left-6"
        type="button"
      >
        <ArrowLeft className="h-5 w-5" /> Back
      </Button>
      <Card className="w-[400px] shadow-lg border-0">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-semibold">
            Create your account
          </CardTitle>
          <CardDescription className="text-base">
            Get started with your free account today
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Suspense
            fallback={
              <div className="text-center">
                <Loader2 className="animate-spin" />
              </div>
            }
          >
            <div className="flex flex-col space-y-6">
              <SignUpWithGoogleButton />
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                For now, we only support Google Sign-Up. 
                Email/password registration will be available soon.
              </div>
            </div>
            <div className="mt-6 text-center text-sm">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </div>
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
};

export default memo(SignUpPage);
