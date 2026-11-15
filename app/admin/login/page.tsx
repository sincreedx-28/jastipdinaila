"use client";

import Image from "next/image";
import { useActionState } from "react";
import { signIn } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
  const [state, action, pending] = useActionState(signIn, undefined);

  return (
    <div className="theme-admin flex min-h-screen items-center justify-center bg-secondary/50 p-4">
      <div className="box w-full max-w-sm space-y-5 p-6">
        <div className="space-y-2 text-center">
          <Image
            src="/logo-jastipdinaila-transparent.png"
            alt="jastipdinaila"
            width={160}
            height={64}
            className="mx-auto h-14 w-auto"
            priority
          />
          <h1 className="text-2xl">Kelola toko</h1>
          <p className="text-sm text-muted-foreground">Masuk dengan email &amp; password admin.</p>
        </div>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          {state?.error && <p className="soft-note text-destructive!">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Masuk..." : "Masuk"}
          </Button>
        </form>
      </div>
    </div>
  );
}
