import { useI18nContext } from "@/i18n/I18nContext";

const statusColors: Record<string, string> = {
  new: "bg-[#C75C2E] text-white",
  accepted: "bg-[#D4A017] text-[#2D2420]",
  preparing: "bg-[#D4A017] text-[#2D2420]",
  ready: "bg-[#4A7FB5] text-white",
  out_for_delivery: "bg-[#6B7F3E] text-white",
  on_the_way: "bg-[#6B7F3E] text-white",
  delivered: "bg-[#6B7F3E] text-white",
  completed: "bg-[#6B7F3E] text-white",
  cancelled: "bg-[#C0392B] text-white",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const { t } = useI18nContext();
  const colorClass = statusColors[status] || "bg-gray-400 text-white";
  const label = (t as any)[`status_${status}`] || status;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
}
