/**
 * stepper.js — Fábrica de controles incremental/decremental.
 *
 * Principio DRY: los steppers de fontSize, lineHeight y maxNotes
 * en settings.js seguían el mismo patrón; esta fábrica lo
 * encapsula en un solo lugar.
 *
 * Principio SRP: única responsabilidad = crear steppers reutilizables.
 */

/**
 * Configura un par de botones +/– que modifican un valor numérico.
 *
 * @param {object} options
 * @param {string}  options.decId        ID del botón decremento
 * @param {string}  options.incId        ID del botón incremento
 * @param {string}  options.valId        ID del elemento que muestra el valor
 * @param {number}  options.initial      Valor inicial
 * @param {number}  options.min          Valor mínimo
 * @param {number}  options.max          Valor máximo
 * @param {number}  [options.step=1]     Paso
 * @param {function(number): number} [options.parser] Parseador (ej: parseFloat)
 * @param {function(number): string} [options.format=v=>v] Formateador para mostrar
 * @param {function(number): Promise<void>} [options.onChange] Callback al cambiar
 * @returns {{ value: number }} Objeto con referencia mutable al valor actual
 */
export function createStepper(options) {
  const {
    decId, incId, valId,
    initial, min, max,
    step = 1,
    parser = (v) => v,
    format = (v) => String(v),
    onChange,
  } = options;

  const state = { value: parser(initial) };

  function roundToStep(val) {
    const decimals = (String(step).split('.')[1] || '').length;
    return parseFloat(val.toFixed(decimals));
  }

  function update(newVal) {
    state.value = newVal;
    const el = document.getElementById(valId);
    if (el) el.textContent = format(newVal);
    if (onChange) onChange(newVal);
  }

  document.getElementById(decId)?.addEventListener('click', async () => {
    const next = roundToStep(Math.max(min, parser(state.value) - step));
    update(next);
  });

  document.getElementById(incId)?.addEventListener('click', async () => {
    const next = roundToStep(Math.min(max, parser(state.value) + step));
    update(next);
  });

  return state;
}
