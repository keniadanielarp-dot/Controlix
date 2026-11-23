/* -------------------------------------  BLOQUE:  Opción General (evidencias) ------------------------------------- */

// Este archivo usa variables y funciones de pos.js
// (pos_inspections y get_date_time), por eso se carga DESPUÉS de pos.js en dashboard_admin.html.


// Fotos de la inspección elegida mientras se editan: { china_hangtag: [File, File], others: [File] ... }
let evidence_photos = {};

// Inspección elegida en el select.
let evidence_inspection = null;

// Direcciones temporales de las miniaturas (para liberarlas al cambiar de inspección).
let evidence_urls = [];


// Preparar la opción General al abrirla.
function init_general_module() {

    fill_evidence_inspections();
    load_evidence_inspection(null);
}


/* ==========================================
   SELECT DE INSPECCIONES
========================================== */

// Llenar el select con todas las inspecciones (la más reciente primero).
function fill_evidence_inspections() {

    const select = document.getElementById("evidence_inspection");
    if (!select) return;

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
}


// Mostrar los datos y las fotos de la inspección elegida.
function load_evidence_inspection(value) {

    if (value) {
        const [po_id, index] = value.split("|");
        evidence_inspection = pos_inspections[po_id]?.[index] ?? null;
    } else {
        evidence_inspection = null;
    }

    // Copiar las fotos guardadas (para poder cancelar sin perderlas).
    evidence_photos = {};

    Object.entries(evidence_inspection?.evidence ?? {}).forEach(function ([item, files]) {
        evidence_photos[item] = [...files];
    });

    // Datos de la inspección.
    document.getElementById("evidence_inspector").textContent = evidence_inspection?.inspector ?? "—";
    document.getElementById("evidence_status").textContent = evidence_inspection?.result ?? "—";

    // Sin inspección no se pueden subir fotos.
    document.querySelectorAll(".btn_evidence, .evidence_input_take, .evidence_input_upload, #btn_save_evidence")
        .forEach(element => element.disabled = !evidence_inspection);

    document.querySelector(".evidence_dropzone")?.classList.toggle("disabled", !evidence_inspection);

    render_all_evidence();
}


/* ==========================================
   FOTOS
========================================== */

// Agregar fotos a un renglón.
function add_evidence_photos(item, files) {

    const images = [...files].filter(file => file.type.startsWith("image/"));

    if (images.length === 0) return;

    evidence_photos[item] = [...(evidence_photos[item] ?? []), ...images];

    render_all_evidence();
}


// Quitar una foto de un renglón.
function remove_evidence_photo(item, position) {

    evidence_photos[item]?.splice(position, 1);

    render_all_evidence();
}


// Dibujar las miniaturas y los contadores de todos los renglones.
function render_all_evidence() {

    // Liberar las miniaturas anteriores.
    evidence_urls.forEach(url => URL.revokeObjectURL(url));
    evidence_urls = [];

    document.querySelectorAll(".evidence_row").forEach(function (row) {

        const item = row.dataset.item;
        const files = evidence_photos[item] ?? [];

        // Miniaturas con botón para quitar.
        const thumbs = row.querySelector(".evidence_thumbs");
        thumbs.innerHTML = "";

        files.forEach(function (file, position) {

            const url = URL.createObjectURL(file);
            evidence_urls.push(url);

            const box = document.createElement("div");
            box.className = "evidence_thumb";

            const link = document.createElement("a");
            link.href = url;
            link.target = "_blank";
            link.rel = "noopener";
            link.setAttribute("aria-label", `Ver foto ${position + 1}`);

            const image = document.createElement("img");
            image.src = url;
            image.alt = file.name;

            const remove = document.createElement("button");
            remove.type = "button";
            remove.className = "btn_evidence_remove";
            remove.dataset.item = item;
            remove.dataset.position = position;
            remove.setAttribute("aria-label", `Quitar foto ${position + 1}`);
            remove.innerHTML = '<i class="bi bi-x"></i>';

            link.appendChild(image);
            box.appendChild(link);
            box.appendChild(remove);
            thumbs.appendChild(box);
        });

        // Etiqueta "Sin fotos" / "2 fotos" (Otros no la tiene).
        const count = row.querySelector(".evidence_count");

        if (count) {
            count.textContent = files.length === 0 ? "Sin fotos" : photo_text(files.length);
            count.classList.toggle("has_photos", files.length > 0);
        }
    });

    // Fotos de cada categoría.
    document.querySelectorAll(".evidence_section").forEach(function (section) {

        const total = [...section.querySelectorAll(".evidence_row")]
            .reduce((sum, row) => sum + (evidence_photos[row.dataset.item]?.length ?? 0), 0);

        section.querySelector(".evidence_summary_count").textContent = photo_text(total);
    });

    // Total de la inspección.
    const total = Object.values(evidence_photos).reduce((sum, files) => sum + files.length, 0);
    document.getElementById("evidence_total").textContent = photo_text(total);
}


// "1 foto" / "3 fotos".
function photo_text(total) {
    return `${total} ${total === 1 ? "foto" : "fotos"}`;
}


// Guardar las fotos en la inspección.
function save_evidence() {

    if (!evidence_inspection) {
        alert("Selecciona una inspección.");
        return;
    }

    evidence_inspection.evidence = {};

    Object.entries(evidence_photos).forEach(function ([item, files]) {
        if (files.length > 0) evidence_inspection.evidence[item] = [...files];
    });

    evidence_inspection.evidence_at = get_date_time();

    alert("Evidencias guardadas.");

    console.log("Evidencias de la PO:", evidence_inspection.po_number);
    console.table(Object.fromEntries(
        Object.entries(evidence_inspection.evidence).map(([item, files]) => [item, files.length])
    ));
}



/* -------------------------------------  BLOQUE:  Eventos de General ------------------------------------- */

/* ==========================================
   CHANGE
========================================== */

document.addEventListener("change", function (event) {

    const target = event.target;

    // Elegir otra inspección.
    if (target.matches("#evidence_inspection")) {
        load_evidence_inspection(target.value);
    }

    // Fotos tomadas o elegidas en un renglón.
    if (target.matches(".evidence_row .evidence_input_take, .evidence_row .evidence_input_upload")) {

        add_evidence_photos(target.closest(".evidence_row").dataset.item, target.files);

        // Vaciar el campo para poder elegir la misma foto otra vez.
        target.value = "";
    }
});


/* ==========================================
   CLICK
========================================== */

document.addEventListener("click", function (event) {

    const target = event.target;

    // Cámara: abrir la cámara del renglón.
    const take = target.closest(".btn_evidence_take");

    if (take) {
        take.closest(".evidence_row").querySelector(".evidence_input_take").click();
        return;
    }

    // Galería o +: abrir los archivos del renglón.
    const upload = target.closest(".btn_evidence_upload, .btn_evidence_add");

    if (upload) {
        upload.closest(".evidence_row").querySelector(".evidence_input_upload").click();
        return;
    }

    // Quitar una foto.
    const remove = target.closest(".btn_evidence_remove");

    if (remove) {
        remove_evidence_photo(remove.dataset.item, Number(remove.dataset.position));
        return;
    }

    // Otros sin inspección: no abrir los archivos.
    if (target.closest(".evidence_dropzone.disabled")) {
        event.preventDefault();
        return;
    }

    // Guardar evidencias.
    if (target.closest("#btn_save_evidence")) {
        save_evidence();
        return;
    }

    // Cancelar: regresar a las fotos guardadas.
    if (target.closest("#btn_cancel_evidence")) {
        load_evidence_inspection(document.getElementById("evidence_inspection")?.value);
    }
});


/* ==========================================
   ARRASTRAR FOTOS A "OTROS"
========================================== */

document.addEventListener("dragover", function (event) {

    const zone = event.target.closest(".evidence_dropzone");

    if (zone && evidence_inspection) {
        event.preventDefault();
        zone.classList.add("dragging");
    }
});

document.addEventListener("dragleave", function (event) {
    event.target.closest(".evidence_dropzone")?.classList.remove("dragging");
});

document.addEventListener("drop", function (event) {

    const zone = event.target.closest(".evidence_dropzone");
    if (!zone) return;

    event.preventDefault();
    zone.classList.remove("dragging");

    if (evidence_inspection) {
        add_evidence_photos("others", event.dataTransfer.files);
    }
});