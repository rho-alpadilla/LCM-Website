import { AuthCard } from "@/frontend/components/admin/auth-card";
import { logoutAction } from "@/backend/actions/auth";

export default function AccessDeniedPage() {
  return (
    <AuthCard
      description="Your account is not active or does not have permission to open this area. Ask the System Administrator if you believe this is a mistake."
      eyebrow="Access restricted"
      title="You cannot open this page"
    >
      <form action={logoutAction}>
        <button
          className="w-full rounded-xl bg-blue-800 px-5 py-3 font-bold text-white"
          type="submit"
        >
          Sign out
        </button>
      </form>
    </AuthCard>
  );
}
