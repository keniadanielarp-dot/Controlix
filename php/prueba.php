
/* ==========================================
   REGISTROS TEMPORALES DE PO
========================================== */

// Inicializar los registros con el encabezado
// que también utiliza nuestro archivo Excel.
let pos_registros = [
    [
        "ID",
        "PO",
        "Modelo",
        "Artículo",
        "Color",
        "XS",
        "S",
        "M",
        "L",
        "XL",
        "2XL",
        "3XL",
        "4XL",
        "RQSTD",
        "DELVD"
    ]
];


// Fechas de registro de cada PO.
let pos_fechas = {};

let existe_dato_talla_caja = false;


/* ==========================================
   OBTENER FECHA ACTUAL
========================================== */

function get_pos_date() {

    // Obtener la fecha actual.
    const fecha = new Date();

    // Construir la fecha en formato YYYY-MM-DD.
    return [
        fecha.getFullYear(),
        String(fecha.getMonth() + 1).padStart(2, "0"),
        String(fecha.getDate()).padStart(2, "0")
    ].join("-");

}





/*-------------------------------------------------------------------------------------------------------- 
------------------------------- BLOQUE: FUNCIÓN CARGAR EXCEL   -------------------------------------------
----------------------------------------------------------------------------------------------------------*/
async function load_excel(file) {

    // Verificar que exista un archivo seleccionado.
    if (!file) return;

    try {
        // Leer el contenido del archivo.
        const data = await file.arrayBuffer();

        // Interpretar el archivo con SheetJS.
        const book = XLSX.read(data, {
            type: "array"
        });

        // Obtener la primera hoja del Excel.
        const nombre_hoja = book.SheetNames[0];
        const hoja = book.Sheets[nombre_hoja];

        // Convertir las celdas en una matriz.
        const registros = XLSX.utils.sheet_to_json(hoja, {
            header: 1,
            defval: "",
            blankrows: true,
            raw: false
        });

        // Mostrar los datos en consola.
        console.log("Archivo:", file.name);
        console.log("Hoja:", nombre_hoja);
        console.table(registros);



        /* ==========================================
           REGISTRAR FECHAS DE LAS PO DEL EXCEL
        ========================================== */

        // Guardar los registros del Excel.
        pos_registros = registros;

        // Reiniciar las fechas del archivo anterior.
        pos_fechas = {};

        // Recorrer las PO de dos en dos, omitiendo el encabezado.
        for (let i = 1; i < pos_registros.length; i += 2) {

            // Obtener el ID de la PO.
            const id_po = pos_registros[i][0];

            // Registrar la fecha de carga.
            pos_fechas[id_po] = get_pos_date();

        }

        // Actualizar la tabla.
        load_pos_table(pos_registros);





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
        const file = event.target.files[0];

        // Ejecutar la lectura del Excel.
        load_excel(file);


        // Permitir seleccionar nuevamente el mismo file.
        event.target.value = "";


        /* ==========================================
           FILTRAR PO POR ESTADO
        ========================================== */

        if (event.target.matches("#options_pos_status")) {

            // Confirmar que detectamos el cambio.
            console.log("Se cambió el filtro de Estado");

            // Ejecutar la función de filtrado.
            filter_pos();

        }


    }



    /* ==========================================
       SELECCIONAR TODAS LAS PO
    ========================================== */

    if (event.target.matches("#select_all_pos")) {

        // Obtener todos los checkboxes de las PO.
        const checkboxes = document.querySelectorAll(
            "#pos_table_excel .select_pos_check"
        );

        // Aplicar el estado del checkbox principal.
        checkboxes.forEach(function (checkbox) {
            checkbox.checked = event.target.checked;
        });

    }

    /* ==========================================
       ACTUALIZAR CHECKBOX PRINCIPAL
    ========================================== */

    if (event.target.matches("#pos_table_excel .select_pos_check")) {

        // Obtener el checkbox principal.
        const select_all = document.getElementById("select_all_pos");

        // Obtener todos los checkboxes individuales.
        const checkboxes = document.querySelectorAll(
            "#pos_table_excel .select_pos_check"
        );

        // Contar cuántos están seleccionados.
        const seleccionados = document.querySelectorAll(
            "#pos_table_excel .select_pos_check:checked"
        );

        // Marcar el principal si todos están seleccionados.
        select_all.checked =
            checkboxes.length > 0 &&
            seleccionados.length === checkboxes.length;

        // Mostrar estado parcial cuando corresponda.
        select_all.indeterminate =
            seleccionados.length > 0 &&
            seleccionados.length < checkboxes.length;

    }



    /* ==========================================
       DETECTAR CAMBIO DEL FILTRO DE ESTADO
    ========================================== */

    if (event.target.matches("#options_pos_status")) {

        // Aplicar los filtros.
        filter_pos();

    }



    /* ==========================================
       FILTRAR PO POR MES Y AÑO
    ========================================== */

    if (event.target.matches("#dpdn_pos_mounth")) {

        // Aplicar los filtros al cambiar el mes.
        filter_pos();

    }




});


/* ==========================================
   MOSTRAR EXCEL AGRUPADO POR PO
========================================== */

function load_pos_table(registros) {

    // Obtener el cuerpo de la tabla.
    const tabla = document.getElementById("pos_table_excel");

    // Verificar que exista.
    if (!tabla) {
        console.error("No se encontró la tabla de PO.");
        return;
    }

    // Limpiar registros anteriores.
    tabla.innerHTML = "";

    // Reiniciar el checkbox principal.
    const select_all = document.getElementById("select_all_pos");

    if (select_all) {
        select_all.checked = false;
        select_all.indeterminate = false;
    }

    // Eliminar la fila de encabezados del Excel.
    const filas = registros.slice(1);

    // Verificar que las PO tengan dos filas.
    if (filas.length % 2 !== 0) {
        console.error("El Excel debe tener dos filas por PO.");
        return;
    }

    // Función auxiliar para crear celdas.
    function crear_celda(valor, rowspan = 1) {

        const td = document.createElement("td");

        td.textContent = valor ?? "";

        if (rowspan > 1) {
            td.rowSpan = rowspan;
        }

        return td;
    }

    // Recorrer las PO de dos en dos.
    for (let i = 0; i < filas.length; i += 2) {

        // Primera fila: cantidades.
        const fila_cantidades = filas[i];

        // Segunda fila: rangos de cajas.
        const fila_cajas = filas[i + 1];

        // Obtener el ID de la PO.
        const id_po = fila_cantidades[0];
        /* ==========================================
           RECUPERAR FECHA ORIGINAL DE LA PO
        ========================================== */

        // Obtener la fecha registrada para esta PO.
        const fecha_registro = pos_fechas[id_po] ?? get_pos_date();

        // Crear las dos filas HTML.
        const tr_cantidades = document.createElement("tr");
        const tr_cajas = document.createElement("tr");

        // Asociar la fecha a las dos filas de la PO.
        tr_cantidades.dataset.createdAt = fecha_registro;
        tr_cajas.dataset.createdAt = fecha_registro;



        /* ==========================================
           CHECKBOX ÚNICO POR PO
        ========================================== */

        const td_check = document.createElement("td");
        td_check.rowSpan = 2;

        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.className = "select_pos_check";
        checkbox.value = id_po ?? "";

        td_check.appendChild(checkbox);
        tr_cantidades.appendChild(td_check);

        /* ==========================================
           DATOS DEL EXCEL (15 COLUMNAS)
        ========================================== */

        for (let columna = 0; columna < 15; columna++) {

            // Primera fila: cantidades.
            tr_cantidades.appendChild(
                crear_celda(fila_cantidades[columna])
            );

            // Segunda fila: rangos de cajas.
            tr_cajas.appendChild(
                crear_celda(fila_cajas[columna])
            );

        }


        // Aplicar los filtros activos después de cargar el Excel.
        filter_pos();

        /* ==========================================
           COLUMNAS ADICIONALES DE CONTROLIX
        ========================================== */

        const columnas_extra = [
            "—",          // Usuario asignado
            "Pendiente",  // Estado
            "—"           // Tipo de inspección
        ];

        columnas_extra.forEach(function (valor) {

            // Crear una celda que ocupe ambas filas.
            const td = crear_celda(valor, 2);

            tr_cantidades.appendChild(td);

        });


        /* ==========================================
           BOTÓN FECHAS ÚNICO POR PO
        ========================================== */

        const td_fechas = document.createElement("td");
        td_fechas.rowSpan = 2;

        const boton = document.createElement("button");

        boton.type = "button";
        boton.className = "btn_po_dates";
        boton.dataset.idPo = id_po ?? "";
        boton.setAttribute("aria-label", "Ver fechas de PO");

        const icono = document.createElement("i");
        icono.className = "bi bi-calendar3";

        boton.appendChild(icono);
        td_fechas.appendChild(boton);
        tr_cantidades.appendChild(td_fechas);

        /* ==========================================
           INSERTAR AMBAS FILAS EN LA TABLA
        ========================================== */

        tabla.appendChild(tr_cantidades);
        tabla.appendChild(tr_cajas);

    }

}




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



    /* ==========================================
       MODAL CREAR PO
    ========================================== */

    // Abrir el formulario Crear PO.
    if (event.target.closest("#btn_new_pos")) {

        open_form("create_pos_js", true);

    }

    // Cerrar con X o Cancelar.
    if (event.target.closest("#create_pos_js #btn_x_modal, #btn_cancel_po")) {

        close_form("create_pos_js");

    }



    /* ==========================================
       BOTÓN EDITAR PO
    ========================================== */

    if (event.target.closest("#btn_edit_pos")) {

        // Obtener las PO seleccionadas.
        const seleccionadas = get_selected_pos();

        // Comprobar que exista exactamente una selección.
        if (seleccionadas.length !== 1) {

            // Mostrar un mensaje según el problema.
            const mensaje = seleccionadas.length === 0
                ? "Selecciona una PO para editar."
                : "Solo puedes editar una PO a la vez.";

            alert(mensaje);

            return;
        }

        // Recuperar el ID de la PO seleccionada.
        const id_po = seleccionadas[0];

        /* ==========================================
           CARGAR DATOS DE LA PO SELECCIONADA
        ========================================== */

        // Buscar la PO en los registros.
        const registro = get_pos_by_id(id_po);

        // Comprobar que exista.
        if (!registro) {
            alert("No se encontró la PO seleccionada.");
            return;
        }


        /* ==========================================
           IDENTIFICAR LA PO QUE SE EDITARÁ
        ========================================== */

        // Obtener el formulario Editar.
        const formulario = document.getElementById("form_edit_pos");

        // Guardar el ID de la PO en el formulario.
        formulario.dataset.idPo = id_po;

        // Abrir el modal.
        open_form("edit_pos_js");

        // Llenar los campos con los datos encontrados.
        fill_pos_form(formulario, registro);



        // Comprobar qué PO se editará.
        console.log("Editar PO con ID:", id_po);

    }


    /* ==========================================
       CERRAR MODAL EDITAR PO
    ========================================== */

    // Cerrar el modal con X o Cancelar.
    if (event.target.closest(
        "#edit_pos_js #btn_x_modal, #edit_pos_js #btn_cancel_po"
    )) {

        // Reutilizar la función general.
        close_form("edit_pos_js");

    }


    /* ==========================================
       BOTÓN ELIMINAR PO
    ========================================== */

    if (event.target.closest("#btn_delete_pos")) {

        // Recuperar los ID de las PO seleccionadas.
        const seleccionadas = get_selected_pos();

        // Comprobar que exista al menos una PO seleccionada.
        if (seleccionadas.length === 0) {

            alert("Selecciona al menos una PO para eliminar.");

            return;
        }

        // Guardar los ID seleccionados en el modal.
        const modal = document.getElementById("delete_po_js");

        if (!modal) {
            console.error("No se encontró el modal Eliminar PO.");
            return;
        }

        modal.dataset.idsPo = JSON.stringify(seleccionadas);

        // Abrir el modal de confirmación.
        open_form("delete_po_js");

        // Comprobar los registros seleccionados.
        console.log("PO seleccionadas para eliminar:", seleccionadas);

    }


    /* ==========================================
       CERRAR MODAL ELIMINAR PO
    ========================================== */

    // Detectar los botones Cancelar y X.
    if (event.target.closest(
        "#delete_po_js #btn_cancel_po, #delete_po_js #btn_x_modal"
    )) {

        // Recuperar el modal.
        const modal = document.getElementById("delete_po_js");

        // Limpiar los ID pendientes de eliminación.
        delete modal.dataset.idsPo;

        // Cerrar el modal utilizando la función general.
        close_form("delete_po_js");

    }


    /* ==========================================
       CONFIRMAR ELIMINACIÓN DE PO
    ========================================== */

    if (event.target.closest("#btn_confirm_delete")) {

        // Recuperar el modal de eliminación.
        const modal = document.getElementById("delete_po_js");

        // Recuperar los ID que se seleccionaron.
        const ids_po = JSON.parse(
            modal.dataset.idsPo || "[]"
        );

        // Comprobar que existan registros seleccionados.
        if (ids_po.length === 0) {

            alert("No hay PO seleccionadas para eliminar.");
            return;

        }

        /* ==========================================
           ELIMINAR REGISTROS SELECCIONADOS
        ========================================== */

        // Recorrer los ID seleccionados.
        ids_po.forEach(function (id_po) {

            // Buscar la PO dentro del arreglo.
            const registro = get_pos_by_id(id_po);

            // Comprobar que exista.
            if (!registro) {
                return;
            }

            // Eliminar las dos filas de la PO.
            pos_registros.splice(registro.indice, 2);

            // Eliminar su fecha temporal.
            delete pos_fechas[id_po];

        });

        /* ==========================================
           ACTUALIZAR DASHBOARD
        ========================================== */

        // Volver a dibujar la tabla.
        load_pos_table(pos_registros);

        // Limpiar los ID pendientes de eliminación.
        delete modal.dataset.idsPo;

        // Cerrar el modal.
        close_form("delete_po_js");

        // Confirmar el resultado en consola.
        console.log("PO eliminadas:", ids_po);

    }






});



/* ==========================================
   BUSCAR PO POR ID
========================================== */

function get_pos_by_id(id_po) {

    // Omitir el encabezado y recorrer las PO de dos en dos.
    for (let i = 1; i < pos_registros.length; i += 2) {

        // Recuperar las dos filas de la PO.
        const fila_cantidades = pos_registros[i];
        const fila_cajas = pos_registros[i + 1];

        // Comprobar que ambas filas existan.
        if (!fila_cantidades || !fila_cajas) {
            continue;
        }

        // Comparar el ID de la PO.
        if (String(fila_cantidades[0]) === String(id_po)) {

            // Devolver los datos y su posición.
            return {
                indice: i,
                cantidades: fila_cantidades,
                cajas: fila_cajas
            };

        }
    }

    // Indicar que no se encontró la PO.
    return null;
}



/* ==========================================
   LLENAR FORMULARIO EDITAR PO
========================================== */

function fill_pos_form(formulario, registro) {

    // Recuperar las dos filas de la PO.
    const cantidades = registro.cantidades;
    const cajas = registro.cajas;

    // Relacionar cada campo con su valor.
    const valores = {
        txt_edit_po: cantidades[1],
        txt_edit_model: cantidades[2],
        txt_edit_art: cantidades[3],
        txt_edit_color: cantidades[4],

        // Cantidades por talla.
        txt_edit_xs: cantidades[5],
        txt_edit_s: cantidades[6],
        txt_edit_m: cantidades[7],
        txt_edit_l: cantidades[8],
        txt_edit_xl: cantidades[9],
        txt_edit_2xl: cantidades[10],
        txt_edit_3xl: cantidades[11],
        txt_edit_4xl: cantidades[12],

        // Cajas por talla.
        txt_edit_bxs: cajas[5],
        txt_edit_bs: cajas[6],
        txt_edit_bm: cajas[7],
        txt_edit_bl: cajas[8],
        txt_edit_bxl: cajas[9],
        txt_edit_b2xl: cajas[10],
        txt_edit_b3xl: cajas[11],
        txt_edit_b4xl: cajas[12],

        // Totales.
        txt_edit_rqstd: cantidades[13],
        txt_edit_delvd: cantidades[14]
    };

    // Recorrer los campos y asignar sus valores.
    Object.entries(valores).forEach(function ([id, valor]) {

        const campo = formulario.querySelector(`#${id}`);

        if (campo) {
            campo.value = valor ?? "";
        }

    });
}






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


            /* ==========================================
               CONSERVAR DATOS Y LIMPIAR ERRORES
            ========================================== */

            // Ocultar los mensajes sin eliminar su clase CSS.
            form.querySelectorAll("small.input_error").forEach(function (error) {

                error.hidden = true;
                error.textContent = "";

            });

            // Quitar los bordes rojos de los campos.
            form.querySelectorAll("input.input_error, select.input_error")
                .forEach(function (campo) {

                    campo.classList.remove("input_error");

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


        /* ==========================================
           LIMPIAR MENSAJES Y BORDES DE ERROR
        ========================================== */

        // Ocultar mensajes, conservando sus clases CSS.
        element.querySelectorAll("small.input_error").forEach(function (error) {

            error.hidden = true;
            error.textContent = "";

        });

        // Eliminar los bordes de error de los campos.
        element.querySelectorAll(
            "input.input_error, select.input_error, .border_error"
        ).forEach(function (campo) {

            campo.classList.remove("input_error", "border_error");

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


/* ==========================================
   OBTENER DATOS DEL FORMULARIO PO
   CREAR Y EDITAR
========================================== */

function get_pos_form_data(formulario) {

    // Identificar qué formulario estamos utilizando.
    const es_edicion = formulario.id === "form_edit_pos";

    // Obtener el ID correspondiente a cada formulario.
    const obtener = function (id_crear, id_editar) {

        const id = es_edicion ? id_editar : id_crear;

        return formulario.querySelector(`#${id}`)?.value.trim() ?? "";
    };

    // Recuperar los datos generales, cantidades y cajas.
    return {
        po: obtener("txt_create_po", "txt_edit_po"),
        modelo: obtener("txt_new_model", "txt_edit_model"),
        articulo: obtener("txt_new_art", "txt_edit_art"),
        color: obtener("txt_new_color", "txt_edit_color"),

        xs: obtener("txt_new_xs", "txt_edit_xs"),
        caja_xs: obtener("txt_new_bxs", "txt_edit_bxs"),

        s: obtener("txt_new_s", "txt_edit_s"),
        caja_s: obtener("txt_new_bs", "txt_edit_bs"),

        m: obtener("txt_new_m", "txt_edit_m"),
        caja_m: obtener("txt_new_bm", "txt_edit_bm"),

        l: obtener("txt_new_l", "txt_edit_l"),
        caja_l: obtener("txt_new_bl", "txt_edit_bl"),

        xl: obtener("txt_new_xl", "txt_edit_xl"),
        caja_xl: obtener("txt_new_bxl", "txt_edit_bxl"),

        xxl: obtener("txt_new_2xl", "txt_edit_2xl"),
        caja_2xl: obtener("txt_new_b2xl", "txt_edit_b2xl"),

        xxxl: obtener("txt_new_3xl", "txt_edit_3xl"),
        caja_3xl: obtener("txt_new_b3xl", "txt_edit_b3xl"),

        xxxxl: obtener("txt_new_4xl", "txt_edit_4xl"),
        caja_4xl: obtener("txt_new_b4xl", "txt_edit_b4xl"),

        rqstd: obtener("txt_new_rqstd", "txt_edit_rqstd"),
        delvd: obtener("txt_new_delvd", "txt_edit_delvd")
    };
}




/* ==========================================
   CONVERTIR FORMULARIO A FILAS DE PO
========================================== */

function pos_form_to_rows(datos, id_po) {

    // Primera fila: información y cantidades.
    const fila_cantidades = [
        id_po,
        datos.po,
        datos.modelo,
        datos.articulo,
        datos.color,
        datos.xs,
        datos.s,
        datos.m,
        datos.l,
        datos.xl,
        datos.xxl,
        datos.xxxl,
        datos.xxxxl,
        datos.rqstd,
        datos.delvd
    ];

    // Segunda fila: cajas por talla.
    const fila_cajas = [
        "", "", "", "", "",
        datos.caja_xs,
        datos.caja_s,
        datos.caja_m,
        datos.caja_l,
        datos.caja_xl,
        datos.caja_2xl,
        datos.caja_3xl,
        datos.caja_4xl,
        "", ""
    ];

    // Devolver las dos filas.
    return [fila_cantidades, fila_cajas];
}



/* ==========================================
   VALIDAR PAREJAS DE TALLA Y CAJA
========================================== */

function validate_pos_sizes(formulario) {

    // Relacionar cada talla con su respectiva caja.
    const parejas = [
        ["txt_new_xs", "txt_new_bxs"],
        ["txt_new_s", "txt_new_bs"],
        ["txt_new_m", "txt_new_bm"],
        ["txt_new_l", "txt_new_bl"],
        ["txt_new_xl", "txt_new_bxl"],
        ["txt_new_2xl", "txt_new_b2xl"],
        ["txt_new_3xl", "txt_new_b3xl"],
        ["txt_new_4xl", "txt_new_b4xl"]
    ];

    let existe_pareja = false;
    let es_valido = true;

    // Revisar cada pareja de talla y caja.
    parejas.forEach(function ([id_talla, id_caja]) {

        const talla = formulario.querySelector(`#${id_talla}`);
        const caja = formulario.querySelector(`#${id_caja}`);

        if (!talla || !caja) {
            es_valido = false;
            return;
        }

        const tiene_talla = talla.value.trim() !== "";
        const tiene_caja = caja.value.trim() !== "";

        // Comprobar si ambos campos están completos.
        if (tiene_talla && tiene_caja) {
            existe_pareja = true;
        }

        // Detectar parejas incompletas.
        if (tiene_talla !== tiene_caja) {
            es_valido = false;

            const campo_incompleto = tiene_talla ? caja : talla;

            campo_incompleto.classList.add("input_error");
        }

        // Detectar si el usuario comenzó a llenar alguna pareja.
        if (tiene_talla || tiene_caja) {
            existe_dato_talla_caja = true;
        }

    });


    /* ==========================================
       EXIGIR AL MENOS UNA TALLA Y CAJA
    ========================================== */

    // Mostrar el error general únicamente cuando
    // todas las tallas y cajas están vacías.
    if (!existe_pareja && !existe_dato_talla_caja) {

        const primera_talla = formulario.querySelector(
            `#${prefijo}xs`
        );

        if (primera_talla) {

            mostrar_error(
                primera_talla,
                "Ingrese al menos una talla con su respectiva caja."
            );

        }
    }

    return es_valido;
}



/* ==========================================
   VALIDAR CAMPOS DE FORMULARIOS PO
========================================== */

function validate_pos_form(formulario) {

    // Recuperar todos los campos del formulario.
    const campos = formulario.querySelectorAll("input, select");

    let valido = true;
    let primer_error = null;
    let existe_pareja = false;
    let existe_dato_talla_caja = false;

    // Relacionar las tallas con sus cajas.
    const parejas = [
        ["xs", "bxs"],
        ["s", "bs"],
        ["m", "bm"],
        ["l", "bl"],
        ["xl", "bxl"],
        ["2xl", "b2xl"],
        ["3xl", "b3xl"],
        ["4xl", "b4xl"]
    ];

    // Identificar si estamos creando o editando.
    const prefijo = formulario.id === "form_edit_pos"
        ? "txt_edit_"
        : "txt_new_";

    /* ==========================================
       LIMPIAR ERRORES ANTERIORES
    ========================================== */

    formulario.querySelectorAll(
        "input.input_error, select.input_error"
    ).forEach(function (campo) {

        campo.classList.remove("input_error");

    });

    formulario.querySelectorAll("small.input_error")
        .forEach(function (mensaje) {

            mensaje.textContent = "";
            mensaje.hidden = true;

        });

    /* ==========================================
       MOSTRAR ERRORES
    ========================================== */

    function mostrar_error(campo, texto) {

        if (!campo) {
            return;
        }

        valido = false;

        // No reemplazar un error que ya existe.
        if (campo.classList.contains("input_error")) {
            return;
        }

        // Marcar el campo incorrecto.
        campo.classList.add("input_error");

        // Recuperar el mensaje correspondiente.
        const contenedor = campo.closest(".input_pos_form");

        const mensaje = contenedor?.querySelector(
            "small.input_error"
        );

        if (mensaje) {
            mensaje.textContent = texto;
            mensaje.hidden = false;
        }

        // Conservar el primer campo incorrecto.
        if (!primer_error) {
            primer_error = campo;
        }
    }

    /* ==========================================
       VALIDAR CAMPOS OBLIGATORIOS Y FORMATOS
    ========================================== */

    campos.forEach(function (campo) {

        const valor = campo.value.trim();

        // Identificar cantidades.
        const es_cantidad =
            /^txt_(new|edit)_(xs|s|m|l|xl|2xl|3xl|4xl|rqstd|delvd)$/.test(campo.id);

        // Identificar tallas.
        const es_talla =
            /^txt_(new|edit)_(xs|s|m|l|xl|2xl|3xl|4xl)$/.test(campo.id);

        // Identificar cajas.
        const es_caja =
            /^txt_(new|edit)_b(xs|s|m|l|xl|2xl|3xl|4xl)$/.test(campo.id);

        // Las tallas y cajas son opcionales por separado.
        const es_opcional = es_talla || es_caja;

        // Revisar campos vacíos.
        if (valor === "") {

            if (campo.required && !es_opcional) {

                mostrar_error(
                    campo,
                    "Este campo es obligatorio."
                );

            }

            return;
        }

        // Validar cantidades numéricas.
        if (es_cantidad && !/^\d+$/.test(valor)) {

            mostrar_error(
                campo,
                "Ingrese un número entero válido."
            );

        }

        // Validar cajas y rangos.
        if (es_caja && !validate_box_range(valor)) {

            mostrar_error(
                campo,
                "Ingrese una caja o rango válido."
            );

        }

    });

    /* ==========================================
       VALIDAR PAREJAS DE TALLA Y CAJA
    ========================================== */

    parejas.forEach(function ([id_talla, id_caja]) {

        // Recuperar los campos correspondientes.
        const talla = formulario.querySelector(
            `#${prefijo}${id_talla}`
        );

        const caja = formulario.querySelector(
            `#${prefijo}${id_caja}`
        );

        if (!talla || !caja) {
            return;
        }

        const tiene_talla = talla.value.trim() !== "";
        const tiene_caja = caja.value.trim() !== "";

        // Detectar si el usuario escribió algún dato.
        if (tiene_talla || tiene_caja) {
            existe_dato_talla_caja = true;
        }

        // Comprobar una pareja completa y válida.
        if (
            tiene_talla &&
            tiene_caja &&
            !talla.classList.contains("input_error") &&
            !caja.classList.contains("input_error")
        ) {
            existe_pareja = true;
        }

        // Existe cantidad, pero falta caja.
        if (tiene_talla && !tiene_caja) {

            mostrar_error(
                caja,
                "Ingrese la caja correspondiente."
            );

        }

        // Existe caja, pero falta cantidad.
        if (!tiene_talla && tiene_caja) {

            mostrar_error(
                talla,
                "Ingrese la cantidad correspondiente."
            );

        }

    });

    /* ==========================================
       EXIGIR AL MENOS UNA PAREJA
    ========================================== */

    // Mostrar el error general únicamente cuando
    // todas las tallas y cajas están vacías.
    if (!existe_pareja && !existe_dato_talla_caja) {

        const primera_talla = formulario.querySelector(
            `#${prefijo}xs`
        );

        mostrar_error(
            primera_talla,
            "Ingrese al menos una talla con su respectiva caja."
        );

    }

    /* ==========================================
       ENFOCAR EL PRIMER ERROR
    ========================================== */

    if (primer_error) {
        primer_error.focus();
    }

    return valido;
}




/* ==========================================
   VALIDAR NÚMEROS Y RANGOS DE CAJAS
========================================== */

function validate_box_range(valor) {

    // Separar los valores por comas.
    const elementos = valor.split(",");

    // Revisar cada número o rango.
    return elementos.every(function (elemento) {

        const texto = elemento.trim();

        // Aceptar únicamente números o rangos.
        if (!/^\d+(\s*-\s*\d+)?$/.test(texto)) {
            return false;
        }

        // Si es un número individual, es válido.
        if (!texto.includes("-")) {
            return true;
        }

        // Obtener el inicio y final del rango.
        const [inicio, fin] = texto.split("-").map(Number);

        // Evitar rangos invertidos.
        return inicio <= fin;

    });
}






/* -------------------------------------  BLOQUE:  Botón Crear PO  ------------------------------------- */


/* ==========================================
   GUARDAR PO - PRUEBA DE LECTURA
========================================== */

document.addEventListener("submit", function (event) {

    if (event.target.matches("#form_create_pos")) {

        // Evitar que se recargue la página.
        event.preventDefault();


        /* ==========================================
   VALIDAR ANTES DE GUARDAR
========================================== */

        if (!validate_pos_form(event.target)) {
            return;
        }

        // Obtener los datos utilizando la función general.
        const datos = get_pos_form_data(event.target);

        // Comprobar los valores en consola.
        console.table(datos);



        /* ==========================================
           AGREGAR NUEVA PO
        ========================================== */

        // Obtener el ID más alto de las PO existentes.
        const ids = pos_registros
            .slice(1)
            .filter((fila, indice) => indice % 2 === 0)
            .map(fila => Number(fila[0]) || 0);

        const nuevo_id = Math.max(0, ...ids) + 1;

        /* ==========================================
           REGISTRAR FECHA DE LA NUEVA PO
        ========================================== */

        // Guardar la fecha de creación de la PO.
        pos_fechas[nuevo_id] = get_pos_date();


        // Convertir los datos del formulario en dos filas.
        const nuevas_filas = pos_form_to_rows(datos, nuevo_id);

        // Agregar ambas filas a los registros existentes.
        pos_registros.push(...nuevas_filas);

        // Actualizar la tabla utilizando nuestra función existente.
        load_pos_table(pos_registros);

        // Cerrar el formulario.
        close_form("create_pos_js");

        // Comprobar los registros actualizados.
        console.table(pos_registros);


    }




    /* ==========================================
       GUARDAR CAMBIOS DE EDITAR PO
    ========================================== */

    if (event.target.matches("#form_edit_pos")) {

        // Evitar que el formulario recargue la página.
        event.preventDefault();

        // Recuperar el formulario.
        const formulario = event.target;

        // Validar los campos antes de guardar.
        if (!validate_pos_form(formulario)) {
            return;
        }

        // Recuperar el ID de la PO seleccionada.
        const id_po = formulario.dataset.idPo;

        // Buscar la PO original en nuestros registros.
        const registro = get_pos_by_id(id_po);

        // Comprobar que exista el registro.
        if (!registro) {
            alert("No se encontró la PO seleccionada.");
            return;
        }

        // Obtener los datos modificados.
        const datos = get_pos_form_data(formulario);

        // Convertir los datos en filas de cantidades y cajas.
        const nuevas_filas = pos_form_to_rows(datos, id_po);

        // Reemplazar las dos filas anteriores.
        pos_registros.splice(
            registro.indice,
            2,
            ...nuevas_filas
        );

        // Actualizar la tabla del Dashboard.
        load_pos_table(pos_registros);

        // Cerrar el modal Editar.
        close_form("edit_pos_js");

        // Comprobar la actualización en consola.
        console.log("PO actualizada correctamente:", id_po);
        console.table(nuevas_filas);

    }







});




/* ==========================================
   OBTENER PO SELECCIONADAS
========================================== */

function get_selected_pos() {

    // Recuperar los checkbox marcados en la tabla.
    const seleccionadas = document.querySelectorAll(
        "#pos_table_excel .select_pos_check:checked"
    );

    // Devolver los ID de las PO seleccionadas.
    return Array.from(seleccionadas, function (checkbox) {

        return checkbox.value;

    });

}






/* ----------------------------------  BLOQUE:  Botón Eliminar PO  ------------------------------------- */










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




/* ==========================================
   FUNCIÓN BUSCAR PO
========================================== */

function search_pos() {

    // Obtener el campo de búsqueda.
    const input = document.getElementById("search_pos");

    // Obtener la tabla de PO.
    const tabla = document.getElementById("pos_table_excel");

    // Verificar que existan los elementos.
    if (!input || !tabla) return;

    // Recuperar el texto escrito.
    const busqueda = input.value.trim().toLowerCase();

    // Obtener todas las filas de la tabla.
    const filas = Array.from(tabla.querySelectorAll("tr"));

    // Recorrer las PO de dos en dos.
    for (let i = 0; i < filas.length; i += 2) {

        // Primera fila: cantidades.
        const fila_cantidades = filas[i];

        // Segunda fila: cajas.
        const fila_cajas = filas[i + 1];

        if (!fila_cajas) continue;

        // Obtener los datos de la PO.
        const celdas = fila_cantidades.cells;

        // Índices según el encabezado del Dashboard.
        const id = celdas[1]?.textContent.toLowerCase() ?? "";
        const po = celdas[2]?.textContent.toLowerCase() ?? "";
        const modelo = celdas[3]?.textContent.toLowerCase() ?? "";

        // Verificar si alguno coincide con la búsqueda.
        const coincide =
            id.includes(busqueda) ||
            po.includes(busqueda) ||
            modelo.includes(busqueda);

        // Mostrar u ocultar ambas filas.
        fila_cantidades.hidden = !coincide;
        fila_cajas.hidden = !coincide;

    }

}




/* ==========================================
   EVENTO BUSCADOR DE PO
========================================== */

document.addEventListener("input", function (event) {

    // Detectar cuando se escribe en el buscador.
    if (event.target.matches("#search_pos")) {

        // Filtrar las PO automáticamente.
        filter_pos();
    }


    /* ==========================================
       LIMPIAR ERRORES AL ESCRIBIR
    ========================================== */

    // Detectar cambios en los formularios de PO.
    if (event.target.matches(".pos_form input, .pos_form select")) {

        // Identificar el campo modificado.
        const campo = event.target;

        // Quitar las clases visuales de error.
        campo.classList.remove("input_error", "border_error");

        // Buscar el mensaje correspondiente al campo.
        const contenedor = campo.closest(".input_pos_form");
        const mensaje = contenedor?.querySelector("small.input_error");

        // Ocultar y limpiar el mensaje.
        if (mensaje) {
            mensaje.hidden = true;
            mensaje.textContent = "";
        }

    }


});



/* ==========================================
   FILTRAR PO POR BÚSQUEDA Y ESTADO
========================================== */

function filter_pos() {

    // Obtener el buscador y el filtro de estado.
    const input = document.getElementById("search_pos");
    const select_estado = document.getElementById("options_pos_status");
    // Obtener el filtro Mes/Año.
    const input_mes = document.getElementById("dpdn_pos_mounth");
    // Obtener el mes y año seleccionados (YYYY-MM).
    const mes_seleccionado = input_mes?.value ?? "";

    // Obtener el cuerpo de la tabla.
    const tabla = document.getElementById("pos_table_excel");

    // Verificar que existan los elementos.
    if (!tabla) return;

    // Obtener los valores seleccionados.
    const busqueda = (input?.value ?? "").trim().toLowerCase();

    /* ==========================================
       NORMALIZAR ESTADOS DEL FILTRO
    ========================================== */

    // Relacionar los valores del HTML con los estados de la tabla.
    const estados = {
        all: "todos",
        pending: "pendiente",
        assigned: "asignado",
        inspection: "inspección",
        finished: "finalizado"
    };

    // Obtener el valor seleccionado.
    const valor_estado = (select_estado?.value ?? "todos")
        .trim()
        .toLowerCase();

    // Convertir el valor al estado utilizado en la tabla.
    const estado = estados[valor_estado] ?? valor_estado;


    // Obtener todas las filas.
    const filas = Array.from(tabla.querySelectorAll("tr"));

    // Recorrer cada PO, formada por dos filas.
    for (let i = 0; i < filas.length; i += 2) {

        const fila_cantidades = filas[i];
        const fila_cajas = filas[i + 1];

        if (!fila_cajas) continue;

        // Obtener las celdas de la primera fila.
        const celdas = fila_cantidades.cells;

        // Recuperar ID, PO y modelo.
        const id = celdas[1]?.textContent.toLowerCase() ?? "";
        const po = celdas[2]?.textContent.toLowerCase() ?? "";
        const modelo = celdas[3]?.textContent.toLowerCase() ?? "";

        // Buscar el estado usando la celda correspondiente.
        const estado_po = celdas[17]?.textContent.trim().toLowerCase() ?? "";

        console.log("Estado seleccionado:", estado);
        console.log("Estado de la PO:", estado_po);
        console.log("Búsqueda:", busqueda);

        // Comprobar coincidencia con el buscador.
        const coincide_busqueda =
            id.includes(busqueda) ||
            po.includes(busqueda) ||
            modelo.includes(busqueda);

        // Comprobar coincidencia con el estado.
        const coincide_estado =
            estado === "todos" ||
            estado === "" ||
            estado_po === estado;


        /* ==========================================
           COMPROBAR FILTRO MES/AÑO
        ========================================== */

        // Recuperar la fecha de registro de la PO.
        const fecha_registro =
            fila_cantidades.dataset.createdAt ?? "";

        // Extraer el año y mes de la fecha.
        const mes_registro = fecha_registro.slice(0, 7);

        // Comprobar si coincide con el mes seleccionado.
        const coincide_mes =
            mes_seleccionado === "" ||
            mes_registro === mes_seleccionado;



        // Mostrar únicamente las PO que cumplen los tres filtros.
        const mostrar =
            coincide_busqueda &&
            coincide_estado &&
            coincide_mes;

        fila_cantidades.hidden = !mostrar;
        fila_cajas.hidden = !mostrar;

    }

}


