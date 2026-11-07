"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, History, UserRound } from "lucide-react";
import { logIn, signUp, useAccount } from "./account";
import { Intro, Screen, primaryBtn } from "./ui";

const field = "h-[52px] w-full rounded-[12px] border border-line bg-white px-4 text-[15px] text-ink placeholder:text-muted/70";

/** The Log in and Create account screens (Figma: Log in, Create account). */
export function AuthForm({ kind }: { kind: "login" | "signup" }) {
  const login = kind === "login";
  const router = useRouter();
  const account = useAccount();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [forgot, setForgot] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await (login ? logIn : signUp)(email, password);
    setBusy(false);
    if (!r.ok) return setError(r.error ?? "Something went wrong.");
    location.href = "/trips"; // full load, so every page reads the account's data
  };

  return (
    <Screen nav={false}>
      {login
        ? <Intro eyebrow="YOUR LISTS, READY WHEN YOU ARE" title="Welcome back." sub="Log in to see your saved trips and make your next grocery run a little easier." />
        : <Intro eyebrow="GOOD PLANS ARE WORTH KEEPING" title="Create your account." sub="Keep your grocery lists and trip history in one place. Just an email and password to start." />}

      {account && !account.configured && (
        <p role="alert" className="rounded-[12px] bg-amber-tint p-[14px] text-[13px] leading-[1.45]">
          Accounts aren’t switched on for this site yet. You can keep using BeeLow as a guest.
        </p>
      )}

      <form onSubmit={submit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-2 text-[15px] font-semibold">
          Email address
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={`${field} font-normal`} />
        </label>
        <div className="flex flex-col gap-2">
          <label htmlFor="pw" className="text-[15px] font-semibold">{login ? "Password" : "Create password"}</label>
          <div className="relative">
            <input id="pw" type={show ? "text" : "password"} required minLength={login ? undefined : 8} autoComplete={login ? "current-password" : "new-password"}
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder={login ? "Enter your password" : "Choose a password"}
              aria-describedby={login ? undefined : "pw-hint"} className={`${field} pr-14`} />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}
              className="absolute right-1.5 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-[10px] text-bee hover:bg-canvas">
              {show ? <EyeOff size={20} aria-hidden /> : <Eye size={20} aria-hidden />}
            </button>
          </div>
          {login ? (
            <button type="button" onClick={() => setForgot(!forgot)} className="self-end text-[14px] font-semibold text-bee">Forgot password?</button>
          ) : <p id="pw-hint" className="text-[13px] text-muted">Use at least 8 characters.</p>}
          {forgot && <p className="text-[13px] leading-[1.45] text-muted">Password reset by email isn’t available yet. Create a new account, or keep planning as a guest.</p>}
        </div>
        {error && <p role="alert" className="text-[13px] font-semibold text-carrot">{error}</p>}
        <button type="submit" disabled={busy || account?.configured === false} className={primaryBtn}>
          {busy ? (login ? "Logging in…" : "Creating your account…") : <>{login ? "Log in" : "Create account"} <ArrowRight size={18} aria-hidden /></>}
        </button>
      </form>

      {!login && <p className="text-center text-[13px] text-muted">By creating an account, you agree to keep it for planning only. No payment details are ever asked for.</p>}
      <p className="text-center text-[14px] text-muted">
        {login ? <>New to BeeLow? <Link href="/signup" className="font-bold text-bee no-underline">Create account</Link></>
          : <>Already have an account? <Link href="/login" className="font-bold text-bee no-underline">Log in</Link></>}
      </p>

      <div className="flex gap-3 rounded-[14px] bg-honey-tint p-[18px]">
        {login ? <UserRound size={20} className="mt-0.5 shrink-0 text-bee" aria-hidden /> : <History size={20} className="mt-0.5 shrink-0 text-bee" aria-hidden />}
        <div className="flex flex-col gap-1 leading-[1.45]">
          <p className="text-[15px] font-semibold">{login ? "Your account is for planning." : "A head start on your next list."}</p>
          <p className="text-[13px] text-muted">
            {login ? "Save lists and plans here. Checkout and payment stay with the store." : "Revisit saved plans and reuse groceries. No payment details needed to create an account."}
          </p>
        </div>
      </div>

      <div className="h-px bg-line" />
      <div className="flex flex-col items-center gap-3 text-center">
        <button type="button" onClick={() => router.push("/list")} className="flex items-center gap-2 text-[15px] font-semibold text-bee">
          Try as a guest <ArrowRight size={17} aria-hidden />
        </button>
        <p className="text-[13px] leading-[1.45] text-muted">
          Explore without an account. An account is needed to save trip history. Guest lists stay in this browser{login ? " and are replaced by your account’s list when you log in." : "; creating an account keeps them."}
        </p>
      </div>
    </Screen>
  );
}
