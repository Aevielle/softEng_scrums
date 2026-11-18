// 'YYYY-MM-DD HH:mm' in the viewer's own time zone
export const fmtTs = (iso) => new Date(iso).toLocaleString('sv-SE').slice(0, 16);