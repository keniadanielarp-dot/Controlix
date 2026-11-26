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
        // El inspector (id_rol = 3) tiene su propia interfaz
        if (Number(data.id_rol) === 3) {
            window.location.replace("dashboard_users.html");
            return;
        }

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
        const res = await fetch("users.html", { cache: "no-store" });

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
        const res = await fetch("pos.html", { cache: "no-store" });
        const content = await res.text();
        const container = document.getElementById("module_content");
        container.innerHTML = content;

        // Volver a dibujar las PO que ya estaban cargadas.
        load_pos_table(pos_records);

        // Si todavía no hay PO (por ejemplo, después de iniciar sesión), traerlas de la base de datos.
        if (pos_records.length <= 1) {
            await load_pos_from_db();
        }

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

    // no-store: siempre traer la versión más nueva del archivo (sin usar la guardada del navegador).
    const res = await fetch(file, { cache: "no-store" });

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


/* ------------------------------------------------ CÁMARA (computadora o teléfono) -------------------------------------------------------------- */

// Datos de la cámara abierta.
let camera_stream = null;
let camera_facing = "environment";   // "environment" = trasera, "user" = frontal
let camera_on_photo = null;
let camera_file = null;
let camera_preview_url = null;


// Abrir la cámara. on_photo recibe la foto (File) cuando el usuario da "Usar foto".
// fallback_input: campo <input type="file" capture> que se usa si el navegador no deja abrir la cámara.
async function open_camera(on_photo, fallback_input = null) {

    // Sin HTTPS (por ejemplo el teléfono entrando por la IP de la computadora) el navegador
    // no deja usar la cámara desde la página: abrir la cámara del teléfono con el campo de archivo.
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        fallback_input?.click();
        return;
    }

    camera_on_photo = on_photo;

    const started = await start_camera_stream();

    if (!started) {
        fallback_input?.click();
        return;
    }

    show_camera_live();
    document.getElementById("camera_js").hidden = false;

    // Mostrar "Cambiar cámara" solo si hay más de una.
    const devices = await navigator.mediaDevices.enumerateDevices();
    document.getElementById("btn_switch_camera").hidden =
        devices.filter(device => device.kind === "videoinput").length < 2;
}


// Encender la cámara y mostrarla en el video.
async function start_camera_stream() {

    stop_camera_stream();

    try {
        camera_stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: camera_facing },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        });

        document.getElementById("camera_video").srcObject = camera_stream;
        return true;

    } catch (error) {

        console.error("No se pudo abrir la cámara:", error);

        alert(
            error.name === "NotAllowedError"
                ? "No se dio permiso para usar la cámara. Actívalo en el navegador e inténtalo de nuevo."
                : "No se encontró una cámara disponible."
        );

        return false;
    }
}


// Apagar la cámara.
function stop_camera_stream() {

    camera_stream?.getTracks().forEach(track => track.stop());
    camera_stream = null;

    const video = document.getElementById("camera_video");
    if (video) video.srcObject = null;
}


// Mostrar la cámara en vivo (ocultar la foto tomada).
function show_camera_live() {

    if (camera_preview_url) URL.revokeObjectURL(camera_preview_url);
    camera_preview_url = null;
    camera_file = null;

    document.getElementById("camera_video").hidden = false;
    document.getElementById("camera_preview").hidden = true;
    document.getElementById("camera_live_buttons").hidden = false;
    document.getElementById("camera_photo_buttons").hidden = true;
}


// Tomar la foto del video.
function take_camera_photo() {

    const video = document.getElementById("camera_video");
    if (!video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    canvas.toBlob(function (blob) {

        if (!blob) return;

        // Nombre con la fecha y hora: foto_20261125_091530.jpg
        const stamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "_");
        camera_file = new File([blob], `foto_${stamp}.jpg`, { type: "image/jpeg" });

        camera_preview_url = URL.createObjectURL(blob);

        const preview = document.getElementById("camera_preview");
        preview.src = camera_preview_url;
        preview.hidden = false;

        video.hidden = true;
        document.getElementById("camera_live_buttons").hidden = true;
        document.getElementById("camera_photo_buttons").hidden = false;

    }, "image/jpeg", 0.9);
}


// Cerrar la cámara.
function close_camera() {

    stop_camera_stream();
    show_camera_live();

    document.getElementById("camera_js").hidden = true;
    camera_on_photo = null;
}


// Botones del modal de la cámara.
document.getElementById("btn_take_photo").addEventListener("click", take_camera_photo);
document.getElementById("btn_retake_photo").addEventListener("click", show_camera_live);
document.querySelector(".btn_close_camera").addEventListener("click", close_camera);

document.getElementById("btn_use_photo").addEventListener("click", function () {

    const on_photo = camera_on_photo;
    const file = camera_file;

    close_camera();

    if (file && on_photo) on_photo(file);
});

document.getElementById("btn_switch_camera").addEventListener("click", async function () {

    camera_facing = camera_facing === "environment" ? "user" : "environment";
    await start_camera_stream();
    show_camera_live();
});

// Escape cierra la cámara.
document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" && !document.getElementById("camera_js").hidden) close_camera();
});