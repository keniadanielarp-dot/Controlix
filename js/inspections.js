/* -------------------------------------  BLOQUE:  Opción Inspecciones ------------------------------------- */

// Este archivo usa variables y funciones de pos.js
// (pos_inspections, pos_users, create_cell, create_status_cell, fill_select,
// open_form, close_form, get_pos_quantity, get_date_time y update_defects_badge), por eso se carga DESPUÉS de pos.js en dashboard_admin.html.


// Preparar la opción Inspecciones al abrirla.
async function init_inspections_module() {

    // Si los usuarios todavía no llegan de PHP, esperarlos.
    if (pos_users.length === 0) {
        await load_pos_users();
    }

    // Llenar el filtro de inspectores con los usuarios.
    fill_select("filter_ins_inspector", "Todos", pos_users, "id_user", "name_user");

    render_inspections_table();
}


// Mostrar una fila por PO con su inspección más reciente.
function render_inspections_table() {

    const body = document.getElementById("inspections_table_body");
    if (!body) return;

    // Valores de los filtros.
    const search_text = (document.getElementById("search_inspections")?.value ?? "")
        .trim()
        .toLowerCase();

    const selected_month = document.getElementById("filter_ins_month")?.value ?? "";
    const selected_status = document.getElementById("filter_ins_status")?.value ?? "";
    const selected_inspector = document.getElementById("filter_ins_inspector")?.value ?? "";


    /* ==========================================
       AGRUPAR POR PO Y FILTRAR
    ========================================== */

    const groups = Object.entries(pos_inspections)

        // Solo las PO que tienen inspecciones.
        .filter(([po_id, inspections]) => inspections.length > 0)

        // Guardar la PO, su historial y su inspección más reciente.
        .map(function ([po_id, inspections]) {
            return {
                po_id: po_id,
                inspections: inspections,
                last: inspections[inspections.length - 1]
            };
        })

        .filter(function (group) {

            const last = group.last;

            const matches_search =
                String(last.po_number ?? "").toLowerCase().includes(search_text) ||
                String(last.type_name ?? "").toLowerCase().includes(search_text);

            // Mes: alguna de sus inspecciones fue en ese mes.
            const matches_month =
                selected_month === "" ||
                group.inspections.some(
                    inspection => String(inspection.created_at ?? "").slice(0, 7) === selected_month
                );

            const matches_status =
                selected_status === "" ||
                last.result === selected_status;

            const matches_inspector =
                selected_inspector === "" ||
                String(last.id_inspector) === String(selected_inspector);

            return matches_search && matches_month && matches_status && matches_inspector;
        })

        // La inspección más reciente primero.
        .sort((a, b) => b.last.id - a.last.id);

    // Limpiar filas anteriores.
    body.innerHTML = "";

    // Actualizar "Total de registros".
    const total = document.getElementById("inspections_total_records");
    if (total) total.textContent = groups.length;

    // Sin inspecciones: mostrar el mensaje.
    if (groups.length === 0) {

        // Saber si no hay ninguna o si los filtros las ocultaron.
        const has_inspections = Object.values(pos_inspections).some(list => list.length > 0);

        const message = has_inspections
            ? "No se encontraron inspecciones con esos filtros."
            : "No hay inspecciones registradas.";

        const tr = document.createElement("tr");
        const td = create_cell(message);

        td.colSpan = 10;
        tr.appendChild(td);
        body.appendChild(tr);

        return;
    }


    /* ==========================================
       AGREGAR UNA FILA POR PO
    ========================================== */

    groups.forEach(function (group, index) {

        const last = group.last;
        const tr = document.createElement("tr");

        // Casilla para seleccionar la PO.
        const td_check = document.createElement("td");
        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.className = "select_ins_check";
        checkbox.value = group.po_id;
        checkbox.setAttribute("aria-label", `Seleccionar PO ${last.po_number}`);

        td_check.appendChild(checkbox);
        tr.appendChild(td_check);

        tr.appendChild(create_cell(index + 1));
        tr.appendChild(create_cell(last.po_number));
        tr.appendChild(create_cell(last.division));
        tr.appendChild(create_cell(last.type_name));
        tr.appendChild(create_cell(last.level));
        tr.appendChild(create_cell(last.inspector));

        // Estado de la inspección más reciente con su color.
        tr.appendChild(create_status_cell(last.result));

        // Validaciones de la inspección más reciente: Completa o Pendiente.
        tr.appendChild(create_validations_cell(last));

        // Botón calendario con todas sus inspecciones.
        const td_dates = document.createElement("td");
        const button = document.createElement("button");

        button.type = "button";
        button.className = "btn_ins_dates";
        button.dataset.idPo = group.po_id;
        button.setAttribute("aria-label", `Ver inspecciones de la PO ${last.po_number}`);

        const icon = document.createElement("i");
        icon.className = "bi bi-calendar3";

        button.appendChild(icon);
        td_dates.appendChild(button);
        tr.appendChild(td_dates);

        body.appendChild(tr);
    });
}


// Abrir el modal con todas las inspecciones de una PO.
function open_inspection_dates(po_id) {

    const inspections = pos_inspections[po_id] ?? [];
    const body = document.getElementById("ins_dates_body");

    if (!body || inspections.length === 0) return;

    // Número de PO y contador.
    document.getElementById("ins_dates_po").textContent =
        inspections[inspections.length - 1].po_number;

    document.getElementById("ins_dates_count").textContent =
        `${inspections.length} ${inspections.length === 1 ? "inspección" : "inspecciones"}`;

    // Limpiar filas anteriores.
    body.innerHTML = "";

    // Una fila por inspección, la más reciente primero.
    // El ID es el número de inspección dentro de la PO (1, 2, 3...).
    inspections.forEach(function (inspection, index) {

        const tr = document.createElement("tr");

        tr.appendChild(create_cell(index + 1));
        tr.appendChild(create_cell(inspection.inspector));
        tr.appendChild(create_status_cell(inspection.result));
        tr.appendChild(create_cell(inspection.date_time));

        // Agregar arriba para que la más reciente quede primero.
        body.prepend(tr);
    });

    open_form("ins_dates_js");
}



/* -------------------------------------  BLOQUE:  Registrar resultado ------------------------------------- */

// Renglón AQL que corresponde a la inspección que se está registrando.
let result_aql = null;


// Abrir el modal Registrar resultado con la PO seleccionada.
async function open_register_result() {

    const selected = [...document.querySelectorAll("#inspections_table_body .select_ins_check:checked")]
        .map(checkbox => checkbox.value);

    // Debe haber exactamente una PO seleccionada.
    if (selected.length !== 1) {
        alert(
            selected.length === 0
                ? "Selecciona una PO para registrar el resultado."
                : "Solo puedes registrar el resultado de una PO a la vez."
        );
        return;
    }

    const po_id = selected[0];

    // Buscar la inspección que todavía no tiene resultado.
    const index = (pos_inspections[po_id] ?? [])
        .findIndex(inspection => inspection.result === "Pendiente");

    if (index === -1) {
        alert("La PO seleccionada no tiene inspecciones pendientes.");
        return;
    }

    const inspection = pos_inspections[po_id][index];
    const form = document.getElementById("form_register_result");

    if (!form) return;

    // Abrir el modal con el formulario limpio.
    open_form("register_result_js", true);

    // Guardar qué inspección se está registrando.
    form.dataset.idPo = po_id;
    form.dataset.index = index;

    // Mostrar los datos de la inspección.
    const quantity = get_pos_quantity(po_id);

    document.getElementById("result_po").value = inspection.po_number;
    document.getElementById("result_quantity").textContent = quantity;
    document.getElementById("result_type").value = inspection.type_name;
    document.getElementById("result_inspector").value = inspection.inspector;

    // Buscar el LOAD SIZE que le corresponde.
    hide_inspection_result();
    await load_result_aql(inspection.id_ins_type, quantity);
}


// Consultar en PHP el LOAD SIZE que corresponde a la cantidad.
async function load_result_aql(type_id, quantity) {

    // Olvidar el rango anterior.
    result_aql = null;

    try {

        const response = await fetch(
            `/sistema_calidad/php/pos.php?action=aql_range&id_ins_type=${type_id}&quantity=${quantity}`
        );

        // Detener si el servidor respondió con error (404, 500...).
        if (!response.ok) {
            throw new Error(`El servidor respondió ${response.status} (${response.statusText})`);
        }

        const result = await response.json();

        // Verificar que PHP respondió correctamente.
        if (!result.success) {
            throw new Error(result.message || "No se pudo consultar la tabla AQL.");
        }

        result_aql = result.aql;

        // Comparar con los defectos que ya estén escritos.
        evaluate_result();

    } catch (error) {

        console.error("Error al consultar la tabla AQL:", error);
        show_inspection_result("No se pudo consultar la tabla AQL.", "invalid");

    }
}


// Comparar los defectos con el renglón AQL encontrado.
function evaluate_result() {

    const defect_text = document.getElementById("inspection_defect")?.value.trim() ?? "";
    const quantity = Number(document.getElementById("result_quantity")?.textContent ?? 0);

    // Sin renglón: cantidad fuera de tabla o tipo sin tabla AQL.
    if (!result_aql) {
        show_inspection_result(
            `No hay un LOAD SIZE para la cantidad (${quantity}) en este tipo de inspección.`,
            "invalid"
        );
        return;
    }

    const accept = Number(result_aql.accept);
    const sample_size = Number(result_aql.sample_size);

    const range_text =
        `LOAD SIZE ${result_aql.load_size}: revisar ${sample_size} piezas, ` +
        `acepta ${accept}, rechaza ${result_aql.reject}.`;


    /* ==========================================
       VALIDAR LOS DEFECTOS
    ========================================== */

    // Sin defectos capturados, mostrar solo el rango.
    if (defect_text === "") {
        show_inspection_result(range_text, "info");
        return;
    }

    // Aceptar únicamente números enteros.
    if (!/^\d+$/.test(defect_text)) {
        show_inspection_result("Ingrese un número entero de defectos.", "invalid");
        return;
    }

    const defects = Number(defect_text);

    // Los defectos no pueden superar las piezas revisadas.
    if (defects > sample_size) {
        show_inspection_result(
            `Los defectos no pueden ser más que las piezas revisadas (${sample_size}).`,
            "invalid"
        );
        return;
    }


    /* ==========================================
       RESULTADO: ACEPTADO O RECHAZADO
    ========================================== */

    if (defects <= accept) {
        show_inspection_result(`✅ Aceptado. ${range_text}`, "accepted");
    } else {
        show_inspection_result(`❌ Rechazado. ${range_text}`, "rejected");
    }
}


// Mostrar un mensaje en el cuadro de resultado.
function show_inspection_result(text, type) {

    const box = document.getElementById("inspection_result");
    if (!box) return;

    box.textContent = text;
    box.className = `inspection_result inspection_result_${type}`;
    box.hidden = false;
}


// Ocultar el cuadro de resultado.
function hide_inspection_result() {

    const box = document.getElementById("inspection_result");
    if (box) box.hidden = true;
}


// Guardar los defectos y el resultado en la inspección y en la base de datos.
async function save_result(form) {

    const po_id = form.dataset.idPo;
    const inspection = pos_inspections[po_id]?.[form.dataset.index];
    const defect_field = document.getElementById("inspection_defect");
    const defect_text = defect_field.value.trim();

    if (!inspection) return;


    /* ==========================================
       VALIDAR ANTES DE GUARDAR
    ========================================== */

    // Debe existir un LOAD SIZE para la cantidad.
    if (!result_aql) {
        show_inspection_result("No se puede guardar: no hay un LOAD SIZE para esta cantidad.", "invalid");
        return;
    }

    // Los defectos son obligatorios y deben ser enteros.
    if (!/^\d+$/.test(defect_text)) {
        show_inspection_result("Ingrese el número de defectos encontrados.", "invalid");
        defect_field.focus();
        return;
    }

    const defects = Number(defect_text);

    // Los defectos no pueden superar las piezas revisadas.
    if (defects > Number(result_aql.sample_size)) {
        evaluate_result();
        defect_field.focus();
        return;
    }


    /* ==========================================
       GUARDAR EN LA BASE DE DATOS (ins_aqls)
    ========================================== */

    const button = document.getElementById("btn_save_result");

    // Evitar que se presione dos veces mientras guarda.
    if (button) button.disabled = true;

    try {

        const response = await fetch("/sistema_calidad/php/pos.php?action=save_inspection_result", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                number_po: inspection.po_number,
                id_ins_type: Number(inspection.id_ins_type),
                id_aql: Number(result_aql.id_aql)
            })
        });

        // PHP responde JSON también cuando hay error (400, 500).
        const result = await response.json().catch(() => null);

        if (!response.ok || !result?.success) {
            throw new Error(result?.message || `El servidor respondió ${response.status} (${response.statusText})`);
        }

        // ID del registro en ins_aqls.
        inspection.id_ins_aql = result.id_ins_aql;

    } catch (error) {

        console.error("Error al guardar el resultado:", error);
        show_inspection_result(error.message, "invalid");
        return;

    } finally {

        // Volver a habilitar el botón.
        if (button) button.disabled = false;
    }


    /* ==========================================
       REGISTRAR EL RESULTADO
    ========================================== */

    inspection.defects = defects;
    inspection.load_size = result_aql.load_size;
    inspection.sample_size = Number(result_aql.sample_size);
    inspection.result = defects <= Number(result_aql.accept) ? "Aceptado" : "Rechazado";
    inspection.result_date_time = get_date_time();
    inspection.id_aql = result_aql.id_aql ?? null;

    // Actualizar el número de Defectos.
    update_defects_badge();

    // Actualizar la tabla.
    render_inspections_table();

    close_form("register_result_js");

    console.log("Resultado registrado en PO con ID:", po_id);
    console.table(pos_inspections[po_id]);
}



/* -------------------------------------  BLOQUE:  Validaciones ------------------------------------- */

// Lista de verificación de cada inspección: secciones con sus puntos.
const VALIDATION_SECTIONS = [
    {
        title: "General",
        items: [
            { key: "fabric_approval", text: "Aprobación de tela" },
            { key: "sealing_sample", text: "Muestra sellada" },
            { key: "metal_detection", text: "Detección de metales" },
            { key: "finished_goods_testing", text: "Pruebas de producto terminado" },
            { key: "moisture_carton", text: "Control de humedad (caja)" },
            { key: "moisture_garment", text: "Control de humedad (prenda)" }
        ]
    },
    {
        title: "Tela y arte",
        items: [
            { key: "color_shade", text: "Tono de color" },
            { key: "handfeel", text: "Tacto de la tela" },
            { key: "appearance", text: "Apariencia" },
            { key: "print_decorations", text: "Estampado, bordado y decoraciones" }
        ]
    },
    {
        title: "Etiquetas",
        items: [
            { key: "fiber_content", text: "Contenido de fibra" },
            { key: "care_instructions", text: "Instrucciones de cuidado" },
            { key: "decorative_label", text: "Etiqueta decorativa" },
            { key: "adicom_label", text: "Etiqueta Adicom" },
            { key: "country_origin", text: "País de origen" },
            { key: "size_key", text: "Etiqueta de talla" },
            { key: "eight_flag_label", text: "Etiqueta de 8 banderas" },
            { key: "additional_label", text: "Etiqueta adicional" }
        ]
    },
    {
        title: "Empacado",
        items: [
            { key: "shipping_mark", text: "Marca de envío" },
            { key: "plastic_bag", text: "Bolsa de plástico" },
            { key: "color_size_qty", text: "Color, talla y cantidad" },
            { key: "hangtag", text: "Etiqueta colgante" }
        ]
    },
    {
        title: "Medidas",
        items: [
            { key: "measurements", text: "Medir mínimo 2 piezas por talla, según el procedimiento de inspección de adidas" }
        ]
    }
];

// Opciones de cada punto y su clase de color.
const VALIDATION_OPTIONS = [
    { value: "Conforme", class_name: "val_conform" },
    { value: "No conforme", class_name: "val_nonconform" },
    { value: "N/A", class_name: "val_na" }
];

// Total de puntos de la lista.
const VALIDATION_TOTAL = VALIDATION_SECTIONS.reduce((sum, section) => sum + section.items.length, 0);

// Respuestas mientras el modal está abierto: { fabric_approval: "Conforme", ... }
let validation_answers = {};

// Inspección que se está validando.
let validation_inspection = null;


// Saber si una inspección tiene todos sus puntos respondidos.
function has_complete_validations(inspection) {
    return Object.keys(inspection?.validations ?? {}).length === VALIDATION_TOTAL;
}


// Celda de la tabla con el estado de las validaciones.
function create_validations_cell(inspection) {

    const td = document.createElement("td");
    const span = document.createElement("span");
    const complete = has_complete_validations(inspection);

    span.className = `pos_status ${complete ? "pos_status_process" : "pos_status_pending"}`;
    span.textContent = complete ? "Completa" : "Pendiente";

    td.appendChild(span);
    return td;
}


// Abrir el modal Validaciones con la PO seleccionada.
function open_validations() {

    const selected = [...document.querySelectorAll("#inspections_table_body .select_ins_check:checked")]
        .map(checkbox => checkbox.value);

    // Debe haber exactamente una PO seleccionada.
    if (selected.length !== 1) {
        alert(
            selected.length === 0
                ? "Selecciona una PO para llenar sus validaciones."
                : "Solo puedes llenar las validaciones de una PO a la vez."
        );
        return;
    }

    // Las validaciones son de la inspección más reciente de la PO.
    const inspections = pos_inspections[selected[0]] ?? [];
    validation_inspection = inspections[inspections.length - 1];

    if (!validation_inspection) return;

    // Copiar las respuestas guardadas (para poder cancelar sin perderlas).
    validation_answers = { ...(validation_inspection.validations ?? {}) };

    document.getElementById("val_po").textContent = validation_inspection.po_number;

    render_validation_sections();
    update_validation_counts();

    open_form("validations_js");
}


// Armar las secciones (acordeón) con sus puntos y botones.
function render_validation_sections() {

    const container = document.getElementById("val_sections");
    container.innerHTML = "";

    VALIDATION_SECTIONS.forEach(function (section, position) {

        // Sección que se abre y se cierra.
        const details = document.createElement("details");
        details.className = "validations_section";
        details.open = position === 0;

        const summary = document.createElement("summary");
        summary.className = "validations_summary";
        summary.innerHTML = `
            <i class="bi bi-chevron-right validations_chevron" aria-hidden="true"></i>
            <span class="validations_summary_title"></span>
            <span class="validations_summary_count"></span>`;
        summary.querySelector(".validations_summary_title").textContent = section.title;

        details.appendChild(summary);

        // Un renglón por punto.
        const body = document.createElement("div");
        body.className = "validations_section_body";

        section.items.forEach(function (item) {

            const row = document.createElement("div");
            row.className = "validations_item";

            const text = document.createElement("span");
            text.className = "validations_item_text";
            text.textContent = item.text;

            const options = document.createElement("div");
            options.className = "validations_options";
            options.setAttribute("role", "group");
            options.setAttribute("aria-label", item.text);

            // Botones Conforme, No conforme y N/A.
            VALIDATION_OPTIONS.forEach(function (option) {

                const button = document.createElement("button");
                button.type = "button";
                button.className = `btn_val_option ${option.class_name}`;
                button.dataset.item = item.key;
                button.dataset.value = option.value;
                button.textContent = option.value;
                button.setAttribute("aria-pressed", String(validation_answers[item.key] === option.value));

                options.appendChild(button);
            });

            row.appendChild(text);
            row.appendChild(options);
            body.appendChild(row);
        });

        details.appendChild(body);
        container.appendChild(details);
    });
}


// Elegir una opción de un punto.
function select_validation_option(button) {

    validation_answers[button.dataset.item] = button.dataset.value;

    // Marcar solo el botón elegido de ese punto.
    button.closest(".validations_options")
        .querySelectorAll(".btn_val_option")
        .forEach(option => option.setAttribute("aria-pressed", String(option === button)));

    update_validation_counts();
}


// Marcar todos los puntos sin respuesta como Conforme.
function mark_all_conform() {

    VALIDATION_SECTIONS.forEach(function (section) {
        section.items.forEach(function (item) {
            if (!validation_answers[item.key]) validation_answers[item.key] = "Conforme";
        });
    });

    // Pintar el botón elegido de cada punto (sin cerrar las secciones abiertas).
    document.querySelectorAll("#val_sections .btn_val_option").forEach(function (button) {
        button.setAttribute("aria-pressed", String(validation_answers[button.dataset.item] === button.dataset.value));
    });

    update_validation_counts();
}


// Actualizar "Respondidas", "No conforme" y el avance de cada sección.
function update_validation_counts() {

    const answers = Object.values(validation_answers);
    const nonconform = answers.filter(value => value === "No conforme").length;

    document.getElementById("val_answered").textContent =
        `Respondidas: ${answers.length} de ${VALIDATION_TOTAL}`;

    const nonconform_badge = document.getElementById("val_nonconform");
    nonconform_badge.textContent = `${nonconform} No conforme`;
    nonconform_badge.hidden = nonconform === 0;

    // Avance de cada sección ("4 de 6").
    document.querySelectorAll("#val_sections .validations_section").forEach(function (details, position) {

        const items = VALIDATION_SECTIONS[position].items;
        const done = items.filter(item => validation_answers[item.key]).length;

        details.querySelector(".validations_summary_count").textContent = `${done} de ${items.length}`;
    });
}


// Guardar las respuestas en la inspección.
function save_validations() {

    if (!validation_inspection) return;

    validation_inspection.validations = { ...validation_answers };
    validation_inspection.validations_at = get_date_time();

    render_inspections_table();
    close_form("validations_js");

    console.log("Validaciones de la PO:", validation_inspection.po_number);
    console.table(validation_inspection.validations);
}



/* -------------------------------------  BLOQUE:  Eventos de Inspecciones ------------------------------------- */

/* ==========================================
   INPUT
========================================== */

document.addEventListener("input", function (event) {

    // Buscador de inspecciones.
    if (event.target.matches("#search_inspections")) {
        render_inspections_table();
    }

    // Registrar resultado: evaluar al escribir los defectos.
    if (event.target.matches("#inspection_defect")) {
        evaluate_result();
    }
});


/* ==========================================
   CHANGE
========================================== */

document.addEventListener("change", function (event) {

    // Filtros de mes, estado e inspector.
    if (event.target.matches("#filter_ins_month, #filter_ins_status, #filter_ins_inspector")) {
        render_inspections_table();
    }
});


/* ==========================================
   CLICK
========================================== */

document.addEventListener("click", function (event) {

    // Abrir las inspecciones de una PO.
    const dates_button = event.target.closest(".btn_ins_dates");

    if (dates_button) {
        open_inspection_dates(dates_button.dataset.idPo);
        return;
    }

    // Abrir Registrar resultado con la PO seleccionada.
    if (event.target.closest("#btn_register_result")) {
        open_register_result();
        return;
    }

    // Cerrar Registrar resultado con X o Cancelar.
    if (event.target.closest("#register_result_js .btn_x_modal, #register_result_js .btn_cancel_po")) {
        close_form("register_result_js");
        return;
    }

    // Abrir Validaciones con la PO seleccionada.
    if (event.target.closest("#btn_validations")) {
        open_validations();
        return;
    }

    // Elegir Conforme, No conforme o N/A.
    const option_button = event.target.closest(".btn_val_option");

    if (option_button) {
        select_validation_option(option_button);
        return;
    }

    // Marcar todo como Conforme.
    if (event.target.closest("#btn_val_all")) {
        mark_all_conform();
        return;
    }

    // Guardar las validaciones.
    if (event.target.closest("#btn_save_validations")) {
        save_validations();
        return;
    }

    // Cerrar Validaciones con X o Cancelar (sin guardar).
    if (event.target.closest("#validations_js .btn_x_modal, #validations_js .btn_cancel_po")) {
        close_form("validations_js");
        return;
    }

    // Cerrar el modal con X o Cerrar.
    if (event.target.closest("#ins_dates_js .btn_x_modal, #ins_dates_js .btn_cancel_po")) {
        close_form("ins_dates_js");
    }
});


/* ==========================================
   SUBMIT
========================================== */

document.addEventListener("submit", function (event) {

    // Registrar resultado: guardar los defectos.
    if (event.target.matches("#form_register_result")) {
        event.preventDefault();
        save_result(event.target);
    }
});