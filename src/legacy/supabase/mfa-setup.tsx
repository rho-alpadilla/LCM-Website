"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createBrowserSupabaseClient } from "@/legacy/supabase/browser";

type Enrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

type MfaSetupProps = {
  activateInvitation?: boolean;
  afterVerificationPath: "/admin" | "/admin/bootstrap";
};

export function MfaSetup({
  activateInvitation = false,
  afterVerificationPath,
}: MfaSetupProps) {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string>();
  const [enrollment, setEnrollment] = useState<Enrollment>();
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    async function loadFactors() {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.auth.mfa.listFactors();

      if (error) {
        setErrorMessage("We could not load your security setup. Please retry.");
        return;
      }

      const totpFactors = data.totp as Array<{ id: string; status: string }>;
      const verifiedFactor = totpFactors.find(
        (factor) => factor.status === "verified",
      );
      if (verifiedFactor) setFactorId(verifiedFactor.id);
    }

    void loadFactors();
  }, []);

  async function beginEnrollment() {
    setIsBusy(true);
    setErrorMessage(undefined);
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Lifechangers Admin",
    });

    if (error) {
      setErrorMessage("Authenticator setup could not be started.");
    } else {
      setFactorId(data.id);
      setEnrollment({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
    }
    setIsBusy(false);
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factorId || !/^\d{6}$/.test(code)) {
      setErrorMessage("Enter the six-digit code from your authenticator app.");
      return;
    }

    setIsBusy(true);
    setErrorMessage(undefined);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    if (error) {
      setErrorMessage(
        "That code was not accepted. Wait for a new code and retry.",
      );
      setIsBusy(false);
      return;
    }

    if (activateInvitation) {
      const { error: activationError } = await supabase.rpc(
        "activate_invited_staff_account",
      );
      if (activationError) {
        setErrorMessage(
          "Your account could not be activated. Please contact an administrator.",
        );
        setIsBusy(false);
        return;
      }
    }

    router.replace(afterVerificationPath);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {!factorId ? (
        <button
          className="w-full rounded-xl bg-blue-800 px-5 py-3 font-bold text-white disabled:opacity-60"
          disabled={isBusy}
          onClick={beginEnrollment}
          type="button"
        >
          Set up authenticator app
        </button>
      ) : null}

      {enrollment ? (
        <div className="rounded-2xl border border-slate-200 p-5">
          <p className="font-bold text-slate-950">Scan this QR code</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Use Google Authenticator, Microsoft Authenticator, Authy, or another
            compatible app.
          </p>
          <Image
            alt="Authenticator enrollment QR code"
            className="mx-auto mt-4"
            height={240}
            src={enrollment.qrCode}
            unoptimized
            width={240}
          />
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-semibold">
              Enter a setup key instead
            </summary>
            <code className="mt-2 block rounded-lg bg-slate-100 p-3 break-all">
              {enrollment.secret}
            </code>
          </details>
        </div>
      ) : null}

      {factorId ? (
        <form className="space-y-4" onSubmit={verifyCode}>
          <label
            className="block font-semibold text-slate-900"
            htmlFor="mfa-code"
          >
            Six-digit security code
          </label>
          <input
            autoComplete="one-time-code"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg tracking-[0.3em]"
            id="mfa-code"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
            pattern="[0-9]{6}"
            required
            value={code}
          />
          <button
            className="w-full rounded-xl bg-blue-800 px-5 py-3 font-bold text-white disabled:opacity-60"
            disabled={isBusy}
            type="submit"
          >
            Verify and continue
          </button>
        </form>
      ) : null}

      {errorMessage ? (
        <p
          className="rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-800"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
