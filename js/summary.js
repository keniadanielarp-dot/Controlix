/* -------------------------------------  BLOQUE:  Opción Resumen ------------------------------------- */

// Este archivo usa variables y funciones de pos.js (pos_inspections, get_pos_by_id,
// get_pos_quantity, get_date_time), de inspections.js (VALIDATION_SECTIONS)
// y de general.js (pos_evidence, get_po_evidence), por eso se carga DESPUÉS de esos archivos en dashboard_admin.html.


// Nombre de cada renglón de evidencias (General).
const EVIDENCE_LABELS = {
    measures_photo: "Foto de medidas",
    china_hangtag: "Etiqueta colgante China",
    special_packaging: "Foto de empaque especial",
    compare_sample: "Comparar muestra vs. producto real",
    defect_photo: "Foto del defecto",
    exceptional_approval: "Aprobación de desarrollo excepcional vs. producto real",
    others: "Otros"
};

// PO elegida en el select.
let summary_po_id = null;


// Inspecciones de una PO (de la más antigua a la más reciente).
function get_summary_inspections(po_id) {
    return pos_inspections[po_id] ?? [];
}


// Número de la PO (columna "POs Adidas").
function get_summary_po_number(po_id) {
    return get_pos_by_id(po_id)?.quantities[1] ?? get_summary_inspections(po_id).at(-1)?.po_number ?? po_id;
}


// Preparar la opción Resumen al abrirla.
async function init_summary_module() {

    // Traer las inspecciones guardadas (después de F5 o de iniciar sesión).
    await load_inspections_from_db();

    const select = document.getElementById("summary_po");
    if (!select) return;

    // PO que ya tienen un tipo de inspección asignado.
    const ids_po = Object.keys(pos_inspections).filter(po_id => pos_inspections[po_id].length > 0);

    select.innerHTML = '<option value="">Seleccione una PO</option>';

    ids_po.forEach(function (po_id) {

        const inspections = get_summary_inspections(po_id);
        const total = inspections.length;

        const option = document.createElement("option");
        option.value = po_id;
        option.textContent = `PO ${get_summary_po_number(po_id)} · ${inspections.at(-1).type_name} · ${total} ${total === 1 ? "inspección" : "inspecciones"}`;
        select.appendChild(option);
    });

    load_summary_po("");
}


// Mostrar qué partes del reporte están listas.
function load_summary_po(po_id) {

    summary_po_id = po_id || null;

    const inspections = summary_po_id ? get_summary_inspections(summary_po_id) : [];
    const last = inspections.at(-1);

    // Saber si cada parte ya está registrada.
    const parts = {
        details: Boolean(summary_po_id),

        // Todas las inspecciones tienen resultado.
        result: inspections.length > 0 && inspections.every(inspection => inspection.result !== "Pendiente"),

        // La inspección más reciente tiene validaciones.
        validations: Object.keys(last?.validations ?? {}).length > 0,

        // Todas las rechazadas tienen sus defectos registrados.
        defects: inspections.length > 0 && inspections.every(
            inspection => inspection.result !== "Rechazado" || (inspection.defect_details ?? []).length > 0
        ),

        evidence: Boolean(summary_po_id) && Object.keys(get_po_evidence(summary_po_id)).length > 0
    };

    document.querySelectorAll(".summary_check").forEach(function (chip) {

        const ready = parts[chip.dataset.part];

        // Sin PO elegida: gris. Con PO: verde (Listo) o amarillo (Pendiente).
        chip.classList.toggle("ready", Boolean(summary_po_id) && ready);
        chip.classList.toggle("pending", Boolean(summary_po_id) && !ready);
        chip.title = !summary_po_id ? "" : (ready ? "Listo" : "Pendiente: sale como \"Sin registrar\"");
    });

    // Mostrar el reporte en el visor.
    show_summary_report();
}


/* ==========================================
   DOCUMENTO DEL REPORTE
========================================== */

// Evitar que un texto se interprete como HTML.
function escape_html(text) {
    return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}


// Renglón "Dato: valor" de los detalles.
function summary_field(label, value) {
    return `<div class="field"><span>${escape_html(label)}</span><strong>${escape_html(value ?? "—")}</strong></div>`;
}


// Direcciones temporales de las fotos del reporte (se liberan al cambiar de PO).
let summary_photo_urls = [];

// Dirección de una foto: nueva (en el navegador) o guardada en el servidor.
function summary_photo_url(file, path) {

    if (file) {
        const url = URL.createObjectURL(file);
        summary_photo_urls.push(url);
        return url;
    }
    if (path) return `/sistema_calidad/${path}`;

    return "";
}


// Clase de color según el resultado.
function summary_result_class(result) {
    return result === "Aceptado" ? "accepted" : result === "Rechazado" ? "rejected" : "pending";
}


// Resultado AQL de una inspección.
function build_summary_result(inspection) {

    if (inspection.result === "Pendiente") return `<p class="empty">Sin registrar.</p>`;

    return `<div class="chips">
                <span>LOAD SIZE <strong>${escape_html(inspection.load_size)}</strong></span>
                <span>Muestra <strong>${escape_html(inspection.sample_size)} piezas</strong></span>
                <span>Defectos <strong>${escape_html(inspection.defects)}</strong></span>
                <span class="result ${summary_result_class(inspection.result)}">${escape_html(String(inspection.result).toUpperCase())}</span>
           </div>`;
}


// Validaciones de una inspección.
function build_summary_validations(inspection) {

    const answers = inspection.validations ?? {};

    if (Object.keys(answers).length === 0) return `<p class="empty">Sin registrar.</p>`;

    return VALIDATION_SECTIONS.map(function (section) {

        const rows = section.items.map(function (item) {

            const value = answers[item.key] ?? "Sin respuesta";
            const value_class = { "Conforme": "ok", "No conforme": "bad", "N/A": "na" }[value] ?? "none";

            return `<div class="check"><span>${escape_html(item.text)}</span><span class="value ${value_class}">${escape_html(value)}</span></div>`;

        }).join("");

        return `<div class="check_section"><h4>${escape_html(section.title)}</h4>${rows}</div>`;

    }).join("");
}


// Defectos de una inspección.
function build_summary_defects(inspection) {

    const details = inspection.defect_details ?? [];

    if (details.length === 0) {
        return `<p class="empty">${inspection.result === "Rechazado" ? "Sin registrar." : "La inspección no tiene defectos por registrar."}</p>`;
    }

    const rows = details.map(function (detail, position) {

        const url = summary_photo_url(detail.photo, detail.photo_path);
        const photo = url ? `<img src="${url}" alt="Foto del defecto ${position + 1}">` : "—";

        return `<tr>
                <td>${position + 1}</td>
                <td>${escape_html(detail.ctq_text)}</td>
                <td>${escape_html(detail.code_text)}</td>
                <td>${escape_html(detail.classification_text)}</td>
                <td class="photo">${photo}</td>
            </tr>`;

    }).join("");

    return `<table>
            <thead><tr><th>#</th><th>CTQ</th><th>Code</th><th>Defect Classification</th><th>Foto</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
}


// Armar el HTML completo del reporte de una PO.
function build_summary_html(po_id) {

    const record = get_pos_by_id(po_id);
    const quantities = record?.quantities ?? [];
    const generated_by = document.getElementById("name_profile")?.textContent ?? "";

    const po_number = get_summary_po_number(po_id);
    const inspections = get_summary_inspections(po_id);
    const last = inspections.at(-1);


    /* ----- Historial de inspecciones ----- */
    const history_html = inspections.length === 0
        ? `<p class="empty">La PO todavía no tiene inspecciones.</p>`
        : `<table>
            <thead><tr><th>Intento</th><th>Tipo de inspección</th><th>Inspector</th><th>Asignada</th><th>Resultado</th><th>Defectos</th></tr></thead>
            <tbody>${inspections.map((inspection, index) => `<tr>
                <td>${index + 1}${inspection.is_reinspection ? ' <span class="tag">Reinspección</span>' : ""}</td>
                <td>${escape_html(inspection.type_name)}</td>
                <td>${escape_html(inspection.inspector)}</td>
                <td>${escape_html(inspection.date_time)}</td>
                <td><span class="status ${summary_result_class(inspection.result)}">${escape_html(inspection.result)}</span></td>
                <td>${escape_html(inspection.defects ?? "—")}</td>
            </tr>`).join("")}</tbody>
        </table>`;


    /* ----- Detalle de cada inspección ----- */
    const inspections_html = inspections.map((inspection, index) => `
    <section class="inspection">
        <div class="bar">Inspección ${index + 1} · ${escape_html(inspection.type_name)}${inspection.is_reinspection ? " (Reinspección)" : ""}</div>

        <div class="fields">
            <div>
                ${summary_field("Nivel", inspection.level)}
                ${summary_field("Inspector", inspection.inspector)}
            </div>
            <div>
                ${summary_field("Fecha de asignación", inspection.date_time)}
                ${summary_field("Fecha de resultado", inspection.result_date_time)}
                ${summary_field("Cajas inspeccionadas", inspection.boxes ? `${inspection.boxes} (${inspection.boxes_count} ${inspection.boxes_count === 1 ? "caja" : "cajas"})` : null)}
            </div>
        </div>

        <h3>Resultado AQL</h3>
        ${build_summary_result(inspection)}

        <h3>Validaciones y listas de verificación</h3>
        ${build_summary_validations(inspection)}

        <h3>Defectos registrados</h3>
        ${build_summary_defects(inspection)}
    </section>`).join("");


    /* ----- Evidencias ----- */
    const evidence = Object.entries(get_po_evidence(po_id))
        .flatMap(([item, files]) => files.map(file => ({ item, file })));

    const evidence_html = evidence.length === 0
        ? `<p class="empty">Sin registrar.</p>`
        : `<div class="photos">${evidence.map(({ item, file }) => `
                <figure>
                    <img src="${summary_photo_url(file)}" alt="${escape_html(EVIDENCE_LABELS[item] ?? item)}">
                    <figcaption>${escape_html(EVIDENCE_LABELS[item] ?? item)}</figcaption>
                </figure>`).join("")}
           </div>`;


    /* ----- Documento completo ----- */
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Reporte_PO_${escape_html(po_number)}</title>
<style>
    @page { size: letter; margin: 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #142b49; font-size: 12px; background: #525659; }

    /* En pantalla: hoja blanca centrada con márgenes, como una página */
    .page { max-width: 816px; margin: 28px auto; padding: 40px 48px; background: #ffffff; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35); }

    /* Al imprimir o guardar como PDF: los márgenes los pone @page */
    @media print {
        body { background: #ffffff; }
        .page { max-width: none; margin: 0; padding: 0; box-shadow: none; }
    }
    header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #142b49; padding-bottom: 8px; margin-bottom: 14px; }
    .brand { font-size: 24px; font-weight: 700; }
    .brand span { color: #25a7ff; }
    .subtitle { color: #34476c; }
    .generated { text-align: right; color: #34476c; font-size: 11px; }
    .bar { background: #3a6fb5; color: #ffffff; font-weight: 700; padding: 7px 10px; border-radius: 3px; margin: 16px 0 8px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .fields { display: grid; grid-template-columns: 1fr 1fr; column-gap: 24px; }
    .field { display: flex; gap: 10px; padding: 4px 0; border-bottom: 1px solid #eef2f7; }
    .field span { width: 150px; color: #34476c; }
    .field strong { flex: 1; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .chips span { padding: 5px 9px; border: 1px solid #dce5f0; border-radius: 4px; }
    .chips .result { border: none; color: #ffffff; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .result.accepted { background: #198754; }
    .result.rejected { background: #dc3545; }
    .check_section { margin-bottom: 8px; break-inside: avoid; }
    .check { display: grid; grid-template-columns: 1fr 1fr; align-items: center; }
    .check span { padding: 4px 0; }
    .value { padding: 4px 8px !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .value.ok { background: #4caf50; color: #ffffff; }
    .value.bad { background: #dc3545; color: #ffffff; }
    .value.na { background: #b8c7d6; color: #142b49; }
    .value.none { background: #f1f5f9; color: #526789; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #dce5f0; padding: 5px 6px; text-align: left; vertical-align: middle; }
    th { background: #eef3f9; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    td.photo img { width: 60px; height: 60px; object-fit: cover; border-radius: 3px; }
    .photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    figure { margin: 0; break-inside: avoid; }
    figure img { width: 100%; height: 150px; object-fit: cover; border: 1px solid #dce5f0; border-radius: 4px; }
    figcaption { font-size: 10px; color: #34476c; margin-top: 3px; }
    .empty { color: #5b6b85; font-style: italic; margin: 4px 0; }
    .inspection h3 { font-size: 13px; margin: 12px 0 6px; padding-bottom: 3px; border-bottom: 1px solid #dce5f0; }
    .check_section h4 { font-size: 12px; margin: 8px 0 4px; }
    .status { display: inline-block; padding: 2px 8px; border-radius: 3px; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .status.accepted { background: #d1e7dd; color: #146c43; }
    .status.rejected { background: #f8d7da; color: #842029; }
    .status.pending { background: #fff3cd; color: #8a6100; }
    .tag { display: inline-block; margin-left: 4px; padding: 1px 6px; border-radius: 8px; background: #ffedd5; color: #9a3412; font-size: 10px; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style>
</head>
<body>
<div class="page">
    <header>
        <div>
            <div class="brand">Control<span>ix</span></div>
            <div class="subtitle">Reporte de PO</div>
        </div>
        <div class="generated">Generado: ${escape_html(get_date_time())}<br>Por: ${escape_html(generated_by)}</div>
    </header>

    <div class="bar">Detalles de la PO</div>
    <div class="fields">
        <div>
            ${summary_field("PO", po_number)}
            ${summary_field("Modelo / Artículo", `${quantities[2] ?? "—"} · ${quantities[3] ?? "—"}`)}
            ${summary_field("Color", quantities[4])}
            ${summary_field("Cantidad", get_pos_quantity(po_id))}
        </div>
        <div>
            ${summary_field("Inspector", last?.inspector)}
            ${summary_field("Inspecciones", inspections.length)}
            ${summary_field("Resultado final", last?.result ?? "Sin inspección")}
            ${summary_field("Fecha de evidencias", pos_evidence[po_id]?.evidence_at)}
        </div>
    </div>

    <div class="bar">Historial de inspecciones</div>
    ${history_html}
    ${inspections_html}

    <div class="bar">Evidencias de la PO</div>
    ${evidence_html}
</div>
</body>
</html>`;
}


/* ==========================================
   VISOR DEL REPORTE
========================================== */

// Zoom del visor (1 = 100%).
let summary_zoom = 1;

const SUMMARY_ZOOM_MIN = 0.5;
const SUMMARY_ZOOM_MAX = 2;
const SUMMARY_ZOOM_STEP = 0.1;


// Dibujar el reporte de la PO elegida dentro del visor.
function show_summary_report() {

    const frame = document.getElementById("summary_frame");
    if (!frame) return;

    // Liberar las fotos del reporte anterior.
    summary_photo_urls.forEach(url => URL.revokeObjectURL(url));
    summary_photo_urls = [];

    const has_po = Boolean(summary_po_id);

    // Mensaje o reporte.
    document.getElementById("summary_viewer_empty").hidden = has_po;
    frame.hidden = !has_po;

    // Botones de la barra.
    ["btn_download_summary", "btn_print_summary", "btn_zoom_in", "btn_zoom_out"]
        .forEach(id => document.getElementById(id).disabled = !has_po);

    document.getElementById("summary_file_name").textContent =
        has_po ? `Reporte_PO_${get_summary_po_number(summary_po_id)}.pdf` : "Reporte";

    if (!has_po) {
        frame.srcdoc = "";
        return;
    }

    // Al terminar de cargar, aplicar el zoom actual.
    frame.onload = apply_summary_zoom;
    frame.srcdoc = build_summary_html(summary_po_id);
}


// Aplicar el zoom a la hoja.
function apply_summary_zoom() {

    const doc = document.getElementById("summary_frame")?.contentDocument;
    if (doc?.body) doc.body.style.zoom = summary_zoom;

    document.getElementById("summary_zoom_value").textContent = `${Math.round(summary_zoom * 100)}%`;
    document.getElementById("btn_zoom_out").disabled = !summary_po_id || summary_zoom <= SUMMARY_ZOOM_MIN;
    document.getElementById("btn_zoom_in").disabled = !summary_po_id || summary_zoom >= SUMMARY_ZOOM_MAX;
}


// Acercar o alejar.
function change_summary_zoom(step) {

    summary_zoom = Math.min(SUMMARY_ZOOM_MAX, Math.max(SUMMARY_ZOOM_MIN, Math.round((summary_zoom + step) * 10) / 10));
    apply_summary_zoom();
}


// Imprimir o guardar como PDF (el nombre del archivo sale del título: Reporte_PO_XXXX).
function print_summary() {

    const frame = document.getElementById("summary_frame");

    if (!summary_po_id || !frame?.contentWindow) {
        alert("Selecciona una PO.");
        return;
    }

    const report = frame.contentWindow;
    const doc = frame.contentDocument;

    // Imprimir al 100% aunque el visor tenga otro zoom.
    doc.body.style.zoom = 1;

    // Esperar a que carguen las fotos antes de imprimir.
    const images = [...doc.images];

    Promise.all(images.map(image => image.complete
        ? Promise.resolve()
        : new Promise(resolve => { image.onload = resolve; image.onerror = resolve; })
    )).then(function () {
        report.focus();
        report.print();
        apply_summary_zoom();
    });
}


// Pantalla completa del visor (o salir de ella).
function toggle_summary_fullscreen() {

    const viewer = document.getElementById("summary_viewer");

    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        viewer?.requestFullscreen?.();
    }
}



/* -------------------------------------  BLOQUE:  Eventos de Resumen ------------------------------------- */

document.addEventListener("change", function (event) {

    // Elegir otra PO.
    if (event.target.matches("#summary_po")) {
        load_summary_po(event.target.value);
    }
});

document.addEventListener("click", function (event) {

    const target = event.target;

    // Descargar: en la ventana de impresión elegir "Guardar como PDF".
    // Imprimir: la misma ventana, eligiendo la impresora.
    if (target.closest("#btn_download_summary, #btn_print_summary")) {
        print_summary();
        return;
    }

    // Zoom.
    if (target.closest("#btn_zoom_in")) {
        change_summary_zoom(SUMMARY_ZOOM_STEP);
        return;
    }

    if (target.closest("#btn_zoom_out")) {
        change_summary_zoom(-SUMMARY_ZOOM_STEP);
        return;
    }

    // Pantalla completa.
    if (target.closest("#btn_fullscreen_summary")) {
        toggle_summary_fullscreen();
    }
});

// Cambiar el ícono al entrar o salir de pantalla completa.
document.addEventListener("fullscreenchange", function () {

    const icon = document.querySelector("#btn_fullscreen_summary i");
    if (!icon) return;

    const is_full = document.fullscreenElement?.id === "summary_viewer";

    icon.className = is_full ? "bi bi-fullscreen-exit" : "bi bi-arrows-fullscreen";
    document.getElementById("btn_fullscreen_summary")
        .setAttribute("aria-label", is_full ? "Salir de pantalla completa" : "Pantalla completa");
});