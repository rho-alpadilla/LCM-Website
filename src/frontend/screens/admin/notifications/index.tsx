import Link from "next/link";
import type { Route } from "next";

import { markAdminNotificationReadAction } from "@/backend/actions/admin-notifications";
import { getAdminNotificationWorkspace } from "@/backend/queries/admin/notifications";
import { AdminHeader } from "@/frontend/components/admin/admin-header";

export default async function NotificationsPage() {
  const { context, notifications } = await getAdminNotificationWorkspace();

  return (
    <div className="min-h-screen bg-slate-100 lg:pl-72">
      <AdminHeader
        context={context}
        notifications={{
          unreadCount: notifications.filter(
            (notification) => !notification.readAt,
          ).length,
          notifications: notifications.slice(0, 5),
        }}
      />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <p className="text-sm font-bold tracking-[0.2em] text-blue-800 uppercase">
          Administration
        </p>
        <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">
          Notifications
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">
          Operational updates only. Sensitive prayer and visitor details are
          never shown in this list.
        </p>
        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {notifications.length ? (
            <ul className="divide-y divide-slate-100">
              {notifications.map((notification) => (
                <li
                  className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between ${
                    notification.readAt ? "" : "bg-blue-50/50"
                  }`}
                  key={notification.id}
                >
                  <div>
                    <p className="font-black text-slate-950">
                      {notification.title}
                    </p>
                    {notification.body ? (
                      <p className="mt-1 max-w-xl leading-6 text-slate-600">
                        {notification.body}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm text-slate-500">
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Link
                      className="font-bold text-blue-800 hover:text-blue-950"
                      href={notification.href as Route}
                    >
                      Open
                    </Link>
                    {!notification.readAt ? (
                      <form action={markAdminNotificationReadAction}>
                        <input
                          name="notificationId"
                          type="hidden"
                          value={notification.id}
                        />
                        <button
                          className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-800"
                          type="submit"
                        >
                          Mark read
                        </button>
                      </form>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-8 text-slate-600">No notifications yet.</p>
          )}
        </section>
      </main>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}
