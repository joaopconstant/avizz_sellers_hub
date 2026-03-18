"use client";

import { FormModal } from "@/components/shared/FormModal";
import { AdvanceForm } from "./advance-form";

type ExistingAdvance = {
  id: string;
  lead_name: string;
  company_name: string;
  estimated_value: number;
  deadline: string | null;
  lead_score: number;
  status_flags: string[];
  sdr_id?: string | null;
};

interface AdvanceModalProps {
  open: boolean;
  onClose: () => void;
  report_id?: string;
  existing?: ExistingAdvance | null;
}

export function AdvanceModal({ open, onClose, report_id, existing }: AdvanceModalProps) {
  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={existing ? "Editar Avanço" : "Novo Avanço"}
      subtitle="Registre um lead em negociação."
      maxWidth="max-w-lg"
    >
      <AdvanceForm
        report_id={report_id}
        existingAdvance={existing}
        onSuccess={onClose}
        onCancel={onClose}
      />
    </FormModal>
  );
}
