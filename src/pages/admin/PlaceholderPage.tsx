import { useI18nContext } from "@/i18n/I18nContext";
import { motion } from "framer-motion";
import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
}

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  const { lang } = useI18nContext();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20"
    >
      <div className="w-20 h-20 rounded-full bg-[#F5F0E8] flex items-center justify-center mb-4">
        <Construction size={32} className="text-[#C75C2E]" />
      </div>
      <h2 className="text-xl font-bold text-[#2D2420]">{title}</h2>
      <p className="text-[#8B7A6E] mt-2 text-center max-w-md">
        {lang === "ar"
          ? "هذه الميزة قيد التطوير. سيتم إطلاقها قريباً."
          : "This feature is under development. Coming soon."}
      </p>
    </motion.div>
  );
}
