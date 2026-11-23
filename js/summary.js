/* -------------------------------------  BLOQUE:  Opción Resumen ------------------------------------- */

// Este archivo usa variables y funciones de pos.js (pos_inspections, get_pos_by_id,
// get_pos_quantity, get_date_time) y de inspections.js (VALIDATION_SECTIONS),
// por eso se carga DESPUÉS de esos archivos en dashboard_admin.html.


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

// Inspección elegida en el select.
let summary_inspection = null;


// Preparar la opción Resumen al abrirla.
function init_summary_module() {

    const select = document.getElementById("summary_inspection");
    if (!select) return;

    // Llenar el select con todas las inspecciones (la más reciente primero).
    select.innerHTML = '<option value="">Seleccione una inspección</option>';

    Object.entries(pos_inspections)
        .flatMap(([po_id, inspections]) =>
            inspections.map((inspection, index) => ({ po_id, index, inspection }))
        )
        .sort((a, b) => b.inspection.id - a.inspection.id)
        .forEach(function ({ po_id, index, inspection }) {

            const option = document.createElement("option");
            option.value = `${po_id}|${index}`;
            option.textContent = `PO ${inspection.po_number} · ${inspection.type_name} · ${inspection.date_time}`;
            select.appendChild(option);
        });

    load_summary_inspection("");
}


// Mostrar qué partes del reporte están listas.
function load_summary_inspection(value) {

    summary_inspection = null;

    if (value) {
        const [po_id, index] = value.split("|");
        summary_inspection = pos_inspections[po_id]?.[index] ?? null;
    }

    document.getElementById("btn_download_summary").disabled = !summary_inspection;

    const inspection = summary_inspection;

    // Saber si cada parte ya está registrada.
    const parts = {
        details: Boolean(inspection),
        result: Boolean(inspection) && inspection.result !== "Pendiente",
        validations: Object.keys(inspection?.validations ?? {}).length > 0,
        defects: inspection?.result !== "Rechazado" || (inspection?.defect_details ?? []).length > 0,
        evidence: Object.keys(inspection?.evidence ?? {}).length > 0
    };

    document.querySelectorAll(".summary_check").forEach(function (card) {

        const badge = card.querySelector(".summary_badge");
        const ready = parts[card.dataset.part];

        // Sin inspección elegida: guion.
        if (!inspection) {
            badge.textContent = "—";
            badge.className = "summary_badge";
            return;
        }

        badge.textContent = ready ? "Listo" : "Pendiente";
        badge.className = `summary_badge ${ready ? "ready" : "pending"}`;
    });
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


// Dirección de una foto: nueva (en el navegador) o guardada en el servidor.
function summary_photo_url(file, path) {

    if (file) return URL.createObjectURL(file);
    if (path) return `/sistema_calidad/${path}`;

    return "";
}


// Armar el HTML completo del reporte.
function build_summary_html(inspection) {

    const record = get_pos_by_id(inspection.po_id);
    const quantities = record?.quantities ?? [];
    const generated_by = document.getElementById("name_profile")?.textContent ?? "";


    /* ----- Resultado AQL ----- */
    const result_class = inspection.result === "Aceptado" ? "accepted" : inspection.result === "Rechazado" ? "rejected" : "pending";

    const result_html = inspection.result === "Pendiente"
        ? `<p class="empty">Sin registrar.</p>`
        : `<div class="chips">
                <span>LOAD SIZE <strong>${escape_html(inspection.load_size)}</strong></span>
                <span>Muestra <strong>${escape_html(inspection.sample_size)} piezas</strong></span>
                <span>Defectos <strong>${escape_html(inspection.defects)}</strong></span>
                <span class="result ${result_class}">${escape_html(String(inspection.result).toUpperCase())}</span>
           </div>`;


    /* ----- Validaciones ----- */
    const answers = inspection.validations ?? {};

    const validations_html = Object.keys(answers).length === 0
        ? `<p class="empty">Sin registrar.</p>`
        : VALIDATION_SECTIONS.map(function (section) {

            const rows = section.items.map(function (item) {

                const value = answers[item.key] ?? "Sin respuesta";
                const value_class = { "Conforme": "ok", "No conforme": "bad", "N/A": "na" }[value] ?? "none";

                return `<div class="check"><span>${escape_html(item.text)}</span><span class="value ${value_class}">${escape_html(value)}</span></div>`;

            }).join("");

            return `<div class="check_section"><h3>${escape_html(section.title)}</h3>${rows}</div>`;

        }).join("");


    /* ----- Defectos ----- */
    const details = inspection.defect_details ?? [];
    let defects_html = `<p class="empty">${inspection.result === "Rechazado" ? "Sin registrar." : "La inspección no tiene defectos por registrar."}</p>`;

    if (details.length > 0) {

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

        defects_html = `<table>
            <thead><tr><th>#</th><th>CTQ</th><th>Code</th><th>Defect Classification</th><th>Foto</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
    }


    /* ----- Evidencias ----- */
    const evidence = Object.entries(inspection.evidence ?? {})
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
<title>Reporte PO ${escape_html(inspection.po_number)}</title>
<style>
    @page { size: letter; margin: 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #142b49; font-size: 12px; background: #e9edf3; }

    /* En pantalla: hoja blanca centrada con márgenes, como una página */
    .page { max-width: 900px; margin: 30px auto; padding: 40px 48px; background: #ffffff; box-shadow: 0 4px 18px rgba(11, 40, 87, 0.12); }

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
    .check_section h3 { font-size: 12px; margin: 8px 0 4px; }
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
</style>
</head>
<body>
<div class="page">
    <header>
        <div>
            <div class="brand">Control<span>ix</span></div>
            <div class="subtitle">Reporte de inspección</div>
        </div>
        <div class="generated">Generado: ${escape_html(get_date_time())}<br>Por: ${escape_html(generated_by)}</div>
    </header>

    <div class="bar">Detalles de PO y de inspección</div>
    <div class="fields">
        <div>
            ${summary_field("PO", inspection.po_number)}
            ${summary_field("Modelo / Artículo", `${quantities[2] ?? "—"} · ${quantities[3] ?? "—"}`)}
            ${summary_field("Color", quantities[4])}
            ${summary_field("Cantidad", get_pos_quantity(inspection.po_id))}
        </div>
        <div>
            ${summary_field("Tipo de inspección", inspection.type_name)}
            ${summary_field("Nivel", inspection.level)}
            ${summary_field("Inspector", inspection.inspector)}
            ${summary_field("Fecha de asignación", inspection.date_time)}
        </div>
    </div>

    <div class="bar">Resultado AQL</div>
    ${result_html}

    <div class="bar">Validaciones y listas de verificación</div>
    ${validations_html}

    <div class="bar">Defectos registrados</div>
    ${defects_html}

    <div class="bar">Evidencias</div>
    ${evidence_html}
</div>
</body>
</html>`;
}


// Abrir el reporte en otra ventana y mostrar la opción de imprimir / guardar como PDF.
function download_summary() {

    if (!summary_inspection) {
        alert("Selecciona una inspección.");
        return;
    }

    const report = window.open("", "_blank");

    // El navegador bloqueó la ventana emergente.
    if (!report) {
        alert("Permite las ventanas emergentes de este sitio para descargar el reporte.");
        return;
    }

    report.document.open();
    report.document.write(build_summary_html(summary_inspection));
    report.document.close();

    // Esperar a que carguen las fotos antes de imprimir.
    const images = [...report.document.images];

    Promise.all(images.map(image => image.complete
        ? Promise.resolve()
        : new Promise(resolve => { image.onload = resolve; image.onerror = resolve; })
    )).then(function () {
        report.focus();
        report.print();
    });
}



/* -------------------------------------  BLOQUE:  Eventos de Resumen ------------------------------------- */

document.addEventListener("change", function (event) {

    // Elegir otra inspección.
    if (event.target.matches("#summary_inspection")) {
        load_summary_inspection(event.target.value);
    }
});

document.addEventListener("click", function (event) {

    // Descargar el reporte.
    if (event.target.closest("#btn_download_summary")) {
        download_summary();
    }
});