/* -------------------------------------  BLOQUE:  Constantes ------------------------------------- */

// Encabezado que también utiliza nuestro archivo Excel.
const PO_HEADER = [
    "ID", "PO", "Modelo", "Artículo", "Color",
    "XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL",
    "RQSTD", "DELVD"
];

// Número de columnas que vienen del Excel.
const EXCEL_COLUMN_COUNT = 15;

// Tallas disponibles (sufijo de los IDs de los campos).
const SIZES = ["xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl"];

// Posición de la celda "Estado" en la fila HTML:
// checkbox (0) + 15 columnas del Excel (1-15) + Usuario (16) + Estado (17).
const STATUS_CELL_INDEX = 17;

// Relación entre los valores del filtro HTML y los estados de la tabla.
const STATUS_FILTER_MAP = {
    pending: "pendiente",
    assigned: "asignado",
    process: "en proceso",
    finished: "finalizado"
};

// Número de PO que se muestran por página.
const POS_PER_PAGE = 10;

// Todos los modales del módulo.
const MODAL_IDS = [
    "dates_po_js",
    "create_pos_js",
    "edit_pos_js",
    "delete_po_js",
    "assign_ins_js",
    "asing_user_js"
];

    
/* -------------------------------------  BLOQUE:  Estado (registros temporales) ------------------------------------- */

// Registros de PO: encabezado + dos filas por PO (cantidades y cajas).
let pos_records = [PO_HEADER];

// Fechas de registro de cada PO: { po_id: "YYYY-MM-DD" }.
let pos_dates = {};

// Página actual de la tabla de PO.
let current_page = 1;

// Historial de inspecciones de cada PO: { po_id: [ inspección, ... ] }.
let pos_inspections = {};

// Consecutivo para el ID de cada inspección.
let next_inspection_id = 1;

// Usuario asignado a cada PO: { po_id: { id_user, name_user, assigned_at } }.
let pos_assignments = {};



/* -------------------------------------  BLOQUE:  Utilidades ------------------------------------- */

// Obtener la fecha actual en formato YYYY-MM-DD.
function get_pos_date() {

    const date = new Date();

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");

}


// Convertir una fecha YYYY-MM-DD a DD/MM/YYYY.
function format_pos_date(date) {

    if (!date) return "—";

    const [year, month, day] = String(date).split("-");

    return `${day}/${month}/${year}`;
}


// Obtener la fecha y hora actual en formato DD/MM/YYYY HH:MM.
function get_date_time() {

    const date = new Date();

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${day}/${month}/${date.getFullYear()} ${hours}:${minutes}`;
}


// Crear una celda <td> con su valor y rowspan opcional.
function create_cell(value, rowspan = 1) {

    const td = document.createElement("td");

    td.textContent = value ?? "";

    if (rowspan > 1) {
        td.rowSpan = rowspan;
    }

    return td;
}


// Crear la celda Estado con la etiqueta de su color.
function create_status_cell(status, rowspan = 1) {

    // Relacionar cada estado con su clase CSS.
    const classes = {
        "pendiente": "pos_status_pending",
        "asignado": "pos_status_assigned",
        "en proceso": "pos_status_process",
        "finalizado": "pos_status_finished"
    };

    const td = create_cell("", rowspan);

    const label = document.createElement("span");
    label.className = "pos_status";
    label.textContent = status;

    // Agregar el color si el estado existe en la lista.
    const class_name = classes[String(status).trim().toLowerCase()];

    if (class_name) {
        label.classList.add(class_name);
    }

    td.appendChild(label);

    return td;
}


// Buscar una PO por ID dentro de pos_records.
// Devuelve { index, quantities, boxes } o null.
function get_pos_by_id(po_id) {

    // Omitir el encabezado y recorrer las PO de dos en dos.
    for (let i = 1; i < pos_records.length; i += 2) {

        const quantity_row = pos_records[i];
        const box_row = pos_records[i + 1];

        if (!quantity_row || !box_row) continue;

        if (String(quantity_row[0]) === String(po_id)) {
            return {
                index: i,
                quantities: quantity_row,
                boxes: box_row
            };
        }
    }

    return null;
}


// Obtener los ID de las PO marcadas en la tabla.
function get_selected_pos() {

    const selected = document.querySelectorAll(
        "#pos_table_excel .select_pos_check:checked"
    );

    return Array.from(selected, checkbox => checkbox.value);
}


// Calcular el siguiente ID disponible.
function get_next_pos_id() {

    const ids = pos_records
        .slice(1)
        .filter((row, index) => index % 2 === 0)
        .map(row => Number(row[0]) || 0);

    return Math.max(0, ...ids) + 1;
}



/* -------------------------------------  BLOQUE:  Cargar Excel ------------------------------------- */

async function load_excel(file) {

    // Verificar que exista un archivo seleccionado.
    if (!file) return;

    try {

        // Leer e interpretar el archivo con SheetJS.
        const data = await file.arrayBuffer();
        const book = XLSX.read(data, { type: "array" });

        // Obtener la primera hoja.
        const sheet_name = book.SheetNames[0];
        const sheet = book.Sheets[sheet_name];

        // Convertir las celdas en una matriz.
        const records = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: "",
            blankrows: true,
            raw: false
        });

        console.log("Archivo:", file.name);
        console.log("Hoja:", sheet_name);
        console.table(records);

        // Guardar los registros del Excel.
        pos_records = records;

        // Registrar la fecha de carga de cada PO (filas de dos en dos).
        pos_dates = {};

        for (let i = 1; i < pos_records.length; i += 2) {
            const po_id = pos_records[i][0];
            pos_dates[po_id] = get_pos_date();
        }

        // Regresar a la primera página.
        current_page = 1;

        // Actualizar la tabla.
        load_pos_table(pos_records);

    } catch (error) {

        console.error("Error al cargar Excel:", error);

    }
}



/* -------------------------------------  BLOQUE:  Tabla de PO ------------------------------------- */

function load_pos_table(records) {

    const table = document.getElementById("pos_table_excel");

    if (!table) {
        console.error("No se encontró la tabla de PO.");
        return;
    }

    // Limpiar registros anteriores.
    table.innerHTML = "";

    // Reiniciar el checkbox principal.
    reset_select_all();

    // Eliminar la fila de encabezados.
    const rows = records.slice(1);

    // Verificar que cada PO tenga dos filas.
    if (rows.length % 2 !== 0) {
        console.error("El Excel debe tener dos filas por PO.");
        return;
    }

    // Recorrer las PO de dos en dos.
    for (let i = 0; i < rows.length; i += 2) {

        const [tr_quantities, tr_boxes] = create_po_rows(
            rows[i],       // Cantidades
            rows[i + 1]    // Rangos de cajas
        );

        table.appendChild(tr_quantities);
        table.appendChild(tr_boxes);
    }

    // Aplicar los filtros activos una sola vez, al terminar.
    filter_pos();
}


// Construir las dos filas HTML de una PO.
function create_po_rows(quantity_row, box_row) {

    const po_id = quantity_row[0];

    const tr_quantities = document.createElement("tr");
    const tr_boxes = document.createElement("tr");

    // Asociar la fecha de registro a ambas filas.
    const register_date = pos_dates[po_id] ?? get_pos_date();

    tr_quantities.dataset.createdAt = register_date;
    tr_boxes.dataset.createdAt = register_date;


    /* ==========================================
       CHECKBOX ÚNICO POR PO
    ========================================== */

    const td_check = document.createElement("td");
    td_check.rowSpan = 2;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "select_pos_check";
    checkbox.value = po_id ?? "";

    td_check.appendChild(checkbox);
    tr_quantities.appendChild(td_check);


    /* ==========================================
       DATOS DEL EXCEL (15 COLUMNAS)
    ========================================== */

    for (let column = 0; column < EXCEL_COLUMN_COUNT; column++) {
        tr_quantities.appendChild(create_cell(quantity_row[column]));
        tr_boxes.appendChild(create_cell(box_row[column]));
    }


    /* ==========================================
       COLUMNAS ADICIONALES DE CONTROLIX
    ========================================== */

    // Asignación de la PO (si existe).
    const assignment = pos_assignments[po_id];

    // Usuario asignado.
    tr_quantities.appendChild(create_cell(assignment?.name_user ?? "—", 2));

    // Estado con su color.
    tr_quantities.appendChild(create_status_cell(assignment ? "Asignado" : "Pendiente", 2));

    // Tipo de inspección.
    tr_quantities.appendChild(create_cell("—", 2));


    /* ==========================================
       BOTÓN FECHAS ÚNICO POR PO
    ========================================== */

    const td_dates = document.createElement("td");
    td_dates.rowSpan = 2;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn_po_dates";
    button.dataset.idPo = po_id ?? "";
    button.setAttribute("aria-label", "Ver fechas de PO");

    const icon = document.createElement("i");
    icon.className = "bi bi-calendar3";

    button.appendChild(icon);
    td_dates.appendChild(button);
    tr_quantities.appendChild(td_dates);

    return [tr_quantities, tr_boxes];
}


// Desmarcar el checkbox "Seleccionar todas".
function reset_select_all() {

    const select_all = document.getElementById("select_all_pos");

    if (select_all) {
        select_all.checked = false;
        select_all.indeterminate = false;
    }
}


// Obtener los checkbox de las PO visibles en la página actual.
function get_visible_pos_checks() {

    return Array.from(
        document.querySelectorAll("#pos_table_excel .select_pos_check")
    ).filter(checkbox => !checkbox.closest("tr").hidden);
}


// Marcar o desmarcar todas las PO de la página actual.
function toggle_all_pos(checked) {

    get_visible_pos_checks().forEach(checkbox => checkbox.checked = checked);
}


// Actualizar el checkbox principal según las PO marcadas.
function update_select_all() {

    const select_all = document.getElementById("select_all_pos");
    if (!select_all) return;

    // Considerar solo las PO de la página actual.
    const checkboxes = get_visible_pos_checks();
    const checked_boxes = checkboxes.filter(checkbox => checkbox.checked);

    // Marcado si todos están seleccionados.
    select_all.checked =
        checkboxes.length > 0 &&
        checked_boxes.length === checkboxes.length;

    // Estado parcial si solo algunos lo están.
    select_all.indeterminate =
        checked_boxes.length > 0 &&
        checked_boxes.length < checkboxes.length;
}



/* -------------------------------------  BLOQUE:  Filtros (búsqueda, estado, mes/año) ------------------------------------- */

function filter_pos() {

    const table = document.getElementById("pos_table_excel");
    if (!table) return;

    // Texto del buscador.
    const search_text = (document.getElementById("search_pos")?.value ?? "")
        .trim()
        .toLowerCase();

    // Estado seleccionado, convertido al texto de la tabla.
    const status_value = (document.getElementById("options_pos_status")?.value ?? "todos")
        .trim()
        .toLowerCase();

    const status = STATUS_FILTER_MAP[status_value] ?? status_value;

    // Mes y año seleccionados (YYYY-MM).
    const selected_month = document.getElementById("dpdn_pos_mounth")?.value ?? "";

    // Usuario seleccionado (id_user; vacío = Todos).
    const selected_user = document.getElementById("options_user_assing")?.value ?? "";

    // PO que cumplen los filtros: [[fila_cantidades, fila_cajas], ...].
    const matching_pos = [];

    // Recorrer cada PO (dos filas).
    const rows = Array.from(table.querySelectorAll("tr"));

    for (let i = 0; i < rows.length; i += 2) {

        const quantity_row = rows[i];
        const box_row = rows[i + 1];

        if (!box_row) continue;

        const cells = quantity_row.cells;

        // Datos de la PO.
        const id = cells[1]?.textContent.toLowerCase() ?? "";
        const po = cells[2]?.textContent.toLowerCase() ?? "";
        const model = cells[3]?.textContent.toLowerCase() ?? "";
        const po_status = cells[STATUS_CELL_INDEX]?.textContent.trim().toLowerCase() ?? "";
        const register_month = (quantity_row.dataset.createdAt ?? "").slice(0, 7);

        // Usuario asignado a la PO.
        const po_id = quantity_row.querySelector(".select_pos_check")?.value ?? "";
        const po_user = pos_assignments[po_id]?.id_user ?? "";

        // Comprobar los tres filtros.
        const matches_search =
            id.includes(search_text) ||
            po.includes(search_text) ||
            model.includes(search_text);

        const matches_status =
            status === "todos" ||
            status === "" ||
            po_status === status;

        const matches_month =
            selected_month === "" ||
            register_month === selected_month;

        const matches_user =
            selected_user === "" ||
            String(po_user) === String(selected_user);

        // Ocultar ambas filas; la paginación decide cuáles se muestran.
        quantity_row.hidden = true;
        box_row.hidden = true;

        if (matches_search && matches_status && matches_month && matches_user) {
            matching_pos.push([quantity_row, box_row]);
        }
    }


    /* ==========================================
       PAGINACIÓN
    ========================================== */

    // Calcular el total de páginas (mínimo 1).
    const total_pages = Math.max(1, Math.ceil(matching_pos.length / POS_PER_PAGE));

    // Mantener la página actual dentro del rango.
    current_page = Math.min(Math.max(current_page, 1), total_pages);

    // Mostrar solo las PO de la página actual.
    const start = (current_page - 1) * POS_PER_PAGE;

    matching_pos
        .slice(start, start + POS_PER_PAGE)
        .forEach(function ([quantity_row, box_row]) {
            quantity_row.hidden = false;
            box_row.hidden = false;
        });

    // Desmarcar las PO que quedaron ocultas.
    document
        .querySelectorAll("#pos_table_excel .select_pos_check")
        .forEach(function (checkbox) {
            if (checkbox.closest("tr").hidden) checkbox.checked = false;
        });

    update_select_all();

    // Actualizar "Total de registros".
    const total = document.getElementById("pos_total_records");
    if (total) total.textContent = matching_pos.length;

    // Dibujar los botones de página.
    render_pagination(total_pages);
}


// Dibujar los botones Anterior, números de página y Siguiente.
function render_pagination(total_pages) {

    const container = document.querySelector(".pos_pag");
    if (!container) return;

    container.innerHTML = "";

    // Crear un botón de paginación.
    function create_page_button(content, page, label, is_icon = false) {

        const button = document.createElement("button");
        button.type = "button";
        button.dataset.page = page;

        if (is_icon) {
            const icon = document.createElement("i");
            icon.className = content;
            button.appendChild(icon);
            button.setAttribute("aria-label", label);
        } else {
            button.textContent = content;
        }

        return button;
    }

    // Botón Anterior.
    const previous = create_page_button("bi bi-chevron-left", current_page - 1, "Página anterior", true);
    previous.disabled = current_page === 1;
    container.appendChild(previous);

    // Botones de número de página.
    for (let page = 1; page <= total_pages; page++) {

        const button = create_page_button(page, page);

        if (page === current_page) {
            button.classList.add("active");
            button.setAttribute("aria-current", "page");
        }

        container.appendChild(button);
    }

    // Botón Siguiente.
    const next = create_page_button("bi bi-chevron-right", current_page + 1, "Página siguiente", true);
    next.disabled = current_page === total_pages;
    container.appendChild(next);
}

/* -------------------------------------  BLOQUE:  Usuarios ------------------------------------- */

// Usuarios activos obtenidos de la base de datos.
let pos_users = [];


// Consultar los usuarios en PHP.
async function load_pos_users() {

    try {

        const response = await fetch("/sistema_calidad/php/pos.php?action=users");

        // Detener si el servidor respondió con error (404, 500...).
        if (!response.ok) {
            throw new Error(`El servidor respondió ${response.status} (${response.statusText})`);
        }

        const result = await response.json();

        // Verificar que PHP respondió correctamente.
        if (!result.success) {
            throw new Error(result.message || "No se pudieron cargar los usuarios.");
        }

        // Guardar los usuarios y llenar los select.
        pos_users = result.users;
        console.table(pos_users);

    } catch (error) {

        console.error("Error al cargar usuarios:", error);

    }
}

/* -------------------------------------  BLOQUE:  Tipos de inspección ------------------------------------- */
// Tipos de inspección obtenidos de la base de datos.
let pos_inspection_types = [];


// Consultar los tipos de inspección en PHP.
async function load_inspection_types() {

    try {

        // Usa la misma ruta que te funcionó con los usuarios.
        const response = await fetch("/sistema_calidad/php/pos.php?action=inspection_types");

        // Detener si el servidor respondió con error (404, 500...).
        if (!response.ok) {
            throw new Error(`El servidor respondió ${response.status} (${response.statusText})`);
        }

        const result = await response.json();

        // Verificar que PHP respondió correctamente.
        if (!result.success) {
            throw new Error(result.message || "No se pudieron cargar los tipos de inspección.");
        }

        pos_inspection_types = result.inspection_types;

        console.table(pos_inspection_types);

    } catch (error) {

        console.error("Error al cargar tipos de inspección:", error);

    }
}


// Cargar los tipos de inspección al abrir la página.
document.addEventListener("DOMContentLoaded", load_inspection_types);


// Llenar un select con cualquier lista de la base de datos.
function fill_select(select_id, first_text, items = [], value_key, text_key) {

    const select = document.getElementById(select_id);

    if (!select) {
        console.warn("No se encontró el select:", select_id);
        return;
    }

    // Dejar solo la primera opción.
    select.innerHTML = "";
    select.appendChild(new Option(first_text, ""));

    // Agregar una opción por elemento.
    items.forEach(function (item) {
        select.appendChild(new Option(item[text_key], item[value_key]));
    });
}


// Cargar los usuarios al abrir la página.
document.addEventListener("DOMContentLoaded", load_pos_users);



/* -------------------------------------  BLOQUE:  Modales (abrir, cerrar, limpiar) ------------------------------------- */

// Abrir un modal. Con clean = true se vacía el formulario.
function open_form(id_modal, clean = false) {

    const modal = document.getElementById(id_modal);
    if (!modal) return;

    const form = modal.querySelector("form");

    if (form) {
        if (clean) {
            clear_form(form);           // Vaciar campos y errores.
        } else {
            clear_form_errors(form);    // Conservar datos, quitar errores.
        }
    }

    modal.hidden = false;
}


// Cerrar un modal.
function close_form(id_modal) {

    const modal = document.getElementById(id_modal);
    if (!modal) return;

    // El modal Eliminar guarda IDs pendientes: limpiarlos al cerrar.
    if (id_modal === "delete_po_js") {
        delete modal.dataset.idsPo;
    }

    modal.hidden = true;
}


// Quitar mensajes y bordes de error de un formulario.
function clear_form_errors(form) {

    // Ocultar mensajes, conservando su clase CSS.
    form.querySelectorAll("small.input_error").forEach(function (error) {
        error.hidden = true;
        error.textContent = "";
    });

    // Quitar los bordes rojos de los campos.
    form.querySelectorAll(
        "input.input_error, select.input_error, .border_error"
    ).forEach(function (field) {
        field.classList.remove("input_error", "border_error");
    });
}


// Limpiar un formulario completo o un solo campo.
function clear_form(element) {

    if (element.matches("form")) {

        element.reset();
        clear_form_errors(element);

    } else {

        // Quitar el borde rojo del campo corregido.
        element.classList.remove("border_error");

        // Ocultar su mensaje de error.
        const error = element.parentElement.querySelector(".input_error");

        if (error) {
            error.hidden = true;
            error.textContent = "";
        }
    }
}


// Quitar el error de un campo mientras el usuario escribe.
function clear_field_error(field) {

    field.classList.remove("input_error", "border_error");

    const message = field
        .closest(".input_pos_form")
        ?.querySelector("small.input_error");

    if (message) {
        message.hidden = true;
        message.textContent = "";
    }
}



/* -------------------------------------  BLOQUE:  Formularios PO (leer, llenar, convertir) ------------------------------------- */

// Leer los datos del formulario Crear o Editar.
function get_pos_form_data(form) {

    const is_edit = form.id === "form_edit_pos";

    // Elegir el ID según el formulario.
    const get_value = function (create_id, edit_id) {
        const id = is_edit ? edit_id : create_id;
        return form.querySelector(`#${id}`)?.value.trim() ?? "";
    };

    return {
        po: get_value("txt_create_po", "txt_edit_po"),
        model: get_value("txt_new_model", "txt_edit_model"),
        article: get_value("txt_new_art", "txt_edit_art"),
        color: get_value("txt_new_color", "txt_edit_color"),

        xs: get_value("txt_new_xs", "txt_edit_xs"),
        box_xs: get_value("txt_new_bxs", "txt_edit_bxs"),

        s: get_value("txt_new_s", "txt_edit_s"),
        box_s: get_value("txt_new_bs", "txt_edit_bs"),

        m: get_value("txt_new_m", "txt_edit_m"),
        box_m: get_value("txt_new_bm", "txt_edit_bm"),

        l: get_value("txt_new_l", "txt_edit_l"),
        box_l: get_value("txt_new_bl", "txt_edit_bl"),

        xl: get_value("txt_new_xl", "txt_edit_xl"),
        box_xl: get_value("txt_new_bxl", "txt_edit_bxl"),

        xxl: get_value("txt_new_2xl", "txt_edit_2xl"),
        box_2xl: get_value("txt_new_b2xl", "txt_edit_b2xl"),

        xxxl: get_value("txt_new_3xl", "txt_edit_3xl"),
        box_3xl: get_value("txt_new_b3xl", "txt_edit_b3xl"),

        xxxxl: get_value("txt_new_4xl", "txt_edit_4xl"),
        box_4xl: get_value("txt_new_b4xl", "txt_edit_b4xl"),

        rqstd: get_value("txt_new_rqstd", "txt_edit_rqstd"),
        delvd: get_value("txt_new_delvd", "txt_edit_delvd")
    };
}


// Llenar el formulario Editar con los datos de una PO.
function fill_pos_form(form, record) {

    const quantities = record.quantities;
    const boxes = record.boxes;

    const values = {
        txt_edit_po: quantities[1],
        txt_edit_model: quantities[2],
        txt_edit_art: quantities[3],
        txt_edit_color: quantities[4],

        // Cantidades por talla.
        txt_edit_xs: quantities[5],
        txt_edit_s: quantities[6],
        txt_edit_m: quantities[7],
        txt_edit_l: quantities[8],
        txt_edit_xl: quantities[9],
        txt_edit_2xl: quantities[10],
        txt_edit_3xl: quantities[11],
        txt_edit_4xl: quantities[12],

        // Cajas por talla.
        txt_edit_bxs: boxes[5],
        txt_edit_bs: boxes[6],
        txt_edit_bm: boxes[7],
        txt_edit_bl: boxes[8],
        txt_edit_bxl: boxes[9],
        txt_edit_b2xl: boxes[10],
        txt_edit_b3xl: boxes[11],
        txt_edit_b4xl: boxes[12],

        // Totales.
        txt_edit_rqstd: quantities[13],
        txt_edit_delvd: quantities[14]
    };

    Object.entries(values).forEach(function ([id, value]) {
        const field = form.querySelector(`#${id}`);
        if (field) field.value = value ?? "";
    });
}


// Convertir los datos del formulario en las dos filas de una PO.
function pos_form_to_rows(data, po_id) {

    // Primera fila: información y cantidades.
    const quantity_row = [
        po_id,
        data.po,
        data.model,
        data.article,
        data.color,
        data.xs,
        data.s,
        data.m,
        data.l,
        data.xl,
        data.xxl,
        data.xxxl,
        data.xxxxl,
        data.rqstd,
        data.delvd
    ];

    // Segunda fila: cajas por talla.
    const box_row = [
        "", "", "", "", "",
        data.box_xs,
        data.box_s,
        data.box_m,
        data.box_l,
        data.box_xl,
        data.box_2xl,
        data.box_3xl,
        data.box_4xl,
        "", ""
    ];

    return [quantity_row, box_row];
}



/* -------------------------------------  BLOQUE:  Validaciones ------------------------------------- */

function validate_pos_form(form) {

    const fields = form.querySelectorAll("input, select");

    let is_valid = true;
    let first_error = null;
    let has_pair = false;
    let has_size_box_data = false;

    // Prefijo de los IDs según el formulario.
    const prefix = form.id === "form_edit_pos"
        ? "txt_edit_"
        : "txt_new_";

    // Limpiar errores anteriores.
    clear_form_errors(form);


    /* ==========================================
       MOSTRAR UN ERROR EN UN CAMPO
    ========================================== */

    function show_error(field, text) {

        if (!field) return;

        is_valid = false;

        // No reemplazar un error que ya existe.
        if (field.classList.contains("input_error")) return;

        field.classList.add("input_error");

        const message = field
            .closest(".input_pos_form")
            ?.querySelector("small.input_error");

        if (message) {
            message.textContent = text;
            message.hidden = false;
        }

        // Conservar el primer campo incorrecto.
        if (!first_error) first_error = field;
    }


    /* ==========================================
       CAMPOS OBLIGATORIOS Y FORMATOS
    ========================================== */

    fields.forEach(function (field) {

        const value = field.value.trim();

        const is_quantity =
            /^txt_(new|edit)_(xs|s|m|l|xl|2xl|3xl|4xl|rqstd|delvd)$/.test(field.id);

        const is_size =
            /^txt_(new|edit)_(xs|s|m|l|xl|2xl|3xl|4xl)$/.test(field.id);

        const is_box =
            /^txt_(new|edit)_b(xs|s|m|l|xl|2xl|3xl|4xl)$/.test(field.id);

        // Las tallas y cajas son opcionales por separado.
        const is_optional = is_size || is_box;

        // Campos vacíos.
        if (value === "") {
            if (field.required && !is_optional) {
                show_error(field, "Este campo es obligatorio.");
            }
            return;
        }

        // Cantidades numéricas.
        if (is_quantity && !/^\d+$/.test(value)) {
            show_error(field, "Ingrese un número entero válido.");
        }

        // Cajas y rangos.
        if (is_box && !validate_box_range(value)) {
            show_error(field, "Ingrese una caja o rango válido.");
        }
    });


    /* ==========================================
       PAREJAS DE TALLA Y CAJA
    ========================================== */

    SIZES.forEach(function (size_id) {

        const size_field = form.querySelector(`#${prefix}${size_id}`);
        const box_field = form.querySelector(`#${prefix}b${size_id}`);

        if (!size_field || !box_field) return;

        const has_size = size_field.value.trim() !== "";
        const has_box = box_field.value.trim() !== "";

        if (has_size || has_box) {
            has_size_box_data = true;
        }

        // Pareja completa y sin errores.
        if (
            has_size &&
            has_box &&
            !size_field.classList.contains("input_error") &&
            !box_field.classList.contains("input_error")
        ) {
            has_pair = true;
        }

        if (has_size && !has_box) {
            show_error(box_field, "Ingrese la caja correspondiente.");
        }

        if (!has_size && has_box) {
            show_error(size_field, "Ingrese la cantidad correspondiente.");
        }
    });


    /* ==========================================
       EXIGIR AL MENOS UNA PAREJA
    ========================================== */

    // Solo cuando todas las tallas y cajas están vacías.
    if (!has_pair && !has_size_box_data) {
        show_error(
            form.querySelector(`#${prefix}xs`),
            "Ingrese al menos una talla con su respectiva caja."
        );
    }


    // Enfocar el primer error.
    if (first_error) first_error.focus();

    return is_valid;
}


// Validar cajas: "5", "1-10", "1-3, 7, 9-12".
function validate_box_range(value) {

    return value.split(",").every(function (item) {

        const text = item.trim();

        // Aceptar únicamente números o rangos.
        if (!/^\d+(\s*-\s*\d+)?$/.test(text)) return false;

        // Número individual.
        if (!text.includes("-")) return true;

        // Evitar rangos invertidos.
        const [start, end] = text.split("-").map(Number);
        return start <= end;
    });
}



/* -------------------------------------  BLOQUE:  Acciones (crear, editar, eliminar) ------------------------------------- */

// Crear una PO nueva.
function create_pos(form) {

    if (!validate_pos_form(form)) return;

    const data = get_pos_form_data(form);
    console.table(data);

    // Generar ID y registrar la fecha de creación.
    const new_id = get_next_pos_id();
    pos_dates[new_id] = get_pos_date();

    // Agregar las dos filas a los registros.
    pos_records.push(...pos_form_to_rows(data, new_id));

    load_pos_table(pos_records);
    close_form("create_pos_js");

    console.table(pos_records);
}


// Abrir el modal Editar con la PO seleccionada.
function open_edit_pos() {

    const selected = get_selected_pos();

    // Debe haber exactamente una PO seleccionada.
    if (selected.length !== 1) {
        alert(
            selected.length === 0
                ? "Selecciona una PO para editar."
                : "Solo puedes editar una PO a la vez."
        );
        return;
    }

    const po_id = selected[0];
    const record = get_pos_by_id(po_id);

    if (!record) {
        alert("No se encontró la PO seleccionada.");
        return;
    }

    // Guardar el ID en el formulario y llenarlo.
    const form = document.getElementById("form_edit_pos");
    form.dataset.idPo = po_id;

    open_form("edit_pos_js");
    fill_pos_form(form, record);

    console.log("Editar PO con ID:", po_id);
}


// Guardar los cambios de una PO.
function save_edit_pos(form) {

    if (!validate_pos_form(form)) return;

    const po_id = form.dataset.idPo;
    const record = get_pos_by_id(po_id);

    if (!record) {
        alert("No se encontró la PO seleccionada.");
        return;
    }

    const data = get_pos_form_data(form);
    const new_rows = pos_form_to_rows(data, po_id);

    // Reemplazar las dos filas anteriores.
    pos_records.splice(record.index, 2, ...new_rows);

    load_pos_table(pos_records);
    close_form("edit_pos_js");

    console.log("PO actualizada correctamente:", po_id);
    console.table(new_rows);
}


// Abrir el modal Detalle de PO.
function open_pos_dates(po_id) {

    const record = get_pos_by_id(po_id);

    if (!record) {
        alert("No se encontró la PO seleccionada.");
        return;
    }

    // Número de PO.
    document.getElementById("detail_po_number").textContent =
        record.quantities[1] || "—";

    // Fecha en que se registró la PO.
    document.getElementById("detail_date_register").textContent =
        format_pos_date(pos_dates[po_id]);

    // Usuario y fecha de asignación.
    const assignment = pos_assignments[po_id];

    document.getElementById("detail_po_user").textContent =
        assignment?.name_user ?? "—";

    document.getElementById("detail_date_assign").textContent =
        format_pos_date(assignment?.assigned_at);

    // Historial de inspecciones.
    render_inspection_history(po_id);

    open_form("dates_po_js");

    console.log("Detalle de PO con ID:", po_id);
}


// Mostrar el historial de inspecciones de una PO en el Detalle.
function render_inspection_history(po_id) {

    const body = document.getElementById("po_inspections_body");
    const counter = document.getElementById("po_inspections_count");

    if (!body) return;

    const inspections = pos_inspections[po_id] ?? [];

    // Limpiar filas anteriores.
    body.innerHTML = "";

    // Actualizar el contador.
    if (counter) {
        counter.textContent =
            `${inspections.length} ${inspections.length === 1 ? "inspección" : "inspecciones"}`;
    }

    // Sin inspecciones: mostrar el mensaje.
    if (inspections.length === 0) {

        const tr = document.createElement("tr");
        const td = create_cell("No hay inspecciones registradas.");

        td.colSpan = 6;
        tr.appendChild(td);
        body.appendChild(tr);

        return;
    }


    /* ==========================================
       AGREGAR UNA FILA POR INSPECCIÓN
    ========================================== */

    inspections.forEach(function (inspection) {

        const tr = document.createElement("tr");

        tr.appendChild(create_cell(inspection.id));
        tr.appendChild(create_cell(inspection.division));
        tr.appendChild(create_cell(inspection.type_name));
        tr.appendChild(create_cell(inspection.level));
        tr.appendChild(create_cell(inspection.inspector));
        tr.appendChild(create_cell(inspection.date_time));

        body.appendChild(tr);
    });
}


// Abrir el modal Asignar inspección con la PO seleccionada.
function open_assign_ins() {

    const selected = get_selected_pos();

    // Debe haber exactamente una PO seleccionada.
    if (selected.length !== 1) {
        alert(
            selected.length === 0
                ? "Selecciona una PO para asignar la inspección."
                : "Solo puedes asignar inspección a una PO a la vez."
        );
        return;
    }

    const po_id = selected[0];
    const record = get_pos_by_id(po_id);

    if (!record) {
        alert("No se encontró la PO seleccionada.");
        return;
    }


    /* ==========================================
       CALCULAR CANTIDAD (XS A 4XL)
    ========================================== */

    // Las tallas están en las columnas 5 a 12 de la fila de cantidades.
    const quantity = record.quantities
        .slice(5, 13)
        .reduce(function (sum, value) {

            // Quitar comas de miles ("1,200") y tratar vacíos como 0.
            const number = Number(String(value ?? "").replace(/,/g, ""));

            return sum + (Number.isFinite(number) ? number : 0);

        }, 0);


    /* ==========================================
       MOSTRAR DATOS EN EL MODAL
    ========================================== */

    // Abrir el modal con el formulario limpio.
    open_form("assign_ins_js", true);

    // Llenar el select de tipos de inspección.
    fill_select(
        "inspection_type",
        "Seleccione una inspección",
        pos_inspection_types,
        "id_ins_type",
        "name_ins"
    );

    // Guardar el ID para usarlo al guardar.
    document.getElementById("form_assign_ins").dataset.idPo = po_id;

    // Mostrar la PO y la cantidad.
    document.getElementById("inspection_po").value = record.quantities[1] ?? "";
    document.getElementById("inspection_quantity").textContent = quantity;

    // Olvidar el rango y el resultado de la PO anterior.
    current_aql = null;
    hide_inspection_result();

    console.log("Asignar inspección a PO con ID:", po_id, "Cantidad:", quantity);
}


// Renglón AQL que corresponde a la PO y tipo de inspección actuales.
let current_aql = null;


// Consultar en PHP el LOAD SIZE que corresponde a la cantidad.
async function load_aql_range() {

    const type_id = document.getElementById("inspection_type")?.value ?? "";
    const quantity = Number(document.getElementById("inspection_quantity")?.textContent ?? 0);

    // Olvidar el rango anterior.
    current_aql = null;

    // Sin tipo de inspección no hay nada que buscar.
    if (type_id === "") {
        hide_inspection_result();
        return;
    }

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

        // Ignorar la respuesta si mientras tanto cambiaron el tipo.
        if (document.getElementById("inspection_type")?.value !== type_id) return;

        current_aql = result.aql;

        // Comparar con los defectos que ya estén escritos.
        evaluate_inspection();

    } catch (error) {

        console.error("Error al consultar la tabla AQL:", error);
        show_inspection_result("No se pudo consultar la tabla AQL.", "invalid");

    }
}


// Comparar los defectos con el renglón AQL encontrado.
function evaluate_inspection() {

    const type_id = document.getElementById("inspection_type")?.value ?? "";
    const defect_text = document.getElementById("inspection_defect")?.value.trim() ?? "";
    const quantity = Number(document.getElementById("inspection_quantity")?.textContent ?? 0);

    // Sin tipo de inspección no hay nada que mostrar.
    if (type_id === "") {
        hide_inspection_result();
        return;
    }

    // Sin renglón: cantidad fuera de tabla o tipo sin tabla AQL.
    if (!current_aql) {
        show_inspection_result(
            `No hay un LOAD SIZE para la cantidad (${quantity}) en este tipo de inspección.`,
            "invalid"
        );
        return;
    }

    const accept = Number(current_aql.accept);
    const sample_size = Number(current_aql.sample_size);

    const range_text =
        `LOAD SIZE ${current_aql.load_size}: revisar ${sample_size} piezas, ` +
        `acepta ${accept}, rechaza ${current_aql.reject}.`;


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


// Guardar la inspección en el historial de la PO.
function save_inspection(form) {

    const po_id = form.dataset.idPo;
    const type_select = document.getElementById("inspection_type");
    const type_error = document.getElementById("error_inspection_type");
    const defect_field = document.getElementById("inspection_defect");
    const defect_text = defect_field.value.trim();

    // Limpiar el error anterior del tipo.
    if (type_error) {
        type_error.hidden = true;
        type_error.textContent = "";
    }


    /* ==========================================
       VALIDAR ANTES DE GUARDAR
    ========================================== */

    // El tipo de inspección es obligatorio.
    if (type_select.value === "") {

        if (type_error) {
            type_error.textContent = "Seleccione un tipo de inspección.";
            type_error.hidden = false;
        }

        type_select.focus();
        return;
    }

    // Debe existir un LOAD SIZE para la cantidad.
    if (!current_aql) {
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
    if (defects > Number(current_aql.sample_size)) {
        evaluate_inspection();
        defect_field.focus();
        return;
    }


    /* ==========================================
       REGISTRAR LA INSPECCIÓN
    ========================================== */

    // Buscar los datos del tipo elegido (división y nivel).
    const type_data = pos_inspection_types.find(function (item) {
        return String(item.id_ins_type) === type_select.value;
    });

    const inspection = {
        id: next_inspection_id++,
        id_ins_type: type_select.value,
        division: type_data?.division ?? "—",
        type_name: type_data?.name_ins ?? type_select.options[type_select.selectedIndex].text,
        level: type_data?.level ?? "—",
        inspector: "—",
        date_time: get_date_time(),
        defects: defects,
        load_size: current_aql.load_size,
        sample_size: Number(current_aql.sample_size),
        result: defects <= Number(current_aql.accept) ? "Aceptado" : "Rechazado"
    };

    // Crear el historial de la PO si todavía no existe.
    if (!pos_inspections[po_id]) {
        pos_inspections[po_id] = [];
    }

    pos_inspections[po_id].push(inspection);

    close_form("assign_ins_js");

    console.log("Inspección guardada en PO con ID:", po_id);
    console.table(pos_inspections[po_id]);
}


// Abrir el modal Asignar usuario con las PO seleccionadas.
function open_assign_user() {

    const selected = get_selected_pos();

    // Debe haber al menos una PO seleccionada.
    if (selected.length === 0) {
        alert("Selecciona al menos una PO para asignar usuario.");
        return;
    }

    const table = document.getElementById("assign_user_table_body");

    if (!table) {
        console.error("No se encontró la tabla de Asignar usuario.");
        return;
    }

    // Abrir el modal con el formulario limpio.
    open_form("asing_user_js", true);

    // Llenar el select de usuarios.
    fill_select("bulk_user", "Seleccione un usuario", pos_users, "id_user", "name_user");

    // Limpiar filas anteriores.
    table.innerHTML = "";


    /* ==========================================
       AGREGAR UNA FILA POR PO
    ========================================== */

    selected.forEach(function (po_id) {

        const record = get_pos_by_id(po_id);
        if (!record) return;

        const quantities = record.quantities;
        const tr = document.createElement("tr");

        // Checkbox de la PO (marcado por defecto).
        const td_check = document.createElement("td");
        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.className = "select_assign_check";
        checkbox.value = po_id;
        checkbox.checked = true;

        td_check.appendChild(checkbox);
        tr.appendChild(td_check);

        // PO, Modelo, Artículo y Color.
        tr.appendChild(create_cell(quantities[1]));
        tr.appendChild(create_cell(quantities[2]));
        tr.appendChild(create_cell(quantities[3]));
        tr.appendChild(create_cell(quantities[4]));

        // Usuario asignado (muestra el actual si ya tiene uno).
        const assignment = pos_assignments[po_id];
        const td_user = create_cell(assignment?.name_user ?? "—");

        td_user.className = "assign_user_cell";
        tr.appendChild(td_user);

        if (assignment) {
            tr.dataset.idUser = assignment.id_user;
            tr.dataset.userName = assignment.name_user;
        }

        table.appendChild(tr);
    });

    // Sincronizar el checkbox principal de la tablita.
    update_select_all_assign();

    console.log("PO para asignar usuario:", selected);
}


// Actualizar el checkbox principal de Asignar usuario.
function update_select_all_assign() {

    const select_all = document.getElementById("select_all_assign");
    if (!select_all) return;

    const checkboxes = document.querySelectorAll(
        "#assign_user_table_body .select_assign_check"
    );

    const checked_boxes = document.querySelectorAll(
        "#assign_user_table_body .select_assign_check:checked"
    );

    select_all.checked =
        checkboxes.length > 0 &&
        checked_boxes.length === checkboxes.length;

    select_all.indeterminate =
        checked_boxes.length > 0 &&
        checked_boxes.length < checkboxes.length;
}


// Aplicar el usuario elegido a las PO marcadas de la tablita.
function apply_bulk_user() {

    const select = document.getElementById("bulk_user");
    const id_user = select?.value ?? "";

    // Debe haber un usuario elegido.
    if (id_user === "") {
        alert("Selecciona un usuario para aplicar.");
        return;
    }

    const name_user = select.options[select.selectedIndex].text;

    const checked_boxes = document.querySelectorAll(
        "#assign_user_table_body .select_assign_check:checked"
    );

    // Debe haber al menos una PO marcada.
    if (checked_boxes.length === 0) {
        alert("Marca al menos una PO para aplicar el usuario.");
        return;
    }


    /* ==========================================
       MOSTRAR EL USUARIO EN CADA FILA MARCADA
    ========================================== */

    checked_boxes.forEach(function (checkbox) {

        const tr = checkbox.closest("tr");

        // Guardar el usuario en la fila.
        tr.dataset.idUser = id_user;
        tr.dataset.userName = name_user;

        // Mostrarlo en la columna Usuario asignado.
        tr.querySelector(".assign_user_cell").textContent = name_user;

        // Desmarcar la fila para continuar con las demás.
        checkbox.checked = false;
    });

    update_select_all_assign();
}


// Guardar las asignaciones en la tabla de PO.
function save_assign_user() {

    const rows = document.querySelectorAll("#assign_user_table_body tr");

    // Filas que ya tienen un usuario aplicado.
    const assigned_rows = Array.from(rows).filter(tr => tr.dataset.idUser);

    if (assigned_rows.length === 0) {
        alert("Aplica un usuario a al menos una PO antes de guardar.");
        return;
    }


    /* ==========================================
       REGISTRAR LAS ASIGNACIONES
    ========================================== */

    assigned_rows.forEach(function (tr) {

        const po_id = tr.querySelector(".select_assign_check").value;
        const previous = pos_assignments[po_id];

        // Conservar la fecha si el usuario no cambió.
        const assigned_at =
            previous && previous.id_user === tr.dataset.idUser
                ? previous.assigned_at
                : get_pos_date();

        pos_assignments[po_id] = {
            id_user: tr.dataset.idUser,
            name_user: tr.dataset.userName,
            assigned_at: assigned_at
        };
    });

    // Actualizar la tabla y cerrar el modal.
    load_pos_table(pos_records);
    close_form("asing_user_js");

    console.log("Asignaciones guardadas:", pos_assignments);
}


// Abrir el modal de confirmación para eliminar.
function open_delete_pos() {

    const selected = get_selected_pos();

    if (selected.length === 0) {
        alert("Selecciona al menos una PO para eliminar.");
        return;
    }

    const modal = document.getElementById("delete_po_js");

    if (!modal) {
        console.error("No se encontró el modal Eliminar PO.");
        return;
    }

    // Guardar los ID en el modal.
    modal.dataset.idsPo = JSON.stringify(selected);

    open_form("delete_po_js");

    console.log("PO seleccionadas para eliminar:", selected);
}


// Confirmar y eliminar las PO seleccionadas.
function confirm_delete_pos() {

    const modal = document.getElementById("delete_po_js");
    const po_ids = JSON.parse(modal?.dataset.idsPo || "[]");

    if (po_ids.length === 0) {
        alert("No hay PO seleccionadas para eliminar.");
        return;
    }

    po_ids.forEach(function (po_id) {

        const record = get_pos_by_id(po_id);
        if (!record) return;

        // Eliminar las dos filas y su fecha.
        pos_records.splice(record.index, 2);
        delete pos_dates[po_id];

        // Eliminar su historial de inspecciones.
        delete pos_inspections[po_id];

        // Eliminar su asignación.
        delete pos_assignments[po_id];
    });

    load_pos_table(pos_records);
    close_form("delete_po_js");   // También limpia los IDs pendientes.

    console.log("PO eliminadas:", po_ids);
}



/* -------------------------------------  BLOQUE:  Guardar en la base de datos ------------------------------------- */

// Convertir un valor del Excel en número ("1,200" → 1200; vacío → null).
function to_number(value) {

    const text = String(value ?? "").replace(/,/g, "").trim();

    if (text === "") return null;

    const number = Number(text);

    return Number.isFinite(number) ? number : null;
}


// Separar una caja o rango: "41" → 41 / 41, "40-45" → 40 / 45.
function parse_box_range(value) {

    const text = String(value ?? "").trim();

    if (text === "") {
        return { min_box: null, max_box: null };
    }

    const [start, end = start] = text.split("-").map(part => to_number(part));

    return { min_box: start, max_box: end };
}


// Preparar las PO de la tabla para enviarlas a PHP.
function build_pos_payload() {

    const pos = [];

    // Omitir el encabezado y recorrer las PO de dos en dos.
    for (let i = 1; i < pos_records.length; i += 2) {

        const quantity_row = pos_records[i];
        const box_row = pos_records[i + 1] ?? [];
        const po_id = quantity_row[0];


        /* ==========================================
           TALLAS CON SUS PIEZAS Y CAJAS
        ========================================== */

        const sizes = {};

        // Las tallas están en las columnas 5 a 12.
        PO_HEADER.slice(5, 13).forEach(function (size_name, offset) {

            const column = 5 + offset;
            const pieces = to_number(quantity_row[column]);

            // Omitir tallas vacías.
            if (!pieces) return;

            sizes[size_name] = {
                pieces: pieces,
                ...parse_box_range(box_row[column])
            };
        });


        /* ==========================================
           DATOS GENERALES DE LA PO
        ========================================== */

        pos.push({
            number_po: String(quantity_row[1] ?? "").trim(),
            model: String(quantity_row[2] ?? "").trim(),
            article: String(quantity_row[3] ?? "").trim(),
            color: String(quantity_row[4] ?? "").trim(),
            rqstd: to_number(quantity_row[13]),
            delvd: to_number(quantity_row[14]),
            id_user: pos_assignments[po_id]?.id_user ?? null,
            sizes: sizes
        });
    }

    return pos;
}


// Enviar las PO a PHP para guardarlas.
async function save_pos_to_db() {

    const pos = build_pos_payload();

    if (pos.length === 0) {
        alert("No hay PO para guardar.");
        return;
    }

    // Evitar que se presione dos veces mientras se guarda.
    const button = document.getElementById("btn_save_pos");
    if (button) button.disabled = true;

    try {

        const response = await fetch("/sistema_calidad/php/pos.php?action=save_pos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pos: pos })
        });

        // PHP responde JSON también cuando hay error (400, 500).
        const result = await response.json().catch(() => null);

        if (!response.ok || !result?.success) {
            throw new Error(result?.message || `El servidor respondió ${response.status} (${response.statusText})`);
        }

        alert(result.message);
        console.log("PO guardadas:", result);

    } catch (error) {

        console.error("Error al guardar las PO:", error);
        alert(error.message);

    } finally {

        // Volver a habilitar el botón.
        if (button) button.disabled = false;

    }
}



/* -------------------------------------  BLOQUE:  Eventos ------------------------------------- */

/* ==========================================
   FOCUSIN
========================================== */

document.addEventListener("focusin", function (event) {

    const target = event.target;

    // Llenar el filtro de usuarios si todavía no tiene opciones.
    if (target.matches("#options_user_assing") && target.options.length <= 1) {
        fill_select("options_user_assing", "Todos", pos_users, "id_user", "name_user");
    }
});

/* ==========================================
   CHANGE
========================================== */

document.addEventListener("change", function (event) {

    const target = event.target;

    // Cargar archivo Excel.
    if (target.matches("#file_pos_excel")) {

        load_excel(target.files[0]);

        // Permitir seleccionar nuevamente el mismo archivo.
        target.value = "";
    }

    // Seleccionar todas las PO.
    if (target.matches("#select_all_pos")) {
        toggle_all_pos(target.checked);
    }

    // Actualizar el checkbox principal.
    if (target.matches("#pos_table_excel .select_pos_check")) {
        update_select_all();
    }

    // Asignar usuario: seleccionar todas las PO de la tablita.
    if (target.matches("#select_all_assign")) {
        document
            .querySelectorAll("#assign_user_table_body .select_assign_check")
            .forEach(checkbox => checkbox.checked = target.checked);
    }

    // Asignar usuario: actualizar el checkbox principal.
    if (target.matches("#assign_user_table_body .select_assign_check")) {
        update_select_all_assign();
    }

    // Asignar inspección: buscar el LOAD SIZE al cambiar el tipo.
    if (target.matches("#inspection_type")) {
        load_aql_range();
    }

    // Filtros de estado y mes/año.
    if (target.matches("#options_pos_status, #dpdn_pos_mounth")) {
        current_page = 1;
        filter_pos();
    }

    // Filtro de usuario asignado.
    if (target.matches("#options_user_assing")) {
        current_page = 1;
        filter_pos();
    }
});


/* ==========================================
   INPUT
========================================== */

document.addEventListener("input", function (event) {

    const target = event.target;

    // Buscador de PO.
    if (target.matches("#search_pos")) {
        current_page = 1;
        filter_pos();
    }

    // Quitar errores al escribir en los formularios.
    if (target.matches(".pos_form input, .pos_form select")) {
        clear_field_error(target);
    }

    // Asignar inspección: evaluar al escribir los defectos.
    if (target.matches("#inspection_defect")) {
        evaluate_inspection();
    }
});


/* ==========================================
   CLICK
========================================== */

document.addEventListener("click", function (event) {

    const target = event.target;

    // Cerrar el modal donde se presionó X o Cancelar.
    const close_button = target.closest(".btn_x_modal, .btn_cancel_po");

    if (close_button) {

        const modal = close_button.closest(
            MODAL_IDS.map(id => `#${id}`).join(", ")
        );

        if (modal) close_form(modal.id);

        return;
    }

    // Paginación: cambiar de página.
    const page_button = target.closest(".pos_pag button");

    if (page_button) {

        if (!page_button.disabled) {
            current_page = Number(page_button.dataset.page);
            filter_pos();
        }

        return;
    }

    // Modal Fechas de PO.
    const dates_button = target.closest(".btn_po_dates");

    if (dates_button) {
        open_pos_dates(dates_button.dataset.idPo);
        return;
    }

    // Botones de la barra de acciones.
    if (target.closest("#btn_new_pos")) return open_form("create_pos_js", true);
    if (target.closest("#btn_edit_pos")) return open_edit_pos();
    if (target.closest("#btn_delete_pos")) return open_delete_pos();
    if (target.closest("#btn_confirm_delete")) return confirm_delete_pos();
    if (target.closest("#btn_type_ins")) return open_assign_ins();
    if (target.closest("#btn_assign_user")) return open_assign_user();
    if (target.closest("#btn_apply_user")) return apply_bulk_user();
    if (target.closest("#btn_save_pos")) return save_pos_to_db();
});


/* ==========================================
   SUBMIT
========================================== */

document.addEventListener("submit", function (event) {

    const target = event.target;

    if (target.matches("#form_create_pos")) {
        event.preventDefault();
        create_pos(target);
    }

    if (target.matches("#form_edit_pos")) {
        event.preventDefault();
        save_edit_pos(target);
    }

    // Asignar inspección: guardar en el historial.
    if (target.matches("#form_assign_ins")) {
        event.preventDefault();
        save_inspection(target);
    }

    // Asignar usuario: guardar las asignaciones.
    if (target.matches("#form_assign_user")) {
        event.preventDefault();
        save_assign_user();
    }
});