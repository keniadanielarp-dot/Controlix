/************************************ BLOQUE: BUSCADOR DE USUARIOS  **************************************** */

// Detectar cuando se escribe en el buscador.
document.addEventListener("input", function (event) {

    // Detectar que el usuario usa el buscador
    if (event.target.id !== "search_user") {
        return;
    }

    // Obtener el texto ingresado y convertirlo a minúsculas.
    const search = event.target.value.trim().toLowerCase();

    // Obtener todas las filas del cuerpo de la tabla.
    const rows = document.querySelectorAll(
        "#users_table_body tr"
    );

    // Recorrer cada fila para comprobar si coincide.
    rows.forEach(function (rows_search) {

        // Obtener las celdas de la fila.
        const cells = rows_search.querySelectorAll("td");

        // Verificar que la fila tenga las columnas necesarias.
        if (cells.length < 4) {
            return;
        }

        // Obtener los valores de ID, nombre y usuario.
        const id = cells[1].textContent.toLowerCase();
        const name_sh = cells[2].textContent.toLowerCase();
        const user_sh = cells[3].textContent.toLowerCase();

        // Comprobar si alguno de los campos coincide.
        const equal =
            id.includes(search) ||
            name_sh.includes(search) ||
            user_sh.includes(search);

        // Mostrar u ocultar la fila según la coincidencia.
        rows_search.style.display = equal ? "" : "none";

    });

});


/************************************ BLOQUE CHECKBOX SELECCIONAR TODOS **************************************** */
// -------------------  Seleccionar todos los usuarios -----------------------------------------------

// Detectar cambios en las casillas de selección.
document.addEventListener("change", function (event) {

    // Obtener la casilla principal.
    const ch_select_all = document.getElementById("ch_sel_all_users");

    // Obtener todas las casillas individuales.
    const ch_users = document.querySelectorAll(".select_user");

    // Verificar que el módulo Usuarios esté cargado.
    if (!ch_select_all) {
        return;
    }

    // Marcar o desenmarcar todos los checkbox

    if (event.target.id === "ch_sel_all_users") {
        ch_users.forEach(function (users_ch) {
            users_ch.checked = ch_select_all.checked;
        });
    }

    // -------------------  Selección individual  -----------------------------------------------

    if (event.target.classList.contains("select_user")) {

        // Contar las casillas seleccionadas.
        const ch_selected = document.querySelectorAll(
            ".select_user:checked"
        );

        // Marcar Seleccionar todo si todas están seleccionadas.
        ch_select_all.checked = ch_users.length > 0 &&
            ch_selected.length === ch_users.length;
    }

    // -------------------  Selección intermedia; cuando dos o más están seleccionadas  -----------------------------------------------

    // Obtener nuevamente las casillas seleccionadas.
    const sel_amount = document.querySelectorAll(
        ".select_user:checked"
    ).length;

    // Mostrar estado intermedio si solo algunas están marcadas.
    ch_select_all.indeterminate =
        sel_amount > 0 &&
        sel_amount < ch_users.length;

});

/************************************ BLOQUE: FUNCION PARA MOSTRAR TABLA DE USUARIOS **************************************** */
async function users_table() {

    // Solicitar los registros al archivo PHP.
    const res = await fetch("/sistema_calidad/php/users.php");

    // Convertir la respuesta JSON en un objeto JavaScript.
    const data = await res.json();

    // Localizar el cuerpo de la tabla.
    const table = document.getElementById("users_table_body");

    // Limpiar los registros anteriores.
    table.innerHTML = "";

    // Recorrer los usuarios obtenidos.
    data.users.forEach(function (user_db, index) {

        // Crear una fila.
        const row = table.insertRow();

        // Crear la casilla de selección.
        const selection = document.createElement("td");
        const ch_box = document.createElement("input");

        ch_box.type = "checkbox";
        ch_box.className = "select_user";
        ch_box.value = user_db.id_user;
        ch_box.setAttribute(
            "aria-label",
            "Seleccionar usuario " + user_db.id_user
        );

        selection.appendChild(ch_box);
        row.appendChild(selection);

        // Columna para mostrar los ID's enumerados consecutivamente
        const con_index = row.insertCell();
        con_index.textContent = index + 1;

        // Crear las celdas de información.
        const in_user = [
            user_db.name_user,
            user_db.user,
            "********",
            user_db.rol
        ];

        in_user.forEach(function (value) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);

        });

        // Agregar la fila a la tabla.
        table.appendChild(row);

    });
}

/************************************ BLOQUE: FUNCIÓN MOSTRAR U OCULTAR CONTRASEÑAS  **************************************** */

function toggle_pass(icon_eye, input_pass) {

    // Buscar el contenedor de la contraseña.
    const txt_pass = icon_eye.closest(input_pass);

    // Obtener el input y el ícono correspondientes.
    const input = txt_pass.querySelector("input");
    const icon = icon_eye.querySelector("i");

    // Verificar si la contraseña está oculta.
    if (input.type === "password") {

        // Mostrar contraseña.
        input.type = "text";

        // Cambiar el ícono.
        icon.className = "bi bi-eye-slash";

        // Actualizar la descripción del botón.
        icon_eye.setAttribute("aria-label", "Ocultar contraseña");

    } else {

        // Ocultar contraseña.
        input.type = "password";

        // Restaurar el ícono.
        icon.className = "bi bi-eye";

        // Actualizar la descripción del botón.
        icon_eye.setAttribute("aria-label", "Mostrar contraseña");

    }

}

/************************************ BLOQUE: FUNCION CARGAR ROLES  **************************************** */
function load_roles(id_menu) {

    // Obtener el menú desplegable
    const menu_rol = document.getElementById(id_menu);

    // Limpiar las opciones anteriores
    menu_rol.innerHTML = '<option value="">Selecciona un rol</option>';

    // Solicitar los roles a PHP
    fetch("/sistema_calidad/php/users.php?action=roles")

        .then(response => {

            // Verificar que la petición sea correcta
            if (!response.ok) {
                throw new Error("No se pudieron obtener los roles.");
            }

            return response.json();
        })

        .then(res => {

            // Comprobar que PHP devolvió los roles
            if (!res.success || !Array.isArray(res.roles)) {
                throw new Error("Respuesta de roles no válida.");
            }

            // Recorrer los roles registrados
            res.roles.forEach(rol => {

                // Crear una opción para cada rol
                const option_rol = document.createElement("option");

                // Guardar el identificador del rol
                option_rol.value = rol.id_rol;

                // Mostrar el nombre del rol
                option_rol.textContent = rol.rol;

                // Agregar la opción al menú
                menu_rol.appendChild(option_rol);

            });

        })

        .catch(error => {

            // Mostrar el error en la consola
            console.error("Error al cargar roles:", error);

        });

}

/************************************ BLOQUE FUNCION PARA LIMPIAR FORMULARIO  **************************************** */
function form_clean(form) {

    // 1. Restaurar los valores iniciales del formulario.
    form.reset();

    // 2. Ocultar y limpiar todos los mensajes de error.
    form.querySelectorAll(
        ".new_user_field_error, .edit_user_field_error"
    ).forEach(function (msg) {

        msg.hidden = true;
        msg.textContent = "";

    });

    // 3. Eliminar los bordes rojos de los campos.
    form.querySelectorAll(".input_error")
        .forEach(function (input) {

            input.classList.remove("input_error");

        });

    // 4. Restaurar los campos de contraseña y sus ojos.
    form.querySelectorAll(
        ".new_user_password_container, .edit_user_password_container"
    ).forEach(function (input_eye) {

        const input = input_eye.querySelector("input");
        const eye = input_eye.querySelector(
            ".new_user_eye, .edit_user_eye"
        );

        if (input) {
            input.type = "password";
        }

        if (eye) {
            const icono = input_eye.querySelector("i");

            if (icono) {
                icono.className = "bi bi-eye";
            }
            eye.setAttribute("aria-label", "Mostrar contraseña");
        }
    });
}

/************************************ BLOQUE FUNCION PARA MOSTRAR ERRORES   **************************************** */

function error_show(input, id_msg, text) {

    // 1. Buscar el elemento donde se mostrará el error.
    const error = document.getElementById(id_msg);

    // 2. Marcar el campo con un borde rojo.
    input.classList.add("input_error");

    // 3. Mostrar el mensaje correspondiente.
    if (error) {
        error.textContent = text;
        error.hidden = false;

    }

}

// ==========================================
// FUNCIÓN PARA LIMPIAR ERRORES DE LOS INPUTS
// ==========================================

function limpiarError(input) {

    // 1. Identificar si pertenece a Nuevo o Editar.
    const nuevo = input.closest("#new_user_form") !== null;

    // 2. Buscar el contenedor del campo.
    const contenedor = input.closest(
        nuevo ? ".new_user_form_group" : ".edit_user_form_group"
    );

    // 3. Verificar que exista el contenedor.
    if (!contenedor) {
        return;
    }

    // 4. Buscar el mensaje de error correspondiente.
    const mensaje = contenedor.querySelector(
        nuevo ? ".new_user_field_error" : ".edit_user_field_error"
    );

    // 5. Quitar el borde rojo del input.
    input.classList.remove("input_error");

    // 6. Ocultar y borrar el mensaje de error.
    if (mensaje) {

        mensaje.textContent = "";
        mensaje.hidden = true;

    }

}

// ==========================================
// LIMPIAR ERRORES AL MODIFICAR LOS CAMPOS
// ==========================================

document.addEventListener("input", function (event) {

    // 1. Identificar el formulario correspondiente.
    const formulario = event.target.closest(
        "#new_user_form, #edit_user_form"
    );

    // 2. Ignorar campos que no pertenezcan a estos formularios.
    if (!formulario) {
        return;
    }

    // 3. Limpiar el error del campo modificado.
    limpiarError(event.target);

});

// ==========================================
// LIMPIAR ERRORES AL CAMBIAR ROL O ESTADO
// ==========================================

document.addEventListener("change", function (event) {

    // 1. Verificar que sea un menú desplegable.
    if (!event.target.matches("select")) {
        return;
    }

    // 2. Verificar que pertenezca a Nuevo o Editar.
    const formulario = event.target.closest(
        "#new_user_form, #edit_user_form"
    );

    if (!formulario) {
        return;
    }

    // 3. Limpiar el error del menú modificado.
    limpiarError(event.target);

});

/************************************ BLOQUE: BOTÓN NUEVO USUARIO  **************************************** */

// -------------------------------------  Abrir el formulario  -----------------------------------------------------
// Detectar los clics en el módulo Usuarios.
document.addEventListener("click", function (event) {

    // Abrir el formulario 
    if (event.target.closest("#btn_new_user")) {

        // Obtener el modal Nuevo Usuario y el formulario.
        const new_user = document.getElementById("new_user_modal");
        const form = document.getElementById("new_user_form");

        // Funcion limpiar formulario
        form_clean(form);

        // Mostrar el formulario.
        new_user.hidden = false;

        // Colocar el cursor en Nombre completo.
        document.getElementById("new_user_name").focus();

        // Cargar el metodo para mostrar los roles en la base de datos 
        load_roles("new_user_role");
        return;
    }

    // ---------------------------------  Mostrar u ocultar la contraseña  -----------------------------------------------------
    const icon_eye = event.target.closest(
        "#new_user_modal .new_user_eye"
    );

    if (icon_eye) {
        toggle_pass(icon_eye, ".new_user_password_container");
        return;
    }

    // ---------------------------------  Cerrar el formulario en la "X"  ------------------------------------------

    if (
        event.target.closest("#btn_close_new_user") || // "X"
        event.target.closest("#btn_cancel_new_user")   // Botón Cancelar
    ) {
        // Ocultar el formulario sin guardar datos.
        document.getElementById("new_user_modal").hidden = true;
        return;
    }
});

// ---------------------------------  Validación del formulario  ------------------------------------------

// Detectar cuando se presiona Guardar.
document.addEventListener("submit", async function (event) {

    // Verificar que sea el formulario Nuevo usuario.
    if (event.target.id !== "new_user_form") {
        return;
    }

    // Evitar que la página se recargue.
    event.preventDefault();

    // Obtener los datos del formulario 
    const data_form = event.target;

    const name_user_js = document.getElementById("new_user_name");
    const user_js = document.getElementById("new_username");
    const pass_js = document.getElementById("new_user_password");
    const conf_pass_js = document.getElementById("new_user_confirm_password");
    const rol_js = document.getElementById("new_user_role");
    const status_js = document.getElementById("new_user_status");

    // ==========================================
    // VALIDACIONES - NUEVO USUARIO
    // ==========================================

    // Controlar si el formulario contiene errores.
    let form_valid = true;

    // Validar nombre completo.
    if (name_user_js.value.trim() === "") {

        error_show(
            name_user_js,
            "error_new_user_name",
            "Este campo es obligatorio."
        );

        form_valid = false;
    }

    // Validar nombre de usuario.
    if (user_js.value.trim() === "") {

        error_show(
            user_js,
            "error_new_username",
            "Este campo es obligatorio."
        );

        form_valid = false;
    }

    // Validar contraseña.
    if (pass_js.value === "") {

        error_show(
            pass_js,
            "error_new_user_password",
            "Este campo es obligatorio."
        );

        form_valid = false;

    } else if (pass_js.value.length < 8) {

        error_show(
            pass_js,
            "error_new_user_password",
            "La contraseña debe tener al menos 8 caracteres."
        );

        form_valid = false;
    }

    // Validar confirmación de contraseña.
    if (conf_pass_js.value === "") {

        error_show(
            conf_pass_js,
            "error_new_user_confirm_password",
            "Este campo es obligatorio."
        );

        form_valid = false;

    } else if (pass_js.value !== conf_pass_js.value) {

        error_show(
            conf_pass_js,
            "error_new_user_confirm_password",
            "Las contraseñas no coinciden. Inténtelo de nuevo."
        );

        form_valid = false;
    }

    // Validar rol.
    if (rol_js.value === "") {

        error_show(
            rol_js,
            "error_new_user_role",
            "Selecciona un rol."
        );

        form_valid = false;
    }

    // Validar estado.
    if (status_js.value !== "1" && status_js.value !== "0") {

        error_show(
            status_js,
            "error_new_user_status",
            "Selecciona un estado."
        );

        form_valid = false;
    }

    // ==========================================
    // COMPROBAR RESULTADO DE LAS VALIDACIONES
    // ==========================================

    if (!form_valid) {

        // Buscar el primer campo marcado con error.
        const primerError = data_form.querySelector(".input_error");

        // Colocar el cursor en el primer campo incorrecto.
        if (primerError) {
            primerError.focus();
        }

        // Detener el registro.
        return;
    }
    // --------------------------------- Enviar el nuevo usuario a PHP   ------------------------------------------

    // Preparar los datos del formulario
    const data = new URLSearchParams();

    data.append("name_user_php", name_user_js.value.trim());
    data.append("user_php", user_js.value.trim());
    data.append("new_pass_php", pass_js.value);
    data.append("conf_pass_php", conf_pass_js.value);
    data.append("rol_php", rol_js.value);
    data.append("status_php", status_js.value);

    //Enviar los datos a PHP
    try {

        const send_php = await fetch(
            "/sistema_calidad/php/users.php",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: data.toString()
            }
        );

        // Convertir el JSON recibido por php en un objeto JavaScript.
        const answer_php = await send_php.json();

        // ------------------------ Mostrar mensaje de registro exitoso   ------------------------------------------
        // Cerrar el formulario Nuevo usuario.
        document.getElementById("new_user_modal").hidden = true;

        // Mostrar la notificación de éxito.
        show_user_notifi("success", answer_php.message);

        // Limpiar los campos del formulario.
        data_form.reset();

    }

    // ------------------------- Mostrar mensaje de registro fallido  ------------------------------------------
    catch (error) {

        console.error("Error al registrar usuario:", error);

        // Mostrar la notificación de error.
        show_user_notifi("error", error.message);

    }
});

// ------------------------- Función para las notificaciones  ------------------------------------------

function show_user_notifi(type, msg) {

    // Obtener los elementos de la notificación.
    const new_user = document.getElementById("new_user_notification");
    const icon = document.getElementById("user_notification_icon");
    const title = document.getElementById("user_notification_title");
    const text = document.getElementById("user_notification_message");

    // Limpiar estilos anteriores.
    icon.classList.remove("success", "error");

    // Notificación de exito 
    if (type === "success") {

        icon.classList.add("success");
        icon.innerHTML = '<i class="bi bi-check-circle-fill"></i>';

        title.textContent = "Usuario registrado";
        text.textContent = msg;

    }

    // Notificación de error 
    else if (type === "error") {

        icon.classList.add("error");
        icon.innerHTML = '<i class="bi bi-x-circle-fill"></i>';
        title.textContent = "No se pudo registrar";
        text.textContent = msg;
    }

    // Mostrar la notificación.
    new_user.hidden = false;

    // Enfocar el botón Aceptar.
    document.getElementById("btn_notification_accept").focus();

}

// Cerrar la notificación 
document.addEventListener("click", function (event) {

    if (event.target.closest("#btn_notification_accept")) {
        // Ocultar la notificación.
        document.getElementById("new_user_notification").hidden = true;
    }
});


/************************************************** BLOQUE: BOTÓN EDITAR USUARIO  *************************************************** */
// Detectar los clics de los botones de Editar usuario.
document.addEventListener("click", function (event) {

    // Abrir el formulario 
    if (event.target.closest("#btn_edit_user")) {

        // Obtener los usuarios ch_selected.
        const ch_selected = document.querySelectorAll(
            "#users_table_body .select_user:checked"
        );

        // Verificar que exista un usuario seleccionado.
        if (ch_selected.length === 0) {
            alert("Seleccione un usuario para editar.");
            return;
        }

        // Verificar que solamente exista uno.
        if (ch_selected.length > 1) {
            alert("Seleccione solo un usuario para editar.");
            return;
        }


        // ------------------------- Recuperar datos de la tabla  ------------------------------------------

        // Obtener el checkbox del usuario seleccionado.
        const checkbox = ch_selected[0];

        // Obtener la fila correspondiente al checkbox.
        const row = checkbox.closest("tr");

        // Obtener todas las celdas de la fila.
        const cells = row.querySelectorAll("td");

        // Recuperar el id real de la base de datos desde el checkbox.
        const id_db = checkbox.value;
        //Recuperar el id de la tabla del Dashboard 
        const id_dash = cells[1].textContent.trim();
        // Recuperar el nombre y el usuario desde la tabla.
        const name_table = cells[2].textContent.trim();
        const user_table = cells[3].textContent.trim();
        const rol_table = cells[5].textContent.trim();

        // Guardar el ID real para enviarlo a PHP.
        document.getElementById("edit_user_id").dataset.idDb = id_db;

        // ------------------------- Limpiar el formulario  ------------------------------------------
        const form = document.getElementById("edit_user_form");
        form_clean(form);

        // ------------------------- Colocar los datos del usuario   ------------------------------------------
        document.getElementById("edit_user_id").value = id_dash;
        document.getElementById("edit_user_name").value = name_table;
        document.getElementById("edit_username").value = user_table;
        document.getElementById("edit_user_password").value = "";
        document.getElementById("edit_user_confirm_password").value = "";
        document.getElementById("edit_user_role").value = rol_table;

        //Llamamos la función para mostrar los roles en el menu desplegable
        load_roles("edit_user_role");

        // ------------------------- Mostrar el formulario   ------------------------------------------
        document.getElementById("edit_user_modal").hidden = false;

        // Colocar el cursor en Nombre completo.
        document.getElementById("edit_user_name").focus();
        return;
    }

    // ------------------------- Cerrar el formulario   ------------------------------------------
    if (
        event.target.closest("#btn_close_edit_user") || // Click botón "X"
        event.target.closest("#btn_cancel_edit_user")   // Click botón Cancelar
    ) {
        document.getElementById("edit_user_modal").hidden = true;
        return;
    }

    // ------------------------- Mostrar u ocultar contraseña    ------------------------------------------
    const icon_eye = event.target.closest(
        "#edit_user_modal .edit_user_eye"
    );

    if (icon_eye) {
        toggle_pass(icon_eye, ".edit_user_password_container");
        return;
    }
});

// ----------------------------------------------- Validaciones -------------------------------------------------------------

document.addEventListener("submit", function (event) {

    // 1. Comprobar que se envió el formulario Editar usuario.
    if (event.target.id !== "edit_user_form") {
        return;
    }

    // Evitar que el navegador recargue la página.
    event.preventDefault();

    const form_edit = event.target;

    // Obtener los datos del formulario 

    const name_edit_js = form_edit.querySelector("#edit_user_name");
    const user_edit_js = form_edit.querySelector("#edit_username");
    const pass_edit_js = form_edit.querySelector("#edit_user_password");
    const conf_edit_js = form_edit.querySelector("#edit_user_confirm_password");
    const rol_edit_js = form_edit.querySelector("#edit_user_role");
    const status_edit_js = form_edit.querySelector("#edit_user_status");

    // Guardará el primer campo que tenga un error.
    let primerCampoIncorrecto = null;




    // ----------------------------------------------- Validaciones  --------------------------------------------------------

    //Nombre Completo
    if (name_edit_js.value.trim() === "") {

        error_show(
            name_edit_js,
            "error_edit_user_name",
            "El nombre completo es obligatorio."
        );
    }

    // Usuario
    if (user_edit_js.value.trim() === "") {

        error_show(
            user_edit_js,
            "error_edit_username",
            "El nombre de usuario es obligatorio."
        );
    }

    // Contraseñas
    const edit_pass = pass_edit_js.value;
    const conf_edit = conf_edit_js.value;

    // Si las dos están vacías, no se cambia la contraseña.
    if (edit_pass !== "" || conf_edit !== "") {

        if (edit_pass === "") {
            error_show(
                pass_edit_js,
                "error_edit_user_password",
                "Escribe la nueva contraseña."
            );

        } else if (edit_pass.length < 8) {

            error_show(
                pass_edit_js,
                "error_edit_user_password",
                "La contraseña debe tener mínimo 8 caracteres."
            );
        }

        if (conf_edit === "") {

            error_show(
                conf_edit_js,
                "error_edit_user_confirm_password",
                "Confirma la nueva contraseña."
            );

        } else if (edit_pass !== conf_edit) {

            error_show(
                conf_edit_js,
                "error_edit_user_confirm_password",
                "Las contraseñas no coinciden."
            );
        }
    }

    // =====================================
    // 8. VALIDAR ROL
    // =====================================

    if (rol_edit_js.value === "") {

        error_show(
            rol_edit_js,
            "error_edit_user_role",
            "Selecciona un rol."
        );
    }

    // =====================================
    // 9. VALIDAR ESTADO
    // =====================================

    if (status_edit_js.value !== "1" && status_edit_js.value !== "0") {

        error_show(
            status_edit_js,
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
    const id_user_edit_js = document.getElementById("edit_user_id").dataset.idDb;

    // Agrupar los datos que enviaremos a PHP.
    const datosUsuario = {

        id_user: id_user_edit_js,
        name_user: name_edit_js.value.trim(),
        user: user_edit_js.value.trim(),
        pass: pass_edit_js.value,
        confirm_pass: conf_edit_js.value,
        id_rol: rol_edit_js.value,
        status: status_edit_js.value

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
                users_table();

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
        const ch_selected = document.querySelectorAll(
            "#users_table_body .select_user:checked"
        );

        // Verificar que exista al menos un usuario seleccionado.
        if (ch_selected.length === 0) {

            alert("Selecciona al menos un usuario para eliminar.");

            return;
        }

        // Obtener el mensaje del modal.
        const mensaje = document.getElementById(
            "delete_user_message"
        );

        // Adaptar el mensaje a la cantidad seleccionada.
        if (ch_selected.length === 1) {

            mensaje.textContent =
                "¿Estás seguro de que deseas eliminar el usuario seleccionado?";

        } else {

            mensaje.textContent =
                "¿Estás seguro de que deseas eliminar los " +
                ch_selected.length +
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
