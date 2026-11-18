/* -------------------------------------  BLOQUE:  Opción Defectos ------------------------------------- */

// Este archivo usa variables y funciones de pos.js
// (pos_inspections, create_cell, get_pos_date, get_date_time, open_form,
// close_form y update_defects_badge),
// por eso se carga DESPUÉS de pos.js en dashboard_admin.html.


// CTQ activos de la base de datos: [{ id_ctq, num_ctq, name_ctq }].
let defect_ctqs = [];

// Codes activos de la base de datos: [{ id_code_ctq, code_ctq, name_code }].
let defect_codes = [];

// Clasificaciones activas de la tabla defects: [{ id_def, id_ctq, id_code_ctq, num, def_class }].
let defect_classes = [];


// Preparar la opción Defectos al abrirla.
async function init_defects_module() {

    render_defects_table();

    // Traer los catálogos solo la primera vez.
    await load_defect_catalogs();
}


// Traer de PHP los catálogos que todavía no se tienen.
async function load_defect_catalogs() {

    if (defect_ctqs.length === 0) await load_defect_ctqs();
    if (defect_codes.length === 0) await load_defect_codes();
    if (defect_classes.length === 0) await load_defect_classes();
}


// Consultar en PHP los CTQ activos.
async function load_defect_ctqs() {

    try {

        const response = await fetch("/sistema_calidad/php/pos.php?action=ctqs");

        // Detener si el servidor respondió con error (404, 500...).
        if (!response.ok) {
            throw new Error(`El servidor respondió ${response.status} (${response.statusText})`);
        }

        const result = await response.json();

        // Verificar que PHP respondió correctamente.
        if (!result.success) {
            throw new Error(result.message || "No se pudieron consultar los CTQ.");
        }

        defect_ctqs = result.ctqs;

    } catch (error) {

        console.error("Error al cargar los CTQ:", error);

    }
}


// Consultar en PHP los Codes activos.
async function load_defect_codes() {

    try {

        const response = await fetch("/sistema_calidad/php/pos.php?action=code_ctqs");

        // Detener si el servidor respondió con error (404, 500...).
        if (!response.ok) {
            throw new Error(`El servidor respondió ${response.status} (${response.statusText})`);
        }

        const result = await response.json();

        // Verificar que PHP respondió correctamente.
        if (!result.success) {
            throw new Error(result.message || "No se pudieron consultar los Codes.");
        }

        defect_codes = result.codes;

    } catch (error) {

        console.error("Error al cargar los Codes:", error);

    }
}


// Consultar en PHP las clasificaciones activas (tabla defects).
async function load_defect_classes() {

    try {

        const response = await fetch("/sistema_calidad/php/pos.php?action=defect_classes");

        // Detener si el servidor respondió con error (404, 500...).
        if (!response.ok) {
            throw new Error(`El servidor respondió ${response.status} (${response.statusText})`);
        }

        const result = await response.json();

        // Verificar que PHP respondió correctamente.
        if (!result.success) {
            throw new Error(result.message || "No se pudieron consultar las clasificaciones.");
        }

        defect_classes = result.defect_classes;

    } catch (error) {

        console.error("Error al cargar las clasificaciones:", error);

    }
}


// Saber si una inspección rechazada ya tiene sus defectos registrados.
function has_defect_details(inspection) {
    return (inspection.defect_details ?? []).length > 0;
}


// Convertir "18/11/2026 11:12" en "2026-11" para comparar con el filtro de mes.
function get_month_from_date_time(date_time) {

    const [date] = String(date_time ?? "").split(" ");
    const [, month, year] = date.split("/");

    return year && month ? `${year}-${month}` : "";
}


// Mes actual en formato "2026-11".
function get_current_month() {
    return get_pos_date().slice(0, 7);
}


/* ==========================================
   CUADROS DE RESUMEN
========================================== */

// Llenar los 3 cuadros con los totales.
function update_defects_summary() {

    // Todas las inspecciones rechazadas.
    const rejected = Object.values(pos_inspections)
        .flat()
        .filter(inspection => inspection.result === "Rechazado");

    const pending = rejected.filter(inspection => !has_defect_details(inspection));
    const registered = rejected.filter(inspection => has_defect_details(inspection));

    // Contar los defectos registrados este mes (uno por renglón).
    const month_total = registered
        .filter(inspection => get_month_from_date_time(inspection.result_date_time) === get_current_month())
        .flatMap(inspection => inspection.defect_details)
        .length;

    const set_text = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };

    set_text("defects_pending_total", pending.length);
    set_text("defects_registered_total", registered.length);
    set_text("defects_month_total", month_total);
}


/* ==========================================
   TABLA DE INSPECCIONES RECHAZADAS
========================================== */

// Mostrar una fila por cada inspección rechazada.
function render_defects_table() {

    const body = document.getElementById("defects_table_body");
    if (!body) return;

    // Valores del buscador y del filtro de mes.
    const search_text = (document.getElementById("search_defects")?.value ?? "")
        .trim()
        .toLowerCase();

    const selected_month = document.getElementById("filter_def_month")?.value ?? "";

    // Juntar las inspecciones rechazadas con su PO y su posición en el historial.
    const rows = Object.entries(pos_inspections)
        .flatMap(function ([po_id, inspections]) {
            return inspections.map(function (inspection, index) {
                return { po_id: po_id, index: index, inspection: inspection };
            });
        })

        // Solo las rechazadas.
        .filter(row => row.inspection.result === "Rechazado")

        // Buscador y filtro de mes.
        .filter(function (row) {

            const inspection = row.inspection;

            const matches_search =
                String(inspection.po_number ?? "").toLowerCase().includes(search_text) ||
                String(inspection.type_name ?? "").toLowerCase().includes(search_text);

            const matches_month =
                selected_month === "" ||
                get_month_from_date_time(inspection.result_date_time) === selected_month;

            return matches_search && matches_month;
        })

        // La rechazada más reciente primero.
        .sort((a, b) => b.inspection.id - a.inspection.id);

    // Limpiar filas anteriores y desmarcar "Seleccionar todo".
    body.innerHTML = "";

    const select_all = document.getElementById("select_all_defects");
    if (select_all) select_all.checked = false;

    // Actualizar "Total de registros" y los cuadros.
    const total = document.getElementById("defects_total_records");
    if (total) total.textContent = rows.length;

    update_defects_summary();

    // Sin rechazadas: mostrar el mensaje.
    if (rows.length === 0) {

        const has_rejected = Object.values(pos_inspections)
            .flat()
            .some(inspection => inspection.result === "Rechazado");

        const message = has_rejected
            ? "No se encontraron inspecciones con esos filtros."
            : "No hay inspecciones rechazadas.";

        const tr = document.createElement("tr");
        const td = create_cell(message);

        td.colSpan = 6;
        tr.appendChild(td);
        body.appendChild(tr);

        return;
    }


    /* ==========================================
       AGREGAR UNA FILA POR INSPECCIÓN
    ========================================== */

    rows.forEach(function (row, position) {

        const inspection = row.inspection;
        const tr = document.createElement("tr");

        // Casilla para seleccionar la inspección.
        const td_check = document.createElement("td");
        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.className = "select_def_check";
        checkbox.value = `${row.po_id}|${row.index}`;
        checkbox.setAttribute("aria-label", `Seleccionar PO ${inspection.po_number}`);

        td_check.appendChild(checkbox);
        tr.appendChild(td_check);

        tr.appendChild(create_cell(position + 1));
        tr.appendChild(create_cell(inspection.po_number));
        tr.appendChild(create_cell(inspection.type_name));

        // Defectos encontrados al registrar el resultado.
        tr.appendChild(create_cell(inspection.defects ?? "—"));

        // Botón ojo para ver los defectos registrados.
        const td_view = document.createElement("td");
        const button = document.createElement("button");

        button.type = "button";
        button.className = "btn_defect_view";
        button.dataset.idPo = row.po_id;
        button.dataset.index = row.index;
        button.setAttribute("aria-label", `Ver defectos de la PO ${inspection.po_number}`);

        const icon = document.createElement("i");
        icon.className = "bi bi-eye-fill";

        button.appendChild(icon);
        td_view.appendChild(button);
        tr.appendChild(td_view);

        body.appendChild(tr);
    });
}


// Marcar "Seleccionar todo" solo si todas las filas están marcadas.
function update_select_all_defects() {

    const select_all = document.getElementById("select_all_defects");
    if (!select_all) return;

    const checkboxes = [...document.querySelectorAll("#defects_table_body .select_def_check")];

    select_all.checked =
        checkboxes.length > 0 &&
        checkboxes.every(checkbox => checkbox.checked);
}



/* -------------------------------------  BLOQUE:  Registrar defectos ------------------------------------- */

// Abrir el modal Registrar defectos con la inspección seleccionada.
async function open_register_defects() {

    const selected = [...document.querySelectorAll("#defects_table_body .select_def_check:checked")]
        .map(checkbox => checkbox.value);

    // Debe haber exactamente una inspección seleccionada.
    if (selected.length !== 1) {
        alert(
            selected.length === 0
                ? "Selecciona una PO para registrar sus defectos."
                : "Solo puedes registrar los defectos de una PO a la vez."
        );
        return;
    }

    const [po_id, index] = selected[0].split("|");
    const inspection = pos_inspections[po_id]?.[index];

    if (!inspection) {
        alert("No se encontró la inspección seleccionada.");
        return;
    }

    // Si los catálogos todavía no llegan de PHP, esperarlos.
    await load_defect_catalogs();


    /* ==========================================
       MOSTRAR DATOS EN EL MODAL
    ========================================== */

    open_form("register_defects_js", true);

    const form = document.getElementById("form_register_defects");
    form.dataset.idPo = po_id;
    form.dataset.index = index;

    document.getElementById("def_info_po").textContent = inspection.po_number;
    document.getElementById("def_info_type").textContent = inspection.type_name;
    document.getElementById("def_info_inspector").textContent = inspection.inspector;
    document.getElementById("def_info_load").textContent =
        `${inspection.load_size ?? "—"} · ${inspection.sample_size ?? "—"} piezas`;
    document.getElementById("def_info_found").textContent = inspection.defects ?? 0;

    hide_defect_error();

    // Limpiar renglones anteriores.
    const body = document.getElementById("def_rows_body");
    body.innerHTML = "";

    // Si ya tenía defectos registrados, mostrarlos para editarlos.
    const details = inspection.defect_details ?? [];

    if (details.length > 0) {
        details.forEach(detail => add_defect_row(detail));
    } else {

        // Un renglón por cada defecto encontrado (mínimo uno).
        const found = Math.max(Number(inspection.defects ?? 0), 1);

        for (let i = 0; i < found; i++) {
            add_defect_row();
        }
    }

    update_defect_count();
}


// Crear un select con sus opciones.
function create_select(first_text, options, selected_value, class_name, label) {

    const select = document.createElement("select");
    select.className = class_name;
    select.setAttribute("aria-label", label);

    const first = document.createElement("option");
    first.value = "";
    first.textContent = first_text;
    select.appendChild(first);

    // Cada opción puede ser un texto o un objeto { value, text }.
    options.forEach(function (item) {

        const value = typeof item === "object" ? String(item.value) : item;
        const text = typeof item === "object" ? item.text : item;

        const option = document.createElement("option");
        option.value = value;
        option.textContent = text;
        option.selected = value === String(selected_value ?? "");
        select.appendChild(option);
    });

    return select;
}


// Opciones de Code que pertenecen a un CTQ, con número y descripción juntos.
function get_code_options(id_ctq) {

    if (!id_ctq) return [];

    // Codes que la tabla defects relaciona con ese CTQ.
    const code_ids = new Set(
        defect_classes
            .filter(item => String(item.id_ctq) === String(id_ctq))
            .map(item => String(item.id_code_ctq))
    );

    return defect_codes
        .filter(code => code_ids.has(String(code.id_code_ctq)))
        .map(function (code) {
            return {
                value: code.id_code_ctq,
                text: `${code.code_ctq} - ${code.name_code}`
            };
        });
}


// Opciones de Defect Classification que pertenecen a un CTQ y a un Code,
// con número y descripción juntos ("11.2 - Battery containing/Electronics").
function get_class_options(id_ctq, id_code_ctq) {

    if (!id_ctq || !id_code_ctq) return [];

    return defect_classes
        .filter(function (item) {
            return String(item.id_ctq) === String(id_ctq) &&
                String(item.id_code_ctq) === String(id_code_ctq);
        })
        .map(function (item) {
            return {
                value: item.id_def,
                text: `${item.num} - ${item.def_class}`
            };
        });
}


// Volver a llenar el select de Defect Classification de un renglón cuando cambia su Code.
function refresh_class_select(row) {

    const id_ctq = row.querySelector(".def_ctq").value;
    const id_code_ctq = row.querySelector(".def_code").value;
    const old_select = row.querySelector(".def_classification");

    const new_select = create_select(
        "Seleccione",
        get_class_options(id_ctq, id_code_ctq),
        "",
        "def_classification",
        old_select.getAttribute("aria-label")
    );

    // Sin Code no se puede elegir la clasificación.
    new_select.disabled = id_code_ctq === "";

    old_select.replaceWith(new_select);
}


// Volver a llenar el select de Code de un renglón cuando cambia su CTQ.
function refresh_code_select(row) {

    const id_ctq = row.querySelector(".def_ctq").value;
    const old_select = row.querySelector(".def_code");

    const new_select = create_select(
        "Seleccione",
        get_code_options(id_ctq),
        "",
        "def_code",
        old_select.getAttribute("aria-label")
    );

    // Sin CTQ no se puede elegir Code.
    new_select.disabled = id_ctq === "";

    old_select.replaceWith(new_select);
}


// Crear un botón con ícono.
function create_icon_button(class_name, icon_class, label) {

    const button = document.createElement("button");
    button.type = "button";
    button.className = class_name;
    button.setAttribute("aria-label", label);

    const icon = document.createElement("i");
    icon.className = icon_class;
    button.appendChild(icon);

    return button;
}


// Agregar un renglón de defecto (vacío o con datos guardados).
function add_defect_row(detail = {}) {

    const body = document.getElementById("def_rows_body");
    if (!body) return;

    const number = body.rows.length + 1;
    const tr = document.createElement("tr");

    const add_td = function (...elements) {
        const td = document.createElement("td");
        elements.forEach(element => td.appendChild(element));
        tr.appendChild(td);
    };

    // Número de renglón.
    const td_number = create_cell(number);
    td_number.className = "def_row_number";
    tr.appendChild(td_number);

    // CTQ: número y descripción juntos ("10 - External Compliance").
    const ctq_options = defect_ctqs.map(function (ctq) {
        return {
            value: ctq.id_ctq,
            text: `${ctq.num_ctq} - ${ctq.name_ctq}`
        };
    });

    add_td(create_select("Seleccione", ctq_options, detail.ctq, "def_ctq", `CTQ ${number}`));
    // Code: solo los del CTQ elegido (se desactiva si no hay CTQ).
    const code_select = create_select("Seleccione", get_code_options(detail.ctq), detail.code, "def_code", `Code ${number}`);
    code_select.disabled = !detail.ctq;

    add_td(code_select);

    // Defect Classification: solo las del Code elegido (se desactiva si no hay Code).
    const class_select = create_select(
        "Seleccione",
        get_class_options(detail.ctq, detail.code),
        detail.classification,
        "def_classification",
        `Defect Classification ${number}`
    );
    class_select.disabled = !detail.code;

    add_td(class_select);


    /* ==========================================
       FOTO (CÁMARA)
    ========================================== */

    const photo_button = create_icon_button("btn_defect_photo", "bi bi-camera-fill", `Foto del defecto ${number}`);
    photo_button.setAttribute("aria-haspopup", "menu");
    photo_button.setAttribute("aria-expanded", "false");

    // Campos ocultos: uno abre la cámara y otro los archivos.
    const take_input = document.createElement("input");
    take_input.type = "file";
    take_input.accept = "image/*";
    take_input.setAttribute("capture", "environment");
    take_input.className = "def_photo def_photo_take";
    take_input.hidden = true;

    const upload_input = document.createElement("input");
    upload_input.type = "file";
    upload_input.accept = "image/*";
    upload_input.className = "def_photo def_photo_upload";
    upload_input.hidden = true;

    // Conservar la foto que ya tenía el renglón.
    if (detail.photo) {
        tr.photo_file = detail.photo;
        mark_photo(photo_button, detail.photo);
    }

    add_td(photo_button, take_input, upload_input);

    // Botón para quitar el renglón.
    add_td(create_icon_button("btn_defect_remove", "bi bi-trash3", `Quitar defecto ${number}`));

    body.appendChild(tr);
}


// Renglón cuyo botón de cámara abrió el submenú.
let photo_menu_row = null;


// Mostrar el submenú Tomar foto / Subir foto debajo del botón de cámara.
function open_photo_menu(button) {

    const menu = document.getElementById("photo_menu");
    if (!menu) return;

    // Si ya estaba abierto en el mismo botón, cerrarlo.
    if (!menu.hidden && photo_menu_row === button.closest("tr")) {
        close_photo_menu();
        return;
    }

    close_photo_menu();

    photo_menu_row = button.closest("tr");
    button.setAttribute("aria-expanded", "true");

    // Posición fija para que la tabla con scroll no lo recorte.
    const box = button.getBoundingClientRect();

    menu.hidden = false;
    menu.style.top = `${box.bottom + 6}px`;
    menu.style.left = `${Math.max(box.right - menu.offsetWidth, 8)}px`;

    menu.querySelector("button")?.focus();
}


// Ocultar el submenú de foto.
function close_photo_menu() {

    const menu = document.getElementById("photo_menu");
    if (!menu || menu.hidden) return;

    menu.hidden = true;

    photo_menu_row
        ?.querySelector(".btn_defect_photo")
        ?.setAttribute("aria-expanded", "false");

    photo_menu_row = null;
}


// Pintar el botón de cámara cuando el renglón ya tiene foto.
function mark_photo(button, file) {

    button.classList.add("has_photo");
    button.title = file.name;
    button.setAttribute("aria-label", `Foto: ${file.name}`);
}


// Quitar un renglón y volver a numerar los demás.
function remove_defect_row(button) {

    const body = document.getElementById("def_rows_body");

    // Dejar al menos un renglón: si es el último, solo vaciarlo.
    if (body.rows.length === 1) {
        body.innerHTML = "";
        add_defect_row();
    } else {
        button.closest("tr").remove();
    }

    [...body.rows].forEach(function (row, position) {
        row.querySelector(".def_row_number").textContent = position + 1;
    });

    update_defect_count();
}


// Saber si un renglón tiene sus tres selects llenos.
function is_defect_row_complete(row) {
    return [...row.querySelectorAll("select")].every(select => select.value !== "");
}


// Actualizar "Registrados: X de Y" (un defecto por renglón completo).
function update_defect_count() {

    const count = document.getElementById("def_count");
    if (!count) return 0;

    const found = Number(document.getElementById("def_info_found")?.textContent ?? 0);

    const registered = [...document.querySelectorAll("#def_rows_body tr")]
        .filter(is_defect_row_complete)
        .length;

    count.textContent = `Registrados: ${registered} de ${found}`;

    // Verde cuando coincide con los defectos encontrados.
    count.classList.toggle("def_count_complete", registered === found);

    return registered;
}


// Mostrar el mensaje de error del formulario.
function show_defect_error(text) {

    const error = document.getElementById("def_error");
    if (!error) return;

    error.textContent = text;
    error.hidden = false;
}


// Ocultar el mensaje de error del formulario.
function hide_defect_error() {

    const error = document.getElementById("def_error");
    if (error) error.hidden = true;
}


// Validar los renglones y guardar los defectos en la inspección.
function save_defects(form) {

    const inspection = pos_inspections[form.dataset.idPo]?.[form.dataset.index];
    if (!inspection) return;

    const rows = [...document.querySelectorAll("#def_rows_body tr")];
    const details = [];
    let first_error = null;

    hide_defect_error();

    // Quitar bordes rojos anteriores.
    form.querySelectorAll(".border_error").forEach(field => field.classList.remove("border_error"));


    /* ==========================================
       VALIDAR CADA RENGLÓN
    ========================================== */

    rows.forEach(function (row, position) {

        const number = position + 1;
        const ctq = row.querySelector(".def_ctq");
        const code = row.querySelector(".def_code");
        const classification = row.querySelector(".def_classification");

        // Los tres selects son obligatorios.
        [
            [ctq, "el CTQ"],
            [code, "el Code"],
            [classification, "la clasificación"]
        ].forEach(function ([select, name]) {

            if (select.value === "") {
                select.classList.add("border_error");

                if (!first_error) {
                    first_error = { field: select, message: `Renglón ${number}: seleccione ${name}.` };
                }
            }
        });

        details.push({
            ctq: ctq.value,
            ctq_text: ctq.options[ctq.selectedIndex].text,
            code: code.value,
            code_text: code.options[code.selectedIndex].text,
            classification: classification.value,
            classification_text: classification.options[classification.selectedIndex].text,
            photo: row.photo_file ?? null
        });
    });

    if (first_error) {
        show_defect_error(first_error.message);
        first_error.field.focus();
        return;
    }

    // Debe haber un renglón por cada defecto encontrado.
    const found = Number(inspection.defects ?? 0);

    if (details.length !== found) {
        show_defect_error(
            `Registra ${found} ${found === 1 ? "defecto" : "defectos"}: llevas ${details.length}.`
        );
        return;
    }


    /* ==========================================
       GUARDAR EN LA INSPECCIÓN
    ========================================== */

    inspection.defect_details = details;
    inspection.defects_registered_at = get_date_time();

    // Actualizar el número rojo, la tabla y los cuadros.
    update_defects_badge();
    render_defects_table();

    close_form("register_defects_js");

    console.log("Defectos registrados en PO:", inspection.po_number);
    console.table(details);
}



/* -------------------------------------  BLOQUE:  Ver defectos ------------------------------------- */

// Direcciones temporales de las fotos que se están mostrando (para liberarlas al cerrar).
let view_photo_urls = [];


// Abrir el modal Ver defectos de una inspección.
function open_view_defects(po_id, index) {

    const inspection = pos_inspections[po_id]?.[index];
    if (!inspection) return;

    const details = inspection.defect_details ?? [];

    // Sin defectos registrados no hay nada que mostrar.
    if (details.length === 0) {
        alert(`La PO ${inspection.po_number} todavía no tiene defectos registrados.`);
        return;
    }


    // Número de PO en el título.
    document.getElementById("view_def_po").textContent = inspection.po_number;


    /* ==========================================
       UNA FILA POR DEFECTO
    ========================================== */

    const body = document.getElementById("view_def_body");
    body.innerHTML = "";

    release_view_photos();

    details.forEach(function (detail, position) {

        const tr = document.createElement("tr");

        tr.appendChild(create_cell(position + 1));
        tr.appendChild(create_cell(detail.ctq_text ?? "—"));
        tr.appendChild(create_cell(detail.code_text ?? "—"));
        tr.appendChild(create_cell(detail.classification_text ?? "—"));

        // Foto: miniatura que se abre en otra pestaña, o "Sin foto".
        const td_photo = document.createElement("td");

        if (detail.photo) {

            const url = URL.createObjectURL(detail.photo);
            view_photo_urls.push(url);

            const link = document.createElement("a");
            link.href = url;
            link.target = "_blank";
            link.rel = "noopener";
            link.className = "def_photo_link";
            link.setAttribute("aria-label", `Ver foto del defecto ${position + 1}`);

            const image = document.createElement("img");
            image.src = url;
            image.alt = `Foto del defecto ${position + 1}`;
            image.className = "def_photo_thumb";

            link.appendChild(image);
            td_photo.appendChild(link);

        } else {

            const span = document.createElement("span");
            span.className = "def_no_photo";
            span.textContent = "Sin foto";
            td_photo.appendChild(span);
        }

        tr.appendChild(td_photo);
        body.appendChild(tr);
    });

    open_form("view_defects_js");
}


// Liberar las direcciones temporales de las fotos.
function release_view_photos() {
    view_photo_urls.forEach(url => URL.revokeObjectURL(url));
    view_photo_urls = [];
}


/* -------------------------------------  BLOQUE:  Eventos de Defectos ------------------------------------- */

/* ==========================================
   INPUT
========================================== */

document.addEventListener("input", function (event) {

    // Buscador de defectos.
    if (event.target.matches("#search_defects")) {
        render_defects_table();
    }

});


/* ==========================================
   CHANGE
========================================== */

document.addEventListener("change", function (event) {

    const target = event.target;

    // Filtro de mes.
    if (target.matches("#filter_def_month")) {
        render_defects_table();
    }

    // Seleccionar todas las inspecciones.
    if (target.matches("#select_all_defects")) {
        document
            .querySelectorAll("#defects_table_body .select_def_check")
            .forEach(checkbox => checkbox.checked = target.checked);
    }

    // Actualizar "Seleccionar todo" al marcar una fila.
    if (target.matches("#defects_table_body .select_def_check")) {
        update_select_all_defects();
    }

    // Al cambiar el CTQ: mostrar solo sus Codes y vaciar la clasificación.
    if (target.matches("#def_rows_body .def_ctq")) {
        refresh_code_select(target.closest("tr"));
        refresh_class_select(target.closest("tr"));
    }

    // Al cambiar el Code: mostrar solo sus clasificaciones.
    if (target.matches("#def_rows_body .def_code")) {
        refresh_class_select(target.closest("tr"));
    }

    // Al elegir una opción: quitar el error y actualizar el contador.
    if (target.matches("#def_rows_body select")) {
        target.classList.remove("border_error");
        hide_defect_error();
        update_defect_count();
    }

    // Foto elegida: guardarla en el renglón y pintar la cámara.
    if (target.matches("#def_rows_body .def_photo") && target.files.length > 0) {

        const row = target.closest("tr");
        row.photo_file = target.files[0];

        mark_photo(row.querySelector(".btn_defect_photo"), row.photo_file);
    }
});


/* ==========================================
   CLICK
========================================== */

document.addEventListener("click", function (event) {

    const target = event.target;

    // Ojo: ver los defectos registrados de la inspección.
    const view_button = target.closest(".btn_defect_view");

    if (view_button) {
        open_view_defects(view_button.dataset.idPo, Number(view_button.dataset.index));
        return;
    }

    // Cerrar Ver defectos con X o Cerrar.
    if (target.closest("#view_defects_js .btn_x_modal, #view_defects_js .btn_cancel_po")) {
        release_view_photos();
        close_form("view_defects_js");
        return;
    }

    // Abrir Registrar defectos con la PO seleccionada.
    if (target.closest("#btn_register_defects")) {
        open_register_defects();
        return;
    }

    // Agregar un renglón.
    if (target.closest("#btn_add_defect")) {
        add_defect_row();
        update_defect_count();
        return;
    }

    // Cámara: abrir el submenú Tomar foto / Subir foto.
    const photo_button = target.closest(".btn_defect_photo");

    if (photo_button) {
        open_photo_menu(photo_button);
        return;
    }

    // Opción del submenú: abrir la cámara o los archivos del renglón.
    const photo_option = target.closest("#photo_menu [data-photo]");

    if (photo_option && photo_menu_row) {

        const input_class = photo_option.dataset.photo === "take" ? ".def_photo_take" : ".def_photo_upload";
        const input = photo_menu_row.querySelector(input_class);

        close_photo_menu();
        input?.click();
        return;
    }

    // Clic fuera del submenú: cerrarlo.
    if (!target.closest("#photo_menu")) {
        close_photo_menu();
    }

    // Quitar un renglón.
    const remove_button = target.closest(".btn_defect_remove");

    if (remove_button) {
        remove_defect_row(remove_button);
        return;
    }

    // Cerrar el modal con X o Cancelar.
    if (target.closest("#register_defects_js .btn_x_modal, #register_defects_js .btn_cancel_po")) {
        close_photo_menu();
        close_form("register_defects_js");
    }
});


// Cerrar el submenú de foto con Escape o al desplazar la ventana.
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") close_photo_menu();
});

document.addEventListener("scroll", close_photo_menu, true);


/* ==========================================
   SUBMIT
========================================== */

document.addEventListener("submit", function (event) {

    // Registrar defectos: guardar los renglones.
    if (event.target.matches("#form_register_defects")) {
        event.preventDefault();
        save_defects(event.target);
    }
});