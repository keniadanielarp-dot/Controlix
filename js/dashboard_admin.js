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