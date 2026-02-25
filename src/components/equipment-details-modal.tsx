import { X, Tag, Hash, Building2, User, Wifi, Calendar, Package } from "lucide-react";
import type { EquipmentResponseDTO } from "../types";
import { EQUIPMENT_TYPE_LABELS, EQUIPMENT_STATUS_LABELS, EQUIPMENT_STATUS_COLORS } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  equipment: EquipmentResponseDTO | null;
  onEdit?: () => void;
}

function getTypeIcon() {
  // Ícone simples para o modal
  return Package;
}

export function EquipmentDetailsModal({ open, onClose, equipment, onEdit }: Props) {
  if (!open || !equipment) return null;

  const hasAsset = equipment.assetNumber && !equipment.assetNumber.startsWith("PROV-");
  const statusColors = EQUIPMENT_STATUS_COLORS[equipment.status];
  const TypeIcon = getTypeIcon();

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      style={{ fontFamily: "'Inter', sans-serif" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0c4a6e] px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <TypeIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white text-[16px]" style={{ fontWeight: 600 }}>
                Detalhes do Equipamento
              </h3>
              <p className="text-white/70 text-[12px] mt-0.5">
                {EQUIPMENT_TYPE_LABELS[equipment.type]} · {equipment.brand}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Patrimônio e Serial */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-gray-400" />
                <label className="text-[11px] text-gray-400 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                  Patrimônio
                </label>
              </div>
              <p
                className={`text-[15px] ${hasAsset ? "text-foreground" : "text-rose-500 italic"}`}
                style={{ fontWeight: hasAsset ? 600 : 400 }}
              >
                {hasAsset ? equipment.assetNumber : "Sem Patrimônio"}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Hash className="w-4 h-4 text-gray-400" />
                <label className="text-[11px] text-gray-400 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                  Serial Number
                </label>
              </div>
              <p className="text-[15px] text-foreground" style={{ fontWeight: 500 }}>
                {equipment.serialNumber || <span className="text-gray-300">Não informado</span>}
              </p>
            </div>
          </div>

          {/* Descrição */}
          {equipment.description && (
            <div className="bg-sky-50 rounded-xl p-4 border border-sky-100">
              <label className="text-[11px] text-sky-700 uppercase tracking-wider mb-2 block" style={{ fontWeight: 600 }}>
                Descrição Detalhada
              </label>
              <p className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                {equipment.description}
              </p>
            </div>
          )}

          {/* Tipo, Marca e Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <label className="text-[11px] text-gray-400 uppercase tracking-wider mb-2 block" style={{ fontWeight: 600 }}>
                Tipo
              </label>
              <p className="text-[14px] text-foreground" style={{ fontWeight: 500 }}>
                {EQUIPMENT_TYPE_LABELS[equipment.type]}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <label className="text-[11px] text-gray-400 uppercase tracking-wider mb-2 block" style={{ fontWeight: 600 }}>
                Marca
              </label>
              <p className="text-[14px] text-foreground" style={{ fontWeight: 500 }}>
                {equipment.brand}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <label className="text-[11px] text-gray-400 uppercase tracking-wider mb-2 block" style={{ fontWeight: 600 }}>
                Status
              </label>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] border ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
                style={{ fontWeight: 600 }}
              >
                {EQUIPMENT_STATUS_LABELS[equipment.status]}
              </span>
            </div>
          </div>

          {/* Setor e Responsável */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-gray-400" />
                <label className="text-[11px] text-gray-400 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                  Setor Atual
                </label>
              </div>
              <p className="text-[14px] text-foreground" style={{ fontWeight: 500 }}>
                {equipment.currentSector.acronym}
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                {equipment.currentSector.fullName}
              </p>
            </div>
            {equipment.equipmentUser && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <label className="text-[11px] text-gray-400 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                    Responsável
                  </label>
                </div>
                <p className="text-[14px] text-foreground" style={{ fontWeight: 500 }}>
                  {equipment.equipmentUser}
                </p>
              </div>
            )}
          </div>

          {/* Informações de Rede */}
          {(equipment.hostname || equipment.ipAddress) && (
            <div className="bg-sky-50 rounded-xl p-4 border border-sky-100">
              <div className="flex items-center gap-2 mb-3">
                <Wifi className="w-4 h-4 text-sky-600" />
                <label className="text-[11px] text-sky-700 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                  Informações de Rede
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {equipment.hostname && (
                  <div>
                    <p className="text-[11px] text-gray-500 mb-1">Hostname</p>
                    <p className="text-[13px] text-gray-700 font-mono" style={{ fontWeight: 500 }}>
                      {equipment.hostname}
                    </p>
                  </div>
                )}
                {equipment.ipAddress && (
                  <div>
                    <p className="text-[11px] text-gray-500 mb-1">Endereço IP</p>
                    <p className="text-[13px] text-gray-700 font-mono" style={{ fontWeight: 500 }}>
                      {equipment.ipAddress}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Data de Cadastro */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <label className="text-[11px] text-gray-400 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                Data de Cadastro
              </label>
            </div>
            <p className="text-[14px] text-foreground" style={{ fontWeight: 500 }}>
              {new Date(equipment.createdAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg text-[13px] transition-colors"
            style={{ fontWeight: 500 }}
          >
            Fechar
          </button>
          {onEdit && (
            <button
              onClick={onEdit}
              className="px-5 py-2.5 bg-primary hover:bg-[#075985] text-white rounded-lg text-[13px] shadow-sm transition-all flex items-center gap-2"
              style={{ fontWeight: 600 }}
            >
              Editar Equipamento
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
