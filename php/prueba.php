
/* Fondo */
.pos_modal_overlay {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.55);
    z-index: 2000;
    box-sizing: border-box;
}

/* Mantener oculto el modal inicialmente */
.pos_modal_overlay[hidden] {
    display: none;
}


/* ==========================================
   NUEVO USUARIO - CUADRO CENTRAL
========================================== */

.pos_modal_css {
    width: 100%;
    max-width: 480px;
    max-height: 90vh;
    overflow-y: auto;
    background-color: #ffffff;
    border-radius: 12px;
    box-shadow: 0 10px 35px rgba(0, 0, 0, 0.25);
    color: #092b60;
}


/* ==========================================
   NUEVO USUARIO - ENCABEZADO
========================================== */

.pos_modal_header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 25px;
    border-bottom: 1px solid #dce6f2;
}

.pos_modal_header h2 {
    margin: 0;
    font-size: 21px;
    font-weight: 700;
    color: #092b60;
}

/* Botón cerrar */
#btn_x_modal {
    border: none;
    background: transparent;
    color: #526789;
    font-size: 20px;
    cursor: pointer;
}

#btn_x_modal:hover {
    color: #dc3545;
}


/* ==========================================
   NUEVO USUARIO - FORMULARIO
========================================== */

#form_create_pos {
    padding: 25px;
}

.create_pos_form {
    margin-bottom: 18px;
}

.create_pos_form label {
    display: block;
    margin-bottom: 7px;
    font-size: 14px;
    font-weight: 600;
    color: #092b60;
}


/* ==========================================
   DISTRIBUCIÓN DE CAMPOS DEL FORMULARIO
========================================== */

.pos_modal_css {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 20px;
    width: 100%;
}

/* ==========================================
   ESTILO DE CADA CAMPO
========================================== */

.create_pos_form {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
}

.create_pos_form label {
    font-size: 14px;
    font-weight: 600;
    color: #142b49;
}

.create_pos_form input,
.create_pos_form select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #a9c5f5;
    border-radius: 7px;
    box-sizing: border-box;
}

.pos_modal_overlay[hidden] {
    display: none;
}

/* ==========================================
   ADAPTACIÓN A PANTALLAS PEQUEÑAS
========================================== */

@media (max-width: 900px) {
    .pos_modal_css {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 600px) {
    .pos_modal_css {
        grid-template-columns: 1fr;
    }
}



/* Campos obligatorios */
.create_pos_form .required_field {
    color: #dc3545;
}


/* ==========================================
   NUEVO USUARIO - INPUTS Y SELECTORES
========================================== */

.create_pos_form input,
.create_pos_form select {
    width: 100%;
    height: 44px;
    padding: 10px 14px;
    border: 1px solid #d4e1f0;
    border-radius: 7px;
    outline: none;
    box-sizing: border-box;
    font-size: 14px;
    color: #092b60;
    background-color: #ffffff;
}

.create_pos_form input:focus,
.create_pos_form select:focus {
    border-color: #0064d8;
    box-shadow: 0 0 0 3px rgba(0, 100, 216, 0.12);
}

.create_pos_form input::placeholder {
    color: #8999ad;
}


/* ==========================================
   NUEVO USUARIO - MENSAJES DE ERROR
========================================== */

.new_user_field_error {
    display: block;
    margin-top: 6px;
    padding: 8px 10px;
    border: 1px solid #f1b7bd;
    border-radius: 5px;
    background-color: #fde8ea;
    color: #b42332;
    font-size: 12px;
}

/* Ocultar mensajes cuando no hay error */
.new_user_field_error[hidden] {
    display: none;
}

/* Resaltar campos con errores */
.create_pos_form input.input_error,
.create_pos_form select.input_error {
    border-color: #dc3545;
    background-color: #fffafa;
}


/* ==========================================
   NUEVO USUARIO - BOTONES
========================================== */

.btns_po {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 25px;
}

.btns_po button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 11px 20px;
    border-radius: 7px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
}

/* Botón Cancelar */
#btn_cancel_po {
    border: 1px solid #d4dce8;
    background-color: #e9edf3;
    color: #092b60;
}

#btn_cancel_po:hover {
    background-color: #dce4ee;
}

/* Botón Guardar */
#btn_save_po {
    border: 1px solid #0064d8;
    background-color: #0064d8;
    color: #ffffff;
}

#btn_save_po:hover {
    background-color: #004ba8;
}

#btn_save_po:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}






