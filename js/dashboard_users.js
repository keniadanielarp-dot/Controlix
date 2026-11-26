/* ------------------------------------------------ INTERFAZ DEL INSPECTOR (id_rol = 3) -------------------------------------------------------------- */

// Boton de tres lineas para plegar y desplegar menu
const button_line = document.getElementById("button_line");

button_line.addEventListener("click", function () {

    // Plegar o desplegar
    document.body.classList.toggle("folded_panel");

    // Si está oculto...
    const folded = document.body.classList.contains("folded_panel");

    // Lo actualiza
    button_line.setAttribute("aria-expanded", String(!folded));
    button_line.setAttribute("aria-label", folded ? "Mostrar menú" : "Ocultar menú");
});


/* ------------------------------MOSTRAR SALUDO EN LA BARRA SUPERIOR DERECHA -------------------------------------------------------------- */

// Nombre del inspector con sesión (se usa en el banner).
let inspector_name = "";

fetch("../php/dashboard_admin.php")
    .then(res => {
        if (!res.ok) {
            throw new Error("No se pudieron obtener los datos");
        }

        return res.json();
    })
    .then(data => {
        inspector_name = data.name_user;

        document.getElementById("user_welc").textContent = "Hola, " + data.name_user;
        document.getElementById("rol_dash").textContent = data.rol;
        document.getElementById("name_profile").textContent = data.name_user;
    })
    .catch(error => {
        console.error("Error al cargar el perfil:", error);
    });



/* ------------------------------------------------ BLOQUE: Datos de las POs -------------------------------------------------------------- */

// POs asignadas al inspector.
// Estado de cada una: "to_start" (Por iniciar), "in_progress" (En proceso) o "finished" (Finalizada).
let inspector_pos = [];

// Filtro rápido elegido ("" = Todas).
let inspector_filter = "";

// PO abierta en un modal.
let inspector_current = null;


// DATOS DE EJEMPLO mientras no se conecta la base de datos.
// Cuando exista la tabla de inspecciones, load_inspector_pos() traerá esto desde PHP con fetch.
const INSPECTOR_SAMPLE_POS = [
    {
        id_inspection: 1,
        po_number: "61998500",
        id_ins_type: 1,
        type_name: "AQL OUTBOUND INSPECTION - REGULAR ORDERS",
        level: "GENERAL INSPECTION LEVEL I",
        model: "MOD-101",
        color: "Collegiate Navy",
        quantity: 108,
        min_box: 1,
        max_box: 108,
        state: "to_start",
        started_at: null,
        finished_at: null,
        result: "Pendiente",
        defects: null,
        validations: {}
    },
    {
        id_inspection: 2,
        po_number: "65360060",
        id_ins_type: 2,
        type_name: "AQL OUTBOUND INSPECTION - JAPAN ORDERS",
        level: "GENERAL INSPECTION LEVEL II",
        model: "MOD-102",
        color: "Team Royal Blue",
        quantity: 99,
        min_box: 209,
        max_box: 307,
        state: "to_start",
        started_at: null,
        finished_at: null,
        result: "Pendiente",
        defects: null,
        validations: {}
    }
];


// Cargar las POs asignadas.
function load_inspector_pos() {

    inspector_pos = INSPECTOR_SAMPLE_POS.map(item => ({ ...item, validations: { ...item.validations } }));
    render_inspector_pos();
}


/* ------------------------------------------------ BLOQUE: Fechas y cronómetro -------------------------------------------------------------- */

// Fecha y hora con formato dd/mm/aaaa hh:mm.
function format_inspector_date(timestamp) {

    if (!timestamp) return "—";

    const date = new Date(timestamp);
    const pad = value => String(value).padStart(2, "0");

    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}


// Tiempo transcurrido con formato hh:mm:ss.
function format_elapsed(milliseconds) {

    const seconds = Math.max(0, Math.floor(milliseconds / 1000));
    const pad = value => String(value).padStart(2, "0");

    return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`;
}


// Duración con formato "1 h 43 min".
function format_duration(milliseconds) {

    const minutes = Math.max(0, Math.round(milliseconds / 60000));
    const hours = Math.floor(minutes / 60);

    return hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
}


// Actualizar los cronómetros cada segundo.
setInterval(function () {

    document.querySelectorAll(".inspector_timer [data-started]").forEach(function (element) {
        element.textContent = format_elapsed(Date.now() - Number(element.dataset.started));
    });

}, 1000);



/* ------------------------------------------------ BLOQUE: Tarjetas -------------------------------------------------------------- */

// Respuestas de validación contestadas.
function count_validations(item) {
    return Object.keys(item.validations ?? {}).length;
}


// Ya se puede finalizar: tiene resultado y todas las validaciones (las cajas son opcionales).
function can_finish(item) {
    return item.result !== "Pendiente" && count_validations(item) === VALIDATION_TOTAL;
}


// Dibujar contadores, banner y tarjetas.
function render_inspector_pos() {

    const container = document.getElementById("inspector_cards");
    if (!container) return;

    // Contadores.
    const count = state => inspector_pos.filter(item => item.state === state).length;

    document.getElementById("count_to_start").textContent = count("to_start");
    document.getElementById("count_in_progress").textContent = count("in_progress");
    document.getElementById("count_finished").textContent = count("finished");

    // Mensaje del banner.
    const pending = inspector_pos.length - count("finished");
    const banner = document.getElementById("inspector_banner_msg");

    banner.innerHTML = "";
    banner.append("Tienes ");

    const strong = document.createElement("strong");
    strong.textContent = `${pending} ${pending === 1 ? "PO" : "POs"} por inspeccionar`;
    banner.append(strong, ". Inicia una para registrar su inspección.");

    // Tarjetas del filtro elegido.
    const items = inspector_pos.filter(item => inspector_filter === "" || item.state === inspector_filter);

    container.innerHTML = "";

    if (items.length === 0) {

        const empty = document.createElement("div");
        empty.className = "inspector_empty";
        empty.innerHTML = '<i class="bi bi-inbox"></i>';
        empty.append(inspector_pos.length === 0 ? "No tienes POs asignadas." : "No hay POs con este filtro.");

        container.appendChild(empty);
        return;
    }

    items.forEach(item => container.appendChild(create_inspector_card(item)));
}


// Crear un elemento con clase y texto.
function create_element(tag, class_name = "", text = "") {

    const element = document.createElement(tag);

    if (class_name) element.className = class_name;
    if (text !== "") element.textContent = text;

    return element;
}


// Lista de datos (dt / dd).
function create_data_list(rows) {

    const list = create_element("dl", "inspector_data");

    rows.forEach(function ([label, value]) {
        list.append(create_element("dt", "", label));

        const dd = create_element("dd");

        if (value instanceof Node) dd.appendChild(value);
        else dd.textContent = value ?? "—";

        list.append(dd);
    });

    return list;
}


// Botón con ícono.
function create_button(class_name, icon, text, action) {

    const button = create_element("button", class_name);
    button.type = "button";
    button.dataset.action = action;
    button.innerHTML = `<i class="bi ${icon}" aria-hidden="true"></i>`;
    button.append(` ${text}`);

    return button;
}


// Tarjeta de una PO.
function create_inspector_card(item) {

    const card = create_element("article", `inspector_card ${item.state}`);
    card.dataset.id = item.id_inspection;

    const body = create_element("div", "inspector_card_body");

    // Número de PO y estado.
    const head = create_element("div", "inspector_card_head");
    const title = create_element("div");
    title.append(create_element("small", "", "PO"), create_element("strong", "", item.po_number));

    const state_text = { to_start: "Por iniciar", in_progress: "En proceso", finished: "Finalizada" }[item.state];
    head.append(title, create_element("span", `inspector_state ${item.state}`, state_text));

    // Tipo de inspección.
    body.append(head, create_element("div", "inspector_type", item.type_name));


    /* ----- Por iniciar ----- */
    if (item.state === "to_start") {

        body.append(
            create_data_list([
                ["Modelo", `${item.model} · ${item.color}`],
                ["Cantidad", `${item.quantity} piezas`],
                ["Nivel", item.level]
            ]),
            create_button("btn_start_po", "bi-play-fill", "Iniciar PO", "start")
        );
    }


    /* ----- En proceso ----- */
    if (item.state === "in_progress") {

        // Hora de inicio y cronómetro.
        const timer = create_element("div", "inspector_timer");
        const clock = create_element("strong", "", format_elapsed(Date.now() - item.started_at));
        clock.dataset.started = item.started_at;
        clock.setAttribute("aria-label", "Tiempo transcurrido");
        timer.append(create_element("span", "", `Iniciada ${format_inspector_date(item.started_at)}`), clock);

        // Resultado y Validaciones.
        const actions = create_element("div", "inspector_actions");
        actions.append(
            create_button("btn_insp_result", "bi-clipboard-data", "Resultado", "result"),
            create_button("btn_insp_validations", "bi-list-check", "Validaciones", "validations")
        );

        // Avance.
        const answered = count_validations(item);
        const progress = create_element("div", "inspector_progress");

        progress.append(
            create_element(
                "span",
                item.result !== "Pendiente" ? "done" : "",
                item.result !== "Pendiente" ? `✓ Resultado: ${item.result}` : "○ Resultado pendiente"
            ),
            create_element(
                "span",
                answered === VALIDATION_TOTAL ? "done" : "",
                `${answered === VALIDATION_TOTAL ? "✓" : "○"} Validaciones ${answered}/${VALIDATION_TOTAL}`
            ),
        );

        // Cajas (opcional): solo se muestran si se registraron.
        if (item.boxes) progress.append(create_element("span", "done", `✓ Cajas: ${item.boxes}`));

        // Finalizar (solo con resultado y validaciones completas).
        const finish = create_button("btn_finish_po", "bi-stop-fill", "Finalizar PO", "finish");
        finish.disabled = !can_finish(item);

        body.append(timer, actions, progress, finish);

        if (finish.disabled) {
            body.append(create_element("span", "inspector_hint", "Completa el resultado y las validaciones para finalizar."));
        }
    }


    /* ----- Finalizada ----- */
    if (item.state === "finished") {

        const result = create_element(
            "span",
            `inspector_result ${item.result === "Aceptado" ? "accepted" : "rejected"}`,
            item.result
        );

        const done = create_element("div", "inspector_done");
        done.innerHTML = '<i class="bi bi-check-lg" aria-hidden="true"></i>';
        done.append(" Inspección finalizada");

        body.append(
            create_data_list([
                ["Inicio", format_inspector_date(item.started_at)],
                ["Fin", format_inspector_date(item.finished_at)],
                ["Duración", format_duration(item.finished_at - item.started_at)],
                ["Cajas", item.boxes],
                ["Resultado", result]
            ]),
            done
        );
    }

    card.appendChild(body);
    return card;
}


// Buscar la PO de una tarjeta.
function get_inspector_item(id) {
    return inspector_pos.find(item => String(item.id_inspection) === String(id)) ?? null;
}



/* ------------------------------------------------ BLOQUE: Iniciar y finalizar -------------------------------------------------------------- */

// Iniciar PO: guardar la hora de inicio.
function start_inspector_po(item) {

    if (item.state !== "to_start") return;

    item.state = "in_progress";
    item.started_at = Date.now();

    render_inspector_pos();
}


// Abrir la confirmación para finalizar.
function open_finish_po(item) {

    if (!can_finish(item)) return;

    inspector_current = item;
    document.getElementById("insp_finish_po").textContent = item.po_number;
    open_insp_modal("insp_finish_js");
}


// Finalizar PO: guardar la hora de fin.
function finish_inspector_po() {

    const item = inspector_current;
    if (!item || !can_finish(item)) return;

    item.state = "finished";
    item.finished_at = Date.now();

    close_insp_modal("insp_finish_js");
    render_inspector_pos();
}



/* ------------------------------------------------ BLOQUE: Modales -------------------------------------------------------------- */

function open_insp_modal(id) {

    const modal = document.getElementById(id);
    if (!modal) return;

    modal.hidden = false;
    modal.querySelector("input, button.btn_insp_primary, button.btn_insp_danger")?.focus();
}


function close_insp_modal(id) {

    const modal = document.getElementById(id);
    if (modal) modal.hidden = true;
}



/* ------------------------------------------------ BLOQUE: Resultado -------------------------------------------------------------- */

// Renglón AQL de la PO que se está registrando.
let insp_aql = null;


// Abrir el modal Resultado.
async function open_insp_result(item) {

    inspector_current = item;
    insp_aql = null;

    document.getElementById("insp_result_po").textContent = item.po_number;
    document.getElementById("insp_result_quantity").textContent = `${item.quantity} piezas`;
    document.getElementById("insp_result_type").textContent = item.type_name;
    document.getElementById("insp_defects").value = item.defects ?? "";

    show_insp_result("Consultando la tabla AQL...", "info");
    open_insp_modal("insp_result_js");

    // Mismo rango AQL que usa el administrador.
    try {

        const response = await fetch(
            `/sistema_calidad/php/pos.php?action=aql_range&id_ins_type=${item.id_ins_type}&quantity=${item.quantity}`
        );

        if (!response.ok) {
            throw new Error(`El servidor respondió ${response.status} (${response.statusText})`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || "No se pudo consultar la tabla AQL.");
        }

        insp_aql = result.aql;
        evaluate_insp_result();

    } catch (error) {

        console.error("Error al consultar la tabla AQL:", error);
        show_insp_result("No se pudo consultar la tabla AQL.", "invalid");
    }
}


// Mostrar el rango o el resultado.
function show_insp_result(message, type) {

    const box = document.getElementById("insp_result_box");
    box.textContent = message;
    box.className = `insp_result_box ${type}`;
}


// Comparar los defectos con el renglón AQL. Regresa "Aceptado", "Rechazado" o null.
function evaluate_insp_result() {

    const text = document.getElementById("insp_defects").value.trim();

    if (!insp_aql) {
        show_insp_result("No hay un LOAD SIZE para esta cantidad en este tipo de inspección.", "invalid");
        return null;
    }

    const item = inspector_current;
    const accept = Number(insp_aql.accept);

    // Inspección 100%: se revisa la totalidad de las piezas.
    const full = String(item?.type_name ?? "").includes("100%");
    const sample_size = full ? Number(item.quantity) : Number(insp_aql.sample_size);

    const range_text = full
        ? `Revisión en la totalidad de piezas (${sample_size} piezas): acepta ${accept}, rechaza ${insp_aql.reject}.`
        : `LOAD SIZE ${insp_aql.load_size}: revisar ${sample_size} piezas, acepta ${accept}, rechaza ${insp_aql.reject}.`;

    if (text === "") {
        show_insp_result(range_text, "info");
        return null;
    }

    if (!/^\d+$/.test(text)) {
        show_insp_result("Ingrese un número entero de defectos.", "invalid");
        return null;
    }

    const defects = Number(text);

    if (defects > sample_size) {
        show_insp_result(`Los defectos no pueden ser más que las piezas revisadas (${sample_size}).`, "invalid");
        return null;
    }

    const result = defects <= accept ? "Aceptado" : "Rechazado";

    show_insp_result(`${range_text} Resultado: ${result.toUpperCase()}`, result === "Aceptado" ? "accepted" : "rejected");
    return result;
}


// Guardar el resultado en la PO.
function save_insp_result() {

    const item = inspector_current;
    const result = evaluate_insp_result();

    if (!item || !result) {
        document.getElementById("insp_defects").focus();
        return;
    }

    item.result = result;
    item.defects = Number(document.getElementById("insp_defects").value.trim());
    item.load_size = insp_aql.load_size;
    item.sample_size = String(item.type_name).includes("100%") ? Number(item.quantity) : Number(insp_aql.sample_size);

    close_insp_modal("insp_result_js");
    render_inspector_pos();
}



/* ------------------------------------------------ BLOQUE: Validaciones -------------------------------------------------------------- */

// COPIA de la lista de inspections.js (el inspector no carga ese archivo).
// Si cambian los puntos, cambiarlos en los dos archivos (o pasarla a la base de datos).
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

// Opciones de cada punto y su clase de color (colores de .btn_val_option en pos.css).
const VALIDATION_OPTIONS = [
    { value: "Conforme", class_name: "val_conform" },
    { value: "No conforme", class_name: "val_nonconform" },
    { value: "N/A", class_name: "val_na" }
];

const VALIDATION_TOTAL = VALIDATION_SECTIONS.reduce((sum, section) => sum + section.items.length, 0);

// Respuestas mientras se edita el modal (para poder cancelar).
let insp_answers = {};


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


// Revisar las cajas escritas y mostrar la ayuda debajo del campo. Regresa el resultado de parse_boxes.
function check_insp_boxes(show_empty_error = false) {

    const input = document.getElementById("insp_boxes");
    const help = document.getElementById("insp_boxes_help");
    const item = inspector_current;
    if (!input || !help || !item) return null;

    const min_box = item.min_box ?? null;
    const max_box = item.max_box ?? null;
    const range_text = min_box !== null ? `Cajas de la PO: ${min_box} a ${max_box}.` : "";

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


// Abrir el modal Validaciones.
function open_insp_validations(item) {

    inspector_current = item;
    insp_answers = { ...item.validations };

    document.getElementById("insp_val_po").textContent = item.po_number;

    // Cajas guardadas.
    document.getElementById("insp_boxes").value = item.boxes ?? "";
    check_insp_boxes();

    const container = document.getElementById("insp_val_sections");
    container.innerHTML = "";

    VALIDATION_SECTIONS.forEach(function (section) {

        const block = create_element("section", "insp_val_section");
        block.append(create_element("h3", "", section.title));

        section.items.forEach(function (point) {

            const row = create_element("div", "insp_val_item");
            const options = create_element("div", "insp_val_options");
            options.setAttribute("role", "group");
            options.setAttribute("aria-label", point.text);

            VALIDATION_OPTIONS.forEach(function (option) {

                const button = create_element("button", `btn_val_option ${option.class_name}`, option.value);
                button.type = "button";
                button.dataset.key = point.key;
                button.dataset.value = option.value;
                button.setAttribute("aria-pressed", String(insp_answers[point.key] === option.value));

                options.appendChild(button);
            });

            row.append(create_element("span", "", point.text), options);
            block.appendChild(row);
        });

        container.appendChild(block);
    });

    update_insp_val_count();
    open_insp_modal("insp_validations_js");
}


// Elegir una opción de un punto.
function select_insp_option(button) {

    insp_answers[button.dataset.key] = button.dataset.value;

    button.closest(".insp_val_options")
        .querySelectorAll(".btn_val_option")
        .forEach(option => option.setAttribute("aria-pressed", String(option === button)));

    update_insp_val_count();
}


// Marcar todos los puntos como Conforme.
function mark_all_insp_conform() {

    document.querySelectorAll("#insp_val_sections .btn_val_option.val_conform")
        .forEach(button => select_insp_option(button));
}


function update_insp_val_count() {
    document.getElementById("insp_val_answered").textContent =
        `${Object.keys(insp_answers).length} de ${VALIDATION_TOTAL}`;
}


// Guardar las respuestas en la PO.
function save_insp_validations() {

    const item = inspector_current;
    if (!item) return;

    // Cajas inspeccionadas (opcional): si se escriben, deben ser válidas.
    const boxes = check_insp_boxes();

    if (boxes?.error) {
        document.getElementById("insp_boxes").focus();
        return;
    }

    item.boxes = boxes?.text ?? null;
    item.boxes_count = boxes?.boxes.length ?? 0;
    item.validations = { ...insp_answers };

    close_insp_modal("insp_validations_js");
    render_inspector_pos();
}



/* ------------------------------------------------ BLOQUE: Eventos del inspector -------------------------------------------------------------- */

document.addEventListener("click", function (event) {

    const target = event.target;

    // Filtros rápidos.
    const filter = target.closest(".btn_inspector_filter");

    if (filter) {
        inspector_filter = filter.dataset.filter;

        document.querySelectorAll(".btn_inspector_filter")
            .forEach(button => button.setAttribute("aria-pressed", String(button === filter)));

        render_inspector_pos();
        return;
    }

    // Botones de las tarjetas.
    const action_button = target.closest(".inspector_card [data-action]");

    if (action_button) {

        const item = get_inspector_item(action_button.closest(".inspector_card").dataset.id);
        if (!item) return;

        const actions = {
            start: start_inspector_po,
            result: open_insp_result,
            validations: open_insp_validations,
            finish: open_finish_po
        };

        actions[action_button.dataset.action]?.(item);
        return;
    }

    // Opciones de validación.
    const option = target.closest("#insp_val_sections .btn_val_option");

    if (option) {
        select_insp_option(option);
        return;
    }

    if (target.closest("#btn_insp_val_all")) {
        mark_all_insp_conform();
        return;
    }

    // Confirmar Finalizar.
    if (target.closest("#btn_confirm_finish")) {
        finish_inspector_po();
        return;
    }

    // Cerrar modales con X o Cancelar.
    const close = target.closest(".insp_modal_overlay .btn_close_insp, .insp_modal_overlay .btn_insp_cancel");

    if (close) {
        close.closest(".insp_modal_overlay").hidden = true;
    }
});


document.addEventListener("input", function (event) {

    // Revisar el resultado mientras se escriben los defectos.
    if (event.target.matches("#insp_defects")) {
        evaluate_insp_result();
    }

    // Revisar las cajas mientras se escriben.
    if (event.target.matches("#insp_boxes")) {
        check_insp_boxes();
    }
});


document.addEventListener("submit", function (event) {

    if (event.target.matches("#form_insp_result")) {
        event.preventDefault();
        save_insp_result();
    }

    if (event.target.matches("#form_insp_validations")) {
        event.preventDefault();
        save_insp_validations();
    }
});


// Escape cierra el modal abierto.
document.addEventListener("keydown", function (event) {

    if (event.key !== "Escape") return;

    document.querySelectorAll(".insp_modal_overlay:not([hidden])")
        .forEach(modal => modal.hidden = true);
});



/* ---------------------------------------- OPCION MIS POS -------------------------------------------------------------- */

const option_my_pos = document.getElementById("option_my_pos");
const my_pos_content = document.getElementById("module_content").innerHTML;

option_my_pos.addEventListener("click", function (ev) {
    ev.preventDefault();

    // Volver a mostrar Mis POs (por si se abrió Mi Perfil).
    document.getElementById("module_content").innerHTML = my_pos_content;
    document.getElementById("module_name").textContent = "Mis POs";
    option_my_pos.classList.add("activo");

    // Mantener el filtro elegido.
    document.querySelectorAll(".btn_inspector_filter")
        .forEach(button => button.setAttribute("aria-pressed", String(button.dataset.filter === inspector_filter)));

    render_inspector_pos();
});



/* ---------------------------------------- OPCION MI PERFIL -------------------------------------------------------------- */

document.getElementById("option_profile").addEventListener("click", function (ev) {
    ev.preventDefault();

    // Copiar la plantilla de Mi Perfil al contenedor.
    const template = document.getElementById("profile_template");
    const container = document.getElementById("module_content");

    container.innerHTML = "";
    container.appendChild(template.content.cloneNode(true));

    // Nombre y rol del usuario con sesión.
    document.getElementById("profile_card_name").textContent =
        document.getElementById("name_profile").textContent;

    document.getElementById("profile_card_role").textContent =
        document.getElementById("rol_dash").textContent;

    document.getElementById("module_name").textContent = "Mi Perfil";
    option_my_pos.classList.remove("activo");
});



/* ------------------------------------------------ OPCION CERRAR SESION -------------------------------------------------------------- */

const logout_modal = document.getElementById("logout_js");

function open_logout_modal() {

    // El inspector no tiene POs sin guardar: no mostrar el aviso.
    document.getElementById("logout_warning").hidden = true;

    logout_modal.hidden = false;
    document.getElementById("btn_confirm_logout").focus();
}

function close_logout_modal() {
    logout_modal.hidden = true;
}

document.getElementById("option_logout").addEventListener("click", function (ev) {
    ev.preventDefault();
    open_logout_modal();
});

document.querySelector(".btn_cancel_logout").addEventListener("click", close_logout_modal);
document.querySelector(".btn_close_logout").addEventListener("click", close_logout_modal);

logout_modal.addEventListener("click", function (ev) {
    if (ev.target === logout_modal) close_logout_modal();
});

document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && !logout_modal.hidden) close_logout_modal();
});

document.getElementById("btn_confirm_logout").addEventListener("click", function () {
    window.location.href = "../php/dashboard_admin.php?action=logout";
});



/* ------------------------------------------------ INICIO -------------------------------------------------------------- */

load_inspector_pos();