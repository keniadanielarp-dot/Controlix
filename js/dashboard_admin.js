/* ------------------------------------------------ OPCION PRINCIPAL DASHBOARD -------------------------------------------------------------- */
//Boton de tres lineas para plegar y desplegar menu
const button_line = document.getElementById("button_line");
button_line.addEventListener("click", function () {

    // Plegar o desplegar
    document.body.classList.toggle("folded_panel");

    // Si está oculto...
    const folded = document.body.classList.contains("folded_panel");

    // Lo actualiza
    button_line.setAttribute("aria-expanded", String(!folded));
    button_line.setAttribute(
        "aria-label",
        folded ? "Mostrar menú" : "Ocultar menú"
    );
});


/* ------------------------------MOSTRAR SALUDO EN LA BARRA SUPERIOR DERECHA -------------------------------------------------------------- */
fetch("../php/dashboard_admin.php")
    .then(res => {
        if (!res.ok) {
            throw new Error("No se pudieron obtener los datos");
        }

        return res.json();
    })
    .then(data => {
        // Saludo en barra superior derecha
        document.getElementById("user_welc").textContent = "Hola, " + data.name_user;
        //Rol
        document.getElementById("rol_dash").textContent = data.rol;

        // Nombre del usuario en menu desplegable
        document.getElementById("name_profile").textContent = data.name_user;

        // Solo el administrador (id_rol = 1) ve el módulo Usuarios
        if (Number(data.id_rol) === 1) {
            document.getElementById("option_users").hidden = false;
        } else {
            document.getElementById("option_users").remove();
        }

    })
    .catch(error => {
        console.error("Error al cargar el perfil:", error);
    });


/* ---------------------------------------- FUNCION MARCAR OPCION -------------------------------------------------------------- */

// Quitar el resaltado de todas las opciones y marcar la seleccionada.
function mark_option(option) {

    document
        .querySelectorAll(".option_menu, .option_submenu")
        .forEach(item => item.classList.remove("activo"));

    option.classList.add("activo");
}


/* ------------------------------------------------ OPCION USUARIOS -------------------------------------------------------------- */

// Localiza el enlace de usuarios.
const option_users = document.getElementById("option_users");

// Cuando el usuario hace click...
option_users.addEventListener("click", async function (ev) {

    // Evita que el enlace navegue a otra página.
    ev.preventDefault();

    try {

        // Solicita el contenido de users.html.
        const res = await fetch("users.html");

        // Obtiene el contenido HTML.
        const content = await res.text();

        // Busca el contenedor principal del Dashboard.
        const container = document.getElementById("module_content");

        // Muestra el módulo Usuarios.
        container.innerHTML = content;

        // Cargar los registros reales en la tabla después de hacer click en la opcion Usuarios del panel.
        await users_table();

        // Actualiza el nombre del módulo en la ruta de navegación.
        const module_name = document.getElementById("module_name");

        if (module_name) {
            module_name.textContent = "Usuarios";
        }

        // Marcar Usuarios en el panel.
        mark_option(option_users);

    } catch (error) {

        // Muestra el error en la consola.
        console.error("Error al cargar Usuarios:", error);

    }

});
/* ---------------------------------------- OPCION POS -------------------------------------------------------------- */

// Localiza el enlace de usuarios.
const option_pos = document.getElementById("option_pos");

// Cuando el usuario hace click...
option_pos.addEventListener("click", async function (ev) {
    ev.preventDefault();
    try {
        const res = await fetch("pos.html");
        const content = await res.text();
        const container = document.getElementById("module_content");
        container.innerHTML = content;

        // Volver a dibujar las PO que ya estaban cargadas.
        load_pos_table(pos_records);

        const module_name = document.getElementById("module_name");
        if (module_name) {
            module_name.textContent = "Po's";
        }

        // Marcar Po's en el panel.
        mark_option(option_pos);

    } catch (error) {
        console.error("Error al cargar Dashboard Po's:", error);
    }
});

/* ---------------------------------------- FUNCION CARGAR MODULO -------------------------------------------------------------- */

// Cargar un archivo HTML dentro del Dashboard y actualizar la ruta.
async function load_module(file, name, option) {

    const res = await fetch(file);

    // Detener si el archivo no existe (404).
    if (!res.ok) {
        throw new Error(`No se encontró ${file} (${res.status})`);
    }

    const content = await res.text();
    const container = document.getElementById("module_content");
    container.innerHTML = content;

    // Actualizar el nombre del módulo en la ruta de navegación.
    const module_name = document.getElementById("module_name");

    if (module_name) {
        module_name.textContent = name;
    }

    // Marcar la opción seleccionada en el panel.
    mark_option(option);
}


/* ---------------------------------------- OPCION INSPECCIONES -------------------------------------------------------------- */

const option_inspections = document.getElementById("option_inspections");

option_inspections.addEventListener("click", async function (ev) {
    ev.preventDefault();

    // Avisar si hay PO sin guardar en la base de datos.
    if (!confirm_leave_pos()) return;

    try {
        await load_module("inspections.html", "Po's / Inspecciones", option_inspections);

        // Llenar el filtro de inspectores y dibujar la tabla.
        init_inspections_module();

    } catch (error) {
        console.error("Error al cargar Inspecciones:", error);
    }
});


/* ---------------------------------------- OPCION DEFECTOS -------------------------------------------------------------- */

const option_defects = document.getElementById("option_defects");

option_defects.addEventListener("click", async function (ev) {
    ev.preventDefault();

    // Avisar si hay PO sin guardar en la base de datos.
    if (!confirm_leave_pos()) return;

    try {
        await load_module("defects.html", "Po's / Defectos", option_defects);

        // Llenar los cuadros y dibujar la tabla de rechazadas.
        init_defects_module();
    } catch (error) {
        console.error("Error al cargar Defectos:", error);
    }
});


/* ---------------------------------------- OPCION GENERAL -------------------------------------------------------------- */

const option_general = document.getElementById("option_general");

option_general.addEventListener("click", async function (ev) {
    ev.preventDefault();

    // Avisar si hay PO sin guardar en la base de datos.
    if (!confirm_leave_pos()) return;

    try {
        await load_module("general.html", "General", option_general);

        // Llenar el select de inspecciones y las fotos.
        init_general_module();
    } catch (error) {
        console.error("Error al cargar General:", error);
    }
});


/* ---------------------------------------- OPCION RESUMEN -------------------------------------------------------------- */

const option_summary = document.getElementById("option_summary");

option_summary.addEventListener("click", async function (ev) {
    ev.preventDefault();

    // Avisar si hay PO sin guardar en la base de datos.
    if (!confirm_leave_pos()) return;

    try {
        await load_module("summary.html", "Resumen", option_summary);

        // Llenar el select de inspecciones.
        init_summary_module();

    } catch (error) {
        console.error("Error al cargar Resumen:", error);
    }
});


/* ---------------------------------------- OPCION MI PERFIL -------------------------------------------------------------- */

const option_profile = document.getElementById("option_profile");

option_profile.addEventListener("click", function (ev) {
    ev.preventDefault();

    // Avisar si hay PO sin guardar en la base de datos.
    if (!confirm_leave_pos()) return;

    // Copiar la plantilla de Mi Perfil (está en dashboard_admin.html) al contenedor.
    const template = document.getElementById("profile_template");
    const container = document.getElementById("module_content");

    container.innerHTML = "";
    container.appendChild(template.content.cloneNode(true));

    // Nombre y rol del usuario con sesión (los mismos de la barra superior).
    document.getElementById("profile_card_name").textContent =
        document.getElementById("name_profile").textContent;

    document.getElementById("profile_card_role").textContent =
        document.getElementById("rol_dash").textContent;

    // Actualizar el nombre del módulo en la ruta de navegación.
    const module_name = document.getElementById("module_name");

    if (module_name) {
        module_name.textContent = "Mi Perfil";
    }

    // Quitar el resaltado de las opciones del panel.
    document
        .querySelectorAll(".option_menu, .option_submenu")
        .forEach(item => item.classList.remove("activo"));
});


/* ------------------------------------------------ OPCION CERRAR SESION -------------------------------------------------------------- */

const logout_modal = document.getElementById("logout_js");

// Abrir el modal para confirmar.
function open_logout_modal() {

    // Mostrar el aviso solo si hay PO sin guardar.
    const has_pending = typeof has_unsaved_pos === "function" &&
        document.getElementById("pos_table_js") &&
        has_unsaved_pos();

    document.getElementById("logout_warning").hidden = !has_pending;

    logout_modal.hidden = false;
    document.getElementById("btn_confirm_logout").focus();
}

// Cerrar el modal sin salir.
function close_logout_modal() {
    logout_modal.hidden = true;
}

// Click en Cerrar Sesión del menú desplegable.
document.getElementById("option_logout").addEventListener("click", function (ev) {
    ev.preventDefault();
    open_logout_modal();
});

// Botones Cancelar y X.
document.querySelector(".btn_cancel_logout").addEventListener("click", close_logout_modal);
document.querySelector(".btn_close_logout").addEventListener("click", close_logout_modal);

// Click fuera del cuadro.
logout_modal.addEventListener("click", function (ev) {
    if (ev.target === logout_modal) close_logout_modal();
});

// Tecla Escape.
document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && !logout_modal.hidden) close_logout_modal();
});

// Confirmar: el PHP cierra la sesión y manda al Login.
document.getElementById("btn_confirm_logout").addEventListener("click", function () {
    window.location.href = "../php/dashboard_admin.php?action=logout";
});