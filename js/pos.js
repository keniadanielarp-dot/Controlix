
/* -------------------------------------  BLOQUE:  Función abrir formulario ------------------------------------- */
function open_form(id_modal, clean = false) {

    // Buscar el modal por su ID.
    const modal = document.getElementById(id_modal);

    // Verificar que exista.
    if (!modal) return;

    // Buscar el formulario dentro del modal.
    const form = modal.querySelector("form");

    // Preparar el formulario antes de abrirlo.
    if (form) {

        if (clean) {
            // Limpiar inputs y errores anteriores.
            clear_form(form);
        } else {

            // Conservar los datos, pero quitar errores anteriores.
            form.querySelectorAll(".input_error").forEach(function (error) {
                error.hidden = true;
                error.textContent = "";
            });

            form.querySelectorAll(".border_error").forEach(function (input) {
                input.classList.remove("border_error");
            });
        }
    }
    // Mostrar el modal.
    modal.hidden = false;

}



/* -------------------------------------  BLOQUE:  Función limpiar formulario ------------------------------------- */

function clear_form(element) {

    // Verificar si recibimos un formulario completo.
    if (element.matches("form")) {

        // Restablecer los campos.
        element.reset();

        // Ocultar todos los mensajes de error.
        element.querySelectorAll(".input_error").forEach(function (error) {
            error.hidden = true;
            error.textContent = "";
        });

        // Quitar todos los bordes rojos.
        element.querySelectorAll(".border_error").forEach(function (input) {
            input.classList.remove("border_error");
        });

    } else {

        // Quitar el borde rojo del campo corregido.
        element.classList.remove("border_error");

        // Buscar el mensaje de error correspondiente.
        const error = element.parentElement.querySelector(".input_error");

        // Ocultar el mensaje anterior.
        if (error) {
            error.hidden = true;
            error.textContent = "";
        }

    }

}



/* -------------------------------------  BLOQUE:  Función cerrar formulario ------------------------------------- */
function close_form(id_modal) {

    // Buscar el modal por su ID.
    const modal = document.getElementById(id_modal);

    // Verificar que exista.
    if (!modal) return;

    // Ocultar el modal.
    modal.hidden = true;

}



/* -------------------------------------  BLOQUE:  Botón Crear PO  ------------------------------------- */
document.addEventListener("click", function (event) {

    // Abrir formulario 
    if (event.target.closest("#btn_new_pos")) {
        open_form("create_pos_js");
    }

    /* Cerrar el formulario con X o Cancelar */
    if (event.target.closest("#btn_x_modal, #btn_cancel_po")) {
        const modal = event.target.closest(".pos_modal_overlay");
        // Cerrar el formulario correspondiente.
        if (modal) {
            close_form(modal.id);
        }
    }
});



/* -------------------------------------  BLOQUE:  Botón Editar PO  ------------------------------------- */
document.addEventListener("click", function (event) {
    if (event.target.closest("#btn_edit_pos")) {
        open_form("edit_pos_js");
    }


    /* Cerrar el formulario con X o Cancelar */
    if (event.target.closest("#btn_x_modal, #btn_cancel_po")) {
        const modal = event.target.closest(".pos_modal_overlay");
        // Cerrar el formulario correspondiente.
        if (modal) {
            close_form(modal.id);
        }
    }
});



/* -------------------------------------  BLOQUE:  Botón Eliminar PO  ------------------------------------- */
document.addEventListener("click", function (event) {

    // Abrir formulario 
    if (event.target.closest("#btn_new_pos")) {
        open_form("create_pos_js");
    }

    /* Cerrar el formulario con X o Cancelar */
    if (event.target.closest("#btn_x_modal, #btn_cancel_po")) {
        const modal = event.target.closest(".pos_modal_overlay");
        // Cerrar el formulario correspondiente.
        if (modal) {
            close_form(modal.id);
        }
    }
});


