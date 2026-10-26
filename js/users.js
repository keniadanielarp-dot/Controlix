
/* Metodo para seleccionar todos los usuarios */

// Detectar cambios en las casillas de selección.
document.addEventListener("change", function (event) {

    // Obtener la casilla principal.
    const ch_select_all = document.getElementById("select_all_users");

    // Obtener todas las casillas individuales.
    const usuarios = document.querySelectorAll(".select_user");

    // Verificar que el módulo Usuarios esté cargado.
    if (!ch_select_all) {
        return;
    }

    // =====================================
    // 1. SELECCIONAR O DESMARCAR TODOS
    // =====================================

    if (event.target.id === "select_all_users") {

        usuarios.forEach(function (usuario) {

            usuario.checked = ch_select_all.checked;
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
        ch_select_all.checked =
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
    ch_select_all.indeterminate =
        cantidadSeleccionados > 0 &&
        cantidadSeleccionados < usuarios.length;

});


/* ==========================================
   CARGAR ROLES DESDE MARIADB
========================================== */

function cargarRoles(idSelect) {

    // Obtener el menú desplegable
    const selectRol = document.getElementById(idSelect);

    // Limpiar las opciones anteriores
    selectRol.innerHTML = '<option value="">Selecciona un rol</option>';

    // Solicitar los roles a PHP
    fetch("/sistema_calidad/php/users.php?action=roles")

        .then(response => {

            // Verificar que la petición sea correcta
            if (!response.ok) {
                throw new Error("No se pudieron obtener los roles.");
            }

            return response.json();
        })

        .then(resultado => {

            // Comprobar que PHP devolvió los roles
            if (!resultado.success || !Array.isArray(resultado.roles)) {
                throw new Error("Respuesta de roles no válida.");
            }

            // Recorrer los roles registrados
            resultado.roles.forEach(rol => {

                // Crear una opción para cada rol
                const opcion = document.createElement("option");

                // Guardar el identificador del rol
                opcion.value = rol.id_rol;

                // Mostrar el nombre del rol
                opcion.textContent = rol.rol;

                // Agregar la opción al menú
                selectRol.appendChild(opcion);

            });

        })

        .catch(error => {

            // Mostrar el error en la consola
            console.error("Error al cargar roles:", error);

        });

}



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
   NUEVO USUARIO - ABRIR, CERRAR Y MOSTRAR
   CONTRASEÑAS
========================================== */

// Detectar los clics en el módulo Usuarios.
document.addEventListener("click", function (event) {

    // Solicitar los roles registrados en MariaDB
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
        cargarRoles("new_user_role");

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
document.addEventListener("submit", async function (event) {

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


    /* ==========================================
       ENVIAR NUEVO USUARIO A PHP
    ========================================== */

    // Preparar los datos del formulario
    const datos = new URLSearchParams();

    datos.append("name_user_js", nombre.value.trim());
    datos.append("user_js", usuario.value.trim());
    datos.append("new_pass_js", password.value);
    datos.append("conf_pass_js", confirmar.value);
    datos.append("rol_js", rol.value);
    datos.append("status_js", estado.value);


    // =====================================
    // 12. ENVIAR LOS DATOS A PHP
    // =====================================

    try {

        const respuesta = await fetch(
            "/sistema_calidad/php/users.php",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: datos.toString()
            }
        );

        // Convertir la respuesta de PHP a un objeto JavaScript.
        // Leer la respuesta de PHP como texto.

        // =====================================
        // LEER Y VALIDAR LA RESPUESTA DE PHP
        // =====================================

        // Convertir el JSON recibido en un objeto JavaScript.
        const resultado = await respuesta.json();

        // Comprobar si el servidor reportó un error.
        if (!respuesta.ok || !resultado.success) {

            throw new Error(
                resultado.message || "No se pudo registrar el usuario."
            );

        }

        // Mostrar el mensaje de confirmación.
        console.log("Usuario registrado:", resultado.message);


        // Comprobar si PHP registró correctamente al usuario.
        if (!respuesta.ok || !resultado.success) {

            throw new Error(
                resultado.message || "No se pudo registrar el usuario."
            );
        }

        console.log("Usuario registrado:", resultado.message);
        // =====================================
        // REGISTRO EXITOSO
        // =====================================

        // Cerrar el formulario Nuevo usuario.
        document.getElementById("new_user_modal").hidden = true;

        // Mostrar la notificación de éxito.
        mostrarNotificacionUsuario("success", resultado.message);

        // Limpiar los campos del formulario.
        formulario.reset();

    }

    // =====================================
    // ERROR AL REGISTRAR USUARIO
    // =====================================

    catch (error) {

        console.error("Error al registrar usuario:", error);

        // Mostrar la notificación de error.
        mostrarNotificacionUsuario("error", error.message);

    }



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

        cargarRoles("edit_user_role");


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
    // 11. PREPARAR LOS DATOS DEL USUARIO
    // =====================================

    // Recuperar el ID del usuario seleccionado.
    const id_user = document.getElementById("edit_user_id").value;

    // Agrupar los datos que enviaremos a PHP.
    const datosUsuario = {

        id_user: id_user,
        name_user: nombre.value.trim(),
        user: usuario.value.trim(),
        pass: password.value,
        confirm_pass: confirmar.value,
        id_rol: rol.value,
        status: estado.value

    };

    // ==========================================
    // COMPROBAR LOS DATOS QUE ENVIAREMOS A PHP
    // ==========================================

    // Mostrar los datos sin exponer las contraseñas.
    console.table({
        id_user: datosUsuario.id_user,
        name_user: datosUsuario.name_user,
        user: datosUsuario.user,
        id_rol: datosUsuario.id_rol,
        status: datosUsuario.status
    });

    // =====================================
    // 12. ENVIAR LOS DATOS A PHP
    // =====================================

    fetch("/sistema_calidad/php/users.php", {

        method: "PUT",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(datosUsuario)

    })
        .then(function (respuesta) {

            return respuesta.json();

        })
        // ==========================================
        // 13. PROCESAR LA RESPUESTA DE PHP
        // ==========================================

        .then(function (resultado) {

            // Verificar si PHP confirmó la actualización.
            if (resultado.success === true) {

                // Mostrar confirmación en la consola.
                console.log(resultado.message);

                // Cerrar el formulario Editar usuario.
                document.getElementById("edit_user_modal").hidden = true;

            } else {

                // Mostrar el mensaje de error enviado por PHP.
                console.error(resultado.message);

            }

        })
        .catch(function (error) {

            console.error("Error al enviar los datos:", error);

        });
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


/* ==========================================
   LIMPIAR ERRORES AL MODIFICAR LOS CAMPOS
========================================== */

document.addEventListener("input", function (event) {

    // Verificar que el campo pertenezca al formulario Nuevo usuario.
    const campo = event.target;

    if (!campo.closest("#new_user_form")) {
        return;
    }

    // Relacionar cada campo con su mensaje de error.
    const errores = {
        new_user_name: "error_new_user_name",
        new_username: "error_new_username",
        new_user_password: "error_new_user_password",
        new_user_confirm_password: "error_new_user_confirm_password",
        new_user_role: "error_new_user_role",
        new_user_status: "error_new_user_status"
    };

    // Buscar el mensaje correspondiente al campo modificado.
    const idError = errores[campo.id];

    if (!idError) {
        return;
    }

    const mensaje = document.getElementById(idError);

    // Ocultar el mensaje y quitar el borde rojo.
    if (mensaje) {
        mensaje.hidden = true;
        mensaje.textContent = "";
    }

    campo.classList.remove("input_error");

});




