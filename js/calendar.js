/* ------------------------------------------------ CALENDARIO DE LOS FILTROS -------------------------------------------------------------- */

// Calendario para los filtros de fecha de POs, Inspecciones y Defectos (parecido al de Windows).
// Vistas: días → (clic en el título) meses → (clic en el título) años.
// Se puede elegir un DÍA (valor "2026-11-25") o TODO EL MES (valor "2026-11").
// El valor se guarda en un <input type="hidden"> y se avisa con los eventos "input" y "change",
// así los filtros de cada módulo siguen funcionando igual.

const CALENDAR_MONTHS = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

const CALENDAR_DAYS = ["lu.", "ma.", "mi.", "ju.", "vi.", "sá.", "do."];

// Calendario abierto.
let calendar_popup = null;      // Cuadro del calendario
let calendar_toggle = null;     // Botón que lo abrió
let calendar_input = null;      // Campo oculto con el valor
let calendar_year = 0;          // Año que se está viendo
let calendar_month = 0;         // Mes que se está viendo (0 = enero)
let calendar_view = "days";     // "days", "months" o "years"


// Número con dos dígitos.
function calendar_pad(value) {
    return String(value).padStart(2, "0");
}


// Fecha de hoy con formato "2026-11-25".
function calendar_today() {

    const today = new Date();

    return `${today.getFullYear()}-${calendar_pad(today.getMonth() + 1)}-${calendar_pad(today.getDate())}`;
}


// Texto del botón según el valor elegido.
function calendar_label(value) {

    if (!value) return "Todas las fechas";

    const [year, month, day] = value.split("-");
    const month_name = CALENDAR_MONTHS[Number(month) - 1];

    // Todo el mes: "Noviembre 2026".
    if (!day) return `${month_name.charAt(0).toUpperCase()}${month_name.slice(1)} ${year}`;

    // Un día: "25 nov 2026".
    return `${Number(day)} ${month_name.slice(0, 3)} ${year}`;
}


// Actualizar el texto del botón de un campo.
function update_calendar_toggle(toggle) {

    const input = document.getElementById(toggle.dataset.target);
    const label = toggle.querySelector(".calendar_label");

    if (!input || !label) return;

    label.textContent = calendar_label(input.value);
    toggle.classList.toggle("has_value", input.value !== "");
}


// Crear el cuadro del calendario (una sola vez).
function create_calendar_popup() {

    const popup = document.createElement("div");
    popup.className = "calendar_popup";
    popup.setAttribute("role", "dialog");
    popup.setAttribute("aria-label", "Elegir fecha");
    popup.hidden = true;

    popup.innerHTML = `
        <div class="calendar_head">
            <button type="button" class="calendar_title" data-calendar="up"></button>

            <div class="calendar_arrows">
                <button type="button" class="calendar_nav" data-calendar="prev" aria-label="Anterior">
                    <i class="bi bi-chevron-up" aria-hidden="true"></i>
                </button>
                <button type="button" class="calendar_nav" data-calendar="next" aria-label="Siguiente">
                    <i class="bi bi-chevron-down" aria-hidden="true"></i>
                </button>
            </div>
        </div>

        <div class="calendar_weekdays" aria-hidden="true">
            ${CALENDAR_DAYS.map(day => `<span>${day}</span>`).join("")}
        </div>

        <div class="calendar_grid"></div>

        <div class="calendar_footer">
            <button type="button" data-calendar="clear">Limpiar</button>
            <button type="button" data-calendar="month" class="calendar_month_btn">Todo el mes</button>
            <button type="button" data-calendar="today" class="calendar_today_btn">Hoy</button>
        </div>
    `;

    document.body.appendChild(popup);
    return popup;
}


// Crear una celda (día, mes o año) del calendario.
function create_calendar_cell(text, data, classes, label) {

    const button = document.createElement("button");
    button.type = "button";
    button.className = `calendar_cell ${classes.filter(Boolean).join(" ")}`;
    button.textContent = text;
    button.setAttribute("aria-label", label);

    Object.entries(data).forEach(([key, value]) => button.dataset[key] = value);

    if (classes.includes("selected")) button.setAttribute("aria-pressed", "true");

    return button;
}


// Dibujar la vista actual.
function render_calendar() {

    const popup = calendar_popup;
    const value = calendar_input?.value ?? "";
    const today = calendar_today();

    const title = popup.querySelector(".calendar_title");
    const grid = popup.querySelector(".calendar_grid");

    popup.dataset.view = calendar_view;
    grid.innerHTML = "";


    /* ----- Vista de días ----- */
    if (calendar_view === "days") {

        const month_value = `${calendar_year}-${calendar_pad(calendar_month + 1)}`;

        title.textContent = `${CALENDAR_MONTHS[calendar_month]} de ${calendar_year}`;
        title.setAttribute("aria-label", "Ver los meses");

        // "Todo el mes" se marca si se eligió el mes completo.
        popup.querySelector(".calendar_month_btn").classList.toggle("selected", value === month_value);

        // Empezar en el lunes de la semana del día 1 y llenar 6 semanas (42 días).
        const first_day = (new Date(calendar_year, calendar_month, 1).getDay() + 6) % 7;
        const start = new Date(calendar_year, calendar_month, 1 - first_day);

        for (let i = 0; i < 42; i++) {

            const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
            const day_value = `${date.getFullYear()}-${calendar_pad(date.getMonth() + 1)}-${calendar_pad(date.getDate())}`;

            grid.appendChild(create_calendar_cell(
                date.getDate(),
                { day: day_value },
                [
                    "calendar_day",
                    date.getMonth() !== calendar_month ? "outside" : "",
                    day_value === today ? "today" : "",
                    day_value === value ? "selected" : ""
                ],
                `${date.getDate()} de ${CALENDAR_MONTHS[date.getMonth()]} de ${date.getFullYear()}`
            ));
        }
    }


    /* ----- Vista de meses ----- */
    if (calendar_view === "months") {

        title.textContent = `${calendar_year}`;
        title.setAttribute("aria-label", "Ver los años");

        const [value_year, value_month] = value.split("-").map(Number);
        const now = new Date();

        // 12 meses del año y 4 del siguiente (en gris), como en Windows.
        for (let i = 0; i < 16; i++) {

            const year = calendar_year + Math.floor(i / 12);
            const month = i % 12;

            grid.appendChild(create_calendar_cell(
                `${CALENDAR_MONTHS[month].slice(0, 3)}.`,
                { year: year, month: month },
                [
                    "calendar_month_cell",
                    year !== calendar_year ? "outside" : "",
                    year === now.getFullYear() && month === now.getMonth() ? "today" : "",
                    year === value_year && month + 1 === value_month ? "selected" : ""
                ],
                `${CALENDAR_MONTHS[month]} de ${year}`
            ));
        }
    }


    /* ----- Vista de años ----- */
    if (calendar_view === "years") {

        const decade = Math.floor(calendar_year / 10) * 10;

        title.textContent = `${decade} - ${decade + 9}`;
        title.setAttribute("aria-label", "Década");

        const value_year = Number(value.split("-")[0]);
        const now_year = new Date().getFullYear();

        // Dos años antes y cuatro después de la década (en gris), como en Windows.
        for (let i = 0; i < 16; i++) {

            const year = decade - 2 + i;

            grid.appendChild(create_calendar_cell(
                year,
                { year: year },
                [
                    "calendar_year_cell",
                    year < decade || year > decade + 9 ? "outside" : "",
                    year === now_year ? "today" : "",
                    year === value_year ? "selected" : ""
                ],
                `${year}`
            ));
        }
    }
}


// Abrir el calendario debajo de su botón.
function open_calendar(toggle) {

    calendar_popup ??= create_calendar_popup();

    calendar_toggle = toggle;
    calendar_input = document.getElementById(toggle.dataset.target);
    calendar_view = "days";

    // Mostrar el mes del valor elegido, o el mes actual.
    const [year, month] = (calendar_input?.value || calendar_today()).split("-");
    calendar_year = Number(year);
    calendar_month = Number(month) - 1;

    render_calendar();

    calendar_popup.hidden = false;
    toggle.setAttribute("aria-expanded", "true");

    position_calendar();
}


// Colocar el calendario debajo del botón (o arriba si no cabe).
function position_calendar() {

    if (!calendar_popup || calendar_popup.hidden || !calendar_toggle) return;

    const box = calendar_toggle.closest(".calendar_field") ?? calendar_toggle;
    const rect = box.getBoundingClientRect();
    const popup_rect = calendar_popup.getBoundingClientRect();

    let top = rect.bottom + 6;
    if (top + popup_rect.height > window.innerHeight - 10) top = Math.max(10, rect.top - popup_rect.height - 6);

    let left = rect.left;
    if (left + popup_rect.width > window.innerWidth - 10) left = window.innerWidth - popup_rect.width - 10;

    calendar_popup.style.top = `${top}px`;
    calendar_popup.style.left = `${Math.max(10, left)}px`;
}


// Cerrar el calendario.
function close_calendar() {

    if (!calendar_popup || calendar_popup.hidden) return;

    calendar_popup.hidden = true;
    calendar_toggle?.setAttribute("aria-expanded", "false");
    calendar_toggle?.focus();

    calendar_toggle = null;
    calendar_input = null;
}


// Guardar el valor elegido y avisar al filtro del módulo.
function set_calendar_value(value) {

    if (!calendar_input) return;

    calendar_input.value = value;
    calendar_input.dispatchEvent(new Event("input", { bubbles: true }));
    calendar_input.dispatchEvent(new Event("change", { bubbles: true }));

    update_calendar_toggle(calendar_toggle);
    close_calendar();
}


// Flechas: mes, año o década anterior / siguiente según la vista.
function move_calendar(step) {

    if (calendar_view === "days") {

        calendar_month += step;

        if (calendar_month < 0) { calendar_month = 11; calendar_year--; }
        if (calendar_month > 11) { calendar_month = 0; calendar_year++; }

    } else if (calendar_view === "months") {
        calendar_year += step;
    } else {
        calendar_year += step * 10;
    }

    render_calendar();
}


/* ------------------------------------------------ EVENTOS DEL CALENDARIO -------------------------------------------------------------- */

document.addEventListener("click", function (event) {

    const target = event.target;

    // Abrir o cerrar con el botón del filtro.
    const toggle = target.closest(".calendar_toggle");

    if (toggle) {
        const is_open = calendar_popup && !calendar_popup.hidden && calendar_toggle === toggle;

        close_calendar();
        if (!is_open) open_calendar(toggle);
        return;
    }

    // Clic fuera del calendario: cerrar.
    if (!calendar_popup || calendar_popup.hidden || !calendar_popup.contains(target)) {
        close_calendar();
        return;
    }

    const cell = target.closest(".calendar_cell");

    // Elegir un día.
    if (cell?.dataset.day) {
        set_calendar_value(cell.dataset.day);
        return;
    }

    // Elegir un mes: ver sus días.
    if (cell && cell.dataset.month !== undefined) {
        calendar_year = Number(cell.dataset.year);
        calendar_month = Number(cell.dataset.month);
        calendar_view = "days";
        render_calendar();
        return;
    }

    // Elegir un año: ver sus meses.
    if (cell?.dataset.year) {
        calendar_year = Number(cell.dataset.year);
        calendar_view = "months";
        render_calendar();
        return;
    }

    const action = target.closest("[data-calendar]")?.dataset.calendar;

    // Clic en el título: días → meses → años.
    if (action === "up") {
        if (calendar_view === "days") calendar_view = "months";
        else if (calendar_view === "months") calendar_view = "years";
        render_calendar();
        return;
    }

    if (action === "prev" || action === "next") {
        move_calendar(action === "prev" ? -1 : 1);
        return;
    }

    // Todo el mes que se está viendo.
    if (action === "month") {
        set_calendar_value(`${calendar_year}-${calendar_pad(calendar_month + 1)}`);
        return;
    }

    if (action === "today") {
        set_calendar_value(calendar_today());
        return;
    }

    if (action === "clear") {
        set_calendar_value("");
    }
});


// Escape cierra el calendario.
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") close_calendar();
});


// Mover el calendario junto con su botón si cambia el tamaño de la ventana o se desplaza la página.
window.addEventListener("resize", position_calendar);
document.addEventListener("scroll", position_calendar, true);