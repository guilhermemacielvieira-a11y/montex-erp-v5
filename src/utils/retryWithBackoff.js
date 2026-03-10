/**
 * Retry com backoff exponencial para operações Supabase
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Options
 * @param {number} options.maxRetries - Max retry attempts (default: 3)
 * @param {number} options.baseDelay - Base delay in ms (default: 1000)
 * @param {number} options.maxDelay - Max delay in ms (default: 10000)
 * @param {string} options.operationName - Name for logging
 * @returns {Promise} - Result of fn
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    operationName = 'operation'
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        console.error(`[Retry] ${operationName} falhou após ${maxRetries + 1} tentativas:`, error.message);
        throw error;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 500, maxDelay);
      console.warn(`[Retry] ${operationName} tentativa ${attempt + 1}/${maxRetries + 1} falhou. Retentando em ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export default retryWithBackoff;
