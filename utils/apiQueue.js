// FSalud-service/utils/apiQueue.js
// Cola de llamadas a API con backoff exponencial y modo saturado para Node.js

let modoSaturado = false;
let colaDeLlamadas = [];
let tiempoDeEsperaActual = 1000; // 1 segundo
let procesadorActivo = false;

function jitter(ms = 1000) {
  return Math.floor(Math.random() * ms);
}

function logSaturacion() {
  if (!modoSaturado) {
    console.warn('[apiQueue] ¡Saturación detectada! Activando modo backoff.');
  }
}

function encolarLlamada(funcion, parametros, resolve, reject, intentos = 0) {
  colaDeLlamadas.push({ funcion, parametros, resolve, reject, intentos });
  if (!procesadorActivo) {
    procesarCola();
  }
}

async function procesarCola() {
  if (procesadorActivo) return;
  procesadorActivo = true;

  while (colaDeLlamadas.length > 0) {
    const llamada = colaDeLlamadas.shift();
    const espera = (2 ** llamada.intentos) * 1000 + jitter();
    await new Promise(res => setTimeout(res, Math.max(tiempoDeEsperaActual, espera)));
    try {
      const resultado = await llamada.funcion(...(Array.isArray(llamada.parametros) ? llamada.parametros : [llamada.parametros]));
      tiempoDeEsperaActual = 1000;
      modoSaturado = false;
      llamada.resolve(resultado);
    } catch (error) {
      if (error?.response?.status === 429 || error?.code === 429) {
        // Error de rate limit: reencolar y aumentar backoff
        llamada.intentos = (llamada.intentos || 0) + 1;
        colaDeLlamadas.unshift(llamada);
        tiempoDeEsperaActual = Math.min(tiempoDeEsperaActual * 2 + jitter(), 60000); // máx 1 min
        modoSaturado = true;
        logSaturacion();
      } else {
        llamada.reject(error);
      }
    }
  }
  procesadorActivo = false;
  modoSaturado = false;
}

// Wrapper para usar en vez de llamadas directas a la API
function llamadaApiConCola(funcion, parametros) {
  return new Promise((resolve, reject) => {
    if (modoSaturado) {
      encolarLlamada(funcion, parametros, resolve, reject);
    } else {
      funcion(...(Array.isArray(parametros) ? parametros : [parametros]))
        .then(resolve)
        .catch(error => {
          if (error?.response?.status === 429 || error?.code === 429) {
            modoSaturado = true;
            logSaturacion();
            encolarLlamada(funcion, parametros, resolve, reject, 1);
          } else {
            reject(error);
          }
        });
    }
  });
}

module.exports = {
  llamadaApiConCola,
  getEstadoApiQueue: () => ({
    modoSaturado,
    colaDeLlamadas: [...colaDeLlamadas],
    tiempoDeEsperaActual,
    procesadorActivo
  })
};
