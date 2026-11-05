
/* ==========================================
   MODAL CREAR ARTÍCULO
========================================== */

document.addEventListener("click", function (event) {

    // ABRIR FORMULARIO
    if (event.target.closest("#btn_edit_pos")) {

        const modal = document.getElementById("edit_pos_js");

        modal.hidden = false;
    }

    // CERRAR FORMULARIO
    if (event.target.closest("#btn_x_modal")) {

        const modal = document.getElementById("edit_pos_js");

        modal.hidden = true;
    }

});


