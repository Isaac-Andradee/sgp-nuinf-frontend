import { useEffect } from "react";

const APP_NAME = "SGP NUINF";

/**
 * Atualiza o título da aba do navegador.
 * Formato: "Nome da Página | SGP NUINF"
 * Se nenhum título for passado, exibe apenas "SGP NUINF".
 */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME;
    return () => {
      document.title = APP_NAME;
    };
  }, [title]);
}
