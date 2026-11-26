/* -------------------------------------  BLOQUE:  Opción General (evidencias) ------------------------------------- */

// Este archivo usa variables y funciones de pos.js
// (pos_inspections, get_pos_by_id y get_date_time), por eso se carga DESPUÉS de pos.js en dashboard_admin.html.


// Evidencias guardadas por PO: { po_id: { evidence: { china_hangtag: [File] ... }, evidence_at: "..." } }
let pos_evidence = {};

// Fotos de la PO elegida mientras se editan: { china_hangtag: [File, File], others: [File] ... }
let evidence_photos = {};

// PO elegida en el select.
let evidence_po_id = null;

// Direcciones temporales de las miniaturas (para liberarlas al cambiar de PO).
let evidence_urls = [];


// Preparar la opción General al abrirla.
async function init_general_module() {

    // Traer las inspecciones guardadas (después de F5 o de iniciar sesión).
    await load_inspections_from_db();

    fill_evidence_pos();
    load_evidence_po(null);
}


// Evidencias guardadas de una PO (también las usa Resumen).
function get_po_evidence(po_id) {
    return pos_evidence[po_id]?.evidence ?? {};
}


/* ==========================================
   SELECT DE PO ASIGNADAS
========================================== */

// Número de la PO (columna "POs Adidas").
function get_evidence_po_number(po_id) {
    return get_pos_by_id(po_id)?.quantities[1] ?? pos_inspections[po_id]?.at(-1)?.po_number ?? po_id;
}


// Llenar el select con las PO que ya tienen un tipo de inspección asignado.
function fill_evidence_pos() {

    const select = document.getElementById("evidence_po");
    if (!select) return;

    select.innerHTML = '<option value="">Seleccione una PO</option>';

    Object.entries(pos_inspections)
        .filter(([po_id, inspections]) => inspections.length > 0)
        .forEach(function ([po_id, inspections]) {

            const last = inspections.at(-1);

            const option = document.createElement("option");
            option.value = po_id;
            option.textContent = `PO ${get_evidence_po_number(po_id)} · ${last.type_name}`;
            select.appendChild(option);
        });
}


// Mostrar los datos y las fotos de la PO elegida.
function load_evidence_po(po_id) {

    evidence_po_id = po_id || null;

    // Copiar las fotos guardadas (para poder cancelar sin perderlas).
    evidence_photos = {};

    Object.entries(evidence_po_id ? get_po_evidence(evidence_po_id) : {}).forEach(function ([item, files]) {
        evidence_photos[item] = [...files];
    });

    // Inspector y estado de su inspección más reciente.
    const last = evidence_po_id ? (pos_inspections[evidence_po_id] ?? []).at(-1) : null;

    document.getElementById("evidence_inspector").textContent = last?.inspector ?? "—";
    document.getElementById("evidence_status").textContent =
        !evidence_po_id ? "—" : (last?.result ?? "Sin inspección");

    // Sin PO no se pueden subir fotos.
    document.querySelectorAll(".btn_evidence, .evidence_input_take, .evidence_input_upload, #btn_save_evidence")
        .forEach(element => element.disabled = !evidence_po_id);

    document.querySelector(".evidence_dropzone")?.classList.toggle("disabled", !evidence_po_id);

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


// Guardar las fotos en la PO.
function save_evidence() {

    if (!evidence_po_id) {
        alert("Selecciona una PO.");
        return;
    }

    const evidence = {};

    Object.entries(evidence_photos).forEach(function ([item, files]) {
        if (files.length > 0) evidence[item] = [...files];
    });

    pos_evidence[evidence_po_id] = {
        evidence: evidence,
        evidence_at: get_date_time()
    };

    alert("Evidencias guardadas.");

    console.log("Evidencias de la PO:", get_evidence_po_number(evidence_po_id));
    console.table(Object.fromEntries(
        Object.entries(evidence).map(([item, files]) => [item, files.length])
    ));
}



/* -------------------------------------  BLOQUE:  Eventos de General ------------------------------------- */

/* ==========================================
   CHANGE
========================================== */

document.addEventListener("change", function (event) {

    const target = event.target;

    // Elegir otra PO.
    if (target.matches("#evidence_po")) {
        load_evidence_po(target.value);
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

    // Cámara: abrir la cámara de la computadora o del teléfono.
    const take = target.closest(".btn_evidence_take");

    if (take) {

        const row = take.closest(".evidence_row");

        open_camera(
            file => add_evidence_photos(row.dataset.item, [file]),
            row.querySelector(".evidence_input_take")
        );
        return;
    }

    // Galería: abrir los archivos del renglón.
    const upload = target.closest(".btn_evidence_upload");

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

    // Otros sin PO: no abrir los archivos.
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
        load_evidence_po(document.getElementById("evidence_po")?.value);
    }
});


/* ==========================================
   ARRASTRAR FOTOS A "OTROS"
========================================== */

document.addEventListener("dragover", function (event) {

    const zone = event.target.closest(".evidence_dropzone");

    if (zone && evidence_po_id) {
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

    if (evidence_po_id) {
        add_evidence_photos("others", event.dataTransfer.files);
    }
});