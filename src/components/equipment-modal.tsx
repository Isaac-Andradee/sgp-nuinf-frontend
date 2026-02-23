import { useState, useEffect } from "react";
import { X, Wifi, Tag } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { equipmentApi } from "../api/equipment.api";
import type { EquipmentResponseDTO, SectorResponseDTO, EquipmentType, EquipmentStatus, CreateEquipmentDTO } from "../types";
import {
  EQUIPMENT_TYPE_LABELS,
  EQUIPMENT_STATUS_LABELS,
  shouldShowUserField,
} from "../types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  equipment: EquipmentResponseDTO | null;
  sectors: SectorResponseDTO[];
}

const EQUIPMENT_TYPES: EquipmentType[] = ["DESKTOP", "MONITOR", "TECLADO", "MOUSE", "LAPTOP", "IMPRESSORA", "ROTEADOR", "SWITCH", "SERVIDOR"];
const EQUIPMENT_STATUSES: EquipmentStatus[] = ["DISPONIVEL", "INDISPONIVEL", "PROVISORIO", "EM_USO", "MANUTENCAO", "BAIXADO"];

type FormState = {
  assetNumber: string;
  serialNumber: string;
  brand: string;
  description: string;
  type: EquipmentType;
  status: EquipmentStatus;
  sectorId: string;
  equipmentUser: string;
  hostname: string;
  ipAddress: string;
};

const emptyForm: FormState = {
  assetNumber: "",
  serialNumber: "",
  brand: "",
  description: "",
  type: "DESKTOP",
  status: "DISPONIVEL",
  sectorId: "",
  equipmentUser: "",
  hostname: "",
  ipAddress: "",
};

export function EquipmentModal({ open, onClose, onSaved, equipment, sectors }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [noAsset, setNoAsset] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (equipment) {
      setForm({
        assetNumber: equipment.assetNumber.startsWith("PROV-") ? "" : equipment.assetNumber,
        serialNumber: equipment.serialNumber ?? "",
        brand: equipment.brand,
        description: equipment.description ?? "",
        type: equipment.type,
        status: equipment.status,
        sectorId: equipment.currentSector.id,
        equipmentUser: equipment.equipmentUser ?? "",
        hostname: equipment.hostname ?? "",
        ipAddress: equipment.ipAddress ?? "",
      });
      setNoAsset(equipment.assetNumber.startsWith("PROV-"));
    } else {
      setForm({ ...emptyForm, sectorId: sectors[0]?.id ?? "" });
      setNoAsset(false);
    }
    setErrors({});
  }, [equipment, open, sectors]);

  const handleChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateEquipmentDTO) => equipmentApi.create(data),
    onSuccess: () => {
      toast.success("Equipamento cadastrado com sucesso.");
      onSaved();
    },
    onError: (err: unknown) => {
      const axErr = err as { response?: { data?: { message?: string; validationErrors?: Record<string, string> } } };
      const valErrors = axErr?.response?.data?.validationErrors;
      if (valErrors) setErrors(valErrors);
      else toast.error(axErr?.response?.data?.message ?? "Erro ao cadastrar equipamento.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateEquipmentDTO }) =>
      equipmentApi.update(id, data),
    onSuccess: () => {
      toast.success("Equipamento atualizado com sucesso.");
      onSaved();
    },
    onError: (err: unknown) => {
      const axErr = err as { response?: { data?: { message?: string; validationErrors?: Record<string, string> } } };
      const valErrors = axErr?.response?.data?.validationErrors;
      if (valErrors) setErrors(valErrors);
      else toast.error(axErr?.response?.data?.message ?? "Erro ao atualizar equipamento.");
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!noAsset && !form.assetNumber.trim()) e.assetNumber = "Patrimônio obrigatório (ou marque 'Sem etiqueta')";
    if (!form.brand.trim()) e.brand = "Marca obrigatória";
    if (!form.sectorId) e.sectorId = "Setor obrigatório";
    if (form.ipAddress && !/^(\d{1,3}\.){3}\d{1,3}$/.test(form.ipAddress))
      e.ipAddress = "Endereço IP inválido";
    if (form.hostname && /[^a-zA-Z0-9.-]/.test(form.hostname))
      e.hostname = "Hostname inválido (apenas letras, números, ponto e hífen)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const payload: CreateEquipmentDTO = {
      assetNumber: noAsset ? "TEMP-" : form.assetNumber.trim(),
      serialNumber: form.serialNumber.trim() || undefined,
      brand: form.brand.trim(),
      description: form.description.trim() || undefined,
      type: form.type,
      status: form.status,
      sectorId: form.sectorId,
      equipmentUser: shouldShowUserField(form.status)
        ? form.equipmentUser.trim() || undefined
        : undefined,
      hostname: form.hostname.trim() || undefined,
      ipAddress: form.ipAddress.trim() || undefined,
    };

    if (equipment) {
      updateMutation.mutate({ id: equipment.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (!open) return null;

  const isEditing = !!equipment;
  const showUser = shouldShowUserField(form.status);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#0c4a6e] px-6 py-4 flex justify-between items-center">
          <h3 className="text-white text-[16px]" style={{ fontWeight: 600 }}>
            {isEditing ? "Editar Equipamento" : "Novo Equipamento"}
          </h3>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* No asset tag */}
          <label className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 cursor-pointer hover:bg-amber-50/80 transition-colors">
            <input
              type="checkbox"
              checked={noAsset}
              onChange={(e) => setNoAsset(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
            />
            <div>
              <span className="text-[13px] text-amber-800" style={{ fontWeight: 600 }}>
                Item sem etiqueta patrimonial?
              </span>
              <p className="text-[11px] text-amber-600 mt-0.5">
                Voce pode definir o status do equipamento abaixo.
              </p>
            </div>
          </label>

          {/* Patrimônio & Serial */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-gray-400 mb-1.5" style={{ fontWeight: 600 }}>
                <Tag className="w-3 h-3 inline mr-1" />
                Patrimonio
              </label>
              <input
                value={form.assetNumber}
                onChange={(e) => handleChange("assetNumber", e.target.value)}
                disabled={noAsset}
                placeholder={noAsset ? "Sem etiqueta" : "TI-2024-XXX"}
                className={`w-full px-3 py-2.5 border rounded-lg focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 outline-none text-[13px] transition-all disabled:bg-gray-100 disabled:text-gray-400 ${errors.assetNumber ? "border-red-400" : "border-gray-200"}`}
              />
              {errors.assetNumber && <p className="text-[11px] text-red-500 mt-1">{errors.assetNumber}</p>}
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1.5" style={{ fontWeight: 600 }}>
                Serial Number
              </label>
              <input
                value={form.serialNumber}
                onChange={(e) => handleChange("serialNumber", e.target.value)}
                placeholder="SN-XXXX-XXXX"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 outline-none text-[13px] transition-all"
              />
            </div>
          </div>

          {/* Marca */}
          <div>
            <label className="block text-[11px] text-gray-400 mb-1.5" style={{ fontWeight: 600 }}>
              Marca
            </label>
            <input
              value={form.brand}
              onChange={(e) => handleChange("brand", e.target.value)}
              placeholder="Ex: Dell, Lenovo, HP..."
              className={`w-full px-3 py-2.5 border rounded-lg focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 outline-none text-[13px] transition-all ${errors.brand ? "border-red-400" : "border-gray-200"}`}
            />
            {errors.brand && <p className="text-[11px] text-red-500 mt-1">{errors.brand}</p>}
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-[11px] text-gray-400 mb-1.5" style={{ fontWeight: 600 }}>
              Descricao Detalhada
            </label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={3}
              placeholder="Especificacoes do equipamento..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 outline-none text-[13px] resize-none transition-all"
            />
          </div>

          {/* Tipo & Setor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-gray-400 mb-1.5" style={{ fontWeight: 600 }}>
                Tipo de Equipamento
              </label>
              <select
                value={form.type}
                onChange={(e) => handleChange("type", e.target.value as EquipmentType)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:border-sky-400 text-[13px] outline-none bg-white"
              >
                {EQUIPMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{EQUIPMENT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1.5" style={{ fontWeight: 600 }}>
                Setor
              </label>
              <select
                value={form.sectorId}
                onChange={(e) => handleChange("sectorId", e.target.value)}
                className={`w-full px-3 py-2.5 border rounded-lg focus:border-sky-400 text-[13px] outline-none bg-white ${errors.sectorId ? "border-red-400" : "border-gray-200"}`}
              >
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.acronym} - {s.fullName}
                  </option>
                ))}
              </select>
              {errors.sectorId && <p className="text-[11px] text-red-500 mt-1">{errors.sectorId}</p>}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] text-gray-400 mb-1.5" style={{ fontWeight: 600 }}>
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value as EquipmentStatus)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:border-sky-400 text-[13px] outline-none bg-white"
            >
              {EQUIPMENT_STATUSES.map((s) => (
                <option key={s} value={s}>{EQUIPMENT_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {/* Responsável */}
          {showUser && (
            <div>
              <label className="block text-[11px] text-gray-400 mb-1.5" style={{ fontWeight: 600 }}>
                Responsavel
              </label>
              <input
                value={form.equipmentUser}
                onChange={(e) => handleChange("equipmentUser", e.target.value)}
                placeholder="Nome do responsavel..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 outline-none text-[13px] transition-all"
              />
            </div>
          )}

          {/* Rede */}
          <div className="bg-sky-50 p-4 rounded-xl border border-sky-100">
            <p className="text-[11px] text-sky-700 uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ fontWeight: 700 }}>
              <Wifi className="w-3.5 h-3.5" />
              Informacoes de Rede (Opcional)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <input
                  value={form.hostname}
                  onChange={(e) => handleChange("hostname", e.target.value)}
                  placeholder="Hostname"
                  className={`w-full px-3 py-2.5 border rounded-lg outline-none text-[13px] focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 bg-white transition-all ${errors.hostname ? "border-red-400" : "border-sky-200"}`}
                />
                {errors.hostname && <p className="text-[11px] text-red-500 mt-1">{errors.hostname}</p>}
              </div>
              <div>
                <input
                  value={form.ipAddress}
                  onChange={(e) => handleChange("ipAddress", e.target.value)}
                  placeholder="Endereco IP (ex: 192.168.1.10)"
                  className={`w-full px-3 py-2.5 border rounded-lg outline-none text-[13px] focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 bg-white transition-all ${errors.ipAddress ? "border-red-400" : "border-sky-200"}`}
                />
                {errors.ipAddress && <p className="text-[11px] text-red-500 mt-1">{errors.ipAddress}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-5 py-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg text-[13px] transition-colors"
            style={{ fontWeight: 500 }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-5 py-2.5 bg-primary hover:bg-[#075985] text-white rounded-lg text-[13px] shadow-sm transition-all flex items-center gap-2 disabled:opacity-60"
            style={{ fontWeight: 600 }}
          >
            {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {isEditing ? "Salvar Alteracoes" : "Cadastrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
