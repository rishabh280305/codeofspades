import { connectToDatabase } from "@/lib/db";
import { requireRole } from "@/lib/server-auth";
import { NotificationModel } from "@/models/Notification";
import {
  approveRescheduleRequestAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/dashboard/receptionist/actions";

export default async function ReceptionistNotificationsPage() {
  const session = await requireRole("RECEPTIONIST");
  await connectToDatabase();

  const notifications = (await NotificationModel.find({
    clinicId: session.user.clinicId,
    recipientRole: "RECEPTIONIST",
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean()) as Array<Record<string, any>>;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <section className="space-y-4">
      <div className="border-2 border-black bg-white p-4 shadow-[6px_6px_0_0_#000]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-black">Notifications</h2>
          <div className="flex items-center gap-2">
            <span className="border border-black bg-yellow-100 px-2 py-1 text-xs font-bold">
              Unread: {unreadCount}
            </span>
            <form action={markAllNotificationsReadAction}>
              <button className="border-2 border-black bg-white px-3 py-2 text-sm font-semibold">
                Mark all as read
              </button>
            </form>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {notifications.length === 0 ? (
            <p className="text-sm">No notifications yet.</p>
          ) : null}

          {notifications.map((notification) => (
            <article
              key={String(notification._id)}
              className={`border-2 border-black p-3 ${notification.isRead ? "bg-[var(--panel)]" : "bg-yellow-50"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{notification.title}</p>
                <span className="text-xs text-zinc-500">
                  {new Date(notification.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-sm">{notification.message}</p>

              {notification.type === "RESCHEDULE_REQUEST" && notification.appointmentId ? (
                <form action={approveRescheduleRequestAction} className="mt-3">
                  <input type="hidden" name="appointmentId" value={String(notification.appointmentId)} />
                  <button className="border-2 border-black bg-[#e8f8e8] px-3 py-1 text-xs font-semibold shadow-[2px_2px_0_0_#000]">
                    Approve Reschedule
                  </button>
                </form>
              ) : null}

              {!notification.isRead ? (
                <form action={markNotificationReadAction} className="mt-3">
                  <input type="hidden" name="notificationId" value={String(notification._id)} />
                  <button className="border-2 border-black bg-white px-3 py-1 text-xs font-semibold">
                    Mark as read
                  </button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
