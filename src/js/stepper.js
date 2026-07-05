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

  // B8 fix: await onChange promise and catch errors
  async function update(newVal) {
    state.value = newVal;
    const el = document.getElementById(valId);
    if (el) el.textContent = format(newVal);
    if (onChange) {
      try {
        await onChange(newVal);
      } catch (err) {
        console.error('[stepper] onChange error:', err);
      }
    }
  }

  document.getElementById(decId)?.addEventListener('click', () => {
    const next = roundToStep(Math.max(min, parser(state.value) - step));
    update(next);
  });

  document.getElementById(incId)?.addEventListener('click', () => {
    const next = roundToStep(Math.min(max, parser(state.value) + step));
    update(next);
  });

  return state;
}
