export function runAlertLogic(store) {
    const tank1 = store.tanks.find((t) => t.id === 'T-100');
    const newAlerts = [];
    const now = new Date().toISOString();
    if (tank1) {
        if (tank1.level <= 40.0) {
            tank1.alert = 'Nível CRÍTICO Baixo - Cisterna T-100';
            newAlerts.push({ id: 'T-100-LOW', message: 'Nível CRÍTICO Baixo - Cisterna T-100', level: 'Critical', activeAt: now });
        }
        if (tank1.level >= 95.0) {
            tank1.alert = 'Alerta de Nível Alto - Cisterna T-100';
            newAlerts.push({ id: 'T-100-HIGH', message: 'Alerta de Nível Alto - Cisterna T-100', level: 'Warning', activeAt: now });
        }
        if (tank1.level > 40.0 && tank1.level < 95.0) {
            delete tank1.alert;
        }
    }
    store.activeAlerts = newAlerts;
}
//# sourceMappingURL=logic.js.map