import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "../../lib/api";
import { getActiveSite } from "../../lib/site";
import CaseReviewModal from "./CaseReviewModal";
import {
  PriorityTag,
  StatusBadge,
  WARDS,
  assessmentStatus,
  caseWard,
  fmtDateTime,
  reviewStatus,
} from "./ClinicianUi";

const PAGE_SIZE = 10;

export default function ClinicianCasesPage({
  title = "PostCareAI Clinician Portal",
  subtitle = "View and manage recent wound assessments",
}) {
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState({
    active_patients: 0,
    pending_reviews: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseDetail, setCaseDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [casesRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/clinician/cases`),
        fetch(`${API_BASE}/clinician/stats`),
      ]);
      if (casesRes.ok) setCases(await casesRes.json());
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats({
          active_patients: data.active_patients ?? 0,
          pending_reviews: data.pending_reviews ?? 0,
          completed: data.completed ?? 0,
        });
      }
    } catch (err) {
      console.error("ClinicianCasesPage: fetch failed —", err);
      if (!silent) setCases([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const onSiteChange = (e) => setSiteFilter(e.detail || getActiveSite());
    window.addEventListener("postcare-site-change", onSiteChange);
    return () => window.removeEventListener("postcare-site-change", onSiteChange);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sites = useMemo(() => ["all", ...WARDS], []);

  const filteredCases = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return cases
      .filter((row) => {
        const matchesSearch =
          !q ||
          [row.patient_name, row.procedure, row.consultant_surgeon, row.case_id]
            .join(" ")
            .toLowerCase()
            .includes(q);
        const matchesSite =
          siteFilter === "all" || caseWard(row.case_id) === siteFilter;
        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "pending" && row.status !== "reviewed") ||
          (statusFilter === "completed" && row.status === "reviewed");
        return matchesSearch && matchesSite && matchesStatus;
      })
      .sort((a, b) => {
        const reviewedA = a.status === "reviewed" ? 1 : 0;
        const reviewedB = b.status === "reviewed" ? 1 : 0;
        if (reviewedA !== reviewedB) return reviewedA - reviewedB;
        const priorityOrder = { high: 0, needs_review: 1, routine: 2 };
        const priorityDiff =
          (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
        if (priorityDiff !== 0) return priorityDiff;
        return (b.created_at || "").localeCompare(a.created_at || "");
      });
  }, [cases, searchQuery, siteFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCases.length / PAGE_SIZE));
  const pageCases = filteredCases.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, siteFilter, statusFilter]);

  const openReview = async (row) => {
    setSelectedCase(row);
    setCaseDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`${API_BASE}/clinician/cases/${row.case_id}`);
      if (res.ok) setCaseDetail(await res.json());
    } catch (err) {
      console.error("ClinicianCasesPage: case detail failed —", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeReview = () => {
    setSelectedCase(null);
    setCaseDetail(null);
  };

  const handleApprove = async (caseId) => {
    try {
      const res = await fetch(`${API_BASE}/clinician/cases/${caseId}/review`, { method: "POST" });
      if (!res.ok) throw new Error("Review request failed");

      setCases((prev) =>
        prev.map((c) => (c.case_id === caseId ? { ...c, status: "reviewed" } : c))
      );
      setStats((prev) => ({
        ...prev,
        pending_reviews: Math.max(0, prev.pending_reviews - 1),
        completed: prev.completed + 1,
      }));
      closeReview();
      fetchData({ silent: true });
    } catch (err) {
      console.error("ClinicianCasesPage: review failed —", err);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">{title}</h1>
          <p className="text-sm text-gray-400 mt-2">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/clinician/sites"
            className="px-4 py-2 rounded-lg border border-[#333333] text-sm font-medium text-gray-200 hover:bg-[#1a1a1a] transition-colors"
          >
            Care Sites
          </Link>
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Refresh Queue
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Cases This Month", value: stats.active_patients + stats.completed },
          { label: "Pending", value: stats.pending_reviews },
          { label: "Completed", value: stats.completed },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-[#161616] border border-[#2a2a2a] rounded-xl px-6 py-5"
          >
            <p className="text-sm text-gray-400">{card.label}</p>
            <p className="text-4xl font-semibold text-white mt-2">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#2a2a2a]">
          <h2 className="text-lg font-semibold text-white">Recent Assessments</h2>
        </div>

        <div className="px-6 py-4 border-b border-[#2a2a2a] flex flex-col xl:flex-row gap-3 xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patients..."
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg py-2.5 pl-10 pr-4 text-sm text-gray-100 placeholder:text-gray-500 outline-none focus:border-[#444444]"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg py-2.5 px-3 text-sm text-gray-200 outline-none"
            >
              {sites.map((site) => (
                <option key={site} value={site}>
                  {site === "all" ? "Ward" : site}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg py-2.5 px-3 text-sm text-gray-200 outline-none"
            >
              <option value="all">Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-[11px] uppercase tracking-wider text-gray-500">
                <th className="py-4 px-6 font-semibold">Time | Date</th>
                <th className="py-4 px-6 font-semibold">Patient</th>
                <th className="py-4 px-6 font-semibold">Procedure | Day</th>
                <th className="py-4 px-6 font-semibold">Ward</th>
                <th className="py-4 px-6 font-semibold">Priority</th>
                <th className="py-4 px-6 font-semibold">AI Assessment</th>
                <th className="py-4 px-6 font-semibold">Review Status</th>
                <th className="py-4 px-6 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 px-6 text-center text-sm text-gray-500">
                    Loading assessments…
                  </td>
                </tr>
              ) : pageCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 px-6 text-center text-sm text-gray-500">
                    No cases match your filters.
                  </td>
                </tr>
              ) : (
                pageCases.map((row) => {
                  const { time, date } = fmtDateTime(row.created_at);
                  const ai = assessmentStatus(row);
                  const review = reviewStatus(row);
                  return (
                    <tr key={row.case_id} className="hover:bg-[#1a1a1a] transition-colors">
                      <td className="py-4 px-6">
                        <div className="text-sm text-white font-medium">{time}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{date}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-white font-medium">{row.patient_name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{row.case_id}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-gray-200">{row.procedure}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Day {row.post_op_day}</div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-300">
                        {caseWard(row.case_id)}
                      </td>
                      <td className="py-4 px-6">
                        <PriorityTag priority={row.priority} status={row.status} pill />
                      </td>
                      <td className="py-4 px-6">
                        <StatusBadge label={ai.label} tone={ai.tone} />
                      </td>
                      <td className="py-4 px-6">
                        <StatusBadge label={review.label} tone={review.tone} />
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          {row.status !== "reviewed" ? (
                            <button
                              type="button"
                              onClick={() => openReview(row)}
                              className="px-4 py-1.5 rounded-md bg-white text-black text-xs font-semibold hover:bg-gray-100 transition-colors"
                            >
                              Finalize
                            </button>
                          ) : (
                            <span className="text-xs text-gray-500 font-medium">Done</span>
                          )}
                          <button
                            type="button"
                            onClick={() => openReview(row)}
                            className="p-2 rounded-md border border-[#2a2a2a] text-gray-400 hover:text-white hover:bg-[#222222] transition-colors"
                            aria-label="View case"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                          <button
                            type="button"
                            className="p-2 rounded-md border border-[#2a2a2a] text-gray-400 hover:text-white hover:bg-[#222222] transition-colors"
                            aria-label="Download report"
                          >
                            <span className="material-symbols-outlined text-[18px]">download</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-[#2a2a2a] flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-400">
          <span>Rows per page: {PAGE_SIZE}</span>
          <div className="flex items-center gap-4">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-md border border-[#2a2a2a] disabled:opacity-40 hover:bg-[#222222] transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-md border border-[#2a2a2a] disabled:opacity-40 hover:bg-[#222222] transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <CaseReviewModal
        selectedCase={selectedCase}
        caseDetail={caseDetail}
        detailLoading={detailLoading}
        onClose={closeReview}
        onApprove={handleApprove}
      />
    </div>
  );
}
