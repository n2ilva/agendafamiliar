/**
 * Utilitário para gerenciamento de logs
 * Em produção, silencia logs para evitar vazamento de dados sensíveis.
 */
export const setupLogger = () => {
    if (__DEV__) {
        // Em desenvolvimento, mantém logs normais
        // console.log('🔧 Logger configurado para modo DESENVOLVIMENTO');
        return;
    }

    // Em produção, silencia logs informativos
    const noop = () => { };

    console.log = noop;
    console.info = noop;
    console.debug = noop;
    console.trace = noop;

    // Manter warn e error para rastreamento de problemas críticos
    // Futuramente, integrar com serviço de Crashlytics (Sentry, Firebase Crashlytics)
};
