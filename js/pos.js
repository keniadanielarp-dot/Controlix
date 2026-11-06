
/* --------------------------------  BLOQUE:  Botón Detalle de PO  ------------------------------------- */
document.addEventListener("click", function (event) {

    /* ==========================================
       ABRIR MODAL DETALLE DE PO
    ========================================== */

    if (event.target.closest(".btn_po_dates")) {

        // Identificar el botón de calendario presionado.
        const boton = event.target.closest(".btn_po_dates");

        // Obtener el ID real de la PO.
        const id_po = boton.dataset.idPo;

        // Abrir el modal utilizando nuestra función.
        open_form("dates_po_js");

        // Comprobar qué PO fue seleccionada.
        console.log("ID de PO seleccionada:", id_po);

    }


    /* ==========================================
       CERRAR MODAL DETALLE DE PO
    ========================================== */

    if (event.target.closest("#btn_x_modal, #btn_cancel_po")) {

        // Cerrar el modal utilizando nuestra función.
        close_form("dates_po_js");

    }

});





/* ==========================================
   FUNCIÓN LEER ARCHIVO EXCEL
========================================== */

async function load_excel(archivo) {

    // Verificar que exista un archivo seleccionado.
    if (!archivo) return;

    try {

        // Leer el contenido del archivo.
        const datos = await archivo.arrayBuffer();

        // Interpretar el archivo con SheetJS.
        const libro = XLSX.read(datos, {
            type: "array"
        });

        // Obtener la primera hoja del Excel.
        const nombre_hoja = libro.SheetNames[0];
        const hoja = libro.Sheets[nombre_hoja];

        // Convertir las celdas en una matriz.
        const registros = XLSX.utils.sheet_to_json(hoja, {
            header: 1,
            defval: "",
            blankrows: true,
            raw: false
        });

        // Mostrar los datos en consola.
        console.log("Archivo:", archivo.name);
        console.log("Hoja:", nombre_hoja);
        console.table(registros);

    } catch (error) {

        console.error("Error al cargar Excel:", error);

    }

}

document.addEventListener("change", function (event) {

    /* ==========================================
       DETECTAR ARCHIVO EXCEL
    ========================================== */

    if (event.target.matches("#file_pos_excel")) {

        // Recuperar el archivo seleccionado.
        const archivo = event.target.files[0];

        // Ejecutar la lectura del Excel.
        load_excel(archivo);

        // Permitir seleccionar nuevamente el mismo archivo.
        event.target.value = "";

    }

});







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



/* ----------------------------------  BLOQUE:  Botón Eliminar PO  ------------------------------------- */
document.addEventListener("click", function (event) {
    //Abrir modal
    if (event.target.closest("#btn_delete_pos")) {
        open_form("delete_po_js");
    }
    //Cerrar modal
    if (event.target.closest("#btn_x_modal, #btn_cancel_po")) {
        close_form("delete_po_js");
    }
});



/* --------------------------------  BLOQUE:  Botón Asignar inspección   ------------------------------------- */
document.addEventListener("click", function (event) {
    //Abrir modal
    if (event.target.closest("#btn_type_ins")) {
        open_form("assign_ins_js");
    }
    //Cerrar modal
    if (event.target.closest("#btn_x_modal, #btn_cancel_po")) {
        close_form("assign_ins_js");
    }
});



/* --------------------------------  BLOQUE:  Botón Asignar Usuario   ------------------------------------- */
document.addEventListener("click", function (event) {
    if (event.target.closest("#btn_assign_user")) {
        open_form("asing_user_js");
    }
    if (event.target.closest(
        "#btn_x_modal, #btn_cancel_po"
    )) {
        close_form("asing_user_js");
    }
});


