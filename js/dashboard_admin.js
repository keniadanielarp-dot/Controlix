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


// Mostrar saludo en la barra superior derecha 
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

    } catch (error) {

        // Muestra el error en la consola.
        console.error("Error al cargar Usuarios:", error);

    }

});


// Tabla usuarios 
async function users_table() {

    try {

        // Solicitar los registros al archivo PHP.
        const res = await fetch("/sistema_calidad/php/users.php");

        // Convertir la respuesta JSON en un objeto JavaScript.
        const data = await res.json();

        // Localizar el cuerpo de la tabla.
        const table = document.getElementById("users_table_body");

        // Limpiar los registros anteriores.
        table.innerHTML = "";

        // Recorrer los usuarios obtenidos.
        data.users.forEach(function (u_database) {

            // Crear una fila.
            const row = document.createElement("tr");

            // Crear la casilla de selección.
            const selection = document.createElement("td");
            const ch_box = document.createElement("input");

            ch_box.type = "checkbox";
            ch_box.className = "select_user";
            ch_box.value = u_database.id_user;
            ch_box.setAttribute(
                "aria-label",
                "Seleccionar usuario " + u_database.id_user
            );

            selection.appendChild(ch_box);
            row.appendChild(selection);

            // Crear las celdas de información.
            const in_user = [
                u_database.id_user,
                u_database.name_user,
                u_database.user,
                "********",
                u_database.rol
            ];

            in_user.forEach(function (value) {

                const cell = document.createElement("td");

                cell.textContent = value;

                row.appendChild(cell);

            });

            // Agregar la fila a la tabla.
            table.appendChild(row);

        });

    } catch (error) {

        // Mostrar el error en la consola.
        console.error("Error al cargar usuarios:", error);

    }

}


/* ==========================================
   SELECCIONAR TODOS LOS USUARIOS
========================================== */

// Detectar cambios en las casillas de selección.
document.addEventListener("change", function (event) {

    // Obtener la casilla principal.
    const seleccionarTodos = document.getElementById("ch_all_users");

    // Obtener todas las casillas individuales.
    const usuarios = document.querySelectorAll(".select_user");

    // Verificar que el módulo Usuarios esté cargado.
    if (!seleccionarTodos) {
        return;
    }

    // =====================================
    // 1. SELECCIONAR O DESMARCAR TODOS
    // =====================================

    if (event.target.id === "ch_all_users") {

        usuarios.forEach(function (usuario) {

            usuario.checked = seleccionarTodos.checked;

        });

    }

    // =====================================
    // 2. SELECCIÓN INDIVIDUAL
    // =====================================

    if (event.target.classList.contains("select_user")) {

        // Contar las casillas seleccionadas.
        const seleccionados = document.querySelectorAll(
            ".select_user:checked"
        );

        // Marcar Seleccionar todo si todas están seleccionadas.
        seleccionarTodos.checked =
            usuarios.length > 0 &&
            seleccionados.length === usuarios.length;

    }

    // =====================================
    // 3. ESTADO INTERMEDIO
    // =====================================

    // Obtener nuevamente las casillas seleccionadas.
    const cantidadSeleccionados = document.querySelectorAll(
        ".select_user:checked"
    ).length;

    // Mostrar estado intermedio si solo algunas están marcadas.
    seleccionarTodos.indeterminate =
        cantidadSeleccionados > 0 &&
        cantidadSeleccionados < usuarios.length;

});


/* ==========================================
   BUSCADOR DE USUARIOS
========================================== */

// Detectar cuando se escribe en el buscador.
document.addEventListener("input", function (event) {

    // Comprobar que el evento proviene del buscador.
    if (event.target.id !== "search_user") {
        return;
    }

    // Obtener el texto ingresado y convertirlo a minúsculas.
    const busqueda = event.target.value.trim().toLowerCase();

    // Obtener todas las filas del cuerpo de la tabla.
    const filas = document.querySelectorAll(
        "#users_table_body tr"
    );

    // Recorrer cada fila para comprobar si coincide.
    filas.forEach(function (fila) {

        // Obtener las celdas de la fila.
        const celdas = fila.querySelectorAll("td");

        // Verificar que la fila tenga las columnas necesarias.
        if (celdas.length < 4) {
            return;
        }

        // Obtener los valores de ID, nombre y usuario.
        const id = celdas[1].textContent.toLowerCase();
        const nombre = celdas[2].textContent.toLowerCase();
        const usuario = celdas[3].textContent.toLowerCase();

        // Comprobar si alguno de los campos coincide.
        const coincide =
            id.includes(busqueda) ||
            nombre.includes(busqueda) ||
            usuario.includes(busqueda);

        // Mostrar u ocultar la fila según la coincidencia.
        fila.style.display = coincide ? "" : "none";

    });

});



/* ==========================================
   RECUPERAR CONTRASEÑA - ABRIR Y CERRAR MODAL
========================================== */

// Detectar los clics en los botones del módulo Usuarios.
document.addEventListener("click", function (event) {

    // =====================================
    // 1. ABRIR RECUPERAR CONTRASEÑA
    // =====================================

    if (event.target.closest("#btn_reset_password")) {

        // Obtener los usuarios seleccionados.
        const seleccionados = document.querySelectorAll(
            "#users_table_body .select_user:checked"
        );

        // Verificar que se haya seleccionado un usuario.
        if (seleccionados.length === 0) {
            alert("Seleccione un usuario para recuperar la contraseña.");
            return;
        }

        // Verificar que solamente se haya seleccionado uno.
        if (seleccionados.length > 1) {
            alert("Seleccione solo un usuario para recuperar la contraseña.");
            return;
        }

        // Obtener la fila del usuario seleccionado.
        const fila = seleccionados[0].closest("tr");

        // Obtener las celdas de la fila.
        const celdas = fila.querySelectorAll("td");

        // Recuperar los datos del usuario.
        const id = celdas[1].textContent.trim();
        const nombre = celdas[2].textContent.trim();
        const usuario = celdas[3].textContent.trim();

        // Mostrar los datos en el modal.
        document.getElementById("reset_user_id").textContent = id;
        document.getElementById("reset_user_name").textContent = nombre;
        document.getElementById("reset_username").textContent = usuario;

        // Limpiar el formulario.
        document.getElementById("reset_password_form").reset();

        // Ocultar mensajes de error anteriores.
        document.getElementById("password_error").hidden = true;

        // Ocultar la contraseña si estaba visible anteriormente.
        document.querySelectorAll(
            "#reset_password_modal .password_input_container"
        ).forEach(function (contenedor) {

            const input = contenedor.querySelector("input");
            const icono = contenedor.querySelector(".password_eye i");

            input.type = "password";
            icono.className = "bi bi-eye";

        });

        // Mostrar el cuadro.
        document.getElementById("reset_password_modal").hidden = false;

        // Colocar el cursor en Nueva contraseña.
        document.getElementById("new_password").focus();

    }


    // =====================================
    // 2. CERRAR EL CUADRO
    // =====================================

    if (
        event.target.closest("#btn_close_password") ||
        event.target.closest("#btn_cancel_password")
    ) {

        // Ocultar el cuadro.
        document.getElementById("reset_password_modal").hidden = true;

    }


    // =====================================
    // 3. MOSTRAR Y OCULTAR CONTRASEÑAS
    // =====================================

    const botonOjo = event.target.closest(".password_eye");

    if (botonOjo) {

        // Buscar el campo correspondiente al ojo presionado.
        const contenedor = botonOjo.closest(".password_input_container");

        const input = contenedor.querySelector("input");

        const icono = botonOjo.querySelector("i");

        // Alternar entre contraseña oculta y visible.
        if (input.type === "password") {

            input.type = "text";
            icono.className = "bi bi-eye-slash";

        } else {

            input.type = "password";
            icono.className = "bi bi-eye";

        }

    }

});



/* ==========================================
   VALIDAR RECUPERACIÓN DE CONTRASEÑA
========================================== */

// Detectar el envío del formulario.
document.addEventListener("submit", function (event) {

    // Verificar que sea el formulario correcto.
    if (event.target.id !== "reset_password_form") {
        return;
    }

    // Evitar que la página se recargue.
    event.preventDefault();

    // =====================================
    // 1. RECUPERAR LOS VALORES
    // =====================================

    const nueva = document.getElementById("new_password").value;
    const confirmar = document.getElementById("confirm_password").value;

    // Obtener los elementos del mensaje de error.
    const mensajeError = document.getElementById("password_error");
    const textoError = document.getElementById("password_error_text");

    // Ocultar errores anteriores.
    mensajeError.hidden = true;

    // Comprobar si ambas contraseñas coinciden.
if (nueva === confirmar && nueva.length >= 8) {

    // Ocultar el mensaje de error.
    mensajeError.hidden = true;

    // Limpiar el texto del mensaje anterior.
    textoError.textContent = "";

    // Confirmar la validación en la consola.
    console.log("Las contraseñas coinciden.");

    return;
}

    // =====================================
    // 2. VALIDAR CAMPOS VACÍOS
    // =====================================

    if (nueva === "" || confirmar === "") {

        textoError.textContent =
            "Debes completar ambos campos.";

        mensajeError.hidden = false;
        return;
    }

    // =====================================
    // 3. VALIDAR LONGITUD
    // =====================================

    if (nueva.length < 8) {

        textoError.textContent =
            "La contraseña debe tener al menos 8 caracteres.";

        mensajeError.hidden = false;
        return;
    }

    // =====================================
    // 4. COMPARAR CONTRASEÑAS
    // =====================================

    if (nueva !== confirmar) {

        textoError.textContent =
            "Las contraseñas no coinciden. Inténtelo de nuevo.";

        mensajeError.hidden = false;
        return;
    }

    // =====================================
    // 5. VALIDACIÓN CORRECTA
    // =====================================

    console.log("Las contraseñas coinciden.");

    // En el siguiente paso enviaremos los datos a PHP.

});


/* ==========================================
   NUEVO USUARIO - ABRIR, CERRAR Y MOSTRAR
   CONTRASEÑAS
========================================== */

// Detectar los clics en el módulo Usuarios.
document.addEventListener("click", function (event) {

    // =====================================
    // 1. ABRIR EL FORMULARIO NUEVO USUARIO
    // =====================================

    if (event.target.closest("#btn_new_user")) {

        // Obtener el modal y el formulario.
        const modal = document.getElementById("new_user_modal");
        const formulario = document.getElementById("new_user_form");

        // Limpiar los datos de registros anteriores.
        formulario.reset();

        // Ocultar mensajes de error anteriores.
        formulario.querySelectorAll(".new_user_field_error")
            .forEach(function (mensaje) {

                mensaje.hidden = true;
                mensaje.textContent = "";

            });

        // Quitar los bordes rojos de los campos.
        formulario.querySelectorAll(".input_error")
            .forEach(function (campo) {

                campo.classList.remove("input_error");

            });

        // Ocultar ambas contraseñas.
        formulario.querySelectorAll(".new_user_password_container")
            .forEach(function (contenedor) {

                const input = contenedor.querySelector("input");
                const icono = contenedor.querySelector(".new_user_eye i");

                input.type = "password";
                icono.className = "bi bi-eye";

            });

        // Mostrar el formulario.
        modal.hidden = false;

        // Colocar el cursor en Nombre completo.
        document.getElementById("new_user_name").focus();

        return;
    }


    // =====================================
    // 2. CERRAR EL FORMULARIO
    // =====================================

    if (
        event.target.closest("#btn_close_new_user") ||
        event.target.closest("#btn_cancel_new_user")
    ) {

        // Ocultar el modal sin guardar datos.
        document.getElementById("new_user_modal").hidden = true;

        return;
    }


    // =====================================
    // 3. MOSTRAR Y OCULTAR CONTRASEÑAS
    // =====================================

    const botonOjo = event.target.closest(
        "#new_user_modal .new_user_eye"
    );

    if (botonOjo) {

        // Buscar el campo asociado al ojo seleccionado.
        const contenedor = botonOjo.closest(
            ".new_user_password_container"
        );

        const input = contenedor.querySelector("input");
        const icono = botonOjo.querySelector("i");

        // Verificar si la contraseña está oculta.
        if (input.type === "password") {

            // Mostrar contraseña.
            input.type = "text";

            // Cambiar el ícono.
            icono.className = "bi bi-eye-slash";

            botonOjo.setAttribute(
                "aria-label",
                "Ocultar contraseña"
            );

        } else {

            // Ocultar contraseña.
            input.type = "password";

            // Restaurar el ícono.
            icono.className = "bi bi-eye";

            botonOjo.setAttribute(
                "aria-label",
                "Mostrar contraseña"
            );

        }

        return;
    }

});


/* ==========================================
   NUEVO USUARIO - VALIDACIÓN DEL FORMULARIO
========================================== */

// Detectar cuando se presiona Guardar.
document.addEventListener("submit", function (event) {

    // Verificar que sea el formulario Nuevo usuario.
    if (event.target.id !== "new_user_form") {
        return;
    }

    // Evitar que la página se recargue.
    event.preventDefault();

    // =====================================
    // 1. OBTENER LOS DATOS DEL FORMULARIO
    // =====================================

    const formulario = event.target;

    const nombre = document.getElementById("new_user_name");
    const usuario = document.getElementById("new_username");
    const password = document.getElementById("new_user_password");
    const confirmar = document.getElementById("new_user_confirm_password");
    const rol = document.getElementById("new_user_role");
    const estado = document.getElementById("new_user_status");

    // Controlar si existen errores.
    let formularioValido = true;


    // =====================================
    // 2. LIMPIAR ERRORES ANTERIORES
    // =====================================

    formulario.querySelectorAll(".new_user_field_error")
        .forEach(function (mensaje) {

            mensaje.hidden = true;
            mensaje.textContent = "";

        });

    formulario.querySelectorAll(".input_error")
        .forEach(function (campo) {

            campo.classList.remove("input_error");

        });


    // =====================================
    // 3. FUNCIÓN PARA MOSTRAR ERRORES
    // =====================================

    function mostrarError(campo, idMensaje, texto) {

        // Agregar borde rojo al campo.
        campo.classList.add("input_error");

        // Localizar el mensaje correspondiente.
        const mensaje = document.getElementById(idMensaje);

        // Mostrar el texto de error.
        mensaje.textContent = texto;
        mensaje.hidden = false;

        // Indicar que existe un error.
        formularioValido = false;
    }


    // =====================================
    // 4. VALIDAR NOMBRE COMPLETO
    // =====================================

    if (nombre.value.trim() === "") {

        mostrarError(
            nombre,
            "error_new_user_name",
            "Este campo es obligatorio."
        );

    }


    // =====================================
    // 5. VALIDAR NOMBRE DE USUARIO
    // =====================================

    if (usuario.value.trim() === "") {

        mostrarError(
            usuario,
            "error_new_username",
            "Este campo es obligatorio."
        );

    }


    // =====================================
    // 6. VALIDAR CONTRASEÑA
    // =====================================

    if (password.value === "") {

        mostrarError(
            password,
            "error_new_user_password",
            "Este campo es obligatorio."
        );

    } else if (password.value.length < 8) {

        mostrarError(
            password,
            "error_new_user_password",
            "La contraseña debe tener al menos 8 caracteres."
        );

    }


    // =====================================
    // 7. VALIDAR CONFIRMACIÓN
    // =====================================

    if (confirmar.value === "") {

        mostrarError(
            confirmar,
            "error_new_user_confirm_password",
            "Este campo es obligatorio."
        );

    } else if (password.value !== confirmar.value) {

        mostrarError(
            confirmar,
            "error_new_user_confirm_password",
            "Las contraseñas no coinciden. Inténtelo de nuevo."
        );

    }


    // =====================================
    // 8. VALIDAR ROL
    // =====================================

    if (rol.value === "") {

        mostrarError(
            rol,
            "error_new_user_role",
            "Selecciona un rol."
        );

    }


    // =====================================
    // 9. VALIDAR ESTADO
    // =====================================

    if (estado.value === "") {

        mostrarError(
            estado,
            "error_new_user_status",
            "Selecciona un estado."
        );

    }


    // =====================================
    // 10. RESULTADO DE LA VALIDACIÓN
    // =====================================

    if (!formularioValido) {

        // Enfocar el primer campo incorrecto.
        const primerError = formulario.querySelector(".input_error");

        if (primerError) {
            primerError.focus();
        }

        return;
    }

    // El formulario pasó todas las validaciones.
    // El registro real se implementará con PHP.

    console.log("Formulario validado correctamente.");

});


/* ==========================================
   NUEVO USUARIO - NOTIFICACIONES
========================================== */

// ==========================================
// 1. MOSTRAR NOTIFICACIÓN
// ==========================================

function mostrarNotificacionUsuario(tipo, mensaje) {

    // Obtener los elementos de la notificación.
    const modal = document.getElementById("new_user_notification");
    const icono = document.getElementById("user_notification_icon");
    const titulo = document.getElementById("user_notification_title");
    const texto = document.getElementById("user_notification_message");

    // Limpiar estilos anteriores.
    icono.classList.remove("success", "error");

    // =====================================
    // NOTIFICACIÓN DE ÉXITO
    // =====================================

    if (tipo === "success") {

        icono.classList.add("success");
        icono.innerHTML = '<i class="bi bi-check-circle-fill"></i>';

        titulo.textContent = "Usuario registrado";
        texto.textContent = mensaje;

    }

    // =====================================
    // NOTIFICACIÓN DE ERROR
    // =====================================

    else if (tipo === "error") {

        icono.classList.add("error");
        icono.innerHTML = '<i class="bi bi-x-circle-fill"></i>';

        titulo.textContent = "No se pudo registrar";
        texto.textContent = mensaje;

    }

    // Mostrar la notificación.
    modal.hidden = false;

    // Enfocar el botón Aceptar.
    document.getElementById("btn_notification_accept").focus();

}


// ==========================================
// 2. CERRAR NOTIFICACIÓN
// ==========================================

document.addEventListener("click", function (event) {

    if (event.target.closest("#btn_notification_accept")) {

        // Ocultar la notificación.
        document.getElementById("new_user_notification").hidden = true;

    }

});



/* ==========================================
   EDITAR USUARIO - ABRIR Y CERRAR MODAL
========================================== */

// Detectar los clics de los botones de Editar usuario.
document.addEventListener("click", function (event) {

    // =====================================
    // 1. ABRIR EL FORMULARIO EDITAR USUARIO
    // =====================================

    if (event.target.closest("#btn_edit_user")) {

        // Obtener los usuarios seleccionados.
        const seleccionados = document.querySelectorAll(
            "#users_table_body .select_user:checked"
        );

        // Verificar que exista un usuario seleccionado.
        if (seleccionados.length === 0) {

            alert("Seleccione un usuario para editar.");

            return;
        }

        // Verificar que solamente exista uno.
        if (seleccionados.length > 1) {

            alert("Seleccione solo un usuario para editar.");

            return;
        }

        // =====================================
        // 2. RECUPERAR LOS DATOS DE LA TABLA
        // =====================================

        // Obtener la fila del usuario seleccionado.
        const fila = seleccionados[0].closest("tr");

        // Obtener todas las celdas de la fila.
        const celdas = fila.querySelectorAll("td");

        // Recuperar ID, nombre y usuario.
        const id = celdas[1].textContent.trim();
        const nombre = celdas[2].textContent.trim();
        const usuario = celdas[3].textContent.trim();

        // =====================================
        // 3. LIMPIAR EL FORMULARIO
        // =====================================

        const formulario = document.getElementById("edit_user_form");

        formulario.reset();

        // Ocultar mensajes de error anteriores.
        formulario.querySelectorAll(".edit_user_field_error")
            .forEach(function (mensaje) {

                mensaje.hidden = true;
                mensaje.textContent = "";

            });

        // Quitar bordes rojos anteriores.
        formulario.querySelectorAll(".input_error")
            .forEach(function (campo) {

                campo.classList.remove("input_error");

            });

        // =====================================
        // 4. COLOCAR LOS DATOS DEL USUARIO
        // =====================================

        document.getElementById("edit_user_id").value = id;

        document.getElementById("edit_user_name").value = nombre;

        document.getElementById("edit_username").value = usuario;

        // Mantener las contraseñas vacías.
        document.getElementById("edit_user_password").value = "";

        document.getElementById("edit_user_confirm_password").value = "";

        // =====================================
        // 5. RESTAURAR LOS ÍCONOS DE OJO
        // =====================================

        formulario.querySelectorAll(".edit_user_password_container")
            .forEach(function (contenedor) {

                const input = contenedor.querySelector("input");

                const icono = contenedor.querySelector(".edit_user_eye i");

                input.type = "password";

                icono.className = "bi bi-eye";

            });

        // =====================================
        // 6. MOSTRAR EL FORMULARIO
        // =====================================

        document.getElementById("edit_user_modal").hidden = false;

        // Colocar el cursor en Nombre completo.
        document.getElementById("edit_user_name").focus();

        return;
    }


    // =====================================
    // 7. CERRAR EL FORMULARIO
    // =====================================

    if (
        event.target.closest("#btn_close_edit_user") ||
        event.target.closest("#btn_cancel_edit_user")
    ) {

        document.getElementById("edit_user_modal").hidden = true;

        return;
    }


    // =====================================
    // 8. MOSTRAR Y OCULTAR CONTRASEÑAS
    // =====================================

    const botonOjo = event.target.closest(
        "#edit_user_modal .edit_user_eye"
    );

    if (botonOjo) {

        // Obtener el contenedor del campo seleccionado.
        const contenedor = botonOjo.closest(
            ".edit_user_password_container"
        );

        const input = contenedor.querySelector("input");

        const icono = botonOjo.querySelector("i");

        // Alternar entre contraseña visible y oculta.
        if (input.type === "password") {

            input.type = "text";

            icono.className = "bi bi-eye-slash";

            botonOjo.setAttribute(
                "aria-label",
                "Ocultar contraseña"
            );

        } else {

            input.type = "password";

            icono.className = "bi bi-eye";

            botonOjo.setAttribute(
                "aria-label",
                "Mostrar contraseña"
            );

        }

        return;
    }

});



/* ==========================================
   EDITAR USUARIO - VALIDACIONES DEL FORMULARIO
========================================== */

document.addEventListener("submit", function (event) {

    // 1. Comprobar que se envió el formulario Editar usuario.
    if (event.target.id !== "edit_user_form") {
        return;
    }

    // Evitar que el navegador recargue la página.
    event.preventDefault();

    const formulario = event.target;

    // =====================================
    // 2. OBTENER LOS CAMPOS
    // =====================================

    const nombre = formulario.querySelector("#edit_user_name");
    const usuario = formulario.querySelector("#edit_username");
    const password = formulario.querySelector("#edit_user_password");
    const confirmar = formulario.querySelector("#edit_user_confirm_password");
    const rol = formulario.querySelector("#edit_user_role");
    const estado = formulario.querySelector("#edit_user_status");

    // =====================================
    // 3. LIMPIAR ERRORES ANTERIORES
    // =====================================

    formulario.querySelectorAll(".edit_user_field_error")
        .forEach(function (mensaje) {
            mensaje.textContent = "";
            mensaje.hidden = true;
        });

    formulario.querySelectorAll(".input_error")
        .forEach(function (campo) {
            campo.classList.remove("input_error");
        });

    // Guardará el primer campo que tenga un error.
    let primerCampoIncorrecto = null;

    // =====================================
    // 4. FUNCIÓN PARA MOSTRAR ERRORES
    // =====================================

    function mostrarError(campo, idMensaje, texto) {

        const mensaje = document.getElementById(idMensaje);

        mensaje.textContent = texto;
        mensaje.hidden = false;

        campo.classList.add("input_error");

        // Guardar únicamente el primer campo incorrecto.
        if (primerCampoIncorrecto === null) {
            primerCampoIncorrecto = campo;
        }
    }

    // =====================================
    // 5. VALIDAR NOMBRE COMPLETO
    // =====================================

    if (nombre.value.trim() === "") {

        mostrarError(
            nombre,
            "error_edit_user_name",
            "El nombre completo es obligatorio."
        );
    }

    // =====================================
    // 6. VALIDAR NOMBRE DE USUARIO
    // =====================================

    if (usuario.value.trim() === "") {

        mostrarError(
            usuario,
            "error_edit_username",
            "El nombre de usuario es obligatorio."
        );
    }

    // =====================================
    // 7. VALIDAR CONTRASEÑAS
    // =====================================

    const nuevaPassword = password.value;
    const confirmarPassword = confirmar.value;

    // Si las dos están vacías, no se cambia la contraseña.
    if (nuevaPassword !== "" || confirmarPassword !== "") {

        if (nuevaPassword === "") {

            mostrarError(
                password,
                "error_edit_user_password",
                "Escribe la nueva contraseña."
            );

        } else if (nuevaPassword.length < 8) {

            mostrarError(
                password,
                "error_edit_user_password",
                "La contraseña debe tener mínimo 8 caracteres."
            );
        }

        if (confirmarPassword === "") {

            mostrarError(
                confirmar,
                "error_edit_user_confirm_password",
                "Confirma la nueva contraseña."
            );

        } else if (nuevaPassword !== confirmarPassword) {

            mostrarError(
                confirmar,
                "error_edit_user_confirm_password",
                "Las contraseñas no coinciden."
            );
        }
    }

    // =====================================
    // 8. VALIDAR ROL
    // =====================================

    if (rol.value === "") {

        mostrarError(
            rol,
            "error_edit_user_role",
            "Selecciona un rol."
        );
    }

    // =====================================
    // 9. VALIDAR ESTADO
    // =====================================

    if (estado.value !== "1" && estado.value !== "0") {

        mostrarError(
            estado,
            "error_edit_user_status",
            "Selecciona un estado válido."
        );
    }

    // =====================================
    // 10. COMPROBAR RESULTADO
    // =====================================

    if (primerCampoIncorrecto !== null) {

        primerCampoIncorrecto.focus();

        return;
    }

    // =====================================
    // 11. FORMULARIO VÁLIDO
    // =====================================

    // Por ahora solo confirmamos la validación.
    // Todavía NO se actualiza MariaDB.

    console.log("Formulario Editar usuario validado correctamente.");

});



/* ==========================================
   ELIMINAR USUARIO - CONFIRMACIÓN
========================================== */

document.addEventListener("click", function (event) {

    // =====================================
    // 1. ABRIR EL MODAL DE CONFIRMACIÓN
    // =====================================

    if (event.target.closest("#btn_delete_user")) {

        // Obtener los usuarios seleccionados.
        const seleccionados = document.querySelectorAll(
            "#users_table_body .select_user:checked"
        );

        // Verificar que exista al menos un usuario seleccionado.
        if (seleccionados.length === 0) {

            alert("Selecciona al menos un usuario para eliminar.");

            return;
        }

        // Obtener el mensaje del modal.
        const mensaje = document.getElementById(
            "delete_user_message"
        );

        // Adaptar el mensaje a la cantidad seleccionada.
        if (seleccionados.length === 1) {

            mensaje.textContent =
                "¿Estás seguro de que deseas eliminar el usuario seleccionado?";

        } else {

            mensaje.textContent =
                "¿Estás seguro de que deseas eliminar los " +
                seleccionados.length +
                " usuarios seleccionados?";
        }

        // Mostrar la ventana de confirmación.
        document.getElementById(
            "delete_user_modal"
        ).hidden = false;

        // Colocar el foco en Cancelar por seguridad.
        document.getElementById(
            "btn_cancel_delete_user"
        ).focus();

        return;
    }


    // =====================================
    // 2. CERRAR EL MODAL SIN ELIMINAR
    // =====================================

    if (
        event.target.closest("#btn_cancel_delete_user") ||
        event.target.closest("#btn_close_delete_user")
    ) {

        document.getElementById(
            "delete_user_modal"
        ).hidden = true;

        return;
    }


    // =====================================
    // 3. CONFIRMAR LA ELIMINACIÓN
    // =====================================

    if (event.target.closest("#btn_confirm_delete_user")) {

        // Todavía no eliminamos usuarios.
        // La operación se implementará posteriormente en PHP.

        console.log(
            "El administrador confirmó la eliminación."
        );

        // Cerrar la ventana de confirmación.
        document.getElementById(
            "delete_user_modal"
        ).hidden = true;

        return;
    }

});



