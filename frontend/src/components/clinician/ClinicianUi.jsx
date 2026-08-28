export { WARDS, caseWard } from "../../lib/site";

export function isReviewed(row) {
  return row?.status === "reviewed";
}

export function PriorityTag({ priority, status, pill = false }) {
  if (isReviewed({ status })) {
    return (
      <span
        className={
          pill
            ? "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-500/10 border border-gray-500/20 text-gray-400 text-[10px] uppercase font-bold tracking-wider"
            : "inline-flex items-center gap-1.5 text-gray-400 text-xs font-medium"
        }
      >
        <span className="w-2 h-2 rounded-full bg-gray-500" />
        Reviewed
      </span>
    );
  }

  const key = (priority || "routine").toLowerCase();

  if (key === "high") {
    return (
      <span
        className={
          pill
            ? "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] uppercase font-bold tracking-wider"
            : "inline-flex items-center gap-1.5 text-red-400 text-xs font-medium"
        }
      >
        <span className={`w-2 h-2 rounded-full bg-red-500 ${pill ? "animate-pulse" : ""}`} />
        Urgent
      </span>
    );
  }

  if (key === "needs_review") {
    return (
      <span
        className={
          pill
            ? "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] uppercase font-bold tracking-wider"
            : "inline-flex items-center gap-1.5 text-amber-400 text-xs font-medium"
        }
      >
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        Review
      </span>
    );
  }

  return (
    <span
      className={
        pill
          ? "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] uppercase font-bold tracking-wider"
          : "inline-flex items-center gap-1.5 text-emerald-400 text-xs font-medium"
      }
    >
      <span className="w-2 h-2 rounded-full bg-emerald-400" />
      Routine
    </span>
  );
}

export function StatusBadge({ label, tone = "neutral" }) {
  const tones = {
    success: "text-emerald-400",
    warning: "text-amber-400",
    info: "text-violet-400",
    accent: "text-orange-400",
    neutral: "text-gray-400",
  };
  const dots = {
    success: "bg-emerald-400",
    warning: "bg-amber-400",
    info: "bg-violet-400",
    accent: "bg-orange-400",
    neutral: "bg-gray-400",
  };

  return (
    <span className={`inline-flex items-center gap-2 text-xs font-medium ${tones[tone] || tones.neutral}`}>
      <span className={`w-2 h-2 rounded-full ${dots[tone] || dots.neutral}`} />
      {label}
    </span>
  );
}

export function fmtDateTime(iso) {
  if (!iso) return { time: "—", date: "—" };
  const d = new Date(iso);
  return {
    time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
    date: d.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" }),
  };
}

export function assessmentStatus(row) {
  if (isReviewed(row)) {
    return { label: "Reviewed", tone: "success" };
  }
  if (row.status === "awaiting_review") {
    return { label: "Assessed", tone: "info" };
  }
  if (row.status === "submitted") {
    return { label: "Submitted", tone: "warning" };
  }
  return { label: "Assessed", tone: "info" };
}

export function reviewStatus(row) {
  if (isReviewed(row)) {
    return { label: "Reviewed", tone: "success" };
  }
  if (row.status === "awaiting_review") {
    return { label: "Pending", tone: "warning" };
  }
  if (row.priority === "high") {
    return { label: "Push to Review", tone: "accent" };
  }
  return { label: "Awaiting Review", tone: "info" };
}
