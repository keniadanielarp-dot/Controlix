/* -------------------------------------  BLOQUE:  Opción Inspecciones ------------------------------------- */

// Este archivo usa variables y funciones de pos.js
// (pos_inspections, pos_users, create_cell, create_status_cell, fill_select,
// open_form, close_form, get_pos_quantity, get_date_time y update_defects_badge), por eso se carga DESPUÉS de pos.js en dashboard_admin.html.


// Preparar la opción Inspecciones al abrirla.
/* -------------------------------------  BLOQUE:  Inspecciones de la base de datos ------------------------------------- */

// El resultado y los defectos se guardan en ins_aqls (columnas result y defects).
// Los registros viejos que no los tienen se leen del navegador (localStorage), donde se guardaban antes.
const INSPECTION_STATES_KEY = "controlix_inspection_states";

// Ya se trajeron las inspecciones de la base de datos en esta sesión.
let inspections_loaded = false;


// Leer los estados guardados antes en el navegador (solo para registros viejos).
function read_inspection_states() {

    try {
        return JSON.parse(localStorage.getItem(INSPECTION_STATES_KEY)) ?? {};
    } catch (error) {
        return {};
    }
}


// Fecha de MySQL ("2026-11-26 10:05:00") a "26/11/2026 10:05".
function format_db_date_time(value) {

    const [date = "", time = ""] = String(value ?? "").split(" ");
    const [year, month, day] = date.split("-");

    return year ? `${day}/${month}/${year} ${time.slice(0, 5)}`.trim() : "—";
}


// Traer las inspecciones de la base de datos (una vez por sesión, si no hay en memoria).
async function load_inspections_from_db() {

    if (inspections_loaded || Object.keys(pos_inspections).length > 0) return;

    // Las PO también se necesitan (cantidades, cajas): traerlas si todavía no están.
    if (pos_records.length <= 1) await load_pos_from_db();

    try {

        const response = await fetch("/sistema_calidad/php/pos.php?action=list_inspections", { cache: "no-store" });

        if (!response.ok) {
            throw new Error(`El servidor respondió ${response.status} (${response.statusText})`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || "No se pudieron cargar las inspecciones.");
        }

        const states = read_inspection_states();
        const loaded = {};

        // Inspecciones con resultado (ins_aqls).
        result.inspections.forEach(function (row) {

            const po_id = String(row.id_po);
            const history = loaded[po_id] ??= [];
            const state = states[row.id_ins_aql] ?? {};
            const details = row.defect_details ?? [];

            history.push({
                id: Number(row.id_ins_aql),
                po_id: po_id,
                po_number: row.number_po,
                created_at: String(row.created_at ?? "").slice(0, 10),
                id_ins_type: String(row.id_ins_type),
                division: row.division ?? "—",
                type_name: row.name_ins,
                level: row.level ?? "—",
                id_inspector: row.id_user ? String(row.id_user) : null,
                inspector: row.name_user ?? "—",
                date_time: format_db_date_time(row.created_at),

                // Reinspección: la segunda en adelante de la misma PO.
                is_reinspection: history.length > 0,
                attempt: history.length + 1,
                id_previous: history.at(-1)?.id ?? null,

                // Resultado y defectos de ins_aqls; en registros viejos, del navegador o de los defectos registrados.
                result: row.result ?? state.result ?? (details.length > 0 ? "Rechazado" : "Aceptado"),
                defects: row.defects !== null && row.defects !== undefined
                    ? Number(row.defects)
                    : (state.defects ?? (details.length > 0 ? details.length : null)),
                result_date_time: state.result_date_time ?? format_db_date_time(row.created_at),

                load_size: row.load_size,
                sample_size: row.sample_size !== null ? Number(row.sample_size) : null,
                id_aql: row.id_aql ? Number(row.id_aql) : null,
                id_ins_aql: Number(row.id_ins_aql),
                defect_details: details
            });
        });

        // PO con tipo asignado que todavía no tienen resultado.
        result.pending.forEach(function (row) {

            const po_id = String(row.id_po);
            const history = loaded[po_id] ??= [];

            history.push({
                id: 100000 + Number(row.id_po),
                po_id: po_id,
                po_number: row.number_po,
                created_at: String(row.created_at ?? "").slice(0, 10),
                id_ins_type: String(row.id_ins_type),
                division: row.division ?? "—",
                type_name: row.name_ins,
                level: row.level ?? "—",
                id_inspector: row.id_user ? String(row.id_user) : null,
                inspector: row.name_user ?? "—",
                date_time: format_db_date_time(row.created_at),
                defects: null,
                load_size: null,
                sample_size: null,
                result: "Pendiente",
                result_date_time: null,
                id_aql: null
            });
        });

        // No reemplazar si mientras tanto se asignaron inspecciones en esta sesión.
        if (Object.keys(pos_inspections).length === 0) {
            Object.assign(pos_inspections, loaded);
        }

        // Los ID nuevos deben ser mayores a los que ya existen.
        const ids = Object.values(pos_inspections).flat().map(inspection => Number(inspection.id) || 0);
        next_inspection_id = Math.max(next_inspection_id, ...ids, 0) + 1;

        inspections_loaded = true;
        update_defects_badge();

    } catch (error) {

        console.error("Error al cargar las inspecciones de la base de datos:", error);
    }
}


async function init_inspections_module() {

    // Traer las inspecciones guardadas (después de F5 o de iniciar sesión).
    await load_inspections_from_db();

    // Si los usuarios todavía no llegan de PHP, esperarlos.
    if (pos_users.length === 0) {
        await load_pos_users();
    }

    // Llenar el filtro de inspectores con los usuarios.
    fill_select("filter_ins_inspector", "Todos", pos_users, "id_user", "name_user");

    render_inspections_table();
}


// Mostrar una fila por PO con su inspección más reciente.
// Filas de la tabla que se ven con los filtros (para exportar a Excel).
let inspections_export_groups = [];


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

        // Orden de registro de las inspecciones.
        .sort((a, b) => a.inspections[0].id - b.inspections[0].id)
        // ID = el mismo de la tabla de POs (no cambia al filtrar).
        .map((group, position, list) => ({
            ...group,
            number: group.po_id,
            total: Math.max(...list.map(item => Number(item.po_id) || 0))
        }))

        .filter(function (group) {

            const last = group.last;

            // Buscador: número corto = ID; más números = PO; o parte del tipo de inspección.
            const matches_search = matches_id_or_po(
                search_text, group.number, last.po_number, [last.type_name], group.total
            );

            // Mes: alguna de sus inspecciones fue en ese mes.
            const matches_month =
                selected_month === "" ||
                group.inspections.some(
                    inspection => String(inspection.created_at ?? "").startsWith(selected_month)
                );

            const matches_status =
                selected_status === "" ||
                last.result === selected_status;

            const matches_inspector =
                selected_inspector === "" ||
                String(last.id_inspector) === String(selected_inspector);

            return matches_search && matches_month && matches_status && matches_inspector;
        })

        // De arriba hacia abajo según el ID de la PO.
        .sort((a, b) => Number(a.number) - Number(b.number));

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

    // Guardar las filas que se ven (con filtros) para exportarlas a Excel.
    inspections_export_groups = groups;

    groups.forEach(function (group) {

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

        tr.appendChild(create_cell(group.number));
        tr.appendChild(create_cell(last.po_number));
        tr.appendChild(create_cell(last.division));

        // Tipo de inspección (con etiqueta si es reinspección).
        tr.appendChild(create_type_cell(last));

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
    const sample_size = get_reviewed_pieces(quantity);

    // Inspección 100%: revisión de todas las piezas.
    const range_text = is_full_inspection(document.getElementById("result_type")?.value)
        ? `Revisión en la totalidad de piezas (${sample_size} piezas): acepta ${accept}, rechaza ${result_aql.reject}.`
        : `LOAD SIZE ${result_aql.load_size}: revisar ${sample_size} piezas, ` +
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


// Inspección 100%: se revisa la totalidad de las piezas.
function is_full_inspection(type_name) {
    return String(type_name ?? "").includes("100%");
}


// Piezas a revisar: todas en la inspección 100%; si no, la muestra de la tabla AQL.
function get_reviewed_pieces(quantity) {

    const type_name = document.getElementById("result_type")?.value;

    return is_full_inspection(type_name) ? quantity : Number(result_aql.sample_size);
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
    const reviewed = get_reviewed_pieces(Number(document.getElementById("result_quantity")?.textContent ?? 0));

    if (defects > reviewed) {
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
                id_aql: Number(result_aql.id_aql),

                // Resultado y defectos encontrados (se guardan en ins_aqls).
                result: defects <= Number(result_aql.accept) ? "Aceptado" : "Rechazado",
                defects: defects
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
    inspection.sample_size = reviewed;
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


// Leer las cajas escritas ("1, 5, 12-14").
// Regresa { boxes: [1, 5, 12, 13, 14], text: "1, 5, 12-14" } o { error: "mensaje" }.
function parse_boxes(text, min_box = null, max_box = null) {

    const parts = String(text ?? "").split(/[,\s]+/).filter(part => part !== "");

    if (parts.length === 0) return { error: "Escribe la caja o cajas que inspeccionaste." };

    const boxes = new Set();

    for (const part of parts) {

        const match = part.match(/^(\d+)(?:-(\d+))?$/);

        if (!match) return { error: `"${part}" no es válido. Usa números separados por coma o un rango con guion (12-14).` };

        const start = Number(match[1]);
        const end = Number(match[2] ?? match[1]);

        if (start < 1 || end < start) return { error: `El rango "${part}" no es válido.` };

        if ((min_box !== null && start < min_box) || (max_box !== null && end > max_box)) {
            return { error: `La caja ${part} no pertenece a esta PO (cajas ${min_box} a ${max_box}).` };
        }

        if (end - start > 5000) return { error: `El rango "${part}" es demasiado grande.` };

        for (let box = start; box <= end; box++) boxes.add(box);
    }

    // Volver a escribirlas ordenadas y juntando rangos: 1, 5, 12-14.
    const sorted = [...boxes].sort((a, b) => a - b);
    const ranges = [];

    sorted.forEach(function (box) {

        const last = ranges[ranges.length - 1];

        if (last && box === last[1] + 1) last[1] = box;
        else ranges.push([box, box]);
    });

    return {
        boxes: sorted,
        text: ranges.map(([start, end]) => start === end ? `${start}` : `${start}-${end}`).join(", ")
    };
}


// Primera y última caja de una PO (según los rangos de sus tallas).
function get_po_box_range(po_id) {

    const record = get_pos_by_id(po_id);
    if (!record) return { min_box: null, max_box: null };

    const ranges = record.boxes.slice(5, 13)
        .map(value => parse_box_range(value))
        .filter(range => range.min_box !== null);

    if (ranges.length === 0) return { min_box: null, max_box: null };

    return {
        min_box: Math.min(...ranges.map(range => range.min_box)),
        max_box: Math.max(...ranges.map(range => range.max_box))
    };
}


// Revisar las cajas escritas y mostrar la ayuda debajo del campo. Regresa el resultado de parse_boxes.
function check_validation_boxes(show_empty_error = false) {

    const input = document.getElementById("val_boxes");
    const help = document.getElementById("val_boxes_help");
    if (!input || !help || !validation_inspection) return null;

    const { min_box, max_box } = get_po_box_range(validation_inspection.po_id);
    const range_text = min_box !== null ? `Cajas de la PO: ${min_box} a ${max_box}.` : "";

    // Vacío: solo mostrar el rango (o el error al guardar).
    if (input.value.trim() === "" && !show_empty_error) {
        help.textContent = `${range_text} Escribe los números separados por coma o un rango con guion.`.trim();
        help.className = "validations_boxes_help";
        input.classList.remove("invalid");
        return null;
    }

    const result = parse_boxes(input.value, min_box, max_box);

    if (result.error) {
        help.textContent = result.error;
        help.className = "validations_boxes_help error";
        input.classList.add("invalid");
        return result;
    }

    help.textContent = `${result.boxes.length} ${result.boxes.length === 1 ? "caja" : "cajas"}: ${result.text}`;
    help.className = "validations_boxes_help ok";
    input.classList.remove("invalid");

    return result;
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

    // Cajas guardadas.
    document.getElementById("val_boxes").value = validation_inspection.boxes ?? "";
    check_validation_boxes();

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

    // Cajas inspeccionadas (opcional): si se escriben, deben ser válidas.
    const boxes = check_validation_boxes();

    if (boxes?.error) {
        document.getElementById("val_boxes").focus();
        return;
    }

    validation_inspection.boxes = boxes?.text ?? null;
    validation_inspection.boxes_count = boxes?.boxes.length ?? 0;
    validation_inspection.validations = { ...validation_answers };
    validation_inspection.validations_at = get_date_time();

    render_inspections_table();
    close_form("validations_js");

    console.log("Validaciones de la PO:", validation_inspection.po_number);
    console.table(validation_inspection.validations);
}



/* -------------------------------------  BLOQUE:  Exportar a Excel ------------------------------------- */

// Colores del reporte (los mismos del sistema).
const EXCEL_COLORS = {
    navy: "FF142B49",
    blue: "FF2454A6",
    light: "FFE8F2FF",
    zebra: "FFF5F9FF",
    border: "FFDCE5F0",
    white: "FFFFFFFF",
    text: "FF142B49",
    muted: "FF526789"
};

// Colores de cada estado: fondo y letra.
const EXCEL_STATUS_COLORS = {
    "Aceptado": { fill: "FFD1E7DD", font: "FF146C43" },
    "Rechazado": { fill: "FFF8D7DA", font: "FF842029" },
    "Pendiente": { fill: "FFFFF3CD", font: "FF8A6100" },
    "Completa": { fill: "FFDBEAFE", font: "FF1E40AF" }
};


// Datos de una fila del Excel.
function get_inspection_excel_row(group) {

    const last = group.last;
    const po_number = String(last.po_number ?? "");

    return [
        Number(group.number) || group.number,
        /^\d+$/.test(po_number) ? Number(po_number) : po_number,
        last.division ?? "",
        last.type_name ?? "",
        last.is_reinspection ? `Intento ${last.attempt}` : "—",
        last.level ?? "",
        last.inspector ?? "",
        last.result ?? "",
        has_complete_validations(last) ? "Completa" : "Pendiente",
        last.boxes ?? "—",
        last.defects ?? "—",
        last.date_time ?? "—",
        last.result_date_time ?? "—"
    ];
}


// Descargar la tabla de Inspecciones (con los filtros activos) como Excel con diseño.
async function export_inspections_excel() {

    if (inspections_export_groups.length === 0) {
        alert("No hay inspecciones para exportar.");
        return;
    }

    // Se necesita la librería ExcelJS (permite colores y bordes).
    if (typeof ExcelJS === "undefined") {
        alert("Falta cargar la librería ExcelJS (../libs/exceljs.min.js) en dashboard_admin.html.");
        return;
    }

    const headers = [
        "ID", "PO", "División", "Tipo de inspección", "Reinspección", "Nivel de inspección",
        "Inspector", "Estado", "Validaciones", "Cajas inspeccionadas", "Defectos",
        "Fecha de asignación", "Fecha de resultado"
    ];

    const widths = [7, 13, 11, 44, 14, 32, 22, 13, 14, 20, 10, 19, 19];
    const last_column = String.fromCharCode(64 + headers.length);   // "M"

    const book = new ExcelJS.Workbook();
    book.creator = "Controlix";
    book.created = new Date();

    const sheet = book.addWorksheet("Inspecciones", {
        views: [{ state: "frozen", ySplit: 3 }],
        pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
    });

    sheet.columns = widths.map(width => ({ width: width }));

    const thin_border = {
        top: { style: "thin", color: { argb: EXCEL_COLORS.border } },
        left: { style: "thin", color: { argb: EXCEL_COLORS.border } },
        bottom: { style: "thin", color: { argb: EXCEL_COLORS.border } },
        right: { style: "thin", color: { argb: EXCEL_COLORS.border } }
    };


    /* ==========================================
       TÍTULO DEL REPORTE
    ========================================== */

    sheet.mergeCells(`A1:${last_column}1`);
    const title = sheet.getCell("A1");
    title.value = "Controlix · Reporte de Inspecciones";
    title.font = { name: "Calibri", size: 18, bold: true, color: { argb: EXCEL_COLORS.white } };
    title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.navy } };
    title.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    sheet.getRow(1).height = 36;

    sheet.getRow(2).height = 8;


    /* ==========================================
       ENCABEZADOS DE LA TABLA
    ========================================== */

    const header_row = sheet.getRow(3);
    header_row.values = headers;
    header_row.height = 30;

    header_row.eachCell(function (cell) {
        cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: EXCEL_COLORS.white } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.blue } };
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.border = thin_border;
    });


    /* ==========================================
       FILAS
    ========================================== */

    inspections_export_groups.forEach(function (group, position) {

        const row = sheet.addRow(get_inspection_excel_row(group));
        row.height = 22;

        row.eachCell({ includeEmpty: true }, function (cell, column) {

            cell.font = { name: "Calibri", size: 11, color: { argb: EXCEL_COLORS.text } };
            cell.border = thin_border;
            cell.alignment = { vertical: "middle", horizontal: column === 4 || column === 6 ? "left" : "center" };

            // Filas intercaladas.
            if (position % 2 === 1) {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: EXCEL_COLORS.zebra } };
            }
        });

        // PO como número entero (sin decimales ni notación científica).
        row.getCell(2).numFmt = "0";
        row.getCell(2).font = { name: "Calibri", size: 11, bold: true, color: { argb: EXCEL_COLORS.text } };

        // Estado y Validaciones con su color.
        [8, 9].forEach(function (column) {

            const cell = row.getCell(column);
            const colors = EXCEL_STATUS_COLORS[cell.value];

            if (!colors) return;

            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.fill } };
            cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: colors.font } };
        });

        // Reinspección resaltada en naranja.
        if (group.last.is_reinspection) {
            const cell = row.getCell(5);
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFEDD5" } };
            cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FF9A3412" } };
        }
    });

    // Filtros de Excel en los encabezados.
    sheet.autoFilter = { from: "A3", to: `${last_column}3` };


    /* ==========================================
       DESCARGAR
    ========================================== */

    const buffer = await book.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `Inspecciones_${get_pos_date()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}



/* -------------------------------------  BLOQUE:  Etiqueta de Reinspección ------------------------------------- */

// Celda del tipo de inspección; si es reinspección agrega la etiqueta.
function create_type_cell(inspection) {

    const td = document.createElement("td");

    if (!inspection.is_reinspection) {
        td.textContent = inspection.type_name ?? "—";
        return td;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "ins_type_cell";

    const name = document.createElement("span");
    name.textContent = inspection.type_name ?? "—";

    const badge = document.createElement("span");
    badge.className = "reinspection_badge";

    const icon = document.createElement("i");
    icon.className = "bi bi-arrow-repeat";
    icon.setAttribute("aria-hidden", "true");

    badge.append(icon, ` Reinspección · intento ${inspection.attempt}`);
    wrapper.append(name, badge);
    td.appendChild(wrapper);

    return td;
}



/* -------------------------------------  BLOQUE:  Eventos de Inspecciones ------------------------------------- */

/* ==========================================
   INPUT
========================================== */

// Revisar las cajas mientras se escriben.
document.addEventListener("input", function (event) {
    if (event.target.matches("#val_boxes")) check_validation_boxes();
});


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

    // Exportar la tabla a Excel.
    if (event.target.closest("#btn_export_inspections")) {
        export_inspections_excel();
        return;
    }


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