
    <div id="create_pos_js" class="pos_modal_overlay" hidden>

        <!-- Cuadro central -->
        <div class="pos_modal_css pos_modal_large" role="dialog" aria-modal="true" aria-labelledby="create_pos_title">

            <!-- Encabezado -->
            <div class="pos_modal_header">

                <h2 id="edit_modal_title">
                    Crear PO
                </h2>

                <!-- Botón X  -->
                <button type="button" id="btn_x_modal" aria-label="Cerrar ventana">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>

            <!-- Formulario -->
            <form id="form_create_pos" class="pos_form" novalidate>

                <div class="input_grid">
                    <!-- PO -->
                    <div class="input_pos_form">
                        <label for="lbl_create_po">
                            PO
                            <span class="pos_required">*</span>
                        </label>
                        <input type="text" id="txt_create_po" placeholder="Ingresar PO" autocomplete="off" required>
                        <small class="input_error" id="error_new_po" hidden></small>
                    </div>


                    <!-- Modelo -->
                    <div class="input_pos_form">
                        <label for="lbl_create_model">
                            Modelo
                            <span class="pos_required">*</span>
                        </label>
                        <input type="text" id="txt_new_model" placeholder="Ingrese modelo" autocomplete="on" required>
                        <small class="input_error" id="error_new_model" hidden></small>
                    </div>


                    <!-- Artículo -->
                    <div class="input_pos_form">
                        <label for="lbl_create_art">
                            Artículo
                            <span class="pos_required">*</span>
                        </label>
                        <input type="text" id="txt_new_art" placeholder="Ingrese artículo" autocomplete="on" required>
                        <small class="input_error" id="error_new_art" hidden></small>
                    </div>

                    <!-- Color -->
                    <div class="input_pos_form">
                        <label for="lbl_create_color">
                            Color
                            <span class="pos_required">*</span>
                        </label>
                        <input type="text" id="txt_new_color" placeholder="Ingrese color" autocomplete="on" required>
                        <small class="input_error" id="error_new_color" hidden></small>
                    </div>
                </div>

                <div class="input_size">

                    <!-- Tallas  -->
                    <label for="lbl_size">
                        Talla
                        <span class="pos_required">*</span>
                    </label>

                    <div class="input_grid">
                        <!-- XS -->
                        <div class="input_pos_form">
                            <label for="lbl_po_xs">
                                XS
                            </label>
                            <input type="text" id="txt_new_xs" autocomplete="on" required>
                        </div>


                        <!-- S -->
                        <div class="input_pos_form">
                            <label for="lbl_po_s">
                                S
                            </label>
                            <input type="text" id="txt_new_s" autocomplete="on" required>
                        </div>


                        <!-- M -->
                        <div class="input_pos_form">
                            <label for="lbl_po_m">
                                M
                            </label>
                            <input type="text" id="txt_new_m" autocomplete="on" required>
                        </div>


                        <!-- L -->
                        <div class="input_pos_form">
                            <label for="lbl_po_l">
                                L
                            </label>
                            <input type="text" id="txt_new_l" autocomplete="on" required>
                        </div>


                        <!-- XL -->
                        <div class="input_pos_form">
                            <label for="lbl_po_xl">
                                XL
                            </label>
                            <input type="text" id="txt_new_xl" autocomplete="on" required>
                        </div>


                        <!-- 2XL -->
                        <div class="input_pos_form">
                            <label for="lbl_po_2xl">
                                2XL
                            </label>
                            <input type="text" id="txt_new_2xl" autocomplete="on" required>
                        </div>


                        <!-- 3XL -->
                        <div class="input_pos_form">
                            <label for="lbl_po_3xl">
                                3XL
                            </label>
                            <input type="text" id="txt_new_3xl" autocomplete="on" required>
                        </div>


                        <!-- 4XL -->
                        <div class="input_pos_form">
                            <label for="lbl_po_4xl">
                                4XL
                            </label>
                            <input type="text" id="txt_new_3xl" autocomplete="on" required>
                        </div>
                    </div>
                </div>

                <div class="input_grid">
                    <!-- T.Units RQSTD -->
                    <div class="input_pos_form">
                        <label for="lbl_rqstd">
                            T.Units RQSTD
                            <span class="pos_required">*</span>
                        </label>
                        <input type="text" id="txt_new_rqstd" placeholder="Ingrese RQSTD" autocomplete="off" required>
                        <small class="input_error" id="error_new_rqstd" hidden></small>
                    </div>

                    <!-- T.Units DELVD -->
                    <div class="input_pos_form">
                        <label for="lbl_rqstd">
                            T.Units DELVD
                            <span class="pos_required">*</span>
                        </label>
                        <input type="text" id="txt_new_delvd" placeholder="Ingrese DELVD" autocomplete="off" required>
                        <small class="input_error" id="error_new_delvd" hidden></small>
                    </div>
                </div>


                <!-- Botones del formulario  -->
                <div class="btns_po">
                    <button type="button" id="btn_cancel_po">
                        Cancelar
                    </button>
                    <button type="submit" id="btn_save_po">
                        <i class="bi bi-floppy-fill"></i>
                        Guardar
                    </button>
                </div>
            </form>

        </div>
    </div>
