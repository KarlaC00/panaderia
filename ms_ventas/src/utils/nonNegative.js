/**
 * Valida que un valor numérico no sea negativo.
 * @param {*} valor
 * @param {{ permitirCero?: boolean, nombreCampo?: string }} opciones
 */
const validarNoNegativo = (valor, { permitirCero = true, nombreCampo = 'valor' } = {}) => {
  if (valor === null || valor === undefined || valor === '') {
    return { valido: false, error: `${nombreCampo} es obligatorio` };
  }
  const n = Number(valor);
  if (!Number.isFinite(n)) {
    return { valido: false, error: `${nombreCampo} debe ser un número válido` };
  }
  if (n < 0 || (!permitirCero && n <= 0)) {
    const msg = permitirCero
      ? `${nombreCampo} no puede ser negativo`
      : `${nombreCampo} debe ser mayor a cero`;
    return { valido: false, error: msg };
  }
  return { valido: true, valor: n };
};

const primerError = (validaciones) => validaciones.find((v) => !v.valido);

module.exports = { validarNoNegativo, primerError };
