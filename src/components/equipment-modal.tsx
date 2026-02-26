import { useState, useEffect } from "react";
import { X, Wifi, Tag } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { equipmentApi } from "../api/equipment.api";
import type { EquipmentResponseDTO, SectorResponseDTO, EquipmentType, EquipmentStatus, CreateEquipmentDTO } from "../types";
import {
  EQUIPMENT_TYPE_LABELS,
  EQUIPMENT_STATUS_LABELS,
  shouldShowUserField,
  isEquipmentWithoutAsset,
} from "../types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  equipment: EquipmentResponseDTO | null;
  sectors: SectorResponseDTO[];
}

const EQUIPMENT_TYPES: EquipmentType[] = ["PC", "MONITOR", "TECLADO", "MOUSE", "NOTEBOOK", "IMPRESSORA", "ROTEADOR", "SWITCH", "SERVIDOR", "ESTABILIZADOR", "OUTROS"];
const EQUIPMENT_STATUSES: EquipmentStatus[] = ["DISPONIVEL", "INDISPONIVEL", "PROVISORIO", "EM_USO", "MANUTENCAO", "BAIXADO", "EXCLUIDO"];

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
  networkMode: "" | "DHCP" | "FIXO";
};

const emptyForm: FormState = {
  assetNumber: "",
  serialNumber: "",
  brand: "",
  description: "",
  type: "PC",
  status: "DISPONIVEL",
  sectorId: "",
  equipmentUser: "",
  hostname: "",
  ipAddress: "",
  networkMode: "",
};

export function EquipmentModal({ open, onClose, onSaved, equipment, sectors }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [noAsset, setNoAsset] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [assetInputValue, setAssetInputValue] = useState("");

  // Opcional: carregar marcas a partir do backend, caso o endpoint exista.
  const { data: brands } = useQuery({
    queryKey: ["equipment-brands"],
    queryFn: async () => {
      // Backend deve expor GET /equipments/brands retornando string[]
      const response = await equipmentApi.getBrands?.();
      return response ?? [];
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (equipment) {
      const ip = equipment.ipAddress ?? "";
      let networkMode: FormState["networkMode"] = "";
      let ipValue = "";

      if (ip === "DHCP") {
        networkMode = "DHCP";
        ipValue = "DHCP";
      } else if (ip.startsWith("10.190.110.")) {
        networkMode = "FIXO";
        // Extrai apenas os últimos dígitos após "10.190.110."
        ipValue = ip.replace("10.190.110.", "");
      } else if (ip) {
        // IP customizado (não DHCP nem rede fixa)
        networkMode = "";
        ipValue = ip;
      }

      const assetNum = isEquipmentWithoutAsset(equipment.assetNumber, equipment.id) ? "" : equipment.assetNumber;
      setForm({
        assetNumber: assetNum,
        serialNumber: equipment.serialNumber ?? "",
        brand: equipment.brand,
        description: equipment.description ?? "",
        type: equipment.type,
        status: equipment.status,
        sectorId: equipment.currentSector.id,
        equipmentUser: equipment.equipmentUser ?? "",
        hostname: equipment.hostname ?? "",
        ipAddress: ipValue ?? "",
        networkMode: networkMode ?? "",
      });
      setNoAsset(isEquipmentWithoutAsset(equipment.assetNumber, equipment.id));
      setAssetInputValue(assetNum.replace(/\D/g, ""));
    } else {
      setForm({ ...emptyForm, sectorId: sectors[0]?.id ?? "" });
      setNoAsset(false);
      setAssetInputValue("");
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
    if (!noAsset) {
      const digitsOnly = form.assetNumber.replace(/\D/g, "");
      if (!digitsOnly) {
        e.assetNumber = "Patrimônio obrigatório (ou marque 'Sem etiqueta')";
      } else if (digitsOnly.length > 7) {
        e.assetNumber = "Patrimônio deve ter no máximo 7 dígitos";
      }
    }
    if (!form.brand.trim()) e.brand = "Marca obrigatória";
    if (!form.sectorId) e.sectorId = "Setor obrigatório";
    if (form.networkMode === "FIXO" && form.ipAddress) {
      const ipValue = form.ipAddress.trim();
      if (!ipValue) {
        e.ipAddress = "Digite os últimos dígitos do IP (ex: 10, 100, 255)";
      } else if (!/^\d{1,3}$/.test(ipValue)) {
        e.ipAddress = "Digite apenas números (1 a 3 dígitos)";
      } else {
        const num = parseInt(ipValue, 10);
        if (num < 1 || num > 255) {
          e.ipAddress = "O valor deve estar entre 1 e 255";
        }
      }
    }
    if (form.hostname && /[^a-zA-Z0-9.-]/.test(form.hostname))
      e.hostname = "Hostname inválido (apenas letras, números, ponto e hífen)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    // Normaliza patrimônio para 7 dígitos numéricos quando houver
    const rawAssetDigits = form.assetNumber.replace(/\D/g, "");
    const normalizedAsset = noAsset
      ? "TEMP-"
      : rawAssetDigits
        ? rawAssetDigits.padStart(7, "0")
        : "";

    // Trata IP conforme modo de rede
    let ipToSend: string | undefined;
    if (form.networkMode === "DHCP") {
      ipToSend = "DHCP";
    } else if (form.networkMode === "FIXO" && form.ipAddress.trim()) {
      // Monta o IP completo com o prefixo fixo
      ipToSend = `10.190.110.${form.ipAddress.trim()}`;
    } else if (form.ipAddress.trim()) {
      ipToSend = form.ipAddress.trim();
    } else {
      ipToSend = undefined;
    }

    const payload: CreateEquipmentDTO = {
      assetNumber: normalizedAsset,
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
      ipAddress: ipToSend,
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
  const shouldShowNetwork =
    form.type === "PC" || form.type === "NOTEBOOK" || form.type === "SERVIDOR" || form.type === "ROTEADOR" || form.type === "IMPRESSORA";

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
              onChange={(e) => {
                setNoAsset(e.target.checked);
                // Não limpa o valor digitado: ao desmarcar, o patrimônio volta a aparecer
              }}
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
                Patrimonio <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={noAsset ? "Sem Patrimonio" : assetInputValue}
                onChange={(e) => {
                  if (noAsset) return;
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 7);
                  setAssetInputValue(digits);
                  handleChange("assetNumber", digits);
                }}
                disabled={noAsset}
                placeholder={noAsset ? "Sem Patrimonio" : "Digite 7 dígitos (ex: 1234567)"}
                className={`w-full px-3 py-2.5 border rounded-lg focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 outline-none text-[13px] transition-all disabled:bg-gray-100 disabled:text-gray-400 ${errors.assetNumber ? "border-red-400" : "border-gray-200"
                  }`}
              />
              {!noAsset && assetInputValue.length > 0 && assetInputValue.length < 7 && (
                <p className="text-[11px] text-gray-400 mt-1">
                  Será salvo como: <span className="font-mono">{assetInputValue.padStart(7, "0")}</span>
                </p>
              )}
              {errors.assetNumber && <p className="text-[11px] text-red-500 mt-1">{errors.assetNumber}</p>}
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1.5" style={{ fontWeight: 600 }}>
                Serial Number
              </label>
              <input
                type="text"
                value={form.serialNumber}
                maxLength={50}
                onChange={(e) => {
                  const sanitized = e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 50);
                  handleChange("serialNumber", sanitized);
                }}
                placeholder="Apenas letras e numeros (max. 50)"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 outline-none text-[13px] transition-all"
              />
            </div>
          </div>

          {/* Marca */}
          <div>
            <label className="block text-[11px] text-gray-400 mb-1.5" style={{ fontWeight: 600 }}>
              Marca <span className="text-red-500">*</span>
            </label>
            {brands && brands.length > 0 ? (
              <select
                value={form.brand}
                onChange={(e) => handleChange("brand", e.target.value)}
                className={`w-full px-3 py-2.5 border rounded-lg focus:border-sky-400 text-[13px] outline-none bg-white ${errors.brand ? "border-red-400" : "border-gray-200"
                  }`}
              >
                <option value="">Selecione a marca</option>
                {[...(brands ?? [])]
                  .sort((a, b) => a.localeCompare(b))
                  .map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
              </select>
            ) : (
              <input
                value={form.brand}
                onChange={(e) => handleChange("brand", e.target.value)}
                placeholder="Ex: Dell, Lenovo, HP..."
                className={`w-full px-3 py-2.5 border rounded-lg focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 outline-none text-[13px] transition-all ${errors.brand ? "border-red-400" : "border-gray-200"
                  }`}
              />
            )}
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
                Tipo de Equipamento <span className="text-red-500">*</span>
              </label>
              <select
                value={form.type}
                onChange={(e) => handleChange("type", e.target.value as EquipmentType)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:border-sky-400 text-[13px] outline-none bg-white"
              >
                {[...EQUIPMENT_TYPES]
                  .sort((a, b) => EQUIPMENT_TYPE_LABELS[a].localeCompare(EQUIPMENT_TYPE_LABELS[b]))
                  .map((t) => (
                    <option key={t} value={t}>{EQUIPMENT_TYPE_LABELS[t]}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-gray-400 mb-1.5" style={{ fontWeight: 600 }}>
                Setor <span className="text-red-500">*</span>
              </label>
              <select
                value={form.sectorId}
                onChange={(e) => handleChange("sectorId", e.target.value)}
                className={`w-full px-3 py-2.5 border rounded-lg focus:border-sky-400 text-[13px] outline-none bg-white ${errors.sectorId ? "border-red-400" : "border-gray-200"}`}
              >
                {[...sectors]
                  .sort((a, b) => `${a.acronym} - ${a.fullName}`.localeCompare(`${b.acronym} - ${b.fullName}`))
                  .map((s) => (
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
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value as EquipmentStatus)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:border-sky-400 text-[13px] outline-none bg-white"
            >
              {[...EQUIPMENT_STATUSES]
                .sort((a, b) => EQUIPMENT_STATUS_LABELS[a].localeCompare(EQUIPMENT_STATUS_LABELS[b]))
                .map((s) => (
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
          {shouldShowNetwork && (
            <div className="bg-sky-50 p-4 rounded-xl border border-sky-100">
              <p className="text-[11px] text-sky-700 uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ fontWeight: 700 }}>
                <Wifi className="w-3.5 h-3.5" />
                Informacoes de Rede (Opcional)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <input
                    value={form.hostname ?? ""}
                    onChange={(e) => handleChange("hostname", e.target.value)}
                    placeholder="Hostname"
                    className={`w-full px-3 py-2.5 border rounded-lg outline-none text-[13px] focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 bg-white transition-all ${errors.hostname ? "border-red-400" : "border-sky-200"}`}
                  />
                  {errors.hostname && <p className="text-[11px] text-red-500 mt-1">{errors.hostname}</p>}
                </div>
                <div className="space-y-2">
                  <select
                    value={form.networkMode ?? ""}
                    onChange={(e) => {
                      const mode = e.target.value as FormState["networkMode"];
                      handleChange("networkMode", mode);
                      if (mode === "FIXO") {
                        handleChange("ipAddress", "");
                      } else if (mode === "DHCP") {
                        handleChange("ipAddress", "DHCP");
                      } else {
                        handleChange("ipAddress", "");
                      }
                    }}
                    className="w-full px-3 py-2.5 border border-sky-200 rounded-lg outline-none text-[13px] bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10"
                  >
                    <option value="">Selecione o modo de rede</option>
                    <option value="DHCP">DHCP (automático)</option>
                    <option value="FIXO">IP fixo (10.190.110.xx)</option>
                  </select>
                  {form.networkMode === "FIXO" ? (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-gray-500 pointer-events-none">
                        10.190.110.
                      </span>
                      <input
                        type="text"
                        value={form.ipAddress ?? ""}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
                          handleChange("ipAddress", digits);
                        }}
                        placeholder="xx"
                        maxLength={3}
                        className={`w-full pl-[100px] pr-3 py-2.5 border rounded-lg outline-none text-[13px] focus:border-sky-400 focus:ring-2 focus:ring-sky-500/10 bg-white transition-all ${errors.ipAddress ? "border-red-400" : "border-sky-200"
                          }`}
                      />
                    </div>
                  ) : form.networkMode === "DHCP" ? (
                    <input
                      value="DHCP"
                      disabled
                      className="w-full px-3 py-2.5 border border-sky-200 rounded-lg outline-none text-[13px] bg-gray-100 text-gray-400 cursor-not-allowed"
                    />
                  ) : (
                    <input
                      disabled
                      placeholder="Selecione o modo de rede"
                      className="w-full px-3 py-2.5 border border-sky-200 rounded-lg outline-none text-[13px] bg-gray-50 text-gray-400 cursor-not-allowed"
                    />
                  )}
                  {errors.ipAddress && <p className="text-[11px] text-red-500 mt-1">{errors.ipAddress}</p>}
                </div>
              </div>
            </div>
          )}
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
