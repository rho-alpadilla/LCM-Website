export async function startGivingCheckout(
  form: FormData,
  idempotencyKey: string,
) {
  const response = await fetch("/api/giving/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: form.get("amount"),
      purpose: form.get("purpose"),
      idempotencyKey,
      turnstileToken: form.get("cf-turnstile-response"),
    }),
  });
  const result = (await response.json()) as {
    checkoutUrl?: string;
    message?: string;
  };
  if (!response.ok || !result.checkoutUrl) {
    throw new Error(
      result.message || "The secure checkout could not be started.",
    );
  }
  return result.checkoutUrl;
}
